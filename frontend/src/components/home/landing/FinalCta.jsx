import { useNavigate } from "react-router";
import { LuArrowRight, LuSearch } from "react-icons/lu";
import { useLanguage } from "../../../hooks/useLanguage";
import Reveal from "./Reveal";
import { LANDING_IMG } from "./images";

// Single closing prompt — no repeated domain search (that lives in the hero).
export default function FinalCta() {
  const { t } = useLanguage();
  const s = t.site.home.cta;
  const navigate = useNavigate();

  return (
    <section className="nw-section pt-0">
      <div className="nw-container">
        <Reveal
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-gray-950 px-6 py-16 text-center text-white sm:px-12 sm:py-20"
          data-testid="final-cta"
        >
          <img src={LANDING_IMG.cta} alt="" aria-hidden="true" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-90" />
          <div className="absolute inset-0 bg-gradient-to-b from-gray-950/40 via-gray-950/30 to-gray-950/85" />
          <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/10" />

          <div className="relative mx-auto max-w-2xl">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-5xl">{s.title}</h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-gray-300 sm:text-lg">{s.lead}</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button onClick={() => navigate("/create-account")} className="nw-btn-primary" data-testid="cta-create-account">
                {t.site.home.loyalty.cta} <LuArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => navigate("/domains")}
                className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/10"
                data-testid="cta-browse-domains"
              >
                <LuSearch className="h-4 w-4" /> {t.site.home.pricing.searchCta}
              </button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
