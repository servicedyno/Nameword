# Nameword — Design Redesign Roadmap & Progress

Goal (user): make the whole app — especially DARK MODE — look "colorful and brilliant" (ref: Emergent builder dark UI: near-black + warm/vibrant gradient accents + glow + glass). Direction chosen: **HYBRID** = indigo core UI + warm amber→pink gradient for hero/reward/celebration moments.

Token-first strategy: dark theme is driven from `frontend/src/index.css` (`html.dark` variable overrides + opt-in `nw-*` utilities). Frontend is a Vite PROD build → after edits run `sudo supervisorctl restart frontend` (~20s rebuild).

Test creds: buyer@nameword.local / Buyer@12345 (data-rich), demo@nameword.local / Demo@12345. Theme via localStorage `theme`=dark|light. Pod URL: https://hosting-platform-15.preview.emergentagent.com

## ✅ DONE
- **Phase 1 — Brilliant dark theme:** layered near-black surfaces (#09080d app / #14121c cards / translucent borders) via `html.dark` token overrides; ambient signature glow (`.nw-app-bg` on shell + `html.dark body`); glass utilities; gradient+glow primary buttons; card elevation; table row-hover; dark scrollbars; legible text fallbacks; legacy light-tint aliases → dark.
- **Phase 2 — Hero stat cards:** Wallet balance (indigo→fuchsia) + Reward points (warm amber→pink) as glowing gradient stat cards with gradient headline numbers; Dashboard greeting name gradient + register-panel glow; Smart Suggestion card hover lift/glow.
- **Phase 3 — Rollout + mobile pass (auto-tested 100%):** Cart summary glow + gradient Total; Orders cards glow + gradient Charged; VPS/RDP wallet chip glow; boosted shared `.nw-hero`/`.nw-hero-glow` (lifts Domains/DNS/VPS/RDP/Pricing/SSL). Mobile 390px: no horizontal scroll on dashboard/wallet; bottom tab bar intact. auto_frontend_testing_agent: PASS on 9 pages, dark+light desktop + dark mobile, no white screens/JS errors, text legible, controls work.

## 🔧 IN PROGRESS (this session)
- (none — Phase 4 & 5 shipped, see below)

## ✅ DONE (cont.)
- **Phase 4 — Motion & delight (auto-tested PASS):** new `components/common/CountUp.jsx` (easeOutCubic, reduced-motion aware) drives count-up on Wallet balance ($50.00) + reward points (526.20); `.nw-rise` staggered fade/entrance on Wallet hero cards + Dashboard sections (title/suggestions/register). Values settle correctly, sections end at opacity 1.
- **Phase 5 — Auth showcase (auto-tested PASS, real login verified):** `AuthLayout.jsx` rewritten into a branded split-screen — vivid `.auth-brand-panel` gradient (indigo→violet→magenta + warm corner) with headline/eyebrow/3 feature bullets on the left, existing form via `<Outlet/>` on the right; `AuthNavbar` made transparent, logo hidden on lg (panel carries brand), controls `ml-auto`. Mobile stacks form-only (panel hidden), no horizontal scroll. All auth form logic preserved (password toggle, Google, validation, OTP routing).
- **Dark-mode CONTRAST pass (2025-07, auto-tested PASS):** user reported "numbers/amounts didn't show well in dark". Fixed at TOKEN level in `index.css` (all scoped to `html.dark`, light mode untouched): lifted `--color-gray-500` #64748b→#9aa1b6 (the muted colour behind 500+ number/amount/label usages; not used as a surface so safe); lifted legacy text tokens `--color-lightgray-500/600` + `--color-teallight-500`; bumped `--color-ink-muted`→#8f95aa; scoped rules so floating-label active/focus text (`.text-gray-600` + `.peer:focus ~ .peer-focus:text-gray-600`, ~187 uses) → #aab1c6 instead of near-invisible #3a3450 (bg/border-gray-600 overlays untouched); `.text-golder` text lifted; `hover:text-black` close-buttons kept light. Verified: floating labels compute exactly rgb(170,177,198); amounts 148+/165+/white; LIGHT mode unchanged, no regressions.

## ⏳ REMAINDER (not started)
- **Phase 6 — Light-mode parity:** soft tints + hero glow in light so it matches dark's premium feel.
- **Phase 7 — Deep polish:** cPanel Advanced tabs, DNS records table, crypto/checkout modal, OrderSuccess page, empty states, notification bell.
- **Non-design blocker — Email delivery:** MAIL_FROM_ADDRESS/BREVO_EMAIL = hello@nameword.local (NOT a verified Brevo sender) → OTP/welcome/reset emails won't deliver until switched to a verified sender (e.g. hi@nameword.com).
