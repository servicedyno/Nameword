const mongoose = require("mongoose");

const RDPBillingCycleDiscountSchema = new mongoose.Schema({
  type: { type: String, required: true, unique: true }, // Hourly, Monthly, Quarterly, Annually
  discount: { type: Number, required: true }, // Percentage discount
  enabled: { type: Boolean, default: true }
});

const RDPBillingCycleDiscount = mongoose.model("RDPBillingCycleDiscount", RDPBillingCycleDiscountSchema);
module.exports = RDPBillingCycleDiscount;
