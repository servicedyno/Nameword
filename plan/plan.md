# Plan: Reposition Nameword as an Offshore, Privacy-First Hosting Platform (focused product)

## Goal
Two changes, delivered together:
1. **Narrow the product** to the core areas below and remove everything else from the customer-facing app.
2. **Rebrand end to end** — new copy and a new colour system that read, at a glance, as **offshore and privacy-first** — across the public site, sign-in/sign-up, and the signed-in app.

No new product functionality is built in this pass; existing screens for the kept areas are restyled and re-worded, and the nav is rebuilt around them.

---

## 0. Product scope — what stays, what goes

### Stays
| Area | Customer-facing surfaces kept |
|---|---|
| **Domain registration** | Domain search + results, cart → checkout, domain portfolio, domain overview, WHOIS contacts, transfer-in |
| **DNS management** | DNS records manager for owned domains |
| **VPS ordering & management** | VPS catalogue, deploy, instance list/actions/credentials; reachable from the signed-in nav |
| **RDP ordering & management** | RDP catalogue, deploy, instance list/actions/credentials; reachable from the signed-in nav |
| **cPanel hosting ordering & management** | Hosting plans + order, "Websites" management (setup, manage, upgrade, renew) — **cPanel only** |
| **Email hosting** | Email product page (re-worded as *Private Email*), links from menu/footer/homepage |
| **Wallet, top-up, checkout** | Wallet, add funds, payment history, subscriptions, cart → **upsell step** → payment checkout |
| **Rewards & loyalty** | Reward-points balance chip, membership tiers and badges, homepage loyalty band — re-worded to fit the brand ("earn back on every renewal, spend from your wallet") |
| **API** | New public **API** page (what the API does, how to get a key, auth basics, endpoint groups) + existing API-key management in account settings |

Also kept, because they support the above: sign in with **email + password, Google sign-in, 2FA**, create account, password reset, account information & settings, help & support page, Privacy Policy and Terms, pricing page (domains, hosting, VPS, RDP).

### Removed from the customer-facing app
- **SSL certificates** product page and every link/card/menu entry to it.
- **Plesk** hosting option — hosting is cPanel only (Plesk plans, toggles and wording go).
- **Telegram sign-in** button.
- **Live chat** widget and any references to it (already switched off).
- Any homepage/footer/menu item that points at a removed area.

Removal means: pages, routes, navigation entries, homepage sections and links are gone from the app; a visitor cannot reach them. Server-side endpoints behind removed features are left dormant (no customer-visible effect) and can be deleted in a follow-up.

---

## 1. Positioning and messaging

**Brand promise (one line):** *Offshore hosting, private by default.*

**Hero headline (recommended):**
> **Offshore hosting, private by default.**
> Register domains, run your DNS, and deploy servers, cPanel hosting and private email from privacy-respecting jurisdictions — minimal data collection, WHOIS privacy included, and a prepaid wallet that doesn't follow you around.

**Five pillars** (each becomes a homepage section and recurs on product pages):
1. **Offshore by design** — infrastructure in privacy-respecting jurisdictions (EU and Singapore today); the customer chooses where data lives.
2. **Private by default** — WHOIS privacy on domains, only the data needed to run the service is collected, nothing sold or shared for marketing.
3. **You hold the keys** — full root/admin access on VPS and RDP, own your DNS, no lock-in; transfer or export at any time.
4. **Discreet billing that gives back** — prepaid wallet, no surprise renewals, pay with card or crypto, loyalty rewards credited to your wallet.
5. **Built for operators** — a real API for everything you can do in the dashboard, transparent per-TLD pricing, straight answers on abuse handling.

**Product naming in copy** (nav labels stay short; descriptors appear in menus, heroes and cards):
- Domains → *Private Domains* · DNS → *DNS Management* · Hosting → *Offshore cPanel Hosting* · VPS → *Offshore VPS* · RDP → *Private RDP* · Email → *Private Email* · API → *Developer API* · Rewards → *Loyalty Rewards*

**Tone:** calm, precise, adult. Speaks to people who value discretion (founders, journalists, agencies, expats, crypto-native users, developers) without fear-mongering.
- Use: private, discreet, offshore, jurisdiction, encrypted, minimal, yours, transparent.
- Never use: anonymous, bulletproof, untraceable, "DMCA-ignored", anti-government, "no questions asked". Nothing that reads as an invitation for abuse or as a legal promise the company hasn't made.

**Claims policy:** every statement must be true today or be a policy the owner confirms. Statements needing owner confirmation are listed in section 5; until confirmed, the copy uses safe wording (e.g. "privacy-respecting jurisdictions" rather than a named country, "we collect only what's needed to run your service" rather than a retention period).

---

## 2. Colour direction

Privacy is projected by a **dark, low-glare base with one calm accent** — the visual language of vaults, encrypted connections and night. The current indigo + warm beige is retired everywhere.

