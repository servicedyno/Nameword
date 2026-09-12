# ONGOING TASK — Remove "Private Email" product + fix cPanel billing wording

Status: **NOT STARTED** (only exploration done; no code changed yet).
Date: 2026-06. Language: respond in English.

## User request (verbatim)
> "lets remove email from landing page and related CTA as we don't offer it. also ensure cpanel says 7 days or monthly not monthly or annual"

## Confirmed scope (via ask_human)
1. **Email**: remove EVERYWHERE it's advertised — landing page + top nav menu + footer links + Pricing page + command palette — **AND remove the whole `/email` page/route** (`pages/Email.jsx`).
   - Keep all *account* email (login, notifications, change-email, verification, mailto contact link in footer) — those are NOT the "Private Email" product.
2. **cPanel wording**: change "monthly or annual" → "7 days or monthly" on the **landing page product card** AND the **Hosting page copy** that says "Monthly or annual".
   - Do NOT touch the functional Monthly/Annual billing toggle (labels `hosting.monthly` / `hosting.annually`) — it's wired to real plan data; changing cycles needs backend work. Only the marketing copy string changes.

## IMPORTANT env note
Frontend is served as a **PROD build** (`/app/frontend/.prod` exists). Hot reload does NOT apply.
After edits: `sudo supervisorctl restart frontend` (~30s rebuild via `yarn build && vite preview`), then screenshot/test.

---

## EXACT EDITS

### A. Components

**1. `/app/frontend/src/routes/Router.jsx`**
- Remove import line 21: `import Email from "../pages/Email";`
- Remove route line 118: `<Route path="/email" element={<Email />} />`

**2. Delete `/app/frontend/src/pages/Email.jsx`** (`rm`). Only Router.jsx imports it.

**3. `/app/frontend/src/components/layout/Navbar.jsx`**
- Line 10 import: remove `LuMail` from the `react-icons/lu` import (it is used ONLY for the email entry).
- Remove from `PRODUCT_KEYS` (line ~23): `{ key: "email", to: "/email", icon: LuMail },`
- Optional: fix comment on line 16 (drop "Private Email").

**4. `/app/frontend/src/components/layout/Footer.jsx`**
- Remove line 66: `<NavLink to="/email" className={linkCls}>{s.footer.links.email}</NavLink>`
- KEEP `LuMail` import (still used by the `mailto:hello@nameword.com` contact link at line ~50).

**5. `/app/frontend/src/components/common/CommandPalette.jsx`**
- Remove `LuMail` from import (used only for email item).
- Remove ITEMS entry (line ~20): `{ key: "email", to: "/email", icon: LuMail, group: "goto", keywords: "email mailbox inbox private" },`

**6. `/app/frontend/src/components/home/landing/Products.jsx`**
- Line 2 import: remove `LuMail`.
- Remove PRODUCTS entry (line 14): `{ key: "email", to: "/email", icon: LuMail, img: LANDING_IMG.email },`
- (Products lead currently reads "Seven products" via locale — fixed in locales below. After removing email the grid shows 5 cards + wide API card.)

**7. `/app/frontend/src/components/home/landing/images.js`**
- Remove line 13: `email: "/img/landing/email.webp",` (optional cleanup; the file `public/img/landing/email.webp` can stay).

### B. Locales — apply the SAME set to all three: `site.en.js`, `site.fr.js`, `site.es.js`

Line numbers are from the current files (verified by view). Decision: **the top-level `email: { ... }` marketing section (used only by the now-deleted Email.jsx) is left in place as harmless dead config** — removing the long multi-line block (esp. accented FR/ES) is high-risk for little gain since nothing references it once Email.jsx is deleted. If you want it gone, remove the whole `email: {` … `},` object (EN ~lines 201-237, FR ~184-220, ES ~184-220) and verify build.

Do these single-line / phrase edits per file:

#### `site.en.js`
- `meta.description` (line 8): `...VPS, RDP, cPanel hosting and private email from privacy-respecting jurisdictions.` → `...VPS, RDP and cPanel hosting from privacy-respecting jurisdictions.`
- `nav.items.email` (line 27): delete the line `email: { title: "Private Email", desc: "Mailboxes on your own domain" },`
- `home.subheading` (line 36): `...deploy servers, cPanel hosting and private email from privacy-respecting jurisdictions...` → `...deploy servers and cPanel hosting from privacy-respecting jurisdictions...`
- `home.products.lead` (line 91): `"Seven focused products,...` → `"Six focused products,...`
- `home.products.items.hosting.price` (line 96): `price: "monthly or annual"` → `price: "7 days or monthly"`
- `home.products.items.email` (line 99): delete the line.
- `hosting.features` "Paid from your wallet" (line 165): `desc: "Monthly or annual plans debited from your prepaid balance...."` → `desc: "7-day or monthly plans debited from your prepaid balance. No card kept on file for renewals."`
- `app.palette.items.email` (line 342, 8-space indent): delete the line `email: "Private Email",`
- `footer.tagline` (line 356): `...Domains, DNS, servers and email from privacy-respecting jurisdictions...` → `...Domains, DNS and servers from privacy-respecting jurisdictions...`
- `footer.links.email` (line 366, 6-space indent): delete the line `email: "Private Email",`

