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
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true, index: true },
    orderNumber: { type: String, unique: true },
    clientOrderId: { type: String },
    mode: { type: String, enum: ["live", "dry_run", "unknown"], default: "unknown" },
    status: { type: String, enum: ["paid", "partial", "failed"], default: "paid" },
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
