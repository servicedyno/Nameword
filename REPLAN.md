# Nameword — Full Replan (Architecture · UI/UX · Usability · Delivery)
> Master plan for turning Nameword into a clean **reseller storefront + control panel** powered by a single
> **Nomadly Reseller API** key, with a per-user **USD wallet** funded by **DynoPay crypto**, going **live**.
> Supersedes/consolidates `UX_REVIEW.md` + `refactornameword.md`. Nothing here is built yet — this is for approval.

---

## 0. Product vision (one paragraph)
Nameword is a **retail reseller**: customers register, top up a **Nameword wallet (USD) with crypto (DynoPay)**, and
buy **domains, DNS, shared hosting, VPS and RDP** — all fulfilled behind the scenes through **one Nomadly reseller key**
held server-side. Customers never see or hold provider keys. The **Nomadly reseller wallet** is the owner's *wholesale
float*; each customer's **app wallet** is the *retail balance*. Nameword's margin = retail price − Nomadly cost.

```
Customer ──buys──▶  Nameword (retail: per-user USD wallet, markup, orders)
                        │  server-side NOMADLY_API_KEY
                        ▼
                    Nomadly Reseller API (wholesale: shared reseller wallet, real provisioning)
                        ▼
                    domains · dns · hosting · vps · rdp
```

---

## 1. Confirmed decisions (from you)
| # | Decision | Impact |
|---|----------|--------|
| 1 | **Crypto = DynoPay** | ✅ **Key validated LIVE** (new API `https://dynopay.com/api/user`, `x-api-key`; createPayment → `data.redirect_url`). ⚠️ Backend code must be re-pointed from the dead JWT/company_id flow to the new `/createPayment` endpoint. Webhook secret optional (verify via `getPaymentStatus`). |
| 2 | **Email = Brevo (live key applied)** | ✅ Signup/verify/reset unblocked. Products can move behind login. ⚠️ Verify sender `hi@dynopay.com` in Brevo. |
| 3 | **Wallet = USD-only** | No FX/multi-currency work now; single currency across UI + ledger. |
| 4 | **Nomadly = go-live** | Real provisioning + real charges. ⚠️ Depends on Nomadly flipping the key to live **and** the reseller wallet being funded (now $5). |
| 5 | **Deliverable = this plan; wait for approval** | ✅ **APPROVED — build started.** Final calls: **markup 0%** (resell at API cost) · **build in dry_run then flip live** · **public catalog + gated checkout**. |

---

## 2. Current-state audit
### Built & working
- App runs live (Node/Express :8001 + Vite :3000), on your Railway Mongo (seeded), Nomadly key live (`dry_run`).
- **Reseller proxy** `/api/v1/reseller/*`: `health`, `account`, full **VPS** + **RDP** lifecycle (plans/list/create/get/action/delete/credentials). Tested 10/10.
- **VPS/RDP storefront** (`/vps`, `/rdp`): catalog + deploy modal + "your servers" manager, with skeleton/empty/error states. **Public** (no login), uses the **shared** reseller wallet directly (not per-user).
- Auth flows (register/login/verify/reset/2FA), per-user **Wallet/Transaction/Payment** models, DynoPay wallet-topup endpoints, domain **Overview** screen (the strongest existing UI).

### Broken / stranded (dead legacy providers)
- **Domains** search/register (OpenProvider/ConnectReseller/HostBay all dead) → infinite loader.
- **Hosting** plans (HostBay/ConnectReseller dead) → empty catalog.
- **DNS/Cloudflare**, WHM/Plesk cPanel, Telnyx OTP, FastForex FX, DynoPay endpoint → all dead/placeholder.

### Missing vs the reseller model
- No reseller proxy for **domains / dns / hosting** (only vps/rdp).
- Reseller resources are **not owned per-user** (listing uses the shared account, not `userId`).
- No **retail markup/pricing** layer, no **wholesale→retail** wallet mapping, no **refund-on-provision-fail** path.
- Products are **public**, not tied to app auth + wallet.

### Debt from UX_REVIEW (still open)
Full-screen blocking loaders on `/domain` `/hosting`; inert "status buttons"; 2000ms suggestion debounce; hidden renewal price; no term/privacy at results; provider names leaking as hosting titles; native `<select>` domain switcher; DNS-vs-nameserver naming confusion; `window.confirm` deletes; tablet breakpoint jumps at `xl`; icon-only buttons lack `aria-label`; removed focus rings; checkout 20% tax flicker; production `console.log`s; `$0.00` price rendering.

---

## 3. Target architecture

