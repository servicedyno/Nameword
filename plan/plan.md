# Nameword — Product, Checkout & Provisioning Audit + Recommendations

This document reviews the four products (Domains, Hosting, VPS, RDP) end‑to‑end —
selection, ordering, checkout, payment, provisioning and post‑purchase management —
lists the gaps and UX problems found in the live app today, and proposes a
prioritized set of fixes. It is written so you can decide **what to green‑light**,
in what order, and where to push back. Nothing here has been built yet.

---

## 1. How each product works today (baseline)

**Shared shopping model.** All four products share one browser‑stored cart and one
checkout funnel (search → optional hosting → sign‑in → cart → pay). Payment is a
**prepaid wallet only**: the wallet is topped up separately (card/crypto via
DynoPay) and the order then debits the wallet. The provider (Nomadly) currently
runs in **test mode** ("dry_run"): the wallet is charged exactly as in live mode,
the order is recorded, but nothing is actually provisioned upstream.

- **Domains** — Public search with instant exact‑match + alternative‑TLD
  suggestions and real pricing. "Add to cart" → hosting upsell → checkout. After
  purchase the only management action offered is "Manage DNS". Registration is
  **1 year only**; WHOIS privacy and Cloudflare DNS are advertised as included.
- **Hosting** — Storefront with 3 Anti‑Red cPanel plans (7‑day / monthly). Buy
  flow attaches hosting to a domain (bring‑your‑own or register in the same order).
  Post‑purchase: list accounts with Login, Reveal credentials, Suspend, Terminate.
- **VPS** — Plan grid (vCPU/RAM/SSD) by region (EU, SG), configure modal
  (hostname + OS) → add to cart → checkout. Post‑purchase: Start / Stop / Reboot /
  Reveal credentials / Destroy.
- **RDP** — Same as VPS but Windows (no OS choice, user = Administrator).

---

## 2. Cross‑cutting issues (affect every product)

These are the highest‑impact items. The first is a **security/privacy defect**.

### C1 — "My items" show *every customer's* resources (critical)
Each product's post‑purchase list ("Your domains", "Your servers", "Your hosting
accounts") is loaded from the provider's **account‑wide** list, not scoped to the
signed‑in buyer. Consequently any logged‑in user can currently see — and for
servers **Start/Stop/Reboot/Destroy and reveal passwords for** — resources that
belong to other customers. Orders are already recorded per user, but the
management screens ignore that ownership.
**Recommendation:** derive every "my X" view and every management action from the
buyer's own order/ownership records; store the provider resource identifiers on
the order at provisioning time; reject any action on a resource the user doesn't
own. This must be fixed before the app is used by more than one real customer.

### C2 — No renewals / expiry lifecycle for anything sold through the current flow
Domains (1‑year), hosting (7‑day/monthly) and servers (monthly) all expire, but the
current order flow creates one‑off orders with **no renewal, no auto‑renew, no
expiry reminders, and no "days left / next charge" anywhere**. (A legacy
subscription/auto‑renew system exists in the code but is wired to a different,
now‑unused provider, so it does not cover anything sold today.)
**Recommendation:** introduce a lifecycle for purchased items — expiry date shown
on each item, manual "Renew" (wallet‑paid), optional auto‑renew from wallet, and
reminder emails before expiry. Decide whether auto‑renew is on or off by default.

### C3 — Provisioning is synchronous and has no status tracking
Provisioning runs inside the checkout request, one item at a time. In test mode
this is instant, but a **live** VPS/RDP/hosting build can take minutes — long
enough for the request to time out and for the buyer to be charged with an unclear
result. The receipt reads item status once and never updates; there is no
background reconciliation and no provider status callbacks.
**Recommendation:** make provisioning asynchronous — record the order as paid
immediately, provision in the background, show a live "provisioning → active"
status on the receipt and dashboard (poll and/or provider webhook), and add a
retry path for a failed item instead of only refunding.

### C4 — Payment is wallet‑only, which forces a detour on the first purchase
There is no way to pay for an order directly. A first‑time buyer with an empty
wallet must: build the cart → hit a "you're short" wall → leave to the wallet page
→ top up (with a minimum amount) → return → pay. This is significant drop‑off
versus the "enter card, done" flow shoppers expect. Payment also depends on a
single provider with no fallback, no tax/VAT applied at checkout (even though the
pieces exist), no promo‑code field in the cart, and USD‑only pricing.
**Recommendation (decision needed):** either (a) keep wallet‑first but make top‑up
inline in the cart (top up the exact shortfall without leaving the page) and
auto‑resume payment, or (b) add "pay now by card/crypto" directly on the order in
addition to wallet. See open decisions in §9.

