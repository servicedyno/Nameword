import { useNavigate } from "react-router";
import { LuGlobe, LuNetwork, LuServer, LuCloud, LuMonitor, LuCode, LuArrowRight } from "react-icons/lu";
import { useLanguage } from "../../../hooks/useLanguage";
import { useAuth } from "../../../hooks/useAuth";
import Reveal from "./Reveal";

// A quick map of everything on offer, high on the page (Hostinger-style grid).
const ITEMS = [
  { key: "domains", to: "/domains", icon: LuGlobe },
  { key: "dns", to: "/dns-manager", icon: LuNetwork, protectedRoute: true },
  { key: "hosting", to: "/hosting", icon: LuServer },
  { key: "vps", to: "/vps", icon: LuCloud },
  { key: "rdp", to: "/rdp", icon: LuMonitor },
  { key: "api", to: "/api", icon: LuCode },
];

export default function ProductsGlance() {
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
    <section id="products" className="nw-section bg-surface-2 dark:bg-gray-900/40">
      <div className="nw-container">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="nw-kicker mb-4">{s.eyebrow}</span>
          <h2 className="nw-h2">{s.title}</h2>
          <p className="nw-lead mt-4">{s.lead}</p>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((p, i) => {
            const item = s.items[p.key];
            return (
              <Reveal key={p.key} delay={(i % 3) * 0.06} className="flex">
                <button
                  onClick={() => go(p)}
                  data-testid={`glance-${p.key}`}
                  className="group relative flex h-full w-full flex-col rounded-2xl border border-line bg-white p-6 text-left transition-all hover:-translate-y-1 hover:border-brand/40 hover:shadow-xl hover:shadow-brand/5 dark:border-white/[0.07] dark:bg-gray-900 dark:hover:border-brand/40"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-indigo-500 text-white shadow-lg shadow-brand-500/25">
                    <p.icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-5 text-lg font-bold text-primary dark:text-white">{item.title}</h3>
                  <p className="mt-2 flex-1 text-15 text-ink-soft dark:text-gray-400">{item.desc}</p>
                  <div className="mt-5 flex items-center justify-between border-t border-line pt-4 dark:border-white/[0.06]">
                    <span className="nw-mono text-brand-700 dark:text-brand-300">{item.price}</span>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 transition-transform group-hover:translate-x-0.5 dark:text-brand-300">
                      {s.explore} <LuArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </button>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
