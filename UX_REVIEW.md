# NameWord — UI/UX Usability Review
**Scope:** Domain registration · Domain management · VPS · RDP · Hosting plans
**Method:** Live click-through of public screens (homepage, domain search, hosting, auth) + full source review of authenticated screens (login is blocked on this instance, so in-app areas were reviewed from code as agreed).
**Lenses:** 🧭 First-Time Buyer (FTB) · 🔁 Returning User (RU) · 📱 Mobile · ♿ Accessibility (A11Y)

> Note: this instance runs with dead third-party credentials, so some live screens hang. Where a finding is a *pure environment* artifact it is labelled **[env]**; everything else is a real UI/UX design/robustness issue that exists regardless of credentials.

---

## Severity legend
| Sev | Meaning |
|-----|---------|
| 🔴 Critical | Blocks a core task or a whole product area is missing |
| 🟠 High | Major friction / confusion / task frequently fails |
| 🟡 Medium | Noticeable friction, workaround exists |
| 🟢 Low | Polish / cosmetic / minor |

---

## 0. Headline findings
1. 🔴 **VPS has no frontend at all.** Backend has VPS plans, disks, billing-cycle discounts, subscriptions and renewal jobs — but there is **no page, route, nav entry, or API client** in the React app (`src/api/` has no `vps.js`; `Router.jsx` has no VPS route; sidebar has only Dashboard/Domains/Hosting/Billing). Users cannot browse, buy, or manage a VPS.
2. 🔴 **RDP has no frontend at all.** Same as VPS — RDP plans/subscriptions are seeded and served by the backend, but nothing in the UI exposes them.
3. 🟠 **"Hosting" = shared cPanel/Plesk only.** The only compute product a user can actually reach is shared hosting (labelled "Websites"). So 2 of your 5 focus areas (VPS, RDP) are effectively non-existent for end users, and "hosting" is narrower than the sitemap implies.
4. 🟠 **Full-screen blocking loader with no empty/error/timeout state** on `/domain` and `/hosting` (observed as an infinite spinner that greys out the entire page *including the nav*). Even with working APIs this is fragile: any slow/failed call locks the whole screen.

---

## 1. Domain Registration (search → results → cart → checkout)

### What works
- Clean hero with dual **Search / Transfer** tabs, prominent input, trust bullets, guest cart support (`guestCart`) so users can add before logging in. (See homepage screenshot.)
- Type-ahead domain suggestions + TLD alternatives; add-to-cart works for guests and logged-in users.

### Issues
| Sev | Lens | Finding | Evidence |
|-----|------|---------|----------|
| 🔴 | FTB | On `/domain`, a **full-page `<Loader/>` overlays everything** while `loading || domainLoading` is true; there is no error/empty branch, so a slow or failed search shows an infinite spinner and the page/nav look disabled. | `pages/Domain.jsx` L94 `{(loading||domainLoading)&&<Loader/>}`; `domainLoading` only cleared in `handleTldSuggestions` finally. Screenshot: domain-search shows spinner over greyed content. |
| 🟠 | FTB | **Status "buttons" are actually inert badges.** "Exact match" / "Domain Taken" / "Best alternative" render as `<button className="btn-teal">` with **no `onClick`** — they look tappable but do nothing. | `components/domain/search-domain-card.jsx` L152,158,212. |
| 🟠 | FTB | **Suggestion debounce is 2000ms** — the dropdown feels broken/laggy; industry norm is 200–400ms. | `components/domain/search-domain.jsx` L67 `setTimeout(getDomainSuggestions, 2000)`. |
| 🟡 | FTB | Results show only **two cards** (exact + one TLD) before the fold; weak at-a-glance comparison / no bulk "add all available". | `search-domain-card.jsx` grid `lg:grid-cols-2`. |
| 🟡 | FTB | **Renewal price is hidden** at results; only "for first year" with a decorative `FiInfo` icon that has **no tooltip wired**. Users discover renewal cost only in cart. | `search-domain-card.jsx` L164-170 (`<FiInfo/>` no handler). |
| 🟡 | FTB | Add-to-cart **hard-codes `years:1`, `provider:"hostbay"`, no WHOIS-privacy choice** at the results step — no term selector where the buying decision happens. | `search-domain-card.jsx` L74-89. |
| 🟢 | FTB | **"$0.00" can render for a paid domain** when `registrationFee` is missing (`?.toFixed(2) || 0`), which reads as "free". | `search-domain-card.jsx` L169,223. |

