const mongoose = require("mongoose");

const taxSchema = new mongoose.Schema(
  {
    countryCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
    countryName: {
      type: String,
      required: false,
    },
    taxRate: {
      type: Number,
      required: true,
      min: 0,
      max: 1, // Stored as decimal (0.20 = 20%)
    },
    taxType: {
      type: String,
      enum: ["VAT", "GST", "TIN", "NRT", "TRN", "ABN", "CUIT", "CNPJ", "CPF", "BN", "RUT", "NIT", "BRN", "RFC", "UEN", "EIN", "RIF", "INN", "PIN", "STRN", "IFU", "BIN", "BR", "CN", "NIF", "NPWP", "RCN", "RUC", "default"],
      default: "default",
    },
    rawApiResponse: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

// Index for fast lookups
taxSchema.index({ countryCode: 1 });

module.exports = mongoose.model("tax", taxSchema);

