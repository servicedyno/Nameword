# Nameword Platform — Setup & Credential Audit (PRD / Handoff)

## ⚠️ PROVIDER CLARIFICATION (2026-06, from user) — READ FIRST
- ALL products — Domains, DNS, Hosting (cPanel), VPS, RDP — are served by the **Nomadly reseller API** (`NOMADLY_API_KEY = rsk_live_...` in `/app/backend/.env`).
- **HostBay is NOT used.** Ignore HostBay-based hosting flows in `HostingPlansController.js` / `hostbay/mapping.js` — the live hosting/domain/VPS/RDP data must come from the Nomadly reseller endpoints (`/api/v1/reseller/*`, see `frontend/src/api/reseller.js`).
- Implication for the pending UI work (7/30-day "Anti-Red" cPanel buckets, CAPTCHA toggle, strictly-monthly VPS/RDP): wire hosting plans to the Nomadly reseller API, not HostBay. Confirm the reseller hosting/cPanel plan endpoint + fields before bucketing.


## Original Problem Statement
Extract and set up the app from https://github.com/Moxxcompany/NamewordProductionfixing on the Emergent pod using a provided `.env`, run it live, and identify + report dead credentials.

## Architecture (running in this pod)
- **Backend**: Node.js + Express + MongoDB (Mongoose), listens on port 8001 (supervisor `node bin/www`, dir `/app/backend`)
- **Frontend**: React 19 + Vite 7 + Tailwind v4, Vite dev server on port 3000 (`yarn dev --host 0.0.0.0 --port 3000`)
- **DB**: local MongoDB `mongodb://localhost:27017/nameword` (Railway `DB_URI` is `*.railway.internal`, unreachable outside Railway)
- **Ingress**: `/api/*` -> backend 8001, everything else -> frontend 3000. Frontend calls `VITE_API_BASE_URL + /api/v1`.
- Preview URL: https://nameword-dev.preview.emergentagent.com

## ⚠️ CRITICAL SECURITY FINDING — Malware removed
4 source files contained an injected, obfuscated self-executing payload (blockchain-based C2 "dead-drop resolver" that calls TronGrid for wallet `TMfKQEd7TJJa5xNZJZ2Lep838vrzrs7mAP` to fetch attacker-controlled next-stage commands):
- `backend/routes/index.js`
- `backend/routes/api/auth.js`
- `backend/routes/client.js`
- `backend/client/postcss.config.js`
The malware was stripped (legit code preserved). **All pasted credentials must be treated as COMPROMISED and rotated** — the same payload runs in the Railway production deployment.

## What was done (2026)
- Cloned repo, detected full-stack (backend + frontend), Node.js.
- Analyzed & removed injected malware from 4 files (verified clean).
- Configured `/app/backend/.env` and `/app/frontend/.env`, adapted URLs to pod, DB -> local Mongo.
- Removed `packageManager` (Corepack) field to install with classic yarn; installed backend + frontend deps.
- Rewrote supervisor to run Node backend (8001) + Vite frontend (3000). Seeded DB (tiers, badges, VPS/RDP/cPanel plans, OS, SSH-Admin).
- App verified live: homepage, /sign-in SPA route, backend `/api/v1` routing, Mongo connected.
- Live-tested all external credentials (see Credential Audit below).

## Credential Audit (live-tested)
ALIVE: Cloudflare (global key), Telegram bot (@BozznameStagingBot), APILayer Tax, Google OAuth (client id+secret), Sentry DSN, Zapier webhook.
DEAD: Brevo/SMTP (key not enabled) -> email broken; Twilio (auth token invalid); Telnyx (key not found) -> mobile OTP broken; OpenProvider (auth failed); ConnectReseller (APIKey invalid); FastForex (no active subscription/403); Google Service Account service-account.json (Invalid JWT Signature).
DEAD/UNREACHABLE (DNS NXDOMAIN, confirmed via Google+Cloudflare DoH): HostBay `api.hostbay.io`; DynoPay `api.dynopay.com` (JWT valid to 2027 but base URL dead + real host returns "Application not found" for company_id 39); WHM `*.privatehoster.cc`; Plesk `*.privatehost.su`.
EMPTY/not configured: UPCLOUD_USERNAME/PASSWORD, WHM_PASSWORD, GOOGLE_CLOUD_PROJECT_ID, GOOGLE_PROJECT_ID.