---

## 3. Domains

**Selection / ordering — mostly good.** Fast exact match + streaming alternatives,
clear availability/pricing, sticky cart bar, and a natural domain→hosting upsell.

**Gaps & issues:**
- **Management is essentially DNS‑only.** After buying, a domain owner cannot
  renew, enable/disable WHOIS privacy, lock/unlock the domain, get the transfer
  (EPP/auth) code, transfer a domain in or out, edit registrant/contact details,
  or change registrar nameservers from the current screen — only edit DNS records.
  A full‑featured domain manager (renew, auto‑renew, privacy, lock, nameservers,
  forwarding, bulk actions, expiry, status) **exists in the codebase but is
  disconnected** from the current provider, so customers can't use it.
- **1‑year only.** No multi‑year registration and no renewal term choice.
- **"WHOIS privacy included" and "Instant activation" are advertised** but there is
  no place to verify privacy is on, and in test mode nothing activates.
- **"Your domains" is not scoped to the buyer** (see C1) and shows minimal info (no
  expiry, no status, no privacy/lock state).

**Recommendations (in priority order):**
1. Scope "Your domains" to the buyer; show expiry, auto‑renew and lock/privacy
   state, and a clear status.
2. Add core registrar management: **Renew** (wallet‑paid, term choice),
   **auto‑renew** toggle, **WHOIS privacy** on/off, **registrar lock** on/off,
   **transfer/EPP code** retrieval, and **registrar nameserver** editing — reusing
   the existing management UI, re‑pointed to the current provider.
3. Add **multi‑year registration** at checkout if the provider prices it.
4. Later: domain **transfer‑in** flow, contact/registrant management, and DNS
   niceties (presets for email/website, DNSSEC).
*(Feasibility of items 2–3 depends on which of these the provider actually
supports — see §9 D4.)*

---

## 4. Hosting

**Selection / ordering — good.** Clear plans, sensible domain bundling, and the
upsell placement is strong.

**Gaps & issues:**
- **Account list is not scoped to the buyer** (see C1) and, more seriously,
  Suspend/Terminate act on the provider's global accounts — destructive actions
  that must be ownership‑gated.
- **No renewal / plan change.** A 7‑day or monthly plan cannot be renewed or
  upgraded/downgraded from the UI; nothing warns before expiry (C2).
- **No add‑on domain management, no SSL status, no usage/quota view** in the current
  flow, even though plans advertise add‑on domains and Anti‑Red features. (Rich
  hosting management exists in the code but for the legacy provider.)
- **"Instant activation from your wallet" is promised** but in test mode nothing is
  provisioned, and there is no provisioning progress shown.

**Recommendations:**
1. Ownership‑gate the hosting list and all actions (Login/Credentials/Suspend/
   Terminate) to the buyer (C1).
2. Add **renew** and **upgrade/downgrade** (wallet‑paid) with expiry + auto‑renew
   (C2), and surface **provisioning status** (C3).
3. Add **add‑on domain** management, **SSL status**, and a basic **usage** panel if
   the provider exposes them.
4. Make the "Login to cPanel" and credentials flow robust (single sign‑on link,
   password reset) rather than revealing a stored password.

---

## 5. VPS

**Selection / ordering — good.** Clean plan grid, region selector, configure modal.

