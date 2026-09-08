import { hosting, edit } from "../../components/common/icons";
import { LuTrash2 } from "react-icons/lu";
import { TbArrowRight } from "react-icons/tb";
import { NavLink } from "react-router";
import { IoChevronDown } from "react-icons/io5";
import { useState, useEffect, useCallback } from "react";
import { cartAPI } from "../../api/cartApi";
import { hostingAPI } from "../../api/hosting";
import { useAlert } from "../../context/AlertContext";
import EditDomainModal from "../modals/edit-domain-modal";
import { useLanguage } from "../../hooks/useLanguage";

const formatPrice = (value, fallback = "Contact us") => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  if (typeof value === "string") return value;
  const num = Number(value);
  return Number.isNaN(num) ? fallback : `$${num.toFixed(2)}`;
};

const deriveFeatures = (hostingData = {}) => {
  if (Array.isArray(hostingData.features) && hostingData.features.length > 0) {
    return hostingData.features;
  }

  const snapshot = hostingData.planSnapshot || {};
  return [
    `${snapshot?.disk_space_gb ?? 0} GB SSD Storage`,
    `${snapshot?.bandwidth_gb ?? 0} GB Bandwidth`,
    `${snapshot?.email_accounts ?? 0} Email Accounts`,
    `${snapshot?.databases ?? 0} Databases`,
    "Free SSL Certificate",
    "24/7 Support",
  ].filter(Boolean);
};

const getDomainDescription = (hostingData, t) => {
  if (hostingData.domainOption === "existing") {
    return t.cart.hosting.existingDomainGuide;
  }
  if (hostingData.domainName) {
    return hostingData.domainName;
  }
  return t.cart.hosting.pickDomainGuide;
};