## Impact of dead credentials on flows
- Email verification / password reset: BROKEN (Brevo dead).
- Mobile OTP: BROKEN (Telnyx dead; Twilio fallback also dead).
- Domain search/register/transfer: BROKEN (OpenProvider + ConnectReseller + HostBay all dead).
- Payments / wallet top-up: BROKEN (DynoPay endpoint dead).
- Currency conversion: falls back to 1:1 (FastForex dead).
- Working: Google login (needs redirect-URI whitelisting for pod), Telegram login, Cloudflare DNS ops, tax rates, Sentry, Zapier.

## Re-setup (2026-09-08) — new MongoDB
- Pod was reconciled: both `.env` files wiped, backend `node_modules` gone, supervisor reset to default (uvicorn) template.
- Original integration credentials were NOT in git (gitignored) → permanently unrecoverable.
- Re-created `/app/backend/.env` with: user-provided Railway MongoDB (`nozomi.proxy.rlwy.net:54383/nameword?authSource=admin`),
  freshly generated APP_KEY / JWT_KEY / ADMIN_REGISTER_TOKEN, and valid-format PLACEHOLDERS for every third-party key.
- Re-created `/app/frontend/.env` (VITE_API_BASE_URL -> pod preview URL, VITE_API_KEY placeholder, chat off).
- `yarn install` (backend), rewrote supervisor: backend `bash start.sh` (node bin/www, port 8001), frontend `yarn dev` (vite 3000).
- Seeded the new (empty) Mongo successfully. App verified live: homepage renders, `/api/v1/*` routes 200, Mongo connected.
- STILL non-functional (placeholder keys): email/Brevo, Telnyx OTP, OpenProvider/ConnectReseller/HostBay domains,
  DynoPay payments, Google OAuth, Cloudflare. Provide real keys to restore these flows.

## Backlog / Next Steps
- P0: Rotate ALL credentials (repo was backdoored).
- P0: Replace dead keys (Brevo, Telnyx, OpenProvider, ConnectReseller, DynoPay base URL, Google service account, FastForex) to restore flows.
- P1: Whitelist pod Google OAuth redirect URIs in Google Cloud Console.
- P2: Import production data from Railway Mongo if needed.


## Re-setup (current session) — env from user
- Recreated `/app/backend/.env` and `/app/frontend/.env` from user-provided creds.
- URL vars (APP_URL/FRONTEND_URL/CORS/GOOGLE redirects/VITE_API_BASE_URL) were pointed to the ACTUAL pod preview URL `https://nameword-dev.preview.emergentagent.com` (user's .env had a stale `5c680fc7-...` URL that doesn't map to this pod).
- DB_URI: user's Railway proxy Mongo (`nozomi.proxy.rlwy.net:54383/nameword`) — reachable & already seeded (plans/tiers/badges/1 admin). NOT re-seeded.
- NOMADLY_API_KEY is REAL/LIVE (`rsk_live_...`) → reseller health ok, account wallet $5, upstream dry_run.
- `yarn install` (backend); supervisor rewritten: backend `bash start.sh` (node bin/www :8001), frontend `yarn dev` (vite :3000). Both RUNNING; homepage renders live; Mongo connected.
- Still placeholder (non-functional): Google OAuth, Brevo email, Telnyx OTP, ConnectReseller/WHM/Plesk/Cloudflare, DynoPay, GCloud, Telegram.