### Checkout (`/cart` → `/payment-checkout`)
| Sev | Lens | Finding | Evidence |
|-----|------|---------|----------|
| 🟠 | FTB | Payment method list mixes **Wallet / "Cryptocurrency" (DynoPay) / Reward Points** as three radios with custom circles; there is no card summary of *what* you're paying for on this screen beyond the side `OrderSummary`, and only one real gateway (crypto) — labelling/comments still reference "Credit/Debit Card". Confusing for first-timers expecting cards. | `pages/PaymentCheckout.jsx` L795-1030. |
| 🟡 | ALL | **Tax defaults to a hard-coded 20%** until `OrderSummary` reports the real rate → the total visibly changes/flickers after load. | `PaymentCheckout.jsx` L62 `useState(0.2)`. |
| 🟢 | — | Heavy `console.log` of the entire checkout scenario ships to production (leaks bundle logic, clutters console). | `PaymentCheckout.jsx` L185-333. |

---

## 2. Domain Management (portfolio · overview · DNS · contacts · transfer)

### What works
- **Overview page is the strongest screen**: Essentials + Security (WHOIS privacy toggle) + Hosting upsell + Actions (forwarding, transfers), plus a **"pending setup" banner with a direct CTA** to complete contact info. Good task guidance. (`domain/Overview.jsx`)
- Post-payment status is reflected via query-param handling (privacy/renewal success toasts) and cards expose `onRefresh`.

### Issues
| Sev | Lens | Finding | Evidence |
|-----|------|---------|----------|
| 🟠 | RU | **Domain switching is a bare native `<select>`** in the sidebar with no search; painful with many domains, and it behaves differently on domain vs hosting routes. The "active domain" resolution has many fragile fallbacks → risk of showing the wrong domain's data after navigation. | `admin-common/sidebar.jsx` L236-304, L719-768. |
| 🟠 | RU | **"DNS Management" mostly manages nameservers.** The primary panel (`DNSrecords.jsx`) is a NameWord-vs-custom **nameserver** chooser; actual A/CNAME/TXT editing lives in separate sub-panels (`DNSrecordsTables`, `AddDNSrecord`, `DNSSEC`, `DNShistory`). Conflating "DNS records" with "nameservers" misleads users looking to add a record. | `components/front-admin/domain/DNSManagement/*`. |
| 🟡 | ALL | Failures surface almost exclusively as **transient toasts**; several data cards can render empty with no persistent inline error/retry. | `Overview.jsx` fetch handlers (toast-only). |
| 🟢 | RU | Sidebar **"cPanel" link always points to `cpanel.net`** (marketing site), not the user's panel — misleading. | `sidebar.jsx` L821-828. |

---

## 3. Hosting Plans (browse · setup wizard · manage / renew / upgrade)

### What works
- Monthly/Annual toggle with a "save %" badge; plan cards list disk/bandwidth/email/db features; slide-in cart sidebar; a clear **5-step setup wizard** (Domain → Server location → Control panel → Security/SSL → Launch) with a visual stepper. (`pages/Hosting.jsx`, `websites/SetupWebsite.jsx`)

### Issues
| Sev | Lens | Finding | Evidence |
|-----|------|---------|----------|
| 🟠 | FTB | Same **page-level blocking loader / no error state** as domain search (observed as infinite spinner on `/hosting`). The child `MonthlyPlan` even has a nice "not available" empty state, but the page Loader hides it. | `pages/Hosting.jsx` L188-208; screenshot: hosting spinner over greyed page. |
| 🟡 | FTB | Plan card **title is the internal provider name** (`hostbay` / `connectreseller`, just capitalised); the actual plan name is secondary. Exposes back-end vendor names and weakens your branding. | `hosting/monthly-billing-plan.jsx` L55-60. |
| 🟡 | RU | Website **delete uses native `window.confirm()`** — unstyled, off-brand, and awkward on mobile. | `websites/Websites.jsx` L414-420. |
| 🟡 | ALL | In the setup wizard **you can't click the stepper to jump back** to a completed step (`onStepClick` is commented out) — Back/Next only. | `SetupWebsite.jsx` L285 (`// onStepClick`). |
| 🟡 | FTB | Step 1 "Next" fires an **addon-domain API call and hard-blocks progress on failure** with only a toast — heavy coupling between a UI step and a provider call. | `SetupWebsite.jsx` L109-187. |

---

## 4. VPS — 🔴 MISSING FROM UI
- No `pages/**/vps*`, no `/vps` route in `Router.jsx`, no `api/vps.js`, no sidebar entry. `grep -rli vps src` returns only unrelated image filenames.
- **Impact:** Every VPS journey (browse plans → configure OS/disk/region → checkout → manage/renew/reinstall) is unreachable. Backend capability is stranded.
- **Recommendation:** If VPS is in scope, this is net-new UI (catalog page, configurator, dashboard). If out of scope, remove the backend VPS reminders/jobs from the mental model to avoid confusion.

