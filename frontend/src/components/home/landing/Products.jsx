import { useNavigate } from "react-router";
import { LuGlobe, LuNetwork, LuServer, LuCloud, LuMonitor, LuCode, LuArrowRight } from "react-icons/lu";
import { useLanguage } from "../../../hooks/useLanguage";
import { useAuth } from "../../../hooks/useAuth";
import Reveal from "./Reveal";
import { LANDING_IMG } from "./images";

const PRODUCTS = [
  { key: "domains", to: "/domains", icon: LuGlobe, img: LANDING_IMG.domains },
  { key: "dns", to: "/dns-manager", icon: LuNetwork, img: LANDING_IMG.dns, protectedRoute: true },
  { key: "hosting", to: "/hosting", icon: LuServer, img: LANDING_IMG.hosting },
  { key: "vps", to: "/vps", icon: LuCloud, img: LANDING_IMG.vps },
  { key: "rdp", to: "/rdp", icon: LuMonitor, img: LANDING_IMG.rdp },
];
const API = { key: "api", to: "/api", icon: LuCode, img: LANDING_IMG.api };

function ProductCard({ p, item, explore, onClick }) {
  return (
    <button
      onClick={onClick}
      className="nw-card nw-card-hover group flex w-full flex-col overflow-hidden p-0 text-left"
      data-testid={`product-card-${p.key}`}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-gray-950">
        <img
          src={p.img}
          alt={item.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-gray-950/10 to-transparent" />
        <span className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white backdrop-blur-md">
          <p.icon className="h-5 w-5" />
        </span>
        <span className="nw-mono absolute bottom-3 left-4 text-brand-200">{item.price}</span>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-lg font-bold text-primary dark:text-white">{item.title}</h3>
        <p className="mt-2 text-15 text-ink-soft dark:text-gray-400">{item.desc}</p>
        <span className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-semibold text-brand-700 transition-all group-hover:gap-2 dark:text-brand-300">
          {explore} <LuArrowRight className="h-4 w-4" />
        </span>
      </div>
    </button>
  );
}

function ApiCard({ item, explore, onClick }) {
  return (
    <button
      onClick={onClick}
      className="nw-card nw-card-hover group grid overflow-hidden p-0 text-left sm:col-span-2 lg:col-span-3 lg:grid-cols-[1.15fr_1fr]"
      data-testid="product-card-api"
    >
      <div className="relative min-h-[240px] overflow-hidden bg-gray-950 lg:min-h-0">
        <img
          src={API.img}
          alt={item.title}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-gray-950/10 to-transparent" />
        <div className="absolute inset-y-0 right-0 hidden w-32 bg-gradient-to-r from-transparent to-white dark:to-gray-900 lg:block" />
        <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-white/10 bg-gray-950/70 px-4 py-3 font-mono text-[12px] text-brand-200 backdrop-blur lg:right-36">
          <span className="text-gray-500">$</span> curl -H "Authorization: Bearer ···" api.nameword.com/v1/domains
          <span className="ml-1 inline-block h-3 w-1.5 translate-y-0.5 animate-pulse bg-brand-300" />
        </div>
      </div>
      <div className="flex flex-col p-6 sm:p-8">
        <span className="nw-icon h-12 w-12"><LuCode className="h-6 w-6" /></span>
        <h3 className="mt-5 text-lg font-bold text-primary dark:text-white sm:text-xl">{item.title}</h3>
        <p className="mt-2 text-15 text-ink-soft dark:text-gray-400">{item.desc}</p>
        <div className="mt-auto flex items-center justify-between gap-4 pt-6">
          <span className="nw-mono">{item.price}</span>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 transition-all group-hover:gap-2 dark:text-brand-300">
            {explore} <LuArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </button>
  );
}

export default function Products() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const s = t.site.home.products;
  const navigate = useNavigate();

  const go = (p) => {
    if (p.protectedRoute && !user) {
      localStorage.setItem("path", p.to);
      navigate("/sign-in");
      return;
    }
    navigate(p.to);
  };

  return (
    <section id="products" className="nw-section">
      <div className="nw-container">
        <Reveal className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-2xl">
            <span className="nw-eyebrow mb-4">{s.eyebrow}</span>
            <h2 className="nw-h2">{s.title}</h2>
            <p className="nw-lead mt-4">{s.lead}</p>
          </div>
          <button onClick={() => navigate("/pricing")} className="nw-btn-secondary" data-testid="products-pricing-link">
            {t.site.home.pricing.fullTable} <LuArrowRight className="h-4 w-4" />
          </button>
        </Reveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PRODUCTS.map((p, i) => (
            <Reveal key={p.key} delay={(i % 3) * 0.08} className="flex">
              <ProductCard p={p} item={s.items[p.key]} explore={s.explore} onClick={() => go(p)} />
            </Reveal>
          ))}
          <Reveal className="grid sm:col-span-2 lg:col-span-3">
            <ApiCard item={s.items.api} explore={s.explore} onClick={() => go(API)} />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
