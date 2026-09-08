# Nameword Platform — Setup & Credential Audit (PRD / Handoff)

## Original Problem Statement
Extract and set up the app from https://github.com/Moxxcompany/NamewordProductionfixing on the Emergent pod using a provided `.env`, run it live, and identify + report dead credentials.

## Architecture (running in this pod)
- **Backend**: Node.js + Express + MongoDB (Mongoose), listens on port 8001 (supervisor `node bin/www`, dir `/app/backend`)
- **Frontend**: React 19 + Vite 7 + Tailwind v4, Vite dev server on port 3000 (`yarn dev --host 0.0.0.0 --port 3000`)
- **DB**: local MongoDB `mongodb://localhost:27017/nameword` (Railway `DB_URI` is `*.railway.internal`, unreachable outside Railway)
- **Ingress**: `/api/*` -> backend 8001, everything else -> frontend 3000. Frontend calls `VITE_API_BASE_URL + /api/v1`.
- Preview URL: https://quick-nameword.preview.emergentagent.com

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
- URL vars (APP_URL/FRONTEND_URL/CORS/GOOGLE redirects/VITE_API_BASE_URL) were pointed to the ACTUAL pod preview URL `https://quick-nameword.preview.emergentagent.com` (user's .env had a stale `5c680fc7-...` URL that doesn't map to this pod).
- DB_URI: user's Railway proxy Mongo (`nozomi.proxy.rlwy.net:54383/nameword`) — reachable & already seeded (plans/tiers/badges/1 admin). NOT re-seeded.
- NOMADLY_API_KEY is REAL/LIVE (`rsk_live_...`) → reseller health ok, account wallet $5, upstream dry_run.
- `yarn install` (backend); supervisor rewritten: backend `bash start.sh` (node bin/www :8001), frontend `yarn dev` (vite :3000). Both RUNNING; homepage renders live; Mongo connected.
- Still placeholder (non-functional): Google OAuth, Brevo email, Telnyx OTP, ConnectReseller/WHM/Plesk/Cloudflare, DynoPay, GCloud, Telegram.

## Re-setup (current run) — new creds provided by user
- Pod preview URL is now `https://83fdbc70-b6f7-4188-83e3-c3f136d54e67.preview.emergentagent.com` (user's pasted `5c680fc7-...` URL was stale → all URL configs use the live pod URL).
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
