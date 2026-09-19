# Plan — Redesign the DNS management screen to feel like a modern DNS platform

## The problem
The DNS management screen works, but it doesn't look or behave like the DNS managers people
are used to on other platforms:

- You have to **type the domain by hand** to load its records — there's no list of the
  domains you own to pick from.
- Records sit in a **plain table**, with a **separate "Add a record" form** lower down and a
  **pop-up window** for edits — instead of managing everything in one place.
- **TTL is shown as raw seconds** (e.g. 3600) rather than friendly choices like "1 hour".
- **Delete happens instantly** with no confirmation — easy to remove the wrong record.
- There's **no search, no filtering by record type, and no sorting**, so a busy zone is hard
  to scan.
- The add/edit fields are the **same for every record type**, with little guidance, where
  other platforms tailor the fields (e.g. priority for MX, multi-line for TXT) and validate
  the value before saving.

## What will change

**A. Pick the domain instead of typing it**
- A **dropdown of the domains you own** to choose from, with a manual-entry option kept as a
  fallback. Selecting a domain loads its records.
- Show the domain's **current nameservers** and where the records are served from, so it's
  clear what you're editing.

**B. A records area that feels like a real control panel**
- An **"add record" row at the top of the table** (not a separate form far below).
- **Edit records in place** (click to edit the row, Save/Cancel) rather than in a pop-up.
- **Type-aware fields with light validation and short hints** per record type — A (IPv4),
  AAAA (IPv6), CNAME/NS (target host), MX (priority + mail host), TXT (multi-line value),
  SRV (its fields). Bad values are caught before saving.
- **Friendly TTL choices** (Auto, 1 min, 5 min, 30 min, 1 hour, 1 day) with a "custom
  seconds" option still available.
- Clearer rows: the **full record name** (e.g. `www.mysite.com`), a **copy button** on the
  value, sensible truncation for long values, and the **record type shown as a labelled
  badge**.
- **Delete asks for confirmation** first.

**C. Find records fast**
- A **search box**, **filter by record type**, **sortable columns**, and a visible
  **record count**.

**D. Nameservers, restyled**
- Show the **current nameservers**, and present the "replace nameservers" tool more clearly
  (at least two entries), keeping the note that **DNS changes are free**.

**E. Polish**
- Loading placeholders, a clearer empty state, success/error messages, a **mobile-friendly**
  layout (records become cards on small screens), and the same overall look and dark-mode
  styling the rest of the app already uses.

## Decisions worth confirming (a default is chosen for each)
1. **Editing style — default: edit in place** (like Cloudflare). Alternative: keep the
   current pop-up editor.
2. **Domain selection — default: dropdown of your owned domains + manual-entry fallback.**
   Alternative: keep manual typing only.
3. **TTL — default: friendly presets with a custom option.** Alternative: keep raw seconds.
4. **Delete — default: ask for confirmation.** Alternative: keep instant delete.
5. **Reference look — default: a clean, modern Cloudflare-style table.** Say if you'd prefer
   the Namecheap/GoDaddy style instead.

## Out of scope (unless requested)
- A Cloudflare-style **"proxy" (orange cloud) on/off toggle** per record — the connected DNS
  API doesn't expose a per-record proxy flag to set.
- **DNS record history / one-click restore** — not supported by the connected DNS API.
- **DNSSEC**, email-deliverability wizards, and traffic analytics.
- Any change to **how DNS is priced** (it stays free) or how nameservers work upstream.

## Notes
- This is a presentation and interaction redesign plus a domain picker and search — it uses
  the same records and the same DNS source as today.
- The supported record types stay the same (A, AAAA, CNAME, MX, TXT, NS, SRV). Whether a live
  change takes effect still depends on the domain being on the connected DNS, exactly as now.
