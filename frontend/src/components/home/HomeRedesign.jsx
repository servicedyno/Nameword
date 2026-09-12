import { useLanguage } from "../../hooks/useLanguage";
import { usePageMeta } from "../../hooks/usePageMeta";
import Hero from "./landing/Hero";
import TrustBar from "./landing/TrustBar";
import Products from "./landing/Products";
import WhyNameword from "./landing/WhyNameword";
import HowItWorks from "./landing/HowItWorks";
import PricingTeaser from "./landing/PricingTeaser";
import SecurityBand from "./landing/SecurityBand";
import RewardsBand from "./landing/RewardsBand";
import FinalCta from "./landing/FinalCta";

const HomeRedesign = () => {
  const { t } = useLanguage();
  usePageMeta(null, t.site.meta.description);
  return (
    <>
      <Hero />
      <TrustBar />
      <Products />
      <WhyNameword />
      <HowItWorks />
      <PricingTeaser />
      <SecurityBand />
      <RewardsBand />
      <FinalCta />
    </>
  );
};

export default HomeRedesign;
