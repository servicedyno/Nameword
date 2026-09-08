const mongoose = require("mongoose");

const hostingPlanSchema = new mongoose.Schema(
	{
		name: { type: String, required: true, trim: true },
		description: { type: String },
		priceMonthly: { type: Number, required: true },
		originalPriceMonthly: { type: Number },
		discountPercent: { type: Number },
		currency: { type: String, default: "USD" },
		websites: { type: Number, default: 1 },
		storageGb: { type: Number, default: 10 },
		emailAccounts: { type: Number, default: 5 },
		controlPanel: { type: String, default: "cPanel/Plesk" },
		features: { type: [String], default: [] },
		provider: { type: String, enum: ["openprovider", "none"], default: "openprovider" },
		providerProduct: { type: String, enum: ["plesk", "ssl", "domain", "hosting", null], default: "plesk" },
		providerSku: { type: String },
		isActive: { type: Boolean, default: true },
		sortOrder: { type: Number, default: 0 }
	},
	{ timestamps: true }
);

hostingPlanSchema.index({ name: 1 }, { unique: true });

const HostingPlan = mongoose.model("HostingPlan", hostingPlanSchema);
module.exports = HostingPlan;