#### `site.fr.js`
- `meta.description` (line 6): `...déployez VPS, RDP, hébergement cPanel et e-mail privé offshore depuis...` → `...déployez VPS, RDP et hébergement cPanel offshore depuis...`
- `nav.items.email` (line 25): delete `email: { title: "E-mail Privé", desc: "Des boîtes sur votre propre domaine" },`
- `home.subheading` (line 34): `...déployez serveurs, hébergement cPanel et e-mail privé depuis...` → `...déployez serveurs et hébergement cPanel depuis...`
- `home.products.lead` (line 74): `"Sept produits ciblés,...` → `"Six produits ciblés,...`
- `home.products.items.hosting.price` (line 79): `price: "mensuel ou annuel"` → `price: "7 jours ou mensuel"`
- `home.products.items.email` (line 82): delete the line.
- `hosting.features` "Payé depuis votre portefeuille" (line 148): `desc: "Offres mensuelles ou annuelles débitées de votre solde prépayé...."` → `desc: "Offres de 7 jours ou mensuelles débitées de votre solde prépayé. Aucune carte conservée pour les renouvellements."`
- `app.palette.items.email` (line 325): delete `email: "E-mail Privé",`
- `footer.tagline` (line 339): `...Domaines, DNS, serveurs et e-mail depuis...` → `...Domaines, DNS et serveurs depuis...`
- `footer.links.email` (line 349): delete `email: "E-mail Privé",`

#### `site.es.js`
- `meta.description` (line 6): `...despliega VPS, RDP, hosting cPanel y correo privado offshore desde...` → `...despliega VPS, RDP y hosting cPanel offshore desde...`
- `nav.items.email` (line 25): delete `email: { title: "Correo Privado", desc: "Buzones en tu propio dominio" },`
- `home.subheading` (line 34): `...despliega servidores, hosting cPanel y correo privado desde...` → `...despliega servidores y hosting cPanel desde...`
- `home.products.lead` (line 74): `"Siete productos enfocados,...` → `"Seis productos enfocados,...`
- `home.products.items.hosting.price` (line 79): `price: "mensual o anual"` → `price: "7 días o mensual"`
- `home.products.items.email` (line 82): delete the line.
- `hosting.features` "Pagado desde tu monedero" (line 148): `desc: "Planes mensuales o anuales cargados a tu saldo prepago...."` → `desc: "Planes de 7 días o mensuales cargados a tu saldo prepago. Sin tarjeta guardada para renovaciones."`
- `app.palette.items.email` (line 325): delete `email: "Correo Privado",`
- `footer.tagline` (line 339): `...Dominios, DNS, servidores y correo desde...` → `...Dominios, DNS y servidores desde...`
- `footer.links.email` (line 349): delete `email: "Correo Privado",`

### C. NOT in scope / leave alone
- `hosting.features` "Mail on your domain / E-mail sur votre domaine / Correo en tu dominio" — this is a genuine cPanel capability; user only scoped billing wording, not this feature. Leave.
- DNS MX record `{ type: "MX", name: "mail", ... }` in `components/home/HeroShowcase.jsx` — DNS demo, not email product. Leave.
- `legal.*`, `pricingPage.plansSubtitle` ("annual billing … two months free"), `hosting.monthly`/`hosting.annually` toggle labels — leave (functional toggle / legal). 
- `components/marketing/marketing-ui.jsx` `email:` image URL entry — still imported by `Pricing.jsx` and `Api.jsx`; harmless, leave.
- Account/auth email everywhere (`ChangeEmail`, `IsEmailVerified`, notifications, footer mailto) — KEEP.

---

## VERIFICATION AFTER EDITS
1. `sudo supervisorctl restart frontend` and wait ~30s (prod rebuild).
2. Grep sanity: `grep -rn "/email" /app/frontend/src` should return no product links (only mailto stays).
3. Screenshot `/` (REACT_APP_BACKEND_URL from `/app/frontend/.env`) — confirm Products grid has NO "Private Email" card, hosting card price reads "7 days or monthly".
4. Screenshot `/hosting` — the "Paid from your wallet" feature reads "7-day or monthly plans…".
5. Check nav "Products" dropdown, footer Products column, and command palette (Cmd/Ctrl+K) have no Email entry.
6. Visit `/email` → should now 404 / redirect (route removed). Ensure no console errors from the removed route.
7. Toggle EN/FR/ES to confirm all three locales render without the email item and with correct cPanel wording.

This is a small, focused change set — self-test with a couple of screenshots is sufficient (no need for full testing_agent unless something breaks).
