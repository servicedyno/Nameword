# Nameword — Roadmap / Next Action Items

_Last updated: 2026-06 (Hostinger-style checkout funnel — post-build, testing deferred by user)_

Source of truth for prioritized backlog. Static problem statement lives in `PRD.md`.

---

## P0 — Verification (deferred from last session)
- **End-to-End Funnel Test**: Full Hostinger-style flow in-browser —
  `/domains` search → Add to cart → `/checkout/hosting` → `/checkout/account`
  (login + create-account paths) → `/cart` (quote, wallet panel, shortfall → Top up)
  → Pay → `/checkout/success/:id`. Covers header cart count, "Other options"
  Add/Added toggle, mobile layout, dark mode.
- **Wallet/Order integrity check**: Confirm `orders` and `wallets` collections reflect
  correct atomic deduction, refunds on failed items, and idempotent replay (`client_order_id`).

## P1 — Enable placeholder integrations (need real keys)
- **Google OAuth** — "Continue with Google" gate wired but placeholder creds.
- **Brevo email** — verification / password-reset emails (register currently auto-logs-in, no OTP).
- **DynoPay wallet top-up** — `/wallet` "Top up" CTA needs a live payment provider for the shortfall case.
- **Telnyx OTP / WHM / Plesk / Cloudflare / Telegram** — still placeholders.

## P2 — Feature backlog
- **Order history page** in dashboard (`GET /api/v1/checkout/orders` exists, no UI yet).
- **Hosting page → cart** — wire standalone `/hosting` "Select plan" into the checkout cart.
- **Renewal reminders** — domain/hosting expiry on dashboard + one-click renew from wallet.
- **Multi-year domain terms** — Nomadly registers 1 year only today.
- **Retire legacy `/api/v1/cart`** — `adminCard.jsx` / `SecurityCard.jsx` "Buy now" still call the old cart router; migrate to the new funnel.

## Known constraints (not bugs)
- Nomadly reseller API reports `dry_run` server-side → order items land as `test_mode`
  (wallet **is** charged, order recorded, nothing provisioned upstream). Only Nomadly flips this to `live`.
- Domain+hosting cart (~$69) exceeds seeded buyer wallet ($50) → correctly returns
  `402 insufficient_wallet_balance` (shortfall $19). Re-seed: `node scripts/seed_test_users.js` (resets to $50).

