import MainLayout from "../layouts/MainLayout";
import { ProductHero, SectionHeading, FeatureGrid, PricingTiers, Faq, CtaBand } from "../components/marketing/marketing-ui";
import { LuMail, LuAtSign, LuShieldCheck, LuCalendarDays, LuSmartphone, LuHardDrive, LuInbox } from "react-icons/lu";

const EMAIL_IMG = "https://images.unsplash.com/photo-1567473030492-533b30c5494c?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=80&w=1000";

const FEATURES = [
  { icon: LuAtSign, title: "Email @ your domain", desc: "Look professional with you@yourbrand.com mailboxes.", tone: "brand" },
  { icon: LuInbox, title: "Webmail + IMAP/SMTP", desc: "Use our clean webmail or any client — Outlook, Apple Mail, Gmail.", tone: "teal" },
  { icon: LuShieldCheck, title: "Spam & virus protection", desc: "Advanced filtering keeps junk and threats out of your inbox.", tone: "amber" },
  { icon: LuCalendarDays, title: "Calendars & contacts", desc: "Shared calendars and contacts keep your team in sync.", tone: "brand" },
  { icon: LuSmartphone, title: "Mobile sync", desc: "Push email, calendars and contacts to every device instantly.", tone: "teal" },
  { icon: LuHardDrive, title: "Generous storage", desc: "Plenty of space per mailbox, with easy upgrades as you grow.", tone: "amber" },
];

const TIERS = [
  { name: "Starter", desc: "For individuals", price: "$1.49", period: "/mailbox/mo", features: ["10 GB storage", "Webmail + IMAP/SMTP", "Spam & virus protection", "Mobile sync", "1 domain"], cta: "Start now" },
  { name: "Business", desc: "For growing teams", price: "$2.99", period: "/mailbox/mo", highlighted: true, features: ["50 GB storage", "Calendars & contacts", "Shared team folders", "Priority delivery", "Multiple domains"], cta: "Choose Business" },
  { name: "Pro", desc: "For power users", price: "$4.99", period: "/mailbox/mo", features: ["100 GB storage", "Advanced security & archiving", "Email aliases & rules", "Priority support", "Unlimited domains"], cta: "Go Pro" },
];

const FAQS = [
  { q: "Can I use my existing domain?", a: "Yes. Point your domain's MX records to Nameword (we provide the exact values) and start sending from you@yourdomain.com in minutes." },
  { q: "Does it work with Outlook and Apple Mail?", a: "Absolutely. Every mailbox supports IMAP/SMTP, so you can use our webmail or any standard email client on desktop and mobile." },
  { q: "How is spam handled?", a: "Incoming mail passes through multi-layer spam and virus filtering, so your inbox stays clean without you lifting a finger." },
  { q: "Can I add mailboxes later?", a: "Yes — add or remove mailboxes anytime from your dashboard. Billing adjusts automatically to what you use." },
];

export default function Email() {
  return (
    <MainLayout fluid>
      <ProductHero
        eyebrow="Professional Email"
        title="Business email on your own domain"
        subtitle="Give your brand a professional inbox with rock-solid delivery, spam protection and calendars — all managed alongside your domain."
        primaryTo="/create-account"
        primaryLabel="Create mailboxes"
        secondaryTo="/hosting"
        secondaryLabel="See hosting"
        image={EMAIL_IMG}
        imageAlt="Professional email envelope"
        floatBadge={{ icon: LuMail, title: "you@yourbrand.com", sub: "ready in minutes" }}
        tone="teal"
      />

      <section className="nw-section">
        <div className="nw-container">
          <SectionHeading eyebrow="Everything included" title="A complete email suite" subtitle="Professional mailboxes with the features your business actually needs." />
          <FeatureGrid items={FEATURES} />
        </div>
      </section>

      <section className="nw-section bg-surface-2 dark:bg-gray-900/40">
        <div className="nw-container">
          <SectionHeading eyebrow="Simple pricing" title="Pay per mailbox" subtitle="Scale up or down anytime. No lock-in." />
          <PricingTiers tiers={TIERS} />
        </div>
      </section>

      <section className="nw-section">
        <div className="nw-container">
          <SectionHeading eyebrow="FAQ" title="Questions, answered" />
          <Faq items={FAQS} />
        </div>
      </section>

      <CtaBand title="Give your brand a professional inbox" subtitle="Set up email on your domain in minutes and start looking the part." primaryTo="/create-account" primaryLabel="Create mailboxes" secondaryTo="/domain" secondaryLabel="Find a domain" />
    </MainLayout>
  );
}
