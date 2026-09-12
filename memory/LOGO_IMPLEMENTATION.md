# Nameword "Keyhole N" Logo Redesign — Implementation Handoff

Status: **COMPLETE — implemented & verified (light + dark, public + authed).**

---

## 1. Goal (approved by user)
Replace the old 3D purple "ribbon N" logo with a flat, modern **"Keyhole N"** system (Concept 2, user-selected).

- **Palette (strict, flat, no gradients / no 3D):**
  - Indigo `#4F46E5` (badge)
  - Slate ink `#0F172A` (wordmark in light mode)
  - Light ink `#F8FAFC` / `#FFFFFF` (wordmark in dark mode)
- **Concept:** solid rounded-square indigo badge containing a white "N" whose diagonal stroke carries a **keyhole cut in negative space**. Lowercase wordmark `nameword`. Typeface **Outfit** (already loaded).
- **No** padlock / cloud clichés.
- **Dark mode requirement:** the badge stays **indigo**; only the wordmark text flips to light ink. (The old code turned the whole logo white in dark mode — must NOT do that anymore, see §4.)

---

## 2. Current state / what's already been done
- **DONE:** `/app/frontend/src/assets/logo/favicon.svg` has ALREADY been overwritten with the new Keyhole-N mark (badge + white N + indigo keyhole cut). This is the canonical mark artwork — reuse its geometry everywhere. Contents:

```svg
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Nameword">
  <rect width="512" height="512" rx="116" fill="#4F46E5"/>
  <g fill="#FFFFFF">
    <rect x="150" y="150" width="58" height="212" rx="10"/>
    <rect x="304" y="150" width="58" height="212" rx="10"/>
    <path d="M155 150 H208 L357 362 H304 Z"/>
  </g>
  <g fill="#4F46E5">
    <circle cx="238" cy="230" r="21"/>
    <path d="M242 249 L261 249 L305 307 L281 307 Z"/>
  </g>
</svg>
```
  - Geometry notes: viewBox 512. Badge rx=116. Left bar x150–208, right bar x304–362 (both y150–362). Diagonal quad (155,150)(208,150)(357,362)(304,362), horizontal thickness 53. Keyhole (indigo, cut into the diagonal, slanted to follow it): circle cx238 cy230 r21 + tapering stem `M242 249 L261 249 L305 307 L281 307 Z`. All keyhole geometry is verified to sit inside the diagonal bar. **VISUALLY VERIFY this renders as a clean keyhole before mass-replacing** (render/screenshot once; tweak circle r / stem if needed).
- Nothing else has been changed yet. All other logo files are still the OLD ribbon artwork.

---

## 3. Where the logo is used (full map)

### 3a. Frontend — asset files (`/app/frontend/src/assets/logo/`)
| File | Old use | New content to produce |
|---|---|---|
| `favicon.svg` | icon-only mark (was `#191339` ribbon) | ✅ DONE — new Keyhole-N mark |
| `logo.svg` | horizontal lockup (dark ink, used in Navbar/Footer/AuthNavbar with `.dark-mode`) | horizontal lockup LIGHT: mark + `nameword` in `#0F172A` |
| `nameword-white.svg` | white lockup | horizontal lockup DARK: mark + `nameword` in `#F8FAFC` |
| `nameword-blue.svg` | blue lockup (used in pricing-plans on white card) | make = light lockup (mark + `#0F172A` text) |
| `nameword-stacked.svg` (new) | — | stacked lockup (mark centered above wordmark) — brand-kit deliverable |

