# Nameword — Next Action Items (Engineering Handoff)

**Last updated:** 2026-09-12
**Author:** previous agent (after delivering P0 · C1)
**Audience:** the next agent picking up the Product/Checkout/Provisioning roadmap.

This is the single source of truth for what to build next. It maps the approved
audit plan (P0/P1/P2) to concrete, file-level implementation steps. Do items in
order; each is independently shippable and testable. **Finish + report + ask the
user after each item** (per the workflow), and TEST BACKEND before frontend.

---

## 0. Status snapshot (read this first)

**DONE**
- **App setup**: Node/Express backend (`bin/www`, port 8001, supervisor runs `bash /app/backend/start.sh`), React/Vite frontend (port 3000). Real Railway MongoDB, real Nomadly reseller key, DynoPay/Brevo/Google creds in `/app/backend/.env`. Frontend `VITE_API_BASE_URL` in `/app/frontend/.env`.
- **"Private Email" product removal + cPanel "7 days or monthly" copy** (see `/app/memory/REMOVE_EMAIL_TASK.md`).
- **P0 · C1 Ownership-scoping** (security). Lists + management actions are scoped to the buyer via their `Order` records. See §2 for the machinery you will REUSE.

**PROVIDER MODE = `dry_run`** (GET `/api/v1/reseller/health` → `mode:"dry_run"`).
In dry_run the wallet IS charged and the order IS recorded, but **nothing is
provisioned upstream** and there are **no real provider resource ids** — the app
falls back to synthetic refs `"<orderId>:<index>"`. Confirm with the user before
switching to live (see D5). Many P1/P2 items only fully work in live mode; build
them to degrade cleanly in dry_run.

**Key files you will touch repeatedly**
- Reseller proxy controller: `/app/backend/app/controllers/reseller/resellerController.js`
- Reseller routes: `/app/backend/routes/api/reseller.js`  (auth = `[currentUser, requireAuth]`)
- Provider HTTP client: `/app/backend/app/services/nomadlyReseller.js`  (`nomadly` axios instance)
- Ownership service (C1): `/app/backend/app/services/ownership.js`
- Checkout (wallet debit + provisioning): `/app/backend/app/controllers/checkout/CheckoutController.js`
- Checkout routes: `/app/backend/routes/api/checkout.js`  (`/quote`, `/orders`, `/orders/:id`)
- Order model: `/app/backend/app/models/Order.js`
- Wallet/Transaction models: `/app/backend/app/models/Wallet.js`, `Transaction.js`
- Frontend reseller client: `/app/frontend/src/api/reseller.js`
- Frontend pages: `pages/DomainsNomadly.jsx`, `pages/HostingNomadly.jsx`, `pages/DnsManagerNomadly.jsx`, `components/servers/ServersPage.jsx` (VPS+RDP), `pages/checkout/*` (funnel: HostingUpsell, AccountGate, CartPage, Receipt).
- Email: `@getbrevo/brevo` already a dep; Brevo key live in `.env`. Find existing mailer util under `app/` (grep `brevo`/`sendEmail`) before adding a new one.
- Jobs (cron) live in `/app/backend/app/jobs/*` and are `require()`d in `app.js` — reuse this pattern for reminders/reconciliation.

**Seeds / test users** (idempotent):
- `cd /app/backend && node scripts/seed_c1_test.js` → `c1-owner-a@nameword.local` / `c1-owner-b@nameword.local` (pwd `Owner@12345`), each with 1 order (domain+vps+hosting, dry_run). Owns `c1-owner-a.com` / `c1-owner-b.com`.
- `node scripts/seed_test_users.js` → `buyer@nameword.local` / `Buyer@12345` (wallet $50), `demo@nameword.local` / `Demo@12345`.
- Auth: `POST /api/v1/auth/login {email,password}` → `{token}`; send `Authorization: Bearer <token>`.

**Testing protocol:** update `/app/test_result.md` BEFORE calling `deep_testing_backend_v2`; do NOT call the frontend testing agent without explicit user permission. Never edit the protocol block. Keep `/app/memory/test_credentials.md` current.

---

## 1. Open decisions — GET THESE FROM THE USER before building the dependent item

- **D1 — Payment model** (blocks C4): (a) keep wallet-first + inline top-up of the exact shortfall in the cart with auto-resume, (b) add direct card/crypto pay-per-order, or (c) both. *Default: (a) now, (b) later.*
- **D2 — Auto-renew default** (blocks C2): on or off by default per product. *Default: OFF, opt-in.*
- **D3 — Engagement scope**: P0 only / P0+P1 / all. *Default: proceed P0 → review → P1.*
- **D4 — Provider capabilities** (blocks most of P1/P2): confirm which Nomadly endpoints exist for domain renew/privacy/lock/EPP/transfer/multi-year, VPS/RDP rebuild/resize/snapshot/console/reset-password, hosting renew/upgrade/addon/SSL. **Read the provider docs at `https://1.speechcue.com/apidoc` (crawl it) and/or ask the user.** Where unsupported → hide/disable the control cleanly, never show a dead button.
- **D5 — Live vs test mode + when**. *Default: stay dry_run until P0 done.* Switching to live means real charges + real provisioning; coordinate with the user.

