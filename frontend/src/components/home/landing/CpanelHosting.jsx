import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { LuArrowRight, LuCheck } from "react-icons/lu";
import { useLanguage } from "../../../hooks/useLanguage";
import { resellerAPI } from "../../../api/reseller";
import Reveal from "./Reveal";

// Safe fallback (mirrors live /hosting/plans) if the lookup is slow / fails.
const FALLBACK = [
  { plan_id: "premium-weekly", name: "Premium Anti-Red (1-Week)", tier: "premium", price_usd: 30, duration_days: 7, features: ["Anti-Red protection", "1 addon domain", "HostPanel + File Manager", "7 days"] },
  { plan_id: "premium-monthly", name: "Premium Anti-Red HostPanel (1-Month)", tier: "premium", price_usd: 75, duration_days: 30, features: ["Anti-Red protection", "5 addon domains", "MySQL databases", "30 days"] },
  { plan_id: "golden-monthly", name: "Golden Anti-Red HostPanel (1-Month)", tier: "gold", price_usd: 100, duration_days: 30, features: ["Anti-Red protection", "Unlimited addon domains", "Visitor Captcha + Geo", "30 days"] },
];

const period = (days) => (Number(days) === 7 ? "/wk" : Number(days) >= 28 ? "/mo" : `/${days}d`);

export default function CpanelHosting() {
  const { t } = useLanguage();
  const s = t.site.home.servers.hosting;
  const navigate = useNavigate();
  const [plans, setPlans] = useState(null); // null = loading

  useEffect(() => {
    let alive = true;
    resellerAPI
      .getHostingPlans()
      .then((data) => {
        if (!alive) return;
        setPlans(Array.isArray(data?.plans) && data.plans.length ? data.plans : FALLBACK);
      })
      .catch(() => alive && setPlans(FALLBACK));
    return () => {
      alive = false;
    };
  }, []);

  const list = plans || [];
  const popularIndex = Math.max(0, list.findIndex((p) => p.tier === "gold"));

  return (
    <section id="hosting-plans" className="nw-section scroll-mt-20">
      <div className="nw-container">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <span className="nw-kicker mb-3">{s.kicker}</span>
            <h2 className="nw-h2">{s.title}</h2>
            <p className="nw-lead mt-3">{s.lead}</p>
          </div>
          <button onClick={() => navigate("/hosting")} className="nw-btn-secondary" data-testid="hosting-view-all">
            {s.cta} <LuArrowRight className="h-4 w-4" />
          </button>
        </Reveal>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {plans === null
            ? Array.from({ length: 3 }).map((_, i) => <HostingSkeleton key={i} />)
            : list.map((p, i) => {
                const popular = i === popularIndex;
                return (
                  <Reveal key={p.plan_id} delay={(i % 3) * 0.06} className="flex">
                    <div
                      className={`relative flex h-full w-full flex-col rounded-2xl bg-white p-6 transition-all dark:bg-gray-900 ${
                        popular
                          ? "border-2 border-brand-500 shadow-lg shadow-brand-500/10 dark:border-brand-500"
                          : "border border-line hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg dark:border-white/[0.07]"
                      }`}
                      data-testid={`hosting-card-${i}`}
                    >
                      {popular && (
                        <span className="absolute -top-3 left-6 rounded-full bg-brand-600 px-3 py-1 text-[11px] font-semibold text-white shadow-sm">{s.popular}</span>
                      )}
                      <span className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${p.tier === "gold" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" : "bg-brand-50 text-brand-700 dark:bg-brand/15 dark:text-brand-200"}`}>{p.tier || "hosting"}</span>
                      <h3 className="mt-3 text-base font-bold text-primary dark:text-white">{p.name}</h3>
                      <div className="mt-2 flex items-end gap-1">
                        <span className="font-display text-3xl font-bold tracking-tight text-primary dark:text-white">${Math.round(Number(p.price_usd))}</span>
                        <span className="pb-1 text-sm text-ink-soft dark:text-gray-400">{period(p.duration_days)}</span>
                      </div>
                      <ul className="mt-5 flex-1 space-y-2.5 border-t border-line pt-5 text-sm dark:border-white/[0.06]">
                        {(p.features || []).map((f) => (
                          <li key={f} className="flex items-start gap-2">
                            <LuCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-300" />
                            <span className="text-ink-soft dark:text-gray-300">{f}</span>
                          </li>
                        ))}
                      </ul>
                      <button
                        onClick={() => navigate("/hosting")}
                        data-testid={`hosting-get-${i}`}
                        className={`mt-6 w-full ${popular ? "nw-btn-primary" : "nw-btn-secondary"}`}
                      >
                        {s.cta}
                      </button>
                    </div>
                  </Reveal>
                );
              })}
        </div>
      </div>
    </section>
  );
}

function HostingSkeleton() {
  return (
    <div className="rounded-2xl border border-line bg-white p-6 dark:border-white/[0.07] dark:bg-gray-900">
      <div className="h-4 w-20 animate-pulse rounded bg-surface-3 dark:bg-white/[0.06]" />
      <div className="mt-4 h-8 w-28 animate-pulse rounded bg-surface-3 dark:bg-white/[0.06]" />
      <div className="mt-6 space-y-3 border-t border-line pt-5 dark:border-white/[0.06]">
        <div className="h-3 w-full animate-pulse rounded bg-surface-3 dark:bg-white/[0.06]" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-surface-3 dark:bg-white/[0.06]" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-surface-3 dark:bg-white/[0.06]" />
      </div>
      <div className="mt-6 h-10 w-full animate-pulse rounded-lg bg-surface-3 dark:bg-white/[0.06]" />
    </div>
  );
}
