import { useState } from "react";
import { useNavigate } from "react-router";
import { useLanguage } from "../../hooks/useLanguage";
import {
  LuGlobe,
  LuServer,
  LuCloud,
  LuMonitor,
  LuShieldCheck,
  LuMail,
  LuSearch,
  LuCheck,
  LuArrowRight,
  LuLock,
  LuZap,
  LuHeadphones,
  LuRocket,
} from "react-icons/lu";
import { FaStar } from "react-icons/fa6";

const HERO_IMG =
  "https://images.unsplash.com/photo-1653549893012-b8b4fbe97630?auto=format&fit=crop&w=1100&q=80";
const SEC_IMG =
  "https://images.unsplash.com/photo-1555529902-5261145633bf?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=80&w=1000";

const ICON_WRAP = {
  brand: "bg-brand-50 text-brand-700 dark:bg-brand/15 dark:text-brand-200",
  teal: "bg-success-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300",
  amber: "bg-accent-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
};

const PRODUCTS = [
  { to: "/domain", icon: LuGlobe, title: "Domains", desc: "Find and register the perfect name across 500+ extensions.", price: "from $10.99/yr", color: "brand" },
  { to: "/hosting", icon: LuServer, title: "Web Hosting", desc: "Blazing-fast cPanel & Plesk hosting with free SSL.", price: "from $2.99/mo", color: "teal" },
  { to: "/vps", icon: LuCloud, title: "VPS", desc: "Scalable cloud servers deployed in seconds.", price: "from $18/mo", color: "brand" },
  { to: "/rdp", icon: LuMonitor, title: "RDP", desc: "Reliable remote desktop instances, ready to go.", price: "from $27/mo", color: "teal" },
  { to: "/ssl", icon: LuShieldCheck, title: "SSL Certificates", desc: "Trusted HTTPS encryption issued in minutes.", price: "free with hosting", color: "amber" },
  { to: "/email", icon: LuMail, title: "Email", desc: "Professional mailboxes on your own domain.", price: "from $1.49/mo", color: "amber" },
];

const TLDS = [
  { tld: ".com", price: "10.99", renew: "12.99", was: null },
  { tld: ".io", price: "29.99", renew: "44.99", was: "54.99", sale: true },
  { tld: ".net", price: "11.99", renew: "14.99", was: null },
  { tld: ".org", price: "9.99", renew: "13.99", was: null },
  { tld: ".co", price: "7.99", renew: "27.99", was: "29.99", sale: true },
  { tld: ".ai", price: "64.99", renew: "79.99", was: null },
  { tld: ".dev", price: "12.99", renew: "14.99", was: null },
  { tld: ".xyz", price: "1.99", renew: "12.99", was: "13.99", sale: true },
];

const STEPS = [
  { icon: LuGlobe, title: "Find your domain", desc: "Search thousands of extensions and lock in an honest price with free WHOIS privacy." },
  { icon: LuMail, title: "Add email & hosting", desc: "Pair your name with professional email and fast, secure web hosting in one click." },
  { icon: LuRocket, title: "Launch your site", desc: "Point your DNS, install SSL automatically and go live with confidence." },
];

const SECURITY = [
  { icon: LuLock, text: "Two-factor auth & login alerts on every account" },
  { icon: LuShieldCheck, text: "Free SSL certificate on every website" },
  { icon: LuGlobe, text: "WHOIS privacy protection included at no cost" },
  { icon: LuServer, text: "Full DNS records manager with DNSSEC" },
  { icon: LuZap, text: "Automatic backups and 99.9% uptime SLA" },
];

