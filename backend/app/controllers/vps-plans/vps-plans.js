const { fetchVPSPlansWithCosts } = require("../../helpers/computeEngineHelper");

const getAllVPSPlans = async (req, res) => {
    try {
        const userId = req.user._id;
        const region = req.query.region;
        const diskType = req.query.diskType;
        const preemptible = req.query?.preemptible || false;

        const vpsPlansWithCosts = await fetchVPSPlansWithCosts({ userId, region, diskType, preemptible });

        // Return the plans with their calculated costs
        res.status(200).json({ success: true, data: vpsPlansWithCosts });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to retrieve VPS plans", error: err.message });
    }
};

module.exports = { getAllVPSPlans };