const calculateTenureOptions = (planSnapshot, allPlans = []) => {
  if (!planSnapshot) return [];

  const durationDays = planSnapshot.duration_days || 0;
  const billingCycle = planSnapshot.billing_cycle?.toLowerCase() || "";
  const provider = planSnapshot.provider || "hostbay";
  const planName = planSnapshot.plan_name || planSnapshot.name || "";
  const whmPackage = planSnapshot.whm_package || "";

  const options = [];

  // Helper function to extract base plan name (remove duration indicators)
  const getBasePlanName = (name) => {
    if (!name) return "";
    return name
      .replace(/\s*(7|30)\s*days?/gi, "")
      .replace(/\s*(7|30)\s*day/gi, "")
      .trim();
  };

  // For 7-day plans, add 30-day option
  if (durationDays === 7 || billingCycle === "7days") {
    const currentPrice =
      planSnapshot.period_price ||
      planSnapshot.weekly_price ||
      planSnapshot.monthly_price ||
      0;

    // Add current 7-day option
    options.push({
      id: 1,
      label: "7 days",
      price: currentPrice,
      months: 7 / 30,
      billingCycle: "7days",
      durationDays: 7,
      isCurrent: true,
    });

    const basePlanName = getBasePlanName(planName);
    const expected30DayPackage = whmPackage
      ? whmPackage.replace("_7day", "_30day").replace("7day", "30day")
      : "";
    const thirtyDayPlan = allPlans.find((p) => {
      const isSameProvider = p.provider === provider;
      const is30Days =
        p.duration_days === 30 || p.billing_cycle?.toLowerCase() === "30days";
      const pBaseName = getBasePlanName(p.plan_name || p.name || "");
      const matchesBaseName =
        basePlanName &&
        pBaseName &&
        pBaseName.toLowerCase() === basePlanName.toLowerCase();
      const matchesWhmPackage =
        expected30DayPackage &&
        p.whm_package &&
        (p.whm_package === expected30DayPackage ||
          p.whm_package.toLowerCase() === expected30DayPackage.toLowerCase());
      const matchesExactName = p.plan_name === planName || p.name === planName;

      return (
        isSameProvider &&
        is30Days &&
        (matchesBaseName || matchesWhmPackage || matchesExactName)
      );
    });

    if (thirtyDayPlan) {
      const thirtyDayPrice =
        thirtyDayPlan.period_price || thirtyDayPlan.monthly_price || 0;
      options.push({
        id: 2,
        label: "30 days",
        price: thirtyDayPrice,
        months: 30 / 30,
        billingCycle: "30days",
        durationDays: 30,
        alternatePlan: thirtyDayPlan,
        isCurrent: false,
      });
    } else {
      // Debug: Log if 30-day plan not found
      console.log("30-day plan not found for:", {
        provider,
        planName,
        basePlanName,
        whmPackage,
        allPlansCount: allPlans.length,
        available30DayPlans: allPlans.filter(
          (p) =>
            p.provider === provider &&
            (p.duration_days === 30 ||
              p.billing_cycle?.toLowerCase() === "30days")
        ),
      });
    }
  }
  // For 30-day plans, add 7-day option
  else if (durationDays === 30 || billingCycle === "30days") {
    const currentPrice =
      planSnapshot.period_price || planSnapshot.monthly_price || 0;

    // Add current 30-day option
    options.push({
      id: 1,
      label: "30 days",
      price: currentPrice,
      months: 30 / 30,
      billingCycle: "30days",
      durationDays: 30,
      isCurrent: true,
    });

    // Find 7-day plan from all plans - match by base plan name or whm_package
    const basePlanName = getBasePlanName(planName);
    const expected7DayPackage = whmPackage
      ? whmPackage.replace("_30day", "_7day").replace("30day", "7day")
      : "";
    const sevenDayPlan = allPlans.find((p) => {
      const isSameProvider = p.provider === provider;
      const is7Days =
        p.duration_days === 7 || p.billing_cycle?.toLowerCase() === "7days";
      const pBaseName = getBasePlanName(p.plan_name || p.name || "");
      const matchesBaseName =
        basePlanName &&
        pBaseName &&
        pBaseName.toLowerCase() === basePlanName.toLowerCase();
      const matchesWhmPackage =
        expected7DayPackage &&
        p.whm_package &&
        (p.whm_package === expected7DayPackage ||
          p.whm_package.toLowerCase() === expected7DayPackage.toLowerCase());
      const matchesExactName = p.plan_name === planName || p.name === planName;

      return (
        isSameProvider &&
        is7Days &&
        (matchesBaseName || matchesWhmPackage || matchesExactName)
      );
    });

    if (sevenDayPlan) {
      const sevenDayPrice =
        sevenDayPlan.period_price ||
        sevenDayPlan.weekly_price ||
        sevenDayPlan.monthly_price ||
        0;
      options.push({
        id: 2,
        label: "7 days",
        price: sevenDayPrice,
        months: 7 / 30,
        billingCycle: "7days",
        durationDays: 7,
        alternatePlan: sevenDayPlan,
        isCurrent: false,
      });
    }
  }
  // For other specific durations, show only that
  else if (durationDays > 0) {
    const price =
      planSnapshot.period_price ||
      planSnapshot.weekly_price ||
      planSnapshot.monthly_price ||
      0;
    options.push({
      id: 1,
      label: `${durationDays} days`,
      price: price,
      months: durationDays / 30,
      billingCycle: planSnapshot.billing_cycle || `${durationDays}days`,
      durationDays: durationDays,
      isCurrent: true,
    });
  }

  // Standard monthly/annual plans
  if (options.length === 0) {
    const monthlyPrice =
      planSnapshot.monthly_price || planSnapshot.period_price || 0;
    const yearlyPrice =
      planSnapshot.yearly_price || planSnapshot.annual_price || 0;
    const twoYearPrice =
      planSnapshot.two_year_price || (yearlyPrice ? yearlyPrice * 2 : 0);
    const threeYearPrice =
      planSnapshot.three_year_price || (yearlyPrice ? yearlyPrice * 3 : 0);

    if (monthlyPrice > 0 && yearlyPrice > 0) {
      options.push({
        id: 1,
        label: "1 month",
        price: monthlyPrice,
        months: 1,
        billingCycle: "monthly",
      });

      options.push({
        id: 2,
        label: "12 months",
        price: yearlyPrice,
        months: 12,
        billingCycle: "yearly",
        originalPrice: monthlyPrice * 12,
        hasDiscount: yearlyPrice < monthlyPrice * 12,
      });
    } else if (monthlyPrice > 0) {
      options.push({
        id: 1,
        label: "1 month",
        price: monthlyPrice,
        months: 1,
        billingCycle: "monthly",
      });
    } else if (yearlyPrice > 0) {
      options.push({
        id: 1,
        label: "12 months",
        price: yearlyPrice,
        months: 12,
        billingCycle: "yearly",
      });
    }
  }

  return options;
};