function Hero() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [tab, setTab] = useState("search");
  const [query, setQuery] = useState("");

  const submit = () => {
    let path = "/home";
    if (query) path += `?value=${encodeURIComponent(query.trim())}`;
    navigate(path);
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-brand-50/60 via-white to-white dark:from-gray-900 dark:via-gray-950 dark:to-gray-950">
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-brand-200/40 blur-3xl dark:bg-brand/10" />
      <div className="pointer-events-none absolute top-40 -left-24 h-72 w-72 rounded-full bg-accent-50 blur-3xl dark:bg-amber-500/5" />
      <div className="nw-container relative grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-2 lg:gap-12 lg:py-24">
        {/* Left */}
        <div>
          <span className="nw-eyebrow mb-5">Domains · Hosting · VPS · RDP</span>
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-primary dark:text-white sm:text-5xl lg:text-6xl">
            {t.home.hero.heading}
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink-soft dark:text-gray-400">{t.home.hero.subheading}</p>

          {/* Search card */}
          <div className="mt-8 rounded-2xl border border-line bg-white p-4 shadow-lg shadow-slate-200/50 dark:border-gray-800 dark:bg-gray-900 dark:shadow-black/30">
            <div className="mb-3 inline-flex rounded-lg bg-surface-2 p-1 dark:bg-gray-800">
              <button
                onClick={() => setTab("search")}
                className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${tab === "search" ? "bg-white text-primary shadow-sm dark:bg-gray-950 dark:text-white" : "text-ink-soft dark:text-gray-400"}`}
              >
                {t.home.hero.tabs.search}
              </button>
              <button
                onClick={() => setTab("transfer")}
                className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${tab === "transfer" ? "bg-white text-primary shadow-sm dark:bg-gray-950 dark:text-white" : "text-ink-soft dark:text-gray-400"}`}
              >
                {t.home.hero.tabs.transfer}
              </button>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <LuSearch className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder={t.home.hero.placeholder}
                  className="nw-input pl-11"
                  aria-label="Search for a domain"
                />
              </div>
              <button onClick={submit} className="nw-btn-primary sm:w-auto">
                <LuSearch className="h-4 w-4" />
                {tab === "search" ? t.home.hero.buttons.search : t.home.hero.buttons.transfer}
              </button>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
              {t.home.hero.features.map((f, i) => (
                <span key={i} className="flex items-center gap-1.5 text-13 font-medium text-ink-soft dark:text-gray-400">
                  <LuCheck className="h-4 w-4 text-teal-600 dark:text-teal-400" /> {f}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-5 flex items-center gap-4">
            <button onClick={() => navigate("/hosting")} className="inline-flex items-center gap-1.5 text-15 font-semibold text-brand hover:text-brand-700 dark:text-brand-200">
              {t.home.hero.needHosting} <LuArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Right visual */}
        <div className="relative">
          <div className="relative overflow-hidden rounded-3xl border border-line shadow-2xl shadow-slate-300/40 dark:border-gray-800 dark:shadow-black/50">
            <img src={HERO_IMG} alt="Global network connectivity" className="h-[320px] w-full object-cover sm:h-[420px]" loading="eager" />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-700/50 via-transparent to-transparent" />
          </div>
          {/* Floating cards */}
          <div className="absolute -bottom-5 left-4 flex items-center gap-3 rounded-2xl border border-line bg-white/95 px-4 py-3 shadow-xl backdrop-blur dark:border-gray-800 dark:bg-gray-900/95 sm:left-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-success-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
              <LuShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-primary dark:text-white">Free WHOIS privacy</p>
              <p className="text-13 text-ink-soft dark:text-gray-400">on every domain</p>
            </div>
          </div>
          <div className="absolute -top-4 right-4 hidden items-center gap-2 rounded-2xl border border-line bg-white/95 px-4 py-3 shadow-xl backdrop-blur dark:border-gray-800 dark:bg-gray-900/95 sm:flex">
            <div className="flex text-amber-400">
              {[0, 1, 2, 3, 4].map((i) => <FaStar key={i} className="h-4 w-4" />)}
            </div>
            <p className="text-sm font-bold text-primary dark:text-white">4.8/5</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustBar() {
  const items = [
    { label: "Rated Excellent", sub: "4.8 out of 5" },
    { label: "99.9% Uptime", sub: "backed by SLA" },
    { label: "24/7 Support", sub: "real humans" },
    { label: "50,000+", sub: "domains managed" },
  ];
  return (
    <section className="border-y border-line bg-surface-2 dark:border-gray-800 dark:bg-gray-900/40">
      <div className="nw-container grid grid-cols-2 gap-6 py-8 md:grid-cols-4">
        {items.map((it) => (
          <div key={it.label} className="text-center">
            <p className="text-xl font-bold text-primary dark:text-white">{it.label}</p>
            <p className="text-13 text-ink-soft dark:text-gray-400">{it.sub}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Products() {
  const navigate = useNavigate();
  return (
    <section id="products" className="nw-section">
      <div className="nw-container">
        <div className="mx-auto max-w-2xl text-center">
          <span className="nw-eyebrow mb-4">Everything to get online</span>
          <h2 className="nw-h2">One platform for your whole online presence</h2>
          <p className="nw-lead mt-4">Domains, hosting, servers, security and email — managed from a single, honest dashboard.</p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PRODUCTS.map((p) => (
            <button key={p.title} onClick={() => navigate(p.to)} className="nw-card nw-card-hover group text-left">
              <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${ICON_WRAP[p.color]}`}>
                <p.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-5 text-lg font-bold text-primary dark:text-white">{p.title}</h3>
              <p className="mt-2 text-15 text-ink-soft dark:text-gray-400">{p.desc}</p>
              <div className="mt-5 flex items-center justify-between">
                <span className="text-sm font-semibold text-primary dark:text-white">{p.price}</span>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand group-hover:gap-2 dark:text-brand-200">
                  Explore <LuArrowRight className="h-4 w-4 transition-all" />
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const navigate = useNavigate();
  return (
    <section id="pricing" className="nw-section bg-surface-2 dark:bg-gray-900/40">
      <div className="nw-container">
        <div className="mx-auto max-w-2xl text-center">
          <span className="nw-eyebrow mb-4">Transparent pricing</span>
          <h2 className="nw-h2">Honest domain prices, renewal shown upfront</h2>
          <p className="nw-lead mt-4">No teaser rates or hidden fees. What you see is what you renew.</p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TLDS.map((d) => (
            <div key={d.tld} className="nw-card nw-card-hover flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-primary dark:text-white">{d.tld}</span>
                {d.sale && <span className="nw-badge-accent">Sale</span>}
              </div>
              <div className="mt-4 flex items-end gap-2">
                {d.was && <span className="text-sm text-slate-400 line-through">${d.was}</span>}
                <span className="text-3xl font-bold text-primary dark:text-white">${d.price}</span>
                <span className="pb-1 text-13 text-ink-soft dark:text-gray-400">/yr</span>
              </div>
              <p className="mt-1 text-13 text-ink-soft dark:text-gray-500">Renews at ${d.renew}/yr</p>
              <button onClick={() => navigate("/domain")} className="nw-btn-secondary nw-btn-sm mt-5 w-full">Register</button>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <button onClick={() => navigate("/home")} className="nw-btn-primary">
            <LuSearch className="h-4 w-4" /> Search your domain
          </button>
        </div>
      </div>
    </section>
  );
}

function ThreeSteps() {
  return (
    <section className="nw-section">
      <div className="nw-container">
        <div className="mx-auto max-w-2xl text-center">
          <span className="nw-eyebrow mb-4">Simple by design</span>
          <h2 className="nw-h2">Get online in 3 easy steps</h2>
        </div>
        <div className="relative mt-12 grid gap-8 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="relative text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand/15 dark:text-brand-200">
                <s.icon className="h-7 w-7" />
              </div>
              <div className="mx-auto mt-4 flex h-7 w-7 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">{i + 1}</div>
              <h3 className="mt-4 text-lg font-bold text-primary dark:text-white">{s.title}</h3>
              <p className="mx-auto mt-2 max-w-xs text-15 text-ink-soft dark:text-gray-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Security() {
  return (
    <section id="security" className="nw-section bg-surface-2 dark:bg-gray-900/40">
      <div className="nw-container grid items-center gap-12 lg:grid-cols-2">
        <div className="relative order-2 lg:order-1">
          <div className="overflow-hidden rounded-3xl border border-line shadow-xl dark:border-gray-800">
            <img src={SEC_IMG} alt="Security and encryption" className="h-[360px] w-full object-cover" loading="lazy" />
          </div>
        </div>
        <div className="order-1 lg:order-2">
          <span className="nw-eyebrow mb-4">Security & trust</span>
          <h2 className="nw-h2">Your business, protected by default</h2>
          <p className="nw-lead mt-4">Enterprise-grade security comes standard — no upsells, no surprises.</p>
          <ul className="mt-8 space-y-4">
            {SECURITY.map((s) => (
              <li key={s.text} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
                  <LuCheck className="h-4 w-4" />
                </span>
                <span className="text-15 font-medium text-primary dark:text-gray-200">{s.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Rewards() {
  const navigate = useNavigate();
  return (
    <section className="nw-section">
      <div className="nw-container">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand to-brand-600 px-8 py-12 text-white sm:px-12">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          <div className="relative grid items-center gap-8 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider">Rewards</span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Spend $1, earn 1 point. Redeem for real savings.</h2>
              <p className="mt-3 max-w-lg text-white/80">Every purchase — domains, hosting, servers — earns reward points you can put straight back toward renewals and upgrades.</p>
              <button onClick={() => navigate("/create-account")} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-brand-700 hover:bg-brand-50">
                Create a free account <LuArrowRight className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: LuZap, label: "Instant points" },
                { icon: LuHeadphones, label: "Priority support" },
                { icon: LuShieldCheck, label: "Free privacy" },
                { icon: LuRocket, label: "Faster checkout" },
              ].map((b) => (
                <div key={b.label} className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-4 backdrop-blur">
                  <b.icon className="h-6 w-6" />
                  <span className="text-sm font-semibold">{b.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const submit = () => navigate(query ? `/home?value=${encodeURIComponent(query.trim())}` : "/home");
  return (
    <section className="nw-section pt-0">
      <div className="nw-container">
        <div className="rounded-3xl border border-line bg-surface-2 px-6 py-14 text-center dark:border-gray-800 dark:bg-gray-900/40 sm:px-12">
          <h2 className="nw-h2">Ready to claim your name?</h2>
          <p className="nw-lead mx-auto mt-4 max-w-xl">Search for the perfect domain and get online in minutes.</p>
          <div className="mx-auto mt-8 flex max-w-lg flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <LuSearch className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="yourbrand.com"
                className="nw-input pl-11"
                aria-label="Search for a domain"
              />
            </div>
            <button onClick={submit} className="nw-btn-primary">Search Now</button>
          </div>
        </div>
      </div>
    </section>
  );
}

const HomeRedesign = () => (
  <>
    <Hero />
    <TrustBar />
    <Products />
    <Pricing />
    <ThreeSteps />
    <Security />
    <Rewards />
    <FinalCta />
  </>
);

export default HomeRedesign;
