import ProductShell from "../components/layout/ProductShell";
import { ProductHero, SectionHeading, FeatureGrid, Steps, CtaBand, IMAGES } from "../components/marketing/marketing-ui";
import { LuGlobe, LuNetwork, LuCloud, LuServer, LuWallet, LuShoppingCart, LuUserPlus, LuKeyRound, LuTerminal, LuCode, LuCheck } from "react-icons/lu";
import { useLanguage } from "../hooks/useLanguage";
import { useAuth } from "../hooks/useAuth";
import { usePageMeta } from "../hooks/usePageMeta";
import CopyButton from "../components/common/CopyButton";

const GROUP_ICONS = [LuGlobe, LuNetwork, LuCloud, LuServer, LuWallet, LuShoppingCart];
const STEP_ICONS = [LuUserPlus, LuKeyRound, LuTerminal];

const API_BASE = `${import.meta.env.VITE_API_BASE_URL || ""}/api/v1`;

export default function Api() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const s = t.site.api;
  usePageMeta(s.eyebrow, s.subtitle);

  const keysTo = user ? "/account-setting?tab=api-key" : "/sign-in";
  const rememberKeys = () => { if (!user) localStorage.setItem("path", "/account-setting?tab=api-key"); };

  const groups = s.groups.map((g, i) => ({ ...g, icon: GROUP_ICONS[i] || LuCode }));
  const steps = s.keySteps.map((st, i) => ({ ...st, icon: STEP_ICONS[i] || LuCheck }));

  const curl = `curl -s ${API_BASE}/wallet \\
  -H "x-api-key: <userId>|<apiKey>" \\
  -H "Accept: application/json"`;

  return (
    <ProductShell>
      <div onClickCapture={rememberKeys}>
        <ProductHero
          eyebrow={s.eyebrow}
          title={s.title}
          subtitle={s.subtitle}
          primaryTo={keysTo}
          primaryLabel={s.primary}
          secondaryTo={user ? "/dashboard" : "/sign-in"}
          secondaryLabel={user ? t.site.app.rail.overview : s.secondary}
          image={IMAGES.api}
          imageAlt="Source code on a dark screen"
          floatBadge={{ icon: LuKeyRound, title: s.float.title, sub: s.float.sub }}
          chips={[s.notes[0], s.notes[2]]}
        />
      </div>

      <section className="nw-section">
        <div className="nw-container">
          <SectionHeading eyebrow={s.whatEyebrow} title={s.whatTitle} subtitle={s.whatLead} />
          <FeatureGrid items={groups} />
        </div>
      </section>

      <section className="nw-section bg-surface-2 dark:bg-gray-900/40">
        <div className="nw-container">
          <SectionHeading eyebrow={s.keysEyebrow} title={s.keysTitle} />
          <Steps steps={steps} />
        </div>
      </section>

      <section className="nw-section">
        <div className="nw-container grid items-start gap-10 lg:grid-cols-2">
          <div>
            <span className="nw-eyebrow mb-4">{s.authEyebrow}</span>
            <h2 className="nw-h2">{s.authTitle}</h2>
            <p className="nw-lead mt-4">{s.authLead}</p>
            <ul className="mt-8 space-y-3">
              {s.notes.map((n) => (
                <li key={n} className="flex items-start gap-3 text-15 text-primary dark:text-gray-200">
                  <span className="nw-icon mt-0.5 h-6 w-6 rounded-full"><LuCheck className="h-4 w-4" /></span>
                  {n}
                </li>
              ))}
            </ul>
          </div>
          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gray-950 text-sm shadow-2xl shadow-black/40">
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-brand-400/80" />
              <span className="ml-3 text-xs font-medium text-gray-400">{s.example}</span>
            </div>
            <div className="space-y-4 p-5 font-mono text-[13px] leading-relaxed text-gray-200">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500">{s.baseUrl}</p>
                <p className="mt-1 break-all text-brand-300" data-testid="api-base-url">{API_BASE}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500">{s.header}</p>
                <p className="mt-1"><span className="text-brand-300">x-api-key</span>: <span className="text-gray-400">&lt;userId&gt;|&lt;apiKey&gt;</span></p>
              </div>
              <div className="relative">
                <CopyButton text={curl} label="Copy" className="absolute right-2 top-2" testid="copy-api-snippet-btn" />
                <pre className="overflow-x-auto whitespace-pre rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 pr-24 text-gray-200">{curl}</pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div onClickCapture={rememberKeys}>
        <CtaBand title={s.ctaTitle} subtitle={s.ctaLead} primaryTo={keysTo} primaryLabel={s.ctaPrimary} secondaryTo="/pricing" secondaryLabel={s.ctaSecondary} image={IMAGES.harbour} />
      </div>
    </ProductShell>
  );
}