const HostingCard = ({
  items = [],
  onRemove,
  onItemUpdate,
  setUpdateLoading,
  allCartItems = [], // All cart items to check if domain is separate
  isGuestCart = false,
}) => {
  const hasItems = Array.isArray(items) && items.length > 0;
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [selectedTenureByItemId, setSelectedTenureByItemId] = useState({});
  const [allPlans, setAllPlans] = useState([]);
  const [calculatedPrices, setCalculatedPrices] = useState({}); // Store calculated prices by item ID
  const [loadingPrices, setLoadingPrices] = useState({});
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedItemForEdit, setSelectedItemForEdit] = useState(null);
  const { showAlert } = useAlert();
  const { t } = useLanguage();

  // Fetch all hosting plans on mount
  useEffect(() => {
    const fetchAllPlans = async () => {
      try {
        const response = await hostingAPI.getHostingPlans({ provider: "both" });
     
        if (response?.success) {
          if (response?.data?.plans) {
            setAllPlans(response.data.plans);
          } else if (response?.responseData?.plans) {
            setAllPlans(response.responseData.plans);
          }
        }
      } catch (error) {
        console.error("Failed to fetch hosting plans:", error);
      }
    };
    fetchAllPlans();
  }, []);

  // Get plan code for HostBay API
  const getPlanCode = useCallback((planSnapshot) => {
    if (!planSnapshot) return null;
    return (
      planSnapshot.code ||
      planSnapshot.plan_code ||
      planSnapshot.planCode ||
      planSnapshot.whm_package ||
      planSnapshot.id?.toString() ||
      null
    );
  }, []);

  // Fetch calculated prices for HostBay plans
  useEffect(() => {
    const fetchCalculatedPrices = async () => {
      const pricePromises = items.map(async (item) => {
        const hostingData = item?.hosting || {};
        const planSnapshot = hostingData.planSnapshot || {};
        const provider = hostingData.provider || planSnapshot.provider;

        // Only fetch for HostBay plans
        if (provider !== "hostbay") {
          return { itemId: item._id, price: null };
        }

        const planCode = getPlanCode(planSnapshot);
        if (!planCode) {
          return { itemId: item._id, price: null };
        }

        const selectedTenureId =
          selectedTenureByItemId[item._id] || hostingData.tenureId || 1;
        const tenureOptions = calculateTenureOptions(planSnapshot, allPlans);
        const selectedOption = tenureOptions.find(
          (opt) => opt.id === selectedTenureId
        );

        if (!selectedOption) {
          return { itemId: item._id, price: null };
        }

        // Calculate period
        let period = 1;
        if (planSnapshot.duration_days) {
          period = 1;
        } else if (selectedOption.billingCycle === "yearly") {
          period = 12;
        } else if (selectedOption.months) {
          const roundedMonths = Math.round(selectedOption.months);
          period = roundedMonths > 0 ? roundedMonths : 1;
        }

        try {
          setLoadingPrices((prev) => ({ ...prev, [item._id]: true }));
          const response = await hostingAPI.calculatePrice({
            plan: planCode,
            period: period,
            provider: "hostbay",
          });

          if (response?.success && response?.responseData) {
            return { itemId: item._id, price: response.responseData };
          }
        } catch (error) {
          console.error(
            `Failed to calculate price for item ${item._id}:`,
            error
          );
        } finally {
          setLoadingPrices((prev) => ({ ...prev, [item._id]: false }));
        }

        return { itemId: item._id, price: null };
      });

      const results = await Promise.all(pricePromises);
      const pricesMap = {};
      results.forEach(({ itemId, price }) => {
        if (price) {
          pricesMap[itemId] = price;
        }
      });
      setCalculatedPrices(pricesMap);
    };

    if (items.length > 0 && allPlans.length > 0) {
      fetchCalculatedPrices();
    }
  }, [items, selectedTenureByItemId, allPlans, getPlanCode]);

  // Initialize selected tenure for each item
  useEffect(() => {
    const initialTenures = {};
    items.forEach((item) => {
      if (item._id) {
        const hostingData = item?.hosting || {};
        const currentTenureId = hostingData.tenureId || 1;
        initialTenures[item._id] = currentTenureId;
      }
    });
    setSelectedTenureByItemId(initialTenures);
  }, [items]);

  const handleTenureSelect = useCallback(
    async (itemId, tenureOption) => {
      const item = items.find((i) => i._id === itemId);
      if (!item) return;

      setUpdateLoading?.(true);

      try {
        const hostingData = item?.hosting || {};
        const planSnapshot = hostingData.planSnapshot || {};

        // If switching to an alternate plan (7 days <-> 30 days), use the alternate plan data
        let newPlanSnapshot = planSnapshot;
        if (tenureOption.alternatePlan) {
          newPlanSnapshot = {
            ...tenureOption.alternatePlan,
            provider: planSnapshot.provider || hostingData.provider,
          };
        }

        const newFeatures =
          (Array.isArray(newPlanSnapshot.features) &&
            newPlanSnapshot.features.length > 0 &&
            newPlanSnapshot.features) ||
          hostingData.features ||
          [];

        // Try to fetch calculated price for HostBay plans
        let calculatedPrice = null;
        const provider = hostingData.provider || planSnapshot.provider;
        if (provider === "hostbay") {
          const planCode = getPlanCode(newPlanSnapshot);
          if (planCode) {
            let period = 1;
            if (newPlanSnapshot.duration_days) {
              period = 1;
            } else if (tenureOption.billingCycle === "yearly") {
              period = 12;
            } else if (tenureOption.months) {
              const roundedMonths = Math.round(tenureOption.months);
              period = roundedMonths > 0 ? roundedMonths : 1;
            }

            try {
              const priceResponse = await hostingAPI.calculatePrice({
                plan: planCode,
                period: period,
                provider: "hostbay",
              });
              if (priceResponse?.success && priceResponse?.responseData) {
                calculatedPrice = priceResponse.responseData;
              }
            } catch (error) {
              console.error("Failed to fetch calculated price:", error);
            }
          }
        }

        // Use calculated price if available, otherwise use tenure option price
        const finalPrice = calculatedPrice?.total_price || tenureOption.price;
        const finalOriginalPrice =
          calculatedPrice?.total_before_discount ||
          tenureOption.originalPrice ||
          tenureOption.price;

        const updatePayload = {
          id: itemId,
          price: {
            amount: finalPrice,
            currency: item?.price?.currency || "USD",
            originalAmount: finalOriginalPrice,
            discount: calculatedPrice?.api_discount || 0,
            calculatedPriceData: calculatedPrice,
          },
        };

        // Update hosting data with new plan snapshot if switching plans
        const updatedHostingData = {
          ...hostingData,
          tenureId: tenureOption.id,
          tenureLabel: tenureOption.label,
          tenurePrice: tenureOption.price,
          tenureMonths: tenureOption.months,
          billingCycle: tenureOption.billingCycle || hostingData.billingCycle,
          tenureDays: tenureOption.durationDays || hostingData.tenureDays,
          planSnapshot: newPlanSnapshot,
          planId:
            newPlanSnapshot.id || newPlanSnapshot.plan_id || hostingData.planId,
          planName:
            newPlanSnapshot.plan_name ||
            newPlanSnapshot.name ||
            hostingData.planName,
          planCode: newPlanSnapshot.whm_package || hostingData.planCode,
          features: newFeatures,
        };

        if (onItemUpdate) {
          onItemUpdate(itemId, {
            price: updatePayload.price,
            hosting: updatedHostingData,
          });
        }

        await cartAPI.updateCartItem({
          ...updatePayload,
          hosting: updatedHostingData,
        });

        setSelectedTenureByItemId((prev) => ({
          ...prev,
          [itemId]: tenureOption.id,
        }));

        // Refresh cart data from server
        try {
          const refreshed = await cartAPI.getListAddToCart();
          const data = refreshed?.data || refreshed;
          window.dispatchEvent(
            new CustomEvent("cart:updated:payload", { detail: data })
          );
        } catch (refreshError) {
          console.error("Failed to refresh cart:", refreshError);
          // Still show success even if refresh fails
          window.dispatchEvent(new Event("cart:updated"));
        }

        showAlert(t.cart.hosting.updateSuccess, {
          duration: 2500,
          type: "success",
        });
      } catch (error) {
        console.error("Failed to update tenure:", error);
        showAlert(t.cart.hosting.updateError, {
          duration: 2500,
          type: "warning",
        });
      } finally {
        setUpdateLoading?.(false);
      }
    },
    [items, onItemUpdate, showAlert, setUpdateLoading]
  );

  const handleEditDomain = useCallback((item) => {
    setSelectedItemForEdit(item);
    setEditModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setEditModalOpen(false);
    setSelectedItemForEdit(null);
  }, []);

  const handleDomainUpdate = useCallback(
    async (itemId, updatedHostingData) => {
      setUpdateLoading?.(true);

      try {
        if (onItemUpdate) {
          onItemUpdate(itemId, {
            hosting: updatedHostingData,
          });
        }

        await cartAPI.updateCartItem({
          id: itemId,
          hosting: updatedHostingData,
        });

        // Refresh cart data from server
        try {
          const refreshed = await cartAPI.getListAddToCart();
          const data = refreshed?.data || refreshed;
          window.dispatchEvent(
            new CustomEvent("cart:updated:payload", { detail: data })
          );
        } catch (refreshError) {
          console.error("Failed to refresh cart:", refreshError);
          window.dispatchEvent(new Event("cart:updated"));
        }

        showAlert(t.cart.hosting.domainUpdateSuccess, {
          duration: 2500,
          type: "success",
        });
      } catch (error) {
        console.error("Failed to update domain option:", error);
        showAlert(t.cart.hosting.domainUpdateError, {
          duration: 2500,
          type: "warning",
        });
      } finally {
        setUpdateLoading?.(false);
      }
    },
    [onItemUpdate, showAlert, setUpdateLoading]
  );

  return (
    <div>
      <h3 className="flex flex-wrap items-center font-medium text-2xl lg:mb-10 mb-6 text-primary dark:text-white gap-2">
        <img src={hosting} alt="Hosting" className="w-5 h-5 dark-mode" />{" "}
        {t.cart.hosting.title}
      </h3>

      {!hasItems && (
        <div className="cart-card mb-3">
          <p className="text-primary dark:text-gray-300 mb-4">
            {t.cart.hosting.noPlanSelected}
          </p>
          <NavLink
            to="/hosting"
            className="add-to-cart px-6 inline-flex items-center gap-2 w-fit"
          >
            {t.cart.hosting.browsePlans} <TbArrowRight size={18} />
          </NavLink>
        </div>
      )}

      {hasItems &&
        items.map((item) => {
          const hostingData = item?.hosting || {};
          const planSnapshot = hostingData.planSnapshot || {};
          const planName =
            hostingData.planName ||
            planSnapshot.plan_name ||
            planSnapshot.name ||
            t.cart.hosting.hostingPlan;
          const provider =
            hostingData.provider || planSnapshot.provider || "hostbay";

          const tenureOptions = calculateTenureOptions(planSnapshot, allPlans);
          const selectedTenureId =
            selectedTenureByItemId[item._id] || hostingData.tenureId || 1;
          const selectedTenureOption = tenureOptions.find(
            (opt) => opt.id === selectedTenureId
          );

          // Get calculated price if available (for HostBay plans)
          const calculatedPrice = calculatedPrices[item._id];
          const isLoadingPrice = loadingPrices[item._id];

          // Determine display price
          let displayPrice =
            selectedTenureOption?.price ??
            item?.price?.amount ??
            hostingData.tenurePrice;
          let originalPrice =
            selectedTenureOption?.originalPrice || item?.price?.originalAmount;
          let discountPercent = 0;

          // Use calculated price if available
          if (calculatedPrice) {
            displayPrice = calculatedPrice.total_price;
            originalPrice = calculatedPrice.total_before_discount;
            if (originalPrice > 0 && originalPrice > displayPrice) {
              discountPercent = Math.round(
                ((originalPrice - displayPrice) / originalPrice) * 100
              );
            }
          } else if (originalPrice && originalPrice > displayPrice) {
            discountPercent = Math.round(
              ((originalPrice - displayPrice) / originalPrice) * 100
            );
          }

          const priceLabel = formatPrice(displayPrice);
          const originalPriceLabel = formatPrice(originalPrice);
          const features = deriveFeatures(hostingData).slice(0, 6);
          const domainDescription = getDomainDescription(hostingData, t);

          // Check if domain is free (no separate domain item in cart)
          // Domain is free when: hosting has domainOption "new" AND no separate domain item exists
          const hasSeparateDomainItem = allCartItems.some(
            (cartItem) => cartItem.itemType === "domain" && cartItem.status === "in_cart"
          );
          const isDomainFree = hostingData.domainOption === "new" && !hasSeparateDomainItem;

          return (
            <div className="cart-card mb-3" key={item?._id}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="flex flex-col flex-wrap items-start justify-start card-title font-medium gap-1">
                  <p className="text-primary dark:text-gray-500 flex items-center gap-2">
                    {planName}
                    {provider && (
                      <span className="badge capitalize">{provider}</span>
                    )}
                  </p>
                  <span className="text-xs font-medium text-primary dark:text-gray-300">
                    {planSnapshot?.plan_description ||
                      t.cart.hosting.defaultDescription}
                  </span>
                </h2>
                <LuTrash2
                  className="text-primary dark:text-gray-300 min-w-5 cursor-pointer"
                  size={18}
                  onClick={() => onRemove?.(item?._id)}
                />
              </div>

              <hr className="card-divider my-6" />

              <div className="flex gap-2 justify-between items-center">
                <div className="flex flex-col gap-3">
                  <p className="cart-title text-15">
                    {planSnapshot?.type === "shared"
                      ? t.cart.hosting.sharedHosting
                      : t.cart.hosting.hostingPlan}
                  </p>

                  <div className="relative sm:w-48 w-36">
                    <div
                      onClick={!isGuestCart ? () =>
                        setOpenDropdownId((prev) =>
                          prev === item?._id ? null : item?._id
                        ) : undefined
                      }
                      className={isGuestCart ? "term-select cursor-default" : "term-select"}
                    >
                      <p className="text-xs text-secondary font-medium">{t.cart.hosting.term}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-primary dark:text-gray-400">
                          {(() => {
                            const tenureOptions = calculateTenureOptions(
                              planSnapshot,
                              allPlans
                            );
                            const selectedTenureId =
                              selectedTenureByItemId[item._id] ||
                              hostingData.tenureId ||
                              1;
                            const selectedOption = tenureOptions.find(
                              (opt) => opt.id === selectedTenureId
                            );
                            return (
                              selectedOption?.label ||
                              hostingData.tenureLabel ||
                              planSnapshot?.billing_cycle ||
                              t.cart.hosting.defaultTerm
                            );
                          })()}
                        </span>
                        {!isGuestCart && (
                          <IoChevronDown className="absolute top-1/2 transform -translate-y-1/2 right-4 w-4 h-4 text-primary dark:text-gray-400" />
                        )}
                      </div>
                    </div>

                    {!isGuestCart && openDropdownId === item._id && (
                      <div className="dropdown-select">
                        {calculateTenureOptions(planSnapshot, allPlans).map(
                          (tenureOption) => {
                            const isSelected =
                              (selectedTenureByItemId[item._id] ||
                                hostingData.tenureId ||
                                1) === tenureOption.id;
                            return (
                              <div
                                key={tenureOption.id}
                                onClick={() => {
                                  setOpenDropdownId(null);
                                  handleTenureSelect(item._id, tenureOption);
                                }}
                                className={`px-4 py-2 cursor-pointer hover:bg-slatelight dark:hover:bg-gray-800 text-sm font-medium text-primary dark:text-gray-400 ${
                                  isSelected
                                    ? "bg-slatelight dark:bg-gray-900 font-medium"
                                    : ""
                                }`}
                              >
                                {tenureOption.label}
                              </div>
                            );
                          }
                        )}
                      </div>
                    )}
                  </div>

                  <ul className="text-13 text-secondary font-medium list-disc pl-6">
                    {features.map((feature, idx) => (
                      <li key={idx}>{feature}</li>
                    ))}
                  </ul>
                  <p className="cart-title text-13">
                    {(() => {
                      const tenureOptions = calculateTenureOptions(
                        planSnapshot,
                        allPlans
                      );
                      const selectedTenureId =
                        selectedTenureByItemId[item._id] ||
                        hostingData.tenureId ||
                        1;
                      const selectedOption = tenureOptions.find(
                        (opt) => opt.id === selectedTenureId
                      );
                      const months =
                        selectedOption?.months || hostingData.tenureMonths;
                      const days =
                        selectedOption?.durationDays || hostingData.tenureDays;
                      if (days) {
                        return t.cart.hosting.renewsEveryDay
                          .replace('{days}', days)
                          .replace('{plural}', days > 1 ? 's' : '');
                      }
                      if (months) {
                        return t.cart.hosting.renewsEveryMonth
                          .replace('{months}', months)
                          .replace('{plural}', months > 1 ? 's' : '');
                      }
                      return t.cart.hosting.renewsAuto;
                    })()}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 text-primary dark:text-gray-300">
                  {isLoadingPrice ? (
                    <div className="text-sm text-gray-500">{t.cart.hosting.loading}</div>
                  ) : (
                    <>
                      <div className="text-lg font-medium text-tealdark">
                        {priceLabel}
                      </div>
                      {originalPrice && originalPrice > displayPrice && (
                        <>
                          <div className="text-13 font-medium line-through text-secondary">
                            {originalPriceLabel}
                          </div>
                          {discountPercent > 0 && (
                            <div className="text-xs font-medium text-secondary">
                              {t.cart.hosting.percentOff.replace('{percent}', discountPercent)}
                            </div>
                          )}
                        </>
                      )}
                      {!originalPrice && selectedTenureOption?.hasDiscount && (
                        <div className="text-xs font-medium">
                          {t.cart.hosting.specialPricing}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {isDomainFree && <hr className="card-divider my-6" />}

              {/* Only show "Comes for free" section when domain is free (no separate domain item) */}
              {isDomainFree && (
                <div className="flex sm:flex-row flex-col sm:items-center sm:justify-between justify-end gap-3">
                  <h2 className="flex flex-col flex-wrap items-start justify-start card-title font-medium gap-1.5">
                    <p className="text-13 font-medium text-primary dark:text-gray-300">
                      {t.cart.hosting.registerNewDomain}
                    </p>
                    <p className="text-primary dark:text-gray-500 flex items-center gap-2">
                      {domainDescription}
                      {!isGuestCart && (
                        <img
                          src={edit}
                          alt="edit"
                          className="dark-mode h-5 w-5 cursor-pointer"
                          onClick={() => handleEditDomain(item)}
                        />
                      )}
                    </p>
                    <p className="text-xs font-medium text-primary dark:text-gray-300">
                      {t.cart.hosting.comesFree}
                    </p>
                  </h2>
                  <div className="flex flex-col items-end gap-1 sm:w-auto w-full text-primary dark:text-gray-300">
                    <div className="text-lg font-medium text-tealdark">
                      {t.cart.hosting.freeFirstYear}
                    </div>
                    {hostingData.domainPrice ? (
                      <>
                        <div className="text-13 font-medium line-through">
                          {formatPrice(hostingData.domainPrice)}
                        </div>
                        <div className="text-xs font-medium">{t.cart.hosting.hundredPercentOff}</div>
                      </>
                    ) : (
                      <>
                        <div className="text-13 font-medium line-through">$12.99</div>
                        <div className="text-xs font-medium">{t.cart.hosting.hundredPercentOff}</div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

      {/* Edit Domain Modal */}
      {editModalOpen && <>
        <EditDomainModal
          isOpen={editModalOpen}
          onClose={handleCloseModal}
          item={selectedItemForEdit}
          onConfirm={handleDomainUpdate}
        />
      </>}
    </div>
  );
};

export default HostingCard;
