import { IoChevronDown, IoClose } from "react-icons/io5";
import { TbArrowRight } from "react-icons/tb";
import { MdCheck } from "react-icons/md";
import { useState, useEffect, useMemo } from "react";
import { RxQuestionMarkCircled } from "react-icons/rx";
import { useNavigate, NavLink } from "react-router";
import { hostingAPI } from "../../../api/hosting";
import { useDomain } from "../../../hooks/useDomain";
import { useCustomLocation } from "../../../hooks/useCustomLocation";
import { useAlert } from "../../../context/AlertContext";
import { useAuth } from "../../../hooks/useAuth";
import Loader from "../../../components/common/Loader";
import moment from "moment";
import { calculateDiscount } from "../../../utils/promocode";
import { useLanguage } from "../../../hooks/useLanguage";

const UpgradePlan = () => {
  const [email, setEmail] = useState("");
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [open, setOpen] = useState(false);
  const [showPromo, setShowPromo] = useState(true);
  const [currentHostingOrder, setCurrentHostingOrder] = useState(null);
  const [allHostingPlans, setAllHostingPlans] = useState([]);
  const [upgradePlans, setUpgradePlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [upgradePrice, setUpgradePrice] = useState(null);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoDiscount, setPromoDiscount] = useState(0);

  const locationState = useCustomLocation();
  const { domains } = useDomain();
  const { showAlert } = useAlert();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();


  const activeDomain = useMemo(() => {

    if (locationState?.currentDomain?.websiteName) {
      return locationState.currentDomain;
    }


    return null;
  }, [locationState?.currentDomain?.websiteName]);

  // Fetch current hosting order and available plans
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !activeDomain?.websiteName) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const domainName = activeDomain.websiteName?.toLowerCase().trim();

        // Fetch current hosting order and all plans in parallel

        const [hostingResponse, plansResponse] = await Promise.all([
          hostingAPI.getHostingOrders({

          }),
          hostingAPI.getHostingPlans({ provider: "both" }),
        ]);

        // Set current hosting order
        let allOrders = [];
        let hostingOrder = null;

        if (hostingResponse?.success) {

          if (Array.isArray(hostingResponse.responseData?.orders)) {
            allOrders = hostingResponse.responseData.orders;
          } else if (Array.isArray(hostingResponse.responseData)) {
            allOrders = hostingResponse.responseData;
          } else if (Array.isArray(hostingResponse.data?.orders)) {
            allOrders = hostingResponse.data.orders;
          } else if (Array.isArray(hostingResponse.data)) {
            allOrders = hostingResponse.data;
          } else if (Array.isArray(hostingResponse.orders)) {
            allOrders = hostingResponse.orders;
          }


          if (
            allOrders.length === 0 &&
            hostingResponse.responseData &&
            typeof hostingResponse.responseData === "object" &&
            !Array.isArray(hostingResponse.responseData)
          ) {
            if (
              hostingResponse.responseData.domainName ||
              hostingResponse.responseData.plan
            ) {
              allOrders = [hostingResponse.responseData];
            }
          }

          if (allOrders.length > 0) {
   
            let domainMatchingOrders = allOrders.filter((order) => {
              const orderDomain = (order.domainName || "").toLowerCase().trim();
              const matchesDomain = !domainName || orderDomain === domainName;
              return matchesDomain;
            });

    
            if (domainMatchingOrders.length === 0 && domainName) {
              domainMatchingOrders = allOrders.filter((order) => {
                const orderDomain = (order.domainName || "")
                  .toLowerCase()
                  .trim();
                const hostbayDomain = (order.hostbayResponse?.domain_name || "")
                  .toLowerCase()
                  .trim();
                const hostbayResponseDomain = (
                  order.hostbayResponse?.domain || ""
                )
                  .toLowerCase()
                  .trim();

                return (
                  orderDomain === domainName ||
                  hostbayDomain === domainName ||
                  hostbayResponseDomain === domainName ||
                  orderDomain.includes(domainName) ||
                  domainName.includes(orderDomain) ||
                  hostbayDomain.includes(domainName) ||
                  domainName.includes(hostbayDomain) ||
                  hostbayResponseDomain.includes(domainName) ||
                  domainName.includes(hostbayResponseDomain)
                );
              });
            }


            if (
              domainMatchingOrders.length === 0 &&
              allOrders.length > 0 &&
              !domainName
            ) {
              domainMatchingOrders = allOrders;
            }

            if (domainMatchingOrders.length > 0) {
              // Prefer completed orders first
              const completedOrders = domainMatchingOrders.filter(
                (order) => (order.status || "").toLowerCase() === "completed"
              );

              if (completedOrders.length > 0) {

                completedOrders.sort((a, b) => {
                  const dateA = new Date(a.createdAt || a.updatedAt || 0);
                  const dateB = new Date(b.createdAt || b.updatedAt || 0);
                  return dateB - dateA;
                });
                hostingOrder = completedOrders[0];
              } else {

                domainMatchingOrders.sort((a, b) => {
                  const dateA = new Date(a.createdAt || a.updatedAt || 0);
                  const dateB = new Date(b.createdAt || b.updatedAt || 0);
                  return dateB - dateA;
                });
                hostingOrder = domainMatchingOrders[0];
              }
            } else if (allOrders.length === 1) {

              hostingOrder = allOrders[0];
            }
          }
        }

        if (hostingOrder) {
          setCurrentHostingOrder(hostingOrder);
        }


        let plans = [];
        if (plansResponse?.success) {
    
          if (Array.isArray(plansResponse.data?.plans)) {
            plans = plansResponse.data.plans;
          } else if (Array.isArray(plansResponse.responseData?.plans)) {
            plans = plansResponse.responseData.plans;
          } else if (Array.isArray(plansResponse.responseData)) {
            plans = plansResponse.responseData;
          } else if (Array.isArray(plansResponse.data)) {
            plans = plansResponse.data;
          } else if (Array.isArray(plansResponse.plans)) {
            plans = plansResponse.plans;
          }
        } else if (Array.isArray(plansResponse?.data)) {
          plans = plansResponse.data;
        } else if (Array.isArray(plansResponse)) {
          plans = plansResponse;
        }

        setAllHostingPlans(plans);
      } catch (error) {
        console.error("Error fetching data:", error);
        const errorMsg =
          error?.response?.data?.responseMsg?.message ||
          error?.response?.data?.message ||
          t.websites.upgradePlan.failedToFetchData;
        showAlert(errorMsg, { duration: 3000, type: "warning" });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, activeDomain, showAlert]);

  // Filter upgrade plans and set default selection
  useEffect(() => {
    if (!currentHostingOrder || allHostingPlans.length === 0) {
      setUpgradePlans([]);
      return;
    }

    const currentPlanCode = currentHostingOrder.plan;
    const currentProvider = currentHostingOrder.provider || "hostbay";

    const currentPlan = allHostingPlans.find((plan) => {
      const planCode =
        plan.whm_package || plan.plan_code || plan.code || plan.id?.toString();
      const planProvider = (plan.provider || "hostbay").toLowerCase();
      const matches =
        planCode === currentPlanCode &&
        planProvider === currentProvider.toLowerCase();
      return matches;
    });

    // Filter plans from same provider that are potentially upgrades
    const availableUpgrades = allHostingPlans.filter((plan) => {
      const planProvider = (plan.provider || "hostbay").toLowerCase();
      const planCode =
        plan.whm_package || plan.plan_code || plan.code || plan.id?.toString();

      const sameProvider = planProvider === currentProvider.toLowerCase();
      const differentPlan = planCode !== currentPlanCode;

      return sameProvider && differentPlan;
    });

    setUpgradePlans(availableUpgrades);

    // Set first upgrade plan as default selection
    if (availableUpgrades.length > 0 && !selectedPlan) {
      setSelectedPlan(availableUpgrades[0]);
    }
  }, [currentHostingOrder, allHostingPlans]);

  // Calculate upgrade price when plan is selected
  useEffect(() => {
    const calculateUpgradePrice = async () => {
      if (!selectedPlan || !currentHostingOrder) {
        setUpgradePrice(null);
        return;
      }

      try {
        setLoadingPrice(true);
        const planCode =
          selectedPlan.whm_package ||
          selectedPlan.plan_code ||
          selectedPlan.code ||
          selectedPlan.id?.toString();
        const provider =
          selectedPlan.provider || currentHostingOrder.provider || "hostbay";
        const period = currentHostingOrder.period || 1;

        const response = await hostingAPI.calculatePrice({
          plan: planCode,
          period: period,
          provider: provider,
        });

        if (response?.success && response?.responseData) {
          setUpgradePrice(response.responseData);
        } else {
          // Fallback to plan price if calculation fails
          const price =
            selectedPlan.period_price ||
            selectedPlan.price ||
            selectedPlan.monthly_price ||
            0;
          setUpgradePrice({
            price: price,
            original_price: selectedPlan.original_price || price,
          });
        }
      } catch (error) {
        console.error("Error calculating upgrade price:", error);
        // Fallback to plan price
        const price =
          selectedPlan.period_price ||
          selectedPlan.price ||
          selectedPlan.monthly_price ||
          0;
        setUpgradePrice({
          price: price,
          original_price: selectedPlan.original_price || price,
        });
      } finally {
        setLoadingPrice(false);
      }
    };

    calculateUpgradePrice();
  }, [selectedPlan, currentHostingOrder]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        open &&
        !event.target.closest(".dropdown-select") &&
        !event.target.closest(".term-select")
      ) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [open]);

  // Helper function to get plan name
  const getPlanName = (plan) => {
    if (!plan) return t.websites.common.notAvailable;
    return (
      plan.plan_name ||
      plan.name ||
      plan.whm_package ||
      plan.plan_code ||
      plan.code ||
      t.websites.websitesOverview.hostingPlan
    );
  };

  // Helper function to get current plan features
  const getCurrentPlanFeatures = () => {
    if (!currentHostingOrder) return [];

    // First, try to find the matching plan from allHostingPlans (like hosting page format)
    const currentPlanCode = currentHostingOrder.plan;
    const currentProvider = currentHostingOrder.provider || "hostbay";
    const matchingPlan = allHostingPlans.find(
      (plan) =>
        (plan.whm_package ||
          plan.plan_code ||
          plan.code ||
          plan.id?.toString()) === currentPlanCode &&
        (plan.provider || "hostbay").toLowerCase() ===
          currentProvider.toLowerCase()
    );

    // If we found a matching plan from allHostingPlans, use its features (matches hosting page format)
    if (
      matchingPlan &&
      Array.isArray(matchingPlan.features) &&
      matchingPlan.features.length > 0
    ) {
      return matchingPlan.features.map((feature) =>
        typeof feature === "string"
          ? feature
          : feature.text || feature.name || String(feature)
      );
    }

    const planDetails =
      currentHostingOrder?.hostbayResponse?.plan_details || {};
    const planSnapshot = currentHostingOrder?.planSnapshot || {};

    // Second, try to use features array directly from planSnapshot/planDetails
    const featuresArray =
      planSnapshot?.features ||
      planDetails?.features ||
      planSnapshot?.plan_details?.features ||
      [];

    if (Array.isArray(featuresArray) && featuresArray.length > 0) {
      return featuresArray.map((feature) =>
        typeof feature === "string"
          ? feature
          : feature.text || feature.name || String(feature)
      );
    }

    // Fallback: Extract features from plan details and build comprehensive list
    const features = [];

    // Storage/Disk
    const diskSpace =
      planDetails.disk_space ||
      planSnapshot.disk_space ||
      planSnapshot.disk ||
      planSnapshot.storage ||
      planSnapshot.disk_space_gb;
    if (diskSpace) {
      features.push(`${diskSpace} SSD Storage`);
    }

    // Bandwidth
    const bandwidth =
      planDetails.bandwidth ||
      planSnapshot.bandwidth ||
      planSnapshot.transfer ||
      planDetails.bandwidth_gb ||
      planSnapshot.bandwidth_gb;
    if (bandwidth) {
      features.push(
        `${
          bandwidth === "Unlimited" || bandwidth === -1
            ? "Unlimited"
            : bandwidth
        } GB Bandwidth`
      );
    }

    // Websites
    const websites =
      planDetails.addons ||
      planDetails.websites ||
      planSnapshot.addons ||
      planSnapshot.websites;
    if (websites !== undefined) {
      features.push(
        `${
          websites === "Unlimited" || websites === -1 ? "Unlimited" : websites
        } Website${
          websites !== 1 && websites !== "Unlimited" && websites !== -1
            ? "s"
            : ""
        }`
      );
    }

    // Email Accounts
    const emailAccounts =
      planDetails.email_accounts || planSnapshot.email_accounts;
    if (emailAccounts !== undefined) {
      features.push(
        `${
          emailAccounts === "Unlimited" || emailAccounts === -1
            ? "Unlimited"
            : emailAccounts
        } Email Accounts`
      );
    }

    // Databases
    const databases = planDetails.databases || planSnapshot.databases;
    if (databases !== undefined) {
      features.push(
        `${
          databases === "Unlimited" || databases === -1
            ? "Unlimited"
            : databases
        } Database${
          databases !== 1 && databases !== "Unlimited" && databases !== -1
            ? "s"
            : ""
        }`
      );
    }

    // Control Panel
    const controlPanel =
      planDetails.control_panel ||
      planSnapshot.control_panel ||
      (currentHostingOrder.provider === "connectreseller" ? "Plesk" : "cPanel");
    if (controlPanel) {
      features.push(`${controlPanel} Control Panel`);
    }

    // Always add standard features (like hosting page)
    if (!features.some((f) => f.toLowerCase().includes("ssl"))) {
      features.push(t.websites.common.freeSslCertificate);
    }
    if (!features.some((f) => f.toLowerCase().includes("uptime"))) {
      features.push(t.websites.common.uptimeGuarantee);
    }
    if (!features.some((f) => f.toLowerCase().includes("support"))) {
      features.push(t.websites.common.support247);
    }
    if (!features.some((f) => f.toLowerCase().includes("backup"))) {
      features.push(t.websites.common.dailyBackups);
    }

    // If we still don't have features, add default ones
    if (features.length === 0) {
      features.push(
        t.websites.common.freeSslCertificate,
        t.websites.common.uptimeGuarantee,
        t.websites.common.support247,
        t.websites.common.dailyBackups
      );
    }

    return features;
  };

  // Helper function to get selected plan features
  const getSelectedPlanFeatures = () => {
    if (!selectedPlan) return [];

    // First, try to use features array directly (like hosting page does)
    const featuresArray = selectedPlan.features || [];

    if (Array.isArray(featuresArray) && featuresArray.length > 0) {
      // Return as simple strings like hosting page
      return featuresArray.map((feature) =>
        typeof feature === "string"
          ? feature
          : feature.text || feature.name || String(feature)
      );
    }

    // Fallback: Extract features from plan data and build comprehensive list
    const features = [];

    // Storage/Disk
    const diskSpace =
      selectedPlan.disk_space ||
      selectedPlan.disk ||
      selectedPlan.storage ||
      selectedPlan.disk_space_gb;
    if (diskSpace) {
      features.push(`${diskSpace} SSD Storage`);
    }

    // Bandwidth
    const bandwidth =
      selectedPlan.bandwidth ||
      selectedPlan.transfer ||
      selectedPlan.bandwidth_gb;
    if (bandwidth) {
      features.push(
        `${
          bandwidth === "Unlimited" || bandwidth === -1
            ? "Unlimited"
            : bandwidth
        } GB Bandwidth`
      );
    }

    // Websites
    const websites = selectedPlan.addons || selectedPlan.websites;
    if (websites !== undefined) {
      features.push(
        `${
          websites === "Unlimited" || websites === -1 ? "Unlimited" : websites
        } Website${
          websites !== 1 && websites !== "Unlimited" && websites !== -1
            ? "s"
            : ""
        }`
      );
    }

    // Email Accounts
    const emailAccounts = selectedPlan.email_accounts;
    if (emailAccounts !== undefined) {
      features.push(
        `${
          emailAccounts === "Unlimited" || emailAccounts === -1
            ? "Unlimited"
            : emailAccounts
        } Email Accounts`
      );
    }

    // Databases
    const databases = selectedPlan.databases;
    if (databases !== undefined) {
      features.push(
        `${
          databases === "Unlimited" || databases === -1
            ? "Unlimited"
            : databases
        } Database${
          databases !== 1 && databases !== "Unlimited" && databases !== -1
            ? "s"
            : ""
        }`
      );
    }

    // Control Panel
    const controlPanel =
      selectedPlan.control_panel ||
      (selectedPlan.provider === "connectreseller" ? "Plesk" : "cPanel");
    if (controlPanel) {
      features.push(`${controlPanel} Control Panel`);
    }

    // Always add standard features (like hosting page)
    if (!features.some((f) => f.toLowerCase().includes("ssl"))) {
      features.push(t.websites.common.freeSslCertificate);
    }
    if (!features.some((f) => f.toLowerCase().includes("uptime"))) {
      features.push(t.websites.common.uptimeGuarantee);
    }
    if (!features.some((f) => f.toLowerCase().includes("support"))) {
      features.push(t.websites.common.support247);
    }
    if (!features.some((f) => f.toLowerCase().includes("backup"))) {
      features.push(t.websites.common.dailyBackups);
    }

    // If we still don't have features, add default ones
    if (features.length === 0) {
      features.push(
        t.websites.common.freeSslCertificate,
        t.websites.common.uptimeGuarantee,
        t.websites.common.support247,
        t.websites.common.dailyBackups
      );
    }

    return features;
  };

  // Handle checkout
  const handleCheckout = () => {
    if (!selectedPlan || !currentHostingOrder) {
      showAlert(t.websites.upgradePlan.validation.selectUpgradePlan, { type: "fail" });
      return;
    }

    if (appliedPromo && promoDiscount > 0) {
      localStorage.setItem("appliedPromoCode", appliedPromo);
      localStorage.setItem("promoDiscount", promoDiscount.toString());
    }

    navigate("/payment-checkout", {
      state: {
        upgrade: true,
        currentOrder: currentHostingOrder,
        newPlan: selectedPlan,
        domain: activeDomain?.websiteName,
      },
    });
  };

  // Handle promo code
  const handlePromoCode = async () => {
    if (!email.trim()) {
      showAlert(t.websites.upgradePlan.validation.promocodeRequired, { type: "fail" });
      return;
    }

    let basePrice = 0;
    if (upgradePrice && (upgradePrice.price || upgradePrice.period_price)) {
      basePrice = upgradePrice.price || upgradePrice.period_price || 0;
    } else if (selectedPlan) {
      basePrice = selectedPlan.period_price || selectedPlan.price || selectedPlan.monthly_price || selectedPlan.yearly_price || 0;
    }
    if (basePrice <= 0) {
      showAlert(t.websites.upgradePlan.validation.selectUpgradePlan || "Please select an upgrade plan first", { type: "fail" });
      return;
    }

    const discount = await calculateDiscount(basePrice, email.trim());

    if (discount.error) {
      showAlert(discount.error, { type: "fail" });
      return;
    }

    if (!discount.promoCode || discount.discount <= 0) {
      showAlert(t.websites.upgradePlan.validation.invalidPromocode, { type: "fail" });
      return;
    }

    setAppliedPromo(discount.promoCode);
    setPromoDiscount(discount.discount);
    showAlert(t.websites.upgradePlan.promocodeAppliedSuccess
      .replace("{code}", discount.promoCode)
      .replace("{amount}", discount.discount.toFixed(2)), { type: "success" });
  };

  // Get current plan price
  const getCurrentPlanPrice = () => {
    if (!currentHostingOrder) return "0.00";
    return (currentHostingOrder.amount || 0).toFixed(2);
  };

  // Calculate subtotal (uses promoDiscount from state, set when promo applied)
  const getSubtotal = () => {
    let price = 0;
    if (upgradePrice && (upgradePrice.price || upgradePrice.period_price)) {
      price = upgradePrice.price || upgradePrice.period_price || 0;
    } else if (selectedPlan) {
      price = selectedPlan.period_price || selectedPlan.price || selectedPlan.monthly_price || selectedPlan.yearly_price || 0;
    }
    price = Math.max(0, price - promoDiscount);
    return price.toFixed(2);
  };

  // Get upgrade plan price display
  const getUpgradePlanPrice = () => {
    if (!selectedPlan) return null;

    const period = currentHostingOrder?.period || 1;

    // Try upgrade price first (already calculated)
    if (upgradePrice && (upgradePrice.price || upgradePrice.period_price)) {
      const price = upgradePrice.price || upgradePrice.period_price || 0;
      if (price > 0) {
        return { price: price / period, isCalculated: true };
      }
    }

    // Fallback to plan's own price
    const planPrice =
      selectedPlan.period_price ||
      selectedPlan.price ||
      selectedPlan.monthly_price ||
      selectedPlan.yearly_price ||
      0;

    if (planPrice > 0) {
      // Check if we have display_price (might be formatted string like "$150.00/30days")
      if (selectedPlan.display_price) {
        return {
          price: selectedPlan.display_price,
          isCalculated: false,
          isDisplayPrice: true,
        };
      }

      // Calculate monthly price if needed
      let monthlyPrice = planPrice;
      if (selectedPlan.yearly_price && !selectedPlan.monthly_price) {
        monthlyPrice = planPrice / 12;
      } else if (period > 1) {
        monthlyPrice = planPrice / period;
      }

      return { price: monthlyPrice, isCalculated: false };
    }

    return null;
  };

  // Get renewal date
  const getRenewalDate = () => {
    if (!currentHostingOrder?.createdAt) return "";
    const createdDate = moment(currentHostingOrder.createdAt);
    const period = currentHostingOrder.period || 1;
    const renewalDate = createdDate.add(period, "months");
    return renewalDate.format("MMM YYYY");
  };

  // Memoize current plan features to recalculate when dependencies change
  // MUST be before any early returns to follow Rules of Hooks
  const currentPlanFeatures = useMemo(() => {
    return getCurrentPlanFeatures();
  }, [currentHostingOrder, allHostingPlans]);

  // Memoize selected plan features to recalculate when dependencies change
  // MUST be before any early returns to follow Rules of Hooks
  const selectedPlanFeatures = useMemo(() => {
    return getSelectedPlanFeatures();
  }, [selectedPlan]);

  if (loading) {
    return <Loader />;
  }

  if (!activeDomain) {
    return (
      <div className="space-y-7">
        <div className="flex flex-col gap-2 title-section">
          <h2>{t.websites.upgradePlan.title}</h2>
        </div>
        <div className="table-card">
          <div className="py-7 px-5">
            <p className="text-secondary">{t.websites.upgradePlan.noDomainSelected}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentHostingOrder) {
    return (
      <div className="space-y-7">
        <div className="flex flex-col gap-2 title-section">
          <h2>{t.websites.upgradePlan.title}</h2>
        </div>
        <div className="table-card">
          <div className="py-7 px-5">
            <p className="text-secondary">
              {t.websites.upgradePlan.noHostingPlanFound}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (upgradePlans.length === 0 && !loading) {
    return (
      <div className="space-y-7">
        <div className="flex flex-col gap-2 title-section">
          <h2>{t.websites.upgradePlan.title}</h2>
        </div>
        <div className="table-card">
          <div className="py-7 px-5">
            <p className="text-secondary">
              {t.websites.upgradePlan.noUpgradePlansAvailable}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* title */}
      <div className="flex flex-col gap-2 title-section">
        <h2>{t.websites.upgradePlan.title}</h2>
      </div>

      <div className="w-full flex lg:flex-row flex-col sm:gap-8 gap-6">
        <div className="2xl:w-4/6 xl:w-1/2 flex flex-col w-full gap-10">
          <div className="grid xl:grid-cols-2 gap-6 max-w-6xl mx-auto">
            {/* Pro Plan */}
            <div className="hosting-plan-card">
              <div className="flex gap-5 flex-col items-start justify-start">
                <div className="flex flex-col justify-between items-start gap-2 w-full">
                  <p className="plan-title">{t.websites.upgradePlan.currentPlan}</p>
                  <div className="relative w-full">
                    <div className="term-select !border-stokecolor dark:!border-gray-700 !py-2.5">
                      <span className="text-lg font-medium text-secondary dark:text-gray-400">
                        {getPlanName(currentHostingOrder) || t.websites.upgradePlan.currentPlan}
                      </span>
                    </div>
                  </div>
                </div>
                <hr className="card-divider w-full" />
                <ul className="flex flex-col w-full gap-2.5">
                  {currentPlanFeatures.length > 0 ? (
                    currentPlanFeatures.slice(0, 10).map((feature, index) => (
                      <li className="list-price-detail" key={index}>
                        <MdCheck className="w-5 h-5" />
                        <p>{feature}</p>
                      </li>
                    ))
                  ) : (
                    <>
                      <li className="list-price-detail">
                        <MdCheck className="w-5 h-5" />
                        <p>{t.websites.common.freeSslCertificate}</p>
                      </li>
                      <li className="list-price-detail">
                        <MdCheck className="w-5 h-5" />
                        <p>{t.websites.common.uptimeGuarantee}</p>
                      </li>
                      <li className="list-price-detail">
                        <MdCheck className="w-5 h-5" />
                        <p>{t.websites.common.support247}</p>
                      </li>
                      <li className="list-price-detail">
                        <MdCheck className="w-5 h-5" />
                        <p>{t.websites.common.dailyBackups}</p>
                      </li>
                    </>
                  )}
                  <li className="list-price-detail disabled">
                    <RxQuestionMarkCircled className="w-5 h-5" />
                    <p>{t.websites.common.freeDomain}</p>
                  </li>
                </ul>
                <hr className="card-divider w-full" />
                <div className="text-left">
                  <p className="plan-price">${getCurrentPlanPrice()}/mo.</p>
                </div>
              </div>
            </div>

            {/* Business Plan */}
            <div className="hosting-plan-card">
              <div className="flex gap-5 flex-col items-start justify-start">
                <div className="flex gap-2 flex-col items-start justify-start w-full">
                  <p className="plan-title !text-darkbtn dark:!text-gray-200">
                    {t.websites.upgradePlan.upgradeTo}
                  </p>
                  <div className="relative w-full">
                    <div
                      onClick={() => upgradePlans.length > 0 && setOpen(!open)}
                      className={`term-select !py-1 ${
                        upgradePlans.length > 0
                          ? "cursor-pointer"
                          : "cursor-not-allowed opacity-50"
                      }`}
                    >
                      <p className="text-xs text-secondary font-medium">
                        {t.websites.upgradePlan.choosePlan}
                      </p>
                      <div className="flex justify-between items-center">
                        <span className="text-base font-medium text-primary dark:text-gray-400">
                          {selectedPlan
                            ? getPlanName(selectedPlan)
                            : upgradePlans.length > 0
                            ? t.websites.upgradePlan.choosePlan
                            : t.websites.upgradePlan.noUpgradesAvailable}
                        </span>
                        {upgradePlans.length > 0 && (
                          <IoChevronDown className="absolute top-1/2 transform -translate-y-1/2 right-4 w-4 h-4 text-primary dark:text-gray-400" />
                        )}
                      </div>
                    </div>

                    {/* Dropdown items */}
                    {open && upgradePlans.length > 0 && (
                      <div className="dropdown-select">
                        {upgradePlans.map((plan, index) => (
                          <div
                            key={plan.id || plan.whm_package || index}
                            onClick={() => {
                              setSelectedPlan(plan);
                              setOpen(false);
                            }}
                            className={`px-4 py-2 cursor-pointer hover:bg-slatelight dark:hover:bg-gray-800 text-sm font-medium text-primary dark:text-gray-400 ${
                              selectedPlan &&
                              (selectedPlan.id === plan.id ||
                                selectedPlan.whm_package === plan.whm_package)
                                ? "bg-slatelight dark:bg-gray-900 font-medium"
                                : ""
                            }`}
                          >
                            {getPlanName(plan)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {selectedPlan && (
                  <p className="plan-heading">{getPlanName(selectedPlan)}</p>
                )}

                <hr className="card-divider w-full" />

                <ul className="flex flex-col w-full gap-2.5">
                  {selectedPlan ? (
                    selectedPlanFeatures.length > 0 ? (
                      selectedPlanFeatures
                        .slice(0, 10)
                        .map((feature, index) => (
                          <li className="list-price-detail" key={index}>
                            <MdCheck className="w-5 h-5" />
                            <p>{feature}</p>
                          </li>
                        ))
                    ) : (
                      <>
                        <li className="list-price-detail">
                          <MdCheck className="w-5 h-5" />
                          <p>{t.websites.common.freeSslCertificate}</p>
                        </li>
                        <li className="list-price-detail">
                          <MdCheck className="w-5 h-5" />
                          <p>{t.websites.common.uptimeGuarantee}</p>
                        </li>
                        <li className="list-price-detail">
                          <MdCheck className="w-5 h-5" />
                          <p>{t.websites.common.support247}</p>
                        </li>
                        <li className="list-price-detail">
                          <MdCheck className="w-5 h-5" />
                          <p>{t.websites.common.dailyBackups}</p>
                        </li>
                      </>
                    )
                  ) : (
                    <li className="list-price-detail">
                      <p className="text-secondary">
                        {t.websites.upgradePlan.selectPlanToSeeFeatures}
                      </p>
                    </li>
                  )}
                  <li className="list-price-detail disabled">
                    <RxQuestionMarkCircled className="w-5 h-5" />
                    <p>{t.websites.common.freeDomain}</p>
                  </li>
                </ul>
                <hr className="card-divider w-full" />
                <div className="text-left">
                  {selectedPlan ? (
                    (() => {
                      const priceInfo = getUpgradePlanPrice();
                      const period = currentHostingOrder?.period || 1;

                      if (loadingPrice) {
                        return <p className="plan-price">{t.websites.upgradePlan.calculating}</p>;
                      }

                      if (priceInfo) {
                        // If it's a display price string, use it directly
                        if (
                          priceInfo.isDisplayPrice &&
                          typeof priceInfo.price === "string"
                        ) {
                          return (
                            <>
                              <p className="plan-price">{priceInfo.price}</p>
                              <p className="plan-detail">
                                {t.websites.upgradePlan.monthBillingCycle
                                  .replace("{period}", period)
                                  .replace("{amount}", getSubtotal())
                                  .replace("{date}", getRenewalDate())}
                              </p>
                            </>
                          );
                        }

                        // Otherwise use numeric price
                        const monthlyPrice =
                          typeof priceInfo.price === "number"
                            ? priceInfo.price
                            : parseFloat(priceInfo.price) || 0;
                        if (monthlyPrice > 0) {
                          // Determine period label from plan data
                          let periodLabel = "/mo.";
                          const billingCycle =
                            selectedPlan.billing_cycle?.toLowerCase() || "";
                          const displayPriceLower = (
                            selectedPlan.display_price || ""
                          ).toLowerCase();

                          if (
                            billingCycle.includes("day") ||
                            displayPriceLower.includes("day")
                          ) {
                            // If it's a daily plan, show as per period
                            periodLabel = "";
                          } else if (
                            billingCycle.includes("year") ||
                            billingCycle.includes("annual")
                          ) {
                            periodLabel = "/year";
                          } else if (period > 1) {
                            periodLabel = `/month (${period} month cycle)`;
                          }

                          return (
                            <>
                              <p className="plan-price">
                                ${monthlyPrice.toFixed(2)}
                                {periodLabel}
                              </p>
                              <p className="plan-detail">
                                {t.websites.upgradePlan.monthBillingCycleWithPrice
                                  .replace("{period}", period)
                                  .replace("{amount}", getSubtotal())
                                  .replace("{date}", getRenewalDate())
                                  .replace("{price}", monthlyPrice.toFixed(2))}
                              </p>
                            </>
                          );
                        }
                      }

                      // Fallback if no price found
                      const fallbackPrice =
                        selectedPlan.display_price ||
                        (selectedPlan.period_price
                          ? `$${selectedPlan.period_price}`
                          : null) ||
                        (selectedPlan.price
                          ? `$${selectedPlan.price}`
                          : null) ||
                        "Contact us";

                      return (
                        <>
                          <p className="plan-price">{fallbackPrice}</p>
                          <p className="plan-detail">
                            {t.websites.upgradePlan.cancelAnytime
                              .replace("{period}", period)}
                          </p>
                        </>
                      );
                    })()
                  ) : (
                    <p className="plan-price">{t.websites.upgradePlan.selectPlan}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="2xl:w-2/5 xl:w-1/2 flex">
          <div className="order-summary w-full">
            <h3 className="font-medium text-lg mb-5 text-primary dark:text-white">
              {t.websites.upgradePlan.orderSummary}
            </h3>
            <h4 className="text-primary dark:text-gray-500 text-15 font-medium">
              {t.websites.upgradePlan.items}
            </h4>
            <hr className="card-divider my-3.5" />
            <div className="flex gap-5 flex-col w-full">
              <div>
                <div className="flex justify-between items-center">
                  <p className="text-primary dark:text-gray-500 text-base font-medium">
                    {t.websites.upgradePlan.subtotal}
                  </p>
                  <span className="text-tealdark font-semibold text-2xl">
                    ${getSubtotal()}*
                  </span>
                </div>
                <p className="text-13 font-medium text-teallight-400">
                  {t.websites.upgradePlan.taxesNote}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <p
                  className="flex items-center gap-2 text-13 text-darkbtn hover:text-darkbtn-hover dark:text-gray-500 hover:dark:text-white font-medium cursor-pointer transition-all"
                  onClick={() => setShowPromo(!showPromo)}
                >
                  {t.websites.upgradePlan.havePromocode} <IoChevronDown size={14} />
                </p>

                {showPromo && (
                  <>
                    <div className="w-full flex sm:flex-row flex-col justify-center items-center gap-2 promocode">
                      <div className="relative w-full">
                        <input
                          type="text"
                          className="input-field peer w-full"
                          id="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                        <label
                          htmlFor="email"
                          className={`absolute left-5 transition-all font-medium ${
                            email
                              ? "top-2 text-xs text-gray-600"
                              : "top-4 text-13 text-primary dark:text-gray-500 "
                          } peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}
                        >
                          {t.websites.upgradePlan.promocodePlaceholder}
                        </label>
                      </div>
                      <button
                        onClick={handlePromoCode}
                        className="add-to-cart sm:w-auto w-full"
                      >
                        {t.websites.common.apply}
                      </button>
                    </div>

                    {appliedPromo && (
                      <div className="w-full flex justify-center items-center gap-2 promocode">
                        <div className="promocode-added">
                          <MdCheck className="w-5 h-5 flex-none" />
                          <p>{t.websites.upgradePlan.promocodeApplied.replace("{code}", appliedPromo)}</p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex justify-start">
                <button
                  onClick={handleCheckout}
                  disabled={!selectedPlan || loadingPrice}
                  className="add-to-cart px-7"
                >
                  {t.websites.upgradePlan.goToCheckout} <TbArrowRight size={18} />
                </button>
              </div>

              <p className="text-13 font-medium text-secondary">
                {t.websites.upgradePlan.termsAgreement.split("{termsLink}").map((part, i, arr) => {
                  if (i === arr.length - 1) {
                    const [beforePrivacy, afterPrivacy] = part.split("{privacyLink}");
                    return (
                      <span key={i}>
                        {beforePrivacy}
                        <NavLink
                          to="/privacy-policy"
                          className="text-teallight-500 font-semibold hover:underline"
                        >
                          {t.websites.upgradePlan.privacyPolicy}
                        </NavLink>
                        {afterPrivacy}
                      </span>
                    );
                  }
                  return (
                    <span key={i}>
                      {part}
                      <NavLink
                        to="/terms-and-conditions"
                        className="text-teallight-500 font-semibold hover:underline"
                      >
                        {t.websites.upgradePlan.termsOfService}
                      </NavLink>
                    </span>
                  );
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpgradePlan;
