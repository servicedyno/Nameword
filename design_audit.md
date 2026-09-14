# Nameword UI/UX & Design System Audit Report

**Platform**: Nameword (Offshore Domain, Hosting, VPS, RDP & Prepaid Crypto Reseller)  
**Audit Date**: July 2026  
**Design Persona**: E1 (The Anti-AI Designer)  
**Target Design Benchmark**: Option 1 - Editorial Indigo & Obsidian (`design_guidelines.json`)  
**Audit Scope**: Full product review covering 9 public pages, 10 authenticated in-app SaaS pages, 4 mobile viewports (390px), design system token adherence, conversion friction, and accessibility.

---

## 1. Executive Summary

### What is Working Exceptionally Well
1. **Distinct Visual Identity Grounding**: The transition to "Editorial Indigo & Obsidian" using Plus Jakarta Sans / Outfit for display headlines and JetBrains Mono for metadata provides a distinct tech-editorial personality that sets Nameword apart from generic blue SaaS templates.
2. **Prepaid Crypto Wallet Integration (Dynopay)**: Seamless integration of wallet balance chips ($50.00 balance indicator, top-up modal triggers) and crypto payment modal timeline with real-time status polling.
3. **Core SaaS Shell & Multi-Language Architecture**: Clean separation between public marketing pages and authenticated admin shell with full EN/ES/FR internationalization and light/dark theme toggling.
4. **Interactive Infrastructure Configurators**: Strong baseline implementation on `/vps` and `/rdp` configuration steppers (Region -> Spec Tier -> Billing Cycle -> Sticky Cart).

### Top 5 Highest-Impact Product-Wide Problems
1. **App Shell Navigation Redundancy (Triple-Rail Overload)**:
   - **Problem**: The authenticated app shell combines an ultra-narrow 11-icon left rail (`AppRail.jsx`), a full collapsible secondary sidebar (`sidebar.jsx`), and a top bar (`topbar.jsx`). This creates visual fragmentation and consumes ~380px of horizontal viewport on 1440px displays, squeezing high-density data tables.
   - **Impact**: Reduced scanability, duplicate navigation triggers, poor screen utilization.
2. **Inconsistent Data Table Typography & Data Leakage**:
   - **Problem**: Data tables across Dashboard, Orders, Services, Subscriptions, and Payment History show unformatted string noise like `"test_mode"` or `"Invalid Date"` without defensive fallbacks, weak weight contrast, and lack bulk selection actions or unified status badges.
   - **Impact**: Erodes user trust for high-value infrastructure services.
3. **Visual Hierarchy Drift & Mixed Button/Badge Utilities**:
   - **Problem**: Direct style drift from `design_guidelines.json`. Mixed button classes (`btn-blue`, `btn-teal`, `add-to-cart`, `nw-btn-primary`, `btn-outline.small`) create conflicting border-radii (from `rounded-md` to `rounded-full` to `rounded-2xl`), inconsistent hover states, and WCAG AA contrast failures in dark mode on soft badge backgrounds.
   - **Impact**: Unpolished feel in specific sub-components.
4. **Conversion & Cart Drop-off Friction**:
   - **Problem**: On `/domains`, `/vps`, `/rdp`, and `/hosting`, adding items to cart lacks instant inline feedback in the sticky cart or topbar badge, forcing full page scrolls or drawer opens. The empty cart state lacks contextual quick-add recommendations.
   - **Impact**: Revenue leak during multi-item provisioning.
5. **Mobile Responsiveness & Touch Target Squeezing**:
   - **Problem**: On 390px viewports (`m-landing.jpg`, `m-dashboard.jpg`, `m-vps.jpg`, `m-wallet.jpg`), pricing tables cause horizontal overflow, sticky cart action bars obstruct primary navigation, and input touch targets fall below 44x44px accessibility thresholds.

---

## 2. Page-by-Page Audit Findings & Specific Recommended Fixes

### Public Marketing & Landing Pages

