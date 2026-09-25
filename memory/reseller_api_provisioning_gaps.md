# Reseller API (Nomadly) — End‑to‑End Provisioning Gaps

**Author:** E1 (Nameword frontend/backend agent)
**Date:** 2026‑09‑25
**For:** The reseller‑API team / agent that maintains the Nomadly reseller API
**Scope:** Server‑side reseller‑API changes ONLY (client app is not the problem here).

## Context
Nameword proxies the Nomadly reseller API for domains + cPanel hosting + VPS/RDP. A real
customer bought a **domain + cPanel hosting plan together**, but the website does not load.
Investigating end‑to‑end surfaced several reseller‑API gaps that prevent
"buy domain + hosting → site is live" from working without manual intervention.

**Account under test (live):**
- Domain: `namewords.sbs` (registrar OpenProvider, `ns_choice: cloudflare`, status `active`)
- cPanel user: `namea3a5`, plan `Premium Anti-Red (1-Week)` ($30), server IP `68.183.77.106`
- Panel: `https://panel.1.hostbay.io`
- Zone NS (Cloudflare): `leanna.ns.cloudflare.com`, `anderson.ns.cloudflare.com`

All requests below go through Nameword's backend proxy
`/api/v1/reseller/...` → Nomadly. Auth is the reseller API key (server side).

---

## GAP 1 — Provisioning does NOT auto‑create the web DNS records  **[SEV: CRITICAL]**
When a hosting plan is provisioned with a domain, the domain's Cloudflare zone is left with
**only NS records** — there is no `A`/`CNAME` pointing the site at the hosting server. So even a
fully healthy, active account will never resolve to the server.

**Repro — the zone right after provisioning:**
```
GET /dns/namewords.sbs/records
→ {
    "domain": "namewords.sbs",
    "records": [
      { "recordType":"NS", "recordContent":"leanna.ns.cloudflare.com",   "recordName":"namewords.sbs", "isNameserver":true },
      { "recordType":"NS", "recordContent":"anderson.ns.cloudflare.com", "recordName":"namewords.sbs", "isNameserver":true }
    ],
    "source": "cloudflare"
  }
```
No `A @ → 68.183.77.106`, no `www`.

**Expected:** On hosting provisioning (and on addon‑domain attach), the API should
automatically create the web records that match the vhost:
- `A  @   → <server_ip>`
- `A  www → <server_ip>`  (or `CNAME www → @`)
and bind the cPanel vhost/docroot. The buyer should not have to add DNS by hand.

---

## GAP 2 — `POST /dns/:domain/records` cannot create an apex (root) record + double‑appends the domain  **[SEV: HIGH]**
Adding a sub‑label works, but the apex is impossible and the name normalization is buggy.

**Works (sub‑label):**
```
POST /dns/namewords.sbs/records   {"type":"A","name":"www","value":"68.183.77.106","ttl":1}
→ 200  detail.record.name = "www.namewords.sbs"   ✅
```

**Apex with `@` — fails:**
```
POST /dns/namewords.sbs/records   {"type":"A","name":"@","value":"68.183.77.106","ttl":1}
→ 502  {"error":"dns_add_failed"}   (returns in ~0.3s, i.e. provider rejected it, not a timeout)
```

**Apex with empty name — fails:**
```
POST /dns/namewords.sbs/records   {"type":"A","name":"","value":"68.183.77.106","ttl":1}
→ 502  {"error":"dns_add_failed"}
```

**Apex with the bare domain — DOUBLE‑APPENDS (creates a broken record):**
```
POST /dns/namewords.sbs/records   {"type":"A","name":"namewords.sbs","value":"68.183.77.106","ttl":1}
→ 200 but detail.record.name = "namewords.sbs.namewords.sbs"   ❌ (junk; had to delete it)
```

**Expected:**
- Accept `@`, empty string, or the bare zone apex as the root and create a real apex record
  (apex `A`, or Cloudflare CNAME‑flattening).
- Normalize names so a fully‑qualified name (`www.namewords.sbs` or `namewords.sbs`) is NOT
  re‑suffixed with the domain. `name` should be interpreted as: `@`/empty/domain → apex;
  `label` → `label.domain`; `label.domain` → used as‑is.

---

## GAP 3 — cPanel session SSO returns an HTML login page (`CPANEL_AUTH_FAILURE`)  **[SEV: HIGH]**
Every cPanel‑SESSION endpoint fails; the WHM→cPanel single sign‑on returns an HTML login page
instead of a JSON session/token. This blocks the domains list, docroot read, File Manager, SSL,
disk stats — i.e. most "manage my hosting" features.

