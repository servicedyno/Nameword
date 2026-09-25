import { useState } from "react";
import { AnimatePresence, motion as Motion } from "motion/react";
import { LuChevronDown } from "react-icons/lu";
import { useLanguage } from "../../../hooks/useLanguage";
import Reveal from "./Reveal";

// Objection-handling FAQ accordion (privacy / crypto / offshore / DMCA).
export default function Faq() {
  const { t } = useLanguage();
  const s = t.site.home.faq;
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="nw-section bg-surface-2 dark:bg-gray-900/40">
      <div className="nw-container">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="nw-kicker mb-4">{s.eyebrow}</span>
          <h2 className="nw-h2">{s.title}</h2>
          <p className="nw-lead mt-4">{s.lead}</p>
        </Reveal>

        <Reveal className="mx-auto mt-12 max-w-3xl space-y-3" data-testid="faq-list">
          {s.items.map((item, i) => {
            const isOpen = open === i;
            return (
              <div
                key={item.q}
                className="overflow-hidden rounded-2xl border border-line bg-white dark:border-white/[0.08] dark:bg-gray-950"
                data-testid={`faq-item-${i}`}
              >
                <button
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left sm:px-6"
                  data-testid={`faq-trigger-${i}`}
                >
                  <span className="text-base font-semibold text-primary dark:text-white">{item.q}</span>
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line text-brand-600 transition-transform duration-300 dark:border-white/10 dark:text-brand-300 ${
                      isOpen ? "rotate-180 bg-brand-50 dark:bg-brand-500/15" : ""
                    }`}
                  >
                    <LuChevronDown className="h-4 w-4" />
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <Motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <p
                        className="px-5 pb-5 text-15 leading-relaxed text-ink-soft dark:text-gray-400 sm:px-6"
                        data-testid={`faq-answer-${i}`}
                      >
                        {item.a}
                      </p>
                    </Motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}