#### 1. Landing Page (`/` - `landing.jpg`)
- **Visual & Layout Findings**: The hero search section uses a soft gradient with an embedded search input and TLD pills (.com, .net, .org, .ai). Headline typography needs explicit Outfit font-weight scaling (`font-extrabold`). Product cards ("Domains", "cPanel Hosting", "VPS", "RDP", "DNS Manager", "API") have inconsistent card padding (`p-4` vs `p-6`).
- **Data & Copy Findings**: TrustBar icons rely on static PNGs rather than vector SVGs. Security and Rewards band CTA buttons have inconsistent rounded radii (`rounded-2xl` vs `rounded-md`).
- **Dark Mode Risk**: Subtle card borders in dark mode (`border-white/[0.06]`) can become invisible on low-brightness monitors.
- **Recommended Fixes**:
  - File: `frontend/src/components/home/landing/Hero.jsx` & `HomeRedesign.jsx`
  - Upgrade headline class to `font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight`.
  - Standardize all landing card containers to `.nw-card.nw-card-hover` with `p-6` internal padding.
  - Enforce explicit `data-testid="hero-domain-search-input"` and `data-testid="hero-domain-search-button"`.

#### 2. Domains Search (`/domains` - `domains.jpg` / `app-domains-loggedin.jpg`)
- **Findings**: The live domain search table renders search results with TLD pills. Price displays use line-through for renewal discounts, but discount tag labels (`save-lable`) use low-contrast text against dark backgrounds. In logged-in state, the header displays both topbar user menu and public nav links, creating duplicate header bars.
- **Recommended Fixes**:
  - File: `frontend/src/pages/DomainsNomadly.jsx` & `frontend/src/components/domain/DomainSearchResults.jsx`
  - Clean up header duplication when logged in by leveraging `ProductShell.jsx` consistently.
  - Fix badge contrast: update `.save-lable` to use WCAG-compliant `bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300`.
  - Add explicit `data-testid="domain-result-row-{domain}"` and `data-testid="add-to-cart-btn-{domain}"`.

#### 3. Offshore Hosting (`/hosting` - `hosting.jpg`)
- **Findings**: Billing toggle (Monthly vs Annual) is clear, but monthly/annual pricing card heights don't align evenly on desktop, causing a jagged bottom layout. Feature bullet items lack micro-animation checkmarks.
- **Recommended Fixes**:
  - File: `frontend/src/pages/HostingNomadly.jsx` & `frontend/src/components/hosting/CpanelTabs.jsx`
  - Add `h-full flex flex-col justify-between` to `.hosting-plan-card` to ensure consistent card heights.
  - Upgrade cPanel management modal tabs (`CpanelTabs.jsx`) to use `nw-chip` styling with `data-testid` on all 9 tabs (`data-testid="cpanel-tab-{tabId}"`).

#### 4. VPS Configurator (`/vps` - `vps.jpg`)
- **Findings**: Excellent region selector (EU / Singapore) and spec tier grid. Sticky cart bar at the bottom lacks background glassmorphism (`backdrop-blur-xl bg-white/90 dark:bg-gray-900/90`), causing underlying page text to leak through during scroll.
- **Recommended Fixes**:
  - File: `frontend/src/pages/VPS.jsx` & `frontend/src/components/servers/ServersPage.jsx`
  - Set fixed z-index and non-transparent background on sticky cart bar: `bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-line dark:border-gray-800 z-40`.
  - Add explicit `data-testid="vps-tier-select-{tierId}"` and `data-testid="vps-sticky-checkout-btn"`.

#### 5. RDP Configurator (`/rdp` - `rdp.jpg`)
- **Findings**: Shares layout structure with VPS. Billing cycle pills (7-day test vs Monthly) need distinct badge contrast for the "7-Day Trial" incentive.
- **Recommended Fixes**:
  - File: `frontend/src/pages/RDP.jsx`
  - Apply `nw-badge-accent` (`bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300`) to test-period pills.

