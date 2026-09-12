import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import { LuArrowRight } from "react-icons/lu";
import { useLanguage } from "../../../hooks/useLanguage";
import DomainSearchResults from "../../domain/DomainSearchResults";
import DomainSearchForm from "./DomainSearchForm";
import Reveal from "./Reveal";
import { LANDING_IMG } from "./images";

export default function FinalCta() {
  const { t } = useLanguage();
  const s = t.site.home.cta;
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState("");
  const resultsRef = useRef(null);

  const onSearch = (q) => {
    setSubmitted(q);
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
  };

  return (
    <section className="nw-section pt-0">
      <div className="nw-container">
        <Reveal
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-gray-950 px-6 py-16 text-center text-white sm:px-12 sm:py-20"
          data-testid="final-cta"
        >
          <img src={LANDING_IMG.cta} alt="" aria-hidden="true" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-gray-950/30 via-gray-950/20 to-gray-950/85" />
          <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/10" />

          <div className="relative mx-auto max-w-2xl">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-5xl">{s.title}</h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-gray-300 sm:text-lg">{s.lead}</p>
            <div className="mx-auto mt-8 max-w-xl">
              <DomainSearchForm testId="cta" glass placeholder={s.placeholder} buttonLabel={s.button} onSubmit={onSearch} />
            </div>
            <button
              onClick={() => navigate("/create-account")}
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-200 transition-colors hover:text-white"
              data-testid="cta-create-account-link"
            >
              {t.site.home.loyalty.cta} <LuArrowRight className="h-4 w-4" />
            </button>
          </div>
        </Reveal>

        {submitted && (
          <div ref={resultsRef} className="scroll-mt-24 pt-10" data-testid="cta-search-results">
            <DomainSearchResults query={submitted} />
          </div>
        )}
      </div>
    </section>
  );
}
