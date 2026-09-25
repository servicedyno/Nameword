import { LuBadgeCheck, LuWallet, LuZap, LuBitcoin } from "react-icons/lu";
import { useLanguage } from "../../../hooks/useLanguage";
import Reveal from "./Reveal";

const ICONS = [LuBadgeCheck, LuWallet, LuZap, LuBitcoin];

// Reassurance row (adapted from Hostinger's money-back line) — privacy/crypto flavour.
export default function GuaranteesStrip() {
  const { t } = useLanguage();
  const g = t.site.home.promo.guarantees;
  return (
    <section className="nw-section">
      <div className="nw-container">
        <Reveal className="overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-brand-50 via-white to-white p-8 dark:border-white/[0.08] dark:from-brand-500/[0.08] dark:via-gray-900 dark:to-gray-900 sm:p-10" data-testid="guarantees-strip">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="nw-h2">{g.title}</h2>
            <p className="nw-lead mt-3">{g.lead}</p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {g.items.map((it, i) => {
              const Icon = ICONS[i] || LuBadgeCheck;
              return (
                <div key={it.title} className="flex flex-col items-center text-center" data-testid={`guarantee-${i}`}>
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-md shadow-slate-200/70 ring-1 ring-line dark:bg-gray-950 dark:text-brand-300 dark:shadow-black/40 dark:ring-white/10">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-4 text-base font-bold text-primary dark:text-white">{it.title}</h3>
                  <p className="mt-1.5 text-sm text-ink-soft dark:text-gray-400">{it.desc}</p>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