---

## 2. REUSE — the C1 ownership machinery (don't reinvent)

`/app/backend/app/services/ownership.js` exports:
- `ownedList(userId, type)` → newest-first, de-duped array of the user's owned items of `type` (`domain|hosting|vps|rdp`), status in `["active","test_mode","pending"]`. Each entry `{ ref, order_id, idx, item, mode, createdAt }`.
- `findOwnedServer(userId, type, id)`, `findOwnedHosting(userId, user)`, `findOwnedDomain(userId, domain)` → the owned entry or `null` (use for 403 gating).
- `extractProviderIds(type, upstream)` → pulls `provider_id`/`provider_username`/`panel_url`/`server_ip` from a provider create response (defensive; extend paths when you see the real live shapes).
- `refFor`, `OWNED_STATUSES`.

`Order` item schema now has: `provider_id`, `provider_username`, `panel_url`, `server_ip`, plus `status ∈ {pending, active, test_mode, failed}`, `upstream` (sanitized), `refunded_usd`, etc. Order has `mode`, `status ∈ {paid, partial, failed}`, `subtotal_usd`, `charged_usd`, `refunded_usd`, `points_*`, `clientOrderId` (idempotency), `orderNumber`.

**Any new "my X" view or management action MUST go through ownership gating.** When you add lifecycle/management endpoints (renew, resize, etc.), resolve the target via `findOwned*` first and 403 on miss.

**Known gap to close along the way:** the DNS record endpoints (`/reseller/dns/:domain/records`, `.../nameservers`) are auth-gated but NOT yet ownership-scoped per domain (a signed-in user can read/write DNS for any domain in the reseller account). Gate these with `findOwnedDomain` when you build domain management (§4), but preserve the "point a domain you own" UX.

---

## 3. P0 (remaining) — C3: Asynchronous provisioning + live status + retry

**Why:** provisioning currently runs *inside* the `POST /checkout/orders` request, one item at a time (`CheckoutController.createOrder` → `provisionItem`). Instant in dry_run, but a live VPS/hosting build takes minutes → request timeout + charged buyer + static receipt. No status updates, no reconciliation, no retry (only refund).

**Build:**
1. **Record paid first, provision in background.** In `createOrder`: after the atomic wallet debit + `order.save()` with each item `status:"pending"`, return `201` immediately. Kick provisioning off-request (a) via a lightweight in-process queue/`setImmediate` loop, or (b) a `node-schedule` worker that scans `Order` for items in `pending`. Keep it simple: a `provisioning` worker module under `app/jobs/` that processes pending items, calls the existing `provisionItem`, then updates `item.status` (`active|test_mode|failed`), `item.upstream`, and `ownership.extractProviderIds(...)`. Guard against double-processing (per-item lock/flag).
2. **Live status endpoint.** Add `GET /api/v1/checkout/orders/:id` (exists) to include per-item live status; add `GET /api/v1/checkout/orders/:id/status` (lightweight poll) that, for items with `provider_id`, best-effort fetches live provider state and updates the order. Frontend Receipt page polls this every few seconds until all items are `active`/`test_mode`/`failed`.
3. **Provider status source.** Prefer a provider **webhook** if it exists (check D4 docs) — add `POST /api/v1/reseller/webhook` (verify a shared secret) to flip items to `active`. Otherwise poll `GET /vps|/rdp/:id`, `GET /hosting/:user`.
4. **Failed-item retry.** Add `POST /api/v1/checkout/orders/:id/items/:idx/retry` (ownership-gated) that re-runs `provisionItem` for a `failed` item without re-charging (the cash is already committed/was refunded — decide: retry re-debits only if previously refunded). Surface a "Retry" button on the receipt/dashboard.
5. **Refund path stays** for genuinely failed items (existing proportional refund in `createOrder`), but move it into the worker.

**Frontend:** `pages/checkout/` receipt + a dashboard "Orders" view showing live `provisioning → active` badges (reuse `statusStyle` in `ServersPage.jsx`). Poll `/orders/:id/status`.

**Test:** unit the worker with a forced-failure item; verify order returns 201 instantly with `pending`; verify status transitions; verify retry; verify no double-charge. Seed via `seed_c1_test.js` + a fresh order through `/checkout/orders`.

---

## 4. P1 — core parity

### 4a. C2 — Renewals, auto-renew, expiry + reminder emails (ALL products)
- **Data:** add to `Order` item (or a new `Subscription`-style record keyed to the order item): `expires_at`, `term_days`, `auto_renew` (bool, default per D2), `renewed_at`, `renewal_price_usd`. Compute `expires_at` at provisioning: domain = +1yr (or term), hosting = `duration_days`, vps/rdp = 30d.
  - Note: legacy `Subscription`/`RDPSubscription`/auto-renew jobs exist but are wired to the OLD provider — do NOT reuse blindly; they don't cover Nomadly items. Either extend them to read `Order` items or add a fresh, small lifecycle collection. Prefer a new `ResourceLifecycle` doc `{ userId, orderId, itemIdx, type, identifier, expires_at, auto_renew, status }` populated by the C3 worker.