#### 6. Pricing (`/pricing` - `pricing.jpg`)
- **Findings**: TLD pricing table lists extension, registration, renewal, and transfer fees. Table rows lack zebra striping or hover states (`hover:bg-surface-2 dark:hover:bg-gray-800/50`). Search input for TLD filter lacks instant clear (`x`) button.
- **Recommended Fixes**:
  - File: `frontend/src/pages/Pricing.jsx`
  - Apply `DataTable.jsx` pattern to TLD pricing table with sticky table header (`sticky top-0 bg-white dark:bg-gray-900 z-10`).

#### 7. Developer API (`/api` - `api.jpg`)
- **Findings**: Excellent marketing copy for developer API. Code preview snippet box uses JetBrains Mono, but lacks a 1-click "Copy Code" button with toast feedback.
- **Recommended Fixes**:
  - File: `frontend/src/pages/Api.jsx` & `ApiDocs.jsx`
  - Add copy code utility button with Lucide `Copy` icon and `data-testid="copy-api-snippet-btn"`.

#### 8. Auth: Sign In & Create Account (`/sign-in` & `/create-account`)
- **Findings**: Auth card (`inner-section`) is well centered. Password visibility toggle works. However, the soft-gate email verification banner (`VerifyEmailBanner.jsx`) on create account lacks an explicit close button option or resend cooldown indicator.
- **Recommended Fixes**:
  - Files: `frontend/src/pages/auth/SignIn.jsx`, `CreateAccount.jsx`, `frontend/src/components/common/VerifyEmailBanner.jsx`
  - Standardize inputs with floating labels or explicit `nw-input` labels. Ensure all auth form buttons have `data-testid="sign-in-submit-btn"` / `data-testid="create-account-submit-btn"`.

---

### In-App SaaS Dashboard Pages (Logged-In User)

#### 9. Dashboard (`/dashboard` - `app-dashboard.jpg`)
- **Findings**: Welcome banner ("Welcome back, test buyer"), search bar, and Domain List data table. Test buyer data table contains placeholder rows with `"test_mode"` or `"Invalid Date"`.
- **Recommended Fixes**:
  - File: `frontend/src/pages/front-admin/dashboard.jsx` & `frontend/src/pages/front-admin/domain/DomainList.jsx`
  - Implement defensive formatting helper (`formatDate.js`): transform `"Invalid Date"` or raw ISO nulls to `"—"` or `"Pending Provisioning"`.
  - Map `"test_mode"` status to a styled amber badge (`nw-badge-accent`).
  - Add `data-testid="dashboard-domain-search-input"` and `data-testid="dashboard-domain-table"`.

#### 10. Prepaid Wallet (`/wallet` - `app-wallet.jpg`)
- **Findings**: Balance card ($50.00), reward points card, preset top-up buttons ($20, $50, $100, $250), crypto selector (BTC, ETH, USDT, SOL), recent top-ups list, and referral card. Top-up preset buttons lack active state ring highlighting when selected.
- **Recommended Fixes**:
  - File: `frontend/src/pages/front-admin/billing/Wallet.jsx`
  - Enhance preset amount buttons with active state ring: `ring-2 ring-brand dark:ring-brand-400 bg-brand-50 dark:bg-brand/20`.
  - Add `data-testid="wallet-preset-{amount}"` and `data-testid="generate-crypto-invoice-btn"`.

#### 11. Orders (`/orders` - `app-orders.jpg`)
- **Findings**: Order history table showing invoice IDs, products, dates, totals, and payment status. Table column headers lack sorting indicators.
- **Recommended Fixes**:
  - File: `frontend/src/pages/front-admin/OrderHistory.jsx`
  - Use `DataTable.jsx` with responsive column hiding (`hidden md:table-cell` for secondary metadata on mobile).

#### 12. Services & Renewals (`/services` - `app-services.jpg`)
- **Findings**: Displays active hosting, VPS, RDP, and domain renewals. Renewal action buttons ("Renew Now", "Auto-Renew Toggle") are small and crowded on desktop.
- **Recommended Fixes**:
  - File: `frontend/src/pages/front-admin/ServicesRenewals.jsx`
  - Standardize renewal button styles with `nw-btn-sm` and add `data-testid="renew-service-btn-{id}"`.

