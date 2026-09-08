const VPSBillingCycleDiscount = require("../../models/VPSBillingCycleDiscount");
const VpsPlan = require("../../models/VPSPlan");

const getVPSBillingCycleDiscount = async (req, res) => {
    try {
        const billingCycleDiscounts = await VPSBillingCycleDiscount.find({ enabled: true });
        res.status(200).json({ success: true, data: billingCycleDiscounts });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to retrieve billing cycle discounts" });
    }
}

const getVPSBillingCycle = async (req, res) => {
    try {
        const { planId } = req.params;

        // Fetch the selected VPS plan
        const selectedPlan = await VpsPlan.findById(planId);
        if (!selectedPlan) {
            return res.status(404).json({ success: false, message: "VPS plan not found." });
        }

        // Fetch all billing cycles with their discount percentages
        const billingCycles = await VPSBillingCycleDiscount.find({ enabled: true });

        // Generate response with calculated savings
        const billingData = billingCycles.map(cycle => {
            let originalPrice = selectedPlan.monthlyPrice;
            let finalPrice, savings = 0;

            if (cycle.type.toLowerCase() === "hourly") {
                finalPrice = selectedPlan.hourlyPrice
                originalPrice = selectedPlan.hourlyPrice
            } else {
                let multiplier = cycle.type.toLowerCase() === "monthly" ? 1 :
                    cycle.type.toLowerCase() === "quarterly" ? 3 : 12;
                    let totalPrice = originalPrice * multiplier;
                    savings = (totalPrice * cycle.discount) / 100;
                    finalPrice = totalPrice - savings;
                    originalPrice =  originalPrice * multiplier;
            }

            return {
                billingCycle: cycle.type,
                discountPercentage: cycle.discount,
                finalPrice: finalPrice?.toFixed(2),
                savings: savings?.toFixed(2),
                originalPrice: originalPrice?.toFixed(2)
            };
        });

        res.status(200).json({ success: true, data: { plan: selectedPlan.name, billingCycles: billingData} });

    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to retrieve billing cycles.", details: err.message });
    }
}


module.exports = { getVPSBillingCycleDiscount, getVPSBillingCycle };