- **Endpoints (ownership-gated):** `POST /api/v1/reseller/(domains|hosting|vps|rdp)/:id/renew` (wallet-paid; re-price live; extend `expires_at`), `PUT .../:id/auto-renew {enabled}`.
- **Jobs:** `app/jobs/` — auto-renew sweep (charge wallet, renew, else mark expiring) and reminder emails at T-7/T-3/T-1 days (Brevo). Follow existing job registration in `app.js`.
- **Frontend:** show "expires in N days / next charge" + Renew + auto-renew toggle on each item in Domains/Hosting/Servers lists.

### 4b. C4 — Payment friction (needs D1)
- (a) **Inline top-up:** in `CartPage.jsx`, when `shortfall_usd > 0`, offer "Top up $<shortfall>" using the existing DynoPay embedded checkout (`POST /api/v1/wallet/dynocheckout-url`), then auto-resume `POST /checkout/orders`. Poll wallet balance / use the wallet webhook to detect the credit.
- (b) **Direct pay-per-order:** optional new flow to pay an order by card/crypto without pre-funding.
- Also (cheap wins in the cart): **promo code** field (a `PROMO.VALIDATE` endpoint/config exists — see `frontend/src/utils/promocode.js` + `ENDPOINTS.PROMO`), **tax/VAT** (Tax model + `/api/v1/tax/*` exist; apply in `/quote` + `/orders`), and multi-currency display later.
- **Order confirmation email**: send a receipt via Brevo on completion (currently NOT sent at checkout).
- **Cart persistence**: cart is browser-only (`useCart`); persist to the account (there's a `CartItem` model) so it survives device switch and restores after login.

### 4c. Domain registrar management (re-connect existing UI)
A full domain manager exists in the codebase (renew/privacy/lock/nameservers/forwarding/bulk/whois — see `ENDPOINTS.DOMAIN` in `frontend/src/config/api.js`) but is wired to the OLD provider. Re-point the needed actions to Nomadly (confirm support via D4):
- **Renew** (→ 4a), **WHOIS privacy** on/off, **registrar lock** on/off, **EPP/auth code** retrieval, **registrar nameserver** editing. Ownership-gate all via `findOwnedDomain`.
- Frontend: expand `DomainsNomadly.jsx` "Manage" beyond the current DNS-only link.

### 4d. Hosting renew/upgrade + provisioning status
- **Renew** + **upgrade/downgrade** (wallet-paid) with expiry + auto-renew (4a); surface provisioning status (C3). Add-on domains / SSL status / usage → §5.

### 4e. VPS/RDP lifecycle + credentials hygiene
- **Renew + expiry + auto-renew** (4a) and **provisioning status** (C3).
- **Credentials hygiene:** stop showing a persistent plaintext password. Offer one-time reveal / password-reset / SSH-key at deploy (the current dry_run returns `password:null`; in live, prefer a reset endpoint over storing/echoing the password).

---

## 5. P2 — depth & delight (do after P1, gated by D4)
- **Domains:** multi-year registration at checkout, transfer-in flow, registrant/contact management, DNSSEC, DNS presets (email/website).
- **Hosting:** add-on domain management, SSL install/status, basic usage/quota panel.
- **VPS/RDP:** rebuild/reinstall OS, resize/upgrade, snapshots/backups, console/VNC, bandwidth/usage metrics, reverse DNS/IP mgmt, SSH keys, downloadable `.rdp` file + connect guidance.
- **Checkout:** tax/VAT everywhere, promo codes, multi-currency, and a **server-first configure→checkout funnel** (today the funnel is domain-centric; VPS/RDP are second-class).

---

## 6. Cross-cutting engineering notes
- **Never** hardcode URLs/ports; backend uses `process.env`, frontend uses same-origin (`window.location.origin + /api/v1`) — see `frontend/src/config/api.js`. All backend routes are under `/api`.
- Use **UUIDs**, never Mongo ObjectId, in any NEW client-facing identifiers (existing order `_id` is used internally only).
- Keep reseller response **shapes stable** — the frontend depends on `{domains:[]}`, `{vps:[]}`, `{rdp:[]}`, `{panel_url,server_ip,accounts:[]}`, server item `{id,hostname,status,ip,plan,region}`, hosting account `{username,suspended,domain}`.
- Provider latency is normal — keep 30s timeouts; make per-resource enrichment best-effort (`Promise.allSettled`) so one slow call never breaks a list.
- Third-party work (new providers, payment, email templates) → use the integration playbook expert and ask the user for any missing keys BEFORE coding.

---

## 7. Suggested order for the next agent
1. Ask user for **D1, D2, D4, D5** (D3 already defaulted to P0→review).
2. **C3** async provisioning + status + retry (finishes P0). Test backend → ask before frontend.
3. **C2** lifecycle (expiry/renew/auto-renew/reminders).
4. **C4** payment friction (per D1) + order emails + cart persistence.
5. Domain registrar management (4c), then hosting (4d) and VPS/RDP (4e) parity.
6. P2 depth items as prioritized by the user.
