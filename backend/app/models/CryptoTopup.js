const mongoose = require("mongoose");

// Tracks a native (raw-address) crypto wallet top-up created via DynoPay /user/cryptoPayment.
// Crediting is driven by polling GET /wallet/crypto-topup/:paymentId/status (webhook fallback).
const cryptoTopupSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    provider: { type: String, default: "dynopay" },
    paymentId: { type: String, required: true, unique: true }, // DynoPay transaction_id
    currency: { type: String, required: true }, // e.g. ETH, BTC, USDT-ERC20
    cryptoAmount: { type: Number, default: null }, // amount payable in crypto
    amountUsd: { type: Number, required: true }, // USD value credited on confirmation
    address: { type: String, required: true },
    qrCode: { type: String, default: null }, // provider-supplied QR (data URL) for resuming
    status: {
      type: String,
      enum: ["pending", "confirming", "credited", "expired", "failed"],
      default: "pending",
      index: true,
    },
    txHash: { type: String, default: null },
    creditTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction", default: null },
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CryptoTopup", cryptoTopupSchema);
