# Dinner in December

Tiny pre-order site for our wedding dinner. 17 guests, one personal link each, live for a few weeks.

- Guest link → pick a main → tap anything to leave off → optional dessert → allergies + comments → save. Same link to change later.
- Admin → add names in bulk → copy links → see who's opened / ordered / when they last updated → running bill estimate → export for the restaurant → close entries.

Guests never see prices. The admin page and export do, including a running estimated total of the bill (food plus an averaged drinks allowance per person).

## Run it locally

```bash
npm install
ADMIN_PASSWORD=test123 npm start
```

- Guest pages: add someone at <http://localhost:3000/admin> (password `test123`)
- Admin: <http://localhost:3000/admin>

Data lives in `data/dinner.db` (SQLite). Delete that file to start over.

## What to edit

**`menu.js`** — everything you'd change:

- `site` — heading, intro, closing date and note
- `mainCategories` — the dishes (mains, light bites, smaller portions), grouped by category. Each item has a `price`, description, tags (`V`, `VE`, `GF`), `amends` (things people can remove), and an optional `choice` (e.g. Pie → mash or chips)
- `desserts` — optional dessert list. **Dessert prices weren't on the menu, so they're estimates — check them.**
- `drinksPerPerson` — the flat drinks allowance added per ordered guest in the bill estimate (currently £20)

Prices are numbers (`21`, `12.5`) and only ever appear in the admin pages and the export. Amends are the bits included with a dish. Guests see them ticked as “Included”; tapping one turns it into “No thanks”. Anything not listed there goes in the comments box.

Restart the app after editing. Existing orders keep the dish id, so don't rename `id` values once links are out.

## Deploy (single VPS, Docker + Caddy)

You need: a VPS with Docker, a domain or subdomain, and ports 80/443 open.

1. Point a DNS `A` record (e.g. `dinner.yourdomain.com`) at the VPS.
2. Copy this folder to the VPS.
3. `cp .env.example .env` and set `DOMAIN` and a long `ADMIN_PASSWORD`.
4. `docker compose up -d --build`

Caddy gets the HTTPS certificate automatically. Guests' links will be `https://your-domain/r/abc234xyz`.

Update later with `git pull && docker compose up -d --build`. The database is in the `dinner-data` volume, so it survives rebuilds.

### Without Docker

```bash
npm ci --omit=dev
ADMIN_PASSWORD=... DATA_DIR=/var/lib/dinner PORT=3000 node server.js
```

Put that behind Caddy/nginx (or use a systemd unit), and make sure `DATA_DIR` is writable by the service user.

## Day to day

1. `/admin` → **Add people**, one name per line → **Add and get links**.
2. Each new person gets a line with their name and personal link. **Copy all new links** and paste into WhatsApp — one line each.
3. Watch the stats: *ordered* / *opened, not saved* / *not opened*, plus the running **estimated bill**. Tap a name for their full order, prices and when they last updated.
4. **Export for restaurant** gives a plain-text summary: counts and cost per dish, every order with amends, allergies and comments, who hasn't ordered, and the total estimate.
5. **Close entries** when you're done (orders close 15 November at 5pm unless you change it). Guests then see their order but can't change it. **Reopen** if needed.

Links are the login for guests — anyone with a link can edit that person's order, so send them individually. `noindex` is set, so they won't show up in search results.

## Backup

Everything is one file:

```bash
docker compose cp app:/data/dinner.db ./dinner-backup.db   # or copy DATA_DIR/dinner.db
```

## Notes

- No email sending, no reminders — you're sending links yourself.
- One link per person. For couples, either add them as one line (“Beth and Chris”) with one order, or add two lines.
- Admin sessions live in memory, so restarting the app signs you out.
- SQLite is in WAL mode; the `-wal` file next to `dinner.db` is normal.
