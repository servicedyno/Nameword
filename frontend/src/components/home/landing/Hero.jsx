import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import { motion as Motion, useReducedMotion } from "motion/react";
import { LuShieldCheck, LuArrowRight, LuMapPin, LuEyeOff, LuWallet } from "react-icons/lu";
import { useLanguage } from "../../../hooks/useLanguage";
import DomainSearchResults from "../../domain/DomainSearchResults";
import DomainSearchForm from "./DomainSearchForm";

const TRUST_ICONS = [LuMapPin, LuShieldCheck, LuEyeOff, LuWallet];

// Calm, centered, product-first hero. The domain search is the single focal
// point — no photographic backdrop, mock card, gradient headline or rating chip.
export default function Hero() {
  const { t } = useLanguage();
  const s = t.site.home;
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const [submitted, setSubmitted] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchNonce, setSearchNonce] = useState(0);
  const resultsRef = useRef(null);

  const onSearch = (q) => {
    setSubmitted(q);
    setSearching(true);
    setSearchNonce((n) => n + 1);
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
  };

  const container = { animate: { transition: { staggerChildren: reduced ? 0 : 0.08, delayChildren: 0.03 } } };
  const fadeUp = {
    initial: { opacity: 0, y: reduced ? 0 : 14 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  };

  return (
    <section className="relative overflow-hidden bg-white dark:bg-gray-950">
      {/* one very soft top tint — no grid, no glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-brand-50/60 to-transparent dark:from-brand-500/[0.06]" />

      <div className="nw-container relative py-20 sm:py-24 lg:py-28">
        <Motion.div variants={container} initial="initial" animate="animate" className="mx-auto max-w-3xl text-center">
          <Motion.div variants={fadeUp}>
            <span className="nw-kicker">{s.eyebrow}</span>
          </Motion.div>

          <Motion.h1
            variants={fadeUp}
            className="mt-5 text-[2.5rem] font-bold leading-[1.06] tracking-tight text-primary dark:text-white sm:text-6xl"
            data-testid="hero-heading"
          >
            {s.heading}
          </Motion.h1>

          <Motion.p
            variants={fadeUp}
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft dark:text-gray-400"
          >
            {s.subheading}
          </Motion.p>

          <Motion.div variants={fadeUp} className="mx-auto mt-9 max-w-2xl">
            <DomainSearchForm
              testId="hero"
              placeholder={s.placeholder}
              buttonLabel={s.searchBtn}
              busyLabel={s.searching}
              busy={searching}
              onSubmit={onSearch}
              chips={s.heroChips}
              center
            />
          </Motion.div>

          <Motion.div variants={fadeUp} className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
            <span className="flex items-center gap-1.5 text-13 font-medium text-ink-soft dark:text-gray-400">
              <LuShieldCheck className="h-4 w-4 text-brand-600 dark:text-brand-400" /> {s.trustNote}
            </span>
            <button
              onClick={() => navigate("/vps")}
              className="inline-flex items-center gap-1.5 text-15 font-semibold text-brand-700 hover:text-brand-800 dark:text-brand-300 dark:hover:text-brand-200"
              data-testid="hero-need-servers-link"
            >
              {s.needServers} <LuArrowRight className="h-4 w-4" />
            </button>
          </Motion.div>
        </Motion.div>

        {/* Slim, quiet trust strip — proof points, not boxed badges */}
        <div
          className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-x-8 gap-y-7 border-t border-line pt-10 dark:border-white/[0.06] md:grid-cols-4"
          data-testid="hero-trust-row"
        >
          {s.trust.map((it, i) => {
            const Icon = TRUST_ICONS[i] || LuShieldCheck;
            return (
              <div
                key={it.label}
                className="flex flex-col items-center gap-2 text-center sm:flex-row sm:items-start sm:gap-3 sm:text-left"
                data-testid={`trust-item-${i}`}
              >
                <Icon className="h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-primary dark:text-white">{it.label}</p>
                  <p className="text-xs text-ink-soft dark:text-gray-400">{it.sub}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {submitted && (
        <div ref={resultsRef} className="nw-container relative scroll-mt-24 pb-16" data-testid="hero-search-results">
          <DomainSearchResults query={submitted} nonce={searchNonce} onLoadingChange={setSearching} />
        </div>
      )}
    </section>
  );
}
