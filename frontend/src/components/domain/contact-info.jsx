import { useLanguage } from "../../hooks/useLanguage";
import { LuMapPin, LuEyeOff, LuKeyRound, LuWallet, LuTerminal, LuLock } from "react-icons/lu";

const ICONS = [LuMapPin, LuEyeOff, LuKeyRound, LuWallet, LuTerminal];

/**
 * Privacy pillars strip. Shown under domain search / hosting results.
 * (Replaces the old generic "34,224 customers" testimonial block.)
 */
const ContactInfo = () => {
  const { t } = useLanguage();
  const s = t.site.home.pillars;

  return (
    <section className="mt-12">
      <div className="relative overflow-hidden rounded-3xl border border-line bg-surface-2 p-6 dark:border-white/[0.06] dark:bg-gray-900/60 lg:p-12">
        <div className="nw-hero-glow -top-24 -right-24 h-64 w-64" />
        <div className="relative mx-auto max-w-2xl text-center">
          <span className="nw-eyebrow mb-4"><LuLock className="h-3.5 w-3.5" /> {s.eyebrow}</span>
          <h2 className="nw-h2">{s.title}</h2>
          <p className="nw-lead mt-3">{s.lead}</p>
        </div>
        <div className="relative mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {s.items.map((p, i) => {
            const Icon = ICONS[i] || LuLock;
            return (
              <div key={p.title} className="nw-card nw-card-hover p-5">
                <span className="nw-icon h-10 w-10"><Icon className="h-5 w-5" /></span>
                <h3 className="mt-4 text-base font-bold text-primary dark:text-white">{p.title}</h3>
                <p className="mt-1.5 text-13 text-ink-soft dark:text-gray-400">{p.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ContactInfo;
