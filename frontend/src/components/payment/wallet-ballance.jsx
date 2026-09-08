import { MdCheck } from "react-icons/md";
import { TbArrowRight } from "react-icons/tb";
import { useState } from "react";
import { walletAPI } from "../../api/walletApi";
import { useAlert } from "../../context/AlertContext";
import { cartAPI } from "../../api/cartApi";
import { domainAPI } from "../../api/domains";
import { hostingAPI } from "../../api/hosting";
import DNSInstructionsModal from "../modals/dns-instructions";
import { useLanguage } from "../../hooks/useLanguage";

const WalletBallance = ({
  mode = "domain",
  hostingItemIds = [],
  availableBalance = 5000,
  totalAmount = 0,
  walletState,
  setWalletState,
  onAmountChange,
  finalTotal,
  onPaymentSuccess,
  rewardState,
  canUseBundle = false,
  domainItems = [],
  hostingItems = [],
}) => {
  const { t } = useLanguage();
  const { walletAmount, appliedAmount, isApplied } = walletState;
  const { showAlert } = useAlert();
  const [isProcessing, setIsProcessing] = useState(false);
  const [dnsData, setDnsData] = useState(null);

  const handlePercentageClick = (percentage) => {
    const baseTotal = Number((finalTotal ?? totalAmount) || 0);
    const amount = ((baseTotal * percentage) / 100).toFixed(2);
    setWalletState({
      ...walletState,
      walletAmount: amount,
      isApplied: false,
      appliedAmount: 0,
    });
  };

  const handleWholeAmount = () => {
    const baseTotal = Number((finalTotal ?? totalAmount) || 0);
    const amount = Math.min(availableBalance, baseTotal).toFixed(2);
    setWalletState({
      ...walletState,
      walletAmount: amount,
      isApplied: false,
      appliedAmount: 0,
    });
  };

  const handleApply = () => {
    const numAmount = parseFloat(walletAmount) || 0;

    if (numAmount < 0) {
      showAlert(t.payment.amountCannotBeNegative || "Amount cannot be negative", { duration: 2500, type: "fail" });
      return;
    }

    if (numAmount > availableBalance) {
      showAlert(t.payment.insufficientWalletBalance || "Insufficient wallet balance", {
        duration: 2500,
        type: "fail",
      });
      return;
    }

    // Use finalTotal if available (remaining after reward points)
    const maxUsable = finalTotal ?? totalAmount;

    if (numAmount - maxUsable > 0.009) {
      showAlert(
        t.payment.amountCannotExceedRemainingTotal?.replace("${amount}", maxUsable.toFixed(2)) || `Amount cannot exceed remaining total: $${maxUsable.toFixed(2)}`,
        { duration: 2500, type: "fail" }
      );
      return;
    }

    setWalletState({
      ...walletState,
      walletAmount: numAmount.toFixed(2),
      appliedAmount: numAmount,
      isApplied: true,
    });
    onAmountChange?.(numAmount);
  };

  const handleChange = () => {
    setWalletState({
      ...walletState,
      walletAmount: "",
      appliedAmount: 0,
      isApplied: false,
    });
    onAmountChange?.(0);
  };

  // const remainingAmount = finalTotal?.toFixed(2);
  const remainingAmount = finalTotal ?? totalAmount - appliedAmount;

  const handleFinalizeOrder = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const amount = Number(parseFloat(appliedAmount).toFixed(2));
      const available = Number(parseFloat(availableBalance).toFixed(2));
      const total = Number(parseFloat(totalAmount).toFixed(2));
      const remaining = Number(parseFloat(finalTotal ?? total).toFixed(2));
      console.log("[Wallet] Finalize order triggered", {
        mode,
        amount,
        available,
        total,
        remaining,
        hostingItemIds,
        rewardState,
      });

      if (!amount || isNaN(amount) || amount <= 0) {
        showAlert(t.payment.pleaseEnterValidAmount || "Please enter a valid amount to pay.", {
          duration: 2500,
          type: "fail",
        });
        return;
      }

      if (amount > available + 0.001) {
        showAlert(
          t.payment.insufficientWalletBalanceWithAmount?.replace("${amount}", available.toFixed(2)) || `Insufficient wallet balance. You have $${available.toFixed(2)}.`,
          { duration: 2500, type: "fail" }
        );
        return;
      }

      if (remaining > 0.009 && amount > remaining + 0.01) {
        showAlert(
          t.payment.amountCannotExceedRemainingTotal?.replace("${amount}", remaining.toFixed(2)) || `Amount cannot exceed remaining total: $${remaining.toFixed(2)}`,
          { duration: 2500, type: "fail" }
        );
        return;
      }

      // Handle bundle scenario (domain + hosting)
      if (mode === "mixed" && canUseBundle && domainItems.length === 1 && hostingItems.length === 1) {
        const domainItem = domainItems[0];
        const hostingItem = hostingItems[0];

        if (!domainItem?._id || !hostingItem?._id) {
          showAlert(t.payment.bundleItemsMissingInfo || "Bundle items are missing required information.", {
            duration: 3000,
            type: "fail",
          });
          setIsProcessing(false);
          return;
        }

        console.log("[Wallet] Sending bundle wallet payment payload", {
          amount,
          domainCartItemId: domainItem._id,
          hostingCartItemId: hostingItem._id,
        });
        const response = await hostingAPI.processBundleWalletPayment({
          amount,
          domainCartItemId: domainItem._id,
          hostingCartItemId: hostingItem._id,
        });
        console.log("[Wallet] Bundle wallet payment response", response);

        if (!response?.success) {
          showAlert(response?.message || t.payment.bundlePaymentFailed || "Bundle payment failed.", {
            duration: 3000,
            type: "fail",
          });
          setIsProcessing(false);
          return;
        }

        showAlert(t.payment.bundlePurchaseCompleted || "Bundle purchase completed successfully! Redirecting...", {
          duration: 2000,
          type: "success",
        });
        onPaymentSuccess?.();
        setWalletState({
          walletAmount: "",
          appliedAmount: 0,
          isApplied: false,
        });
        onAmountChange?.(0);
        setDnsData(response?.data?.dnsData);

        if (!response?.data?.dnsData) {
          setTimeout(() => {
            window.location.href = "/websites";
          }, 2000);
        }

        setIsProcessing(false);
        return;
      }

      if (mode === "hosting") {
        if (!hostingItemIds.length) {
          showAlert(t.payment.noHostingItemsSelected || "No hosting items selected for wallet payment.", {
            duration: 3000,
            type: "fail",
          });
          return;
        }

        console.log("[Wallet] Sending hosting wallet payment payload", {
          amount,
          cartItemIds: hostingItemIds,
        });
        const response = await hostingAPI.processWalletPayment({
          amount,
          cartItemIds: hostingItemIds,
        });
        console.log("[Wallet] Hosting wallet payment response", response);

        if (!response?.success) {
          showAlert(response?.message || t.payment.hostingPaymentFailed || "Hosting payment failed.", {
            duration: 3000,
            type: "fail",
          });
          return;
        }

        showAlert(t.payment.hostingPurchaseCompleted || "Hosting purchase completed successfully! Redirecting...", {
          duration: 2000,
          type: "success",
        });
        onPaymentSuccess?.();
        setWalletState({
          walletAmount: "",
          appliedAmount: 0,
          isApplied: false,
        });
        onAmountChange?.(0);
        setDnsData(response?.data?.dnsData);

        if (!response?.data?.dnsData) {
          setTimeout(() => {
            window.location.href = "/websites";
          }, 2000);
        }

        return;
      }

      if (mode === "renewal") {
        const {
          subscriptionId,
          period,
          autoRenew = true,
        } = walletState.renewalData || {};

        if (!subscriptionId || !period) {
          showAlert(t.payment.renewalInformationMissing || "Renewal information missing.", {
            duration: 3000,
            type: "fail",
          });
          return;
        }

        console.log("[Wallet] Sending hosting renewal wallet payment payload", {
          amount,
          subscriptionId,
          period,
          autoRenew,
        });
        const response = await hostingAPI.processRenewalWalletPayment({
          subscriptionId,
          period,
          amount,
          autoRenew,
        });
        console.log(
          "[Wallet] Hosting renewal wallet payment response",
          response
        );

        if (!response?.success) {
          showAlert(response?.message || t.payment.hostingRenewalPaymentFailed || "Hosting renewal payment failed.", {
            duration: 3000,
            type: "fail",
          });
          return;
        }

        showAlert(t.payment.hostingRenewedSuccessfully || "Hosting renewed successfully!", {
          duration: 2500,
          type: "success",
        });
        onPaymentSuccess?.();
        setWalletState({
          walletAmount: "",
          appliedAmount: 0,
          isApplied: false,
        });
        onAmountChange?.(0);
        return;
      }

      //  Step 1: Process wallet payment for domains
      const paymentPayload = {
        amount,
        currency: "USD",
        method: "wallet_balance",
        reference: `wallet_${Date.now()}`,
        cartCheckout: true,
      };
      console.log(
        "[Wallet] Sending domain wallet payment payload",
        paymentPayload
      );

      const payRes = await walletAPI.processPayment(paymentPayload);
      console.log("[Wallet] Domain wallet payment response", payRes);

      const paymentSuccess =
        payRes?.success === true ||
        payRes?.status === true ||
        payRes?.status === "success";

      if (!paymentSuccess) {
        showAlert(payRes?.message || t.payment.walletPaymentFailed || "Wallet payment failed.", {
          duration: 2500,
          type: "fail",
        });
        setIsProcessing(false);
        return;
      }

      showAlert(t.payment.walletPaymentSuccessful || "Wallet payment successful! Finalizing domain purchase...", {
        duration: 2500,
        type: "success",
      });

      //  Step 2: Fetch all cart items
      const cartList = await cartAPI.getListAddToCart();
      const items = cartList?.data?.items || cartList?.data || [];
      console.log("[Wallet] Cart items fetched for domain ordering", items);

      if (!items.length) {
        showAlert(t.payment.cartEmpty || "Your cart is empty. Please add a domain before checkout.", {
          duration: 3000,
          type: "fail",
        });
        setIsProcessing(false);
        return;
      }

      let successCount = 0;
      let failedCount = 0;

      const typeMap = { register: 1, transfer: 2, renew: 3 };

      //  Step 3: Loop through domains and order
      for (const item of items) {
        if (item.itemType !== "domain") continue;

        const provider = item.domain?.provider || "openprovider";

        let ns1, ns2, ns3, ns4;
        if (provider === "openprovider") {
          ns1 = "ns1.openprovider.nl";
          ns2 = "ns2.openprovider.be";
          ns3 = "ns3.openprovider.eu";
          ns4 = null;
        } else if (provider === "cloudflare") {
          ns1 = "sara.ns.cloudflare.com";
          ns2 = "jack.ns.cloudflare.com";
          ns3 = null;
          ns4 = null;
        } else {
          // fallback default
          ns1 = item.domain?.nameservers?.[0] || "ns1.freedns.com";
          ns2 = item.domain?.nameservers?.[1] || "ns2.freedns.com";
          ns3 = item.domain?.nameservers?.[2] || null;
          ns4 = item.domain?.nameservers?.[3] || null;
        }

        const domainPayload = {
          productType: typeMap[item.domain?.action] || 1,
          // websiteName: item.domain?.name,
          websiteName:
            typeof item.domain === "string"
              ? JSON.parse(item.domain)?.name
              : item.domain?.name,

          duration: item.domain?.years || 1,
          isWhoisProtection: !!item.domain?.whoisProtection,
          ns1,
          ns2,
          ns3,
          ns4,
          id: item.domain?.productId || null,
          isEnablePremium: 0,
          provider,
          handle: "default",

          rewardPointsUsed: rewardState?.appliedPoints || 0,
        };

        try {
          const res = await domainAPI.placeDomainOrder(domainPayload);
          console.log("[Wallet] Domain order response", {
            domain: item.domain?.name,
            response: res,
          });
          if (res?.responseMsg?.statusCode === 200) {
            showAlert(t.payment.domainPurchasedSuccessfully?.replace("${domain}", item.domain.name) || `Domain ${item.domain.name} purchased successfully!`, {
              duration: 2500,
              type: "success",
            });
            successCount++;
          } else {
            failedCount++;
            showAlert(
              t.payment.failedToOrderDomain?.replace("${domain}", item.domain.name).replace("${message}", res?.responseMsg?.message || "") || `Failed to order ${item.domain.name}: ${res?.responseMsg?.message}`,
              { duration: 3000, type: "fail" }
            );
          }
        } catch (err) {
          failedCount++;
          console.error("❌ Domain order error:", err);

          const backendData = err?.response?.data;
          let errorMessage = t.payment.errorOrderingDomain?.replace("${domain}", item.domain?.name || t.payment.domain || "domain") || `Error ordering ${item.domain?.name || "domain"}`;

          if (backendData?.responseMsg?.message) {
            errorMessage = backendData.responseMsg.message;
          } else if (backendData?.message) {
            errorMessage = backendData.message;
          } else if (
            Array.isArray(backendData?.errors) &&
            backendData.errors.length > 0
          ) {
            errorMessage = backendData.errors.map((e) => e.message).join(", ");
          } else if (err?.message) {
            errorMessage = err.message;
          }

          showAlert(`${item.domain?.name}: ${errorMessage}`, {
            duration: 4000,
            type: "fail",
          });
        }

        // 🧾 If all domains failed, revert wallet deduction
        if (failedCount > 0 && successCount === 0 && appliedAmount > 0) {
          try {
            await walletAPI.fundWallet({
              amount: appliedAmount,
              currency: "USD",
              method: "wallet_balance",
              reference: `refund_${Date.now()}`,
            });

            // showAlert(
            //     `Domain purchase failed. $${appliedAmount} refunded to your wallet.`,
            //     { duration: 3000, type: "fail" }
            // );
          } catch (refundErr) {
            console.error("Wallet refund failed:", refundErr);
            showAlert(t.payment.walletRefundFailed || "Wallet refund failed. Please contact support.", {
              duration: 3000,
              type: "fail",
            });
          }

          // Reset wallet state in UI
          setWalletState({
            ...walletState,
            walletAmount: "",
            appliedAmount: 0,
            isApplied: false,
          });
          onAmountChange?.(0);
        }
      }

      // 🎉 Step 4: Finalize
      if (successCount > 0) {
        showAlert(t.payment.domainPurchaseCompleted || "Domain purchase completed successfully!", {
          duration: 3000,
          type: "success",
        });
        onPaymentSuccess?.();
        setWalletState({
          ...walletState,
          walletAmount: "",
          appliedAmount: 0,
          isApplied: false,
        });
      }
    } catch (error) {
      console.error("Finalize order error:", error);
      showAlert(t.payment.unexpectedError || "Unexpected error occurred. Please try again.", {
        duration: 3000,
        type: "fail",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (remainingAmount <= 0.009) {
    return (
      <div className="flex flex-col gap-2.5 mt-3">
        <div className="w-full flex flex-wrap justify-start items-center gap-4 promocode">
          <div className="promocode-added">
            <MdCheck className="w-5 h-5 flex-none" />
            <p>{t.payment.willBeChargedFromWallet?.replace("${amount}", appliedAmount.toFixed(2)) || `$${appliedAmount.toFixed(2)} will be charged from your Wallet`}</p>
          </div>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handleChange();
            }}
            className="text-darkbtn dark:text-gray-300 text-13 font-medium"
          >
            {t.payment.change || "Change"}
          </a>
        </div>

        <div className="flex justify-start">
          {/* <button
                        onClick={handleFinalizeOrder}
                        className='add-to-cart px-7'
                    >
                        Finalize the order <TbArrowRight size={18} />
                    </button> */}

          <button
            disabled={isProcessing}
            onClick={handleFinalizeOrder}
            className={`add-to-cart px-7 ${isProcessing ? "opacity-70 cursor-not-allowed" : ""
              }`}
          >
            {isProcessing ? (t.payment.processing || "Processing...") : (t.payment.finalizeOrder || "Finalize the order")}{" "}
            <TbArrowRight size={18} />
          </button>
        </div>
        <DNSInstructionsModal dnsData={dnsData} />
      </div>
    );
  }

  if (!isApplied) {
    return (
      <div className="flex flex-col">
        <div className="flex flex-col gap-2.5 mt-3">
          <p className="font-medium text-13 text-primary dark:text-gray-300">
            {t.payment.useFromWallet || "Use from Wallet, $"}
          </p>

          <div className="tag-percentage">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                handleWholeAmount();
              }}
              className="tag-badge"
            >
              {t.payment.wholeAmount || "Whole amount"}
            </a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                handlePercentageClick(75);
              }}
              className="tag-badge"
            >
              75%
            </a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                handlePercentageClick(50);
              }}
              className="tag-badge"
            >
              50%
            </a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                handlePercentageClick(25);
              }}
              className="tag-badge"
            >
              25%
            </a>
          </div>

          <div className="max-w-2xs relative wallet-value">
            <div className="flex items-center justify-center gap-3 w-full">
              <input
                type="number"
                step="0.01"
                className="search-input w-full"
                value={walletAmount}
                onChange={(e) =>
                  setWalletState((prev) => ({
                    ...prev,
                    walletAmount: e.target.value,
                    isApplied: false,
                    appliedAmount: 0,
                  }))
                }
                placeholder={t.payment.amountPlaceholder || "0.00"}
              />
              <button
                onClick={handleApply}
                disabled={
                  Number(availableBalance || 0) < 0.01 ||
                  (parseFloat(walletAmount) || 0) < 0.01 ||
                  (parseFloat(walletAmount) || 0) > Number(availableBalance || 0)
                }
                className="btn-blue disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t.payment.apply || "Apply"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 mt-3">
      <div className="w-full flex flex-wrap justify-start items-center gap-4 promocode">
        <div className="promocode-added">
          <MdCheck className="w-5 h-5 flex-none" />
          <p>{t.payment.willBeChargedFromWallet?.replace("${amount}", appliedAmount.toFixed(2)) || `$${appliedAmount.toFixed(2)} will be charged from your Wallet`}</p>
        </div>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            handleChange();
          }}
          className="text-darkbtn dark:text-gray-300 text-13 font-medium"
        >
          {t.payment.change || "Change"}
        </a>
      </div>

      <p className="font-medium text-13 text-primary dark:text-gray-300">
        {t.payment.payRestWithOtherMethods?.replace("${amount}", Number(remainingAmount).toFixed(2)) || `Please pay the rest ($${Number(remainingAmount).toFixed(2)}) with other available payment methods`}
      </p>
      <DNSInstructionsModal dnsData={dnsData} />
    </div>
  );
};

export default WalletBallance;
