# Nameword — Inline Quick-Order UX

## Goal
Let a signed-in customer search, add, and pay for products (domains first, then
hosting) inline — without being thrown across full-page steps — while keeping the
detailed cart for anything advanced. Make every "buy" button honest about whether
checkout will be one tap or need a top-up.

## Usability gaps today (what the current flow does)
1. **Dashboard search kicks the user out of the app.** Searching a domain from the
   signed-in dashboard sends them to the public marketing page to see results,
   losing the sidebar, wallet, and their place.
2. **Every add takes over the whole screen.** Adding a suggested domain, a search
   result, or a hosting plan immediately navigates to the full cart page. The user
   can't add a second item or keep looking without bouncing back and forth.
3. **No cart is ever visible in the signed-in area.** There's no cart button, no
   item-count badge, no quick peek at what's already added.
4. **No fast path for a returning customer.** Even buying a single domain when the
   wallet already has money means moving through search → cart → pay across
   multiple screens.
5. **The price-vs-wallet reality is hidden until the cart.** The user doesn't see
   "you have $X, this is $Y" at the moment of adding, so they can't tell if it's
   one tap or a top-up until they've navigated away.

## What will be built
A. **Inline domain search on the dashboard.** Type a name and see the exact match,
   availability, price, and alternative extensions right there — no page change.
   Adding an item feeds the mini-cart (below) instead of a full navigation.

B. **Slide-in mini-cart + cart button with a live item-count badge** in the top bar,
   available from anywhere in the signed-in app. Adding anything opens/updates it.
   It shows the line items, subtotal, and current wallet balance, and lets the user
   finish the order right there with **"Pay from wallet"** or **"Pay with crypto"**
   (the crypto address/QR flow already exists). The full cart page stays for
   changing nameservers or spending reward points.

C. **Wallet-aware buy buttons.** On suggestion and result cards (and in the drawer),
   the button reflects the user's balance: **"Buy now"** (single confirm) when the
   wallet covers it, or **"Pay with crypto"** when it doesn't, with the price shown
   against the wallet balance so there are no surprises.

D. **(Optional — see decision 2) One-tap quick-buy that skips the cart** entirely for
   simple single-item orders (a domain on default nameservers, or hosting for a
   domain already owned), completing straight from the drawer.

Everything is responsive; the drawer works on mobile as a bottom/side sheet.

## Decisions to confirm
1. **Should the mini-cart drawer actually complete payment (wallet + crypto), or just
   be a faster review that still sends the user to the full cart to pay?**
   Recommended: complete payment in the drawer — that's the point of "quick orders".
2. **Include the one-tap quick-buy that skips the cart for simple single items?**
   Recommended: yes, with sensible defaults the user can change later.
3. **For a quick-bought domain, default the nameservers to Nameword's parking/DNS
   (editable afterward in domain management)?** Recommended: yes.
4. **Which products get inline quick-add first?** Recommended: domains + hosting now;
   VPS/RDP kept on their existing pages for later.

## Assumptions (chosen unless you say otherwise)
- The full cart page and current checkout stay; this adds faster paths alongside them.
- Reward-points redemption and nameserver customization remain on the full cart page,
  kept out of the quick path to keep it simple.
- The public (logged-out) landing search stays discovery-only — no wallet shown there,
  and adding still routes guests through sign-in/account as it does now.
- Pricing, order, wallet, and crypto behavior are unchanged; this is a front-end
  presentation and flow change over the existing capabilities.

## Out of scope
- Any change to pricing, provisioning, or payment logic.
- VPS/RDP inline quick-add (unless you choose to include them now).
- The logged-out marketing funnel beyond the existing behavior.

## Success criteria
- A signed-in user can search a domain, add it, and pay — with no full-page jump.
- The cart is reachable from anywhere in the app and shows a live item count.
- Buy buttons state upfront whether checkout is one tap or needs a top-up.
