# Dinner in December — plan

Temporary pre-order site. 17 guests, live < 20 days, one VPS, SQLite.

## Stack (deliberately boring)

- Node 20 + Express, server-rendered HTML (template strings), one `styles.css`
- `better-sqlite3`, single file at `./data/dinner.db`
- Vanilla JS (~50 lines) for the amends toggles and copy buttons. No build step.
- Admin auth = `ADMIN_PASSWORD` env var + signed cookie
- Deploy: `Dockerfile` + `docker-compose.yml` (volume for db) behind Caddy for HTTPS, plus a plain `systemd` alternative

## Guest flow — one scrolling page, three sections, one Save button

`/r/:token`

1. **Your main** — big tap targets, one card per dish (name, description, price optional). Single select.
2. **Amends** — "Everything comes as standard. Tap anything you'd rather not have."
   Each dish lists its components as big toggle rows: `Yorkshire pudding — Included` → tap → `Yorkshire pudding — No thanks`.
   Plus a "comes as it comes" reset. No hidden gestures, no checkboxes to interpret.
3. **Anything else** — two textareas: *Allergy / special requirements*, *Extra comments*.
4. **Save order** → confirmation screen with their full order, "you can come back and change this any time using the same link until we close orders on <date>".

Opening the link sets `opened_at`. Saving sets `completed_at` and `updated_at`.
If admin has locked entries, the page shows their saved order read-only with "orders are closed — message us if something's wrong".

## Admin — `/admin`

- Summary line: `17 guests · 9 ordered · 3 opened, not saved`
- **Add people**: textarea, one name per line → Add. Generates tokens, shows each new link.
- **Table**: name · status pill (Not opened / Opened / Ordered) · last updated (relative) · main · Copy link
  - Row expands to show amends + comments + allergies
- **Copy all links** → `Sue — https://…/r/abc123` one per line, ready to paste into WhatsApp
- **Export for restaurant** → plain text: per-dish counts + per-person detail, plus a copy button
- **Close entries / reopen** — one toggle, global. No per-person locking in v1.

## Data model

```sql
guests(id, name, token UNIQUE, main_id, amends_json, comments, allergies,
       opened_at, completed_at, updated_at)
settings(key, value)   -- entries_locked
```

## Menu

Lives in `menu.js` — not editable in the UI. Each dish:

```js
{ id: 'roast-beef', name: 'Roast Beef', description: '...', price: '£18',
  amends: ['Yorkshire pudding', 'Roast potatoes', 'Greens', 'Gravy'] }
```

## Look

Warm pub menu: cream/off-white paper, dark green + oxblood, serif headings
(Georgia/Palatino fallback, no webfonts), hairline rules, small caps for section
labels, generous line height, 18px minimum body text, 48px minimum tap targets,
single column on mobile, max-width ~640px.

## Build order

1. Scaffold + `menu.js` + SQLite schema/migrate-on-boot
2. Guest page (view + save + confirmation + read-only locked state)
3. Admin (auth, add names, table, copy links, export, lock)
4. Deploy files + `DEPLOY.md` (Caddy TLS, backup = copy the db file)
5. Polish pass: wording, empty states, 320px width check

Not doing: emails, reminders, per-person locking, menu editing UI, accounts, images, frameworks.

---

## First iteration — built

Decisions taken (easy to change later):

- **One link per person.** Couples can be added as one line with one order, or as two people.
- **Menu hard-coded in `menu.js`** — mains, light bites, smaller portions + optional desserts. Starters, sides and kids' meals left out.
- **Amends** are per-dish lists of included components. Tap to remove. Pie has a mash/chips choice.
- **Manual lock**, global, no auto-date. Copy says orders can change until `site.closingDate`.
- **Docker + Caddy** for deployment, plain `node server.js` also works.
- **No emails, no reminders, no accounts.** You send the links.

Run it: `npm install && ADMIN_PASSWORD=test123 npm start` → `/admin`.
Deploy: `.env` with `DOMAIN` + `ADMIN_PASSWORD`, then `docker compose up -d --build`.

## Second iteration

- **All non-starter, non-side adult food** selectable: mains, lunchtime light bites, smaller portions — grouped by category.
- **Optional dessert** section with its own amends. “No dessert, thank you” is the skip option.
- **Prices are numbers in `menu.js`, shown only in admin** (per order, per guest total, running estimated bill, export). Guest pages show none.
- **Auto-scroll**: choosing a main scrolls to “Anything to leave off?”; choosing a dessert scrolls to “Anything else?”.
- Wording is generic (no venue), closes **15 November at 5pm**.
- Dessert prices are estimates (the menu didn't list them) — edit in `menu.js`.
