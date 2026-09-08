const mongoose = require("mongoose");

const VPSBillingCycleDiscountSchema = new mongoose.Schema({
  type: { type: String, required: true, unique: true }, // Hourly, Monthly, Quarterly, Annually
  discount: { type: Number, required: true }, // Percentage discount
  enabled: { type: Boolean, default: true }
});

const VPSBillingCycleDiscount = mongoose.model("VPSBillingCycleDiscount", VPSBillingCycleDiscountSchema);
module.exports = VPSBillingCycleDiscount;
