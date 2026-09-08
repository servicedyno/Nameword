import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { LuShieldCheck, LuHardDrive, LuLifeBuoy, LuGauge, LuMail, LuDatabase } from "react-icons/lu";
import ContactInfo from "../components/domain/contact-info";
import MonthlyBiillingPlan from "../components/hosting/monthly-billing-plan";
import AnnualBiillingPlan from "../components/hosting/annual-billing-plan";
import HostingCartSidebar from "../components/hosting/hosting-cart-sidebar";
import { useState, useEffect } from "react";
import { useLocation } from "react-router";
import { hostingAPI } from "../api/hosting";
import { useAlert } from "../context/AlertContext";
import Loader from "../components/common/Loader";
import { useLanguage } from "../hooks/useLanguage";

const HOSTING_FEATURES = [
  { icon: LuGauge, title: "Blazing-fast NVMe", desc: "SSD-backed servers with LiteSpeed caching for snappy load times." },
  { icon: LuShieldCheck, title: "Free SSL & security", desc: "Auto-installed SSL, firewalls and malware scanning on every plan." },
  { icon: LuHardDrive, title: "Daily backups", desc: "Automatic off-site backups so you can restore in a click." },
  { icon: LuMail, title: "Business email", desc: "Professional mailboxes on your own domain, spam-filtered." },
  { icon: LuDatabase, title: "cPanel & Plesk", desc: "Manage sites, databases and DNS from a familiar control panel." },
  { icon: LuLifeBuoy, title: "24/7 expert support", desc: "Real humans ready to help via chat and ticket, any time." },
];

