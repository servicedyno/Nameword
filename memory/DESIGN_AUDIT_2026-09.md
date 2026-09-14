# Nameword — Full Design/UX Audit (2026-09)

Scope: end-to-end visual + UX review of light AND dark mode. Screens reviewed live (buyer@nameword.local):
Landing (light+dark), Dashboard, Wallet, Payment history/Transactions, Mobile dashboard. System-level tokens in `frontend/src/index.css`.

## Verdict
Structure/IA, spacing and consistency are GOOD (indigo #4f46e5 brand, coherent layouts, solid responsive shell).
The weakness is VISUAL RICHNESS — especially DARK MODE, which is flat monochrome navy (`gray-950 #0b0f19`), low-contrast,
no depth/gradient/glow/warmth. Key "hero" numbers (wallet balance, reward points, dashboard) are presented plainly, not as delightful focal moments.

## Reference the user loves (Emergent builder dark mode)
Near-pure-black layered surfaces + warm sunset gradient accents (amber→coral→magenta) + soft ambient cloud/noise texture +
glassy rounded elevated cards + glowing pill CTAs + high-contrast white type + generous space.

## Current dark-mode implementation (root cause)
- `body` = `dark:bg-gray-950` (#0b0f19), cards `dark:bg-gray-900` (#111827), borders `dark:border-gray-700/800`.
- No layered elevation, no gradients, no glow, no ambient background, almost 100% indigo (no secondary accent for delight).
- Dark mode is per-component `dark:` variants (hundreds of usages) — a token remap in `@theme` + a few base rules can shift the whole app.

## Recommendations (prioritized)
P0 — DARK MODE OVERHAUL (biggest win):
  - Layered surfaces: app `#0a0a0f` → card `#141019/#17151f` → elevated `#1c1926`, hairline borders `rgba(255,255,255,.06)`.
  - Signature gradient for hero moments (wallet balance, primary CTA, rewards, celebration). Ask user: warm sunset vs vibrant indigo→violet→fuchsia vs hybrid.
  - Ambient background (subtle radial glows / faint noise) behind dashboard + auth.
  - Glass top bar + glass hero cards (backdrop-blur, translucent).
  - Glow on primary buttons + hover elevation on cards.
P1 — HERO NUMBERS: turn wallet balance / reward points / dashboard KPIs into gradient stat cards with icon, trend, glow.
P1 — TABLES (payments/transactions/domains): row hover, zebra or divider polish, color-code amounts (debit vs credit), stronger status pills, sticky header.
P2 — CARDS: Smart Suggestion + product cards need elevation, gradient border/glow on hover, better price emphasis.
P2 — AUTH pages: make sign-in/create-account branded split-screen with ambient art (currently plain).
P2 — TYPO SCALE: bigger, tighter display headings; more weight contrast.
P3 — MOTION: subtle reveal/hover transitions, count-up on balances, confetti already exists.
P3 — LIGHT MODE: add soft tints/gradients so it's not pure white; mirror hero stat treatment.

## Notes
- Frontend is a PROD build → after CSS/JSX changes run `sudo supervisorctl restart frontend` (rebuild ~20s).
- Token-first approach: edit `@theme` dark values + add dark base rules/utilities in index.css to shift app-wide with minimal per-file edits.
