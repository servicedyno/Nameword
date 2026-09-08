import MainLayout from "../layouts/MainLayout";
import { ProductHero, SectionHeading, FeatureGrid, PricingTiers, Faq, CtaBand, IMAGES } from "../components/marketing/marketing-ui";
import { LuMail, LuAtSign, LuLock, LuSmartphone, LuShieldCheck, LuEyeOff, LuHardDrive } from "react-icons/lu";
import { useLanguage } from "../hooks/useLanguage";
import { usePageMeta } from "../hooks/usePageMeta";

const FEATURE_ICONS = [LuAtSign, LuLock, LuSmartphone, LuShieldCheck, LuEyeOff, LuHardDrive];

export default function Email() {
  const { t } = useLanguage();
  const s = t.site.email;
  usePageMeta(s.eyebrow, s.subtitle);

  const features = s.features.map((f, i) => ({ ...f, icon: FEATURE_ICONS[i] || LuMail }));

  return (
    <MainLayout fluid>
      <ProductHero
        eyebrow={s.eyebrow}
        title={s.title}
        subtitle={s.subtitle}
        primaryTo="/create-account"
        primaryLabel={s.primary}
        secondaryTo="/domain"
        secondaryLabel={s.secondary}
        image={IMAGES.email}
        imageAlt="Server wall with blue status lights"
        floatBadge={{ icon: LuMail, title: s.float.title, sub: s.float.sub }}
        chips={[s.features[1].title, s.features[2].title, s.features[4].title]}
      />

      <section className="nw-section">
        <div className="nw-container">
          <SectionHeading eyebrow={s.featuresEyebrow} title={s.featuresTitle} subtitle={s.featuresLead} />
          <FeatureGrid items={features} />
        </div>
      </section>

      <section className="nw-section bg-surface-2 dark:bg-gray-900/40">
        <div className="nw-container">
          <SectionHeading eyebrow={s.pricingEyebrow} title={s.pricingTitle} subtitle={s.pricingLead} />
          <PricingTiers tiers={s.tiers} />
        </div>
      </section>

      <section className="nw-section">
        <div className="nw-container">
          <SectionHeading eyebrow={s.faqEyebrow} title={s.faqTitle} />
          <Faq items={s.faqs} />
        </div>
      </section>

      <CtaBand title={s.ctaTitle} subtitle={s.ctaLead} primaryTo="/create-account" primaryLabel={s.primary} secondaryTo="/domain" secondaryLabel={s.secondary} image={IMAGES.harbour} />
    </MainLayout>
  );
}