### 3.1 Backend — expand the reseller proxy to all 5 products
Mirror the proven VPS/RDP pattern (`services/nomadlyReseller.js` + `controllers/reseller/*` + `routes/api/reseller.js`):
- **Domains:** `GET /reseller/domains/search`, `GET /reseller/domains/tld-price`, `POST /reseller/domains/register`, `GET /reseller/domains`, `POST /reseller/domains/:name/renew`, transfer, lock/privacy/autorenew, auth-code.
- **DNS (free):** `GET/POST/PUT/DELETE /reseller/dns/:domain/records`, `PUT /reseller/dns/:domain/nameservers`.
- **Hosting:** `GET /reseller/hosting/plans`, `POST /reseller/hosting` (domain_mode byo/buy), `GET /reseller/hosting`, suspend/unsuspend/terminate, one-click login.
- Keep the key **server-side**; every call adds provider latency (a few seconds) — keep timeouts + graceful errors.

### 3.2 Backend — retail layer (the important new part)
- **Ownership:** a `ResellerAsset` (or extend existing Subscription/Domain models) linking every Nomadly resource id → `userId`, product type, status, wholesale cost, retail price, renewal date. All "my X" lists read from our DB filtered by `userId`, then hydrate live status from Nomadly.
- **Pricing (API-driven):** the Nomadly reseller API returns `price_usd` per plan/TLD — that's the single source of truth (no manual price table). Retail = API price × (1 + **optional markup%**). Markup is a simple config lever (global + optional per-product override); default 0% = resell at cost. Note: API price = what Nomadly charges our reseller wallet, so markup>0 is where margin comes from.
- **Order/checkout service (idempotent):**
  1. Compute retail price. 2. **Debit user wallet** (USD) in a transaction (reject with clear message if insufficient → prompt top-up).
  3. Call Nomadly to provision. 4. On success: persist asset owned by user. 5. On Nomadly failure (`502 provisioning_failed`) or `402 insufficient_wallet_balance` (owner float empty): **auto-refund the user wallet** and show a clear, honest message.
- **Wallet top-up via DynoPay EMBEDDED checkout (on-site):** server creates a session `POST /api/user/embed/session` (x-api-key, server-side) → returns `client_secret` + `checkout_url` (`&embed=1`); frontend mounts the embedded iframe (via DynoPay `embed.js`) in a modal so the user pays **without leaving Nameword**. Confirm payment via **webhook** (`payment.confirmed`) and/or `GET /getPaymentStatus/:id`, then credit the user wallet (idempotent by payment id). `DYNO_PAY_WEBHOOK_SECRET` optional (we re-verify via getPaymentStatus). Ledger entries for buy/refund/topup/renewal.
- **Go-live:** surface `mode` from `/reseller/health`; when `live`, real IPs/credentials returned; add owner alerting when the reseller float is low.

### 3.3 Backend — reminders/jobs
Point existing renew/reminder jobs (VPS/RDP/cPanel/domain/hosting expiry, auto-renew) at the reseller assets + user wallets (auto-renew debits user wallet; on failure notify + grace period).

### 3.4 Frontend — one consistent product pattern
Every product uses the same **Catalog → Configure → Pay-from-wallet (or Top-up) → Manage** flow and the same
**skeleton / empty / error / timeout** states (already in `/vps` `/rdp`; make it a shared `<AsyncSection>` used everywhere). Never grey out the nav.

### 3.5 Auth & routing
Move `/vps` `/rdp` (and new domains/hosting buy+manage) **behind `ProtectedRoute`** with per-user ownership (now that email works). Keep public **catalog/pricing** pages for discovery; require login only at **deploy/checkout**.

---

## 4. UI/UX & information-architecture redesign

### 4.1 Navigation / IA (top nav + authed sidebar)
- **Public top nav:** Domains · Hosting · VPS · RDP · Pricing · Support — each links to a real catalog (VPS/RDP already exist; add Domains/Hosting parity).
- **Authed control panel (sidebar):** Dashboard · Domains · DNS · Hosting (Websites) · VPS · RDP · **Wallet & Billing** · Account. Replace the ad-hoc per-route sidebars with one consistent panel.
- **Dashboard** = unified "my assets" overview (wallet balance + top-up CTA, expiring soon, quick actions per product).

### 4.2 Buy flows (fixes UX_REVIEW P0/P1)
- **Domains:** results as real **badges** (not fake buttons); **term (years) selector + WHOIS-privacy toggle + visible renewal price** at the result card; suggestion debounce **2000ms → ~300ms**; guard `$0.00`; wire `FiInfo` tooltips; skeleton/empty/error instead of full-page loader.
- **Hosting:** show **branded plan names** (no `hostbay`/`connectreseller` leakage); Monthly/Annual with honest savings; keep the 5-step wizard but allow **stepper back-nav**; decouple provider calls from step progression.
- **VPS/RDP:** add **presets** ("Ubuntu web server", "Windows dev box"); show **live/test mode**; low-balance warning with top-up.
- **Checkout:** wallet-first; **DynoPay embedded (iframe modal) for top-up — no redirect off-site**; kill the hard-coded **20% tax flicker** (skeleton the total until real rate); remove production `console.log`s; clarify payment-method labels (crypto/wallet only — no "Credit/Debit Card" copy).

