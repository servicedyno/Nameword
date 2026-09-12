import { LuCheck, LuLock } from "react-icons/lu";
import { useLanguage } from "../../../hooks/useLanguage";
import Reveal from "./Reveal";
import { LANDING_IMG } from "./images";

export default function SecurityBand() {
  const { t } = useLanguage();
  const s = t.site.home.privacy;
  return (
    <section id="privacy" className="relative overflow-hidden bg-gray-950 text-white" data-testid="security-band">
      <img
        src={LANDING_IMG.security}
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover opacity-80"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-950/75 to-gray-950/10" />
      <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-gray-950/40" />

      <div className="nw-container relative grid gap-12 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
        <Reveal>
          <span className="nw-eyebrow mb-4 text-brand-300"><LuLock className="h-3.5 w-3.5" /> {s.eyebrow}</span>
          <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">{s.title}</h2>
          <p className="mt-4 text-base text-gray-300 sm:text-lg">{s.lead}</p>
        </Reveal>

        <ul className="grid gap-3 sm:grid-cols-2">
          {s.items.map((line, i) => (
            <Reveal
              as="li"
              key={line}
              delay={i * 0.06}
              className={`flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-4 backdrop-blur-md ${i === s.items.length - 1 ? "sm:col-span-2" : ""}`}
              data-testid={`security-item-${i}`}
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500/25 text-brand-200">
                <LuCheck className="h-3.5 w-3.5" />
              </span>
              <span className="text-15 font-medium text-gray-100">{line}</span>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
