import { LuMapPin, LuShieldCheck, LuWallet, LuCode, LuCheck } from "react-icons/lu";
import { useLanguage } from "../../../hooks/useLanguage";

const ICONS = [LuMapPin, LuShieldCheck, LuWallet, LuCode];

export default function TrustBar() {
  const { t } = useLanguage();
  return (
    <section className="border-y border-line bg-surface-2 dark:border-white/[0.06] dark:bg-gray-900/50" data-testid="trust-bar">
      <div className="nw-container py-6">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line dark:border-white/[0.06] dark:bg-white/[0.06] md:grid-cols-4">
          {t.site.home.trust.map((it, i) => {
            const Icon = ICONS[i] || LuCheck;
            return (
              <div
                key={it.label}
                className="flex items-center gap-4 bg-white px-5 py-5 dark:bg-gray-950 sm:px-6"
                data-testid={`trust-item-${i}`}
              >
                <span className="nw-icon h-11 w-11"><Icon className="h-5 w-5" /></span>
                <div className="min-w-0">
                  <p className="font-display text-base font-bold text-primary dark:text-white sm:text-lg">{it.label}</p>
                  <p className="text-13 text-ink-soft dark:text-gray-400">{it.sub}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
