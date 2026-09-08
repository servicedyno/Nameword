const HostingPlan = require("../../models/HostingPlan");
const OpenProviderController = require("../open-provider/OpenProviderController");

// List plans (optionally only active)
const listHostingPlans = async (req, res) => {
	try {
		const { active } = req.query;
		const filter = {};
		if (typeof active !== "undefined") {
			filter.isActive = String(active) === "true";
		}
		const plans = await HostingPlan.find(filter).sort({ sortOrder: 1, createdAt: -1 });
		return res.json({ success: true, total: plans.length, data: plans });
	} catch (err) {
		return res.status(500).json({ success: false, message: "Failed to fetch hosting plans", details: err.message });
	}
};

// Create plan
const createHostingPlan = async (req, res) => {
	try {
		const body = req.body || {};
		// Ensure name uniqueness
		const existing = await HostingPlan.findOne({ name: body.name });
		if (existing) {
			return res.status(400).json({ success: false, message: "Hosting plan with this name already exists" });
		}

		const plan = await HostingPlan.create(body);

		return res.status(201).json({ success: true, message: "Hosting plan created", data: plan });
	} catch (err) {
		return res.status(500).json({ success: false, message: "Failed to create hosting plan", details: err.message });
	}
};

// Get single plan
const getHostingPlanById = async (req, res) => {
	try {
		const { planId } = req.params;
		const plan = await HostingPlan.findById(planId);
		if (!plan) return res.status(404).json({ success: false, message: "Hosting plan not found" });
		return res.json({ success: true, data: plan });
	} catch (err) {
		return res.status(500).json({ success: false, message: "Failed to fetch hosting plan", details: err.message });
	}
};

// Update plan
const updateHostingPlan = async (req, res) => {
	try {
		const { planId } = req.query;
		const updates = req.body || {};
		if (updates.name) {
			const duplicate = await HostingPlan.findOne({ name: updates.name, _id: { $ne: planId } });
			if (duplicate) {
				return res.status(400).json({ success: false, message: "Another plan with this name already exists" });
			}
		}
		const plan = await HostingPlan.findByIdAndUpdate(planId, updates, { new: true });
		if (!plan) return res.status(404).json({ success: false, message: "Hosting plan not found" });
		return res.json({ success: true, message: "Hosting plan updated", data: plan });
	} catch (err) {
		return res.status(500).json({ success: false, message: "Failed to update hosting plan", details: err.message });
	}
};

// Delete plan
const deleteHostingPlan = async (req, res) => {
	try {
		const { planId } = req.params;
		const deleted = await HostingPlan.findByIdAndDelete(planId);
		if (!deleted) return res.status(404).json({ success: false, message: "Hosting plan not found" });
		return res.json({ success: true, message: "Hosting plan deleted" });
	} catch (err) {
		return res.status(500).json({ success: false, message: "Failed to delete hosting plan", details: err.message });
	}
};

// Helper to fetch Openprovider Plesk SKUs/items (for mapping)
const listOpenproviderPleskItems = async (_req, res) => {
	try {
		const items = await OpenProviderController.listOpenProviderItems({ product: "plesk", limit: 200, offset: 0 });
		return res.json({ success: true, total: items.length, data: items });
	} catch (err) {
		return res.status(500).json({ success: false, message: "Failed to fetch Openprovider items", details: err.message });
	}
};

module.exports = {
	listHostingPlans,
	createHostingPlan,
	getHostingPlanById,
	updateHostingPlan,
	deleteHostingPlan,
	listOpenproviderPleskItems
};


