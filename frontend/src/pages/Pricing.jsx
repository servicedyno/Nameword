import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import MainLayout from "../layouts/MainLayout";
import { SectionHeading, CtaBand, PricingTiers } from "../components/marketing/marketing-ui";
import resellerAPI from "../api/reseller";
import {
  LuSearch,
  LuGlobe,
  LuServer,
  LuMonitor,
  LuShieldCheck,
  LuArrowRight,
} from "react-icons/lu";

const money = (n) =>
  n === null || n === undefined || isNaN(Number(n)) ? "—" : `$${Number(n).toFixed(2)}`;

// Representative hosting tiers (provider not connected in this environment).
const HOSTING_MONTHLY = [
  { name: "Starter", desc: "For a first website", price: 2.99, features: ["1 website", "10 GB NVMe storage", "Free SSL", "Unmetered bandwidth", "Weekly backups"] },
  { name: "Business", desc: "For growing sites", price: 5.99, highlighted: true, features: ["50 websites", "100 GB NVMe storage", "Free SSL + CDN", "Free domain (1 yr)", "Daily backups", "cPanel & email"] },
  { name: "Pro", desc: "For high traffic", price: 11.99, features: ["Unlimited websites", "200 GB NVMe storage", "Free SSL + CDN", "Priority support", "Daily backups", "Staging & Git"] },
];

