'use strict';

const crypto = require('crypto');
const path = require('path');
const express = require('express');
const { db, getSetting, setSetting } = require('./db');
const { allMains, desserts, findMain, findDessert } = require('./menu');
const views = require('./views');

const PORT = Number(process.env.PORT) || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'letmein';
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const TOKEN_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
const SESSION_COOKIE = 'dinner_admin';

if (!process.env.ADMIN_PASSWORD) {
  console.warn('[dinner] ADMIN_PASSWORD not set — using "letmein". Set it before deploying.');
}

const now = () => new Date().toISOString();

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Cache-Control': 'no-store',
    'Content-Security-Policy':
      "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  });
  next();
});

app.use(express.urlencoded({ extended: false, limit: '200kb' }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h', index: false }));

const sessions = new Map();
const loginAttempts = new Map();

function newToken() {
  let out = '';
  while (out.length < 10) out += TOKEN_ALPHABET[crypto.randomInt(TOKEN_ALPHABET.length)];
  return out;
}

function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function isAdmin(req) {
  const token = parseCookies(req.headers.cookie || '')[SESSION_COOKIE];
  if (!token) return false;
  const expires = sessions.get(token);
  if (!expires) return false;
  if (expires < Date.now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function cookieOptions(req, maxAgeMs) {
  const bits = ['Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${Math.floor(maxAgeMs / 1000)}`];
  const https = req.secure || String(process.env.PUBLIC_URL || '').startsWith('https://');
  if (https) bits.push('Secure');
  return bits.join('; ');
}

function baseUrl(req) {
  const configured = String(process.env.PUBLIC_URL || '').replace(/\/+$/, '');
  if (configured) return configured;
  return `${req.protocol}://${req.get('host')}`;
}

const locked = () => getSetting('entries_locked', '0') === '1';

const findGuest = (token) => db.prepare('SELECT * FROM guests WHERE token = ?').get(token);
const allGuests = () =>
  db.prepare('SELECT * FROM guests ORDER BY name COLLATE NOCASE ASC').all();

function requireAdmin(req, res, next) {
  if (isAdmin(req)) return next();
  res.status(401).send(views.loginPage());
}

function passwordMatches(given) {
  const a = crypto.createHash('sha256').update(String(given)).digest();
  const b = crypto.createHash('sha256').update(ADMIN_PASSWORD).digest();
  return crypto.timingSafeEqual(a, b);
}

// ---------- public ----------

app.get('/', (req, res) => res.send(views.landingPage()));

app.get('/healthz', (req, res) => res.type('text/plain').send('ok'));

app.get('/r/:token', (req, res) => {
  const guest = findGuest(req.params.token);
  if (!guest) return res.status(404).send(views.notFoundPage());

  if (!guest.opened_at) {
    db.prepare('UPDATE guests SET opened_at = ? WHERE id = ?').run(now(), guest.id);
    guest.opened_at = now();
  }

  res.send(
    views.guestPage({
      guest,
      locked: locked(),
      saved: req.query.saved === '1',
    }),
  );
});

app.post('/r/:token', (req, res) => {
  const guest = findGuest(req.params.token);
  if (!guest) return res.status(404).send(views.notFoundPage());

  if (locked()) {
    return res.status(403).send(views.guestPage({ guest, locked: true }));
  }

  const main = findMain(String(req.body.main || ''));
  if (!main) {
    return res.status(422).send(
      views.guestPage({
        guest,
        error: 'Please choose your main before saving.',
      }),
    );
  }

  // Unchecked amends = things they don't want. Absent means unticked.
  const amends = (main.amends || []).filter((_, i) => req.body[`amend:${main.id}:${i}`] !== 'on');

  let choices = null;
  if (main.choice) {
    const picked = String(req.body[`choice:${main.id}`] || '');
    choices = main.choice.options.includes(picked) ? picked : main.choice.options[0];
  }

  const dessert = findDessert(String(req.body.dessert || ''));
  const dessertAmends = dessert
    ? (dessert.amends || []).filter((_, i) => req.body[`damend:${dessert.id}:${i}`] !== 'on')
    : [];

  const trim = (value, max) => String(value || '').trim().slice(0, max);
  const timestamp = now();

  db.prepare(
    `UPDATE guests
        SET main_id = ?, amends = ?, choices = ?, dessert_id = ?, dessert_amends = ?,
            allergies = ?, comments = ?,
            completed_at = COALESCE(completed_at, ?), updated_at = ?
      WHERE id = ?`,
  ).run(
    main.id,
    JSON.stringify(amends),
    choices,
    dessert ? dessert.id : null,
    JSON.stringify(dessertAmends),
    trim(req.body.allergies, 1000),
    trim(req.body.comments, 1000),
    timestamp,
    timestamp,
    guest.id,
  );

  res.redirect(303, `/r/${guest.token}?saved=1`);
});

// ---------- admin ----------

app.get('/admin', (req, res) => {
  if (!isAdmin(req)) return res.send(views.loginPage());

  const addedIds = String(req.query.added || '')
    .split(',')
    .map((n) => Number.parseInt(n, 10))
    .filter(Number.isFinite);

  res.send(
    views.adminPage({
      guests: allGuests(),
      locked: locked(),
      baseUrl: baseUrl(req),
      addedIds,
    }),
  );
});

app.post('/admin/login', (req, res) => {
  const ip = req.ip || 'unknown';
  const attempt = loginAttempts.get(ip);
  if (attempt && attempt.resetAt > Date.now() && attempt.count >= 8) {
    return res
      .status(429)
      .send(views.loginPage({ error: 'Too many tries. Give it a few minutes.' }));
  }

  if (!passwordMatches(req.body.password || '')) {
    const next = attempt && attempt.resetAt > Date.now() ? attempt : { count: 0, resetAt: Date.now() + 10 * 60 * 1000 };
    next.count += 1;
    loginAttempts.set(ip, next);
    return res.status(401).send(views.loginPage({ error: 'That password isn’t right.' }));
  }

  loginAttempts.delete(ip);
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, Date.now() + SESSION_MS);
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${token}; ${cookieOptions(req, SESSION_MS)}`);
  res.redirect(303, '/admin');
});

app.post('/admin/logout', (req, res) => {
  const token = parseCookies(req.headers.cookie || '')[SESSION_COOKIE];
  if (token) sessions.delete(token);
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; ${cookieOptions(req, 0)}`);
  res.redirect(303, '/admin');
});

app.post('/admin/guests', requireAdmin, (req, res) => {
  const names = String(req.body.names || '')
    .split('\n')
    .map((n) => n.trim().slice(0, 80))
    .filter(Boolean);

  if (!names.length) return res.redirect(303, '/admin');

  const insert = db.prepare(
    'INSERT INTO guests (name, token, created_at) VALUES (?, ?, ?)',
  );

  const ids = db.transaction(() =>
    names.map((name) => Number(insert.run(name, newToken(), now()).lastInsertRowid)),
  )();

  res.redirect(303, `/admin?added=${ids.join(',')}`);
});

app.post('/admin/guests/:id/delete', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM guests WHERE id = ?').run(Number(req.params.id));
  res.redirect(303, '/admin');
});

app.post('/admin/lock', requireAdmin, (req, res) => {
  setSetting('entries_locked', req.body.locked === '1' ? '1' : '0');
  res.redirect(303, '/admin');
});

app.get('/admin/links', requireAdmin, (req, res) => {
  res.type('text/plain; charset=utf-8').send(views.linksText(allGuests(), baseUrl(req)));
});

app.get('/admin/export', requireAdmin, (req, res) => {
  res.type('text/plain; charset=utf-8').send(views.exportText(allGuests()));
});

app.use((req, res) => res.status(404).send(views.notFoundPage()));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).type('text/plain').send('Something went wrong. Please try again.');
});

app.listen(PORT, () => {
  console.log(`[dinner] listening on http://localhost:${PORT}`);
  console.log(`[dinner] menu items: ${allMains.length} mains + ${desserts.length} desserts`);
});
