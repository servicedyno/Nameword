const MembershipTier = require("../../models/MembershipTier");

// To get a list of membership tiers
const getAllMembershipTiers = async (req, res) => {
    try {
        const tiers = await MembershipTier.find();
        const detailedTiers = tiers.map(tier => ({
            name: tier.name,
            pointsRequired: tier.pointsRequired,
            benefits: tier.benefits,
            createdAt: tier.createdAt,
            updatedAt: tier.updatedAt,
        }));

        console.log("###tiers",tiers)
        res.status(200).json({ success: true, data: detailedTiers});
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching membership tiers", error });
    }
};

// To update an existing membership tier for increament purposes
const increaseVpsPriceIncrease = async (req, res) => {
    const { tierId } = req.params;
    const { unit, value } = req.body; 

    try {
        const tier = await MembershipTier.findById(tierId);
        if (!tier) {
            return res.status(404).json({ message: "Membership tier not found" });
        }

        // Find the index of the vpsPriceIncrease with type "vpsPurchase"
        const index = tier.benefits.vpsPriceIncrease.findIndex(increase => increase.type === "vpsPurchase");

        // Check if the index is valid
        if (index !== -1) {
            // Update the specified VPS price increase
            await tier.updateVpsPriceIncrease(index, value, unit);
            return res.status(200).json({ success: true, data: tier});
        } else {
            return res.status(400).json({ success: false, message: "No VPS price increase of type 'vpsPurchase' found." });
        }
    } catch (error) {
        res.status(500).json({ message: "Error updating VPS price increase", error });
    }
};

// Exporting the functions at the bottom
module.exports = {
    getAllMembershipTiers,
    increaseVpsPriceIncrease
};