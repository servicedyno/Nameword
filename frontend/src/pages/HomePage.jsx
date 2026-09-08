import React from 'react'
import MainLayout from '../layouts/MainLayout'
import DomainSearchSection from "../components/home/domain-search-section";
import PointsBanner from "../components/home/points-banner";
import ContactInfo from "../components/domain/contact-info";
import PricingPlansSection from "../components/home/pricing-plans";
import HowItWorks from "../components/home/how-it-works";
import SecurityBeyond from "../components/home/security-beyond";
import DomainExtendLaunch from "../components/home/domain-extend-launch";
import OurClients from "../components/home/our-clients";
import ClaimOnline from "../components/home/claim-online";

const HomePage = () => {
  return (
    <MainLayout >
      {/* top domain section */}
      <DomainSearchSection />

      {/* Spend, earn, and redeem points! */}
      <PointsBanner />

      {/* contact info component test */}
      <ContactInfo />

      {/* pricing and plans section */}
      <PricingPlansSection />

      {/* how it works section */}
      <HowItWorks />

      {/* Security and beyond section */}
      <SecurityBeyond />

      {/* extend to launch sections */}
      <DomainExtendLaunch />

      {/* our clients sections */}
      <OurClients />

      {/* Claim Online sections */}
      <ClaimOnline />

    </MainLayout>
  )
}

export default HomePage