const { renewRDPSubscriptionAndUpdateDB } = require("../../helpers/rdpHelper");
const RDPSubscription = require("../../models/RDPSubscription");
const UpCloudController = require("../upcloud/upcloudController");

// 🔍 Get all RDP subscriptions for the logged-in user
const getSubscription = async (req, res) => {
    try {
        const userId = req.user?._id;

        // 1. Only fetch ACTIVE subscriptions
        const subscriptions = await RDPSubscription.find({ userId })
            .populate("planId")
            .populate("rdpId")
            .populate("billingCycleId");

        // 2. Fetch live UpCloud details for each RDP server
        const enriched = await Promise.all(subscriptions.map(async (sub) => {
            const rdp = sub.rdpId;
            let liveData = null;

            try {
                if (rdp?.serverId && (sub?.status === "active" || sub?.status === "pending_renewal" || sub?.status === "grace_period")) {
                    const response = await UpCloudController.getRDPServerDetails(rdp.serverId);
                    if (response.success) {
                        liveData = response.data;
                    }
                }
            } catch (err) {
                console.warn(`⚠️ Failed to get live server for ${rdp?.serverId}:`, err.message);
            }

            return {
                subscription: sub,
                liveServer: liveData
            };
        }));

        return res.status(200).json({
            success: true,
            message: "Fetched active RDP subscriptions with live server data.",
            data: enriched
        });

    } catch (error) {
        console.error("❌ Error fetching subscriptions:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Something went wrong while fetching subscriptions."
        });
    }
};


// ✏️ Update subscription (manual changes like autoRenew toggle, etc.)
const updateSubscription = async (req, res) => {
    try {
        const { subscription_id } = req.params;
        const updates = req.body;

        const updated = await RDPSubscription.findByIdAndUpdate(subscription_id, updates, { new: true });

        if (!updated) {
            return res.status(404).json({ success: false, message: "Subscription not found." });
        }

        return res.status(200).json({
            success: true,
            message: "Subscription updated successfully.",
            data: updated
        });
    } catch (error) {
        console.error("❌ Error updating subscription:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to update subscription."
        });
    }
};

// 🔄 Manual renewal 
const renewSubscription = async (req, res) => {
    try {
        const { subscription_id } = req.body;

        const result = await renewRDPSubscriptionAndUpdateDB({
            subscriptionId: subscription_id,
            useWallet: false
        });

        return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error("❌ Error renewing subscription:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Something went wrong during renewal."
        });
    }
};


// 💳 Renew using wallet
const renewUsingWalletSubscription = async (req, res) => {
    try {
        const { subscription_id } = req.body;

        const result = await renewRDPSubscriptionAndUpdateDB({
            subscriptionId: subscription_id,
            useWallet: true
        });

        return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error("❌ Error renewing via wallet:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to renew subscription using wallet."
        });
    }
};

module.exports = {
    getSubscription,
    updateSubscription,
    renewSubscription,
    renewUsingWalletSubscription
};