**Gaps & issues:**
- **Ownership defect is worst here** (C1): the "Your servers" list is provider‑wide
  and exposes Start/Stop/Reboot/**Destroy** and **password reveal** for servers the
  user does not own.
- **Thin lifecycle & management.** Only power actions + credentials + destroy. No
  **renewal/expiry** (C2), no **resize/upgrade**, no **rebuild/reinstall OS**, no
  **snapshots/backups**, no **console/VNC**, no **bandwidth/usage** metrics, no
  **password reset** (password is shown in plaintext in a modal), and no reverse
  DNS / IP management.
- **Region choice is EU/SG only**, and billing is described as "monthly" with no
  term options or price‑per‑term clarity.
- **No provisioning progress** after purchase (C3); a "provisioning" server has no
  guidance on how long or what to expect.

**Recommendations:**
1. Ownership‑gate the list and every power/credential/destroy action (C1) — treat
   as release‑blocking.
2. Add **expiry + renew + auto‑renew** and **provisioning status** (C2, C3).
3. Add the management actions customers expect for a VPS: **rebuild/reinstall**,
   **resize**, **snapshot/backup**, **console access**, **password reset**, and
   **usage metrics** — scoped to what the provider supports (see §9 D4).
4. Improve credentials UX: one‑time reveal / reset rather than a persistent
   plaintext password; SSH‑key option at deploy.

---

## 6. RDP

Mirrors VPS with Windows specifics, and shares the **same critical ownership
defect** (C1) and the same thin lifecycle (no renew/expiry, no rebuild, no console,
plaintext password reveal).

**Recommendations:** same as VPS §5 (ownership‑gating, lifecycle, provisioning
status, credentials hygiene), plus RDP‑specific niceties later: downloadable
`.rdp` connection file, and clear "connect from Windows/Mac" guidance.

---

## 7. Checkout & payments (deep dive)

**What works:** re‑pricing the cart live at payment, an atomic wallet debit that
can't overdraft, idempotent "pay" (no double charge on retry), reward‑points
redemption with a clear slider, proportional refunds for failed items, and honest
test‑mode banners.

**Problems:**
- **Wallet‑only detour (C4)** — the biggest conversion risk, especially first
  purchase.
- **VPS/RDP are second‑class in the funnel.** The guided funnel is domain‑centric
  (its empty states and "add another" all push domains); servers are added from
  their product page into a cart designed around domains, with no server‑oriented
  guidance.
- **Cart is per‑device only.** It lives in the browser, so it's lost on device
  switch or storage clear, and isn't restored after signing in on another device.
- **No tax/VAT, no promo code at checkout, USD‑only.** Tax and promo building
  blocks exist but aren't applied in the cart.
- **No order confirmation email / receipt delivery** on completion (email sending
  is configured but not used at checkout).
- **Receipt is static** — provisioning status doesn't update after the first load
  (C3).

**Recommendations:**
1. Resolve the payment model (§9 D1) — inline top‑up of the exact shortfall with
   auto‑resume, and/or direct card/crypto pay‑per‑order.
2. Send an **order confirmation + receipt email**, and make the receipt reflect
   live provisioning status.
3. Add **promo code** and, if you charge tax, **VAT/tax** to the cart; consider
   multi‑currency display.
4. Give servers a **first‑class configure→checkout path** and persist the cart to
   the account so it survives across devices.

---

## 8. Proposed roadmap (priority tiers)

**P0 — must fix before real customers / going live**
- C1 Ownership‑scoping across Domains, Hosting, VPS, RDP (security/privacy).
- C3 Asynchronous provisioning + live status + failed‑item retry.
- Confirm live vs test mode and what the provider will actually provision.

**P1 — core parity customers expect**
- C2 Renewals, auto‑renew, expiry dates + reminder emails (all products).
- C4 Payment friction fix (inline top‑up and/or direct card/crypto).
- Domain registrar management (renew/privacy/lock/EPP/nameservers) re‑connected.
- Hosting renew/upgrade + provisioning status; VPS/RDP renew + credentials hygiene.
- Order confirmation emails; cart persisted to the account.

**P2 — depth & delight**
- Multi‑year domains, transfer‑in, contact management, DNSSEC.
- Hosting add‑on domains / SSL / usage.
- VPS/RDP rebuild, resize, snapshots, console, usage metrics, SSH keys, `.rdp` file.
- Tax/VAT, promo codes, multi‑currency, server‑first checkout funnel.

---

## 9. Open decisions for you

- **D1 — Payment model:** (a) keep wallet‑first but add **inline top‑up + auto‑resume**
  in the cart, (b) add **direct card/crypto pay‑per‑order** alongside the wallet, or
  (c) both. *Assumption if unspecified: (a) now, (b) later.*
- **D2 — Auto‑renew default:** on or off by default for domains/hosting/servers.
  *Assumption if unspecified: off by default, opt‑in.*
- **D3 — Scope of this engagement:** do you want (i) just the deep audit above
  delivered, (ii) the **P0 release‑blockers** fixed, or (iii) P0 + P1? *Assumption
  if unspecified: proceed with P0 first, then review.*
- **D4 — Provider capabilities:** which actions the upstream provider actually
  supports (domain renew/privacy/lock/transfer/multi‑year; VPS/RDP rebuild/resize/
  snapshot/console; hosting renew/upgrade/addon/SSL) determines what's buildable vs.
  what must be hidden or stubbed. This needs confirmation before P1/P2 work.
- **D5 — Live vs test mode:** whether to switch the provider to live (real
  provisioning + real charges) and when. *Assumption if unspecified: stay in test
  mode until P0 is done.*

*Note: this review is grounded in the current running app. Items that depend on the
upstream provider (D4) are called out; where the provider can't do something, the
recommendation is to hide/disable it cleanly rather than show a dead control.*
