const CPanelPlan = require("../../models/CpanelPlan");

// Create a new cPanel Plan (WHM/Plesk)
const getCPanelPlan = async (req, res) => {
    try {
        const { type } = req.query; // Extract name from query params

        // Build query condition (filter by name if provided)
        const query = type ? { type: new RegExp(`^${type}$`, "i") } : {};

        // Fetch cPanel plans (filtered if type is provided)
        const cPanelPlans = await CPanelPlan.find(query);

        if (type && cPanelPlans.length === 0) {
            return res.status(404).json({ success: false, message: `No cPanel plan found with the name '${name}'.` });
        }

        res.status(200).json({ success: true, message: "cPanel plans fetched successfully.", data: cPanelPlans });

    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to fetch cPanel plans.", details: err.message });
    }
};

const createCPanelPlan = async (req, res) => {
    try {
        const { type, name, tier, maxAccounts, maxDomains, price, billingDuration, durationValue, enabled } = req.body;

        // Validate type
        if (!["WHM", "Plesk"].includes(type)) {
            return res.status(400).json({ success: false, message: "Invalid plan type. Must be WHM or Plesk." });
        }

        // Validate billing duration
        if (!["monthly", "days"].includes(billingDuration)) {
            return res.status(400).json({ success: false, message: "Invalid billing duration. Must be 'monthly' or 'days'." });
        }

        // Check if the plan name already exists
        const existingPlan = await CPanelPlan.findOne({ name, type });
        if (existingPlan) {
            return res.status(400).json({ success: false, message: `A ${type} plan with the name '${name}' already exists.` });
        }

        const newPlan = new CPanelPlan({ type, name, tier, maxAccounts, maxDomains, price, billingDuration, durationValue, enabled });
        await newPlan.save();

        res.status(201).json({ success: true, message: "cPanel plan created successfully.", data: newPlan });

    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to create cPanel plan.", details: err.message });
    }
};

// Update an existing cPanel Plan
const updateCPanelPlan =  async (req, res) => {
    try {
        const { cPanelPlanId } = req.params;
        const { name, tier, maxAccounts, maxDomains, price, billingDuration, durationValue, enabled } = req.body;

        const existingPlan = await CPanelPlan.findById(cPanelPlanId);
        if (!existingPlan) {
            return res.status(404).json({ success: false, message: "cPanel plan not found." });
        }

        // Ensure no duplicate names within the same type
        if (name && name !== existingPlan.name) {
            const duplicatePlan = await CPanelPlan.findOne({ name, type: existingPlan.type, _id: { $ne: id } });
            if (duplicatePlan) {
                return res.status(400).json({ success: false, message: `A ${existingPlan.type} plan with the name '${name}' already exists.` });
            }
        }

        // Update fields only if provided
        existingPlan.name = name ?? existingPlan.name;
        existingPlan.tier = tier ?? existingPlan.tier;
        existingPlan.maxAccounts = maxAccounts ?? existingPlan.maxAccounts;
        existingPlan.maxDomains = maxDomains ?? existingPlan.maxDomains;
        existingPlan.price = price ?? existingPlan.price;
        existingPlan.billingDuration = billingDuration ?? existingPlan.billingDuration;
        existingPlan.durationValue = durationValue ?? existingPlan.durationValue;
        existingPlan.enabled = enabled ?? existingPlan.enabled;

        await existingPlan.save();

        res.status(200).json({ success: true, message: "cPanel plan updated successfully.", data: existingPlan });

    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to update cPanel plan.", details: err.message });
    }
};

// Delete a cPanel Plan
const deleteCPanelPlan =  async (req, res) => {
    try {
        const { cPanelPlanId } = req.params;
        const deletedPlan = await CPanelPlan.findByIdAndDelete(cPanelPlanId);

        if (!deletedPlan) {
            return res.status(404).json({ success: false, message: "cPanel plan not found." });
        }

        res.json({ success: true, message: "cPanel plan deleted successfully." });

    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to delete cPanel plan.", details: err.message });
    }
};

module.exports = { createCPanelPlan, updateCPanelPlan, deleteCPanelPlan, getCPanelPlan};