### 3b. Frontend — components that render the logo
| File | Line(s) | Import | Notes |
|---|---|---|---|
| `src/components/layout/Navbar.jsx` | 3, 59, 156 | `logo` (+ mobile drawer) | uses `<img src={logo} className="dark-mode ...">` twice |
| `src/components/layout/Footer.jsx` | 1, 41 | `logo` | `<img src={logo} className="dark-mode ...">` |
| `src/components/layout/AuthNavbar.jsx` | 1, 36 | `logo` | `<img src={logo} className="dark-mode ...">` |
| `src/components/home/pricing-plans.jsx` | 1, 70 | `logoblue` | small logo on a white pricing card |
| `src/layouts/FrontLayout.jsx` | 12, 104 | `favicon` | mobile topbar mark `<img src={favicon} className="... dark-mode">` |
| `src/components/front-admin/admin-common/AppRail.jsx` | 2, 42 | `favicon` | icon rail mark `<img src={favicon} className="... dark-mode">` |
| `src/components/front-admin/admin-common/sidebar.jsx` | 1, 502 | `favicon` | mark `<img src={favicon} ...>` |
| `src/components/common/Loader.jsx` | 1, 8 | `favicon` | splash mark `<img src={favicon} className="dark-mode w-12">` |
| `src/components/common/icons.jsx` | exports `logo`, `logoblue`, `favicon`, `logo`→`logo.svg`, `logoblue`→`nameword-blue.svg`, `favicon`→`favicon.svg` | central export barrel |

### 3c. Frontend — public + index.html
- `/app/frontend/public/nameword-logo.png` — old raster logo. Referenced by `index.html` line 7: `<link rel="icon" ... href="/nameword-logo.png">`. Replace with new mark PNG (512).
- `/app/frontend/public/vite.svg` — stale default, delete or replace.
- `/app/frontend/public/logo.png` — **does not exist yet but is referenced by ALL email templates** (see 3d). MUST be created (light horizontal lockup PNG) so production emails resolve it.
- `/app/frontend/index.html` — update `<link rel="icon">`, add `apple-touch-icon` (180) + `favicon-32`/`favicon-16` + optional `og:image`. `theme-color` currently `#0b1020` (fine, or set to `#4F46E5`).

### 3d. Backend — email templates (`/app/backend/views/mails/*.html`)
- **All 26 templates** embed the SAME absolute URL: `https://namewordfrontend-production.up.railway.app/logo.png` (width 120, class `.logo`). Email background is **white** (`#ffffff`), so the logo must be the **LIGHT** lockup (indigo badge + slate text) on transparent/white.
- Because email clients fetch this URL externally, the fix is to **place the new light lockup PNG at `/app/frontend/public/logo.png`** so the production Railway frontend serves the new artwork at that path. (Leave the railway domain as-is unless the user gives a new production domain.)
- Also update `/app/backend/views/mails/images/logo.png` and `logo.svg` (local copies, 2466 B / 5781 B) with the new artwork for completeness.
- Do NOT touch the social icon PNGs (twitter/facebook/instagram/linkedin) — out of scope.

---

## 4. CRITICAL theming gotcha
`/app/frontend/src/index.css` line 231:
```css
.dark .dark-mode { filter: brightness(100); }
```
This makes ANY element with class `dark-mode` turn **pure white** in dark mode. The OLD logo relied on this (dark-ink logo → white in dark).

**New behaviour required:** badge must STAY indigo in dark mode; only wordmark flips.
- For the **mark** (`favicon.svg` — self-contained indigo badge with white N): **REMOVE the `dark-mode` class** from every `<img src={favicon}>` (FrontLayout:104, AppRail:42, Loader:8, sidebar if present). The indigo badge reads fine on both light and dark surfaces, so no filter needed.
- For the **wordmark lockup**: do NOT use an `<img>` + `.dark-mode`. Use the `BrandLogo` React component (see §5) which renders the badge as inline SVG (always indigo) + the word as real Outfit HTML text colored `text-[#0F172A] dark:text-white`. This is crisp and theme-correct without needing two image files in-app.

---

## 5. Recommended implementation — `BrandLogo` component (in-app wordmark)
SVG loaded via `<img>` cannot use the page's Outfit web font, so render the wordmark as HTML text. Create `/app/frontend/src/components/common/BrandLogo.jsx`:

