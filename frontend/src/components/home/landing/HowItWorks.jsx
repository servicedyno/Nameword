import { LuGlobe, LuWallet, LuKeyRound, LuCheck } from "react-icons/lu";
import { useLanguage } from "../../../hooks/useLanguage";
import Reveal from "./Reveal";

const STEP_ICONS = [LuGlobe, LuWallet, LuKeyRound];

export default function HowItWorks() {
  const { t } = useLanguage();
  const s = t.site.home.steps;
  return (
    <section id="how-it-works" className="nw-section">
      <div className="nw-container">
        <Reveal className="max-w-2xl">
          <span className="nw-eyebrow mb-4">{s.eyebrow}</span>
          <h2 className="nw-h2">{s.title}</h2>
        </Reveal>

        <ol className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          <div
            aria-hidden="true"
            className="absolute left-8 right-8 top-8 hidden border-t border-dashed border-line-strong dark:border-white/15 md:block"
          />
          {s.items.map((step, i) => {
            const Icon = STEP_ICONS[i] || LuCheck;
            return (
              <Reveal as="li" key={step.title} delay={i * 0.1} className="relative" data-testid={`step-${i}`}>
                <div className="relative inline-flex items-center gap-4 bg-white pr-5 dark:bg-gray-950">
                  <span className="nw-icon h-16 w-16 rounded-2xl"><Icon className="h-7 w-7" /></span>
                  <span className="font-display text-4xl font-bold text-brand-200 dark:text-brand/40">0{i + 1}</span>
                </div>
                <h3 className="mt-6 text-lg font-bold text-primary dark:text-white">{step.title}</h3>
                <p className="mt-2 max-w-sm text-15 text-ink-soft dark:text-gray-400">{step.desc}</p>
              </Reveal>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
