import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import { useLanguage } from "../../hooks/useLanguage";
import { useAuth } from "../../hooks/useAuth";
import { usePageMeta } from "../../hooks/usePageMeta";
import { IMAGES } from "../marketing/marketing-ui";
import DomainSearchResults from "../domain/DomainSearchResults";
import {
  LuGlobe,
  LuNetwork,
  LuServer,
  LuCloud,
  LuMonitor,
  LuMail,
  LuCode,
  LuSearch,
  LuCheck,
  LuArrowRight,
  LuLock,
  LuKeyRound,
  LuWallet,
  LuMapPin,
  LuTerminal,
  LuShieldCheck,
  LuGift,
  LuBadgeCheck,
  LuLayers,
  LuEyeOff,
} from "react-icons/lu";

const PRODUCT_ORDER = [
  { key: "domains", to: "/domains", icon: LuGlobe },
  { key: "dns", to: "/dns-manager", icon: LuNetwork, protectedRoute: true },
  { key: "hosting", to: "/hosting", icon: LuServer },
  { key: "vps", to: "/vps", icon: LuCloud },
  { key: "rdp", to: "/rdp", icon: LuMonitor },
  { key: "email", to: "/email", icon: LuMail },
  { key: "api", to: "/api", icon: LuCode, wide: true },
];

const PILLAR_ICONS = [LuMapPin, LuEyeOff, LuKeyRound, LuWallet, LuTerminal];
const STEP_ICONS = [LuGlobe, LuWallet, LuKeyRound];
const PERK_ICONS = [LuGift, LuBadgeCheck, LuLayers, LuEyeOff];

// Static reference prices shown on the homepage; the /pricing page shows live per-TLD prices.
const TLDS = [
  { tld: ".com", price: "39", renew: "39" },
  { tld: ".net", price: "51", renew: "51" },
  { tld: ".org", price: "29", renew: "29" },
  { tld: ".io", price: "244", renew: "244" },
  { tld: ".co", price: "59", renew: "59" },
  { tld: ".xyz", price: "19", renew: "19" },
  { tld: ".shop", price: "30", renew: "30" },
  { tld: ".store", price: "160", renew: "160" },
];

