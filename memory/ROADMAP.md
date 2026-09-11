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
