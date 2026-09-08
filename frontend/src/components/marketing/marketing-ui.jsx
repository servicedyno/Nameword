import { useState } from "react";
import { NavLink } from "react-router";
import { LuCheck, LuArrowRight, LuChevronDown } from "react-icons/lu";

const ICON_WRAP = {
  brand: "bg-brand-50 text-brand-700 dark:bg-brand/15 dark:text-brand-200",
  teal: "bg-success-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300",
  amber: "bg-accent-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
};

export function ProductHero({ eyebrow, title, subtitle, primaryTo, primaryLabel, secondaryTo, secondaryLabel, image, imageAlt, floatBadge, tone = "brand" }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-brand-50/60 via-white to-white dark:from-gray-900 dark:via-gray-950 dark:to-gray-950">
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-brand-200/40 blur-3xl dark:bg-brand/10" />
      <div className="nw-container relative grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-2 lg:gap-12 lg:py-24">
        <div>
          <span className="nw-eyebrow mb-5">{eyebrow}</span>
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-primary dark:text-white sm:text-5xl">{title}</h1>
          <p className="mt-5 max-w-xl text-lg text-ink-soft dark:text-gray-400">{subtitle}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {primaryTo && <NavLink to={primaryTo} className="nw-btn-primary">{primaryLabel} <LuArrowRight className="h-4 w-4" /></NavLink>}
            {secondaryTo && <NavLink to={secondaryTo} className="nw-btn-secondary">{secondaryLabel}</NavLink>}
          </div>
        </div>
        <div className="relative">
          <div className="relative overflow-hidden rounded-3xl border border-line shadow-2xl shadow-slate-300/40 dark:border-gray-800 dark:shadow-black/50">
            <img src={image} alt={imageAlt} className="h-[320px] w-full object-cover sm:h-[420px]" loading="eager" />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-700/40 via-transparent to-transparent" />
          </div>
          {floatBadge && (
            <div className="absolute -bottom-5 left-4 flex items-center gap-3 rounded-2xl border border-line bg-white/95 px-4 py-3 shadow-xl backdrop-blur dark:border-gray-800 dark:bg-gray-900/95 sm:left-6">
              <span className={`flex h-10 w-10 items-center justify-center rounded-full ${ICON_WRAP[tone]}`}>
                <floatBadge.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-primary dark:text-white">{floatBadge.title}</p>
                <p className="text-13 text-ink-soft dark:text-gray-400">{floatBadge.sub}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function SectionHeading({ eyebrow, title, subtitle }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      {eyebrow && <span className="nw-eyebrow mb-4">{eyebrow}</span>}
      <h2 className="nw-h2">{title}</h2>
      {subtitle && <p className="nw-lead mt-4">{subtitle}</p>}
    </div>
  );
}

export function FeatureGrid({ items, tone = "brand" }) {
  return (
    <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((it) => (
        <div key={it.title} className="nw-card nw-card-hover">
          <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${ICON_WRAP[it.tone || tone]}`}>
            <it.icon className="h-6 w-6" />
          </span>
          <h3 className="mt-5 text-lg font-bold text-primary dark:text-white">{it.title}</h3>
          <p className="mt-2 text-15 text-ink-soft dark:text-gray-400">{it.desc}</p>
        </div>
      ))}
    </div>
  );
}

export function PricingTiers({ tiers }) {
  return (
    <div className="mt-12 grid gap-6 md:grid-cols-3">
      {tiers.map((tier) => (
        <div
          key={tier.name}
          className={`relative flex flex-col rounded-2xl border p-6 transition-all duration-200 ${tier.highlighted ? "border-brand shadow-xl shadow-brand/10 dark:border-brand" : "border-line dark:border-gray-800"} bg-white dark:bg-gray-900`}
        >
          {tier.highlighted && (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">Most popular</span>
          )}
          <h3 className="text-lg font-bold text-primary dark:text-white">{tier.name}</h3>
          <p className="mt-1 text-13 text-ink-soft dark:text-gray-400">{tier.desc}</p>
          <div className="mt-4 flex items-end gap-1">
            <span className="text-4xl font-bold text-primary dark:text-white">{tier.price}</span>
            {tier.period && <span className="pb-1.5 text-13 text-ink-soft dark:text-gray-400">{tier.period}</span>}
          </div>
          <ul className="mt-6 flex-1 space-y-3">
            {tier.features.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-15 text-primary dark:text-gray-300">
                <LuCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" /> {f}
              </li>
            ))}
          </ul>
          <NavLink to={tier.to || "/create-account"} className={`mt-6 w-full ${tier.highlighted ? "nw-btn-primary" : "nw-btn-secondary"}`}>{tier.cta || "Get started"}</NavLink>
        </div>
      ))}
    </div>
  );
}

export function Steps({ steps }) {
  return (
    <div className="mt-12 grid gap-8 md:grid-cols-3">
      {steps.map((s, i) => (
        <div key={s.title} className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand/15 dark:text-brand-200">
            <s.icon className="h-7 w-7" />
          </div>
          <div className="mx-auto mt-4 flex h-7 w-7 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">{i + 1}</div>
          <h3 className="mt-4 text-lg font-bold text-primary dark:text-white">{s.title}</h3>
          <p className="mx-auto mt-2 max-w-xs text-15 text-ink-soft dark:text-gray-400">{s.desc}</p>
        </div>
      ))}
    </div>
  );
}

export function Faq({ items }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="mx-auto mt-10 max-w-3xl divide-y divide-line rounded-2xl border border-line bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
      {items.map((it, i) => (
        <div key={it.q}>
          <button
            onClick={() => setOpen(open === i ? -1 : i)}
            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            aria-expanded={open === i}
          >
            <span className="text-15 font-semibold text-primary dark:text-white">{it.q}</span>
            <LuChevronDown className={`h-5 w-5 shrink-0 text-ink-soft transition-transform ${open === i ? "rotate-180" : ""}`} />
          </button>
          {open === i && <p className="px-5 pb-5 text-15 text-ink-soft dark:text-gray-400">{it.a}</p>}
        </div>
      ))}
    </div>
  );
}

export function CtaBand({ title, subtitle, primaryTo = "/create-account", primaryLabel = "Get started", secondaryTo, secondaryLabel }) {
  return (
    <section className="nw-section">
      <div className="nw-container">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand to-brand-600 px-8 py-14 text-center text-white sm:px-12">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
            {subtitle && <p className="mx-auto mt-4 max-w-xl text-white/80">{subtitle}</p>}
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <NavLink to={primaryTo} className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-brand-700 hover:bg-brand-50">{primaryLabel} <LuArrowRight className="h-4 w-4" /></NavLink>
              {secondaryTo && <NavLink to={secondaryTo} className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">{secondaryLabel}</NavLink>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
