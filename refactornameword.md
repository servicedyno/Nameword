# Refactor Nameword — Action Items & Roadmap

> Living backlog for the Nameword platform. Consolidates (A) the Nomadly Reseller API
> migration (replacing the dead third-party integrations) and (B) the remaining
> `UX_REVIEW.md` findings. Ordered by priority. Each item lists **What · Why · Where · Done-when**.

---

## Status snapshot (as of this doc)

**Done**
- App re-set-up and running on the provided Railway MongoDB (`…nozomi.proxy.rlwy.net:54383/nameword`), DB seeded.
- **VPS & RDP storefront** built on the **Nomadly Reseller API** (`https://1.speechcue.com/reseller/v1`):
  - Backend proxy `/api/v1/reseller/*` (key server-side) — health, account, full VPS + RDP lifecycle. Tested 10/10.
  - Frontend public pages `/vps` and `/rdp` (+ nav links): live catalog, deploy modal, "Your servers" manager, skeleton/empty/error states.

**Key context for all items below**
- The Nomadly API is a **single unified provider** for `domains, dns, vps, rdp, hosting`. One key replaces OpenProvider, ConnectReseller, HostBay, UpCloud, Google Cloud Compute, WHM, Plesk and Cloudflare.
- Provider currently runs in **`dry_run` mode** (`GET /reseller/health` → `mode`). Create/charge calls are simulated (priced preview, no wallet debit, no real resource). Flip to **live** provider-side to provision for real.
- Auth caveat: the app's own email/password login needs email verification which is **broken** (Brevo key is a placeholder). New product pages were made **public** so they're testable today.
- Env: `NOMADLY_API_BASE_URL`, `NOMADLY_API_KEY` in `/app/backend/.env`. Backend proxy pattern: `app/services/nomadlyReseller.js` + `app/controllers/reseller/resellerController.js` + `routes/api/reseller.js`.

---

## A. Nomadly Reseller API migration (replace dead integrations)

### A1 — Domains: search + register live  🔴 P0
- **What:** Point domain search and registration at the reseller API (`GET /domains/search?domain=`, `POST /domains/register`, `GET /domains`).
- **Why:** Current OpenProvider/ConnectReseller/HostBay integrations are dead → domain search/registration is broken (infinite loader).
- **Where:** Backend — add `/api/v1/reseller/domains/*` to `routes/api/reseller.js` + controller (mirror the VPS pattern). Frontend — `src/pages/Domain.jsx`, `src/components/domain/*`, `src/api/domains.js`.
- **Done when:** Searching a domain returns availability + price from Nomadly; registering (in dry_run) returns a priced preview; results render without a full-page blocking loader.

### A2 — cPanel Hosting live  🔴 P0
- **What:** Sell the reseller hosting plans (`GET /hosting/plans`, `POST /hosting` with `domain_mode` byo/buy, `GET /hosting`, suspend/unsuspend, terminate, one-click login).
- **Why:** Hosting plans page currently returns empty (dead providers).
- **Where:** Backend — `/api/v1/reseller/hosting/*`. Frontend — `src/pages/Hosting.jsx`, `src/components/hosting/*`, `src/api/hosting.js`, plus the "Websites" management pages.
- **Done when:** Hosting catalog shows Nomadly plans (Premium/Golden Anti-Red) with prices; create flow works in dry_run; account list renders.

### A3 — DNS records manager (free)  🟠 P1
- **What:** A/AAAA/CNAME/MX/TXT CRUD + nameserver control via the reseller DNS endpoints (`GET/POST/PUT/DELETE /dns/:domain/records`, `PUT /dns/:domain/nameservers`). These are **free** (no wallet charge).
- **Why:** Fixes the "DNS Management is really nameservers" confusion (UX §2) and gives a real records editor.
- **Where:** Backend — `/api/v1/reseller/dns/*`. Frontend — `src/components/front-admin/domain/DNSManagement/*` (or a new records panel).
- **Done when:** Users can list/add/edit/delete DNS records for a domain they own; nameservers vs records are clearly separated.

### A4 — Tie provisioning to app auth + wallet  🟠 P1
- **What:** Move `/vps`, `/rdp` (and new domains/hosting) behind the app login and record purchases against the app's own user + wallet; map the app wallet to the reseller wallet balance.
- **Why:** Currently public + uses the single shared reseller wallet; not per-user.
- **Where:** `src/routes/Router.jsx` (move routes under the `ProtectedRoute`/`FrontLayout` group), backend user association, `app/models/*`.
- **Done when:** Only logged-in users can deploy; each server/domain/hosting record is owned by a user; wallet debits reflected in the app.
- **Blocked by:** app email login (see C-misc: needs a working mail key or a verification bypass for testing).

