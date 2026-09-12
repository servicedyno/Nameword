# Nameword Logo Redesign — Proposal

## What's wrong today
The current logo is a folded purple-ribbon "N" (dated 3D gradient, reads as a "W" or "Z" at small sizes) paired with a thin lowercase serif-like wordmark in dark navy. It does not match the product's current look (flat indigo `#4F46E5`, slate ink `#0F172A`, clean geometric type) and it does not communicate what Nameword is: privacy-first domains, hosting, VPS and RDP.

## Goal
A flat, modern logo system that:
- works at 16px (favicon) and on a hero banner,
- has clean light and dark variants,
- says "domains / infrastructure / privacy" without a cliché padlock or cloud,
- fits the existing indigo brand palette so the rest of the UI does not need to change.

## Five concepts to choose from
Each concept is delivered as a preview board (mark + wordmark, shown on light and dark backgrounds, plus a small favicon-size render) so it can be judged in context before anything is built.

1. **Dot Wordmark — "nameword."**
   Pure typography. Bold geometric lowercase wordmark with a single indigo period at the end, echoing a domain name. The period doubles as the standalone icon/favicon. Safest, most timeless; strongest for a domain-first brand.

2. **Keyhole N**
   A solid rounded-square badge with an "N" whose diagonal stroke forms a keyhole in negative space. Privacy is built into the letter rather than added as a separate padlock. Reads clearly at favicon size.

3. **Bracket N**
   The "N" built from two vertical bars and a slash, framed by subtle angle brackets `< >` — a nod to developers, DNS records and the API. Monospace-flavoured wordmark. Best fit if the developer / sysadmin audience is the priority.

4. **Node Stack**
   Flat "stacked layers" glyph (three offset rounded bars) that form an abstract "N" when read diagonally — suggesting servers, VPS tiers and layered jurisdictions. Modern infra look.

5. **Shield Slash**
   A minimal shield silhouette with a single diagonal indigo stroke cutting through it (the N's diagonal). Direct "offshore / protected" message, still flat and geometric.

## Decisions already made (push back if any are wrong)
- **Palette stays indigo.** Mark uses brand indigo `#4F46E5` with slate ink `#0F172A`; dark mode flips to light ink on dark surface. No gradients, no 3D.
- **Wordmark case:** lowercase "nameword" (feels like a domain). Concept 1 relies on this; others work either way.
- **Typeface:** geometric sans already in the design system (Outfit); concept 3 uses a monospace variant.
- **Selection process:** all five boards are shared at once; one is picked; up to two rounds of refinement on the chosen concept (colour, weight, spacing) before production.

## What gets delivered once a concept is picked
- Production SVGs: full horizontal lockup, stacked lockup, icon-only mark — each in light and dark variants.
- Favicon set (SVG + PNG 16/32/180/512) and updated browser tab / PWA icons.
- Social share (Open Graph) image with the new logo.
- Logo replaced everywhere it appears: top navigation, footer, login/register pages, checkout header, dashboard sidebar, transactional email templates, and the public `nameword-logo.png` used by external links.
- Old ribbon logo assets removed.

## Out of scope
- Renaming the product or changing the tagline.
- Reworking UI colours, typography or layouts beyond swapping the logo.
- Printed / merchandise variants.