```jsx
export const NamewordMark = ({ className = "h-8 w-8" }) => (
  <svg viewBox="0 0 512 512" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect width="512" height="512" rx="116" fill="#4F46E5" />
    <g fill="#FFFFFF">
      <rect x="150" y="150" width="58" height="212" rx="10" />
      <rect x="304" y="150" width="58" height="212" rx="10" />
      <path d="M155 150 H208 L357 362 H304 Z" />
    </g>
    <g fill="#4F46E5">
      <circle cx="238" cy="230" r="21" />
      <path d="M242 249 L261 249 L305 307 L281 307 Z" />
    </g>
  </svg>
);

const BrandLogo = ({ markClassName = "h-8 w-8", textClassName = "text-[1.6rem]", showText = true, className = "" }) => (
  <span className={`inline-flex items-center gap-2.5 ${className}`} data-testid="brand-logo">
    <NamewordMark className={markClassName} />
    {showText && (
      <span className={`font-display font-bold tracking-tight leading-none text-[#0F172A] dark:text-white ${textClassName}`}>
        nameword
      </span>
    )}
  </span>
);

export default BrandLogo;
```

Wire-ups:
- **Navbar.jsx** (desktop line 59 + mobile drawer line 156): replace `<img src={logo} ... />` with `<BrandLogo markClassName="h-8 w-8" />`. Drop the now-unused `logo` import.
- **Footer.jsx** (line 41): replace with `<BrandLogo />`.
- **AuthNavbar.jsx** (line 36): replace with `<BrandLogo />`.
- **pricing-plans.jsx** (line 70): white card → `<BrandLogo />` (or `<NamewordMark className="h-8 w-8" />` if only the mark fits). Verify layout.
- **AppRail / sidebar / Loader / FrontLayout mobile topbar**: keep `<img src={favicon}>` (the new mark) but **remove the `dark-mode` class**. Optionally swap to `<NamewordMark />` for crispness.

Keep `icons.jsx` exports intact (paths unchanged) so nothing breaks even if an import lingers.

---

## 6. Standalone SVG lockup files (brand kit + raster source)
Author `logo.svg` / `nameword-white.svg` / `nameword-blue.svg` / `nameword-stacked.svg` as nested-SVG lockups. Pattern:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 232 52" fill="none">
  <svg x="0" y="4" width="44" height="44" viewBox="0 0 512 512">
    <rect width="512" height="512" rx="116" fill="#4F46E5"/>
    <g fill="#FFFFFF">
      <rect x="150" y="150" width="58" height="212" rx="10"/>
      <rect x="304" y="150" width="58" height="212" rx="10"/>
      <path d="M155 150 H208 L357 362 H304 Z"/>
    </g>
    <g fill="#4F46E5">
      <circle cx="238" cy="230" r="21"/>
      <path d="M242 249 L261 249 L305 307 L281 307 Z"/>
    </g>
  </svg>
  <text x="58" y="35" font-family="Outfit, 'Plus Jakarta Sans', sans-serif" font-size="34" font-weight="700" letter-spacing="-1" fill="#0F172A">nameword</text>
</svg>
```
- light lockup (`logo.svg`, `nameword-blue.svg`): text fill `#0F172A`.
- dark lockup (`nameword-white.svg`): text fill `#F8FAFC`.
- stacked (`nameword-stacked.svg`): mark centered on top, wordmark centered below (`text-anchor="middle"`).
- NOTE: `<text font-family="Outfit">` in a standalone SVG only renders in Outfit if the viewer has the font. That's fine for a brand-kit file, and for the raster step below we use HTML + Google-Fonts Outfit so the PNGs are pixel-perfect.

---

## 7. Raster deliverables (favicons, OG, email/public PNGs)
Tools available in pod: **`google-chrome` / `chromium`** (headless) at `/usr/bin/google-chrome`, `/root/bin/chromium`. No rsvg/inkscape/sharp/cairosvg. Pillow 12 is available.

Recommended: build small HTML files (badge = inline SVG; wordmark = HTML text with `@import` Outfit from Google Fonts — same import the app uses at index.css line 1) and screenshot with headless Chrome to PNG. For transparency use `--default-background-color=00000000` and `--force-color-profile=srgb`. Example:

```bash
google-chrome --headless=new --no-sandbox --disable-gpu \
  --default-background-color=00000000 \
  --screenshot=/app/frontend/public/logo.png \
  --window-size=480,120 --hide-scrollbars \
  file:///tmp/lockup_light.html
```
Alternatively rasterize the mark alone for square icons (window-size 512x512).

Produce & place:
- `/app/frontend/public/favicon-16.png` (16), `favicon-32.png` (32) — mark.
- `/app/frontend/public/apple-touch-icon.png` (180) — mark (optionally on solid indigo full-bleed since iOS masks its own radius; simplest: transparent mark).
- `/app/frontend/public/favicon-512.png` (512) — mark.
- `/app/frontend/public/nameword-logo.png` — mark 512 (replaces old file referenced by index.html; also update index.html to the new favicon set).
- `/app/frontend/public/logo.png` — **LIGHT horizontal lockup** (used by ALL emails; also copy to `/app/backend/views/mails/images/logo.png`).
- `/app/frontend/public/og-image.png` — 1200×630 Open Graph: indigo `#4F46E5` (or slate `#0F172A`) background + centered white mark + `nameword` wordmark + tagline. Wire into `index.html` (`og:image`, `twitter:image`) with an absolute URL.

Verify each PNG (view the file) — Chrome headless sometimes renders before webfont loads; add a short delay via `--virtual-time-budget=2000` or inline the font as base64 if the wordmark comes out in a fallback font.

---

## 8. index.html edits (`/app/frontend/index.html`)
- Replace line 7 icon link with the new set:
```html
<link rel="icon" type="image/svg+xml" href="/src/assets/logo/favicon.svg" />  <!-- or a public copy -->
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
```
- Add `og:image` / `twitter:image` pointing to `/og-image.png` (absolute URL for production).
- (Vite serves `public/` at root; the SVG favicon can also be copied to `public/favicon.svg` so `/favicon.svg` resolves at runtime.)

---

## 9. Old assets to remove/replace
- Overwrite (not delete) `logo.svg`, `nameword-white.svg`, `nameword-blue.svg` with new artwork.
- Replace `public/nameword-logo.png`; delete `public/vite.svg`.
- Replace `backend/views/mails/images/logo.png` + `logo.svg`.
- Old ribbon geometry (`fill="#191339"` / `#34228E` / big `M10.. Z` paths) must no longer appear anywhere: `grep -rn "191339\|34228E" /app/frontend/src` should return nothing after the work.

---

## 10. Verification checklist (do NOT finish without this)
1. `yarn build` (in `/app/frontend`) succeeds; lint clean.
2. Screenshot **light + dark**, **desktop (1920) + mobile (390)**: public Navbar, Footer, sign-in (AuthNavbar), dashboard AppRail/sidebar/mobile topbar, Loader, pricing card. Confirm: badge indigo in BOTH themes; wordmark slate in light / near-white in dark; keyhole visible; nothing turns fully white in dark; no clipped/blurry marks.
3. Favicon shows in browser tab (new mark).
4. Render one email template (e.g. `password_reset.html`) in a browser to confirm the new `logo.png` displays on the white header.
5. `grep -rn "191339\|34228E\|vite.svg" /app/frontend` → empty.
6. Run the **frontend testing agent** for the logo/layout across the app (light+dark, desktop+mobile) since it touches many shared components.

Preview URL: read `VITE_API_BASE_URL` from `/app/frontend/.env` (frontend uses same-origin at runtime). Test login creds in `/app/memory/test_credentials.md` (buyer@nameword.local / Buyer@12345, demo@nameword.local / Demo@12345).

---

## 11. Do-not-break notes
- Do not use gradients/3D/padlock/cloud.
- Do not reintroduce the `.dark-mode` brightness hack on the badge.
- Do not seed/modify the database.
- Keep `icons.jsx` export names stable.
- Frontend serves a production build via `/app/frontend/start.sh` when `/app/frontend/.prod` exists (Cloudflare-429-safe). After asset/code changes, if `.prod` is present the build must be re-run (supervisor restart of frontend triggers `start.sh`). For fast HMR dev, delete `.prod` then restart frontend.