## Done (current session)
- **Short sign-up everywhere**: `/create-account` (`pages/auth/CreateAccount.jsx`) rewritten from the OLD long form (name/username/email/phone+country/password/confirm) to the SHORT form (email + password + confirm + "Continue with Google" + Sign In link), matching the checkout `AccountGate` and the "email + password + Google only" design decision. Backend `registerSimpleRules` only requires email+password, so all CTAs (Navbar, Home, Pricing, Email page, marketing CtaBand/PricingTiers, SignIn link) that point to `/create-account` now show the short page. Verified live via screenshot.
- **Brevo email LIVE (P1)**: Real BREVO_API_KEY wired (account "Moxx Technologies LLC", live). Sender set to verified `hi@nameword.com` (BREVO_EMAIL + MAIL_FROM_ADDRESS). Verified end-to-end — test transactional send returned a Brevo messageId. Register now delivers the verification code email; forgot/reset password emails now work. Register still auto-logs-in (best-effort email, non-blocking).
- **DynoPay wallet top-up LIVE via Embedded Checkout (P1)**: Rewired DynoPay to the NEW single-`x-api-key` REST API (base https://dynopay.com/api) — dropped the dead Bearer-JWT+company_id approach. `dynoPayHelper.js` rewritten (createPayment, embed/session, createUser, getSingleTransaction, getPaymentStatus). Wallet top-up (`getDynocheckoutUrl`) now returns an EMBEDDED session (checkout.dynopay.com/pay?...&embed=1 + clientSecret); `ensureWallet` made non-blocking. Frontend `wallet-modal.jsx` rebuilt as a 2-step embedded checkout: enter amount -> pay inside an in-app iframe (no full-page redirect), with live wallet-balance polling + postMessage listener for auto-confirmation + "Done"/"I've paid" controls. Webhook `/wallet/dynocheckout-webhook` credits on payment.confirmed (works with new payload; signature verification off since no webhook secret). Backend verified by testing agent (6/6): embedded session created (real upstream), min-$25 + auth validation enforced, no boot regression. Frontend built + lint clean; in-browser visual verification of the iframe modal still pending (auth pages are Cloudflare-gated for automated browsers).
- **Google OAuth (P1) — creds wired, callback path FIXED**: Real GOOGLE_CLIENT_ID/SECRET set in backend/.env. Corrected GOOGLE_REDIRECT_URL/GOOGLE_LINK_REDIRECT_URL from the wrong `/api/v1/auth/google/...` to the actual routes `/auth/google/callback` and `/auth/google/link/callback` (web routes mounted at `/auth`, NOT `/api/v1`). Verified: GET /auth/google 302s to accounts.google.com with correct client_id + redirect_uri. REMAINING (user-side): the preview callback URL must be added to the OAuth client's Authorized redirect URIs in Google Cloud — currently returns redirect_uri_mismatch (user likely registered only nameword.com prod URIs). PROD DEPLOY NOTE: `/auth/*` has no /api prefix, so production ingress must route /auth/* to the Node backend (8001); and set GOOGLE_REDIRECT_URL/GOOGLE_LINK_REDIRECT_URL to the nameword.com callbacks at deploy.
- **P0 Wallet/Order integrity — VERIFIED (6/6 by testing agent)**: Checkout money-path confirmed on the live Railway DB with seeded buyer (buyer@nameword.local / Buyer@12345, wallet $50). (1) /checkout/quote prices items + returns wallet_balance_usd + shortfall. (2) ATOMIC DEBIT: order for a $39 domain debited wallet $50->$11 exactly (findOneAndUpdate with balance.USD $gte guard = overdraft-safe). (3) IDEMPOTENT REPLAY: same client_order_id returns the SAME order with idempotent:true, NO double charge. (4) INSUFFICIENT: $100 hosting order -> 402 insufficient_wallet_balance, wallet unchanged. (5) REFUND-ON-FAILED: report-only — dry_run converts the provider 402 to item status 'test_mode' (not 'failed'), so refund path not exercisable in sandbox (code path exists: creditWallet on status==='failed'). (6) orders list/get OK. Buyer wallet re-seeded to $50 after.

## Still pending (next session)
- **P0 E2E checkout funnel (in-browser)** — SET UP but NOT RUN (session ended by user). test_result.md current_focus + run_ui:true already point at task "E2E checkout funnel in-browser (/domains -> cart -> /checkout/hosting -> /checkout/account -> /cart -> Pay -> /checkout/success/:id)". Login buyer@nameword.local / Buyer@12345. Verify header cart count, 'Other options' Add/Added toggle, mobile 390x844, dark mode. KNOWN RISK: preview Cloudflare bot-protection (429) may block automated login — may need manual check.
- **Google OAuth end-to-end** — creds wired + callback path fixed & verified our side; awaiting user to add the PREVIEW redirect URIs in Google Cloud (prod nameword.com URIs may already be there). Currently returns redirect_uri_mismatch until the preview callback is registered. Then run the live 'Continue with Google' flow.
- **P1 remaining placeholders**: Telnyx OTP, WHM, Plesk, Cloudflare, Telegram.
- **P2 backlog** (unchanged): Order history page UI (GET /api/v1/checkout/orders exists), Hosting page->cart wiring, renewal reminders, multi-year domain terms, retire legacy /api/v1/cart.
- **Remove domain Transfer** end-to-end (user confirmed yes earlier; not started).
- **PROD deploy note**: `/auth/*` (Google OAuth) has no /api prefix — production ingress must route /auth/* to the Node backend (8001); set GOOGLE_REDIRECT_URL/GOOGLE_LINK_REDIRECT_URL to nameword.com callbacks at deploy.

## Progress update (this session) — P2 backlog
- [DONE] Order history page — was ALREADY built: `pages/front-admin/OrderHistory.jsx`, route `/orders`, sidebar link, uses `checkoutAPI.listOrders` (GET /api/v1/checkout/orders). Roadmap note was stale.
- [DONE] Hosting → cart — `/hosting` "Select plan" now opens an Add-to-cart modal (BYO domain default, or Register-new which live-prices + adds the domain), calls the shared cartStore (addDomain/addHosting) and routes into the checkout funnel. BYO verified: adds hosting-only order, header cart badge +1, lands on /checkout/account. Provisioning uses domain_mode=byo (customer points our nameservers after payment). File: pages/HostingNomadly.jsx.
- [DONE] Retire legacy /api/v1/cart — migrated adminCard.jsx + SecurityCard.jsx "Buy now" to new cartStore.addDomain → /cart. Deleted frontend src/api/cartApi.js + backend routes/api/cart.js, controllers/cart/CartController.js, validations/cartRules.js, and removed the mount in routes/api/index.js. GET /api/v1/cart/list now 404.
- [DONE] Remove domain Transfer end-to-end — backend transfer routes were already gone (Nomadly-only surface) and the sync job was unscheduled/dead. Removed: Pricing "Transfer" column, Help "Transfer domains" article, home-hero Transfer tab (dead file), AppRail /transfer-domain match, transfer API client methods (api/domains.js) + endpoints (config/api.js). Deleted dead files: modals/transfer-domain-modal.jsx, modals/transfer-choose-domain-modal.jsx, domain/Transfer/StartTransfer.jsx + TransferlistTable.jsx, backend jobs/syncDomainTransferStatus.js. KEPT (not domain transfer): change-server-location + about-transfer-modal + transfer-complete-modal (hosting server relocation), HostingDetailsCard plan.transfer (bandwidth), register-domain-modal transferFeePerc, locale strings.
- [TODO] Multi-year domains — DECISION: keep 1-YEAR ONLY (Nomadly /domains/register supports only 1 year; user confirmed keep 1yr). Ensure UI never offers multi-year.
- [TODO] Renewal reminders + one-click renew — Nomadly exposes GET /renewals (unified expiry list w/ days_until_expiry + status buckets), POST /hosting/:user/renew (works), POST /domains/:domain/renew (dry-run price ok; live=501 not_implemented upstream). Build dashboard expiry reminders + renew-from-wallet (1-year).
