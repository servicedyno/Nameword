# Landing Page Re-Image — Plan

## Problem
The current public landing page ("Offshore hosting, private by default") is text-heavy and visually flat. It leans on a single fake browser mock and small line icons, so it reads as a wireframe rather than a finished, premium product. It does not build trust or convey what Nameword is at a glance.

## Objective
Rebuild the public landing page as a polished, image-rich page that:
- Looks premium and trustworthy within the first screen.
- Clearly communicates the offering — private domains, DNS, cPanel hosting, VPS, RDP and private email from privacy-respecting jurisdictions.
- Keeps the existing indigo brand and works in both light and dark mode.
- Keeps the domain search as the primary action.

Only the public landing page (the `/` home route) is in scope. Everything it links to stays as-is.

## Direction (recommended)
A "premium product, privacy-first" look built from three visual layers:
1. **Real photography** for trust and atmosphere — secure data centre / server imagery, world-map / jurisdiction motifs, calm "in control of your privacy" abstract shots. Sourced as high-quality, on-brand images (indigo/slate leaning), not generic clip-art.
2. **A refined product visual** in the hero — a clean, believable domain-search / dashboard panel (a polished evolution of today's mock) layered over an image + soft indigo gradient, instead of the current bare white card.
3. **Brand accents** — subtle gradients, soft shadows, rounded cards and generous spacing, consistent with the current indigo system.

The result is professional stock-photography-driven, not custom-illustrated. See "Decisions to confirm" for the alternative.

## What the new page includes (section by section)
1. **Hero** — strong headline + subcopy, the domain search bar, trust chips (WHOIS privacy · jurisdictions · prepaid wallet), and a premium hero visual (product panel over image + gradient). Full-bleed, cinematic on desktop; stacked and legible on mobile.
2. **Trust bar** — the four proof points (2 jurisdictions, WHOIS privacy, prepaid wallet, full API), restyled with more presence.
3. **Products** — Domains, DNS, Hosting, VPS, RDP, Private Email, API as rich cards, each with a supporting image or strong iconography, short benefit copy, and a link.
4. **Why Nameword / value** — a visual feature section (privacy, minimal data collection, offshore jurisdictions, crypto-friendly wallet) pairing copy with imagery.
5. **How it works** — the existing 3-step flow, restyled with clearer visuals.
6. **Pricing teaser** — the transparent per-TLD pricing block, kept but visually upgraded, linking to the full pricing page.
7. **Security / privacy** — a dedicated band with real security imagery replacing the current single graphic.
8. **Rewards** — the prepaid-wallet / reward-points band, restyled.
9. **Final CTA** — a bold closing call-to-action (search a domain / create account) on an on-brand image or gradient.
10. **Footer** — unchanged (recently redesigned).

Copy: existing positioning and messaging are kept; headlines and section intros are tightened for impact. No changes to product names, prices, or claims.

## What stays the same
- Domain search behaviour and all links/routes.
- Pricing data and product lineup.
- Brand palette (indigo/slate), typography, header and footer.
- Light and dark mode support.

## Out of scope
- Other marketing pages (SSL, Email, Pricing page, legal), auth screens, and the signed-in dashboard.
- Rewriting product/pricing logic or copy claims.
- Renaming, re-tagging, or changing the colour system.

## Decisions to confirm
1. **Imagery style.** Recommended: professional photography + a refined product panel (as above). Alternative: fully custom AI-generated illustrations/3D for a more distinctive, less "stock" feel (more effort, more unique). Default assumed: **photography + product panel.**
2. **Hero visual.** Recommended: keep a product/domain-search panel as the hero centrepiece, upgraded and set over an image/gradient. Alternative: lead with a large photograph and move the product panel lower. Default assumed: **upgraded product panel in hero.**
3. **Tone of imagery.** Assumed: abstract/tech + privacy motifs (data centres, world/jurisdiction, secure privacy), avoiding cliché padlocks and generic office stock, and avoiding real recognisable faces unless clearly appropriate.

## Assumptions
- Both light and dark variants must look equally finished.
- Same content sections as today, re-imagined — no new product offerings introduced.
- Performance-reasonable images (web-optimised) are acceptable; exact photos will be chosen during build and can be swapped on request.
