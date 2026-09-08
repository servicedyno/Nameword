import { IoChevronDown, IoClose } from "react-icons/io5";
import { TbArrowRight } from "react-icons/tb";
import { MdCheck } from "react-icons/md";
import { useState, useEffect, useMemo, useRef } from "react";
import { NavLink, useSearchParams, useNavigate } from "react-router";
import { hostingAPI } from "../../../api/hosting";
import { useDomain } from "../../../hooks/useDomain";
import { useCustomLocation } from "../../../hooks/useCustomLocation";
import { useAlert } from "../../../context/AlertContext";
import { useAuth } from "../../../hooks/useAuth";
import Loader from "../../../components/common/Loader";
import moment from "moment";
import { calculateDiscount } from "../../../utils/promocode";
import { useLanguage } from "../../../hooks/useLanguage";

const RenewPlan = () => {
  const [email, setEmail] = useState("");
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [openPeriodDropdown, setOpenPeriodDropdown] = useState(false);
  const [renewalOptions, setRenewalOptions] = useState(null);
  const dropdownRef = useRef(null);
  const [showPromo, setShowPromo] = useState(true);
  const [hostingOrder, setHostingOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [subscriptionNotFound, setSubscriptionNotFound] = useState(false);

  const { t } = useLanguage();

  // Handle promo code
  const handlePromoCode = async () => {
    if (!email.trim()) {
      showAlert(t.websites.renewPlan.validation.promocodeRequired, { type: "fail" });
      return;
    }

    const renewalPrice = Number(selectedPeriod?.total_price || selectedPeriod?.price || 0);
    if (renewalPrice <= 0) {
      showAlert(t.websites.renewPlan.validation.selectPeriodFirst || "Please select a period first", { type: "fail" });
      return;
    }

    const discount = await calculateDiscount(renewalPrice, email.trim());

    if (discount.error) {
      showAlert(discount.error, { type: "fail" });
      return;
    }

    if (!discount.promoCode || discount.discount <= 0) {
      showAlert(t.websites.renewPlan.validation.invalidPromocode, { type: "fail" });
      return;
    }

    setAppliedPromo(discount.promoCode);
    setPromoDiscount(discount.discount);
    showAlert(t.websites.renewPlan.promocodeAppliedSuccess
      .replace("{code}", discount.promoCode)
      .replace("{amount}", discount.discount.toFixed(2)), { type: "success" });
  };

  const handleRemovePromoCode = () => {
    setAppliedPromo(null);
    setPromoDiscount(0);
    setEmail("");
  };

  const locationState = useCustomLocation();
  const { domains } = useDomain();
  const { showAlert } = useAlert();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const subscriptionIdFromUrl = searchParams.get("subscriptionId");

  const activeDomain = useMemo(() => {
    if (locationState?.currentDomain?.websiteName) {
      return locationState.currentDomain;
    }
    return null;
  }, [locationState?.currentDomain?.websiteName]);

  // Fetch hosting order
  useEffect(() => {
    const fetchHostingOrder = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const domainName = activeDomain?.websiteName?.toLowerCase().trim();

        console.log("[RenewPlan] Fetching hosting orders:", {
          subscriptionIdFromUrl,
          domainName,
          activeDomain: activeDomain?.websiteName
        });

        // Fetch orders - try with domain filter first, then without if needed
        let hostingResponse = await hostingAPI.getHostingOrders({
          ...(subscriptionIdFromUrl
            ? { subscriptionId: subscriptionIdFromUrl }
            : {}),
          ...(domainName ? { domainName, status: "completed" } : { status: "completed" }),
        });

        // If no orders found and we have domainName, try without domain filter
        if (
          (!hostingResponse?.success || 
           (!hostingResponse?.responseData?.orders?.length && 
            !hostingResponse?.responseData?.length &&
            !hostingResponse?.data?.orders?.length &&
            !hostingResponse?.data?.length &&
            !hostingResponse?.orders?.length)) &&
          domainName &&
          !subscriptionIdFromUrl
        ) {
          console.log("[RenewPlan] No orders found with domain filter, trying without domain filter");
          hostingResponse = await hostingAPI.getHostingOrders({
            status: "completed"
          });
        }

        let allOrders = [];
        let order = null;

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

          if (subscriptionIdFromUrl) {
            // Try to find order by subscription ID (check multiple possible fields)
            order = allOrders.find(
              (o) => {
                const orderSubId = o.hostbayResponse?.subscription?.id;
                const orderSubIdAlt = o.hostbayResponse?.subscription_id;
                const orderMongoId = o._id?.toString();
                const orderSubIdField = o.subscriptionId?.toString();
                
                return (
                  orderMongoId === subscriptionIdFromUrl ||
                  orderSubIdField === subscriptionIdFromUrl ||
                  String(orderSubId) === String(subscriptionIdFromUrl) ||
                  String(orderSubIdAlt) === String(subscriptionIdFromUrl)
                );
              }
            );
            
            if (!order && domainName) {
              // If not found by subscription ID, try domain name as fallback
              const domainNameLower = domainName.toLowerCase().trim();
              const domainMatchingOrders = allOrders.filter((order) => {
                const hostbayDomain = (order.hostbayResponse?.domain_name || "")
                  .toLowerCase()
                  .trim();
                const orderDomainName = (order.domainName || "")
                  .toLowerCase()
                  .trim();
                return hostbayDomain === domainNameLower || orderDomainName === domainNameLower;
              });
              if (domainMatchingOrders.length > 0) {
                order = domainMatchingOrders[0];
              }
            }
          } else if (domainName) {
            const domainNameLower = domainName.toLowerCase().trim();
            const domainMatchingOrders = allOrders.filter((order) => {
              const hostbayDomain = (order.hostbayResponse?.domain_name || "")
                .toLowerCase()
                .trim();
              const orderDomainName = (order.domainName || "")
                .toLowerCase()
                .trim();

              // Exact match first (most reliable)
              if (hostbayDomain === domainNameLower || orderDomainName === domainNameLower) {
                return true;
              }
              
              // Partial match as fallback
              return hostbayDomain.includes(domainNameLower) || 
                     domainNameLower.includes(hostbayDomain) ||
                     orderDomainName.includes(domainNameLower) ||
                     domainNameLower.includes(orderDomainName);
            });

            if (domainMatchingOrders.length > 0) {
              // Prefer exact match if available
              const exactMatch = domainMatchingOrders.find((o) => {
                const hostbayDomain = (o.hostbayResponse?.domain_name || "").toLowerCase().trim();
                const orderDomainName = (o.domainName || "").toLowerCase().trim();
                return hostbayDomain === domainNameLower || orderDomainName === domainNameLower;
              });
              order = exactMatch || domainMatchingOrders[0];
            }
          }

          if (!order && allOrders.length > 0) {
            order = allOrders[0];
          }
        }

        if (order) {
          console.log("[RenewPlan] Found hosting order:", {
            _id: order._id,
            domainName: order.domainName,
            hostbayDomain: order.hostbayResponse?.domain_name,
            subscriptionId: order.hostbayResponse?.subscription?.id,
            subscription_id: order.hostbayResponse?.subscription_id,
            status: order.status
          });
          setHostingOrder(order);
        } else {
          console.log("[RenewPlan] No hosting order found", {
            domainName,
            subscriptionIdFromUrl,
            allOrdersCount: allOrders.length,
            activeDomain: activeDomain?.websiteName
          });
        }
        // Don't show error if order not found - we can still use subscription ID directly for renewal price
      } finally {
        setLoading(false);
      }
    };

    fetchHostingOrder();
  }, [user, subscriptionIdFromUrl, activeDomain?.websiteName, showAlert]);

  // Get dynamic subscription ID from various sources
  const getSubscriptionId = useMemo(() => {
    // Priority 1: From URL params
    if (subscriptionIdFromUrl) {
      console.log("[RenewPlan] Using subscription ID from URL:", subscriptionIdFromUrl);
      return subscriptionIdFromUrl;
    }

    // Only use HostBay subscription IDs, not MongoDB ObjectId
    if (hostingOrder?.hostbayResponse?.subscription?.id) {
      const subId = String(hostingOrder.hostbayResponse.subscription.id);
      console.log("[RenewPlan] Using subscription ID from hostingOrder.hostbayResponse.subscription.id:", subId);
      return subId;
    }
    if (hostingOrder?.hostbayResponse?.subscription_id) {
      const subId = String(hostingOrder.hostbayResponse.subscription_id);
      console.log("[RenewPlan] Using subscription ID from hostingOrder.hostbayResponse.subscription_id:", subId);
      return subId;
    }
    if (hostingOrder?.subscriptionId) {
      const subId = String(hostingOrder.subscriptionId);
      console.log("[RenewPlan] Using subscription ID from hostingOrder.subscriptionId:", subId);
      return subId;
    }
    
    // Don't use hostingOrder._id (MongoDB ObjectId) as it's not a HostBay subscription ID
    console.warn("[RenewPlan] No valid subscription ID found, using fallback '2'. HostingOrder:", {
      hasHostingOrder: !!hostingOrder,
      hostingOrderKeys: hostingOrder ? Object.keys(hostingOrder) : [],
      hostbayResponse: hostingOrder?.hostbayResponse ? {
        hasSubscription: !!hostingOrder.hostbayResponse.subscription,
        subscriptionKeys: hostingOrder.hostbayResponse.subscription ? Object.keys(hostingOrder.hostbayResponse.subscription) : []
      } : null
    });
    return "2";
  }, [subscriptionIdFromUrl, hostingOrder]);

  // Fetch renewal options (all plans with periods)
  useEffect(() => {
    const fetchRenewalOptions = async () => {
      if (!getSubscriptionId) {
        console.log("No subscription ID available for fetching renewal options");
        return;
      }

      // Don't call API if subscription ID is a MongoDB ObjectId (24 hex chars)
      // Only HostBay subscription IDs (numeric) should be used
      const isMongoObjectId = /^[0-9a-fA-F]{24}$/.test(getSubscriptionId);
      if (isMongoObjectId) {
        console.log("Skipping API call - subscription ID is MongoDB ObjectId, not HostBay subscription ID");
        return;
      }

      try {
        setLoadingOptions(true);
        setSubscriptionNotFound(false);
        
        const response = await hostingAPI.getRenewalOptions(getSubscriptionId);
        
        console.log("Full renewal options response:", response);

        // Check for subscription not found error
        if (
          response?.responseMsg?.statusCode === 404 ||
          response?.responseMsg?.message
            ?.toLowerCase()
            .includes("subscription not found")
        ) {
          setSubscriptionNotFound(true);
          showAlert(t.websites.renewPlan.validation.subscriptionNotFound, { type: "fail" });
          return;
        }

        const renewalData = response?.data || response?.responseData;
        
        if (response?.success && renewalData) {
          console.log("Renewal options data:", renewalData);
          setRenewalOptions(renewalData);

          // Set current plan as selected by default
          const options = renewalData.renewal_options || [];
          const currentPlan = options.find(
            (plan) => plan.is_current_plan === true
          ) || options[0];

          if (currentPlan) {
            console.log("Selected plan:", currentPlan);
            setSelectedPlan(currentPlan);
            
            // Set first period of current plan as selected
            if (currentPlan.periods && currentPlan.periods.length > 0) {
              console.log("First period:", currentPlan.periods[0]);
              setSelectedPeriod(currentPlan.periods[0]);
            }
          }
        } else {
          console.error("Failed to load renewal options - response:", response);
          showAlert(t.websites.renewPlan.validation.failedToLoadOptions, { type: "fail" });
        }
      } catch (error) {
        console.error("Error fetching renewal options:", error);
        if (
          error?.response?.status === 404 ||
          error?.response?.data?.responseMsg?.statusCode === 404
        ) {
          setSubscriptionNotFound(true);
          showAlert(t.websites.renewPlan.validation.subscriptionNotFound, { type: "fail" });
        } else {
          showAlert(t.websites.renewPlan.validation.failedToLoadOptions, { type: "fail" });
        }
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchRenewalOptions();
  }, [getSubscriptionId, showAlert]);

  // Update selected period when plan changes
  useEffect(() => {
    if (selectedPlan && selectedPlan.periods && selectedPlan.periods.length > 0) {
      // Set first period of selected plan
      setSelectedPeriod(selectedPlan.periods[0]);
    } else {
      setSelectedPeriod(null);
    }
  }, [selectedPlan]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenPeriodDropdown(false);
      }
    };

    if (openPeriodDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openPeriodDropdown]);

  // Get plan name
  const getPlanName = () => {
    if (selectedPlan) {
      return selectedPlan.plan_name || selectedPlan.plan_code || t.websites.websitesOverview.hostingPlan;
    }
    if (!hostingOrder) return t.websites.websitesOverview.hostingPlan;
    return (
      hostingOrder.planSnapshot?.plan_name ||
      hostingOrder.planSnapshot?.name ||
      hostingOrder.plan ||
      t.websites.websitesOverview.hostingPlan
    );
  };

  // Calculate renewal date
  const getRenewalDate = () => {
    if (!selectedPeriod) return "";
    if (renewalOptions?.next_billing_date) {
      // Calculate from next billing date
      const nextBillingDate = moment(renewalOptions.next_billing_date);
      const extensionDays = selectedPeriod.extension_days || 0;
      return nextBillingDate.add(extensionDays, "days").format("MMMM YYYY");
    }
    // Fallback: calculate from current date
    const currentDate = moment();
    const extensionDays = selectedPeriod.extension_days || 0;
    return currentDate.add(extensionDays, "days").format("MMMM YYYY");
  };

  // Get price display
  const getPriceDisplay = () => {
    if (!selectedPeriod) {
      console.log("No selectedPeriod");
      return null;
    }

    console.log("selectedPeriod:", selectedPeriod);
    const totalPrice = Number(selectedPeriod.total_price) || 0;
    console.log("totalPrice:", totalPrice);
    
    if (totalPrice <= 0) {
      console.log("totalPrice is 0 or invalid");
      return null;
    }

    const pricePerPeriod = Number(selectedPlan?.price_per_period) || totalPrice;
    const period = Number(selectedPeriod.period) || 1;
    const totalBeforeDiscount = pricePerPeriod * period;
    const discount = totalBeforeDiscount - totalPrice;

    const priceDisplay = {
      totalPrice: totalPrice.toFixed(2),
      originalPrice: totalBeforeDiscount > 0 ? totalBeforeDiscount.toFixed(2) : totalPrice.toFixed(2),
      discountPercent:
        totalBeforeDiscount > 0 && discount > 0
          ? Math.round((discount / totalBeforeDiscount) * 100)
          : 0,
    };
    
    console.log("priceDisplay:", priceDisplay);
    return priceDisplay;
  };

  const priceDisplay = getPriceDisplay();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader />
      </div>
    );
  }

  // Allow page to render even without hosting order if we have subscription ID
  // Hosting order is optional - we can fetch renewal prices using subscription ID directly

    return (
    <div className="space-y-7">
      {/* title */}
      <div className="flex flex-col gap-2 title-section">
        <h2>{t.websites.renewPlan.title}</h2>
      </div>

      <div className="w-full flex lg:flex-row flex-col sm:gap-8 gap-6">
        <div className="2xl:w-4/6 xl:w-1/2 flex flex-col w-full gap-10">
          {/* Pro Plan */}
          <div className="cart-card mb-3 bg-white dark:bg-gray-800">
            <h2 className="flex flex-col flex-wrap items-start justify-start card-title font-medium">
              <p className="text-primary dark:text-gray-500">{getPlanName()}</p>
            </h2>

            <hr className="card-divider my-6" />

            <div className="flex gap-2 justify-between items-center">
              <div className="flex flex-col gap-3">
                {/* term select option */}
                <div className="relative w-48" ref={dropdownRef}>
                  <div 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setOpenPeriodDropdown(!openPeriodDropdown);
                    }} 
                    className="term-select cursor-pointer"
                  >
                    <p className="text-xs text-secondary font-medium">{t.websites.renewPlan.term}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-primary dark:text-gray-400">
                        {loadingOptions ? (
                          <Loader />
                        ) : selectedPeriod ? (
                          selectedPeriod.label
                        ) : (
                          t.websites.renewPlan.selectPeriod
                        )}
                      </span>
                      <IoChevronDown className="absolute top-1/2 transform -translate-y-1/2 right-4 w-4 h-4 text-primary dark:text-gray-400" />
                    </div>
                  </div>

                  {/* Dropdown items */}
                  {openPeriodDropdown && (
                    <div className="dropdown-select">
                      {loadingOptions ? (
                        <div className="px-4 py-2 text-sm text-primary dark:text-gray-400">
                          {t.websites.common.loading}
                        </div>
                      ) : selectedPlan?.periods && selectedPlan.periods.length > 0 ? (
                        selectedPlan.periods.map((periodOption, index) => {
                            const isSelected = selectedPeriod && (
                              selectedPeriod.billing_cycle === periodOption.billing_cycle ||
                              selectedPeriod.period === periodOption.period ||
                              selectedPeriod.label === periodOption.label
                            );
                            
                            return (
                              <div
                                key={index}
                                onClick={() => {
                                  setSelectedPeriod(periodOption);
                                  setOpenPeriodDropdown(false);
                                }}
                                className={`px-4 py-2 cursor-pointer hover:bg-slatelight dark:hover:bg-gray-800 text-sm font-medium text-primary dark:text-gray-400 ${
                                  isSelected
                                    ? "bg-slatelight dark:bg-gray-900 font-medium"
                                    : ""
                                }`}
                              >
                                <div className="flex justify-between items-center">
                                  <span>{periodOption.label}</span>
                                  <span className="text-xs text-tealdark ml-2">
                                    ${periodOption.total_price?.toFixed(2) || "0.00"}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                        <div className="px-4 py-2 text-sm text-primary dark:text-gray-400">
                          {t.websites.renewPlan.noPeriodsAvailable}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <p className="cart-title text-13">
                  {selectedPeriod && priceDisplay ? (
                    t.websites.renewPlan.renewsIn
                      .replace("{date}", getRenewalDate())
                      .replace("{price}", priceDisplay.totalPrice)
                  ) : loadingOptions ? (
                    <Loader />
                  ) : (
                    t.websites.renewPlan.unableToLoadRenewal
                  )}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 text-primary dark:text-gray-300">
                {loadingOptions ? (
                  <Loader />
                ) : selectedPeriod && priceDisplay && Number(priceDisplay.totalPrice) > 0 ? (
                  <>
                    <div className="text-lg font-medium text-tealdark">
                      ${priceDisplay.totalPrice}
                    </div>
                    {priceDisplay.discountPercent > 0 && (
                      <>
                        <div className="text-13 font-medium line-through">
                          ${priceDisplay.originalPrice}
                        </div>
                        <div className="text-xs font-medium">
                          {priceDisplay.discountPercent}% off
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="text-lg font-medium text-tealdark">$0.00</div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="2xl:w-2/5 xl:w-1/2 flex">
          <div className="order-summary w-full">
            <h3 className="font-medium text-lg mb-5 text-primary dark:text-white">
              {t.websites.renewPlan.orderSummary}
            </h3>
            <h4 className="text-primary dark:text-gray-500 text-15 font-medium">
              {t.websites.renewPlan.items}
            </h4>
            <hr className="card-divider my-3.5" />
            <div className="flex gap-5 flex-col w-full">
              <div>
                <div className="flex justify-between items-center">
                  <p className="text-primary dark:text-gray-500 text-base font-medium">
                    {t.websites.renewPlan.subtotal}
                  </p>
                  <span className="text-tealdark font-semibold text-2xl">
                    {loadingOptions ? (
                      <Loader />
                    ) : selectedPeriod && priceDisplay ? (
                      `$${Math.max(0, Number(priceDisplay.totalPrice) - promoDiscount).toFixed(2)}*`
                    ) : (
                      "$0.00*"
                    )}
                  </span>
                </div>
                <p className="text-13 font-medium text-teallight-400">
                  {t.websites.renewPlan.taxesNote}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <p
                  className="flex items-center gap-2 text-13 text-darkbtn hover:text-darkbtn-hover dark:text-gray-500 hover:dark:text-white font-medium cursor-pointer transition-all"
                  onClick={() => setShowPromo(!showPromo)}
                >
                  {t.websites.renewPlan.havePromocode} <IoChevronDown size={14} />
                </p>

                {showPromo && (
                  <>
                    <div className="w-full flex sm:flex-row flex-col justify-center items-center gap-2 promocode">
                      {!appliedPromo ? (
                        <>
                          <div className="relative w-full">
                            <input
                              type="text"
                              className="input-field peer w-full"
                              id="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handlePromoCode();
                                }
                              }}
                              placeholder=""
                            />
                            <label
                              htmlFor="email"
                              className={`absolute left-5 transition-all font-medium ${
                                email
                                  ? "top-2 text-xs text-gray-600"
                                  : "top-4 text-13 text-primary dark:text-gray-500 "
                              } peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}
                            >
                              {t.websites.renewPlan.promocodePlaceholder}
                            </label>
                          </div>
                          <button 
                            onClick={handlePromoCode}
                            className="add-to-cart sm:w-auto w-full"
                          >
                            {t.websites.common.apply}
                          </button>
                        </>
                      ) : (
                        <div className="w-full flex justify-center items-center gap-2 promocode">
                          <div className="promocode-added">
                            <MdCheck className="w-5 h-5 flex-none" />
                            <p>{t.websites.renewPlan.promocodeApplied.replace("{code}", appliedPromo)}</p>
                            <IoClose 
                              className="cursor-pointer w-4 h-4 text-primary dark:text-white hover:text-red-500 ml-2" 
                              onClick={handleRemovePromoCode}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-start">
                <a
                  href="#"
                  className={`add-to-cart px-7 ${
                    !selectedPeriod || loadingOptions || !selectedPlan
                      ? "opacity-60 cursor-not-allowed"
                      : ""
                  }`}
                    onClick={(e) => {
                    e.preventDefault();
                    if (!selectedPeriod || loadingOptions || !getSubscriptionId || !selectedPlan) {
                      showAlert(t.websites.renewPlan.validation.waitForOptions, {
                        type: "info",
                      });
                      return;
                    }
                    if (appliedPromo && promoDiscount > 0) {
                      localStorage.setItem("appliedPromoCode", appliedPromo);
                      localStorage.setItem("promoDiscount", promoDiscount.toString());
                    }
                    const renewalParams = new URLSearchParams({
                      type: "renewal",
                      subscriptionId: getSubscriptionId,
                      period: selectedPeriod?.period || 1,
                      plan: selectedPlan?.plan_code || "",
                      amount: (selectedPeriod?.total_price || 0).toString(),
                    });
                    navigate(`/payment-checkout?${renewalParams.toString()}`);
                  }}
                >
                  {t.websites.renewPlan.goToCheckout} <TbArrowRight size={18} />
                </a>
              </div>

              <p className="text-13 font-medium text-secondary">
                {t.websites.renewPlan.termsAgreement.split("{termsLink}").map((part, i, arr) => {
                  if (i === arr.length - 1) {
                    const [beforePrivacy, afterPrivacy] = part.split("{privacyLink}");
                    return (
                      <span key={i}>
                        {beforePrivacy}
                        <NavLink
                          to="/privacy-policy"
                          className="text-teallight-500 font-semibold hover:underline"
                        >
                          {t.websites.renewPlan.privacyPolicy}
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
                        {t.websites.renewPlan.termsOfService}
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

export default RenewPlan;