const Hosting = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [hostingPlans, setHostingPlans] = useState([]);
  const [monthlyPlans, setMonthlyPlans] = useState([]);
  const [annualPlans, setAnnualPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const { showAlert } = useAlert();

  useEffect(() => {
    localStorage.removeItem("path")
    fetchHostingPlans();
  }, []);

  // Check for existing domain from setup flow - auto-open cart sidebar
  useEffect(() => {
    if (location.state?.existingDomain && location.state?.fromSetup) {

      if (hostingPlans.length > 0 && !selectedPlan) {
        const pro30DaysPlan = hostingPlans.find((plan) => {
   
          const whmPackage = plan?.whm_package?.toLowerCase() || "";
          const planId = typeof plan?.id === "string" ? plan.id.toLowerCase() : "";
          const billingCycle = plan?.billing_cycle?.toLowerCase() || "";
          const billing = plan?.billing?.toLowerCase() || "";
          const planName = (plan?.name || "").toLowerCase();
          return (
            whmPackage === "pro_30day" ||
            planId === "pro_30day" ||
            billingCycle === "30days" ||
            billing === "30 days" ||
            planName.includes("30")
          );
        });

        if (pro30DaysPlan) {
          setSelectedPlan(pro30DaysPlan);
        } else if (monthlyPlans.length > 0) {
          setSelectedPlan(monthlyPlans[0]);
        } else if (hostingPlans.length > 0) {
          setSelectedPlan(hostingPlans[0]);
        }
      }

      // Auto-open cart sidebar when coming from setup
      setIsCartOpen(true);
      // Clear state to avoid reopening on refresh
      if (window.history.replaceState) {
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, hostingPlans, monthlyPlans, selectedPlan]);

  const fetchHostingPlans = async () => {
    try {
      setLoading(true);

      const response = await hostingAPI.getHostingPlans({ provider: "both" });

  
      let allPlans = [];
      if (response?.success) {
        if (response?.data?.plans) {
          allPlans = response.data.plans;
        } else if (response?.responseData?.plans) {
          allPlans = response.responseData.plans;
        }
      }

      if (allPlans.length > 0) {
        setHostingPlans(allPlans);
        categorizePlans(allPlans);
      } else {
        showAlert(t.pages.failedToLoadHostingPlans, { type: "warning" });
      }
    } catch (error) {
      console.error("Error fetching hosting plans:", error);
      showAlert(error?.response?.data?.message || t.pages.errorLoadingHostingPlans, { type: "fail" });
    } finally {
      setLoading(false);
    }
  };

  const categorizePlans = (plans = []) => {
    if (!Array.isArray(plans)) {
      setMonthlyPlans([]);
      setAnnualPlans([]);
      return;
    }

    const monthly = [];
    const annual = [];

    plans.forEach((plan) => {
   
      const billingCycle = plan?.billing_cycle?.toLowerCase?.() || "";
      const billing = plan?.billing?.toLowerCase?.() || "";
      const cycle = billingCycle || billing;

      // If billing_cycle is "yearly", add to annual, otherwise add to monthly
      if (cycle === "yearly" || cycle === "annual") {
        annual.push(plan);
      } else {
        monthly.push(plan);
      }
    });

    setMonthlyPlans(monthly);
    setAnnualPlans(annual);
  };

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    document.body.classList.add("overflow-hidden");
    setIsCartOpen(true);
  };

  const handleCloseSidebar = () => {
    setIsCartOpen(false);
    document.body.classList.remove("overflow-hidden")
    setSelectedPlan(null);
  };

  useEffect(() => {
    window.scrollTo({top: 0, left: 0})
  },[isCartOpen])

  return (
    <div>
      <Navbar isLoader={loading} />

      {/* Branded hero */}
      <section className="relative overflow-hidden border-b border-line bg-gradient-to-b from-brand-50/60 via-white to-white dark:border-gray-800 dark:from-gray-900 dark:via-gray-950 dark:to-gray-950">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-brand-200/40 blur-3xl dark:bg-brand/10" />
        <div className="nw-container relative py-12 text-center sm:py-16">
          <span className="nw-eyebrow mb-4">Web Hosting</span>
          <h1 className="text-3xl font-bold tracking-tight text-primary dark:text-white sm:text-4xl">
            {t.pages.chooseYourHostingPlan}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl nw-lead">
            Fast, secure cPanel &amp; Plesk hosting with free SSL, daily backups and 24/7 support.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            <span className="nw-chip"><LuShieldCheck className="h-4 w-4 text-brand" /> Free SSL</span>
            <span className="nw-chip"><LuHardDrive className="h-4 w-4 text-brand" /> NVMe SSD</span>
            <span className="nw-chip"><LuLifeBuoy className="h-4 w-4 text-brand" /> 24/7 support</span>
          </div>
        </div>
      </section>

      <section className="nw-section">
        <div className="nw-container">
          {/* Billing toggle */}
          <div className="mb-10 flex justify-center">
            <div className="inline-flex rounded-full border border-line bg-white p-1 dark:border-gray-800 dark:bg-gray-900">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                  billingCycle === "monthly"
                    ? "bg-brand text-white shadow-sm"
                    : "text-ink-soft hover:text-primary dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                {t.pages.monthly}
              </button>
              <button
                onClick={() => setBillingCycle("annually")}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                  billingCycle === "annually"
                    ? "bg-brand text-white shadow-sm"
                    : "text-ink-soft hover:text-primary dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                {t.pages.annually}
                {annualPlans.length > 0 && annualPlans[0]?.savings_percentage > 0 && (
                  <span
                    className={`nw-badge ${
                      billingCycle === "annually"
                        ? "bg-white/20 text-white"
                        : "bg-accent-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                    }`}
                  >
                    {t.pages.savePercent.replace("{percent}", annualPlans[0].savings_percentage)}
                  </span>
                )}
              </button>
            </div>
          </div>

          {loading ? (
            <Loader />
          ) : (
            <>
              {billingCycle === "monthly" && (
                <MonthlyBiillingPlan plans={monthlyPlans} onSelectPlan={handlePlanSelect} />
              )}
              {billingCycle === "annually" && (
                <AnnualBiillingPlan plans={annualPlans} onSelectPlan={handlePlanSelect} />
              )}
            </>
          )}

          {/* Value props */}
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {HOSTING_FEATURES.map((f) => (
              <div key={f.title} className="nw-card nw-card-hover">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand/15 dark:text-brand-200">
                  <f.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-5 text-lg font-bold text-primary dark:text-white">{f.title}</h3>
                <p className="mt-2 text-15 text-ink-soft dark:text-gray-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {isCartOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-30"
            onClick={handleCloseSidebar}
          ></div>
          <div
            className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white dark:bg-darkmode border-l border-gray-200 dark:border-gray-700 shadow-2xl z-40 transform transition-transform duration-300 ${
              isCartOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <HostingCartSidebar
              plan={selectedPlan}
              isModelOpen={isCartOpen}
              onClose={handleCloseSidebar}
              existingDomainFromSetup={location.state?.existingDomain}
              fromSetup={location.state?.fromSetup}
              setSelectedPlan={setSelectedPlan}
            />
          </div>
        </>
      )}

      {/* contact info */}
      <ContactInfo />
      <Footer />
    </div>
  );
};

export default Hosting;
