import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { datacenter } from "../components/common/icons";
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
      <div className="px-5 mb-10">
        <div className="search-section w-full mb-20">
          <img
            src={datacenter}
            alt="hosting"
            title="hosting"
            className="globe-image dark:opacity-5"
          />

          {/* Hosting plan */}
          <div className="searcharea w-full text-center">
            <h2 className="mb-8">{t.pages.chooseYourHostingPlan}</h2>

            {/* Hosting plan tab panel */}
            <div className="hosting-tabpanel">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`tab-link ${
                  billingCycle === "monthly"
                    ? "bg-beige-200 text-primary cursor-pointer"
                    : "dark:text-white cursor-pointer"
                }`}
              >
                {t.pages.monthly}
              </button>
              <button
                onClick={() => setBillingCycle("annually")}
                className={`tab-link ${
                  billingCycle === "annually"
                    ? "bg-beige-200 text-primary cursor-pointer"
                    : "dark:text-white cursor-pointer"
                }`}
              >
                {t.pages.annually}{" "}
                {annualPlans.length > 0 && annualPlans[0]?.savings_percentage > 0 && (
                  <span className="save-lable">{t.pages.savePercent.replace("{percent}", annualPlans[0].savings_percentage)}</span>
                )}
              </button>
            </div>

            {loading ? (
              <Loader />
            ) : (
              <>
                {/* monthly billing plan */}
                {billingCycle === "monthly" && (
                  <MonthlyBiillingPlan
                    plans={monthlyPlans}
                    onSelectPlan={handlePlanSelect}
                  />
                )}

                {/* annual billing plan */}
                {billingCycle === "annually" && (
                  <AnnualBiillingPlan
                    plans={annualPlans}
                    onSelectPlan={handlePlanSelect}
                  />
                )}
              </>
            )}
          </div>
        </div>

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
      </div>
      <Footer />
    </div>
  );
};

export default Hosting;
