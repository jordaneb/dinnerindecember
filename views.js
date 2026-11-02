'use strict';

const {
  site,
  mainCategories,
  allMains,
  desserts,
  findMain,
  findDessert,
  priceOf,
  drinksPerPerson,
} = require('./menu');

const esc = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

const money = (n) => `£${Number(n || 0).toFixed(2)}`;

const parseAmends = (json) => {
  try {
    const value = JSON.parse(json || '[]');
    return Array.isArray(value) ? value.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
};

const fmtDateTime = (iso) => {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
};

const relative = (iso) => {
  if (!iso) return '—';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
};

const foodTotalFor = (guest) =>
  priceOf(findMain(guest.main_id)) + priceOf(findDessert(guest.dessert_id));

const totalFor = (guest) => foodTotalFor(guest) + drinksPerPerson;

function orderHtml(guest, { showPrices = false } = {}) {
  const main = findMain(guest.main_id);
  if (!main) return '<p class="muted">No main chosen yet.</p>';

  const dessert = findDessert(guest.dessert_id);
  const mainRemoved = parseAmends(guest.amends);
  const dessertRemoved = parseAmends(guest.dessert_amends);
  const rows = [];

  rows.push(
    `<li class="sum-main">${esc(main.name)}${
      showPrices ? `<span class="sum-price">${money(main.price)}</span>` : ''
    }</li>`,
  );
  if (main.choice && guest.choices) rows.push(`<li>${esc(main.choice.label)}: ${esc(guest.choices)}</li>`);
  rows.push(`<li>${mainRemoved.length ? `Without ${mainRemoved.map(esc).join(', ')}` : 'Everything as it comes'}</li>`);

  if (dessert) {
    rows.push(
      `<li class="sum-main sum-second">${esc(dessert.name)}${
        showPrices ? `<span class="sum-price">${money(dessert.price)}</span>` : ''
      }</li>`,
    );
    if (dessertRemoved.length) rows.push(`<li>Without ${dessertRemoved.map(esc).join(', ')}</li>`);
  }

  if (guest.allergies) rows.push(`<li><strong>Allergy / special:</strong> ${esc(guest.allergies)}</li>`);
  if (guest.comments) rows.push(`<li><strong>Comments:</strong> ${esc(guest.comments)}</li>`);

  if (showPrices) {
    rows.push(`<li class="sum-line">Food <span>${money(foodTotalFor(guest))}</span></li>`);
    rows.push(`<li class="sum-line">Drinks estimate <span>${money(drinksPerPerson)}</span></li>`);
    rows.push(`<li class="sum-total">Total <span>${money(totalFor(guest))}</span></li>`);
  }

  return `<ul class="sum-list">${rows.join('')}</ul>`;
}

function page({ title, body, className = '' }) {
  return `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <meta name="theme-color" content="#1e3a2f">
  <title>${esc(title)}</title>
  <link rel="stylesheet" href="/styles.css">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%231e3a2f'/%3E%3Cpath d='M16 6l10 10-10 10L6 16z' fill='%23f6efdf'/%3E%3C/svg%3E">
</head>
<body class="${esc(className)}">
${body}
<script src="/app.js" defer></script>
</body>
</html>`;
}

const masthead = `
  <header class="masthead">
    <p class="kicker">${esc(site.kicker)}</p>
    <p class="ornament" aria-hidden="true">✦</p>
  </header>`;

function landingPage() {
  return page({
    title: site.heading,
    body: `<main class="wrap landing">
      <h1>${esc(site.heading)}</h1>
      <p>Please use the personal link we sent you.</p>
      <p class="muted">Lost it? Message us and we’ll send it again.</p>
      <p class="tiny"><a href="/admin">Organisers</a></p>
    </main>`,
  });
}

function notFoundPage() {
  return page({
    title: 'Link not found',
    body: `<main class="wrap landing">
      ${masthead}
      <h1>That link isn’t working</h1>
      <p>It may have been mistyped, or it may have been removed. Message us and we’ll sort it out.</p>
    </main>`,
  });
}

function loginPage({ error = '' } = {}) {
  return page({
    title: `Admin — ${site.heading}`,
    className: 'admin',
    body: `<main class="wrap narrow">
      <h1 class="admin-title">${esc(site.heading)} <span class="muted">admin</span></h1>
      <form class="card form" method="post" action="/admin/login">
        <label for="password">Password</label>
        <input id="password" name="password" type="password" autocomplete="current-password" required autofocus>
        ${error ? `<p class="error" role="alert">${esc(error)}</p>` : ''}
        <button class="btn" type="submit">Sign in</button>
      </form>
    </main>`,
  });
}

function dishCard(item, group, checked, { showPrice = false } = {}) {
  const id = `${group}-${item.id}`;
  return `<div class="dish">
    <input class="dish-input" type="radio" id="${id}" name="${group}" value="${item.id}" ${checked ? 'checked' : ''}>
    <label class="dish-body" for="${id}">
      <span class="dish-top">
        <span class="dish-name">${esc(item.name)}</span>
        ${showPrice ? `<span class="dish-price">${money(item.price)}</span>` : ''}
      </span>
      ${item.desc ? `<span class="dish-desc">${esc(item.desc)}</span>` : ''}
      ${
        item.tags?.length
          ? `<span class="tags">${item.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</span>`
          : ''
      }
      <span class="chosen-flag">Your choice</span>
    </label>
  </div>`;
}

function amendGroup(item, { kind, removed, guest }) {
  const isMain = kind === 'main';
  const attr = isMain ? `data-main="${item.id}"` : `data-dessert="${item.id}"`;
  const prefix = isMain ? 'amend' : 'damend';
  const selected = isMain ? guest.main_id === item.id : guest.dessert_id === item.id;

  const choice =
    isMain && item.choice
      ? `<fieldset class="choice">
          <legend>${esc(item.choice.label)}</legend>
          <div class="opts">
            ${item.choice.options
              .map((option) => {
                const checked =
                  guest.choices === option || (!guest.choices && item.choice.options[0] === option);
                return `<label class="opt">
                  <input type="radio" name="choice:${item.id}" value="${esc(option)}" ${checked ? 'checked' : ''}>
                  <span>${esc(option)}</span>
                </label>`;
              })
              .join('')}
          </div>
        </fieldset>`
      : '';

  // Only the saved dish carries its "left off" state — other dishes default to
  // everything included, even if they share a label like "Cheese".
  const leftOff = selected ? removed : new Set();

  const toggles = item.amends?.length
    ? item.amends
        .map(
          (label, i) => `<label class="amend">
            <input type="checkbox" name="${prefix}:${item.id}:${i}" ${leftOff.has(label) ? '' : 'checked'}>
            <span class="amend-body">
              <span class="amend-name">${esc(label)}</span>
              <span class="amend-state"><span class="amend-yes">Included</span><span class="amend-no">No thanks</span></span>
            </span>
          </label>`,
        )
        .join('')
    : '<p class="muted small">Nothing to change — this one comes just as it is.</p>';

  return `<div class="amend-group" ${attr} ${selected ? '' : 'hidden'}>
    <h3>${esc(item.name)}</h3>
    ${choice}
    ${toggles}
  </div>`;
}

function guestPage({ guest, locked = false, saved = false, error = '' }) {
  const mainRemoved = new Set(parseAmends(guest.amends));
  const dessertRemoved = new Set(parseAmends(guest.dessert_amends));

  const mainCards = mainCategories
    .map(
      (category) => `<div class="cat">
        <h3 class="cat-name">${esc(category.name)}</h3>
        ${category.note ? `<p class="cat-note">${esc(category.note)}</p>` : ''}
        ${category.items.map((item) => dishCard(item, 'main', guest.main_id === item.id)).join('')}
      </div>`,
    )
    .join('');

  const dessertCards = desserts
    .map((item) => dishCard(item, 'dessert', guest.dessert_id === item.id))
    .join('');

  const closed = locked
    ? `<section class="card closed">
        <h2>Orders are closed</h2>
        ${
          guest.completed_at
            ? `<p>We’ve sent our choices to the kitchen. Here’s what you picked — if anything isn’t right, message us directly and we’ll fix it.</p>${orderHtml(guest)}`
            : `<p>We don’t have an order for you yet. Message us directly and we’ll sort it out.</p>`
        }
      </section>`
    : '';

  const banner =
    saved && !locked
      ? `<section class="card saved" role="status">
          <h2>Saved — thank you!</h2>
          ${orderHtml(guest)}
          <p class="small">Change anything below and save again. Or just close this page — it’s already in.</p>
        </section>`
      : guest.completed_at && !locked
        ? `<section class="card saved">
            <h2>Your order so far</h2>
            ${orderHtml(guest)}
            <p class="small">Change anything below and save again.</p>
          </section>`
        : '';

  const errorBanner = error ? `<p class="error" role="alert">${esc(error)}</p>` : '';

  const form = locked
    ? closed
    : `<form method="post" action="/r/${esc(guest.token)}" class="order-form" novalidate>
        <section class="card" id="main">
          <h2><span class="step">1</span>Your main</h2>
          <p class="lede">Tap the dish you’d like.</p>
          <div class="dishes">${mainCards}</div>
        </section>

        <section class="card" id="amends">
          <h2><span class="step">2</span>Anything to leave off?</h2>
          <p class="lede">Everything comes as standard. Tap anything you’d rather not have — it will say “No thanks”.</p>
          <div id="amends-placeholder" class="placeholder" ${guest.main_id ? 'hidden' : ''}>
            Choose your main above and the options will appear here.
          </div>
          <div class="amends">${allMains.map((item) => amendGroup(item, { kind: 'main', removed: mainRemoved, guest })).join('')}</div>
        </section>

        <section class="card" id="dessert">
          <h2><span class="step">3</span>Your dessert <span class="h2-optional">(optional)</span></h2>
          <p class="lede">Pick one, or skip it.</p>
          <div class="dishes">
            <div class="dish">
              <input class="dish-input" type="radio" id="dessert-none" name="dessert" value="" ${guest.dessert_id || !guest.completed_at ? '' : 'checked'}>
              <label class="dish-body" for="dessert-none">
                <span class="dish-top"><span class="dish-name">No dessert, thank you</span></span>
                <span class="chosen-flag">Your choice</span>
              </label>
            </div>
            ${dessertCards}
          </div>
          <div class="amends">${desserts.map((item) => amendGroup(item, { kind: 'dessert', removed: dessertRemoved, guest })).join('')}</div>
        </section>

        <section class="card" id="extras">
          <h2><span class="step">4</span>Anything else?</h2>
          <label class="field" for="allergies">Allergies or special requirements</label>
          <textarea id="allergies" name="allergies" rows="3" placeholder="e.g. gluten free, nut allergy, no dairy">${esc(guest.allergies)}</textarea>

          <label class="field" for="comments">Extra comments</label>
          <textarea id="comments" name="comments" rows="3" placeholder="Anything else we should know">${esc(guest.comments)}</textarea>
        </section>

        <button class="btn btn-save" type="submit">${guest.completed_at ? 'Update my order' : 'Save my order'}</button>
        <p class="hint">${guest.completed_at ? 'Last updated ' + esc(fmtDateTime(guest.updated_at)) + '. ' : ''}${esc(site.closingNote)}</p>
      </form>`;

  return page({
    title: `${guest.name} — ${site.heading}`,
    body: `<main class="wrap">
      ${masthead}
      <h1 class="guest-title">Hello, ${esc(guest.name.split(' ')[0])}.</h1>
      ${locked ? '' : `<p class="intro">${esc(site.intro)}</p>`}
      ${errorBanner}
      ${banner}
      ${form}
      <footer class="foot">${esc(site.footer)}</footer>
    </main>`,
  });
}

function statusOf(guest) {
  if (guest.completed_at) return { key: 'done', label: 'Ordered' };
  if (guest.opened_at) return { key: 'opened', label: 'Opened' };
  return { key: 'new', label: 'Not opened' };
}

function adminPage({ guests, locked, baseUrl, addedIds = [] }) {
  const ordered = guests.filter((g) => g.completed_at);
  const opened = guests.filter((g) => g.opened_at && !g.completed_at).length;
  const waiting = guests.length - ordered.length - opened;
  const estimate = ordered.reduce((sum, g) => sum + totalFor(g), 0);

  const added = guests.filter((g) => addedIds.includes(g.id));

  const addedBox = added.length
    ? `<section class="card added">
        <h2>Added ${added.length} ${added.length === 1 ? 'person' : 'people'}</h2>
        <p class="small">Copy these links and send them on. Each one is personal to that person.</p>
        <ul class="link-list">
          ${added
            .map(
              (g) => `<li>
                <span class="ll-name">${esc(g.name)}</span>
                <input class="ll-input" readonly value="${esc(baseUrl)}/r/${esc(g.token)}" aria-label="Link for ${esc(g.name)}">
                <button class="btn btn-sm" type="button" data-copy="${esc(baseUrl)}/r/${esc(g.token)}">Copy</button>
              </li>`,
            )
            .join('')}
        </ul>
        <button class="btn btn-sm btn-ghost" type="button" data-copy-all>Copy all new links</button>
      </section>`
    : '';

  const rows = guests
    .map((g) => {
      const status = statusOf(g);
      const main = findMain(g.main_id);
      const dessert = findDessert(g.dessert_id);
      const time = g.updated_at
        ? `Updated ${relative(g.updated_at)}`
        : g.opened_at
          ? `Opened ${relative(g.opened_at)}`
          : 'Not opened yet';
      const dish = main
        ? `${esc(main.name)}${dessert ? ` <span class="muted">+ ${esc(dessert.name)}</span>` : ''}`
        : '<span class="muted">No main yet</span>';

      return `<details class="guest-row">
        <summary>
          <span class="g-name">${esc(g.name)}</span>
          <span class="pill pill-${status.key}">${status.label}</span>
          <span class="g-main">${dish}</span>
          <span class="g-time">${esc(time)}</span>
        </summary>
        <div class="g-detail">
          ${orderHtml(g, { showPrices: true })}
          <p class="g-url">${esc(baseUrl)}/r/${esc(g.token)}</p>
          <div class="g-actions">
            <button class="btn btn-sm" type="button" data-copy="${esc(baseUrl)}/r/${esc(g.token)}">Copy link</button>
            <a class="btn btn-sm btn-ghost" href="/r/${esc(g.token)}" target="_blank" rel="noopener">Open</a>
            <form method="post" action="/admin/guests/${g.id}/delete" data-confirm="Remove ${esc(g.name)} and their order?">
              <button class="btn btn-sm btn-danger" type="submit">Remove</button>
            </form>
          </div>
          <p class="tiny muted">Added ${esc(fmtDateTime(g.created_at))}${g.completed_at ? ` · order saved ${esc(fmtDateTime(g.completed_at))}` : ''}</p>
        </div>
      </details>`;
    })
    .join('');

  return page({
    title: `Admin — ${site.heading}`,
    className: 'admin',
    body: `<main class="wrap admin-wrap">
      <header class="admin-head">
        <div>
          <h1 class="admin-title">${esc(site.heading)}</h1>
          <p class="muted small">Dinner pre-orders · closes ${esc(site.closingDate)} · prices are estimates</p>
        </div>
        <form method="post" action="/admin/logout"><button class="btn btn-sm btn-ghost" type="submit">Sign out</button></form>
      </header>

      <section class="stats">
        <div class="stat"><strong>${guests.length}</strong><span>guests</span></div>
        <div class="stat stat-done"><strong>${ordered.length}</strong><span>ordered</span></div>
        <div class="stat stat-opened"><strong>${opened}</strong><span>opened, not saved</span></div>
        <div class="stat"><strong>${waiting}</strong><span>not opened</span></div>
        <div class="stat stat-total"><strong>${money(estimate)}</strong><span>estimated bill</span></div>
      </section>
      <p class="stats-note">Bill estimate includes <strong>${money(drinksPerPerson)}</strong> per person for drinks, averaged.</p>

      ${locked ? `<p class="banner-lock">Entries are <strong>closed</strong>. Guests can see their order but not change it.</p>` : ''}

      <section class="card">
        <h2>Add people</h2>
        <form method="post" action="/admin/guests">
          <label class="field" for="names">One name per line</label>
          <textarea id="names" name="names" rows="4" placeholder="Sue\nAlan\nBeth and Chris"></textarea>
          <button class="btn" type="submit">Add and get links</button>
        </form>
      </section>

      ${addedBox}

      <section class="card">
        <div class="card-head">
          <h2>Guests</h2>
          <div class="btn-row">
            <button class="btn btn-sm" type="button" data-copy-all>Copy all links</button>
            <a class="btn btn-sm btn-ghost" href="/admin/links" target="_blank" rel="noopener">All links</a>
            <a class="btn btn-sm btn-ghost" href="/admin/export" target="_blank" rel="noopener">Export for restaurant</a>
            <form method="post" action="/admin/lock">
              <input type="hidden" name="locked" value="${locked ? '0' : '1'}">
              <button class="btn btn-sm ${locked ? 'btn-ghost' : 'btn-danger'}" type="submit" ${
                locked ? '' : 'data-confirm="Close entries? Guests will be able to see their order but not change it."'
              }>${locked ? 'Reopen entries' : 'Close entries'}</button>
            </form>
          </div>
        </div>
        <div class="guest-list">${rows || '<p class="muted">No one added yet.</p>'}</div>
      </section>

      <p class="tiny muted">Times are UK. Tap a name to see their full order and prices.</p>
    </main>`,
  });
}

function linksText(guests, baseUrl) {
  if (!guests.length) return 'No guests yet.';
  return guests.map((g) => `${g.name} — ${baseUrl}/r/${g.token}`).join('\n');
}

function exportText(guests) {
  const ordered = guests.filter((g) => g.completed_at);
  const waiting = guests.filter((g) => !g.completed_at);

  const mainCounts = new Map();
  const dessertCounts = new Map();
  let dessertSkipped = 0;

  for (const g of ordered) {
    const main = findMain(g.main_id);
    if (main) mainCounts.set(main.id, (mainCounts.get(main.id) || 0) + 1);
    const dessert = findDessert(g.dessert_id);
    if (dessert) dessertCounts.set(dessert.id, (dessertCounts.get(dessert.id) || 0) + 1);
    else dessertSkipped += 1;
  }

  const foodEstimate = ordered.reduce((sum, g) => sum + foodTotalFor(g), 0);
  const drinksEstimate = drinksPerPerson * ordered.length;
  const estimate = foodEstimate + drinksEstimate;
  const lines = [];

  lines.push(`DINNER IN DECEMBER — PRE-ORDERS`);
  lines.push(`Orders close ${site.closingDate}`);
  lines.push(
    `${ordered.length} of ${guests.length} ordered · generated ${fmtDateTime(new Date().toISOString())}`,
  );
  lines.push('');

  lines.push('BY MAIN');
  if (!mainCounts.size) lines.push('  (none yet)');
  for (const item of allMains) {
    const n = mainCounts.get(item.id) || 0;
    if (n) lines.push(`  ${String(n).padStart(2, ' ')}  ${item.name} (${money(item.price)}) = ${money(n * item.price)}`);
  }
  lines.push('');

  lines.push('DESSERTS');
  if (!dessertCounts.size && !dessertSkipped) lines.push('  (none yet)');
  for (const item of desserts) {
    const n = dessertCounts.get(item.id) || 0;
    if (n) lines.push(`  ${String(n).padStart(2, ' ')}  ${item.name} (${money(item.price)}) = ${money(n * item.price)}`);
  }
  if (dessertSkipped) lines.push(`  ${String(dessertSkipped).padStart(2, ' ')}  no dessert`);
  lines.push('');

  lines.push('ORDERS');
  if (!ordered.length) lines.push('  (none yet)');
  for (const g of ordered) {
    const main = findMain(g.main_id);
    const dessert = findDessert(g.dessert_id);
    const mainRemoved = parseAmends(g.amends);
    const dessertRemoved = parseAmends(g.dessert_amends);

    lines.push(
      `  ${g.name} — ${main?.name || '?'}${dessert ? ` + ${dessert.name}` : ''} = ${money(totalFor(g))}`,
    );

    const bits = [];
    if (main?.choice && g.choices) bits.push(`${main.choice.label}: ${g.choices}`);
    if (mainRemoved.length) bits.push(`without ${mainRemoved.join(', ')}`);
    if (bits.length) lines.push(`      ${bits.join(' · ')}`);
    if (dessertRemoved.length) lines.push(`      dessert without ${dessertRemoved.join(', ')}`);
    if (g.allergies) lines.push(`      ALLERGY / SPECIAL: ${g.allergies.replace(/\n+/g, ' / ')}`);
    if (g.comments) lines.push(`      COMMENTS: ${g.comments.replace(/\n+/g, ' / ')}`);
    lines.push(`      updated ${fmtDateTime(g.updated_at)}`);
  }
  lines.push('');

  lines.push('NOT YET ORDERED');
  if (!waiting.length) lines.push('  (everyone’s in)');
  for (const g of waiting) {
    lines.push(`  ${g.name}${g.opened_at ? ' (opened, not saved)' : ''}`);
  }
  lines.push('');
  lines.push('BILL ESTIMATE');
  lines.push(`  Food:        ${money(foodEstimate)}`);
  lines.push(`  Drinks:      ${money(drinksEstimate)} (${ordered.length} × ${money(drinksPerPerson)}, averaged)`);
  lines.push(`  TOTAL:       ${money(estimate)}`);
  lines.push('  Menu prices as listed. Dessert prices and drinks are estimates.');
  lines.push('Please note any allergy requirements above — thank you!');

  return lines.join('\n');
}

module.exports = {
  page,
  landingPage,
  notFoundPage,
  loginPage,
  guestPage,
  adminPage,
  linksText,
  exportText,
  esc,
};