function Hero() {
  const { t } = useLanguage();
  const s = t.site.home;
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const resultsRef = useRef(null);

  const submit = () => {
    const q = query.trim();
    if (!q) return;
    setSubmitted(q);
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
  };

  return (
    <section className="nw-hero">
      <div className="absolute inset-0 nw-grid-bg opacity-70 dark:opacity-100" />
      <div className="nw-hero-glow -top-32 -right-24 h-96 w-96" />
      <div className="nw-hero-glow top-64 -left-32 h-80 w-80 opacity-60" />
      <div className="nw-container relative grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-2 lg:gap-12 lg:py-24">
        {/* Left */}
        <div>
          <span className="nw-eyebrow mb-5"><LuLock className="h-3.5 w-3.5" /> {s.eyebrow}</span>
          <h1 className="text-4xl font-bold leading-[1.08] tracking-tight text-primary dark:text-white sm:text-5xl lg:text-6xl">
            {s.heading}
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink-soft dark:text-gray-400">{s.subheading}</p>

          {/* Search card */}
          <div className="mt-8 rounded-2xl border border-line bg-white p-4 shadow-lg shadow-slate-200/50 dark:border-white/[0.08] dark:bg-gray-900 dark:shadow-black/40">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <LuSearch className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder={s.placeholder}
                  className="nw-input pl-11"
                  aria-label="Search for a domain"
                  data-testid="hero-domain-input"
                />
              </div>
              <button onClick={submit} className="nw-btn-primary sm:w-auto" data-testid="hero-search-button">
                <LuSearch className="h-4 w-4" />
                {s.searchBtn}
              </button>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
              {s.heroChips.map((f) => (
                <span key={f} className="flex items-center gap-1.5 text-13 font-medium text-ink-soft dark:text-gray-400">
                  <LuCheck className="h-4 w-4 text-brand-600 dark:text-brand-400" /> {f}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-5 flex items-center gap-4">
            <button onClick={() => navigate("/vps")} className="inline-flex items-center gap-1.5 text-15 font-semibold text-brand-700 hover:text-brand-800 dark:text-brand-300 dark:hover:text-brand-200">
              {s.needServers} <LuArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Right visual */}
        <div className="relative">
          <div className="relative overflow-hidden rounded-3xl border border-line shadow-2xl shadow-slate-300/40 dark:border-white/[0.08] dark:shadow-black/60">
            <img src={IMAGES.hero} alt="Data centre corridor at night" className="h-[320px] w-full object-cover sm:h-[440px]" loading="eager" />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950/85 via-gray-950/30 to-transparent" />
            <div className="absolute inset-0 ring-1 ring-inset ring-brand/20" />
            <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between text-white">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-300">{t.site.servers.regionLabel}</p>
                <p className="text-sm font-semibold">EU · SG</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/15 px-3 py-1 text-xs font-semibold text-brand-200">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-400" /> TLS
              </span>
            </div>
          </div>
          {/* Floating cards */}
          <div className="absolute -bottom-5 left-4 flex items-center gap-3 rounded-2xl border border-line bg-white/95 px-4 py-3 shadow-xl backdrop-blur dark:border-white/[0.08] dark:bg-gray-900/95 sm:left-6">
            <span className="nw-icon h-10 w-10 rounded-full">
              <LuShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-primary dark:text-white">{s.heroFloat.title}</p>
              <p className="text-13 text-ink-soft dark:text-gray-400">{s.heroFloat.sub}</p>
            </div>
          </div>
          <div className="absolute -top-4 right-4 hidden items-center gap-3 rounded-2xl border border-line bg-white/95 px-4 py-3 shadow-xl backdrop-blur dark:border-white/[0.08] dark:bg-gray-900/95 sm:flex">
            <span className="nw-icon h-10 w-10 rounded-full">
              <LuMapPin className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-primary dark:text-white">{s.heroFloat2.title}</p>
              <p className="text-13 text-ink-soft dark:text-gray-400">{s.heroFloat2.sub}</p>
            </div>
          </div>
        </div>
      </div>

      {submitted && (
        <div ref={resultsRef} className="nw-container relative scroll-mt-24 pb-16">
          <DomainSearchResults query={submitted} />
        </div>
      )}
    </section>
  );
}

function TrustBar() {
  const { t } = useLanguage();
  return (
    <section className="border-y border-line bg-surface-2 dark:border-white/[0.06] dark:bg-gray-900/50">
      <div className="nw-container grid grid-cols-2 gap-6 py-8 md:grid-cols-4">
        {t.site.home.trust.map((it) => (
          <div key={it.label} className="text-center">
            <p className="text-xl font-bold text-primary dark:text-white">{it.label}</p>
            <p className="text-13 text-ink-soft dark:text-gray-400">{it.sub}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Pillars() {
  const { t } = useLanguage();
  const s = t.site.home.pillars;
  return (
    <section id="why" className="nw-section">
      <div className="nw-container">
        <div className="mx-auto max-w-2xl text-center">
          <span className="nw-eyebrow mb-4">{s.eyebrow}</span>
          <h2 className="nw-h2">{s.title}</h2>
          <p className="nw-lead mt-4">{s.lead}</p>
        </div>
        {/* 2 wide + 3 regular cards keeps the five pillars balanced on large screens */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-6">
          {s.items.map((p, i) => {
            const Icon = PILLAR_ICONS[i] || LuShieldCheck;
            const span = i < 2 ? "lg:col-span-3" : "lg:col-span-2";
            return (
              <div key={p.title} className={`nw-card nw-card-hover ${span}`} data-testid={`pillar-${i}`}>
                <span className="nw-icon h-12 w-12"><Icon className="h-6 w-6" /></span>
                <h3 className="mt-5 text-lg font-bold text-primary dark:text-white">{p.title}</h3>
                <p className="mt-2 text-15 text-ink-soft dark:text-gray-400">{p.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Products() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const s = t.site.home.products;
  const navigate = useNavigate();
  const go = (p) => {
    if (p.protectedRoute && !user) {
      localStorage.setItem("path", p.to);
      navigate("/sign-in");
      return;
    }
    navigate(p.to);
  };
  return (
    <section id="products" className="nw-section bg-surface-2 dark:bg-gray-900/40">
      <div className="nw-container">
        <div className="mx-auto max-w-2xl text-center">
          <span className="nw-eyebrow mb-4">{s.eyebrow}</span>
          <h2 className="nw-h2">{s.title}</h2>
          <p className="nw-lead mt-4">{s.lead}</p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PRODUCT_ORDER.map((p) => {
            const item = s.items[p.key];
            return (
              <button
                key={p.key}
                onClick={() => go(p)}
                className={`nw-card nw-card-hover group flex flex-col items-stretch text-left ${p.wide ? "sm:col-span-2 lg:col-span-3 lg:flex-row lg:items-center lg:gap-6" : ""}`}
                data-testid={`product-card-${p.key}`}
              >
                <span className="nw-icon h-12 w-12"><p.icon className="h-6 w-6" /></span>
                <div className={p.wide ? "mt-5 lg:mt-0 lg:flex-1" : "mt-5"}>
                  <h3 className="text-lg font-bold text-primary dark:text-white">{item.title}</h3>
                  <p className="mt-2 text-15 text-ink-soft dark:text-gray-400">{item.desc}</p>
                </div>
                <div className={`flex items-center justify-between gap-6 ${p.wide ? "mt-5 lg:mt-0 lg:flex-col lg:items-end lg:gap-2" : "mt-auto pt-5"}`}>
                  <span className="text-sm font-semibold text-primary dark:text-white">{item.price}</span>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 group-hover:gap-2 dark:text-brand-300">
                    {s.explore} <LuArrowRight className="h-4 w-4 transition-all" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const { t } = useLanguage();
  const s = t.site.home.pricing;
  const navigate = useNavigate();
  return (
    <section id="pricing" className="nw-section">
      <div className="nw-container">
        <div className="mx-auto max-w-2xl text-center">
          <span className="nw-eyebrow mb-4">{s.eyebrow}</span>
          <h2 className="nw-h2">{s.title}</h2>
          <p className="nw-lead mt-4">{s.lead}</p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TLDS.map((d) => (
            <div key={d.tld} className="nw-card nw-card-hover flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-primary dark:text-white">{d.tld}</span>
                <span className="nw-badge-brand"><LuShieldCheck className="h-3 w-3" /> WHOIS</span>
              </div>
              <div className="mt-4 flex items-end gap-2">
                <span className="text-3xl font-bold text-primary dark:text-white">${d.price}</span>
                <span className="pb-1 text-13 text-ink-soft dark:text-gray-400">{s.perYear}</span>
              </div>
              <p className="mt-1 text-13 text-ink-soft dark:text-gray-500">{s.renews} ${d.renew}{s.perYear}</p>
              <button onClick={() => navigate(`/domains?value=${encodeURIComponent("yourname" + d.tld)}`)} className="nw-btn-secondary nw-btn-sm mt-5 w-full">{s.register}</button>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <button onClick={() => navigate("/domains")} className="nw-btn-primary">
            <LuSearch className="h-4 w-4" /> {s.searchCta}
          </button>
          <button onClick={() => navigate("/pricing")} className="nw-btn-secondary">{s.fullTable}</button>
        </div>
      </div>
    </section>
  );
}

function ThreeSteps() {
  const { t } = useLanguage();
  const s = t.site.home.steps;
  return (
    <section className="nw-section bg-surface-2 dark:bg-gray-900/40">
      <div className="nw-container">
        <div className="mx-auto max-w-2xl text-center">
          <span className="nw-eyebrow mb-4">{s.eyebrow}</span>
          <h2 className="nw-h2">{s.title}</h2>
        </div>
        <div className="relative mt-12 grid gap-8 md:grid-cols-3">
          {s.items.map((step, i) => {
            const Icon = STEP_ICONS[i] || LuCheck;
            return (
              <div key={step.title} className="relative text-center">
                <div className="nw-icon mx-auto h-16 w-16 rounded-2xl"><Icon className="h-7 w-7" /></div>
                <div className="mx-auto mt-4 flex h-7 w-7 items-center justify-center rounded-full bg-brand text-sm font-bold text-on-brand">{i + 1}</div>
                <h3 className="mt-4 text-lg font-bold text-primary dark:text-white">{step.title}</h3>
                <p className="mx-auto mt-2 max-w-xs text-15 text-ink-soft dark:text-gray-400">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Privacy() {
  const { t } = useLanguage();
  const s = t.site.home.privacy;
  return (
    <section id="privacy" className="nw-section">
      <div className="nw-container grid items-center gap-12 lg:grid-cols-2">
        <div className="relative order-2 lg:order-1">
          <div className="relative overflow-hidden rounded-3xl border border-line shadow-xl dark:border-white/[0.08] dark:shadow-black/50">
            <img src={IMAGES.privacy} alt="Abstract encrypted network" className="h-[360px] w-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-gray-950/20 to-transparent" />
            <div className="absolute inset-0 ring-1 ring-inset ring-brand/20" />
            <div className="absolute bottom-5 left-5 flex items-center gap-2 rounded-full border border-brand/40 bg-gray-950/70 px-3 py-1.5 text-xs font-semibold text-brand-200 backdrop-blur">
              <LuLock className="h-3.5 w-3.5" /> {s.eyebrow}
            </div>
          </div>
        </div>
        <div className="order-1 lg:order-2">
          <span className="nw-eyebrow mb-4">{s.eyebrow}</span>
          <h2 className="nw-h2">{s.title}</h2>
          <p className="nw-lead mt-4">{s.lead}</p>
          <ul className="mt-8 space-y-4">
            {s.items.map((line) => (
              <li key={line} className="flex items-start gap-3">
                <span className="nw-icon mt-0.5 h-6 w-6 rounded-full"><LuCheck className="h-4 w-4" /></span>
                <span className="text-15 font-medium text-primary dark:text-gray-200">{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Loyalty() {
  const { t } = useLanguage();
  const s = t.site.home.loyalty;
  const navigate = useNavigate();
  return (
    <section className="nw-section pt-0">
      <div className="nw-container">
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gray-950 px-8 py-12 text-white sm:px-12">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-950 to-brand-900/50" />
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand/20 blur-3xl" />
          <div className="relative grid items-center gap-8 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-200">
                <LuGift className="h-3.5 w-3.5" /> {s.badge}
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{s.title}</h2>
              <p className="mt-3 max-w-lg text-gray-300">{s.desc}</p>
              <button onClick={() => navigate("/create-account")} className="nw-btn-primary mt-6">
                {s.cta} <LuArrowRight className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {s.perks.map((label, i) => {
                const Icon = PERK_ICONS[i] || LuCheck;
                return (
                  <div key={label} className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-4 backdrop-blur">
                    <Icon className="h-6 w-6 text-brand-300" />
                    <span className="text-sm font-semibold">{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  const { t } = useLanguage();
  const s = t.site.home.cta;
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const resultsRef = useRef(null);
  const submit = () => {
    const q = query.trim();
    if (!q) return;
    setSubmitted(q);
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
  };
  return (
    <section className="nw-section pt-0">
      <div className="nw-container">
        <div className="relative overflow-hidden rounded-3xl border border-line bg-surface-2 px-6 py-14 text-center dark:border-white/[0.08] dark:bg-gray-900 sm:px-12">
          <img src={IMAGES.harbour} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-0 dark:opacity-30" loading="lazy" />
          <div className="absolute inset-0 hidden bg-gradient-to-b from-gray-950/70 via-gray-950/60 to-gray-950/90 dark:block" />
          <div className="relative">
            <h2 className="nw-h2">{s.title}</h2>
            <p className="nw-lead mx-auto mt-4 max-w-xl dark:text-gray-300">{s.lead}</p>
            <div className="mx-auto mt-8 flex max-w-lg flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <LuSearch className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder={s.placeholder}
                  className="nw-input pl-11"
                  aria-label="Search for a domain"
                />
              </div>
              <button onClick={submit} className="nw-btn-primary">{s.button}</button>
            </div>
          </div>
        </div>
        {submitted && (
          <div ref={resultsRef} className="scroll-mt-24 pt-10">
            <DomainSearchResults query={submitted} />
          </div>
        )}
      </div>
    </section>
  );
}

const HomeRedesign = () => {
  const { t } = useLanguage();
  usePageMeta(null, t.site.meta.description);
  return (
    <>
      <Hero />
      <TrustBar />
      <Pillars />
      <Products />
      <Pricing />
      <ThreeSteps />
      <Privacy />
      <Loyalty />
      <FinalCta />
    </>
  );
};

export default HomeRedesign;
