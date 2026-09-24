import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { LuArrowRight } from "react-icons/lu";
import { useLanguage } from "../../../hooks/useLanguage";
import { resellerAPI } from "../../../api/reseller";
import Reveal from "./Reveal";
import ServerPlanCard, { ServerPlanSkeleton } from "./ServerPlanCard";

// Safe fallback shown if the live price lookup is slow / fails (mirrors live values).
const FALLBACK = [
  { plan_id: "s-1vcpu-1gb", name: "Cloud VPS 10", vcpus: 1, ram_gb: 1, disk_gb: 25, price_usd: 18 },
  { plan_id: "s-1vcpu-2gb", name: "Cloud VPS 20", vcpus: 1, ram_gb: 2, disk_gb: 50, price_usd: 36 },
  { plan_id: "s-2vcpu-2gb", name: "Cloud VPS 30", vcpus: 2, ram_gb: 2, disk_gb: 60, price_usd: 54 },
  { plan_id: "s-2vcpu-4gb", name: "Cloud VPS 40", vcpus: 2, ram_gb: 4, disk_gb: 80, price_usd: 72 },
  { plan_id: "s-4vcpu-8gb", name: "Cloud VPS 50", vcpus: 4, ram_gb: 8, disk_gb: 160, price_usd: 144 },
  { plan_id: "s-8vcpu-16gb", name: "Cloud VPS 60", vcpus: 8, ram_gb: 16, disk_gb: 320, price_usd: 288 },
];

export default function CloudVps() {
  const { t } = useLanguage();
  const sv = t.site.home.servers;
  const s = sv.vps;
  const navigate = useNavigate();
  const [plans, setPlans] = useState(null); // null = loading

  useEffect(() => {
    let alive = true;
    resellerAPI
      .getVpsPlans("EU")
      .then((data) => {
        if (!alive) return;
        const list = Array.isArray(data?.plans) && data.plans.length ? data.plans : FALLBACK;
        setPlans(list);
      })
      .catch(() => alive && setPlans(FALLBACK));
    return () => {
      alive = false;
    };
  }, []);

  const list = plans || [];
  const popularIndex = list.length >= 4 ? 3 : Math.floor(list.length / 2);

  return (
    <section id="vps" className="nw-section scroll-mt-20">
      <div className="nw-container">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <span className="nw-kicker mb-3">{s.kicker}</span>
            <h2 className="nw-h2">{s.title}</h2>
            <p className="nw-lead mt-3">{s.lead}</p>
          </div>
          <button onClick={() => navigate("/vps")} className="nw-btn-secondary" data-testid="vps-compare-all">
            {s.compare} <LuArrowRight className="h-4 w-4" />
          </button>
        </Reveal>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {plans === null
            ? Array.from({ length: 6 }).map((_, i) => <ServerPlanSkeleton key={i} />)
            : list.map((p, i) => (
                <Reveal key={p.plan_id || p.name} delay={(i % 3) * 0.06} className="flex">
                  <ServerPlanCard
                    name={p.name || p.plan_id}
                    price={Math.round(Number(p.price_usd))}
                    perMonth={sv.perMonth}
                    popular={i === popularIndex}
                    popularLabel={sv.popular}
                    ctaLabel={s.deploy}
                    ctaTestId={`vps-deploy-${i}`}
                    onCta={() => navigate("/vps")}
                    specs={[
                      { label: "vCPU", value: p.vcpus ?? "\u2014" },
                      { label: "RAM", value: `${p.ram_gb ?? "\u2014"} GB` },
                      { label: "Storage", value: `${p.disk_gb ?? "\u2014"} GB ${p.storage_type || "SSD"}` },
                      { label: "CPU", value: p.cpu || "Standard" },
                    ]}
                  />
                </Reveal>
              ))}
        </div>
      </div>
    </section>
  );
}
