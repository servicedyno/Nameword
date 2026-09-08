const VPSBillingCycleDiscount = require("../../models/VPSBillingCycleDiscount");

// Update Billing Cycle Discount 
const updateBillingCycle = async (req, res) => {
    try {
        const { discount, enabled } = req.body; // Get new discount and enabled status
        const { billingCycleId } = req.params;

        console.log("### Updating Billing Cycle ID:", billingCycleId);

        const updatedDiscount = await VPSBillingCycleDiscount.findByIdAndUpdate(
            billingCycleId,
            { ...(discount !== undefined && { discount }), ...(enabled !== undefined && { enabled }) },
            { new: true }
        );

        if (!updatedDiscount) {
            return res.status(404).json({ success: false, message: "Billing cycle discount not found." });
        }

        res.json({
            success: true,
            message: "Billing cycle discount updated successfully.",
            data: updatedDiscount
        });

    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to update billing cycle discount.", details: err.message });
    }
};


module.exports = {
    updateBillingCycle
};
