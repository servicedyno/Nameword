import { useNavigate } from "react-router";
import { LuGift, LuBadgeCheck, LuLayers, LuEyeOff, LuCheck, LuArrowRight } from "react-icons/lu";
import { useLanguage } from "../../../hooks/useLanguage";
import Reveal from "./Reveal";
import { LANDING_IMG } from "./images";

const PERK_ICONS = [LuGift, LuBadgeCheck, LuLayers, LuEyeOff];

export default function RewardsBand() {
  const { t } = useLanguage();
  const s = t.site.home.loyalty;
  const navigate = useNavigate();
  return (
    <section className="nw-section">
      <div className="nw-container">
        <Reveal
          className="grid overflow-hidden rounded-3xl border border-line bg-white shadow-xl shadow-slate-200/50 dark:border-white/[0.08] dark:bg-gray-900 dark:shadow-black/40 lg:grid-cols-2"
          data-testid="rewards-band"
        >
          <div className="p-8 sm:p-12">
            <span className="nw-badge-brand"><LuGift className="h-3.5 w-3.5" /> {s.badge}</span>
            <h2 className="nw-h2 mt-5">{s.title}</h2>
            <p className="nw-lead mt-4">{s.desc}</p>
            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {s.perks.map((label, i) => {
                const Icon = PERK_ICONS[i] || LuCheck;
                return (
                  <div
                    key={label}
                    className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3.5 dark:border-white/[0.07] dark:bg-white/[0.03]"
                    data-testid={`perk-${i}`}
                  >
                    <Icon className="h-5 w-5 shrink-0 text-brand-600 dark:text-brand-300" />
                    <span className="text-sm font-semibold text-primary dark:text-gray-100">{label}</span>
                  </div>
                );
              })}
            </div>
            <button onClick={() => navigate("/create-account")} className="nw-btn-primary mt-8" data-testid="rewards-cta">
              {s.cta} <LuArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="relative min-h-[280px] bg-gray-950 lg:min-h-0">
            <img src={LANDING_IMG.rewards} alt="Prepaid wallet card" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-transparent dark:from-gray-900 lg:bg-gradient-to-r lg:from-white lg:via-white/10 lg:to-transparent dark:lg:from-gray-900 dark:lg:via-gray-900/10" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
