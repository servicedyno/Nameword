const mongoose = require("mongoose");

const cPanelPlanSchema = new mongoose.Schema({
  type: { 
    type: String, 
    required: true, 
    enum: ["WHM", "Plesk"] 
  },
  id: { type: String }, 
  name: { type: String, required: true }, 
  tier: { type: String}, 
  maxAccounts: { type: Number, default: 0 }, // Number of accounts allowed (WHM)
  maxDomains: { type: String, default: "0" }, // Maximum domains allowed (Plesk )
  price: { type: Number, required: true }, // Plan price
  billingDuration: { type: String, required: true, enum: ["monthly", "days"] }, // Duration type (e.g., monthly, days)
  durationValue: { type: Number, required: true }, // Number of months/days the plan lasts
  enabled: { type: Boolean, default: true } // Whether the plan is active
});

const CPanelPlan = mongoose.model("cPanelPlan", cPanelPlanSchema);
module.exports = CPanelPlan;
