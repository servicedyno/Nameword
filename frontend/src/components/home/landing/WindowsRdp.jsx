import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { LuArrowRight, LuCheck } from "react-icons/lu";
import { useLanguage } from "../../../hooks/useLanguage";
import { resellerAPI } from "../../../api/reseller";
import Reveal from "./Reveal";
import ServerPlanCard, { ServerPlanSkeleton } from "./ServerPlanCard";

// Safe fallback (1-month price per tier) if the live lookup is slow / fails.
const FALLBACK = [
  { plan_id: "standard-1m", name: "Standard", vcpus: 2, ram_gb: 4, disk_gb: 80, price_usd: 56 },
  { plan_id: "pro-1m", name: "Pro", vcpus: 4, ram_gb: 8, disk_gb: 160, price_usd: 112 },
  { plan_id: "power-1m", name: "Power", vcpus: 8, ram_gb: 16, disk_gb: 320, price_usd: 224 },
];

const tierName = (raw) => String(raw || "").split("\u2014")[0].split("-")[0].trim() || String(raw || "");

export default function WindowsRdp() {
  const { t } = useLanguage();
  const sv = t.site.home.servers;
  const s = sv.rdp;
  const navigate = useNavigate();
  const [plans, setPlans] = useState(null); // null = loading

  useEffect(() => {
    let alive = true;
    resellerAPI
      .getRdpPlans("EU")
      .then((data) => {
        if (!alive) return;
        const raw = Array.isArray(data?.plans) ? data.plans : [];
        // One card per tier: prefer the 1-month variant.
        const oneMonth = raw.filter((p) => Number(p.duration_months) === 1);
        const chosen = (oneMonth.length ? oneMonth : raw).map((p) => ({ ...p, tier: tierName(p.name || p.plan_id) }));
        setPlans(chosen.length ? chosen : FALLBACK);
      })
      .catch(() => alive && setPlans(FALLBACK));
    return () => {
      alive = false;
    };
  }, []);

  const list = plans || [];
  const popularIndex = list.length >= 3 ? 1 : Math.floor(list.length / 2);

  return (
    <section id="rdp" className="nw-section scroll-mt-20 bg-surface-2 dark:bg-gray-900/40">
      <div className="nw-container">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <span className="nw-kicker mb-3">{s.kicker}</span>
            <h2 className="nw-h2">{s.title}</h2>
            <p className="nw-lead mt-3">{s.lead}</p>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
              {String(t.site.home.promo.reassure).split(" · ").map((r) => (
                <span key={r} className="flex items-center gap-1.5 text-13 text-ink-soft dark:text-gray-400"><LuCheck className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" /> {r}</span>
              ))}
            </div>
          </div>
          <button onClick={() => navigate("/rdp")} className="nw-btn-secondary" data-testid="rdp-view-all">
            {s.viewAll} <LuArrowRight className="h-4 w-4" />
          </button>
        </Reveal>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {plans === null
            ? Array.from({ length: 3 }).map((_, i) => <ServerPlanSkeleton key={i} />)
            : list.map((p, i) => (
                <Reveal key={p.plan_id || p.tier} delay={(i % 3) * 0.06} className="flex">
                  <ServerPlanCard
                    name={p.tier || p.name || p.plan_id}
                    price={Math.round(Number(p.price_usd))}
                    perMonth={sv.perMonth}
                    popular={i === popularIndex}
                    popularLabel={sv.popular}
                    ctaLabel={s.configure}
                    ctaTestId={`rdp-configure-${i}`}
                    onCta={() => navigate("/rdp")}
                    specs={[
                      { label: "vCPU", value: p.vcpus ?? "\u2014" },
                      { label: "RAM", value: `${p.ram_gb ?? "\u2014"} GB` },
                      { label: "Storage", value: `${p.disk_gb ?? "\u2014"} GB ${p.storage_type || "NVMe SSD"}` },
                      { label: "CPU", value: p.cpu || "AMD" },
                      { label: "Network", value: s.network },
                    ]}
                  />
                </Reveal>
              ))}
        </div>
      </div>
    </section>
  );
}
