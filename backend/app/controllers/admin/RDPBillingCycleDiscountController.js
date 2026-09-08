const RDPBillingCycleDiscount = require("../../models/RDPBillingCycleDiscount");

const getRDPBillingCycleDiscount = async (req, res) => {
    try {
        const billingCycleDiscounts = await RDPBillingCycleDiscount.find({ enabled: true });
        res.status(200).json({ success: true, data: billingCycleDiscounts });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to retrieve RDP billing cycle discounts" });
    }
}

// Update RDP Billing Cycle Discount 
const updateRDPBillingCycleDiscounts = async (req, res) => {
    try {
        const { discount, enabled } = req.body; // Get new discount and enabled status
        const { billingCycleId } = req.params;

        console.log("Updating Billing Cycle ID:", billingCycleId);

        const updatedDiscount = await RDPBillingCycleDiscount.findByIdAndUpdate(
            billingCycleId,
            { ...(discount !== undefined && { discount }), ...(enabled !== undefined && { enabled }) },
            { new: true }
        );

        if (!updatedDiscount) {
            return res.status(404).json({ success: false, message: "RDP Billing cycle discount not found." });
        }

        res.json({
            success: true,
            message: "RDP Billing cycle discount updated successfully.",
            data: updatedDiscount
        });

    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to update RDP billing cycle discount.", details: err.message });
    }
};


module.exports = {
    getRDPBillingCycleDiscount,
    updateRDPBillingCycleDiscounts
};