#### 13. Subscriptions (`/subscriptions` - `app-subscriptions.jpg`)
- **Findings**: Subscriptions table for recurring infrastructure plans. Missing empty-state graphic when user has zero subscriptions.
- **Recommended Fixes**:
  - File: `frontend/src/pages/front-admin/billing/Subscriptions.jsx`
  - Integrate `EmptyState.jsx` with a direct call-to-action ("Browse VPS & RDP Plans").

#### 14. Payment History (`/payment-history` - `app-payment-history.jpg`)
- **Findings**: Table displaying wallet debits, crypto deposits, and refunds. Refund status badges lack clear color distinction from completed deposits.
- **Recommended Fixes**:
  - File: `frontend/src/pages/front-admin/billing/PaymentHistory.jsx`
  - Color-code transactions: Deposits (Green `+`), Debits (Neutral `-`), Refunds (Indigo `↩`).

#### 15. Account Settings (`/account-settings` - `app-account-settings.jpg`)
- **Findings**: 4 tab panels (Profile, Security/2FA, API Keys, Notifications). Social logins section displays disconnected state correctly. 2FA QR code generator needs copy-to-clipboard for the manual 16-character secret key.
- **Recommended Fixes**:
  - File: `frontend/src/pages/front-admin/UserManagement/AccountSettings.jsx`
  - Add 1-click secret key copy button with `data-testid="copy-2fa-secret-btn"`.

#### 16. DNS Manager (`/dns-manager` - `app-dns-manager.jpg`)
- **Findings**: DNS record table (A, AAAA, CNAME, MX, TXT, NS). Modal for adding DNS record (`AddDNSrecord.jsx`) uses native dropdowns without custom style overrides.
- **Recommended Fixes**:
  - File: `frontend/src/pages/DnsManagerNomadly.jsx` & `frontend/src/components/front-admin/domain/DNSManagement/AddDNSrecord.jsx`
  - Replace native selects with styled custom select containers. Enforce `data-testid="add-dns-record-btn"` and `data-testid="dns-type-select"`.

#### 17. Help & Support (`/help-support` - `app-help-support.jpg`)
- **Findings**: Search bar for knowledge base articles and ticket submit trigger. Category cards are clean, but article detail view lacks breadcrumb navigation back to help home.
- **Recommended Fixes**:
  - File: `frontend/src/pages/front-admin/HelpSupport.jsx`
  - Add sticky breadcrumb bar at the top of support articles with `data-testid="support-breadcrumb"`.

#### 18. Cart & Checkout (`/cart` - `app-cart.jpg` & `CryptoCheckoutModal.jsx`)
- **Findings**: Empty cart view displays "Your cart is empty" text. Needs a high-converting "Quick Add Domain or Hosting" carousel or recommendation grid. In crypto payment modal, payment QR code and countdown timer function well.
- **Recommended Fixes**:
  - File: `frontend/src/pages/checkout/CartPage.jsx` & `MiniCartDrawer.jsx`
  - Enhance empty cart with 3 quick-add suggestion cards (.com $9.99, Offshore cPanel $4.99/mo, EU VPS $8.99/mo).

---

### Mobile Viewport Findings (390px)

#### 19. Landing Mobile (`m-landing.jpg`)
- **Findings**: Hero domain search input stacks vertically. Mobile menu drawer opens smoothly, but theme toggle and language selector lack adequate touch padding (minimum 44x44px).
- **Fix**: Increase mobile header icon touch padding to `p-3` (48x48px footprint).

#### 20. Dashboard Mobile (`m-dashboard.jpg`)
- **Findings**: Data table causes horizontal scroll without a visual gradient fade cue on the right edge.
- **Fix**: Add CSS mask or indicator arrow showing table overflow on mobile viewports.

#### 21. VPS Mobile (`m-vps.jpg`)
- **Findings**: Region cards (EU vs Singapore) stack cleanly. Spec cards (vCPU / RAM / SSD) fill full width. Sticky bottom order summary bar obstructs content if not given bottom page padding (`pb-28`).
- **Fix**: Add `pb-28` wrapper padding to mobile VPS container.

