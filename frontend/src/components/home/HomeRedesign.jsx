import { useLanguage } from "../../hooks/useLanguage";
import { usePageMeta } from "../../hooks/usePageMeta";
import Hero from "./landing/Hero";
import CloudVps from "./landing/CloudVps";
import WindowsRdp from "./landing/WindowsRdp";
import EverythingElse from "./landing/EverythingElse";
import WhyNameword from "./landing/WhyNameword";
import PricingTeaser from "./landing/PricingTeaser";
import RewardsBand from "./landing/RewardsBand";
import FinalCta from "./landing/FinalCta";

const HomeRedesign = () => {
  const { t } = useLanguage();
  usePageMeta(null, t.site.meta.description);
  return (
    <>
      <Hero />
      <CloudVps />
      <WindowsRdp />
      <EverythingElse />
      <WhyNameword />
      <PricingTeaser />
      <RewardsBand />
      <FinalCta />
    </>
  );
};

export default HomeRedesign;
