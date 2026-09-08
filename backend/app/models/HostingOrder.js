const mongoose = require("mongoose");

const hostingOrderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    cartItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CartItem",
      required: false,
    },
    provider: {
      type: String,
      enum: ["hostbay", "connectreseller"],
      required: true,
    },
    plan: {
      type: String,
      required: true, // e.g., "pro_7day", "pro_30day"
    },
    planName: {
      type: String,
      required: false,
    },
    domainName: {
      type: String,
      required: false,
    },
    period: {
      type: Number,
      required: true,
      default: 1,
    },
    autoRenew: {
      type: Boolean,
      default: true,
    },
    // HostBay order response data
    hostbayOrderId: {
      type: String,
      required: false,
    },
    hostbayResponse: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    // Payment information
    transactionId: {
      type: String,
      required: false,
      index: true,
    },
    paymentReference: {
      type: String,
      required: false,
      index: true,
    },
    paymentType: {
      type: String,
      enum: ["CREDIT_CARD", "BANK_TRANSFER", "CRYPTO", "WALLET"],
      required: false,
    },
    amount: {
      type: Number,
      required: false,
    },
    currency: {
      type: String,
      default: "USD",
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed", "cancelled"],
      default: "pending",
      index: true,
    },
    errorMessage: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
hostingOrderSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model("HostingOrder", hostingOrderSchema);