### 4.3 Manage flows
- **Searchable combobox** domain switcher (replace native `<select>`); robust active-domain resolution.
- **DNS**: clearly separate **Nameservers** vs **DNS records**; a real A/AAAA/CNAME/MX/TXT records editor (free).
- Replace `window.confirm` deletes with a **branded modal**.
- Persistent inline **error + retry** on data cards (not toast-only).

### 4.4 Cross-cutting quality
- **Accessibility:** `aria-label` on every icon-only button; restore visible `focus-visible` rings; verify custom radios are announced.
- **Responsive:** introduce an **`lg` sidebar state** (fix the tablet 768–1279px gap); card-ify wide tables under `md`.
- **Consistency:** shared components for cards, price, badges, async states, modals, empty states, skeletons.

---

## 5. Consolidated backlog (phased) — What · Why · Done-when

### Phase 0 — Enablers / unblock (do first)
- **E1 DynoPay** — ✅ **DONE (key live & validated).** New API confirmed working (`POST /createPayment` → `data.redirect_url`; supported coins incl. BTC/ETH/USDT). Remaining build work: re-point backend to the new endpoint + wire webhook/`getPaymentStatus` to credit the user wallet.
- **E2 Brevo sender verify** — *Why:* verification emails actually deliver. *Done:* signup email lands. *(applied key; verify sender)*
- **E3 Nomadly go-live + fund reseller wallet** — *Why:* real provisioning. *Done:* `/reseller/health` → `live`; a paid VPS returns a real IP. *(needs Nomadly-side flip + float top-up)*
- **E4 Rotate leaked credentials** — repo was backdoored; treat all as compromised.

### Phase 1 — P0 core buy flows on Nomadly
- **P0-1 Loader/empty/error** on `/domain` `/hosting` (shared `<AsyncSection>`; never block nav).
- **P0-2 Domains live** (reseller proxy + `api/domains.js` + rebuilt results/cart) — search/price/register in real mode.
- **P0-3 Hosting live** (reseller proxy + branded plans + create wizard) — catalog + create + manage.
- **P0-4 Retail layer** — per-user ownership + markup pricing + wallet debit + **refund-on-fail** + idempotency.
- **P0-5 Auth+wallet gating** — move deploy/checkout behind login; per-user asset lists.

### Phase 2 — P1 usability
- **P1-1 Domain results** (badges + term/privacy/renewal price + 300ms debounce).
- **P1-2 DNS records manager** (free CRUD; nameservers vs records split).
- **P1-3 Searchable domain switcher**.
- **P1-4 Accessibility pass** (aria-labels + focus rings).
- **P1-5 Kill provider-name leakage** on hosting cards (resolved by P0-3).
- **P1-6 Wallet UX** — balance, top-up (DynoPay), ledger/transactions, low-balance nudges.

### Phase 3 — P2 polish / delight
- **P2-1 Branded confirm modal + stepper back-nav.**
- **P2-2 Responsive/tablet** (`lg` sidebar; card-ified tables).
- **P2-3 Polish** — remove `console.log`, guard `$0.00`, wire tooltips, fix tax flicker.
- **P2-4 Deploy presets** (VPS/RDP one-click).
- **P2-5 Unified dashboard** (assets + expiries + spend).

---

## 6. Dependencies & risks (please note)
1. **DynoPay** — ✅ resolved: key is live on the new API (`dynopay.com/api/user`). Build work = re-point code to `/createPayment` + webhook/`getPaymentStatus` crediting. (Old `api.dynopay.com` JWT/company_id flow stays retired.)
2. **Go-live now** means real money: the shared Nomadly reseller wallet is **$5** — real orders will fail with `insufficient_wallet_balance` until funded. Provider must also **flip the key to live** their side. Recommend: build in dry_run, flip to live only after E1+E3.
3. **Brevo sender** `hi@dynopay.com` must be verified in the Brevo account or sends bounce.
4. **Nomadly domain/dns/hosting** endpoint shapes need confirming against their API (we've proven vps/rdp; will validate the rest before wiring UI).
5. Security: rotate all previously-pasted keys.

---

## 7. Recommended execution order
`E1/E2 → P0-1 → P0-2 → P0-3 → P0-4 → P0-5 → P1-1/P1-2 → P1-6(wallet) → P1-3/P1-4 → E3 go-live → P2 polish.`
Rationale: fix the fragile loaders first (fast, high impact), restore the core buy flows on Nomadly, add the retail wallet/ownership spine, then usability, then flip to live once money-in (DynoPay) and money-out (funded reseller float) are both ready.

---

## 8. Open questions for you
- **Markup:** pricing comes from the Nomadly API; do you want a margin markup on top (global % and/or per-product), or resell at API cost (0%)?
- **DynoPay:** ✅ resolved — embedded checkout works with your API key.
- **Go-live timing:** OK to build/verify in `dry_run` and flip to live only after DynoPay + reseller-float funding are ready? (strongly recommended)
- **Public vs gated:** keep public catalog pages for SEO/discovery and gate only at deploy/checkout — OK?
