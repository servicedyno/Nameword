# Landing page redesign — product-forward, with VPS & RDP on the home page

## The problem
The current home page doesn't show what Nameword actually sells. The paid products —
VPS and Windows RDP — aren't visible until you dig into sub-pages. Reference given:
**contabo.com**, which leads with server plans, their specs, and prices right on the
home page. Goal: a cleaner, more commercial landing that surfaces VPS and RDP plans
(with specs + prices) on the main page, while keeping Nameword's privacy-first identity
and its domain search.

## Mockups to look at first
Open these static previews in a browser (example prices only — the live site calculates
real prices automatically):

- Index / overview: `/app/plan/mockups/index.html`
- **Option A — Product-forward landing** (recommended): `/app/plan/mockups/landing-product-forward.html`
- **Option B — Servers as VPS/RDP tabs**: `/app/plan/mockups/servers-tabbed.html`

Both use the real plan line-ups already in the system:
- **VPS:** Basic (2 vCPU / 8 GB / 64 GB) · Standard (4 / 16 / 80) · Premium (8 / 32 / 160) · Enterprise (16 / 64 / 200)
- **RDP (Windows):** Basic (2 CPU / 4 GB / 100 GB SSD) · Standard (4 / 8 / 250) · Premium (8 / 16 / 500) — all 1 Gbps

## What the redesigned home page will contain
1. **Hero (kept, cleaned):** the privacy headline and the live domain search stay as the
   opening focus, with a short "Need a server? Jump to VPS & RDP" link.
2. **Cloud VPS section (new on home page):** the 4 VPS plans as clean cards — each with
   vCPU, RAM, storage and a "from $/mo" price, a highlighted "Most popular" plan, and a
   Deploy button. A "Compare all VPS" link goes to the full VPS page.
3. **Windows RDP section (new on home page):** the 3 RDP plans as cards — CPU, RAM, storage,
   network, "from $/mo" price, and a Configure button, plus a link to the full RDP page.
4. **"Everything else" strip (condensed):** Domains, DNS, Web Hosting, Developer API as a
   slim row (these no longer need big cards now that servers lead).
5. **Kept and tightened:** the trust row (offshore, DMCA-ignored, private WHOIS, prepaid
   wallet), the TLD pricing teaser, the rewards line, and the final call-to-action.
6. **Dark mode** stays supported and clean.

All existing links, buttons, the domain search, language switcher and dark-mode toggle keep
working exactly as today. Deploy / Configure buttons route to the existing VPS and RDP pages —
no new checkout flow is added.

## Decisions to confirm (or push back on)
1. **Hero lead:** keep the domain search as the hero and feature VPS/RDP directly below
   (Option A), rather than leading the hero with servers the way Contabo does.
   *Assumed: keep domain-search hero.*
2. **Servers layout:** Option A (plan-card grids for VPS and RDP) vs Option B (one "Cloud
   servers" block with a VPS | RDP tab + comparison table).
   *Assumed: Option A.*
3. **Prices on cards:** show a live "from $/mo" pulled automatically from the same pricing
   the VPS/RDP pages use, rounded to a monthly figure, with a safe fallback number shown if
   the price lookup is slow.
   *Assumed: yes, live "from" price with fallback.*
4. **Plans featured:** show all 4 VPS plans and all 3 RDP plans on the home page.
   *Assumed: all of them.*
5. **Billing period displayed:** show monthly ("/mo"). *Assumed: monthly.*

## Scope / not included this round
- Only the landing page and the shared top nav + footer change. Deeper screens (dashboard,
  VPS/RDP management, checkout, sign-in/account) keep their current design.
- No change to prices, margins, or the deploy/checkout process.
- No copy rewrite beyond short section intros for the new VPS and RDP blocks.
