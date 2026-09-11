# Nameword — End-to-End UX Audit & Target Flows (benchmark: dynopay.com)

Date: 2026-06 · Scope: public site → sign-up → wallet → purchase (Domain / Hosting / VPS / RDP) → manage.
Method: live screenshots of preview + dynopay.com, code walk-through of routes/pages/backend reseller proxy.

## 1. Executive summary — 6 root problems
1. Purchases are PUBLIC and UNAUTHENTICATED. /domains, /hosting, /vps, /rdp show the OWNER's Nomadly reseller wallet ($5.00), a "Preview mode" banner and "Your servers" to every anonymous visitor. "Deploy · $18" opens with no account. Backend `/api/v1/reseller/*` has NO auth middleware → anyone can POST register/deploy (spends owner money when Nomadly flips to live) and GET the reseller-wide domain/server/hosting lists (privacy leak).
2. No per-user ownership. `resellerController.js` is a pure pass-through: no Order / Transaction / Domain / Server record is written for the buying user → "My Domains / My Servers / My Orders" cannot exist; dashboard still reads the legacy (dead ConnectReseller) domain model.
3. Purchase = tiny modal. No term selection, no order summary, no tax, no payment method, no confirmation page, no receipt, no email.
4. Two parallel commerce systems. Legacy Cart → UpsellCheckout → PaymentCheckout (1,055 lines, DynoPay/ConnectReseller/HostBay = dead) still wired to the header cart icon; new reseller modals live beside it.
5. Broken IA. 10+ dead destinations bounce to the homepage: mobile bottom tabs (/domain-portfolio, /websites), Cmd-K (/dns-management, /transfer-domain, /websites, /home), sidebar (/upgrade-plan, /setup-websites, /renew-plan, /manage-plan, /contact-info), checkout (/websites-overview). Signed-in shell has 4 nav systems (icon rail + 280px sidebar + top bar + Cmd-K + bottom tabs) for 6 real pages.
6. Onboarding friction. Sign-up = 6 fields (Name, Username, Email, Mobile with +91 default, Password, Confirm) → OTP page that cannot deliver (Brevo/Telnyx dead) → users stall. Disabled primary button is low-contrast grey-blue.

Smaller: vCPU shows "—" on every VPS card; internal plan ids (`s-1vcpu-1gb`) exposed; "Transfer in" tab still in hero; "card or crypto" claim with no card rail; dashboard shows "TLD suggestions from your first name"; Wallet page uses legacy `action-card`/`add-to-cart` classes; 3 button radii in use; preview serves 300+ unbundled Vite modules → Cloudflare 429 → blank pages on cold visits.

## 2. What dynopay.com does right (principles to borrow)
- One accent colour on a calm neutral canvas; everything else is ink/grey. Amber = warning only.
- Editorial display headline with ONE coloured phrase; monospace eyebrows/labels ("[ FEES · SIMPLE, HONEST ]") and mono for amounts/IDs.
- Hero SHOWS the product (live checkout card with a "SANDBOX · NOTHING IS SENT" badge) instead of a stock photo.
- Sticky section-jump pill nav; "All systems normal" status chip; Cmd-K + EN + dark toggle in the nav.
- "Proof you can check yourself" trust cards with real numbers; honest one-screen pricing; numbered 3-step "how it works".
- Checkout = single focused card, no site nav: status banner → merchant → total → reference → selectors → optional receipt email → exact amount + QR.

## 3. Journey scorecard (today)
| Stage | Score | Notes |
|---|---|---|
| Discover (home) | 7/10 | Solid dark hero + product grid + TLD pricing. Transfer tab, "card or crypto" claim, stock photo instead of product preview. |
| Product pages | 4/10 | Marketing + catalog + account management + owner wallet on one public URL. |
| Sign-up / Sign-in | 4/10 | 6 fields, mobile OTP gate, unreachable email. Google button present. |
| Fund wallet | 3/10 | Legacy page, top-up modal → dead DynoPay endpoint; no ledger. |
| Checkout | 2/10 | Modal with dropdown; no summary/tax/term/receipt; unauthenticated. |
| Confirmation | 1/10 | Inline amber "Simulated" text inside the modal. |
| Manage (dashboard) | 3/10 | Name-based TLD suggestions + legacy list; wallet chip works; no orders/services. |
| Navigation | 3/10 | 10+ dead links; 4 nav systems. |

## 4. Target flows (per product)
Global spine: Discover → Sign up (1 step) → App overview (empty state: Fund wallet + product picks) → Configure → Review & pay (wallet) → Success/receipt → Manage.

