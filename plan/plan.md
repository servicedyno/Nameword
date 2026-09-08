# Nameword — UI/UX Redesign Recommendation

## Objective
Nameword is a domain + hosting reseller platform (domain search/registration, DNS, hosting with cPanel/Plesk, VPS, RDP, SSL, wallet/billing, and account management). The current experience — both the marketing site and the signed‑in app — looks dated and inconsistent. This effort produces an approved design recommendation that modernizes the whole product: clean layouts, clear hierarchy, simple flows, and full responsiveness on desktop, tablet, and mobile. The recommendation must ensure every product feature has a complete, navigable interface even where that feature's backend is not yet connected.

## What gets delivered
Three documents, each with a distinct job:

1. **UX_REVIEW.md** — the analysis. Current‑state problems screen by screen, a heuristic evaluation (clarity, consistency, hierarchy, feedback, accessibility), and the competitor research below.
2. **refactornameword.md** — the redesign specification. A design system (color, type, spacing, components, states) plus a screen‑by‑screen redesign direction and the responsive + accessibility rules.
3. **REPLAN.md** — the rollout roadmap. The redesign broken into prioritized milestones with clear "done" criteria for each, so implementation can be approved and executed in order.

## Scope of this task (please confirm)
This task delivers the **written recommendation** in the three files above — not the rebuilt screens. Actually coding the redesign is the follow‑on phase and will live as the roadmap inside REPLAN.md, to be approved separately.

> If you would rather this task also **build** the redesigned experience (e.g. start with a new homepage + app dashboard shell) alongside the documents, say so and that will be added to scope.

## What the competitor research shows (and how it shapes the direction)
- **Netim** (your example): transparent per‑TLD pricing grid with discount badges and struck‑through prices, a simple "3 steps to get online" story (domain → email → website), a strong "control panel" product narrative, prominent security (2FA, login alerts), reseller/API positioning, and visible trust signals (Trustpilot reviews). Takeaway: lead with **price clarity and trust**, and tell a simple getting‑started story.
- **Porkbun / Cloudflare**: minimalist, ad‑free, highly scannable domain lists; **renewal price shown upfront**; free WHOIS privacy/SSL/DNS surfaced as value. Takeaway: **no hidden pricing, low clutter**.
- **Namecheap**: strong bulk management (filtering, grouping, bulk actions) for large portfolios. Takeaway: **tables must support bulk operations and filtering**.
- **Hostinger (hPanel)**: modern card‑based dashboard, a **persistent nested sidebar consistent across every service**, global search, one‑click security toggles. Takeaway: **one consistent app shell** for domains, hosting, VPS and RDP.
- **2026 dashboard norms**: persistent left sidebar (~256px, collapsible to an icon rail), a 4–6 card KPI strip, dense/clean tables over "widget walls", subtle borders instead of heavy shadows, a Cmd/Ctrl‑K command palette, skeleton loaders, and dark mode with a manual toggle.

## Current problems (summary to be expanded in UX_REVIEW.md)
- Inconsistent visual language: competing accent colors, uneven spacing, weak typographic hierarchy.
- Marketing hero is busy and the value proposition/pricing is not immediately clear or scannable.
- The signed‑in app lacks a single consistent shell; pages feel form/table‑heavy without clear page scaffolding, empty states, or loading states.
- Responsiveness is unreliable across tablet and mobile (navigation, tables, and long forms in particular).
- Feature discoverability is poor — many capabilities exist (DNS, transfers, VPS/RDP, wallet) but are hard to find and navigate between.

## Recommended design direction

### 1) Visual identity — choose one (Option A recommended)
- **Option A — "Trust indigo + warm neutral" (recommended):** clean white/off‑white surfaces (deep slate in dark mode), near‑black slate text, a single confident indigo/violet primary for actions and brand, teal/emerald for success, amber for price/attention. Reads modern and trustworthy (Cloudflare/Porkbun feel) while keeping a hint of the brand's current warmth.
- **Option B — "Refined warm premium":** keep the current cream/beige + navy, but disciplined — one navy primary, a single warm accent, far less color noise. Boutique/premium feel.
- **Option C — "Bold gradient modern":** deep violet→blue gradients on a dark hero, high contrast, striking. Higher risk of feeling trendy/dated sooner.

Shared foundations regardless of option: one modern sans typeface with a defined type scale, an 8px spacing grid, medium corner radius, subtle 1px borders with soft elevation only where needed.

