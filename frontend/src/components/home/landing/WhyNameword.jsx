import { LuMapPin, LuEyeOff, LuKeyRound, LuWallet, LuGlobe, LuCheck, LuShieldCheck } from "react-icons/lu";
import { useLanguage } from "../../../hooks/useLanguage";
import Reveal from "./Reveal";

const PILLAR_ICONS = [LuMapPin, LuEyeOff, LuKeyRound, LuWallet];
const STEP_ICONS = [LuGlobe, LuWallet, LuKeyRound];

// Combined "Why + How", privacy-led. Folds the old dark Security band in as a
// light freedom checklist so there's one calm section instead of three.
export default function WhyNameword() {
  const { t } = useLanguage();
  const home = t.site.home;
  const s = home.pillars;
  const steps = home.steps;
  const privacy = home.privacy;

  return (
    <section id="why" className="nw-section bg-surface-2 dark:bg-gray-900/40">
      <div className="nw-container">
        <Reveal className="max-w-2xl">
          <span className="nw-kicker mb-4">{s.eyebrow}</span>
          <h2 className="nw-h2">{s.title}</h2>
          <p className="nw-lead mt-4">{s.lead}</p>
        </Reveal>

        {/* Pillars */}
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {s.items.map((p, i) => {
            const Icon = PILLAR_ICONS[i] || LuShieldCheck;
            return (
              <Reveal key={p.title} delay={(i % 4) * 0.06} className="nw-card flex flex-col p-6" data-testid={`pillar-${i}`}>
                <span className="nw-icon h-12 w-12"><Icon className="h-6 w-6" /></span>
                <h3 className="mt-5 text-lg font-bold text-primary dark:text-white">{p.title}</h3>
                <p className="mt-2 text-15 text-ink-soft dark:text-gray-400">{p.desc}</p>
              </Reveal>
            );
          })}
        </div>

        {/* Privacy & freedom checklist (folds in the old Security band) */}
        <Reveal
          className="mt-6 rounded-2xl border border-line bg-white p-6 dark:border-white/[0.06] dark:bg-gray-950 sm:p-8"
          data-testid="privacy-freedom"
        >
          <span className="nw-kicker mb-5"><LuShieldCheck className="h-3.5 w-3.5" /> {privacy.eyebrow}</span>
          <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {privacy.items.map((line, i) => (
              <li key={line} className="flex items-start gap-3" data-testid={`privacy-item-${i}`}>
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300">
                  <LuCheck className="h-3.5 w-3.5" />
                </span>
                <span className="text-15 font-medium text-primary dark:text-gray-100">{line}</span>
              </li>
            ))}
          </ul>
        </Reveal>

        {/* How it works — compact 3 steps */}
        <div className="mt-16">
          <Reveal className="max-w-2xl">
            <span className="nw-kicker mb-3">{steps.eyebrow}</span>
            <h3 className="font-display text-2xl font-bold tracking-tight text-primary dark:text-white sm:text-3xl">{steps.title}</h3>
          </Reveal>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {steps.items.map((step, i) => {
              const Icon = STEP_ICONS[i] || LuCheck;
              return (
                <Reveal as="li" key={step.title} delay={i * 0.08} data-testid={`step-${i}`}>
                  <div className="flex items-center gap-4">
                    <span className="nw-icon h-12 w-12"><Icon className="h-6 w-6" /></span>
                    <span className="font-display text-3xl font-bold text-brand-200 dark:text-brand/40">0{i + 1}</span>
                  </div>
                  <h4 className="mt-5 text-lg font-bold text-primary dark:text-white">{step.title}</h4>
                  <p className="mt-2 text-15 text-ink-soft dark:text-gray-400">{step.desc}</p>
                </Reveal>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
