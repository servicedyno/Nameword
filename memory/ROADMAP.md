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
