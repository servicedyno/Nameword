import { useEffect, useMemo, useState } from "react";
import { IoChevronBack } from "react-icons/io5";
import { FiInfo } from "react-icons/fi";
import { payment } from "../components/common/icons";
import { cartAPI } from "../api/cartApi";
import { walletAPI } from "../api/walletApi";
import { useAuth } from "../hooks/useAuth";
import { domainAPI } from "../api/domains";
import { hostingAPI } from "../api/hosting";

import WalletBallance from "../components/payment/wallet-ballance";
import RewardPoints from "../components/payment/reward-points";
import PaymentOrderSummary from "../components/payment/payment-order-summary";
import { useAlert } from "../context/AlertContext";
import { NavLink, useSearchParams, useNavigate } from "react-router";
import DNSInstructionsModal from "../components/modals/dns-instructions";
import { useLanguage } from "../hooks/useLanguage";

const PaymentCheckout = () => {
  const { t } = useLanguage();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [cartData, setCartData] = useState(null);
  const [cartLoading, setCartLoading] = useState(false);
  const [walletAmount, setWalletAmount] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);
  const { showAlert } = useAlert();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [dnsData, setDnsData] = useState(null);
  // Check if this is a renewal checkout
  const isRenewalCheckout = searchParams.get("type") === "renewal";
  const renewalSubscriptionId = searchParams.get("subscriptionId");
  const renewalPeriod = searchParams.get("period");
  const renewalAmount = parseFloat(searchParams.get("amount") || 0);

  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState(null);

  const { user } = useAuth();

  const [walletSelection, setWalletSelection] = useState({
    walletAmount: "",
    appliedAmount: 0,
    isApplied: false,
  });

  const [rewardSelection, setRewardSelection] = useState({
    rewardPoints: "",
    appliedPoints: 0,
    isApplied: false,
  });

  const [rewardState, setRewardState] = useState({
    rewardPoints: 0,
    appliedPoints: 0,
    isApplied: false,
  });

  const [promoCodeDiscount, setPromoCodeDiscount] = useState(0);
  const [appliedPromoCode, setAppliedPromoCode] = useState(null);

  const [dynamicTaxRate, setDynamicTaxRate] = useState(0.2); // Default 20%, will be updated by OrderSummary component

  // Load promocode from localStorage on mount (if applied in cart)
  useEffect(() => {
    const savedPromoCode = localStorage.getItem('appliedPromoCode');
    const savedDiscount = localStorage.getItem('promoDiscount');
    
    if (savedPromoCode && savedDiscount) {
      const discountAmount = parseFloat(savedDiscount);
      if (!isNaN(discountAmount) && discountAmount > 0) {
        setAppliedPromoCode(savedPromoCode);
        setPromoCodeDiscount(discountAmount);
      }
    }
  }, []);

  //  Fetch cart
  useEffect(() => {
    const fetchCart = async () => {
      setCartLoading(true);
      try {
        const result = await cartAPI.getListAddToCart();
        setCartData(result?.data || result);
      } catch (error) {
        console.error("Failed to fetch cart:", error);
      } finally {
        setCartLoading(false);
      }
    };
    if (user) fetchCart();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const fetchWalletBalance = async () => {
      setWalletLoading(true);
      setWalletError(null);

      try {
        const response = await walletAPI.getWallet();

        const balanceObj = response?.data?.balance;
        const balance = Number(
          (balanceObj?.USD ?? balanceObj?.default ?? 0).toFixed(2)
        );

        setWalletBalance(balance);
      } catch (error) {
        setWalletError(error);
        console.error(" Failed to fetch wallet balance:", error);
      } finally {
        setWalletLoading(false);
      }
    };

    fetchWalletBalance();
    const interval = setInterval(fetchWalletBalance, 10000);

    return () => clearInterval(interval);
  }, [user]);

  // Safely extract cart items - ensure we use actual cart items array only
  const cartItems = useMemo(() => {
    const raw = cartData?.items;
    if (!Array.isArray(raw)) return [];
    return raw;
  }, [cartData?.items]);

  // Only count items explicitly in cart (status in_cart or undefined)
  const inCartItems = useMemo(
    () =>
      cartItems.filter(
        (item) => item?.status === "in_cart" || item?.status === undefined
      ),
    [cartItems]
  );

  const domainItems = useMemo(
    () =>
      isRenewalCheckout
        ? []
        : inCartItems.filter((item) => item?.itemType === "domain"),
    [inCartItems, isRenewalCheckout]
  );
  const hostingItems = useMemo(
    () =>
      isRenewalCheckout
        ? []
        : inCartItems.filter((item) => item?.itemType === "hosting"),
    [inCartItems, isRenewalCheckout]
  );
  const hostingItemIds = useMemo(
    () => hostingItems.map((item) => item?._id).filter(Boolean),
    [hostingItems]
  );
  const hasDomains = domainItems.length > 0;
  const hasHosting = hostingItems.length > 0;
  const checkoutMode = useMemo(() => {
    if (isRenewalCheckout) return "renewal";
    if (hasDomains && hasHosting) return "mixed";
    if (hasHosting) return "hosting";
    if (hasDomains) return "domain";
    return "empty";
  }, [hasDomains, hasHosting, isRenewalCheckout]);

  const canUseBundle = useMemo(() => {
    if (checkoutMode !== "mixed") return false;
    if (domainItems.length !== 1 || hostingItems.length !== 1) return false;

    const domainItem = domainItems[0];
    const hostingItem = hostingItems[0];
    const domainProvider = domainItem?.domain?.provider || "hostbay";
    const hostingProvider = hostingItem?.hosting?.provider || "hostbay";

    return (
      domainProvider === "hostbay" &&
      hostingProvider === "hostbay" &&
      domainItem?.domain?.action === "register"
    );
  }, [checkoutMode, domainItems, hostingItems]);

  // Console logs for checkout scenarios
  useEffect(() => {
    if (!cartData || cartLoading) return;

    console.log("========================================");
    console.log("🛒 PAYMENT CHECKOUT - SCENARIO DETECTION");
    console.log("========================================");
    console.log("Checkout Mode:", checkoutMode);
    console.log("Domain Items Count:", domainItems.length);
    console.log("Hosting Items Count:", hostingItems.length);
    console.log("Can Use Bundle:", canUseBundle);
    console.log("");

    if (checkoutMode === "domain") {
      console.log("📦 SCENARIO 1: DOMAIN PURCHASE ONLY");
      console.log(
        "Domain Items:",
        domainItems.map((item) => ({
          name: item.domain?.name,
          action: item.domain?.action,
          provider: item.domain?.provider,
          price: item.price?.amount,
        }))
      );
      console.log(
        "API to be called: /api/v1/domain/order (via wallet payment)"
      );
    } else if (checkoutMode === "hosting") {
      console.log("🖥️ SCENARIO 2: HOSTING PURCHASE ONLY");
      console.log(
        "Hosting Items:",
        hostingItems.map((item) => ({
          plan: item.hosting?.planName || item.hosting?.planCode,
          provider: item.hosting?.provider,
          price: item.price?.amount,
        }))
      );
      console.log("API to be called: /api/v1/hosting-plans/wallet-payment");
    } else if (checkoutMode === "mixed" && canUseBundle) {
      console.log("🎁 SCENARIO 3: BUNDLE PURCHASE (Domain + Hosting)");
      console.log("Domain Item:", {
        name: domainItems[0]?.domain?.name,
        action: domainItems[0]?.domain?.action,
        provider: domainItems[0]?.domain?.provider,
        cartItemId: domainItems[0]?._id,
      });
      console.log("Hosting Item:", {
        plan:
          hostingItems[0]?.hosting?.planName ||
          hostingItems[0]?.hosting?.planCode,
        provider: hostingItems[0]?.hosting?.provider,
        cartItemId: hostingItems[0]?._id,
      });
      console.log(
        "API to be called: /api/v1/hosting-plans/bundle-wallet-payment"
      );
      console.log(
        "Backend will call: /api/v1/bundles/domain-hosting (HostBay API)"
      );
    } else if (checkoutMode === "mixed") {
      console.log(
        "⚠️ MIXED CHECKOUT (Domain + Hosting) - Bundle NOT available"
      );
      console.log("");

      // Detailed reason why bundle is not available
      const domainItem = domainItems[0];
      const hostingItem = hostingItems[0];
      const domainProvider = domainItem?.domain?.provider || "hostbay";
      const hostingProvider = hostingItem?.hosting?.provider || "hostbay";
      const domainAction = domainItem?.domain?.action;

      console.log("Bundle Eligibility Check:");
      console.log(
        "1. Checkout Mode is 'mixed':",
        checkoutMode === "mixed" ? "✅" : "❌"
      );
      console.log(
        "2. Domain Items Count = 1:",
        domainItems.length === 1 ? "✅" : `❌ (Found: ${domainItems.length})`
      );
      console.log(
        "3. Hosting Items Count = 1:",
        hostingItems.length === 1 ? "✅" : `❌ (Found: ${hostingItems.length})`
      );
      console.log(
        "4. Domain Provider is 'hostbay':",
        domainProvider === "hostbay" ? "✅" : `❌ (Found: ${domainProvider})`
      );
      console.log(
        "5. Hosting Provider is 'hostbay':",
        hostingProvider === "hostbay" ? "✅" : `❌ (Found: ${hostingProvider})`
      );
      console.log(
        "6. Domain Action is 'register':",
        domainAction === "register" ? "✅" : `❌ (Found: ${domainAction})`
      );
      console.log("");

      if (domainItems.length !== 1 || hostingItems.length !== 1) {
        console.log("❌ Reason: Must have exactly 1 domain and 1 hosting item");
      } else if (
        domainProvider !== "hostbay" ||
        hostingProvider !== "hostbay"
      ) {
        console.log(
          "❌ Reason: Both domain and hosting must be from 'hostbay' provider"
        );
        console.log(`   Domain Provider: ${domainProvider}`);
        console.log(`   Hosting Provider: ${hostingProvider}`);
      } else if (domainAction !== "register") {
        console.log(
          "❌ Reason: Domain action must be 'register' (not transfer or renew)"
        );
        console.log(`   Domain Action: ${domainAction}`);
      }

      console.log("");
      console.log("Domain Item Details:", {
        name: domainItem?.domain?.name,
        action: domainItem?.domain?.action,
        provider: domainItem?.domain?.provider,
        cartItemId: domainItem?._id,
      });
      console.log("Hosting Item Details:", {
        plan: hostingItem?.hosting?.planName || hostingItem?.hosting?.planCode,
        provider: hostingItem?.hosting?.provider,
        cartItemId: hostingItem?._id,
      });
      console.log("Will process separately");
    } else if (checkoutMode === "renewal") {
      console.log("🔄 RENEWAL CHECKOUT");
      console.log("Subscription ID:", renewalSubscriptionId);
      console.log("Period:", renewalPeriod);
      console.log("Amount:", renewalAmount);
    } else {
      console.log("❌ EMPTY CART - No items to checkout");
    }
    console.log("========================================");
  }, [
    checkoutMode,
    canUseBundle,
    domainItems,
    hostingItems,
    cartData,
    cartLoading,
    renewalSubscriptionId,
    renewalPeriod,
    renewalAmount,
  ]);

  const activeItems = useMemo(() => {
    if (checkoutMode === "renewal") {
      // For renewal, create a virtual item with renewal data
      return [
        {
          itemType: "renewal",
          subscriptionId: renewalSubscriptionId,
          period: renewalPeriod,
          price: {
            amount: renewalAmount,
          },
          _id: `renewal-${renewalSubscriptionId}-${renewalPeriod}`,
        },
      ];
    }
    if (checkoutMode === "hosting") return hostingItems;
    if (checkoutMode === "domain") return domainItems;
    if (checkoutMode === "mixed") {
      return [...domainItems, ...hostingItems];
    }
    return [];
  }, [
    checkoutMode,
    hostingItems,
    domainItems,
    isRenewalCheckout,
    renewalSubscriptionId,
    renewalPeriod,
    renewalAmount,
  ]);

  useEffect(() => {
    setWalletAmount(0);
    setWalletSelection({
      walletAmount: "",
      appliedAmount: 0,
      isApplied: false,
    });
    setRewardState((prev) => ({ ...prev, appliedPoints: 0, isApplied: false }));
  }, [checkoutMode]);

  const handleDynoPayPayment = async () => {
    try {
      showAlert(t.pages.redirectingToDynoPay || "Redirecting to DynoPay...", {
        duration: 1500,
        type: "success",
      });
      console.log("[Checkout] handleDynoPayPayment triggered", {
        checkoutMode,
        walletAmount,
        subtotal,
        vatAmount,
        total,
        domainItemsCount: domainItems.length,
        hostingItemsCount: hostingItems.length,
      });

      if (checkoutMode === "empty") {
        showAlert(t.pages.noItemsInCart || "No items in cart", { duration: 3000, type: "fail" });
        return;
      }

      if (checkoutMode === "renewal") {
        // Handle renewal payment
        if (!renewalSubscriptionId || !renewalPeriod || !renewalAmount) {
          showAlert(t.payment.renewalInformationMissing || "Renewal information missing", {
            duration: 3000,
            type: "fail",
          });
          return;
        }

        const renewalPayload = {
          subscriptionId: renewalSubscriptionId,
          period: Number(renewalPeriod),
          amount: total.toFixed(2),
          walletAmount: walletAmount || 0,
          autoRenew: true,
        };
        console.log("[Checkout] Renewal DynoPay payload", renewalPayload);

        const response = await hostingAPI.getRenewalDynoCheckoutUrl(
          renewalPayload
        );

        console.log("[Checkout] Renewal DynoPay response", response);

        if (response?.success && response?.redirect_url) {
          window.location.href = response.redirect_url;
          return;
        }

        const backendMsg =
          response?.error?.message ||
          response?.message ||
          t.pages.dynoPayRenewalInitializationFailed || "DynoPay renewal initialization failed.";
        showAlert(backendMsg, { duration: 3000, type: "fail" });
        return;
      }

      if (checkoutMode === "mixed") {
        if (canUseBundle) {
          const domainItem = domainItems[0];
          const hostingItem = hostingItems[0];
          const bundlePayload = {
            amount: total.toFixed(2),
            domainCartItemId: domainItem._id,
            hostingCartItemId: hostingItem._id,
            walletAmount: walletAmount || 0,
          };
          console.log("[Checkout] Bundle DynoPay payload", bundlePayload);

          const response = await hostingAPI.getBundleDynoCheckoutUrl(
            bundlePayload
          );

          console.log("[Checkout] Bundle DynoPay response", response);

          if (response?.success && response?.redirect_url) {
            window.location.href = response.redirect_url;
            return;
          }

          const backendMsg =
            response?.error?.message ||
            response?.message ||
            t.pages.dynoPayBundleInitializationFailed || "DynoPay bundle initialization failed.";
          showAlert(backendMsg, { duration: 3000, type: "fail" });
          return;
        } else {
          const domainDataArray = domainItems.map((item) => {
            const provider =
              item.domain?.provider || item.provider || "openprovider";
            let ns1 = item.ns1 || "";
            let ns2 = item.ns2 || "";
            let ns3 = item.ns3 || null;
            let ns4 = item.ns4 || null;

            if (!ns1) {
              if (provider === "openprovider") {
                ns1 = "ns1.openprovider.nl";
                ns2 = "ns2.openprovider.be";
                ns3 = "ns3.openprovider.eu";
              } else if (provider === "cloudflare") {
                ns1 = "sara.ns.cloudflare.com";
                ns2 = "jack.ns.cloudflare.com";
                ns3 = null;
                ns4 = null;
              }
            }

            const typeMap = { register: 1, transfer: 2, renew: 3 };

            return {
              productType: typeMap[item.domain?.action] || 1,
              websiteName:
                item.domain?.name || item.domainName || item.websiteName || "",
              duration: item.domain?.years || item.duration || 1,
              isWhoisProtection: Boolean(item.domain?.whoisProtection),
              ns1,
              ns2,
              ns3,
              ns4,
              id: item.domain?.productId || item.id || item._id || null,
              isEnablePremium: 0,
              provider,
              handle: "default",
            };
          });

          const domainData =
            domainDataArray.length === 1 ? domainDataArray[0] : domainDataArray;

          const invalidDomains = domainDataArray.filter(
            (d) => !d.websiteName || !d.productType
          );
          if (invalidDomains.length > 0) {
            showAlert(t.pages.someDomainsMissingInfo || "Some domains are missing required information", {
              duration: 3000,
              type: "fail",
            });
            return;
          }

          const response = await domainAPI.getDomainDynoCheckoutUrl({
            amount: total.toFixed(2),
            domainData: domainData,
            walletAmount: walletAmount || 0,
            rewardPointsUsed: rewardState?.appliedPoints || 0,
            rewardDiscount: (rewardState?.appliedPoints || 0) * pointValue,
            hostingCartItemIds: hostingItemIds,
            isMixedCheckout: true,
          });

          console.log(
            "[Checkout] Mixed Checkout (Domain + Hosting) DynoPay response",
            response
          );

          if (response?.success && response?.redirect_url) {
            window.location.href = response.redirect_url;
            return;
          }

          const backendMsg =
            response?.error?.message ||
            response?.message ||
            t.pages.dynoPayInitializationFailed || "DynoPay initialization failed.";
          showAlert(backendMsg, { duration: 3000, type: "fail" });
          return;
        }
      }

      if (checkoutMode === "hosting") {
        if (!hostingItemIds.length) {
          showAlert(t.pages.noHostingItemsSelectedForCheckout || "No hosting items selected for checkout.", {
            duration: 3000,
            type: "fail",
          });
          return;
        }

        const hostingPayload = {
          amount: total.toFixed(2),
          cartItemIds: hostingItemIds,
          walletAmount: walletAmount || 0,
        };
        console.log("[Checkout] Hosting DynoPay payload", hostingPayload);

        const response = await hostingAPI.getDynoCheckoutUrl({
          amount: total.toFixed(2),
          cartItemIds: hostingItemIds,
          walletAmount: walletAmount || 0,
        });

        console.log("[Checkout] Hosting DynoPay response", response);

        if (response?.success && response?.redirect_url) {
          window.location.href = response.redirect_url;
          return;
        }

        const backendMsg =
          response?.error?.message ||
          response?.message ||
          t.pages.dynoPayInitializationFailed || "DynoPay initialization failed.";
        showAlert(backendMsg, { duration: 3000, type: "fail" });
        return;
      }

      console.log("[Checkout] Building domain DynoPay payload", {
        domainItems: domainItems.map((item) => ({
          id: item._id,
          name: item.domain?.name,
          provider: item.domain?.provider || item.provider,
          action: item.domain?.action,
        })),
      });

      const domainDataArray = domainItems.map((item) => {
        const provider =
          item.domain?.provider || item.provider || "openprovider";
        let ns1 = item.ns1 || "";
        let ns2 = item.ns2 || "";
        let ns3 = item.ns3 || null;
        let ns4 = item.ns4 || null;

        if (!ns1) {
          if (provider === "openprovider") {
            ns1 = "ns1.openprovider.nl";
            ns2 = "ns2.openprovider.be";
            ns3 = "ns3.openprovider.eu";
          } else if (provider === "cloudflare") {
            ns1 = "sara.ns.cloudflare.com";
            ns2 = "jack.ns.cloudflare.com";
            ns3 = null;
            ns4 = null;
          }
        }

        const typeMap = { register: 1, transfer: 2, renew: 3 };

        return {
          productType: typeMap[item.domain?.action] || 1,
          websiteName:
            item.domain?.name || item.domainName || item.websiteName || "",
          duration: item.domain?.years || item.duration || 1,
          isWhoisProtection: Boolean(item.domain?.whoisProtection),
          ns1,
          ns2,
          ns3,
          ns4,
          id: item.domain?.productId || item.id || item._id || null,
          isEnablePremium: 0,
          provider,
          handle: "default",
        };
      });

      const domainData =
        domainDataArray.length === 1 ? domainDataArray[0] : domainDataArray;

      const invalidDomains = domainDataArray.filter(
        (d) => !d.websiteName || !d.productType
      );
      if (invalidDomains.length > 0) {
        showAlert(t.pages.someDomainsMissingInfo || "Some domains are missing required information", {
          duration: 3000,
          type: "fail",
        });
        return;
      }

      const response = await domainAPI.getDomainDynoCheckoutUrl({
        amount: total.toFixed(2),
        domainData: domainData,
        walletAmount: walletAmount || 0,
        rewardPointsUsed: rewardState?.appliedPoints || 0,
        rewardDiscount: (rewardState?.appliedPoints || 0) * pointValue,
      });

      console.log("[Checkout] Domain DynoPay response", response);

      if (response?.success && response?.redirect_url) {
        window.location.href = response.redirect_url;
        return;
      }

      const backendMsg =
        response?.error?.message ||
        response?.message ||
        t.pages.dynoPayInitializationFailed || "DynoPay initialization failed.";
      showAlert(backendMsg, { duration: 3000, type: "fail" });
    } catch (error) {
      console.error("DynoPay Error:", error);

      if (error.response) {
        const backendError =
          error.response.data?.error?.message ||
          error.response.data?.message ||
          t.pages.serverErrorDuringDynoPaySetup || "Server error during DynoPay setup.";
        showAlert(backendError, { duration: 3000, type: "fail" });
      } else if (error.request) {
        showAlert(t.pages.noResponseFromServer || "No response from server. Please check your connection.", {
          duration: 3000,
          type: "fail",
        });
      } else {
        showAlert(error.message || t.pages.unexpectedErrorOccurred || "Unexpected error occurred.", {
          duration: 3000,
          type: "fail",
        });
      }
    }
  };

  // 🔄 Refresh cart and wallet after DynoPay redirect success
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const dynoStatus = urlParams.get("dynoStatus");
    const hostingPurchase = urlParams.get("hostingPurchase");
    const hostingExternalDNS = urlParams.get("hostingExternalDNS");

    // Check if this is a hosting purchase success redirect from backend
    if (hostingPurchase === "success") {
      const domainName = urlParams.get("domainName");

      // Build domain state for redirect
      const domainState = domainName
        ? { currentDomain: { websiteName: decodeURIComponent(domainName) } }
        : undefined;

      // Redirect to websites-overview page after hosting purchase
      showAlert(t.pages.hostingPurchasedSuccessfully || "Hosting purchased successfully! Redirecting...", {
        duration: 2000,
        type: "success",
      });
      if (hostingExternalDNS) {
        setDnsData(JSON.parse(hostingExternalDNS));
      } else {
        setTimeout(() => {
          navigate("/websites-overview", {
            replace: true,
            state: domainState,
          });
        }, 2000);
      }
      return;
    }

    if (dynoStatus === "success") {
      const refreshAfterDynoPay = async () => {
        try {
          const cartRes = await cartAPI.getListAddToCart();
          setCartData(cartRes?.data || cartRes);

          const walletRes = await walletAPI.getWallet();
          const balanceObj = walletRes?.data?.balance;
          const balance = Number(
            (balanceObj?.USD ?? balanceObj?.default ?? 0).toFixed(2)
          );
          setWalletBalance(balance);

          showAlert(t.pages.paymentSuccessfulCartRefreshed || "Payment successful! Cart refreshed.", {
            duration: 2500,
            type: "success",
          });
          
          // Clear promocode from localStorage after successful payment
          localStorage.removeItem('appliedPromoCode');
          localStorage.removeItem('promoDiscount');
        } catch (err) {
          console.error("❌ Failed to refresh after DynoPay success:", err);
        }
      };
      refreshAfterDynoPay();
    }
  }, [navigate, showAlert]);

  const subtotal = useMemo(() => {
    if (isRenewalCheckout) {
      return renewalAmount;
    }
    return activeItems.reduce(
      (sum, item) => sum + Number(item?.price?.amount || 0),
      0
    );
  }, [activeItems, isRenewalCheckout, renewalAmount]);

  // Apply promocode discount to subtotal (before tax calculation)
  const subtotalAfterPromo = Math.max(0, subtotal - promoCodeDiscount);
  const vatAmount = subtotalAfterPromo * dynamicTaxRate;
  const walletCharge = Math.min(walletAmount, subtotalAfterPromo + vatAmount);

  const pointValue =
    parseFloat(import.meta.env.VITE_REWARD_POINT_VALUE) || 0.02;
  const rewardDiscount =
    checkoutMode === "domain"
      ? (rewardState?.appliedPoints || 0) * pointValue
      : 0;
  const totalBeforeReward = subtotalAfterPromo + vatAmount - walletCharge;
  const total = Math.max(0, totalBeforeReward - rewardDiscount);
  const isMixedCheckout = checkoutMode === "mixed";

  return (
    <div className="checkout-card">
      <NavLink
        to={"/cart"}
        className="flex gap-1 items-center text-13 text-tealdark font-medium mb-4"
      >
        <IoChevronBack /> {t.admin.back || "Back"}
      </NavLink>

      <h2 className="heading-title lg:mb-12 mb-8">{t.pages.checkout || "Checkout"}</h2>

      <div className="w-full flex lg:flex-row flex-col gap-10">
        <div className="2xl:w-4/6 xl:w-3/5 lg:w-1/2 flex flex-col w-full gap-10">
          <div className="cart-card mb-3">
            <div className="space-y-4">
              {/* Wallet Balance */}
              <label className="flex justify-between items-start">
                <div className="flex items-start gap-2 mb-1.5">
                  <div className="mt-1">
                    <input
                      type="radio"
                      name="plan"
                      checked={selectedPlan === 1}
                      onChange={() => setSelectedPlan(1)}
                      className="sr-only"
                    />
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors duration-200
                                            ${
                                              selectedPlan === 1
                                                ? "border-tealdark bg-tealdark"
                                                : "border-gray-400"
                                            }`}
                    >
                      {selectedPlan === 1 && (
                        <div className="w-3 h-3 bg-white dark:bg-gray-800 rounded-full"></div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <div className="font-medium text-lg text-primary dark:text-gray-300">
                      {t.pages.walletBalance || "Wallet Balance"}
                    </div>
                    {walletLoading ? (
                      <p className="font-medium text-secondary text-13">
                        {t.pages.loadingBalance || "Loading balance..."}
                      </p>
                    ) : walletError ? (
                      <p className="font-medium text-red-500 text-13">
                        {t.pages.errorLoadingBalance || "Error loading balance"}
                      </p>
                    ) : (
                      <p className="font-medium text-secondary text-13">
                        {/* Available: ${walletBalance?.toFixed(2) ?? 0} */}
                        {t.pages.available || "Available"}: ${Number(walletBalance || 0).toFixed(2)}
                      </p>
                    )}

                    {selectedPlan === 1 && (
                      <WalletBallance
                        mode={
                          checkoutMode === "renewal" ? "renewal" : checkoutMode
                        }
                        hostingItemIds={hostingItemIds}
                        availableBalance={walletBalance}
                        totalAmount={subtotal + vatAmount}
                        walletState={{
                          ...walletSelection,
                          renewalData: isRenewalCheckout
                            ? {
                                subscriptionId: renewalSubscriptionId,
                                period: Number(renewalPeriod),
                                autoRenew: true,
                              }
                            : undefined,
                        }}
                        setWalletState={setWalletSelection}
                        onAmountChange={setWalletAmount}
                        finalTotal={total}
                        canUseBundle={canUseBundle}
                        domainItems={domainItems}
                        hostingItems={hostingItems}
                        onPaymentSuccess={async () => {
                          try {
                            const walletRes = await walletAPI.getWallet();
                            const balanceObj = walletRes?.data?.balance;
                            const balance = Number(
                              (balanceObj?.USD ?? 0).toFixed(2)
                            );
                            setWalletBalance(balance);

                            const cartRes = await cartAPI.getListAddToCart();
                            setCartData(cartRes?.data || cartRes);
                            
                            // Clear promocode from localStorage after successful payment
                            localStorage.removeItem('appliedPromoCode');
                            localStorage.removeItem('promoDiscount');
                          } catch (err) {
                            console.error(
                              "❌ Failed to refresh after payment:",
                              err
                            );
                          }
                        }}
                        rewardState={rewardState}
                      />
                    )}
                  </div>
                </div>
              </label>

              {/* Credit/Debit Card */}
              <label className="flex justify-between items-start">
                <div className="flex items-start gap-2 mb-1.5">
                  <div className="mt-1">
                    <input
                      type="radio"
                      name="plan"
                      checked={selectedPlan === 2}
                      onChange={() => setSelectedPlan(2)}
                      className="sr-only"
                    />
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors duration-200
                                            ${
                                              selectedPlan === 2
                                                ? "border-tealdark bg-tealdark"
                                                : "border-gray-400"
                                            }`}
                    >
                      {selectedPlan === 2 && (
                        <div className="w-3 h-3 bg-white dark:bg-gray-800 rounded-full"></div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="font-medium text-lg text-primary dark:text-gray-300">
                      {t.pages.cryptocurrency || "Cryptocurrency"}
                    </div>

                    {selectedPlan === 2 && (
                      <div className="flex justify-start">
                        <button
                          disabled={checkoutMode === "empty" || total === 0}
                          onClick={handleDynoPayPayment}
                          className={`add-to-cart px-7 ${
                            checkoutMode === "empty" || total === 0
                              ? "opacity-60 !cursor-not-allowed"
                              : ""
                          }`}
                        >
                          <img src={payment} alt="payment" title="payment" />
                          {t.pages.payWithDynoPay?.replace("${amount}", total.toFixed(2)) || `Pay $${total.toFixed(2)} with DynoPay`}
                        </button>

                        {/* <a href='#' className='add-to-cart px-7'>
                          <img src={payment} alt="payment" title='payment' />
                          Pay ${total.toFixed(2)} with DynoPay
                        </a> */}
                      </div>
                    )}
                  </div>
                </div>
              </label>

              {/* Reward Points */}

              <label className="flex justify-between items-start">
                <div className="flex items-start gap-2 mb-1.5">
                  <div className="mt-1">
                    <input
                      type="radio"
                      name="plan"
                      checked={selectedPlan === 3}
                      onChange={() => setSelectedPlan(3)}
                      className="sr-only"
                    />
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors duration-200
                                            ${
                                              selectedPlan === 3
                                                ? "border-tealdark bg-tealdark"
                                                : "border-gray-400"
                                            }`}
                    >
                      {selectedPlan === 3 && (
                        <div className="w-3 h-3 bg-white dark:bg-gray-800 rounded-full"></div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <div className="font-medium text-lg text-primary dark:text-gray-300">
                      {t.payment.rewardPoints || "Reward Points"}
                    </div>
                    <p className="font-medium text-secondary text-13">
                      {t.pages.available || "Available"}: {user?.rewardPoints || 0}
                    </p>

                    {selectedPlan === 3 && (
                      <RewardPoints
                        availablePoints={user?.rewardPoints || 0}
                        totalAmount={subtotal + vatAmount - walletAmount}
                        rewardState={rewardState}
                        setRewardState={setRewardState}
                        onPointsApply={(points) => {
                          setRewardState((prev) => ({
                            ...prev,
                            appliedPoints: points,
                            isApplied: points > 0,
                          }));
                        }}
                        finalTotal={totalBeforeReward}
                        onPaymentSuccess={async () => {
                          try {
                            const walletRes = await walletAPI.getWallet();
                            const balanceObj = walletRes?.data?.balance;
                            const balance = Number(
                              (balanceObj?.USD ?? 0).toFixed(2)
                            );
                            setWalletBalance(balance);

                            const cartRes = await cartAPI.getListAddToCart();
                            setCartData(cartRes?.data || cartRes);

                            showAlert(
                              t.pages.rewardPointsPaymentSuccessful || "Reward points payment successful! Cart refreshed.",
                              {
                                duration: 2500,
                                type: "success",
                              }
                            );
                            
                            // Clear promocode from localStorage after successful payment
                            localStorage.removeItem('appliedPromoCode');
                            localStorage.removeItem('promoDiscount');
                          } catch (err) {
                            console.error(
                              "❌ Failed to refresh after reward payment:",
                              err
                            );
                          }
                        }}
                        walletState={walletSelection}
                      />
                    )}
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="2xl:w-2/6 xl:w-2/5 lg:w-1/2 w-full flex">
          <PaymentOrderSummary
            itemsCount={activeItems.length}
            subtotal={subtotal}
            vatAmount={vatAmount}
            walletCharge={walletCharge}
            rewardDiscount={rewardDiscount}
            total={total}
            onWalletAmountChange={setWalletAmount}
            rewardPoints={rewardState.appliedPoints}
            onTaxRateChange={setDynamicTaxRate}
            onPromoCodeChange={(discount, code) => {
              setPromoCodeDiscount(discount);
              setAppliedPromoCode(code);
            }}
          />
        </div>
      </div>
      <DNSInstructionsModal dnsData={dnsData} />
    </div>
  );
};

export default PaymentCheckout;