## 5. RDP — 🔴 MISSING FROM UI
- Identical situation to VPS: seeded RDP plans + subscription lifecycle in the backend, **zero** frontend surface.
- **Impact:** No way to buy or manage RDP.

---

## Lens summaries

### 🧭 First-Time Buyer
- Strong landing/search entry, but the **buy path breaks down at the decision moment**: inert status buttons, hidden renewal price, no term/privacy choice at results, and a blocking loader that can trap the whole page. Provider names leaking onto hosting cards erode trust.

### 🔁 Returning User (managing assets)
- Domain **Overview** is genuinely good. Pain points: the **native `<select>` domain switcher**, DNS naming confusion, toast-only errors, and — critically — **no VPS/RDP management** despite the backend supporting it. Website management leans on `window.confirm`.

### 📱 Mobile / responsive (assessed from Tailwind breakpoints)
- Layouts do stack (`sm/md/lg` flex-col grids) and there's a hamburger drawer, **but the admin drawer switches only at `xl` (1280px)** (`FrontLayout.jsx` L19,42), so **tablets (768–1279px) get the collapsed mobile drawer** — a lot of wasted space and an odd tablet experience.
- Management **DataTables** (Websites, domain lists) are wide and will need horizontal scroll / card-ification on phones.
- The slide-in cart is `w-full` under `sm` (good). Overall mobile is "stacks but not truly optimized," especially tablet.

### ♿ Accessibility
| Sev | Finding | Evidence |
|-----|---------|----------|
| 🟠 | **Icon-only controls lack accessible names** (search buttons show only `TbSearch`, sidebar hamburger `<button><CgMenu/></button>`, row kebab `TbDots`). Screen readers announce an empty button. | `FrontLayout.jsx` L99; `search-domain.jsx` L151; `Websites.jsx` kebab. |
| 🟠 | **Focus outlines removed without a visible replacement** in places (`outline-none` in `index.css` L702; stepper `focus:outline-none`) → keyboard users can't see focus. | `index.css` L702; `SimpleStepper.jsx` L11. |
| 🟡 | Very sparse ARIA overall (`aria-*` ≈26 hits, `role=` ≈4 across the whole app); custom radio "circles" rely on `sr-only` inputs — verify they're reachable/announced. | grep counts. |
| 🟡 | Decorative info icons (`FiInfo`) imply help but have no tooltip/`aria` — misleading affordance. | `search-domain-card.jsx`. |
| 🟢 | A few emojis used in UI/util components (design guideline prefers icon fonts). | `OTPExpiryTimer.jsx`, points banner. |
- **Positives:** Auth forms use proper `<label htmlFor>` + floating labels, password reveal toggles, inline field errors (`CreateAccount.jsx`); 232 scoped transitions give good micro-interaction feel; consistent CSS-variable theme with dark mode.

---

## Prioritized backlog (do in this order)

**P0 — Critical**
1. Decide VPS & RDP scope. If in-scope: build catalog + configurator + management dashboards + `api/vps.js` / `api/rdp.js` + sidebar entries. If out: hide/remove from the product story.
2. Replace the full-screen blocking `<Loader/>` on `/domain` and `/hosting` with **inline skeletons + explicit empty & error states + a request timeout**; never grey out the nav.

**P1 — High**
3. Domain results: turn status "buttons" into real **badges**; add a **term (years) selector + WHOIS-privacy toggle + visible renewal price** at the result card; cut suggestion debounce to ~300ms.
4. Rename/reorganize **"DNS Management"** so nameservers vs DNS records are clearly separated (tabs with correct labels).
5. Replace the sidebar **native `<select>` domain switcher** with a searchable combobox; simplify active-domain resolution.
6. Accessibility pass: `aria-label` on all icon-only buttons; restore a visible **focus-visible ring** everywhere you removed outlines.
7. Stop exposing provider names (`hostbay`/`connectreseller`) as hosting plan titles.

**P2 — Medium/Polish**
8. Replace `window.confirm` delete with a branded modal; enable stepper back-navigation to completed steps.
9. Fix tablet breakpoint (introduce a `lg` sidebar state instead of jumping straight to `xl`); make management tables responsive (card view < md).
10. Remove production `console.log`s; guard `$0.00` price rendering; wire the `FiInfo` tooltips.

---

## Screenshots captured (live, this session)
- Homepage (desktop) — hero, search/transfer tabs, points banner.
- `/sign-in`, `/create-account` — clean single-column auth with floating labels & social login.
- `/domain?value=…` — **infinite full-screen loader** over greyed content (search dead-end).
- `/hosting` — **infinite full-screen loader**; "Choose Your Hosting Plan" + Monthly/Annually visible behind spinner.
