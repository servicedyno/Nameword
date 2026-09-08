import MainLayout from "../layouts/MainLayout";
import { ProductHero, SectionHeading, FeatureGrid, PricingTiers, Steps, Faq, CtaBand } from "../components/marketing/marketing-ui";
import { LuShieldCheck, LuLock, LuGlobe, LuRefreshCw, LuTrendingUp, LuBadgeCheck, LuMousePointerClick, LuSearchCheck } from "react-icons/lu";

const SSL_IMG = "https://images.unsplash.com/photo-1555529902-5261145633bf?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=80&w=1000";

const FEATURES = [
  { icon: LuLock, title: "256-bit encryption", desc: "Bank-grade TLS encryption secures every connection to your site.", tone: "brand" },
  { icon: LuBadgeCheck, title: "Browser-trusted CA", desc: "Certificates recognised by all major browsers and devices.", tone: "teal" },
  { icon: LuGlobe, title: "Wildcard & multi-domain", desc: "Secure a single site, all subdomains, or many domains at once.", tone: "brand" },
  { icon: LuRefreshCw, title: "Auto-install & renew", desc: "One-click install and hands-off renewals so you never expire.", tone: "teal" },
  { icon: LuTrendingUp, title: "SEO & speed boost", desc: "HTTPS is a ranking signal and unlocks HTTP/2 performance.", tone: "amber" },
  { icon: LuShieldCheck, title: "Money-back guarantee", desc: "Not happy? Get a full refund within 30 days, no questions asked.", tone: "amber" },
];

const TIERS = [
  { name: "Domain SSL", desc: "For a single website", price: "$8.99", period: "/yr", features: ["1 domain secured", "Domain validation (DV)", "Issued in minutes", "Free reissues", "$10,000 warranty"], cta: "Secure my site", to: "/create-account" },
  { name: "Wildcard SSL", desc: "For a site + all subdomains", price: "$59.99", period: "/yr", highlighted: true, features: ["Unlimited subdomains", "Domain validation (DV)", "Auto-install & renew", "Free reissues", "$100,000 warranty"], cta: "Get Wildcard", to: "/create-account" },
  { name: "Business OV", desc: "For organisations", price: "$89.99", period: "/yr", features: ["Organisation validation", "Higher trust indicators", "Priority validation support", "Free reissues", "$250,000 warranty"], cta: "Talk to sales", to: "/help-support" },
];

const STEPS = [
  { icon: LuMousePointerClick, title: "Choose a certificate", desc: "Pick the SSL that fits your site — single, wildcard or organisation." },
  { icon: LuSearchCheck, title: "Validate ownership", desc: "Verify your domain in a couple of clicks. We guide you all the way." },
  { icon: LuShieldCheck, title: "Install & relax", desc: "One-click install on your hosting, with automatic renewals forever." },
];

const FAQS = [
  { q: "What is an SSL certificate?", a: "An SSL/TLS certificate encrypts the connection between your visitors and your website, shown by the padlock and https:// in the browser. It protects data and builds trust." },
  { q: "How fast is it issued?", a: "Domain-validated (DV) certificates are typically issued within minutes once validation is complete. Organisation (OV) certificates take a little longer due to extra checks." },
  { q: "Do you offer free SSL with hosting?", a: "Yes — every Nameword hosting plan includes a free auto-renewing SSL certificate. Paid certificates add higher warranties and organisation validation." },
  { q: "Can I secure subdomains?", a: "A Wildcard SSL secures your main domain and unlimited subdomains (e.g. blog.yoursite.com, shop.yoursite.com) with a single certificate." },
];

export default function Ssl() {
  return (
    <MainLayout fluid>
      <ProductHero
        eyebrow="SSL Certificates"
        title="Secure every site with trusted SSL"
        subtitle="Encrypt your traffic, earn the browser padlock and win customer trust — with certificates that install in minutes and renew automatically."
        primaryTo="/create-account"
        primaryLabel="Get SSL now"
        secondaryTo="/help-support"
        secondaryLabel="Talk to an expert"
        image={SSL_IMG}
        imageAlt="Padlock representing SSL encryption"
        floatBadge={{ icon: LuShieldCheck, title: "HTTPS in minutes", sub: "auto-install & renew" }}
        tone="brand"
      />

      <section className="nw-section">
        <div className="nw-container">
          <SectionHeading eyebrow="Why Nameword SSL" title="Trust that pays for itself" subtitle="Everything you need to secure your site and rank higher — without the complexity." />
          <FeatureGrid items={FEATURES} />
        </div>
      </section>

      <section className="nw-section bg-surface-2 dark:bg-gray-900/40">
        <div className="nw-container">
          <SectionHeading eyebrow="Simple pricing" title="Pick your certificate" subtitle="Transparent yearly pricing. Renewal price shown upfront." />
          <PricingTiers tiers={TIERS} />
        </div>
      </section>

      <section className="nw-section">
        <div className="nw-container">
          <SectionHeading eyebrow="How it works" title="Live in three steps" />
          <Steps steps={STEPS} />
        </div>
      </section>

      <section className="nw-section bg-surface-2 dark:bg-gray-900/40">
        <div className="nw-container">
          <SectionHeading eyebrow="FAQ" title="Questions, answered" />
          <Faq items={FAQS} />
        </div>
      </section>

      <CtaBand title="Ready to secure your website?" subtitle="Add SSL in minutes and show visitors they can trust you." primaryTo="/create-account" primaryLabel="Get SSL now" secondaryTo="/hosting" secondaryLabel="See hosting" />
    </MainLayout>
  );
}
