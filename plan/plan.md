# Plan — Fix duplicate hosting + rebuild the cPanel manager (with real file upload / unzip)

Two separate problems on the hosting area of the account `moxxcompany@gmail.com`.

---

## Problem 1 — The account shows two hosting plans (confusing)

### What's happening
"Your hosting accounts" is built from the buyer's own purchase records. When the same
website has more than one record behind it — for example the earlier crypto attempt that
failed and was auto-refunded, plus the one that actually got provisioned, or an old
test-mode record — the list shows both as if they were two separate live accounts. Only
one of them is a real, working hosting account (the provisioned one).

### What will change
- The list will collapse to **one entry per real hosting account**. When several records
  point at the same website, the genuinely provisioned/active one wins and the others are
  hidden.
- Records that were **refunded, failed, cancelled or superseded** will no longer appear as
  "accounts."
- The specific stale record on `moxxcompany@gmail.com` will be corrected so this account
  shows a single, correct hosting plan.
- Nothing is deleted from the real provider; this only affects what the list shows and a
  one-time cleanup of the bad record.

### Decision worth confirming
- **Default chosen:** hide the leftover/duplicate entirely so only the working account
  shows. (Alternative: keep showing it but clearly labelled "refunded / not active."
  This is more cluttered and is not recommended.)

---

## Problem 2 — The cPanel manager looks small and it's unclear how to upload / unzip files

### What's happening
The management panel opens in a small pop-up. It can browse folders, edit a text file,
create a folder and delete — but it has **no Upload button and no Unzip**, even though the
underlying hosting service fully supports uploading, unzipping, zipping, renaming, copying
and moving files. So the most common tasks (put my site files up, unzip an archive) are
effectively missing.

### What will change

**A. A bigger, clearer management experience**
- The manager becomes a spacious, full-screen layout instead of the small pop-up, so every
  section has room to breathe. All existing sections stay (Databases, Subdomains, Domains,
  SSL, Files, Security, Geo, Analytics, Site status) plus the account overview, upgrade and
  addon-domain tools that already exist.

**B. A real File Manager** (the main ask), with:
- **Upload files** — drag-and-drop or a file picker, with a visible progress bar. Large
  files upload reliably in chunks so they don't get cut off. Multiple files at once.
- **Unzip / Extract** — for `.zip` and common archives, extract into the current folder.
- **Compress / Zip** — select files/folders and zip them on the server.
- **Rename**, **Copy**, **Move** — plus the existing New folder, Delete and in-browser
  text editing.
- **Nicer browsing** — breadcrumb path you can click, clearer file/folder icons, file
  sizes and types, a taller list, and select-multiple for bulk delete/zip/move.

**C. Proof it works**
- On this account's live hosting, the following will be exercised end-to-end and confirmed
  working: upload a file, unzip an archive, create/rename/move/delete, zip a selection, and
  edit + save a text file.

### Decisions worth confirming
- **Layout — default chosen:** full-screen manager (feels like a real control panel).
  Alternative: keep it as a pop-up but much larger. Full-screen is recommended.
- **File-manager scope — default chosen:** include upload, unzip, zip, rename, copy, move,
  new folder, delete and edit (the complete set the service supports). Say so if you'd
  rather ship only upload + unzip first.

---

## Out of scope (unless you ask)
- Email/webmail management (intentionally excluded from this panel).
- Changing hosting prices, plans, or how checkout/provisioning works.
- Anything that requires provider-side credentials that aren't currently connected.

## Note
- Exact behaviour of the duplicate-hosting fix will be verified against this account's real
  purchase records during the work; the outcome above (one correct plan shown) is the goal.
- Gold-only security features (Visitor Captcha, JS challenge, Geo) remain gated to the Gold
  plan as they are today — unchanged by this work.