### 4.1 Domain
1. Search — instant exact result + streaming alt-TLD suggestions; TLD chips filter; price sort; "Taken" → WHOIS/backorder hint.
2. Add to order — multi-select; sticky bottom order tray (items · total · "Continue").
3. Configure (one panel) — term 1–10 yr (renewal shown), WHOIS privacy (included badge), auto-renew toggle, DNS: Cloudflare (recommended) / registrar / custom NS; soft upsell cards for hosting/email (not modals).
4. Review & pay — line items, renewal prices, tax, wallet balance vs total; shortfall → inline "Top up $X" (DynoPay crypto) without leaving checkout; "Test mode — nothing charged" chip while dry-run.
5. Success — receipt #, what happens next (propagation), CTA "Manage DNS" / "Add hosting for this domain"; email receipt.
6. Manage — /app/domains → row → tabs: Overview · DNS records · Nameservers · Renewal · Privacy.

### 4.2 cPanel Hosting
1. /hosting — plans grouped in 7-day / 30-day buckets, compare table, monthly/annual toggle, feature ticks; CAPTCHA toggle where applicable.
2. Configure — Domain step: pick owned domain (dropdown) / register new (inline search) / point later; region; cycle.
3. Review & pay (wallet).
4. Success — credentials card (cPanel URL, user, password copy), "Open cPanel" SSO button, nameserver instructions.
5. Manage — /app/hosting → account card (status, domain, plan, renews on) → Login, Credentials, Suspend/Unsuspend, Upgrade, Cancel (typed confirm).

### 4.3 VPS
1. /vps — region tabs (EU 🇪🇺 / SG 🇸🇬), plan grid with spec bars + real vCPU, monthly price, "Compare specs".
2. Configure (side sheet) — OS picker with logos, hostname, SSH key (paste / saved), backups add-on, region confirm.
3. Review & pay — first month + renewal, wallet check.
4. Success — provisioning state (Provisioning → Running), then IP / root / password reveal-copy, SSH snippet.
5. Manage — /app/servers → status dot, IP, plan, region → Start/Stop/Reboot/Reinstall/Destroy (typed confirm), Credentials.

### 4.4 RDP
Same as VPS with: Windows edition select, Administrator user, "Download .rdp file" + mstsc instructions on success.

### 4.5 Wallet top-up
/app/wallet — balance hero; "Add funds" presets ($10/25/50/100/custom); method (crypto via DynoPay; card later); fee preview; hosted checkout → return banner; ledger table (date · type · item · amount · balance after); reward points; auto top-up toggle.

## 5. Information architecture (target)
Public: `/`, `/domains` (search+pricing), `/hosting`, `/vps`, `/rdp`, `/email`, `/pricing`, `/api`, `/support`, `/sign-in`, `/create-account`
App (auth): `/app` overview · `/app/domains` · `/app/domains/:domain` · `/app/hosting` · `/app/servers` (VPS+RDP) · `/app/orders` · `/app/wallet` · `/app/settings` · `/app/checkout` (one unified checkout for every product)
Nav: public = top bar only; app = ONE left sidebar (8 items) + top bar (search, wallet chip, account). Remove contextual sidebar, bottom tabs point to real routes.

## 6. Design system direction
- Keep the current identity (deep navy + single green accent) — it fits "offshore/private". Apply dynopay discipline: one accent for primary actions only; amber only for test-mode; red only destructive.
- Type: editorial display face for H1/H2 (tight tracking, one coloured phrase), mono for eyebrows, prices, IPs, IDs; body stays clean sans.
- One button radius, one card style, status pills, spec bars, side-sheet for configure, 3-step checkout stepper, standard empty-state, toasts.
- Heroes show the product (live search card / live plan card with "TEST MODE" badge) instead of stock imagery.
- Light/dark both supported; decide default (dynopay = light-first).

## 7. Phased plan
- Phase 0 — Blockers (1 session): auth-gate purchase routes + hide reseller wallet/test banner publicly; remove/repoint 10+ dead links; fix vCPU + plan-id display; drop Transfer tab & "card" claim; button contrast.
- Phase 1 — Commerce core: Order/Transaction persistence per user; auth on reseller purchase endpoints; in-app wallet charge (skip charge in dry-run); unified `/app/checkout` (configure → review → pay → success/receipt); retire legacy Cart/Upsell/PaymentCheckout.
- Phase 2 — App: simplified shell; Overview (balance, services, recent orders, next actions); My Domains (+DNS), My Hosting, My Servers, My Orders, Wallet ledger + top-up.
- Phase 3 — Public: dynopay-grade heroes with live product preview, compare tables, FAQ, pricing page; sign-up = email + password (+Google), no OTP gate; status chip.
- Phase 4 — Polish: motion, empty states, mobile QA, production build (fixes 429 blank pages).