### 2) Navigation & layout
- **Marketing site:** sticky top header with a product mega‑menu (Domains, Hosting, VPS, RDP, SSL/Email), a focused domain‑search hero, transparent pricing cards with renewal price shown, trust signals (reviews, security, uptime), and a full‑sitemap footer. Mobile collapses to a slide‑in drawer.
- **Signed‑in app:** one consistent shell — a persistent left sidebar (~256px, collapsible to a 72px icon rail) grouped into Overview, Domains, DNS, Hosting, VPS, RDP, Billing/Wallet, Settings; a top bar with global search + Cmd/Ctrl‑K command palette, wallet balance, notifications, help, and account menu. Every page uses the same scaffold: page header (title, breadcrumb, primary action) → filters/tabs → content (table or cards) → details opened in a side panel or modal rather than a full page jump.

### 3) Responsive behavior (all screens, all sizes)
- **Desktop (≥1280px):** full sidebar, multi‑column content, dense tables.
- **Laptop (1024–1279px):** full sidebar, tighter grids.
- **Tablet (768–1023px):** sidebar collapses to icon rail or drawer; 1–2 column content.
- **Mobile (<768px):** top bar + drawer, with the 4–5 most‑used destinations also reachable from a bottom tab bar; single‑column content; wide tables reflow into stacked cards; a sticky bottom action bar carries the primary action.

### 4) Dark mode
Full light/dark support with a manual toggle (the app already exposes one) plus respect for the system preference.

### 5) Components & states
A shared kit: buttons, inputs/selects, cards, tables (sortable, filterable, bulk‑select, paginated), tabs, badges/status pills, modals, side panels, toasts, tooltips — each with defined empty, loading (skeleton), error, and success states.

### 6) "Every UI element present regardless of backend"
Every feature gets a complete, navigable screen. Where an integration is not connected (e.g. payments, email/OTP, certain domain/hosting providers, Telegram), the screen is still fully designed and navigable using realistic sample/empty data, with a clear, non‑blocking "demo / not connected" indicator. This makes the design complete and reviewable before all integrations go live.

## Coverage map — everything the redesign spec will cover
- **Marketing/public:** Home, Domains landing (search + TLD pricing grid), Hosting, VPS, RDP, SSL/Email, Pricing, Transfer, Contact, FAQ, legal/footer pages.
- **Auth:** Sign in, Create account, Forgot/Reset password, Email verification, 2FA, Google & Telegram login.
- **App overview:** dashboard with KPIs (active domains, services, wallet balance, upcoming expirations) and quick actions.
- **Domains:** search & results, cart, checkout/payment, my‑domains list with bulk actions, and domain detail (overview, nameservers, DNS records, contacts/WHOIS, privacy, lock, auth code, forwarding, transfer in/out + status).
- **DNS:** records manager, DNSSEC, history/restore, child nameservers.
- **Hosting:** plans, price calculator, order, my orders, cPanel/Plesk management, SSL install/status, addon domains, server info, renewal.
- **VPS:** plans, configure/order, my instances, instance detail (power actions, credentials, lifecycle/renewal), disks, billing‑cycle discounts.
- **RDP:** plans, order, instances, credentials, subscription/renewal.
- **Billing/Wallet:** wallet overview, add funds, transactions, refunds, invoices, promo codes, tax/VAT.
- **Account/Settings:** profile, change email/password, delete account, linked logins (Google/Telegram), API keys, active sessions/devices, notification preferences, membership tier & reward points.
- **Support:** live chat and contact.
- **Admin:** the existing user‑management area, brought into the same shell.

## Assumptions (change any of these and the plan adapts)
- This task produces the three documents; building the redesign is the next, separately‑approved phase (captured in REPLAN.md).
- Visual direction is **Option A** unless you pick B or C.
- All current features and products are kept; only their presentation changes. Nothing is removed.
- The reward‑points concept, language selector, and dark‑mode toggle are retained.
- Full desktop/tablet/mobile responsiveness is required for every screen.

## Decisions to confirm
1. **Documentation only now, or also build the redesign** (e.g. new homepage + app shell) as part of this task?
2. **Visual direction:** A (recommended), B, or C?
3. **Product breadth on the marketing site:** feature SSL/Email as first‑class products (as Netim does), or keep to Domains/Hosting/VPS/RDP?
4. **Mobile navigation:** bottom tab bar for top destinations, or a single hamburger drawer only?
