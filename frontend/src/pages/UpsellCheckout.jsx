import { TbArrowRight } from "react-icons/tb";
import { useEffect, useState, useMemo } from "react";
import { NavLink, useNavigate } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { cartAPI } from "../api/cartApi";
import { hostingAPI } from "../api/hosting";
import { guestCart } from "../utils/guestCart";
import { useAlert } from "../context/AlertContext";
import Loader from "../components/common/Loader";
import { useLanguage } from "../hooks/useLanguage";

const UpsellCheckout = () => {
  const { t } = useLanguage();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [hostingPlans, setHostingPlans] = useState([]);
  const [cartData, setCartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [calculatedPrices, setCalculatedPrices] = useState({});
  const [loadingPrices, setLoadingPrices] = useState({});
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const navigate = useNavigate();

  // Fetch cart and hosting plans (works for both logged-in and guest)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (user) {
          const [cartRes, plansRes] = await Promise.all([
            cartAPI.getListAddToCart(),
            hostingAPI.getHostingPlans(),
          ]);

          setCartData(cartRes?.data || cartRes);

          let plans = [];
          if (plansRes?.data?.plans) {
            plans = plansRes.data.plans;
          } else if (plansRes?.data?.responseData?.plans) {
            plans = plansRes.data.responseData.plans;
          } else if (plansRes?.responseData?.plans) {
            plans = plansRes.responseData.plans;
          } else if (Array.isArray(plansRes?.data)) {
            plans = plansRes.data;
          } else if (Array.isArray(plansRes)) {
            plans = plansRes;
          }

          setHostingPlans(plans);

          if (plans.length > 0 && !selectedPlan) {
            setSelectedPlan(
              plans[0].id ||
              plans[0].plan_id ||
              plans[0].whm_package ||
              plans[0].name,
            );
          } else if (plans.length === 0) {
            setSelectedPlan("none");
          }
        } else {
          // Guest: use guest cart and still fetch hosting plans
          const data = guestCart.list();
          setCartData(data);
          try {
            const plansRes = await hostingAPI.getHostingPlans();
            let plans = [];
            if (plansRes?.data?.plans) {
              plans = plansRes.data.plans;
            } else if (plansRes?.data?.responseData?.plans) {
              plans = plansRes.data.responseData.plans;
            } else if (plansRes?.responseData?.plans) {
              plans = plansRes.responseData.plans;
            } else if (Array.isArray(plansRes?.data)) {
              plans = plansRes.data;
            } else if (Array.isArray(plansRes)) {
              plans = plansRes;
            }
            setHostingPlans(plans);
            if (plans.length > 0 && !selectedPlan) {
              setSelectedPlan(
                plans[0].id ||
                plans[0].plan_id ||
                plans[0].whm_package ||
                plans[0].name,
              );
            } else if (plans.length === 0) {
              setSelectedPlan("none");
            }
          } catch (e) {
            console.warn("Guest: could not fetch hosting plans", e);
            setSelectedPlan("none");
          }
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
        showAlert(t.pages.failedToLoadHostingPlans || "Failed to load hosting plans", { type: "fail" });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  useEffect(() => {
    if (user) {
      localStorage.removeItem("path");
    }
  }, [user]);


  useEffect(() => {
    if (user) return;
    const handlePayload = (e) => {
      const incoming = e?.detail;
      if (incoming) setCartData(incoming);
      else setCartData(guestCart.list());
    };
    window.addEventListener("cart:updated:payload", handlePayload);
    return () => window.removeEventListener("cart:updated:payload", handlePayload);
  }, [user]);

  // Fetch calculated prices for HostBay plans
  useEffect(() => {
    const fetchCalculatedPrices = async () => {
      if (hostingPlans.length === 0) return;

      const pricePromises = hostingPlans.map(async (plan) => {
        const provider = plan.provider || "hostbay";
        const planId = plan.id || plan.plan_id || plan.whm_package || plan.name;

        // Only fetch for HostBay plans
        if (provider !== "hostbay") {
          return { planId, price: null };
        }

        const planCode = plan.whm_package || plan.code || plan.plan_code || plan.id;
        if (!planCode) {
          return { planId, price: null };
        }

        // Calculate period based on billing cycle
        let period = 1;
        if (plan.duration_days === 7) {
          period = 1;
        } else if (plan.duration_days === 30) {
          period = 1;
        } else if (plan.billing_cycle === "yearly") {
          period = 12;
        }

        try {
          setLoadingPrices((prev) => ({ ...prev, [planId]: true }));
          const response = await hostingAPI.calculatePrice({
            plan: planCode,
            period: period,
            provider: "hostbay",
          });

          if (response?.success && response?.responseData) {
            return { planId, price: response.responseData };
          }
        } catch (error) {
          console.error(`Failed to calculate price for plan ${planCode}:`, error);
        } finally {
          setLoadingPrices((prev) => ({ ...prev, [planId]: false }));
        }

        return { planId, price: null };
      });

      const results = await Promise.all(pricePromises);
      const pricesMap = {};
      results.forEach(({ planId, price }) => {
        if (price) {
          pricesMap[planId] = price;
        }
      });
      setCalculatedPrices(pricesMap);
    };

    fetchCalculatedPrices();
  }, [hostingPlans]);


  const domainItem = useMemo(() => {
    const items = cartData?.items || [];
    return items.find(
      (item) =>
        item.itemType === "domain" &&
        (item.status === "in_cart" || item.status === undefined),
    );
  }, [cartData]);

  // Check if bundle is available
  const canUseBundle = useMemo(() => {
    if (!domainItem || !selectedPlan) return false;

    const domainProvider = domainItem?.domain?.provider || "hostbay";
    const hostingPlan = hostingPlans.find(
      (p) => (p.id || p.plan_id || p.whm_package) === selectedPlan,
    );
    const hostingProvider = hostingPlan?.provider || "hostbay";

    return (
      domainProvider === "hostbay" &&
      hostingProvider === "hostbay" &&
      domainItem?.domain?.action === "register"
    );
  }, [domainItem, selectedPlan, hostingPlans]);

  const handleContinue = async () => {
    if (!domainItem) {
      showAlert(t.pages.noDomainFoundInCart || "No domain found in cart", { type: "fail" });
      navigate("/cart");
      return;
    }

    if (!user) {
      if (selectedPlan && selectedPlan !== "none") {
        const guestHostingPlan = hostingPlans.find(
          (p) => (p.id || p.plan_id || p.whm_package) === selectedPlan,
        );
        if (guestHostingPlan) {
          const planId = guestHostingPlan.id || guestHostingPlan.plan_id || guestHostingPlan.whm_package || guestHostingPlan.name;
          const calculatedPrice = calculatedPrices[planId];
          let priceAmount = 0;
          let originalAmount = null;
          let discountPercent = 0;
          if (calculatedPrice) {
            priceAmount = calculatedPrice.total_price || 0;
            originalAmount = calculatedPrice.total_before_discount || null;
            discountPercent = calculatedPrice.api_discount || 0;
          } else {
            priceAmount =
              guestHostingPlan.period_price ||
              guestHostingPlan.price ||
              guestHostingPlan.monthly_price ||
              guestHostingPlan.yearly_price ||
              0;
            originalAmount =
              guestHostingPlan.original_price ||
              guestHostingPlan.price ||
              guestHostingPlan.period_price ||
              null;
            if (originalAmount && originalAmount > priceAmount) {
              discountPercent = Math.round(
                ((originalAmount - priceAmount) / originalAmount) * 100,
              );
            }
          }
          const guestHostingPayload = {
            itemType: "hosting",
            hosting: {
              provider: guestHostingPlan.provider || "hostbay",
              planId: guestHostingPlan.id || guestHostingPlan.plan_id || guestHostingPlan.whm_package,
              planName: guestHostingPlan.plan_name || guestHostingPlan.name || "Hosting Plan",
              planCode: guestHostingPlan.whm_package || null,
              planType: guestHostingPlan.type || null,
              billingCycle: "monthly",
              tenureLabel: "Monthly",
              tenureMonths: 1,
              features: Array.isArray(guestHostingPlan.features) ? guestHostingPlan.features : [],
              planSnapshot: guestHostingPlan,
              domainOption: canUseBundle ? "new" : "existing",
              domainName: domainItem.domain?.name || "",
              domainPrice: null,
            },
            price: {
              amount: priceAmount,
              currency: "USD",
              originalAmount: originalAmount,
              discountPercent: discountPercent,
              displayText: guestHostingPlan.display_price || `$${priceAmount.toFixed(2)}`,
            },
            metadata: { provider: guestHostingPlan.provider || "hostbay" },
          };
          guestCart.add(guestHostingPayload);
          const data = guestCart.list();
          window.dispatchEvent(new CustomEvent("cart:updated:payload", { detail: data }));
          showAlert(t.pages.hostingPlanAddedToCart || "Hosting plan added to cart", { type: "success" });
        }
      }
      navigate("/cart", { replace: true });
      return;
    }

    if (selectedPlan === "none") {
      navigate("/cart");
      return;
    }

    const hostingPlan = hostingPlans.find(
      (p) => (p.id || p.plan_id || p.whm_package) === selectedPlan,
    );

    if (!hostingPlan) {
      showAlert(t.pages.selectedHostingPlanNotFound || "Selected hosting plan not found", { type: "fail" });
      return;
    }

    setSubmitting(true);

    try {
      // Get calculated price if available
      const planId = hostingPlan.id || hostingPlan.plan_id || hostingPlan.whm_package || hostingPlan.name;
      const calculatedPrice = calculatedPrices[planId];

      // Use calculated price if available, otherwise fallback to plan prices
      let priceAmount = 0;
      let originalAmount = null;
      let discountPercent = 0;

      if (calculatedPrice) {
        priceAmount = calculatedPrice.total_price || 0;
        originalAmount = calculatedPrice.total_before_discount || null;
        discountPercent = calculatedPrice.api_discount || 0;
      } else {
        priceAmount =
          hostingPlan.period_price ||
          hostingPlan.price ||
          hostingPlan.monthly_price ||
          hostingPlan.yearly_price ||
          0;
        originalAmount =
          hostingPlan.original_price ||
          hostingPlan.price ||
          hostingPlan.period_price ||
          null;
        if (originalAmount && originalAmount > priceAmount) {
          discountPercent = Math.round(
            ((originalAmount - priceAmount) / originalAmount) * 100,
          );
        }
      }

      // Add hosting to cart (for both bundle and regular flow)
      const hostingPayload = {
        itemType: "hosting",
        hosting: {
          provider: hostingPlan.provider || "hostbay",
          planId:
            hostingPlan.id || hostingPlan.plan_id || hostingPlan.whm_package,
          planName: hostingPlan.plan_name || hostingPlan.name || "Hosting Plan",
          planCode: hostingPlan.whm_package || null,
          planType: hostingPlan.type || null,
          billingCycle: "monthly",
          tenureLabel: "Monthly",
          tenureMonths: 1,
          features: Array.isArray(hostingPlan.features)
            ? hostingPlan.features
            : [],
          planSnapshot: hostingPlan,
          domainOption: canUseBundle ? "new" : "existing",
          domainName: domainItem.domain?.name || "",
          domainPrice: null,
        },
        price: {
          amount: priceAmount,
          currency: "USD",
          originalAmount: originalAmount,
          discountPercent: discountPercent,
          displayText:
            hostingPlan.display_price ||
            `$${priceAmount.toFixed(2)}`,
        },
        metadata: {
          provider: hostingPlan.provider || "hostbay",
        },
      };

      const addToCartRes = await cartAPI.addToCart(hostingPayload);

      if (!addToCartRes?.success && !addToCartRes?.data) {
        throw new Error(t.pages.failedToAddHostingToCart || "Failed to add hosting to cart");
      }

      showAlert(t.pages.hostingPlanAddedToCart || "Hosting plan added to cart", { type: "success" });
      navigate("/cart");
    } catch (error) {
      console.error("Error in handleContinue:", error);
      showAlert(
        error?.response?.data?.message ||
        error?.message ||
        t.pages.failedToProceedWithCheckout || "Failed to proceed with checkout",
        { type: "fail" },
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="checkout-card">
      <h2 className="heading-title mb-6">{t.pages.completeYourSetup || "Complete Your Setup"}</h2>

      <div className="w-full flex lg:flex-row flex-col gap-10">
        <div className="lg:w-4/6">
          <div className="cart-card mb-3">
            <div className="flex items-center justify-between gap-7">
              <h2 className="flex flex-col flex-wrap items-start justify-start card-title font-medium">
                <p className="text-primary dark:text-gray-500">
                  {t.pages.readyToLaunchYourSite || "Ready to launch your site?"}
                </p>
                <p className="text-15 font-medium text-secondary mb-0">
                  {t.pages.nowThatYouveGrabbedYourDomain || "Now that you've grabbed your domain, let's get you the hosting to match — fast, secure, and ready to go."}
                </p>
              </h2>
            </div>

            <hr className="card-divider my-6" />

            {loading ? (
              // <div className="flex items-center justify-center py-8">
              //   <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-tealdark"></div>
              // </div>
              <Loader />
            ) : (
              <>
                <div className="space-y-4">
                  {/* Hosting plans */}
                  {hostingPlans.length === 0 && !loading && (
                    <div className="text-center py-8 text-secondary space-y-1">
                      <p>{t.pages.noHostingPlansAvailable || "No hosting plans available"}</p>
                      <p className="text-sm">{t.pages.youCanContinueWithoutHosting || "You can still continue without hosting and complete your domain purchase."}</p>
                    </div>
                  )}
                  {hostingPlans.map((plan) => {
                    const planId =
                      plan.id || plan.plan_id || plan.whm_package || plan.name;

                    // Get calculated price if available (for HostBay plans)
                    const calculatedPrice = calculatedPrices[planId];
                    const isLoadingPrice = loadingPrices[planId];

                    // Use calculated price if available, otherwise fallback to plan prices
                    let discountedPrice = 0;
                    let originalPrice = null;
                    let discount = 0;

                    if (calculatedPrice) {
                      // Use calculated price from API
                      discountedPrice = calculatedPrice.total_price || 0;
                      originalPrice = calculatedPrice.total_before_discount || null;
                      // Only show discount if api_discount exists and is greater than 0
                      discount = calculatedPrice.api_discount && calculatedPrice.api_discount > 0
                        ? calculatedPrice.api_discount
                        : 0;
                    } else {
                      // Fallback to plan prices (for non-HostBay or when calculation fails)
                      discountedPrice =
                        plan.price ||
                        plan.period_price ||
                        plan.monthly_price ||
                        plan.yearly_price ||
                        0;
                      originalPrice = plan.original_price || null;
                      // Calculate discount only if original price exists and is higher
                      if (originalPrice && originalPrice > discountedPrice && discountedPrice > 0) {
                        discount = Math.round(
                          ((originalPrice - discountedPrice) / originalPrice) * 100,
                        );
                      }
                    }

                    // Only show discount if discount > 0
                    const hasDiscount = discount > 0 && originalPrice && originalPrice > discountedPrice;

                    return (
                      <label
                        key={planId}
                        className="flex justify-between items-start"
                      >
                        <div>
                          <div className="flex items-start gap-2 mb-1.5">
                            <div className="mt-1">
                              <input
                                type="radio"
                                name="plan"
                                checked={selectedPlan === planId}
                                onChange={() => setSelectedPlan(planId)}
                                className="sr-only"
                              />
                              <div
                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors duration-200
                                                                ${selectedPlan ===
                                    planId
                                    ? "border-tealdark bg-tealdark"
                                    : "border-gray-400"
                                  }`}
                              >
                                {selectedPlan === planId && (
                                  <div className="w-3 h-3 bg-white dark:bg-gray-800 rounded-full"></div>
                                )}
                              </div>
                            </div>
                            <div className="font-medium text-lg text-primary dark:text-gray-300">
                              {plan.plan_name ||
                                plan.name ||
                                plan.whm_package ||
                                t.pages.hostingPlan || "Hosting Plan"}
                            </div>
                          </div>

                          <div>
                            <ul className="text-13 text-secondary font-medium list-disc pl-6">
                              {Array.isArray(plan.features) &&
                                plan.features.length > 0 ? (
                                plan.features.map((feature, index) => (
                                  <li key={index}>{feature}</li>
                                ))
                              ) : (
                                <li>{t.pages.standardHostingFeatures || "Standard hosting features"}</li>
                              )}
                            </ul>
                          </div>
                        </div>
                        {(discountedPrice > 0 || isLoadingPrice) && (
                          <div className="flex flex-col items-end gap-1 text-primary dark:text-gray-300">
                            {isLoadingPrice ? (
                              <div className="text-sm text-gray-500">{t.pages.loading || "Loading..."}</div>
                            ) : (
                              <>

                                <div className="text-lg font-medium text-tealdark">
                                  ${discountedPrice.toFixed(2)}
                                </div>
                                {/* Show original price and discount only if there's a discount from API */}
                                {hasDiscount && (
                                  <>
                                    <div className="text-13 font-medium line-through text-secondary">
                                      ${originalPrice.toFixed(2)}
                                    </div>
                                    <div className="text-xs font-medium text-secondary">
                                      {discount}% {t.pages.off || "off"}
                                    </div>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </label>
                    );
                  })}

                  {/* No hosting option */}
                  <label className="flex justify-between items-start">
                    <div>
                      <div className="flex items-start gap-2 mb-1.5">
                        <div className="mt-1">
                          <input
                            type="radio"
                            name="plan"
                            checked={selectedPlan === "none"}
                            onChange={() => setSelectedPlan("none")}
                            className="sr-only"
                          />
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors duration-200
                                                        ${selectedPlan ===
                                "none"
                                ? "border-tealdark bg-tealdark"
                                : "border-gray-400"
                              }`}
                          >
                            {selectedPlan === "none" && (
                              <div className="w-3 h-3 bg-white dark:bg-gray-800 rounded-full"></div>
                            )}
                          </div>
                        </div>
                        <div className="font-medium text-lg text-primary dark:text-gray-300">
                          {t.pages.noHostingPlan || "No hosting plan"}
                        </div>
                      </div>
                    </div>
                  </label>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="lg:w-2/6 flex justify-end lg:justify-start">
          <button
            onClick={handleContinue}
            disabled={submitting || loading}
            className={`add-to-cart ${submitting || loading ? "opacity-60 cursor-not-allowed" : ""
              }`}
          >
            {submitting ? (t.payment.processing || "Processing...") : (t.admin.continue || "Continue")}{" "}
            <TbArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpsellCheckout;
