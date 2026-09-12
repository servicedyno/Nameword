import { LuMapPin, LuEyeOff, LuKeyRound, LuWallet, LuTerminal, LuShieldCheck } from "react-icons/lu";
import { useLanguage } from "../../../hooks/useLanguage";
import Reveal from "./Reveal";
import { LANDING_IMG } from "./images";

const PILLAR_ICONS = [LuMapPin, LuEyeOff, LuKeyRound, LuWallet, LuTerminal];

function MapVisual({ chips }) {
  return (
    <div
      className="relative mt-10 overflow-hidden rounded-3xl border border-line bg-gray-950 shadow-2xl shadow-brand/10 dark:border-white/[0.08] dark:shadow-black/50"
      data-testid="why-map-visual"
    >
      <img src={LANDING_IMG.map} alt="World map of privacy jurisdictions" loading="lazy" className="aspect-[4/3] w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-gray-950/85 via-gray-950/10 to-transparent" />
      <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/10" />
      <div className="absolute bottom-5 left-5 right-5 flex flex-wrap gap-2">
        {chips.map((c) => (
          <span
            key={c.label}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md"
          >
            <c.icon className="h-3.5 w-3.5 text-brand-200" /> {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function WhyNameword() {
  const { t } = useLanguage();
  const home = t.site.home;
  const s = home.pillars;
  const chips = [
    { icon: LuMapPin, label: home.trust[0].label },
    { icon: LuShieldCheck, label: home.trust[1].label },
  ];

  return (
    <section id="why" className="nw-section bg-surface-2 dark:bg-gray-900/40">
      <div className="nw-container grid gap-12 lg:grid-cols-12 lg:gap-16">
        <Reveal className="lg:col-span-5">
          <span className="nw-eyebrow mb-4">{s.eyebrow}</span>
          <h2 className="nw-h2">{s.title}</h2>
          <p className="nw-lead mt-4">{s.lead}</p>
          <MapVisual chips={chips} />
        </Reveal>

        <ol className="divide-y divide-line lg:col-span-7 lg:self-center dark:divide-white/[0.06]">
          {s.items.map((p, i) => {
            const Icon = PILLAR_ICONS[i] || LuShieldCheck;
            return (
              <Reveal
                as="li"
                key={p.title}
                delay={i * 0.06}
                className="grid grid-cols-[auto_auto_1fr] gap-4 py-7 first:pt-0 last:pb-0 sm:gap-5"
                data-testid={`pillar-${i}`}
              >
                <span className="nw-mono pt-3.5 text-brand-600 dark:text-brand-400">0{i + 1}</span>
                <span className="nw-icon h-12 w-12"><Icon className="h-6 w-6" /></span>
                <div>
                  <h3 className="text-lg font-bold text-primary dark:text-white">{p.title}</h3>
                  <p className="mt-1.5 text-15 text-ink-soft dark:text-gray-400">{p.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
