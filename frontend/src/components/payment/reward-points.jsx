import { MdCheck } from "react-icons/md";
import { TbArrowRight } from "react-icons/tb";
import { useAlert } from "../../context/AlertContext";
import { useState } from "react";
import { cartAPI } from "../../api/cartApi";
import { domainAPI } from "../../api/domains";
import { useLanguage } from "../../hooks/useLanguage";



const RewardPoints = ({ availablePoints = 500, totalAmount = 0, rewardState, setRewardState, onPointsApply, finalTotal, onPaymentSuccess, walletState }) => {
    const { t } = useLanguage();
    const { rewardPoints, appliedPoints, isApplied } = rewardState;
    const { showAlert } = useAlert();
    const pointValue = parseFloat(import.meta.env.VITE_REWARD_POINT_VALUE) || 0.02;
    const [isProcessing, setIsProcessing] = useState(false);


    const handlePresetClick = (points) => {
        setRewardState({ ...rewardState, rewardPoints: points, isApplied: false, appliedPoints: 0 });
    };

    const handleApply = () => {
        const numPoints = parseFloat(rewardPoints) || 0;


        if (numPoints <= 0) {
            showAlert(t.payment.pleaseEnterValidRewardPoints || "Please enter valid reward points", { duration: 2500, type: "fail" });
            return;
        }


        if (numPoints > availablePoints) {
            showAlert(t.payment.insufficientRewardPoints || "Insufficient reward points", { duration: 2500, type: "fail" });
            return;
        }


        const discountValue = numPoints * pointValue;
        const maxUsable = Number(totalAmount ?? 0);

        if (discountValue - maxUsable > 0.009) {
            showAlert(t.payment.pointsExceedRemainingAmount?.replace("${amount}", maxUsable.toFixed(2)) || `Points exceed remaining amount: $${maxUsable.toFixed(2)}`, { duration: 2500, type: "fail" });
            return;
        }

        setRewardState({ rewardPoints: numPoints, appliedPoints: numPoints, isApplied: true });
        onPointsApply?.(numPoints);
        showAlert(t.payment.rewardPointsAppliedSuccessfully?.replace("${points}", numPoints.toString()) || `${numPoints} reward points applied successfully!`, { duration: 2500, type: "success" });
    };


    const handleChange = () => {
        setRewardState({ rewardPoints: "", appliedPoints: 0, isApplied: false });
        onPointsApply?.(0);
    };


    const handleFinalizeOrder = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            const discountValue = appliedPoints * pointValue;
            const total = Number(parseFloat(totalAmount).toFixed(2));
            const remaining = Number(parseFloat(finalTotal ?? total).toFixed(2));

            if (!appliedPoints || isNaN(appliedPoints) || appliedPoints <= 0) {
                showAlert(t.payment.pleaseEnterValidRewardPoints || "Please enter valid reward points.", { duration: 2500, type: "fail" });
                setIsProcessing(false);
                return;
            }

            const maxPointsValue = availablePoints * pointValue;
            if (discountValue > maxPointsValue + 0.001) {
                showAlert(t.payment.insufficientRewardPointsWithMax?.replace("${points}", availablePoints.toString()) || `Insufficient reward points. You can use up to ${availablePoints} points.`, { duration: 2500, type: "fail" });
                setIsProcessing(false);
                return;
            }

            if (remaining > 0.009 && discountValue > remaining + 0.01) {
                showAlert(t.payment.pointsExceedRemainingTotal?.replace("${amount}", remaining.toFixed(2)) || `Points exceed remaining total: $${remaining.toFixed(2)}`, { duration: 2500, type: "fail" });
                setIsProcessing(false);
                return;
            }

            showAlert(t.payment.rewardPointsAppliedFinalizing || "Reward points applied! Finalizing domain purchase...", { duration: 2500, type: "success" });

            const cartList = await cartAPI.getListAddToCart();
            const items = cartList?.data?.items || cartList?.data || [];

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
                    ns1 = item.domain?.nameservers?.[0] || "ns1.freedns.com";
                    ns2 = item.domain?.nameservers?.[1] || "ns2.freedns.com";
                    ns3 = item.domain?.nameservers?.[2] || null;
                    ns4 = item.domain?.nameservers?.[3] || null;
                }

                const domainPayload = {
                    productType: typeMap[item.domain?.action] || 1,
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
                    walletAmountUsed: walletState?.appliedAmount || 0,

                };

                try {
                    const res = await domainAPI.placeDomainOrder(domainPayload);
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
                    } else if (Array.isArray(backendData?.errors) && backendData.errors.length > 0) {
                        errorMessage = backendData.errors.map(e => e.message).join(", ");
                    } else if (err?.message) {
                        errorMessage = err.message;
                    }

                    showAlert(`${item.domain?.name}: ${errorMessage}`, {
                        duration: 4000,
                        type: "fail",
                    });
                }
            }

            if (successCount > 0) {
                showAlert(t.payment.domainPurchaseCompleted || "Domain purchase completed successfully!", {
                    duration: 3000,
                    type: "success",
                });
                onPaymentSuccess?.();
                setRewardState({
                    rewardPoints: "",
                    appliedPoints: 0,
                    isApplied: false,
                });
            }

        } catch (error) {
            console.error("Finalize order error:", error);
            showAlert(t.payment.unexpectedError || "Unexpected error occurred. Please try again.", { duration: 3000, type: "fail" });
        } finally {
            setIsProcessing(false);
        }
    };



    const discountValue = Number(appliedPoints) * pointValue;

    const baseTotal = Number(totalAmount ?? 0);
    const remainingAmount = Number((baseTotal - discountValue).toFixed(2));
    const isFullyCovered = remainingAmount < 0.009;





    if (!isApplied && !isFullyCovered) {
        return (
            <div className="flex flex-col gap-2.5 mt-3">
                <p className="font-medium text-13 text-primary dark:text-gray-300">{t.payment.applyRewardPoints || "Apply Reward Points"}</p>

                <div className="tag-percentage">
                    {[500, 400, 300, 200, 100].map((p) => (
                        <a
                            key={p}
                            href="#"
                            onClick={(e) => { e.preventDefault(); handlePresetClick(p); }}
                            className="tag-badge"
                        >
                            {p}
                        </a>
                    ))}
                </div>

                <div className="max-w-2xs relative wallet-value">
                    <div className="flex items-center justify-center gap-3 w-full">
                        <input
                            type="number"
                            className="search-input w-full"
                            value={rewardPoints}
                            onChange={(e) =>
                                setRewardState({
                                    ...rewardState,
                                    rewardPoints: e.target.value,
                                    isApplied: false,
                                    appliedPoints: 0,
                                })
                            }
                            placeholder={t.payment.enterPoints || "Enter points"}
                        />
                        <button onClick={handleApply} className="btn-blue">{t.payment.apply || "Apply"}</button>
                    </div>
                </div>
            </div>
        );
    }

    // Applied fully
    if (isFullyCovered) {
        return (
            <div className="flex flex-col gap-2.5 mt-3">
                <div className="w-full flex flex-wrap justify-start items-center gap-4 promocode">
                    <div className="promocode-added">
                        <MdCheck className="w-5 h-5 flex-none" />
                        <p>{t.payment.rewardPointsFullyCovered?.replace("${points}", appliedPoints.toString()) || `${appliedPoints} Reward Points fully covered your order`}</p>
                    </div>
                    <a href="#" onClick={(e) => { e.preventDefault(); handleChange(); }} className="text-darkbtn dark:text-gray-300 text-13 font-medium">{t.payment.change || "Change"}</a>
                </div>

                <div className="flex justify-start">
                    <button
                        disabled={isProcessing}
                        onClick={handleFinalizeOrder}
                        className={`add-to-cart px-7 ${isProcessing ? "opacity-70 cursor-not-allowed" : ""}`}
                    >
                        {isProcessing ? (t.payment.processing || "Processing...") : (t.payment.finalizeOrder || "Finalize the order")} <TbArrowRight size={18} />
                    </button>
                </div>

            </div>
        );
    }

    // Applied partially
    return (
        <div className="flex flex-col gap-2.5 mt-3">
            <div className="w-full flex flex-wrap justify-start items-center gap-4 promocode">
                <div className="promocode-added">
                    <MdCheck className="w-5 h-5 flex-none" />
                    <p>{t.payment.rewardPointsDiscounted?.replace("${points}", appliedPoints.toString()) || `${appliedPoints} Reward Points have discounted your order`}</p>
                </div>
                <a href="#" onClick={(e) => { e.preventDefault(); handleChange(); }} className="text-darkbtn dark:text-gray-300 text-13 font-medium">{t.payment.change || "Change"}</a>
            </div>

            <p className="font-medium text-13 text-primary dark:text-gray-300">
                {t.payment.payRestWithOtherMethods?.replace("${amount}", Number(remainingAmount).toFixed(2)) || `Please pay the rest ($${Number(remainingAmount).toFixed(2)}) with other available payment methods`}
            </p>

        </div>
    );
};

export default RewardPoints;
