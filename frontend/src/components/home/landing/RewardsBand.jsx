import { useNavigate } from "react-router";
import { LuGift, LuBadgeCheck, LuLayers, LuEyeOff, LuCheck, LuArrowRight, LuWallet } from "react-icons/lu";
import { useLanguage } from "../../../hooks/useLanguage";
import Reveal from "./Reveal";

const PERK_ICONS = [LuGift, LuBadgeCheck, LuLayers, LuEyeOff];

export default function RewardsBand() {
  const { t } = useLanguage();
  const s = t.site.home.loyalty;
  const navigate = useNavigate();
  return (
    <section className="nw-section">
      <div className="nw-container">
        <Reveal
          className="grid overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-brand-50/70 via-white to-white shadow-sm dark:border-white/[0.08] dark:from-brand-500/[0.08] dark:via-gray-900 dark:to-gray-900 lg:grid-cols-2"
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

          {/* Calm product preview — a simple prepaid-wallet card, no photo */}
          <div className="relative flex items-center justify-center border-t border-line bg-gradient-to-br from-brand-50 to-white p-8 dark:border-white/[0.06] dark:from-white/[0.04] dark:to-transparent sm:p-12 lg:border-l lg:border-t-0">
            <div className="w-full max-w-sm rounded-2xl border border-line bg-white p-6 shadow-lg shadow-slate-200/60 dark:border-white/[0.08] dark:bg-gray-950 dark:shadow-black/40">
              <div className="flex items-center justify-between">
                <span className="nw-mono">Prepaid wallet</span>
                <LuWallet className="h-5 w-5 text-brand-600 dark:text-brand-300" />
              </div>
              <div className="mt-4 flex items-end gap-1.5">
                <span className="font-display text-4xl font-bold tracking-tight text-primary dark:text-white">$120.00</span>
                <span className="pb-1.5 text-13 text-ink-soft dark:text-gray-400">balance</span>
              </div>
              <div className="mt-6 rounded-xl border border-line bg-surface-2 p-4 dark:border-white/[0.06] dark:bg-white/[0.03]">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-semibold text-primary dark:text-white">
                    <LuGift className="h-4 w-4 text-brand-600 dark:text-brand-300" /> Reward points
                  </span>
                  <span className="font-mono text-brand-700 dark:text-brand-300">1,240</span>
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-brand-100 dark:bg-white/10">
                  <div className="h-full w-3/4 rounded-full bg-brand-500" />
                </div>
                <p className="mt-2 text-xs text-ink-soft dark:text-gray-400">260 points to your next tier</p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