**Recommended — "Midnight Vault"**
| Role | Colour |
|---|---|
| Page background | deep navy-black (~#0B1020) |
| Cards / panels | slightly lifted navy (~#121A2F), hairline translucent borders |
| Primary text | soft white (~#E7ECF5); secondary text cool slate (~#94A3B8) |
| **Accent** (buttons, links, active nav, "available", padlock/shield icons) | **encrypted green** (~#10B981, hover ~#059669) |
| Status | success = accent green · warning = muted amber (sparingly) · danger = red · info = slate |

Why this pairing: navy-black reads as discretion and security; a single green accent is the universal "secure connection / padlock" cue, and it passes WCAG AA contrast on the dark base for text and buttons.

**Alternatives (pick one if the recommendation doesn't feel right):**
- **B. "Deep Sea"** — same navy base, electric cyan accent. Reads more "VPN / tech".
- **C. "Obsidian"** — near-black charcoal base, violet accent. Closest to today's indigo, smallest visual shift.

**How it's applied**
- **Dark is the default** for all visitors, on marketing pages and inside the signed-in app. The existing light/dark toggle stays; the light variant becomes cool graphite (white and cool grey, no warm beige) with the same green accent. A saved preference is respected.
- One accent only; gradients and glow are subtle (thin luminous borders, soft accent halos) — no neon. Reward/tier badges use the same restrained palette (no gold/rainbow gamification look).
- **Imagery:** current stock photos are replaced with dark, abstract security imagery (server rooms, encrypted patterns, night harbour motifs) or by gradient + iconography where a photo adds nothing. No third-party-branded graphics.
- **Logo:** the wordmark must be legible on dark. If the current logo asset only works on light backgrounds, the name is rendered as a soft-white text wordmark until a light-version logo is supplied.

---

## 3. Scope of the copy rewrite (end to end, kept areas only)

**Public site**
- Home: hero + domain search, trust bar, product cards (Domains, DNS, cPanel Hosting, VPS, RDP, Email, API), TLD-pricing intro, how-it-works steps, privacy/security section, loyalty band, final call-to-action.
- Product pages: Domains search, Hosting, VPS, RDP, Email, Pricing, **API (new)** — hero, feature blocks, plan-card helper text, empty/"not available" states, FAQs.
- Navigation mega-menu labels and one-line descriptions; footer tagline, column headings, legal line.
- Sign in (email + Google) / Create account / forgot-password / 2FA screens (headline, helper text, privacy reassurance line).
- Cart, upsell and payment-checkout messaging; 404 / no-domain page.
- Page titles, meta descriptions and social-share tags.

**Signed-in app**
- Dashboard welcome and empty states; rail/sidebar labels (Overview, Domains, DNS, Hosting, VPS, RDP, Wallet, Rewards, API/Settings, Help); wallet/top-up and rewards helper text; DNS and domain-portfolio empty states; hosting/websites management intros; account-settings section intros (API keys featured); notifications empty state; command-palette hints.

**Legal pages**
- Privacy Policy and Terms: new introductions and section headings matching the privacy-first stance, with clearly marked placeholders where company-specific facts (jurisdiction, retention, abuse contact) must be filled by the owner. Full legal text remains the owner's responsibility.

**Languages**
- English is the source. Spanish and French are updated to match, so switching language never shows the old positioning or removed products.

**Out of scope (unchanged)**
- Transactional email templates (email sending is currently non-functional anyway), backend/API error messages, the admin panel, and any product behaviour or pricing logic.

---

## 4. What a visitor will notice when done
- The site and app present: Domains, DNS, cPanel Hosting, VPS, RDP, Private Email, API — paid through wallet/checkout (with upsell) and rewarded through the loyalty programme. No SSL, Plesk, Telegram or chat anywhere, including menus, footer, dashboard and language variants.
- Every page opens dark by default in the new palette; no indigo, beige or teal remnants anywhere. Light mode still available and coherent.
- Every hero, section and menu item speaks to offshore/privacy; no leftover generic hosting boilerplate.
- Text and buttons are comfortably readable on dark (AA contrast) on desktop and on a 390px phone, with no horizontal overflow.
- Brand name **Nameword** unchanged.

---

## 5. Assumptions and decisions to confirm
1. **"Email" in the latest instruction is read as the Email hosting product** — kept as *Private Email*. Email + password sign-in was always staying. Say so if only email sign-in was meant and the Email hosting page should still go.
2. **Telegram sign-in stays removed** (only Google auth was named). Flip if it should stay.
3. **Brand name stays "Nameword."**
4. **Palette = "Midnight Vault" (navy-black + encrypted green), dark by default.** Alternatives B or C available.
5. **Removal depth**: customer-facing pages/routes/nav removed now; dormant server-side code for removed features pruned in a follow-up.
6. **API page** describes the platform's existing customer API and key management — no new endpoints are built.
7. **No new management screens** are built for VPS/RDP; the existing catalogue + deploy + manage views are kept, restyled, and linked from the signed-in nav.
8. **Facts to confirm before they become claims** (safe wording is used until confirmed): operating company jurisdiction; logging / data-retention statement; crypto payments accepted; WHOIS privacy included free on eligible TLDs; abuse / takedown policy wording; whether sign-up can be email-only (no phone).
9. Spanish and French copy is translated from the new English source (not left stale).
10. Stock imagery is replaced with dark abstract security imagery; the owner may later supply brand photography.
