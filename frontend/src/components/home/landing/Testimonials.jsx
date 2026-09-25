import { LuQuote } from "react-icons/lu";
import { useLanguage } from "../../../hooks/useLanguage";
import Reveal from "./Reveal";

// Representative, persona-based voices (no invented names, ratings or logos).
export default function Testimonials() {
  const { t } = useLanguage();
  const s = t.site.home.testimonials;
  return (
    <section className="nw-section">
      <div className="nw-container">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="nw-kicker mb-4">{s.eyebrow}</span>
          <h2 className="nw-h2">{s.title}</h2>
          <p className="nw-lead mt-4">{s.lead}</p>
        </Reveal>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {s.items.map((it, i) => (
            <Reveal key={it.role} delay={i * 0.08} className="flex" data-testid={`testimonial-${i}`}>
              <figure className="flex h-full flex-col rounded-2xl border border-line bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-brand/5 dark:border-white/[0.08] dark:bg-gray-950 dark:shadow-black/30 sm:p-7">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-indigo-500 text-white shadow-lg shadow-brand-500/25">
                  <LuQuote className="h-5 w-5" />
                </span>
                <blockquote className="mt-5 flex-1 text-15 leading-relaxed text-primary dark:text-gray-100">
                  &ldquo;{it.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3 border-t border-line pt-4 dark:border-white/[0.06]">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
                    {it.role.charAt(0)}
                  </span>
                  <span className="text-sm font-semibold text-ink-soft dark:text-gray-400">{it.role}</span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