## Re-setup (current run) — new creds provided by user
- Pod preview URL is now `https://nameword-dev.preview.emergentagent.com` (user's pasted `5c680fc7-...` URL was stale → all URL configs use the live pod URL).
- `/app/backend/.env` written from user creds. REAL: `DB_URI` (Railway public proxy `nozomi.proxy.rlwy.net:54383/nameword`, reachable + already seeded), `NOMADLY_API_KEY` (rsk_live_...), generated APP_KEY/JWT_KEY/ADMIN_REGISTER_TOKEN. All other 3rd-party keys are PLACEHOLDERS.
- `/app/frontend/.env`: `VITE_API_BASE_URL` -> live pod URL; VITE_API_KEY placeholder (non-blocking); chat off.
- Supervisor rewritten: backend `bash /app/backend/start.sh` (node bin/www on 8001), frontend `yarn dev` (vite on 3000). Backend `yarn install` done (804 pkgs); frontend node_modules already present.
- VERIFIED LIVE: backend connected to Mongo + listening on 8001; Nomadly reseller API real & working (`/reseller/health`, `/reseller/domains/search?domain=...` returns real availability/pricing, `/reseller/vps/plans` real); frontend homepage renders.
- Railway `nameword` DB already seeded (37 collections: badges=9, vpsplans=4, cpanelplans=9, tiers, discounts...); users=0. No re-seed performed.
- Placeholder-driven flows still non-functional: email/OTP, Google login, ConnectReseller/WHM/Plesk/Cloudflare, DynoPay payments, Telegram.


## UI/UX Redesign — Phase 1 (Option A: "Trust indigo + warm neutral")
- Decisions from user: BUILD the redesign; Visual = Option A; feature SSL/Email as first-class; mobile = hybrid (bottom-drawer + top destinations).
- Design system: added Option A tokens to `frontend/src/index.css` (@theme): brand/indigo scale, ink, surface, line, accent(amber), success(teal); remapped `darkbtn` -> indigo (#4f46e5) so all buttons app-wide shift cohesively. Added `@layer components` nw-* utilities (nw-container/section/eyebrow/h2/lead/btn-*/card/input/badge-*/chip/link).
  - GOTCHA fixed: appended @layer block had nested inside `.content-section ul {}` (missing close brace) -> classes became descendant selectors and didn't apply; also Tailwind v4 forbids `@apply nw-btn` (component-in-component) -> inlined base utilities. Both fixed; verified computed styles (nw-container maxWidth 1280px, btn bg indigo, eyebrow pill).
- Rebuilt marketing shell: `components/layout/Navbar.jsx` (sticky blur header, Products mega-menu incl SSL/Email, lang+theme+auth, mobile drawer), `components/layout/Footer.jsx` (full sitemap), new `components/home/HomeRedesign.jsx` (Hero+search, TrustBar, Products grid, transparent TLD Pricing w/ sale+renewal, 3 steps, Security, Rewards band, Final CTA), `pages/HomePage.jsx` uses MainLayout fluid. `layouts/MainLayout.jsx` got `fluid` prop.
- Verified DESKTOP light + dark look great. Mobile NOT yet verified (screenshot tool locks 1920px) -> needs frontend testing agent.
- NEXT (not built): Phase 2 = authed app shell (persistent sidebar ~256px collapsible to icon rail + topbar w/ global search + Cmd/K + wallet/notif/account) applied to dashboard; then per-screen redesigns (domains, DNS, hosting, VPS, RDP, billing/wallet, account, admin). Images used: hero unsplash 1653549893012, security unsplash 1660732106134 (a Wise-branded 3D graphic — consider swapping later).

## Redesign — increment 2 (SSL + Email first-class pages)
- Swapped homepage security image to clean unbranded padlock (unsplash 1555529902-5261145633bf).
- New reusable marketing kit: `components/marketing/marketing-ui.jsx` (ProductHero, SectionHeading, FeatureGrid, PricingTiers, Steps, Faq, CtaBand) — for all future marketing pages.
- New pages `pages/Ssl.jsx` (/ssl) and `pages/Email.jsx` (/email) built with the kit + MainLayout(fluid): hero + features + pricing tiers + steps/FAQ + CTA. Images: SSL padlock, Email envelope (unsplash 1567473030492-533b30c5494c).
- Routes added in `routes/Router.jsx`; nav mega-menu, footer, and homepage product cards now link SSL->/ssl, Email->/email (were pointing to /hosting).
- Verified desktop light. Lint clean.
- STILL TODO: restyle existing product pages (Domain/Hosting/VPS/RDP via ServersPage & Hosting.jsx) to Option A; Pricing/Transfer/Contact/FAQ/legal; then the authed app shell (sidebar+topbar+dashboard) and per-screen app redesigns.

## Redesign — increment 3 (App Shell for signed-in area) — IN PROGRESS
- Built modern authed shell in `layouts/FrontLayout.jsx`: slim collapsible ICON RAIL (`components/front-admin/admin-common/AppRail.jsx`; Overview/Domains/Hosting/VPS/RDP/Billing/Settings + Help; collapse persisted in localStorage `nw_sidebar_collapsed`) + existing contextual `<Sidebar/>` kept as the 280px secondary panel (preserves domain/hosting switching). Top bar: global search button that opens Command Palette, wallet balance chip (walletAPI.getWallet -> data.balance.USD), reward-points chip (user.rewardPoints), notifications bell (empty-state, no backend), language + theme + cart + UserDropdownMenu. Mobile: slide-in drawer (rail + Sidebar) + fixed bottom tab bar (Home/Domains/Hosting/Wallet/Account).
- New `components/common/CommandPalette.jsx`: Cmd/Ctrl+K launcher, keyboard nav (arrows/enter/esc), fuzzy filter over destinations + quick actions.
- Restyled sidebar link active/hover to brand palette in index.css; added `.app-rail-item(.-active)` and `.header-icon-btn` utilities.
- Dashboard unchanged content-wise; now sits inside the new shell.
- VERIFICATION: lint clean on all new files. Login verified via API (POST /api/v1/auth/login returns token). Seeded demo user for testing: demo@nameword.local / Demo@12345 (see test_credentials.md; re-seed via /app/backend/tmp_seed_user.js). Full IN-BROWSER visual verification of the authed shell was NOT completed this session — the screenshot tool struggled to log in because the SignIn form renders duplicate email/password inputs (hidden + visible) and the tool locks viewport to 1920. Recommend verifying by logging in with the demo creds, or via auto_frontend_testing_agent.
- STILL PENDING from user's 3-item request (only App Shell tackled this session):
  1) Product Pages restyle to Option A: Domains (/domain, /home results), Hosting (Hosting.jsx), VPS/RDP (components/servers/ServersPage.jsx). NOT started.
  2) Pricing page: dedicated /pricing with full per-TLD table + hosting/VPS/RDP tiers + monthly/annual savings toggle. NOT started (homepage has a TLD pricing SECTION only).

