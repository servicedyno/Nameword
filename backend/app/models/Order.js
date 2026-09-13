const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["domain", "hosting", "vps", "rdp"], required: true },
    domain: { type: String },
    plan_id: { type: String },
    plan_name: { type: String },
    duration_days: { type: Number },
    ns_choice: { type: String, enum: ["cloudflare", "registrar", "custom"], default: "cloudflare" },
    nameservers: { type: [String], default: [] },
    registrar: { type: String },
    // Server (vps/rdp) fields
    region: { type: String },
    os: { type: String },
    hostname: { type: String },
    vcpus: { type: Number },
    ram_gb: { type: Number },
    disk_gb: { type: Number },
    price_usd: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "active", "test_mode", "failed"],
      default: "pending",
    },
    refunded_usd: { type: Number, default: 0 },
    message: { type: String },
    upstream: { type: mongoose.Schema.Types.Mixed },
    // --- Ownership / management identifiers captured at provisioning time (C1) ---
    // These let every "my X" view and management action be scoped to the buyer,
    // instead of trusting the provider's account-wide list.
    provider_id: { type: String },        // vps/rdp: upstream resource id (live mode)
    provider_username: { type: String },  // hosting: cPanel username (live mode)
    panel_url: { type: String },           // hosting: control panel URL (if provided)
    server_ip: { type: String },           // hosting/server: IP (if provided)
    // --- C3: async provisioning bookkeeping ---
    cash_charged_usd: { type: Number, default: 0 },   // cash currently committed to this item
    points_charged_usd: { type: Number, default: 0 }, // points (as USD value) committed to this item
    attempts: { type: Number, default: 0 },           // provisioning attempts (incl. retries)
    provisionedAt: { type: Date },                     // last provisioning attempt time
    live_status: { type: String },                     // cached live provider status (status poll)
    // --- C2: renewal / expiry lifecycle ---
    expires_at: { type: Date },                        // when this resource lapses
    term_days: { type: Number },                       // length of the current term
    auto_renew: { type: Boolean, default: false },     // opt-in; OFF by default
    renewed_at: { type: Date },                        // last successful renewal
  },
  { _id: false }
);

const orderCryptoSchema = new mongoose.Schema(
  {
    paymentId: { type: String },
    address: { type: String },
    destinationTag: { type: String, default: null },
    currency: { type: String },
    cryptoAmount: { type: Number, default: null },
    amountUsd: { type: Number, default: null },
    qrCode: { type: String, default: null },
    status: { type: String, default: "pending" },
    txHash: { type: String, default: null },
    // Live underpayment tracking (from DynoPay getPaymentStatus).
    amountReceived: { type: Number, default: null },   // received so far, in the coin
    amountRemaining: { type: Number, default: null },  // still owed, in the coin
    confirmations: { type: Number, default: null },
    requiredConfirmations: { type: Number, default: null },
    // USD already credited from prior payment(s) when the buyer switches coin mid-flow.
    creditedUsd: { type: Number, default: 0 },
    expireAt: { type: Date },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true, index: true },
    orderNumber: { type: String, unique: true },
    clientOrderId: { type: String },
    mode: { type: String, enum: ["live", "dry_run", "unknown"], default: "unknown" },
    status: { type: String, enum: ["paid", "partial", "failed", "awaiting_payment"], default: "paid" },
    items: { type: [orderItemSchema], default: [] },
    subtotal_usd: { type: Number, required: true },
    // Reward points applied as a discount (redemption).
    points_redeemed: { type: Number, default: 0 },
    points_discount_usd: { type: Number, default: 0 },
    // Reward points earned for this purchase, and any restored on failed-item refunds.
    points_earned: { type: Number, default: 0 },
    points_restored: { type: Number, default: 0 },
    charged_usd: { type: Number, required: true },
    refunded_usd: { type: Number, default: 0 },
    wallet_balance_after_usd: { type: Number },
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
    // --- C3: background provisioning lifecycle ---
    provisioning: {
      type: String,
      enum: ["pending", "processing", "complete", "awaiting_payment"],
      default: "pending",
      index: true,
    },
    provisioningLockedAt: { type: Date, default: null },
    // --- Direct crypto-order payment (bypasses the wallet) ---
    payment_method: { type: String, enum: ["wallet", "crypto"], default: "wallet" },
    payment_status: { type: String, enum: ["paid", "awaiting_payment", "expired", "failed"], default: "paid" },
    crypto: { type: orderCryptoSchema, default: null },
  },
  { timestamps: true }
);

// One order per client-generated id (double-click / retry protection).
orderSchema.index(
  { userId: 1, clientOrderId: 1 },
  { unique: true, partialFilterExpression: { clientOrderId: { $type: "string" } } }
);

orderSchema.pre("save", function (next) {
  if (!this.orderNumber) {
    this.orderNumber = `NW-${Date.now().toString(36).toUpperCase()}${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`;
  }
  next();
});

module.exports = mongoose.model("Order", orderSchema);
