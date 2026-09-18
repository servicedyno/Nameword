# Plan: Turn Nameword into an app-deployment platform (a "Railway for offshore/crypto")

## The short answer
Yes, it is achievable — but "becoming Railway" is not one feature, it's a new product line.
Railway is a developer platform where you connect a code repo and it builds and runs your
app, with databases, logs, and usage billing. Nameword today sells the *ingredients*
(domains, DNS, VPS, RDP, cPanel hosting) and a crypto wallet — it does not yet run
customers' applications for them.

The fastest credible path is **not** to rebuild Railway from scratch. It is to add a
"Deploy your app" product on top of the infrastructure Nameword already resells, using a
proven deploy engine underneath, and wrap it in Nameword's own dashboard, wallet billing,
and domains. That is the approach this plan recommends, and the first phase is scoped to be
shippable rather than a multi-year platform build.

## What Railway offers that Nameword does not have today (the gap)
- **Deploy from a Git repo** — connect GitHub, auto-detect the language, build a container, run it. (Core of Railway.)
- **Managed databases in one click** — Postgres, MySQL, Redis, MongoDB, with automatic backups.
- **Environment variables / secrets** managed per app and per environment.
- **Automatic HTTPS + app URLs + custom domains** (Nameword has a head start here — see advantages).
- **Live logs, metrics, deploy history, one-click rollback, health checks / zero-downtime deploys.**
- **Background workers and scheduled (cron) jobs.**
- **Persistent volumes** for apps that store files/data.
- **Private networking** so a customer's services talk to each other securely.
- **Preview environments** spun up per pull request and torn down on merge.
- **Usage-based billing** (per-second CPU/RAM/storage/egress) plus a small flat plan.
- **CLI, public API, and a template/marketplace** of one-click starter apps.
- **Teams / roles** so multiple people manage the same project.

## What Nameword already has that makes this realistic (advantages)
- **Domains + DNS** — Railway makes you bring or buy a domain elsewhere; Nameword can bundle a
  free domain/subdomain and auto-wire it to the deployed app. This is a genuine edge.
- **Crypto prepaid wallet + rewards/referrals** — billing rails already exist.
- **VPS / RDP / cPanel supply** through the existing provider — the compute to run apps.
- **Accounts, auth, dashboard, checkout** already built.
- **Offshore / privacy-first / DMCA-resilient positioning** — a differentiated angle Railway
  deliberately does not occupy.

## Recommended approach (the main thing to approve)
**Approach A — "Managed Deploy Box" (recommended for the first release).**
When a customer buys a "Deploy" plan, Nameword provisions an isolated server for them (using
the VPS supply it already resells) and installs a mature open-source deploy engine on it
(**Coolify** — the leading open-source, permissively licensed Railway-style engine: Git deploy,
auto-build, one-click databases, auto-HTTPS, logs). Nameword's own branded dashboard talks to
that engine's API so the customer never sees the raw tooling; Nameword handles the wallet
billing, plan tiers, and automatic domain/DNS wiring on top.

- **Pros:** reuses Nameword's existing VPS + domains + wallet; ships in a reasonable timeframe;
  each customer is fully isolated on their own box, which fits the offshore/privacy story well.
- **Cons:** billing is per-box (a plan tier), not true per-second like Railway; each customer
  needs a small dedicated server (there is a minimum size), so it is less "serverless" than Railway.

**Approach B — In-house multi-tenant platform (deferred / long-term).**
Build Nameword's own orchestration so many customers' apps share pooled capacity with true
per-second metered billing, autoscaling, and private networking — i.e. a real Railway clone.
This is a large, ongoing platform-engineering program and is proposed only as a later evolution,
not the first release.

**Recommendation:** start with Approach A, keep Approach B as the long-term direction if the
product gains traction. The decision to challenge here is A vs. B for the first release.

## Chosen engine (Approach A)
**Coolify** is recommended over the alternatives:
- *Dokploy* — good, but part of it is under a source-available license that needs a commercial
  agreement for production resale; avoid for a paid product for now.
- *CapRover* — stable and light, but a dated experience and weaker feature set.
- *Coolify* — most Railway-like feature set (Git deploy, 280+ one-click services/databases,
  auto-HTTPS, teams, API, S3 backups), permissive license suitable for resale.

## Proposed phases
**Phase 1 — MVP: "Deploy from GitHub" (this is what approval unlocks first)**
- Customer connects a GitHub repo; Nameword builds and runs it as a web service on their deploy box.
- Automatic HTTPS and a free `*.nameword` app URL, or point one of their Nameword domains at it.
- Environment variables/secrets, live build + run logs, redeploy and rollback.
- One managed database (Postgres) attachable to the app.
- Sold as fixed monthly plan tiers, paid from the existing crypto wallet.

**Phase 2 — Depth**
- More managed databases (MySQL, Redis, MongoDB) with scheduled backups.
- Custom domains at scale, background workers, cron jobs, persistent volumes.
- Auto-deploy on every push, and inviting team members to a project.

**Phase 3 — Platform polish**
- Usage-based/metered billing, preview environments per pull request, private networking between
  a project's services, a one-click template gallery, and a CLI + public API.

**Phase 4 — Optional, large**
- In-house multi-tenant orchestrator (Approach B) for true per-second billing and pooled capacity.

## Pricing / billing decisions (please confirm)
- **Phase 1 billing model:** fixed plan tiers (e.g. Starter / Pro / Scale) mapped to deploy-box
  sizes, billed monthly from the crypto wallet, with current rewards/referrals still applying.
  True metered/per-second billing is deferred to Phase 3.
- **Margin note:** each deploy box has an underlying compute cost from the provider, so plan
  prices must sit above that cost. Exact numbers to be set before launch.

## Positioning decision (please confirm)
- Keep the **offshore / privacy-first / DMCA-resilient, crypto-native** identity as the wedge
  against Railway, and bundle a **free domain or subdomain** with every deploy plan.

## Assumptions being made (challenge any of these)
1. First release uses Approach A (managed deploy box + Coolify), not an in-house orchestrator.
2. Engine is Coolify (permissive license, resale-friendly).
3. Phase 1 is a single web service + one Postgres database per project — not the full Railway
   feature set at once.
4. Billing in Phase 1 is fixed plan tiers from the crypto wallet; metered billing comes later.
5. GitHub is the first (and Phase-1-only) source for code; other Git providers/Docker images come later.
6. Target customer is developers/small teams who want privacy-friendly, crypto-paid app hosting.

## Explicitly out of scope for the first release
Metered per-second billing, multi-tenant pooled infrastructure, preview environments, CLI,
public API, template marketplace, non-GitHub sources, and autoscaling.

## What is required from you before/around launch
- Confirmation of Approach A vs. B, and the positioning/pricing direction above.
- A GitHub connection (OAuth app) so customers can link repositories — set up during the build.
- Enough provider wallet balance / live provisioning enabled to actually create deploy boxes
  (note: the underlying provider is currently in test mode; real deploys need live mode + funds).
