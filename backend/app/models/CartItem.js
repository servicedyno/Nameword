const mongoose = require("mongoose");

const priceSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    originalAmount: { type: Number },
    discountPercent: { type: Number },
    displayText: { type: String },
  },
  { _id: false }
);

const renewSchema = new mongoose.Schema(
  {
    amount: { type: Number },
    currency: { type: String, default: "USD" },
    years: { type: Number, default: 1 },
    renewsAt: { type: Date },
    displayText: { type: String },
  },
  { _id: false }
);

const domainItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    action: {
      type: String,
      enum: ["register", "transfer", "renew", "create"],
      required: true,
    },
    years: { type: Number, default: 1 },
    whoisProtection: { type: Boolean, default: false },
    nameservers: [{ type: String }],
    provider: {
      type: String,
      enum: ["connectreseller", "openprovider"],
      required: false
    },
    productId: { type: String },
    renew: { type: renewSchema },
    availability: { type: Boolean, default: false }
  },
  { _id: false }
);

const bundleDomainSchema = new mongoose.Schema(
  {
    name: { type: String },
    renew: { type: renewSchema },
  },
  { _id: false }
);

const bundleSchema = new mongoose.Schema(
  {
    name: { type: String },
    termYears: { type: Number, default: 1 },
    items: { type: [bundleDomainSchema], default: [] },
  },
  { _id: false }
);

const hostingItemSchema = new mongoose.Schema(
  {
    provider: { type: String },
    planId: { type: mongoose.Schema.Types.Mixed },
    planName: { type: String },
    planCode: { type: String },
    planType: { type: String },
    billingCycle: { type: String },
    tenureLabel: { type: String },
    tenureMonths: { type: Number },
    tenureDays: { type: Number },
    features: { type: [String], default: [] },
    planSnapshot: { type: mongoose.Schema.Types.Mixed },
    domainOption: { type: String, enum: ["new", "existing", "external"] },
    domainName: { type: String },
    domainPrice: { type: Number },
  },
  { _id: false }
);

const cartItemSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true, index: true },
    itemType: { type: String, enum: ["domain", "bundle", "hosting"], required: true },
    domain: { type: domainItemSchema },
    bundle: { type: bundleSchema },
    hosting: { type: hostingItemSchema },
    price: { type: priceSchema, required: true },
    status: {
      type: String,
      enum: ["in_cart", "purchased", "removed"],
      default: "in_cart",
      index: true,
    },
    metadata: { type: mongoose.Schema.Types.Mixed },
    isRead: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Unique index for domains
cartItemSchema.index(
  { userId: 1, itemType: 1, "domain.name": 1, "domain.action": 1, status: 1 },
  {
    name: "uniq_domain_in_cart",
    unique: true,
    partialFilterExpression: {
      status: "in_cart",
      itemType: "domain",
      "domain.name": { $exists: true },
    },
  }
);

// Unique index for bundles – only applies to bundle items
cartItemSchema.index(
  { userId: 1, itemType: 1, "bundle.name": 1, "bundle.termYears": 1, status: 1 },
  {
    name: "uniq_bundle_in_cart",
    unique: true,
    partialFilterExpression: {
      status: "in_cart",
      itemType: "bundle",
      "bundle.name": { $type: "string" }, 
    },
  }
);

// Fast lookup index
cartItemSchema.index({ userId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("cart_item", cartItemSchema);


