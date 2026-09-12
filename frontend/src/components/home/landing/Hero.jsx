import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import { motion as Motion, useReducedMotion } from "motion/react";
import { LuLock, LuStar, LuShieldCheck, LuArrowRight } from "react-icons/lu";
import { useLanguage } from "../../../hooks/useLanguage";
import DomainSearchResults from "../../domain/DomainSearchResults";
import HeroShowcase from "../HeroShowcase";
import DomainSearchForm from "./DomainSearchForm";
import { LANDING_IMG } from "./images";

function HeroStage() {
  return (
    <div className="relative mt-4 lg:mt-0" data-testid="hero-stage">
      <div className="absolute inset-x-0 -top-6 -bottom-6 overflow-hidden rounded-[2rem] bg-gray-950 sm:-inset-x-6 sm:-top-14 lg:-inset-x-8 lg:-bottom-12">
        <img
          src={LANDING_IMG.hero}
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          className="h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900/70 via-gray-950/40 to-gray-950/85" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950/70 via-transparent to-transparent" />
        <div className="absolute inset-0 rounded-[2rem] ring-1 ring-inset ring-white/10" />
      </div>
      <div className="relative px-3 py-6 sm:px-6 sm:py-8">
        <HeroShowcase onDark />
      </div>
    </div>
  );
}

export default function Hero() {
  const { t } = useLanguage();
  const s = t.site.home;
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const [submitted, setSubmitted] = useState("");
  const resultsRef = useRef(null);

  const onSearch = (q) => {
    setSubmitted(q);
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
  };

  const idx = s.heading.indexOf(",");
  const head1 = idx >= 0 ? s.heading.slice(0, idx + 1) : s.heading;
  const head2 = idx >= 0 ? s.heading.slice(idx + 1).trim() : "";

  const container = { animate: { transition: { staggerChildren: reduced ? 0 : 0.09, delayChildren: 0.04 } } };
  const fadeUp = {
    initial: { opacity: 0, y: reduced ? 0 : 16 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  };

  return (
    <section className="nw-hero">
      <div className="absolute inset-0 nw-grid-bg opacity-70 dark:opacity-100" />
      <div className="nw-hero-glow -top-32 -right-24 h-96 w-96" />
      <div className="nw-hero-glow top-64 -left-32 h-80 w-80 opacity-60" />

      <div className="nw-container relative grid items-center gap-16 py-14 sm:py-20 lg:grid-cols-2 lg:gap-14 lg:py-28">
        <Motion.div variants={container} initial="initial" animate="animate">
          <Motion.div variants={fadeUp} className="mb-5 flex flex-wrap items-center gap-3">
            <span className="nw-eyebrow"><LuLock className="h-3.5 w-3.5" /> {s.eyebrow}</span>
            <span className="nw-chip" data-testid="hero-rating-chip">
              <span className="flex items-center gap-0.5 text-amber-400">
                {[0, 1, 2, 3, 4].map((i) => <LuStar key={i} className="h-3.5 w-3.5 fill-current" />)}
              </span>
              {s.rating}
            </span>
          </Motion.div>

          <Motion.h1
            variants={fadeUp}
            className="text-4xl font-bold leading-[1.08] tracking-tight text-primary dark:text-white sm:text-5xl lg:text-6xl"
            data-testid="hero-heading"
          >
            {head1}
            {head2 && (
              <>
                {" "}
                <span className="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent dark:from-brand-400 dark:to-brand-200">
                  {head2}
                </span>
              </>
            )}
          </Motion.h1>

          <Motion.p variants={fadeUp} className="mt-5 max-w-xl text-lg text-ink-soft dark:text-gray-400">
            {s.subheading}
          </Motion.p>

          <Motion.div variants={fadeUp} className="mt-8">
            <DomainSearchForm
              testId="hero"
              placeholder={s.placeholder}
              buttonLabel={s.searchBtn}
              onSubmit={onSearch}
              chips={s.heroChips}
            />
          </Motion.div>

          <Motion.div variants={fadeUp} className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
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

        <HeroStage />
      </div>

      {submitted && (
        <div ref={resultsRef} className="nw-container relative scroll-mt-24 pb-16" data-testid="hero-search-results">
          <DomainSearchResults query={submitted} />
        </div>
      )}
    </section>
  );
}
