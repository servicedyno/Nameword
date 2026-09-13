# Plan: Fix navigation for signed-in users ("lost sidebar / no clear way to manage the app")

## The problem today

The app currently has two completely different navigation frames, and a signed-in
user gets dropped between them with no reliable way back:

1. **The "manage my account" frame** (with the left sidebar / icon rail) only appears
   on these pages: Dashboard, Wallet, Orders, My services, Subscriptions, Payment
   history, and Account settings.

2. **The "storefront" frame** (a simple top navbar) appears on the Home/landing page
   and on all the product pages: Domains, DNS, Hosting, VPS, RDP, API, Pricing, and
   Help. These pages have **no sidebar at all**.

Concrete consequences a signed-in user hits:

- On the landing page or any product page, the only personal control is a small
  name dropdown. That dropdown links to Account-settings sub-pages and Logout — it
  has **no link to the Dashboard, Wallet, Orders, or anything else**. So from the
  landing page there is effectively **no visible way to get into the app**; the user
  has to know a URL.
- Clicking the logo anywhere always goes to the public landing page, which throws a
  signed-in user out of the app frame (and then, per the point above, they're stuck).
- Even inside the app, on a normal laptop screen width (roughly 1024–1279px) the
  sidebar and icon rail are hidden; navigation collapses to a hamburger menu and a
  small bottom bar. On those screens it looks like the sidebar "disappeared."
- Because product pages use the storefront frame, moving between "Dashboard" and
  "Domains/Hosting" makes the whole left navigation appear and disappear, which reads
  as losing the menu.

## Goal

A signed-in user always has a clear, consistent way to reach and manage every part
of their account (Dashboard, Domains, DNS, Hosting, VPS, RDP, Wallet, Rewards,
Orders, Services, Subscriptions, Billing, Settings, Help) — no matter which page
they're on, and on any screen size.

## What will change (proposed)

1. **Turn the name dropdown into a real account menu.** When signed in, the menu
   (shown on both the storefront navbar and the in-app top bar) gains quick links to:
   Dashboard, Domains, Wallet, Rewards, Orders, My services, Subscriptions, Payment
   history — in addition to the existing Account settings items and Logout.

2. **Add a visible "Dashboard" entry to the storefront navbar for signed-in users.**
   Instead of only "Sign in / Create account," a signed-in user sees a clear
   "Dashboard" button (in both the desktop navbar and the mobile menu), so getting
   back into the app is one obvious click from the landing page or any product page.

3. **Make the logo context-aware.** For a signed-in user the logo leads to the
   Dashboard (the app), not the public landing page. A separate, clearly labelled
   link (e.g. "View public site") remains available for anyone who wants the
   marketing site.

4. **Keep the sidebar visible on laptop screens.** The persistent sidebar / icon rail
   will appear starting at standard laptop width (~1024px) rather than only on large
   desktops (~1280px), so laptop users stop losing the menu. Phones keep the current
   drawer + bottom-bar behaviour.

5. **Consistent management access on product pages.** So the menu never vanishes
   while a signed-in user is browsing Domains/DNS/Hosting/VPS/RDP/Pricing, those pages
   will keep an always-available way into account management (see the decision below
   for how far this goes).

## Decisions to confirm

**A. How far to unify the product pages (the main choice).**
   - **Option 1 — Bridge only (recommended, lighter):** product/storefront pages keep
     their current storefront look, but signed-in users always get the "Dashboard"
     button + full account menu (items 1–3 above). Fastest, lowest risk, keeps the
     marketing look of product pages.
   - **Option 2 — Full wrap (more thorough, bigger change):** when signed in, the
     product pages (Domains, DNS, Hosting, VPS, RDP, Pricing) are shown *inside* the
     app frame with the same left sidebar as the Dashboard, so the sidebar literally
     never disappears. This is the most seamless result but changes how those pages
     look for logged-in users and is a larger change.
   - Default if you don't say otherwise: **Option 1**.

**B. Logo destination for signed-in users.** Default: logo → Dashboard, with a
   separate "View public site" link. Say if you'd rather the logo always go to the
   public landing page.

**C. Help visibility.** Help is currently reachable in most places; the account menu
   will also include it. Confirm that's fine (no reason to expect otherwise).

## Out of scope

- No change to what the pages themselves do (search, checkout, DNS management, etc.).
- No change to sign-in / sign-up, permissions, or which pages require login.
- No new sections or features beyond navigation/menus.
- No visual redesign of the pages other than the navigation/menu changes above.

## Assumptions

- The set of destinations that matter for "managing the app" is the list already
  present in the in-app sidebar/rail (Dashboard, Domains, DNS, Hosting, VPS, RDP,
  Wallet, Rewards, Orders, Services, Subscriptions, Payment history, Settings, Help).
- Signed-out visitors see no change; this only affects the signed-in experience.
- Wording of new menu items reuses existing labels and is available in English,
  Spanish, and French.