### A5 — Go-live switch & wallet top-up  🟡 P2
- **What:** Surface the provider `mode` in the UI and (once live) a wallet top-up path; handle `402 insufficient_wallet_balance` and `502 provisioning_failed` (auto-refunded) gracefully.
- **Why:** Smooth transition from dry_run → live; clear messaging on balance/refunds.
- **Where:** `src/components/servers/ServersPage.jsx` + future domains/hosting flows.
- **Done when:** UI shows live/test mode, blocks or warns on low balance, and shows real IP/credentials after a live deploy.

### A6 — Deploy presets (spark)  🟢 P2
- **What:** One-click server presets (e.g. "Ubuntu web server", "Windows RDP - dev box") that pre-fill plan/region/OS/hostname in the deploy modal.
- **Why:** Faster, friendlier buying for first-timers.
- **Where:** `src/components/servers/ServersPage.jsx`.
- **Done when:** Selecting a preset opens the deploy modal pre-filled; user can still tweak before deploying.

---

## B. UX_REVIEW.md backlog (remaining)

### B1 — Loader / empty / error states on /domain and /hosting  🔴 P0
- **What:** Replace the full-screen blocking `<Loader/>` with inline skeletons + explicit empty & error states + a request timeout; never grey out the nav.
- **Why:** Slow/failed calls currently lock the whole page (infinite spinner). (UX §1, §3, headline #4)
- **Where:** `src/pages/Domain.jsx` (L94), `src/pages/Hosting.jsx` (L188-208).
- **Note:** The new `/vps` `/rdp` pages already follow this pattern — reuse it.
- **Done when:** Both pages show skeletons then content/empty/error; nav stays usable.

### B2 — Domain results card fixes  🟠 P1
- **What:** Turn inert status "buttons" into real badges; add a **years selector + WHOIS-privacy toggle + visible renewal price** at the result card; cut suggestion debounce from **2000ms → ~300ms**.
- **Where:** `src/components/domain/search-domain-card.jsx` (L152/158/212, L164-170, L74-89), `src/components/domain/search-domain.jsx` (L67).
- **Done when:** Badges are non-interactive; term/privacy chosen at results; renewal price visible; suggestions feel instant.

### B3 — Searchable domain switcher  🟠 P1
- **What:** Replace the sidebar native `<select>` domain switcher with a searchable combobox; simplify active-domain resolution.
- **Where:** `src/components/admin-common/sidebar.jsx` (L236-304, L719-768).
- **Done when:** Users can type-to-filter domains; correct domain data loads after navigation.

### B4 — Accessibility pass  🟠 P1
- **What:** `aria-label` on all icon-only buttons (search, hamburger, kebab); restore a visible `focus-visible` ring where `outline-none` was used.
- **Where:** `src/layouts/FrontLayout.jsx` (L99), `src/components/domain/search-domain.jsx` (L151), `src/index.css` (L702), `SimpleStepper.jsx` (L11), and misc.
- **Done when:** Screen readers announce all controls; keyboard focus is visible everywhere.

### B5 — Stop leaking provider names on hosting cards  🟠 P1
- **What:** Show the real plan name, not the internal provider (`hostbay`/`connectreseller`) capitalised.
- **Where:** `src/components/hosting/monthly-billing-plan.jsx` (L55-60).
- **Done when:** Plan titles are branded; no vendor names surface. (Naturally resolved by A2 if hosting moves to Nomadly plan names.)

### B6 — Branded confirm modal + stepper back-nav  🟡 P2
- **What:** Replace native `window.confirm()` delete with a branded modal; enable clicking the setup stepper to jump back to completed steps.
- **Where:** `src/components/front-admin/websites/Websites.jsx` (L414-420), `websites/SetupWebsite.jsx` (L285).
- **Done when:** Delete uses an on-brand modal; stepper supports back-navigation.

### B7 — Responsive / tablet fixes  🟡 P2
- **What:** Introduce an `lg` sidebar state instead of jumping straight to `xl` (tablets 768–1279px currently get the mobile drawer); make wide management tables card-ify under `md`.
- **Where:** `src/layouts/FrontLayout.jsx` (L19, L42), DataTables in Websites/domain lists.
- **Done when:** Tablet layout uses space well; tables are usable on phones.

### B8 — Polish  🟢 P2
- **What:** Remove production `console.log`s; guard `$0.00` price rendering; wire the decorative `FiInfo` tooltips; fix the hard-coded 20% tax flicker on checkout.
- **Where:** `PaymentCheckout.jsx` (L185-333, L62), `search-domain-card.jsx` (L169/223, L164-170).
- **Done when:** Console is clean; no misleading "$0.00" / "free"; tooltips work; tax doesn't flicker.

---

## C. Misc / enablers (not user-facing but unblock the above)

- **Working mail key (Brevo/SMTP)** — restores email verification, password reset, and unblocks app login (needed for A4). Provide a real key or add a test-only verification bypass.
- **Rotate all leaked credentials** — the original repo was backdoored; treat every pasted key as compromised (see `memory/PRD.md`).
- **Payments** — decide whether to keep DynoPay (currently dead) or fund purchases via the Nomadly wallet model.

---

## Suggested execution order
1. **B1** (loader/empty/error) — quick, high impact, pattern already exists.
2. **A1 Domains live** → **A2 Hosting live** → **A3 DNS** (restores the core buy flows on the new provider).
3. **B2 / B5** (domain results + hosting plan names) — mostly resolved alongside A1/A2.
4. **A4** (auth + wallet) once a mail key exists.
5. **B3 / B4** (domain switcher, a11y), then **A5 / A6 / B6 / B7 / B8** polish.


---

## Session Log — Env setup + Reseller backend expansion

### Done
- **App online**: recreated `backend/.env` + `frontend/.env` from provided creds; URL vars pointed at the real pod preview URL (`49dcdd71-…`, not the stale `5c680fc7-…` in the pasted env); `yarn install` (backend); supervisor rewritten to run Node backend (:8001) + Vite (:3000). Both RUNNING; homepage renders.
- **Integrations validated LIVE**:
  - MongoDB (Railway proxy `nozomi.proxy.rlwy.net`) — connected; already seeded (plans/tiers/badges/1 admin).
  - Nomadly Reseller API — key live, mode `dry_run`, products: domains, dns, vps, rdp, hosting.
  - Brevo email — real key applied & validated (acct Moxx Technologies LLC, ~4878 credits; sender `hi@dynopay.com` — still needs sender verification in Brevo).
  - DynoPay crypto — NEW API `https://dynopay.com/api/user` + `x-api-key` (old `api.dynopay.com` JWT/company_id flow retired). Validated: getSupportedCurrency / getBalance / createPayment AND **embedded checkout session** (`POST /embed/session` → `client_secret` + `checkout_url`) all 200.
- **Master plan**: `/app/REPLAN.md` (architecture + UI/UX + phased backlog). Decisions locked: **markup 0%** (resell at API cost), **build in dry_run then flip live**, **public catalog + gated checkout**.
- **Backend — reseller proxy expanded** (mirrors VPS/RDP `forward()` pattern):
  - Domains: `GET /reseller/domains/search`, `GET /reseller/domains`, `POST /reseller/domains/register`
  - DNS (free): records GET/POST/PUT/DELETE + `PUT /reseller/dns/:domain/nameservers`
  - Hosting: `GET /reseller/hosting/plans`, `POST /reseller/hosting`, `GET /reseller/hosting`, `POST .../:user/suspend|unsuspend`, `DELETE .../:user`, `GET .../:user/login`
  - Files: `backend/app/controllers/reseller/resellerController.js`, `backend/routes/api/reseller.js`. Smoke-tested live (dry_run): domain search returns availability+price (.com $39 / .net $51 / .io $244 via OpenProvider); hosting plans return real tiers/prices ($30/$75/$100…).
- **Frontend — reseller API client extended**: `frontend/src/api/reseller.js` now has searchDomain/listDomains/registerDomain, DNS CRUD + nameservers, hosting plans/create/list.

### Nomadly API contract (for UI/checkout build)
- Search → `{domain, available, price_usd, registrar, message}`
- Register (wallet-billed) → body `{domain, ns_choice?, nameservers?}` → `{charged_usd, wallet_balance_usd, result:{success, domain, registrar, nameservers}}`
- Billing: charged atomically BEFORE provisioning; `402 insufficient_wallet_balance`; `502 provisioning_failed` with `"refunded": true`; dry_run returns `would_provision` and never charges.

### In progress / Next
- Frontend **Domain Search catalog page** (live search + availability + price; skeleton/empty/error; replace the full-screen `<Loader/>`) — component build started. Brand tokens: primary `#191339`, darkbtn `#34228e`, tealdark `#16979a`, lightgray `#eae8f4`.
- Then: retail **order + wallet** spine (debit user wallet → Nomadly register → auto-refund on fail; markup 0%), **auth + wallet gating** at checkout, **DynoPay embedded top-up**, then **Hosting** + **DNS** management UIs.
- NOTE: the new backend proxy has NOT yet been run through the formal `deep_testing_backend_v2` agent.
