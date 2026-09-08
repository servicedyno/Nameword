import { IoClose } from "react-icons/io5";
import { LuTrash2 } from "react-icons/lu";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { TbArrowRight } from "react-icons/tb";
import { NavLink } from "react-router";
import { useNavigate } from "react-router";
import { cartAPI } from "../../api/cartApi";
import { hostingAPI } from "../../api/hosting";
import { domainAPI } from "../../api/domains";
import { useAlert } from "../../context/AlertContext";
import { useDomainSuggestions } from "../../hooks/useDomainSuggestions";
import { HiOutlineShoppingCart } from "react-icons/hi";
import { useLanguage } from "../../hooks/useLanguage";
import { useAuth } from "../../hooks/useAuth";
import { guestCart } from "../../utils/guestCart";

const ViewCartSidebar = ({
  onClose,
  isModelOpen,
  plan,
  existingDomainFromSetup,
  fromSetup,
  setSelectedPlan
}) => {
  const [selectedTenure, setSelectedTenure] = useState(1);
  const [domainOption, setDomainOption] = useState(5);
  const [domainName, setDomainName] = useState("");
  const [ownedDomains, setOwnedDomains] = useState([]);
  const [ownedDomainsLoading, setOwnedDomainsLoading] = useState(false);
  const [ownedDomainsError, setOwnedDomainsError] = useState("");
  const [selectedExistingDomain, setSelectedExistingDomain] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [domainExisting, setDomainExisting] = useState("");
  const [existingInputError, setExistingInputError] = useState("");
  const [calculatedPrice, setCalculatedPrice] = useState(null);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedDomainSuggestion, setSelectedDomainSuggestion] =
    useState(null);
  const domainInputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const suggestionsLimitRef = useRef(5);
  const isSelectingSuggestionRef = useRef(false);
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const { t } = useLanguage();
  const { user } = useAuth();

  // Domain suggestions hook
  const {
    getSuggestions,
    loading: suggestionsLoading,
    clearSuggestions,
    suggestions,
  } = useDomainSuggestions();

  // Get plan code for HostBay API
  const getPlanCode = useCallback(() => {
    if (!plan) return null;

    const planCode =
      plan?.code ||
      plan?.plan_code ||
      plan?.planCode ||
      plan?.whm_package ||
      plan?.id?.toString() ||
      null;

    if (!planCode && plan?.plan_name) {
      const name = plan.plan_name
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/days?/g, "day")
        .replace(/months?/g, "month");
      return name;
    }

    return planCode;
  }, [plan]);

  // Get original billing cycle options from API
  const tenureOptions = useMemo(() => {
    if (!plan) return [];

    const options = [];
    
    if (plan?.billing) {
      const billing = plan.billing.toLowerCase().trim();
      const price = plan?.price || 0;
      
      if (billing.includes("day") || billing.includes("days")) {
        const daysMatch = billing.match(/(\d+)\s*days?/i);
        if (daysMatch) {
          const days = parseInt(daysMatch[1], 10);
          const label =
            days === 7
              ? t.cart.hosting.sevenDays
              : days === 30
                ? t.cart.hosting.thirtyDays
                : t.cart.hosting.daysLabel.replace("{days}", days);

          return [
            {
              id: 1,
              label: label,
              price: price,
              months: days / 30,
              billingCycle: `${days}days`,
            },
          ];
        }
      }
      
      if (billing === "yearly" || billing === "annual") {
        return [
          {
            id: 1,
            label: t.cart.hosting.twelveMonths,
            price: price,
            months: 12,
            billingCycle: "yearly",
            savings_percentage: plan?.savings_percentage || 0,
            savings_description: plan?.savings_description || "",
          },
        ];
      }
      
      if (billing === "monthly" || billing === "month") {
        return [
          {
            id: 1,
            label: t.cart.hosting.oneMonth,
            price: price,
            months: 1,
            billingCycle: "monthly",
          },
        ];
      }
    }

    const durationDays = plan?.duration_days || 0;
    const monthlyPrice = plan?.monthly_price || plan?.period_price || 0;
    const yearlyPrice = plan?.yearly_price || plan?.annual_price || 0;

    if (durationDays > 0) {
      const price =
        plan?.period_price || plan?.weekly_price || plan?.monthly_price || 0;
      const label =
        durationDays === 7
          ? t.cart.hosting.sevenDays
          : durationDays === 30
            ? t.cart.hosting.thirtyDays
            : t.cart.hosting.daysLabel.replace("{days}", durationDays);

      return [
        {
          id: 1,
          label: label,
          price: price,
          months: durationDays / 30,
          billingCycle: plan?.billing_cycle || `${durationDays}days`,
        },
      ];
    }

    // For standard plans, show monthly and yearly if both are available
    if (monthlyPrice > 0 && yearlyPrice > 0) {
      options.push({
        id: 1,
        label: t.cart.hosting.oneMonth,
        price: monthlyPrice,
        months: 1,
        billingCycle: "monthly",
      });

      options.push({
        id: 2,
        label: t.cart.hosting.twelveMonths,
        price: yearlyPrice,
        months: 12,
        billingCycle: "yearly",
        originalPrice: monthlyPrice * 12,
        hasDiscount: yearlyPrice < monthlyPrice * 12,
      });
    } else if (monthlyPrice > 0) {
      // Only monthly available
      options.push({
        id: 1,
        label: t.cart.hosting.oneMonth,
        price: monthlyPrice,
        months: 1,
        billingCycle: "monthly",
      });
    } else if (yearlyPrice > 0) {
      // Only yearly available
      options.push({
        id: 1,
        label: t.cart.hosting.twelveMonths,
        price: yearlyPrice,
        months: 12,
        billingCycle: "yearly",
      });
    }

    return options;
  }, [plan, t.cart.hosting.daysLabel, t.cart.hosting.oneMonth, t.cart.hosting.sevenDays, t.cart.hosting.thirtyDays, t.cart.hosting.twelveMonths]);

  useEffect(() => {
    const fetchCalculatedPrice = async () => {
      if (!plan || plan.provider !== "hostbay") {
        setCalculatedPrice(null);
        return;
      }

      const planCode = getPlanCode();
      if (!planCode) {
        setCalculatedPrice(null);
        return;
      }

      const selectedOption = tenureOptions.find(
        (opt) => opt.id === selectedTenure
      );
      if (!selectedOption) {
        setCalculatedPrice(null);
        return;
      }

      let period = 1;

      // NEW API RESPONSE: Handle billing field (e.g., "7 days", "30 days", "yearly")
      if (plan?.billing) {
        const billing = plan.billing.toLowerCase().trim();
        if (billing === "yearly" || billing === "annual") {
          period = 12;
        } else if (billing.includes("day") || billing.includes("days")) {
          // For day-based plans, period is always 1
          period = 1;
        } else if (billing === "monthly" || billing === "month") {
          period = 1;
        }
      }
      // OLD API RESPONSE: Handle duration_days
      else if (plan.duration_days) {
        period = 1;
      } else if (selectedOption.billingCycle === "yearly") {
        period = 12;
      } else if (selectedOption.months) {
        const roundedMonths = Math.round(selectedOption.months);
        period = roundedMonths > 0 ? roundedMonths : 1;
      }

      try {
        setLoadingPrice(true);
        const response = await hostingAPI.calculatePrice({
          plan: planCode,
          period: period,
          provider: "hostbay",
        });

        if (response?.success && response?.responseData) {
          setCalculatedPrice(response.responseData);
        } else {
          setCalculatedPrice(null);
        }
      } catch (error) {
        console.error("Failed to calculate price:", error);
        setCalculatedPrice(null);
      } finally {
        setLoadingPrice(false);
      }
    };

    fetchCalculatedPrice();
  }, [plan, selectedTenure, tenureOptions, getPlanCode]);

  // Reset state when plan changes
  useEffect(() => {
    if (plan) {
      // If coming from setup, don't reset tenure yet - let auto-select handle it
      if (!fromSetup) {
        setSelectedTenure(1);
      }
      // Only reset domain options if not from setup
      if (!fromSetup || !existingDomainFromSetup) {
        setDomainOption(5);
        setDomainName("");
        setSelectedExistingDomain(null);
      }
      setCalculatedPrice(null);
      setSelectedDomainSuggestion(null);
    }
  }, [plan, fromSetup, existingDomainFromSetup]);

  useEffect(() => {
    if (!isModelOpen) {
      setDomainName("");
      setSelectedExistingDomain(null);
      setDomainOption(5);
      setSelectedDomainSuggestion(null);
    }
  }, [isModelOpen]);

  const planTitle = plan?.plan_name || plan?.name || t.cart.hosting.hostingPlan;
  const planDescription =
    plan?.plan_description ||
    t.cart.hosting.bestForHostingBusiness;
  const priceLabel =
    plan?.display_price ||
    (plan?.monthly_price ? `$${plan.monthly_price}/month` : "$0.00");

  const selectedTenureOption =
    tenureOptions.find((opt) => opt.id === selectedTenure) || tenureOptions[0];

  const formatPrice = (price) => {
    if (!price || price === 0) return t.cart.hosting.contactUs;
    return `$${Number(price).toFixed(2)}`;
  };

  const getTenurePrice = () => {
    if (calculatedPrice?.total_price) {
      return Number(calculatedPrice.total_price);
    }

    if (selectedTenureOption?.price) {
      return Number(selectedTenureOption.price);
    }
    
    // NEW API RESPONSE: Check for direct price field
    if (plan?.price) {
      return Number(plan.price);
    }
    
    // OLD API RESPONSE: Check for period_price, monthly_price, yearly_price, annual_price
    return Number(
      plan?.period_price ||
      plan?.monthly_price ||
      plan?.yearly_price ||
      plan?.annual_price ||
      0
    );
  };

  const getDisplayPrice = (option) => {
    if (option.id === selectedTenure && calculatedPrice?.total_price) {
      return {
        price: Number(calculatedPrice.total_price),
        originalPrice: calculatedPrice.total_before_discount,
        discount: calculatedPrice.api_discount,
        hasDiscount: calculatedPrice.api_discount > 0,
      };
    }

    return {
      price: option.price,
      originalPrice: option.originalPrice,
      discount: 0,
      hasDiscount: option.hasDiscount || false,
    };
  };

  const fetchOwnedDomains = useCallback(async () => {
    if (!user) {
      setOwnedDomains([]);
      return;
    }
    try {
      setOwnedDomainsLoading(true);
      setOwnedDomainsError("");
      const response = await domainAPI.domainList();
      const list = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
          ? response
          : [];
      setOwnedDomains(list);
      if (list.length > 0) {
        setSelectedExistingDomain((prev) => prev || list[0]);
      }
    } catch (error) {
      console.error("Failed to fetch owned domains:", error);
      const message =
        error?.response?.data?.message ||
        error?.message ||
        t.cart.hosting.failedToLoadDomains;
      setOwnedDomainsError(message);
    } finally {
      setOwnedDomainsLoading(false);
    }
  }, [user, t.cart.hosting.failedToLoadDomains]);

  // Handle existing domain from setup flow
  useEffect(() => {
    if (existingDomainFromSetup && fromSetup) {
      // Set to "Use existing domain" option (6)
      setDomainOption(6);
    }
  }, [existingDomainFromSetup, fromSetup]);

  // Auto-select 30 days tenure when coming from setup flow
  useEffect(() => {
    if (fromSetup && tenureOptions.length > 0 && plan) {
      // Find 30 days option (prefer 30 days over other options)
      const thirtyDaysOption = tenureOptions.find((opt) => {
        // Check if label contains "30 days" or "30 day"
        const label = opt.label?.toLowerCase() || "";
        const billingCycle = opt.billingCycle?.toLowerCase() || "";
        return label.includes("30 day") || billingCycle.includes("30day");
      });

      // If 30 days option found, select it
      if (thirtyDaysOption) {
        setSelectedTenure(thirtyDaysOption.id);
      } else {
        // NEW API: Check billing field for "30 days"
        const billing = plan?.billing?.toLowerCase() || "";
        const durationDays = plan?.duration_days || 
          (billing.includes("30") && billing.includes("day") ? 30 : 0);
        
        if (durationDays === 30 && tenureOptions.length > 0) {
          setSelectedTenure(tenureOptions[0]?.id || 1);
        } else if (tenureOptions.length > 1) {
          const sortedOptions = [...tenureOptions].sort((a, b) => b.id - a.id);
          const likely30DaysOption = sortedOptions.find((opt) => {
            const label = opt.label?.toLowerCase() || "";
            return (
              label.includes("30") ||
              (label.includes("month") && !label.includes("12"))
            );
          });
          if (likely30DaysOption) {
            setSelectedTenure(likely30DaysOption.id);
          }
        }
      }
    }
  }, [fromSetup, tenureOptions, plan]);

  useEffect(() => {
    if (
      user &&
      domainOption === 6 &&
      ownedDomains.length === 0 &&
      !ownedDomainsLoading
    ) {
      fetchOwnedDomains();
    }
  }, [
    user,
    domainOption,
    fetchOwnedDomains,
    ownedDomains.length,
    ownedDomainsLoading,
  ]);

  useEffect(() => {
    // if (
    //   domainOption === 6 &&
    //   ownedDomains.length > 0 &&
    //   !selectedExistingDomain
    // ) {
    //   // If we have existingDomainFromSetup, try to match it
    //   if (existingDomainFromSetup) {
    //     const existingDomainName = existingDomainFromSetup.toLowerCase().trim();
    //     const matchingDomain = ownedDomains.find((domain) => {
    //       const domainName = (
    //         domain.websiteName ||
    //         domain.domainName ||
    //         domain.name ||
    //         ""
    //       )
    //         .toLowerCase()
    //         .trim();
    //       return domainName === existingDomainName;
    //     });

    //     if (matchingDomain) {
    //       setSelectedExistingDomain(matchingDomain);
    //     } else {
    //       // If no match, use first domain
    //       setSelectedExistingDomain(ownedDomains[0]);
    //     }
    //   } else {
    //     setSelectedExistingDomain(ownedDomains[0]);
    //   }
    // }
    if (domainOption === 5) {
      setSelectedExistingDomain(null);
      clearSuggestions();
      setShowSuggestions(false);
    }
  }, [
    domainOption,
    ownedDomains,
    selectedExistingDomain,
    clearSuggestions,
    existingDomainFromSetup,
  ]);

  // Fetch domain suggestions when typing in new domain input
  const fetchDomainSuggestions = useCallback(
    async (extraLimit = 0) => {
      if (domainOption !== 5) {
        return;
      }

      const trimmedDomain = domainName.trim();

      if (trimmedDomain.length > 2) {
        try {
          setShowSuggestions(true); // Show dropdown while loading
          suggestionsLimitRef.current =
            suggestionsLimitRef.current + extraLimit;
          await getSuggestions(trimmedDomain, suggestionsLimitRef.current);
        } catch (error) {
          console.error("Failed to get domain suggestions:", error);
          setShowSuggestions(false);
        }
      }
    },
    [domainName, domainOption, getSuggestions]
  );

  useEffect(() => {
    if (domainOption !== 5) {
      clearSuggestions();
      setShowSuggestions(false);
      suggestionsLimitRef.current = 5; // Reset limit
      return;
    }

    // Don't fetch if we're selecting from suggestions
    if (isSelectingSuggestionRef.current) {
      return;
    }

    const trimmedDomain = domainName.trim();

    if (trimmedDomain.length > 2) {
      const timeoutId = setTimeout(() => {
        // Double check flag before making API call
        if (!isSelectingSuggestionRef.current) {
          suggestionsLimitRef.current = 5; // Reset to initial limit
          fetchDomainSuggestions();
        }
      }, 2000); // Debounce for 500ms

      return () => clearTimeout(timeoutId);
    } else {
      clearSuggestions();
      setShowSuggestions(false);
      suggestionsLimitRef.current = 5; // Reset limit
    }
  }, [domainName, domainOption, clearSuggestions, fetchDomainSuggestions]);

  // Update showSuggestions based on suggestions availability
  useEffect(() => {
    if (suggestionsLoading) {
      setShowSuggestions(true);
    } else if (suggestions && suggestions.length > 0) {
      setShowSuggestions(true);
    } else if (!suggestionsLoading && suggestions && suggestions.length === 0) {
      setShowSuggestions(false);
    }
  }, [suggestionsLoading, suggestions]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target) &&
        domainInputRef.current &&
        !domainInputRef.current.contains(e.target)
      ) {
        setShowSuggestions(false);
      }
    };

    if (showSuggestions) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSuggestions]);

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion) => {
    let domainNameValue = suggestion.domainName || suggestion;

    // Remove "new_" prefix if present (OpenProvider suggestions sometimes include this)
    if (
      typeof domainNameValue === "string" &&
      domainNameValue.startsWith("new_")
    ) {
      domainNameValue = domainNameValue.replace(/^new_/, "");
    }

    isSelectingSuggestionRef.current = true; // Flag to prevent API call
    setDomainName(domainNameValue);
    setSelectedDomainSuggestion(suggestion); // Store the selected suggestion with price
    setShowSuggestions(false);
    clearSuggestions();
    suggestionsLimitRef.current = 5; // Reset limit
    // Reset flag after state updates
    setTimeout(() => {
      isSelectingSuggestionRef.current = false;
    }, 0);
  };

  // Handle load more suggestions
  const handleLoadMore = (e) => {
    e.preventDefault();
    fetchDomainSuggestions(5);
  };

  const selectedExistingDomainName =
    selectedExistingDomain?.websiteName ||
    selectedExistingDomain?.domainName ||
    selectedExistingDomain?.name ||
    "";

  const getDomainKey = (domain) =>
    domain?.id ||
    domain?._id ||
    domain?.websiteName ||
    domain?.domainName ||
    domain?.name ||
    "";

  const selectedExistingDomainKey = getDomainKey(selectedExistingDomain);
  const isValidDomain = (domain) =>
    /^(?!:\/\/)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/.test(domain);


  const handleProceed = async () => {
    setError("");
    if (!plan || !selectedTenureOption) return;

    const resolvedDomainName =
      domainOption === 5
        ? domainName.trim().replace(/^new_/, "") // Remove new_ prefix if present
        : domainExisting.trim();

    if (!resolvedDomainName) {
      setError(
        domainOption === 5
          ? t.cart.hosting.enterDomainToRegister
          : t.cart.hosting.enterYourDomainName
      );
      return;
    }

    const amount = getTenurePrice();
    if (!amount || amount <= 0) {
      setError(t.cart.hosting.planNoValidPrice);
      return;
    }

    const payload = {
      itemType: "hosting",
      hosting: {
        provider: plan?.provider || "hostbay",
        planId:
          plan?.id ||
          plan?.plan_id ||
          plan?.whm_package ||
          plan?.name ||
          plan?.plan_name,
        planName: plan?.plan_name || plan?.name || "Hosting Plan",
        // NEW API: Use id as planCode if available, fallback to old structure
        planCode: plan?.id || plan?.whm_package || plan?.code || plan?.plan_code || plan?.planCode || null,
        planType: plan?.type || null,
        billingCycle:
          selectedTenureOption?.billingCycle ||
          plan?.billing || // NEW API: billing field (e.g., "7 days", "30 days", "yearly")
          plan?.billing_cycle ||
          selectedTenureOption?.label,
        tenureLabel: selectedTenureOption?.label,
        tenureMonths: selectedTenureOption?.months || null,
        // NEW API: Extract days from billing field if it contains "days"
        tenureDays: plan?.duration_days || 
          (plan?.billing && plan.billing.toLowerCase().includes("day") 
            ? parseInt(plan.billing.match(/(\d+)/)?.[1] || "0", 10) || null
            : null),
        features: Array.isArray(plan?.features) ? plan.features : [],
        planSnapshot: plan,
        domainOption: domainOption === 5 ? "new" : "existing",
        domainName: resolvedDomainName,
        domainPrice:
          domainOption === 5 && selectedDomainSuggestion?.price
            ? Number(selectedDomainSuggestion.price)
            : null,
        existingDomainId: null,
        existingDomainProvider: null,
      },
      price: {
        amount,
        currency: "USD",
        originalAmount:
          calculatedPrice?.total_before_discount ||
          selectedTenureOption?.originalPrice,
        discount: calculatedPrice?.api_discount || 0,
        displayText: plan?.display_price,
        calculatedPriceData: calculatedPrice, // Store full calculated price data
      },
      metadata: {
        provider: plan?.provider,
      },
    };

    try {
      setSubmitting(true);
      if (user) {
        const response = await cartAPI.addToCart(payload);
        showAlert(response?.message || t.cart.hosting.hostingPlanAddedToCart, {
          type: "success",
        });
      } else {
        guestCart.add(payload);
        showAlert(t.cart.hosting.hostingPlanAddedToCart, {
          type: "success",
        });
        window.dispatchEvent(new CustomEvent("cart:updated:payload", { detail: guestCart.list() }));
      }
      onClose?.();
      navigate("/cart");
    } catch (apiError) {
      const message =
        apiError?.response?.data?.message ||
        t.cart.hosting.failedToAddHostingPlan;
      setError(message);
      showAlert(message, { type: "fail" });
    } finally {
      setSubmitting(false);
    }
  };

  const canProceed =
    Boolean(plan && selectedTenureOption && getTenurePrice() > 0) &&
    (domainOption === 5
      ? domainName.trim().length > 0
      : (domainExisting.trim().length > 0 && !existingInputError));


  const handleSelectDomain = (e) => {
    const next = ownedDomains.find(
      (domain) => getDomainKey(domain) === e.target.value
    );
    setDomainExisting("");
    setExistingInputError(null);
    setSelectedExistingDomain(next || null);
  }

  const handleExternalDomainChange = (e) => {
    const value = e.target.value.trim();
    setDomainExisting(value)
    console.log('isValidDomain(value): ', isValidDomain(value));
    if (!value) {
      setExistingInputError(t.cart.hosting.domainRequired);
    } else if (!isValidDomain(value)) {
      setExistingInputError(t.cart.hosting.enterValidDomain);
    } else {
      // Allow any valid domain - user has authority over it regardless of registrar
      setExistingInputError("");
    }
    // Clear selected suggestion if user manually types
    if (domainName) {
      setDomainName(null);
    }
    if (selectedDomainSuggestion) {
      setSelectedDomainSuggestion(null);
    }
    if (selectedExistingDomain) {
      setSelectedExistingDomain(null);
    }
  }

  return (
    <div
      className={`view-cart transition-all duration-300 ease-in-out h-full flex flex-col ${isModelOpen ? "translate-x-0" : "translate-x-full"
        }`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="heading-title">{t.cart.hosting.cart}</h2>
        <IoClose
          className="text-primary dark:text-gray-500 cursor-pointer"
          size={30}
          onClick={onClose}
        />
      </div>

      {!plan ? <>
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <HiOutlineShoppingCart className="w-10 h-10 text-gray-400 dark:text-gray-500" />
          </div>

          <h3 className="text-lg font-medium text-primary dark:text-white mb-2">
            {t.cart.hosting.noHostingPlansInCart}
          </h3>

          <p className="text-sm text-secondary dark:text-gray-400 mb-6 max-w-xs">
            {t.cart.hosting.chooseHostingPlanMessage}
          </p>

          <NavLink
            to="/hosting"
            onClick={onClose}
            className="add-to-cart px-5"
          >
            {t.cart.hosting.browseHostingPlans}
            <TbArrowRight className="w-4 h-4" />
          </NavLink>
        </div>

      </> : <>
        <div className="all-cart-items">
          {/* cart 1 */}
          <div className="cart-card mb-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex flex-col flex-wrap items-start justify-start card-title font-medium">
                <p className="text-primary dark:text-gray-500 mb-1.5">
                  {planTitle}
                </p>
                <p className="text-xs font-medium text-primary dark:text-gray-300">
                  {planDescription}
                </p>
              </h2>
              <LuTrash2
                className="text-primary dark:text-gray-300 min-w-5 cursor-pointer"
                size={18}
                onClick={() => setSelectedPlan(null)}
              />
            </div>
            <hr className="card-divider my-6" />
            <div className="flex gap-2 justify-between items-center w-full">
              <div className="flex flex-col gap-1 w-full">
                {tenureOptions.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 py-4">
                    {t.cart.hosting.noTenureOptionsAvailable}
                  </p>
                ) : (
                  tenureOptions.map((option) => (
                    <label
                      key={option.id}
                      className={`choose-plan-price ${selectedTenure === option.id ? "selected" : ""
                        }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="mt-1">
                          <input
                            type="radio"
                            name="plan"
                            checked={selectedTenure === option.id}
                            onChange={() => setSelectedTenure(option.id)}
                            className="sr-only"
                          />

                          <div
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors duration-200 ${selectedTenure === option.id
                              ? "border-tealdark bg-tealdark"
                              : "border-gray-400"
                              }`}
                          >
                            {selectedTenure === option.id && (
                              <div className="w-1.5 h-1.5 bg-white dark:bg-gray-800 rounded-full"></div>
                            )}
                          </div>
                        </div>
                        <p className="font-medium text-15 text-primary dark:text-gray-300">
                          {option.label}
                        </p>
                      </div>
                      <p
                        className={`text-15 font-medium text-tealdark ${getDisplayPrice(option).hasDiscount
                          ? "flex gap-1 items-center"
                          : ""
                          }`}
                      >
                        {loadingPrice && option.id === selectedTenure ? (
                          <span className="text-sm">{t.cart.hosting.loading}</span>
                        ) : (
                          <>
                            {formatPrice(getDisplayPrice(option).price)}
                            {getDisplayPrice(option).hasDiscount &&
                              getDisplayPrice(option).originalPrice && (
                                <span className="text-secondary line-through">
                                  {formatPrice(
                                    getDisplayPrice(option).originalPrice
                                  )}
                                </span>
                              )}
                          </>
                        )}
                      </p>
                    </label>
                  ))
                )}
                <p className="cart-title text-13 mt-2">
                  {t.cart.hosting.renewsAuto}
                </p>
              </div>
            </div>
            <hr className="card-divider my-6" />
            <p className="bg-tealdark py-0.5 px-1 text-white text-xs inline-flex mb-1">
              {t.cart.hosting.comesFree}
            </p>
            <h2 className="card-title">
              {t.cart.hosting.domainForOneYear}
            </h2>
            <div className="flex gap-2 justify-between items-center w-full mt-5">
              <div className="flex flex-col gap-1 w-full">
                {/* Register a New Domain */}
                <label
                  className={`choose-plan-price ${domainOption === 5 ? "selected" : ""
                    }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-1">
                      <input
                        type="radio"
                        name="domainOption"
                        checked={domainOption === 5}
                        onChange={() => setDomainOption(5)}
                        className="sr-only"
                      />

                      <div
                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors duration-200 ${domainOption === 5
                          ? "border-tealdark bg-tealdark"
                          : "border-gray-400"
                          }`}
                      >
                        {domainOption === 5 && (
                          <div className="w-1.5 h-1.5 bg-white dark:bg-gray-800 rounded-full"></div>
                        )}
                      </div>
                    </div>
                    <p className="font-medium text-15 text-primary dark:text-gray-300">
                      {t.cart.hosting.registerNewDomainOption}
                    </p>
                  </div>
                </label>

                {/* Use an Existing Domain */}
                <label
                  className={`choose-plan-price ${domainOption === 6 ? "selected" : ""
                    }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-1">
                      <input
                        type="radio"
                        name="domainOption"
                        checked={domainOption === 6}
                        onChange={() => setDomainOption(6)}
                        className="sr-only"
                      />

                      <div
                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors duration-200 ${domainOption === 6
                          ? "border-tealdark bg-tealdark"
                          : "border-gray-400"
                          }`}
                      >
                        {domainOption === 6 && (
                          <div className="w-1.5 h-1.5 bg-white dark:bg-gray-800 rounded-full"></div>
                        )}
                      </div>
                    </div>
                    <p className="font-medium text-15 text-primary dark:text-gray-300">
                      {t.cart.hosting.useExistingDomain}
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <hr className="card-divider my-6" />
            <p className="cart-title text-13 mt-4 mb-2">{domainOption === 6 ? t.cart.hosting.enterYourDomain : t.cart.hosting.letsPickDomain}</p>

            {domainOption === 5 && (
              <div className="relative" ref={domainInputRef}>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={t.cart.hosting.domainPlaceholder}
                    className="domain-pick w-full"
                    value={domainName}
                    onChange={(e) => {
                      setDomainName(e.target.value);
                      // Clear selected suggestion if user manually types
                      if (selectedDomainSuggestion) {
                        setSelectedDomainSuggestion(null);
                      }
                    }}
                    onFocus={() => {
                      if (suggestions && suggestions.length > 0) {
                        setShowSuggestions(true);
                      }
                    }}
                  />
                  {suggestionsLoading && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-tealdark"></div>
                    </div>
                  )}
                </div>

                {/* Domain Suggestions Dropdown */}
                {(showSuggestions || suggestionsLoading) && (
                  <div
                    ref={suggestionsRef}
                    className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto"
                  >
                    {suggestionsLoading ? (
                      <div className="px-4 py-4 flex items-center justify-center">
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-tealdark"></div>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {t.cart.hosting.loadingSuggestions}
                          </span>
                        </div>
                      </div>
                    ) : suggestions && suggestions.length > 0 ? (
                      <>
                        {suggestions.map((suggestion, index) => {
                          let domainNameValue =
                            suggestion.domainName || suggestion;
                          // Remove "new_" prefix for display
                          if (
                            typeof domainNameValue === "string" &&
                            domainNameValue.startsWith("new_")
                          ) {
                            domainNameValue = domainNameValue.replace(
                              /^new_/,
                              ""
                            );
                          }
                          return (
                            <div
                              key={index}
                              onClick={() => handleSuggestionSelect(suggestion)}
                              className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-200 dark:border-gray-700 last:border-b-0 transition-colors"
                            >
                              <span className="text-sm font-medium text-primary dark:text-gray-200">
                                {domainNameValue}
                              </span>
                            </div>
                          );
                        })}
                        {suggestions.length >= 5 && !suggestionsLoading && (
                          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                            <button
                              onClick={handleLoadMore}
                              disabled={suggestionsLoading}
                              className="w-full text-sm font-medium text-tealdark hover:text-tealdark/80 transition-colors text-center disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                            >
                              {suggestionsLoading ? t.cart.hosting.loading : t.cart.hosting.loadMore}
                            </button>
                          </div>
                        )}
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            )}

            {domainOption === 6 && (
              <div className="relative mt-2">
                <input
                  type="text"
                  placeholder={t.cart.hosting.domainPlaceholder}
                  className="domain-pick w-full"
                  value={domainExisting}
                  onChange={handleExternalDomainChange}
                />
                {(existingInputError) && (
                  <p className="text-red-500 text-sm mr-auto mt-2" role="alert">
                    {existingInputError}
                  </p>
                )}
              </div>
            )}
            {/* 
            {domainOption === 5 && domainName.trim().length > 0 && (
              <p className="text-13 text-primary dark:text-gray-200 mt-2">
                Registering:{" "}
                <span className="font-semibold">{domainName.trim()}</span>
              </p>
            )}

            {domainOption === 6 && selectedExistingDomainName && (
              <p className="text-13 text-primary dark:text-gray-200 mt-2">
                Using existing domain:{" "}
                <span className="font-semibold">
                  {selectedExistingDomainName}
                </span>
              </p>
            )} */}
            {error && (
              <p className="text-red-500 text-sm mr-auto" role="alert">
                {error}
              </p>
            )}
            <p className="cart-title text-13 mt-2">
              {domainOption === 6 ? t.cart.hosting.domainConnectionInfo :
                `${t.cart.hosting.freeFirstYearDomain}
              ${selectedDomainSuggestion?.price
                  ? t.cart.hosting.renewsAt.replace("${price}", Number(
                    selectedDomainSuggestion.price
                  ).toFixed(2))
                  : t.cart.hosting.renewsAtDefault}
              ${t.cart.hosting.configureLater}`}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 py-5">
          <NavLink to="/home" className="btn-text-link">
            {t.cart.hosting.backToShopping}
          </NavLink>
          <button
            type="button"
            className={`add-to-cart ${!canProceed || submitting ? "opacity-60 cursor-not-allowed" : ""
              }`}
            onClick={handleProceed}
            disabled={!canProceed || submitting}
          >
            {submitting ? t.cart.hosting.adding : t.cart.hosting.continue} <TbArrowRight size={18} />
          </button>
        </div>
      </>
      }

    </div>
  );
};
export default ViewCartSidebar;
