import { LuMapPin, LuShieldCheck, LuEyeOff, LuWallet } from "react-icons/lu";
import { FaBitcoin, FaEthereum } from "react-icons/fa6";
import { SiTether } from "react-icons/si";
import { useLanguage } from "../../../hooks/useLanguage";
import Reveal from "./Reveal";

const PROOF_ICONS = [LuMapPin, LuShieldCheck, LuEyeOff, LuWallet];

// Privacy proof points + accepted-crypto coin logos. No invented ratings/counts.
export default function TrustStrip() {
  const { t } = useLanguage();
  const home = t.site.home;
  const coinsLabel = home.promo.coinsLabel;
  return (
    <section className="border-y border-line bg-white dark:border-white/[0.06] dark:bg-gray-950" data-testid="trust-strip">
      <div className="nw-container py-6">
        <div className="flex flex-col items-center gap-6 lg:flex-row lg:justify-between">
          <div className="grid w-full grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4 lg:w-auto lg:flex lg:items-center lg:gap-8">
            {home.trust.map((it, i) => {
              const Icon = PROOF_ICONS[i] || LuShieldCheck;
              return (
                <div key={it.label} className="flex items-center gap-2.5" data-testid={`trust-item-${i}`}>
                  <Icon className="h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400" />
                  <div className="min-w-0 leading-tight">
                    <p className="text-sm font-semibold text-primary dark:text-white">{it.label}</p>
                    <p className="text-xs text-ink-soft dark:text-gray-400">{it.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <Reveal className="flex items-center gap-3 lg:shrink-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft dark:text-gray-500">{coinsLabel}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 py-1 text-13 font-medium text-ink-soft dark:border-white/10 dark:bg-gray-900 dark:text-gray-300"><FaBitcoin className="h-4 w-4 text-[#f7931a]" /> BTC</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 py-1 text-13 font-medium text-ink-soft dark:border-white/10 dark:bg-gray-900 dark:text-gray-300"><FaEthereum className="h-4 w-4 text-[#627eea]" /> ETH</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 py-1 text-13 font-medium text-ink-soft dark:border-white/10 dark:bg-gray-900 dark:text-gray-300"><SiTether className="h-4 w-4 text-[#26a17b]" /> USDT</span>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
