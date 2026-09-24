import { useNavigate } from "react-router";
import { LuGlobe, LuNetwork, LuCode, LuArrowRight } from "react-icons/lu";
import { useLanguage } from "../../../hooks/useLanguage";
import { useAuth } from "../../../hooks/useAuth";
import Reveal from "./Reveal";

// Condensed strip — the rest of the stack now that servers lead the page.
const ITEMS = [
  { key: "domains", to: "/domains", icon: LuGlobe },
  { key: "dns", to: "/dns-manager", icon: LuNetwork, protectedRoute: true },
  { key: "api", to: "/api", icon: LuCode },
];

export default function EverythingElse() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const s = t.site.home.servers.everything;
  const nav = t.site.nav.items;
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
    <section className="nw-section">
      <div className="nw-container">
        <Reveal className="max-w-2xl">
          <span className="nw-kicker mb-3">{s.kicker}</span>
          <h2 className="nw-h2">{s.title}</h2>
          <p className="nw-lead mt-3">{s.lead}</p>
        </Reveal>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((p, i) => (
            <Reveal key={p.key} delay={(i % 4) * 0.05} className="flex">
              <button
                onClick={() => go(p)}
                data-testid={`everything-${p.key}`}
                className="nw-card nw-card-hover group flex w-full items-start gap-3 p-5 text-left"
              >
                <span className="nw-icon h-10 w-10 shrink-0">
                  <p.icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1 text-sm font-bold text-primary dark:text-white">
                    {nav[p.key].title}
                    <LuArrowRight className="h-3.5 w-3.5 text-brand-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-brand-300" />
                  </span>
                  <span className="mt-1 block text-13 text-ink-soft dark:text-gray-400">{nav[p.key].desc}</span>
                </span>
              </button>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
