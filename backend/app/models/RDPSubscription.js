const mongoose = require("mongoose");

const RDPSubscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  rdpId: { type: mongoose.Schema.Types.ObjectId, ref: "RDPInstance", required: true },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: "RDPPlan", required: true },
  billingCycleId: { type: mongoose.Schema.Types.ObjectId, ref: "RDPBillingCycleDiscount", required: true },

  price: { type: Number, required: true },
  autoRenewable: { type: Boolean, default: false },

  status: {
    type: String,
    enum: ["active", "expired", "deleted", "pending_renewal", "grace_period", "suspended", "terminated"],
    default: "active"
  },

  renewal: {
    firstReminderSent: { type: Boolean, default: false },
    firstReminderSentAt: { type: Date, default: null },
    finalReminderSent: { type: Boolean, default: false },
    finalReminderSentAt: { type: Date, default: null }
  },

  subscriptionEnd: { type: Date, required: true },
  cycleStart: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update timestamp
RDPSubscriptionSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const RDPSubscription = mongoose.model("RDPSubscription", RDPSubscriptionSchema);
module.exports = RDPSubscription;
