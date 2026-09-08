const mongoose = require("mongoose");

const SubscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  vmId: { type: mongoose.Schema.Types.ObjectId, ref: "VPS", required: true },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: "VpsPlan", required: true },
  billingCycleId: { type: mongoose.Schema.Types.ObjectId, ref: "VPSBillingCycleDiscount", required: true },
  cPanelPlanId: { type: mongoose.Schema.Types.ObjectId, ref: "cPanelPlan", required: false },
  osId: { type: mongoose.Schema.Types.ObjectId, ref: "OperatingSystem", required: true },
  diskTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'VPSDisk', required: true },
  status: { 
    type: String, 
    enum: ["active", "expired", "deleted", "pending_renewal", "grace_period", "suspended", "terminated"], 
    default: "active" 
  },

  price: { type: Number, required: true },
  autoRenewable: { type: Boolean, default: false },

  // cPanel License Details
  cPanel: {
    status: { type: String, enum: ["active", "expired", "deleted"], default: "active" },
    expiryDate: { type: Date, required: false },
    licenseCanceled: { type: Boolean, default: false },

    // First & Final Reminder for Renewal
    renewal: {
      firstReminderSent: { type: Boolean, default: false },
      firstReminderSentAt: { type: Date, default: null },
      finalReminderSent: { type: Boolean, default: false },
      finalReminderSentAt: { type: Date, default: null },
      gracePeriodWarningSent: { type: Boolean, default: false },
      gracePeriodWarningSentAt: { type: Date, default: null },
      pendingDeletionWarningSent: { type: Boolean, default: false },
      pendingDeletionWarningSentAt: { type: Date, default: null }
    },
  },
  vpsPlanReminders: {
    // First & Final Reminder for Renewal
    renewal: {
      firstReminderSent: { type: Boolean, default: false },
      firstReminderSentAt: { type: Date, default: null },
      finalReminderSent: { type: Boolean, default: false },
      finalReminderSentAt: { type: Date, default: null },
      gracePeriodWarningSent: { type: Boolean, default: false },
      gracePeriodWarningSentAt: { type: Date, default: null },
      pendingDeletionWarningSent: { type: Boolean, default: false },
      pendingDeletionWarningSentAt: { type: Date, default: null }
    },

  },
  subscriptionEnd: { type: Date, required: true },
  cycleStart: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

SubscriptionSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const Subscription = mongoose.model("Subscription", SubscriptionSchema);
module.exports = Subscription;