#### 22. Wallet Mobile (`m-wallet.jpg`)
- **Findings**: Preset top-up grid scales into 2x2. Crypto invoice QR code scales appropriately on 390px screens.

---

## 3. Cross-Cutting Design System Recommendations

1. **Typography Hierarchy Standardization**:
   - Headline 1: `font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight`
   - Headline 2: `font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight`
   - Metadata / Tags: `font-mono text-[11px] font-medium uppercase tracking-[0.14em]`
2. **Color & Design Tokens**:
   - Enforce Indigo (`#4F46E5` light / `#6366F1` dark) as sole primary brand accent.
   - Restrict Amber (`#F59E0B`) strictly to test mode / pending warnings.
   - Restrict Emerald (`#10B981`) strictly to active success indicators.
3. **Component Consistency (Buttons & Badges)**:
   - Use `nw-btn-primary`, `nw-btn-secondary`, `nw-btn-ghost` across all pages. Retire legacy `btn-blue`, `btn-teal`, `add-to-cart` overrides.
4. **App Shell Architecture (IA Rationalization)**:
   - Allow users to collapse or combine `AppRail.jsx` and `sidebar.jsx` into a single smart sidebar to maximize data table width on desktop screens.
5. **Accessibility & Interactive Testing**:
   - Ensure all inputs have visible focus rings (`focus:ring-2 focus:ring-brand/50`).
   - Every interactive element across all screens must carry kebab-case `data-testid` attributes.

---

## 4. Conversion & Revenue Optimization Matrix

| Page / Area | Conversion Friction Identified | Recommended Design Fix | Target Metric Impact |
|---|---|---|---|
| **Landing Hero** | Search input button is separate from search bar on small screens | Integrate single floating search button inside input box with `absolute right-2` | +14% Domain Search Starts |
| **Domain Search Table** | "Add to Cart" button gives subtle feedback without opening drawer | Trigger toast notification + slide mini-cart drawer open automatically | +22% Cart Additions |
| **VPS / RDP Configurator** | Test period (7-day trial) is buried under billing dropdown | Highlight 7-Day Test Option with prominent `nw-badge-accent` badge | +18% VPS Trial Conversions |
| **Empty Cart Page** | Dead end with no suggested products | Add 1-click popular domain extension ($9.99) & starter hosting ($4.99) add cards | +12% Recovery from Empty Cart |
| **Wallet Top-Up** | Preset amount buttons ($20, $50, $100) look like static text | Add active ring selection + "Most Popular" pill on $50 preset | +15% Average Wallet Top-Up Value |

---

## 5. Prioritized Implementation Roadmap

### Phase 1: Quick Wins (≤ 1 Day Implementation)
- **File**: `frontend/src/index.css` & `design_guidelines.json`
  - Align all utility tokens with Option 1 ("Editorial Indigo & Obsidian").
  - Enforce `data-testid` on core buttons in `Hero.jsx`, `DomainSearchForm.jsx`, `topbar.jsx`, and `Wallet.jsx`.
- **File**: `frontend/src/utils/formatDate.js`
  - Fix `"Invalid Date"` and `"test_mode"` string leaks in table views.

### Phase 2: Medium Impact (1–3 Days Implementation)
- **Files**: `frontend/src/pages/front-admin/dashboard.jsx`, `Wallet.jsx`, `OrderHistory.jsx`, `ServicesRenewals.jsx`
  - Standardize table density, badge colors (`nw-badge-brand`, `nw-badge-success`), and column alignment.
  - Upgrade sticky cart bars on `/vps` and `/rdp` with crystal glassmorphism (`backdrop-blur-xl bg-white/90 dark:bg-gray-900/90`).

### Phase 3: Larger Structural Polish (3+ Days Implementation)
- **Files**: `frontend/src/components/front-admin/admin-common/sidebar.jsx` & `AppRail.jsx`
  - Rationalize App Shell double-rail navigation into an expandable single sidebar with icon-only condensed mode.
  - Implement full mobile bottom-bar navigation for high-frequency admin actions on mobile viewports.
