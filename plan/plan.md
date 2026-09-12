# Full User-Journey Test Plan — Nameword (up to payment, no real purchase)

## 1. Objective
Exercise every customer-facing journey in the app from onboarding through to the
moment money would move — for every product and every payment method — and produce a
single pass/fail report. No real charge, no real crypto send, and no real server/domain
provisioning happens in this pass. Actual paid transactions are a separate, later round.

## 2. What "no real purchase" means here (the main decision to confirm)
The app has a built-in safe **Test mode**: while the upstream provider is in dry-run, a
banner reads *"your wallet is charged exactly as in live mode and the order is recorded,
but nothing is provisioned."* This gives two possible stopping points. They differ in how
much gets validated, so please pick one:

- **Option A — Stop at the review screen (nothing moves at all).**
  Each journey is driven to the final cart/checkout screen showing the correct total,
  wallet balance, points discount and an armed "Pay" button — but "Pay" is never clicked.
  Safest and literally "up to the point of payment," but the server-side order creation,
  points redemption and wallet debit are not exercised.

- **Option B — Use the built-in Test mode (recommended for wallet & points).**
  For payments that draw on **in-app wallet balance and reward points only** (both are
  pre-seeded fake credit), actually click "Pay." In Test mode this records an order and
  deducts the fake balance but provisions nothing and moves no real money. This validates
  the entire loop — checkout → points redemption → wallet debit → order history →
  renewals — and the fake balance is reset afterward. **No external/real payment ever
  happens under this option.**

**External payments are always Option A regardless of the above:** anything that leaves
the app to a hosted crypto/card page or wallet top-up is driven only up to the point where
the checkout link / crypto address is generated and the redirect is about to happen. We
verify the hand-off is produced; we never complete the external payment. That is the
boundary reserved for the later "real payment" round.

**Proposed default: Option B for wallet + points, Option A (hand-off only) for everything
external.** Confirm, or choose Option A across the board.

## 3. Journeys covered

### Onboarding & account access
- Sign up with email + password (new account each run).
- Email verification step (the code is available for the test to read even though
  outbound email is not configured — see §6).
- Sign in / sign out; session behavior.
- Forgot password → reset password.
- Google sign-in (start + redirect only — see §6).
- Telegram sign-in / link (UI presence only — see §6).
- Two-factor login prompt (where enabled).
- Change email, change password.
- Deactivate / reactivate / delete account (verified carefully so as not to destroy the
  seeded test accounts).

### Product ordering — each taken to the payment step
- **Domain registration** — search, availability + live price, add to cart, nameserver
  choice (Cloudflare / registrar / custom), proceed to pay.
- **cPanel hosting** — plan selection incl. the 7-day / monthly options, with a new
  domain and with a bring-your-own domain, proceed to pay.
- **VPS** — plan, region, OS, disk and billing cycle, proceed to pay.
- **RDP** — plan and subscription, proceed to pay.
- **Mixed cart** — domain + hosting together, to confirm bundle pricing to the pay step.

### Domain / DNS management (owned-item journeys, no purchase)
- DNS records view/add/edit/delete, nameserver changes, domain forwarding, WHOIS,
  privacy/lock toggles — driven as far as the current provider allows in dry-run.

### Account management
- Dashboard, order history, services & renewals (renew + auto-renew toggle to the pay
  step), billing / invoices (view + download), wallet transactions, refunds history,
  API keys (create/list/revoke), active sessions (view + sign-out), notification
  preferences, promo-code entry, tax/VAT display.

## 4. Payment-method coverage (the "point of payment" per method)
For every product above, the following are checked where the app offers them:

| Method | How far it is taken |
|---|---|
| In-app **Wallet** balance | Review with correct total + balance; then per §2 (Option B: pay in Test mode; Option A: stop before pay). |
| **Reward points** (pay with points) | Apply points, confirm discount and adjusted total; full and partial redemption; then per §2. |
| **Wallet funding / top-up** (hosted crypto/card) | Open top-up, choose amount, reach the generated hosted-checkout link / redirect — stop there. Never pay. |
| **Crypto** (currency list + payment address) | Reach supported-currency selection and generated address/QR — stop there. Never send. |
| **Per-product hosted checkout** (crypto/card link) | Reach the generated checkout link / redirect — stop there. Never pay. |
| **Insufficient balance path** | Confirm the "top up & pay" prompt appears and routes correctly. |

## 5. Accounts & data
- Seeded accounts are used (one with wallet credit, one with reward points) plus a fresh
  sign-up per run for the onboarding path.
- If Test mode debits are used (Option B), seeded wallet/points balances are restored at
  the end so the accounts are reusable.
- All runs are on this preview environment against the live database that is already
  connected.

## 6. Known integration limits (reported as "blocked / needs key", not as failures)
These are currently placeholders or need external setup, so those journeys are verified
only up to the point they hand off to the provider:
- **Outbound email** (verification, password-reset, order emails): not deliverable yet.
  The test reads the verification / reset codes directly so onboarding still completes.
- **Google sign-in**: the redirect to Google works; completing it requires this
  environment's callback URL to be whitelisted in the Google account first.
- **Telegram sign-in, SMS/mobile OTP**: providers are placeholders; UI is checked but the
  flow cannot complete.
- **Hosted crypto/card checkout & wallet top-up (DynoPay)**: reachable to the hand-off;
  full completion needs the remaining DynoPay company ID / webhook secret and is part of
  the later real-payment round. If even the hand-off cannot be generated, it is reported
  as a blocker.

## 7. Scope boundaries
- **In scope:** all customer-facing journeys listed above, to the payment step.
- **Out of scope (confirm):** completing any real or external payment; real upstream
  provisioning; the internal admin/back-office dashboard; performance, load and security
  testing.

## 8. Deliverable
- A pass/fail matrix of **journey × payment method**, each cell noting exactly where the
  flow stopped, with screenshots at the decisive steps.
- A prioritized list of blockers (with the specific missing key or setup for each).
- A short "ready for real-payment round" checklist of the exact points where the next
  round should resume.

## 9. Assumptions (change any before approval)
- A1. Default stopping behavior is **§2 Option B for wallet/points, Option A for all
  external payments**.
- A2. The internal admin dashboard is **not** included.
- A3. Placeholder-backed flows (email delivery, Google completion, Telegram, SMS, hosted
  crypto/card completion) are expected to stop at the provider hand-off and are reported
  as blockers, not failures.
- A4. Seeded test accounts and this preview environment/live DB are acceptable to test
  against; balances are reset afterward if Test-mode payments are used.

## 10. Decisions to confirm
1. §2 stopping behavior — accept the proposed default, or require "stop before pay"
   everywhere?
2. Is the admin/back-office area in or out of scope?
3. Is it acceptable to place **Test-mode (non-real) orders** on the live database using
   the seeded fake wallet/points balance (Option B), given balances are restored after?