function BillingToggle({ cycle, setCycle }) {
  return (
    <div className="mb-10 flex items-center justify-center gap-3">
      <div className="inline-flex rounded-full border border-line bg-white p-1 dark:border-gray-800 dark:bg-gray-900">
        <button
          onClick={() => setCycle("monthly")}
          className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
            cycle === "monthly"
              ? "bg-brand text-white shadow-sm"
              : "text-ink-soft hover:text-primary dark:text-gray-400 dark:hover:text-white"
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setCycle("annual")}
          className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
            cycle === "annual"
              ? "bg-brand text-white shadow-sm"
              : "text-ink-soft hover:text-primary dark:text-gray-400 dark:hover:text-white"
          }`}
        >
          Annual
          <span
            className={`nw-badge ${
              cycle === "annual"
                ? "bg-white/20 text-white"
                : "bg-accent-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
            }`}
          >
            2 months free
          </span>
        </button>
      </div>
    </div>
  );
}

// Turns a monthly price + billing cycle into tier props for <PricingTiers/>.
function toTiers(items, cycle, { unit = "/mo", ctaTo = "/create-account", cta = "Get started" } = {}) {
  return items.map((it) => {
    const monthly = Number(it.price) || 0;
    const isAnnual = cycle === "annual";
    // Annual = 10x monthly (2 months free); shown as effective per-month price.
    const effective = isAnnual ? (monthly * 10) / 12 : monthly;
    return {
      name: it.name,
      desc: it.desc,
      price: money(effective),
      period: unit,
      highlighted: it.highlighted,
      features: isAnnual ? [...it.features, `Billed yearly (${money(monthly * 10)}/yr)`] : it.features,
      cta: it.cta || cta,
      to: it.to || ctaTo,
    };
  });
}

export default function Pricing() {
  const navigate = useNavigate();
  const [cycle, setCycle] = useState("annual");

  const [tldRows, setTldRows] = useState([]);
  const [tldLoading, setTldLoading] = useState(true);
  const [vps, setVps] = useState([]);
  const [rdp, setRdp] = useState([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let alive = true;
    // Random, unlikely-to-be-taken/premium label so we get real base TLD prices.
    const sampleLabel = `nw${Math.random().toString(36).slice(2, 9)}`;
    (async () => {
      try {
        const data = await resellerAPI.suggestDomains(sampleLabel);
        if (!alive) return;
        const rows = (data?.suggestions || [])
          .filter((s) => s?.available && Number(s.price_usd) > 0)
          .map((s) => ({
            tld: `.${String(s.domain || "").split(".").slice(1).join(".")}`,
            price: s.price_usd,
            registrar: s.registrar,
          }));
        setTldRows(rows);
      } catch {
        setTldRows([]);
      } finally {
        if (alive) setTldLoading(false);
      }
    })();

    (async () => {
      try {
        const d = await resellerAPI.getVpsPlans("EU");
        if (alive) setVps(Array.isArray(d?.plans) ? d.plans : []);
      } catch {
        if (alive) setVps([]);
      }
    })();

    (async () => {
      try {
        const d = await resellerAPI.getRdpPlans("EU");
        if (alive) setRdp(Array.isArray(d?.plans) ? d.plans : []);
      } catch {
        if (alive) setRdp([]);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const vpsTiers = useMemo(
    () =>
      toTiers(
        vps.slice(0, 3).map((p, i) => ({
          name: p.name || p.plan_id,
          desc: `${p.vcpus ?? "—"} vCPU · ${p.ram_gb ?? "—"} GB RAM · ${p.disk_gb ?? "—"} GB SSD`,
          price: p.price_usd,
          highlighted: i === 1,
          features: [
            `${p.vcpus ?? "—"} vCPU cores`,
            `${p.ram_gb ?? "—"} GB RAM`,
            `${p.disk_gb ?? "—"} GB NVMe SSD`,
            "Full root access",
            "EU & SG regions",
          ],
          cta: "Deploy VPS",
          to: "/vps",
        })),
        cycle
      ),
    [vps, cycle]
  );

  const rdpTiers = useMemo(
    () =>
      toTiers(
        rdp.slice(0, 3).map((p, i) => ({
          name: p.name || p.plan_id,
          desc: `${p.vcpus ?? "—"} vCPU · ${p.ram_gb ?? "—"} GB RAM · ${p.disk_gb ?? "—"} GB SSD`,
          price: p.price_usd,
          highlighted: i === 1,
          features: [
            `${p.vcpus ?? "—"} vCPU cores`,
            `${p.ram_gb ?? "—"} GB RAM`,
            `${p.disk_gb ?? "—"} GB SSD`,
            "Windows desktop",
            "Remote from anywhere",
          ],
          cta: "Deploy RDP",
          to: "/rdp",
        })),
        cycle
      ),
    [rdp, cycle]
  );

  const hostingTiers = useMemo(
    () => toTiers(HOSTING_MONTHLY, cycle, { cta: "Choose plan", ctaTo: "/hosting" }),
    [cycle]
  );

  const onSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (q) navigate(`/domain?value=${encodeURIComponent(q)}`);
  };

  return (
    <MainLayout fluid>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line bg-gradient-to-b from-brand-50/60 via-white to-white dark:border-gray-800 dark:from-gray-900 dark:via-gray-950 dark:to-gray-950">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-brand-200/40 blur-3xl dark:bg-brand/10" />
        <div className="nw-container relative py-14 text-center sm:py-20">
          <span className="nw-eyebrow mb-4">Transparent pricing</span>
          <h1 className="text-4xl font-bold tracking-tight text-primary dark:text-white sm:text-5xl">
            Simple, honest pricing
          </h1>
          <p className="mx-auto mt-4 max-w-2xl nw-lead">
            No hidden fees. Renewal prices shown upfront. Domains, hosting, VPS and RDP — all in one place.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            <span className="nw-chip"><LuShieldCheck className="h-4 w-4 text-brand" /> Free WHOIS privacy</span>
            <span className="nw-chip"><LuGlobe className="h-4 w-4 text-brand" /> Free DNS</span>
            <span className="nw-chip"><LuArrowRight className="h-4 w-4 text-brand" /> No lock-in</span>
          </div>
        </div>
      </section>

      {/* Domain TLD pricing */}
      <section className="nw-section">
        <div className="nw-container">
          <SectionHeading
            eyebrow="Domains"
            title="Domain name pricing"
            subtitle="Live registration prices across popular extensions. Renewal is shown upfront — no surprises."
          />

          <form onSubmit={onSearch} className="mx-auto mt-8 flex max-w-xl items-center gap-3">
            <div className="relative flex-1">
              <LuSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find your domain, e.g. mybrand.com"
                className="nw-input pl-11"
              />
            </div>
            <button type="submit" className="nw-btn-primary">Search</button>
          </form>

          <div className="mx-auto mt-10 max-w-4xl overflow-hidden rounded-2xl border border-line dark:border-gray-800">
            <table className="w-full text-left">
              <thead className="bg-surface-2 dark:bg-gray-900/60">
                <tr className="text-13 font-semibold uppercase tracking-wide text-ink-soft dark:text-gray-400">
                  <th className="px-5 py-3.5">Extension</th>
                  <th className="px-5 py-3.5">Register</th>
                  <th className="px-5 py-3.5 hidden sm:table-cell">Renew</th>
                  <th className="px-5 py-3.5 hidden sm:table-cell">Transfer</th>
                  <th className="px-5 py-3.5 text-right">&nbsp;</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line dark:divide-gray-800">
                {tldLoading ? (
                  [0, 1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-5 py-4" colSpan={5}>
                        <div className="h-4 w-full rounded bg-lightgray dark:bg-gray-800" />
                      </td>
                    </tr>
                  ))
                ) : tldRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-ink-soft dark:text-gray-400">
                      Live domain pricing is temporarily unavailable. Please try the search above.
                    </td>
                  </tr>
                ) : (
                  tldRows.map((r) => (
                    <tr key={r.tld} className="text-15 hover:bg-surface-2/70 dark:hover:bg-gray-900/40">
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-2 font-semibold text-primary dark:text-white">
                          <LuGlobe className="h-4 w-4 text-brand" /> {r.tld}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-bold text-brand dark:text-brand-300">{money(r.price)}</td>
                      <td className="px-5 py-4 hidden sm:table-cell text-ink-soft dark:text-gray-400">{money(r.price)}/yr</td>
                      <td className="px-5 py-4 hidden sm:table-cell text-ink-soft dark:text-gray-400">{money(r.price)}</td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => navigate(`/domain?value=${encodeURIComponent(`yourbrand${r.tld}`)}`)}
                          className="nw-btn-secondary nw-btn-sm"
                        >
                          Check
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="mx-auto mt-4 max-w-4xl text-center text-13 text-ink-soft dark:text-gray-500">
            Prices are per year in USD and include free DNS management and WHOIS privacy where supported.
          </p>
        </div>
      </section>

      {/* Hosting / VPS / RDP tiers with billing toggle */}
      <section className="nw-section bg-surface-2 dark:bg-gray-900/40">
        <div className="nw-container">
          <SectionHeading
            eyebrow="Hosting, VPS & RDP"
            title="Plans for every stage"
            subtitle="Switch to annual billing and get two months free on hosting, VPS and RDP."
          />
          <div className="mt-10">
            <BillingToggle cycle={cycle} setCycle={setCycle} />
          </div>

          <div className="mb-4 flex items-center gap-2 text-lg font-bold text-primary dark:text-white">
            <LuShieldCheck className="h-5 w-5 text-brand" /> Web Hosting
          </div>
          <PricingTiers tiers={hostingTiers} />

          <div className="mt-16 mb-4 flex items-center gap-2 text-lg font-bold text-primary dark:text-white">
            <LuServer className="h-5 w-5 text-brand" /> Linux VPS
          </div>
          {vpsTiers.length ? (
            <PricingTiers tiers={vpsTiers} />
          ) : (
            <p className="rounded-2xl border border-dashed border-line bg-white py-10 text-center text-ink-soft dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
              Loading live VPS plans…
            </p>
          )}

          <div className="mt-16 mb-4 flex items-center gap-2 text-lg font-bold text-primary dark:text-white">
            <LuMonitor className="h-5 w-5 text-brand" /> Windows RDP
          </div>
          {rdpTiers.length ? (
            <PricingTiers tiers={rdpTiers} />
          ) : (
            <p className="rounded-2xl border border-dashed border-line bg-white py-10 text-center text-ink-soft dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
              Loading live RDP plans…
            </p>
          )}
        </div>
      </section>

      <CtaBand
        title="Ready to get online?"
        subtitle="Grab your domain, add hosting and deploy a server — all from one dashboard."
        primaryTo="/create-account"
        primaryLabel="Create account"
        secondaryTo="/domain?value=yourbrand.com"
        secondaryLabel="Search a domain"
      />
    </MainLayout>
  );
}