**Repro (fails):**
```
GET /hosting/namea3a5/domains
→ { "status":0, "errors":["<!DOCTYPE html> ...login page..."], "data":null,
    "httpStatus":401, "code":"CPANEL_AUTH_FAILURE" }
```
Same `CPANEL_AUTH_FAILURE` for File Manager, `/ssl`, disk‑usage stats, per‑domain docroot read.

**Reseller/WHM‑level calls on the SAME key work fine:**
```
GET /hosting/namea3a5/addons              → 200 {"addon_quota":1,"addon_count":0,"addons":[]}
GET /hosting/namea3a5/domains/docroot-modes → 200 {"modes":{},"primary":"namewords.sbs"}
GET /hosting/namea3a5                      → 200 (details, usage, deliverables)
```

**Expected:** Fix the WHM→cPanel SSO so session‑scoped endpoints return JSON. Please verify on an
ACTIVE (non‑suspended) account too — note this account is currently suspended (see Gap 4), which
by itself can break cPanel sessions; but the failure has been consistent, so the SSO path needs
checking independently.

---

## GAP 4 — No hosting renewal endpoint + missing lifecycle/suspension fields  **[SEV: HIGH]**
The account is suspended with `auto_renew:true`, but there is no `renew` endpoint and no way to
tell WHY it is suspended or why auto‑renew didn't run.

**Repro:**
```
GET /hosting/namea3a5
→ { "suspended": true,
    "auto_renew": true,
    "plan": "Premium Anti-Red (1-Week)", "price_usd": 30,
    "created_at": "2026-09-18T16:49:23Z",
    "expires_at": "2026-09-25T16:49:23Z",     // server time was 2026-09-25T08:38Z → suspended BEFORE expiry
    "deliverables": { "server_ip":"68.183.77.106", ... } }
```
Wallet balance is `$10`, plan renews at `$30`, and there is no renewal transaction since the
original purchase — so auto‑renew almost certainly failed on insufficient funds, but nothing in
the payload says so. Also the account is `suspended` ~8h BEFORE its own `expires_at`, with no reason.

**Available hosting endpoints today:** `suspend`, `unsuspend`, `upgrade`, `login`, `credentials`,
`addons`, `terminate`, `GET details`. **There is no `renew`.**

**Expected:**
- `POST /hosting/:user/renew` — wallet‑billed, same plan, extends the term (parallel to the RDP
  `POST /rdp/:id/renew` that already exists).
- Add to `GET /hosting/:user`: `suspended_reason`, `suspended_at`, and an auto‑renew status
  (e.g. `auto_renew_last_error: "insufficient_funds"`, `auto_renew_next_attempt_at`).

---

## GAP 5 — `GET /domains` reports empty nameservers while the zone is delegated  **[SEV: LOW]**
```
GET /domains
→ { "domains":[ { "domain":"namewords.sbs", "registrar":"OpenProvider",
     "ns_choice":"cloudflare", "nameservers": [],   // ← empty
     "status":"active", ... } ] }
```
But the zone IS delegated to Cloudflare NS (see Gap 1 response) and `GET /hosting/:user`
`deliverables.nameservers` correctly lists `anderson/leanna.ns.cloudflare.com`.

**Expected:** `GET /domains[].nameservers` should report the actual delegated nameservers so the
UI/user has one consistent source of truth.

---

## Suggested priority
1. **Gap 1** (auto‑create web DNS on provisioning) — without this, "buy → live" can never work.
2. **Gap 2** (apex record add + name normalization) — needed so the root domain can point to the server.
3. **Gap 3** (cPanel session SSO) — needed for all in‑panel management.
4. **Gap 4** (renew endpoint + suspension/auto‑renew reason fields).
5. **Gap 5** (consistent NS reporting).

## End‑to‑end acceptance test the reseller API should pass
1. Register a domain + buy a cPanel plan on it in one flow (wallet‑billed).
2. Immediately: `GET /dns/:domain/records` shows `A @` and `A www` → server IP (Gap 1).
3. `GET /hosting/:user/domains` returns JSON (no `CPANEL_AUTH_FAILURE`) with the primary domain (Gap 3).
4. The domain serves the cPanel default page over HTTP within a few minutes.
5. `POST /hosting/:user/renew` extends the term and lifts suspension when funded (Gap 4).

## Live delete+recreate re‑test — currently BLOCKED
We considered `DELETE /hosting/:user` then re‑buying on the same domain to prove end‑to‑end.
Blocked because the re‑purchase is wallet‑billed at **$30** and the wallet holds **$10**; also it is
destructive on a live, already‑paid account, and would simply re‑hit Gaps 1–3. To run it: top up
the wallet to ≥ $30, then terminate + re‑provision and re‑check steps 2–4 above.