## Re-setup (2026-09-08) — pod reconciled again, re-provisioned by user creds
- Pod had been reconciled: both `.env` wiped, backend `node_modules` gone, supervisor reset to default uvicorn template, frontend in BACKOFF (`yarn start` doesn't exist; script is `dev`).
- ACTUAL pod preview URL = `https://nameword-dev.preview.emergentagent.com` (from env `preview_endpoint`/HOSTNAME). User's pasted `5c680fc7-...` URL is STALE → all URL vars (APP_URL/FRONTEND_URL/CORS/GOOGLE redirects/VITE_API_BASE_URL) point to the live 2b950aee pod URL.
- Rewrote `/app/backend/.env` from user creds (PORT=8001). REAL: DB_URI (Railway proxy nozomi.proxy.rlwy.net:54383/nameword, reachable+seeded), NOMADLY_API_KEY (rsk_live_...), generated APP_KEY/JWT_KEY/ADMIN_REGISTER_TOKEN. All other 3rd-party keys = PLACEHOLDERS. Confirmed all envalid-required vars in start/env.js are satisfied.
- Rewrote `/app/frontend/.env` (VITE_API_BASE_URL -> pod URL, VITE_API_KEY placeholder, VITE_SHOW_CHAT=false, VITE_TELEGRAM_BOT_NAME, VITE_REWARD_POINT_VALUE=0.02).
- `yarn install` backend (ok). Rewrote supervisor: backend `bash /app/backend/start.sh` (node bin/www :8001), frontend `yarn dev --host 0.0.0.0 --port 3000`. Both RUNNING.
- VERIFIED LIVE: Mongo connected; /api/v1/reseller/health ok (dry_run), /account wallet $5, /domains/search real (coolstartup2026.com available $39); frontend homepage (Option A redesign) renders 200.
- Placeholder-driven flows still non-functional: Google OAuth, Brevo email, Telnyx OTP, ConnectReseller/WHM/Plesk/Cloudflare, DynoPay payments, Telegram, GCloud.

## Redesign — increment 4 (Product/Management pages -> Option A) — DONE
- VPS/RDP (`components/servers/ServersPage.jsx`): branded gradient hero (eyebrow pill, chips, wallet chip, brand-focus region select); plan cards -> `nw-card nw-card-hover` with brand-50 zap badge, brand Spec icons, `nw-btn-primary nw-btn-sm` Deploy; empty/skeleton states + deploy modal inputs -> brand focus + `border-line`. Verified live: 6 plan cards render (Cloud VPS 10-60, $18-$288/mo), dry-run banner, indigo buttons.
- Hosting (`pages/Hosting.jsx`): replaced old beige `search-section`/`tab-link` shell with branded hero (eyebrow WEB HOSTING + chips), Option A segmented monthly/annual toggle (indigo active + amber savings badge), 6-card brand value-props grid; kept plan-fetch + cart-sidebar logic. `monthly/annual-billing-plan.jsx`: price accent teal->brand, empty state -> dashed `border-line` card. Verified live (providers dead -> branded "not available" empty state shows).
- Domains (`/domain`, `/home`): restyled SHARED index.css classes so both pages shift at once — `.search-section` beige->brand-50 gradient, `.search-input` -> rounded-xl + brand focus ring, `.btn-blue`/`.add-to-cart`/`.btn-outline` -> brand + rounded-xl, `.btn-teal` -> teal success pill, `.btn-sky` -> brand pill, `.price-tag` teal->brand, `.tablist` pills -> rounded-full brand-active, `.domain-card`/`.hosting-plan-card` -> rounded-2xl + `border-line` + hover lift, `.plan-price` -> brand. Verified live: result cards, "Find more options" tabs, bottom cart bar all Option A.
- Lint clean on all changed JS. Frontend hot-reloaded (CSS/JSX). NOTE: screenshot tool needs a poll-until-`.animate-pulse`-gone loop for the reseller pages (upstream latency + StrictMode reflicker).
- STILL PENDING (future): /pricing page; authed app-shell per-screen redesigns (DNS, Billing/Wallet, Account/Settings, Admin); mobile QA of authed shell.

## Increment 5 — Live Domain Search (DONE, verified live)
- Backend: added GET /api/v1/reseller/domains/suggest (controller suggestDomains + route). Takes ?domain=/keyword, derives base label, checks it across 12 curated TLDs (com,net,org,io,co,ai,app,dev,xyz,online,shop,store) via parallel Promise.allSettled to Nomadly /domains/search; returns {keyword,count,suggestions:[{domain,available,price_usd,registrar}]}. Node load-check + curl verified (real prices).
- Frontend: repointed hooks to reseller (real data). `useDomainSearch.searchDomain` -> resellerAPI.searchDomain, maps available->{query,registrationFee=price_usd,renewalfee,registrar} (null when taken -> "Domain Taken" card). `getTldSuggestions` -> resellerAPI.suggestDomains, maps available & !=exact -> [{websiteName,registrationFee,...}]. `useDomainSuggestions.getSuggestions` -> suggest (typeahead). Added `resellerAPI.suggestDomains`.
- VERIFIED live at /domain?value=coolstartup2027app.com: exact card $39, .net $51 package, grid with real prices (.io $244, .ai $709, etc). Cart add still guest/dry-run (registrar checkout not wired — expected).

## Increment 6 — Pricing page + authed Option A token remap (DONE)
- New `pages/Pricing.jsx` at /pricing (nav "Pricing" repointed from /#pricing). Hero + live per-TLD table (suggestDomains with random available label, filters price>0) + monthly/annual toggle (annual = monthly*10 = "2 months free", shows per-mo + billed-yearly note) driving Hosting (static reps) + live VPS + live RDP tiers (via resellerAPI.getVpsPlans/getRdpPlans EU, top 3) + CtaBand. Route added in Router.jsx. Verified live (table shows real .shop $30/.store $160; VPS/RDP annual tiers render).
- AUTHED APP-SHELL COHESION via token remap in index.css @theme (recolors ALL legacy usages app-wide in one shot): tealdark #16979a->#4f46e5(brand), teal-hover->brand-700, teallight/-50->brand-50, skydark #3EBFD8->brand, beige #f7f4ec->#f8fafc(surface-2), beige-200->brand-50, active-border #5c5776->#cbd5e1. This flips teal/beige/sky accents across dashboard, account-settings, wallet, DNS, billing, websites, domain pages to indigo without editing 60+ component files. Verified: /account-setting (API Keys) fully indigo/clean.
- PENDING: broad authed + MOBILE verification delegated to auto_frontend_testing_agent (demo@nameword.local / Demo@12345). Note: /wallet and /dns-management depend on wallet/domain data the demo user lacks (may redirect/blank) — needs a user with domains for full check.

## Increment 7 — Mobile polish (DONE / verified where possible)
- Frontend testing agent Part A confirmed all signed-in pages (/dashboard, /account-setting, /account-information, /wallet, /subscriptions, /payment-history, /dns-management, /domain-portfolio) render with NO teal/cyan and NO cream/beige — Option A cohesion achieved app-wide via the @theme token remap.
- FIXED public mobile horizontal overflow (decorative hero blur circles): added `overflow-x: hidden` to body in index.css. Re-test CONFIRMED at real 390x844: /, /hosting, /vps all scrollWidth==clientWidth==390 (no overflow).
- Authed mobile nav is implemented in layouts/FrontLayout.jsx (verified in code): fixed bottom tab bar (Home/Domains/Hosting/Wallet/Account, `xl:hidden`), top-left hamburger opening a left slide-in drawer (AppRail + Sidebar), desktop icon-rail `hidden xl:flex`, contextual 280px panel `hidden xl:block`. Tablet (<1280) intentionally uses the hamburger drawer + bottom bar pattern. NOTE: automated agent could NOT log in to visually confirm authed mobile nav due to Cloudflare bot-protection 429 on the preview — recommend a quick manual check on a phone/narrow window.
- NOTE: /pricing fires 3 reseller calls on mount (suggest = 12 upstream lookups + vps + rdp plans); renders fine for real users (screenshot-verified) but can time out under automated hammering/Cloudflare 429. Optional future: cache suggest server-side.
- Screenshot tool CANNOT emulate mobile (locks 1920) — use auto_frontend_testing_agent for responsive checks.
