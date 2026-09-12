import { useNavigate } from "react-router";
import { LuShieldCheck, LuSearch } from "react-icons/lu";
import { useLanguage } from "../../../hooks/useLanguage";
import Reveal from "./Reveal";

// Static reference prices shown on the homepage; the /pricing page shows live per-TLD prices.
const TLDS = [
  { tld: ".com", price: "39", renew: "39" },
  { tld: ".net", price: "51", renew: "51" },
  { tld: ".org", price: "29", renew: "29" },
  { tld: ".io", price: "244", renew: "244" },
  { tld: ".co", price: "59", renew: "59" },
  { tld: ".xyz", price: "19", renew: "19" },
  { tld: ".shop", price: "30", renew: "30" },
  { tld: ".store", price: "160", renew: "160" },
];

export default function PricingTeaser() {
  const { t } = useLanguage();
  const s = t.site.home.pricing;
  const navigate = useNavigate();
  return (
    <section id="pricing" className="relative overflow-hidden bg-surface-2 dark:bg-gray-900/40">
      <div className="absolute inset-0 nw-grid-bg opacity-60" />
      <div className="nw-container relative nw-section">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="nw-eyebrow mb-4">{s.eyebrow}</span>
          <h2 className="nw-h2">{s.title}</h2>
          <p className="nw-lead mt-4">{s.lead}</p>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TLDS.map((d, i) => {
            const id = d.tld.slice(1);
            return (
              <Reveal key={d.tld} delay={(i % 4) * 0.06} className="flex">
                <div className="nw-card nw-card-hover flex w-full flex-col" data-testid={`tld-card-${id}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-display text-2xl font-bold text-primary dark:text-white">{d.tld}</span>
                    <span className="nw-badge-brand"><LuShieldCheck className="h-3 w-3" /> WHOIS</span>
                  </div>
                  <div className="mt-5 flex items-end gap-1.5">
                    <span className="font-display text-4xl font-bold tracking-tight text-primary dark:text-white">${d.price}</span>
                    <span className="pb-1.5 text-13 text-ink-soft dark:text-gray-400">{s.perYear}</span>
                  </div>
                  <p className="nw-mono mt-2">{s.renews} ${d.renew}{s.perYear}</p>
                  <button
                    onClick={() => navigate(`/domains?value=${encodeURIComponent("yourname" + d.tld)}`)}
                    className="nw-btn-secondary nw-btn-sm mt-6 w-full"
                    data-testid={`tld-register-${id}`}
                  >
                    {s.register}
                  </button>
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal className="mt-10 flex flex-wrap justify-center gap-3">
          <button onClick={() => navigate("/domains")} className="nw-btn-primary" data-testid="pricing-search-cta">
            <LuSearch className="h-4 w-4" /> {s.searchCta}
          </button>
          <button onClick={() => navigate("/pricing")} className="nw-btn-secondary" data-testid="pricing-full-table">
            {s.fullTable}
          </button>
        </Reveal>
      </div>
    </section>
  );
}
