# cPanel Advanced-Function Diagnostic — Reseller Provider Gap Report

An exhaustive, live functional test of every advanced cPanel capability the reseller API exposes, run against the real namewords.sbs / namea3a5 account. It produces one written report that marks each function PASS / FAIL / NEEDS-PROVIDER-FIX with the exact request and response, ready to hand to the reseller API provider.

## Who it's for
- The Nameword team, to know precisely which panel features actually work today versus which only appear to.
- The reseller API provider, to receive a reproducible, function-by-function list of what to fix on their end (starting with the Security "application not found" errors).

## Core features and experience
Every advanced-panel function is exercised for real and given a verdict. Coverage:

- **Account / lifecycle**: account details, site-status, suspend, unsuspend, upgrade, credentials/login.
- **Domains**: list, add addon domain, delete addon, set-primary (promote addon to primary), document root + docroot modes, nameserver status.
- **Subdomains**: list, create, delete, bulk-create — including verifying a created subdomain actually appears/resolves, not just that the call returned success.
- **MySQL**: create/list/delete database, create/delete user, set password, grant/revoke privileges, remote hosts, phpMyAdmin link, rename/repair/check.
- **Email mailboxes**: list, create, change password, delete, and a real test-send.
- **SSL**: certificate status and AutoSSL issuance.
- **Files**: list, read, write/save, mkdir, rename, copy, move, compress, extract/unzip, delete, upload.
- **Security**: status, Anti-Red deploy + status, Anti-Bot + rules, Safe-Browsing, Blacklist, Visitor-CAPTCHA, JS-Challenge (these are where "application not found" currently appears).
- **Geo & Analytics & Stats**: geo controls, analytics, usage stats.

For each function the report records: the exact request, the exact response (and timing), a verdict badge — **PASS** (works end to end), **FAIL** (errors / "application not found"), or **NEEDS-PROVIDER-FIX** (returns success but the change doesn't actually take effect) — a plain-language note, and a suggested action for the provider. Where a function creates something, a create → verify → clean-up cycle is run so the outcome is confirmed rather than assumed. Side-effecting actions (change-primary-domain, AutoSSL issuance, real test-send email) are included per the agreed decision, even where not fully reversible.

The report opens with a one-glance summary matrix (function × verdict) and an executive summary that groups systemic gaps — for example, if all Security apps return "application not found", that is flagged as a single likely root cause (the security-app suite not provisioned for this plan/account) rather than as many unrelated failures.

## User flow
1. Target is fixed to namewords.sbs (cPanel user namea3a5).
2. The sweep runs function families in a safe order: read-only checks first, then create → verify → clean-up cycles, then the irreversible/side-effecting actions last.
3. Each call's request, response and timing are captured verbatim.
4. Verdicts are assigned and systemic patterns grouped.
5. A single report document is produced: the team reads the matrix; the provider-facing detail section can be sent to the reseller API provider as-is.

## UI/UX feel
A clean, skimmable technical report (Markdown). Top: a summary matrix with verdict badges. Then one section per function family, each showing the request, the response, the verdict, and the recommended provider fix. Neutral and reproducible in tone — anyone can re-run the same calls and get the same evidence. No app screens or UI are added.

## Implementation phases
- **Phase 1 — MVP (built now):** Run the full live sweep against namea3a5, including the side-effecting actions, and deliver the written gap report (summary matrix + per-function request/response/verdict + provider recommendations).
- **Phase 2 — Re-test / delta report (later):** After the provider ships fixes, re-run the identical sweep and produce a delta report showing what changed (fixed / still broken / newly broken).
- **Phase 3 — Reusable diagnostics tool (later):** The optional in-app Admin "cPanel Diagnostics" runner that executes the sweep on demand against any account/plan and keeps a history — deferred here since the current deliverable is a report only.

## Assumptions
- **Target account:** namewords.sbs / namea3a5, which is on the premium-weekly plan. If the weekly plan gates certain functions (e.g. MySQL has previously required a Gold/monthly plan), those are reported as "plan-gated — cannot verify on this account" rather than FAIL, with a note that a Gold account would be needed to fully verify them.
- **Account state:** If namea3a5 is currently suspended, most cPanel-session functions will return a session/auth failure. The sweep will attempt unsuspend first (itself one of the tested functions); if it cannot be made active, the report will state that a live/active account is required for meaningful per-function coverage.
- **"Include everything" = real, possibly permanent changes.** Clean-up will be attempted for created resources (subdomains, databases, mailboxes, files), but change-primary-domain and AutoSSL issuance may not be fully reversible; this is accepted.
- **Test-send recipient:** since no external recipient was given, the real test email will be sent to a mailbox on the account's own domain (created during the email test) or to the account owner's address on file (moxxcompany@gmail.com), to avoid emailing an uninvolved third party.
- **Deliverable is a document only** — no application feature, endpoint, or UI is built in Phase 1.
- **Results reflect the provider's behavior for this account at test time**, exercised through the reseller API exactly as the app integrates it today.
