const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
	{
		street: { type: String },
		city: { type: String },
		postalCode: { type: String },
		country: { type: String },
	},
	{ _id: false }
);

const invoiceItemSchema = new mongoose.Schema(
	{
		description: { type: String, required: true },
		domain: { type: String },
		unitPrice: { type: Number, required: true },
		quantity: { type: Number, required: true, default: 1 },
		period: { type: String },
		vatRate: { type: Number, default: 0 },
		vatAmount: { type: Number, default: 0 },
		total: { type: Number, required: true },
	},
	{ _id: false }
);

const PaymentInvoiceSchema = new mongoose.Schema(
	{
		invoiceNumber: { type: String, required: true, unique: true, index: true },
		paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", required: true, index: true },
		userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true, index: true },

		// Seller info (Dynotech Innovations, LDA)
		seller: {
			name: { type: String, required: true, default: "Dynotech Innovations, LDA" },
			address: {
				type: addressSchema,
				default: () => ({
					street: "Rua Luís de Camões 1017, 7° Dt°",
					city: "Montijo",
					postalCode: "2870-154",
					country: "Portugal",
				}),
			},
			nif: { type: String, required: true, default: "PT518713130" },
		},

		// Buyer info
		buyer: {
			name: { type: String, required: true },
			email: { type: String, required: true },
			address: addressSchema,
			nif: { type: String },
		},

		items: [invoiceItemSchema],
		subtotal: { type: Number, required: true },
		vat: {
			percentage: { type: Number, default: 0 },
			amount: { type: Number, default: 0 },
		},
		serviceFee: { type: Number, default: 0 },
		total: { type: Number, required: true },
		currency: { type: String, default: "USD" },

		paymentTerms: { type: String, default: "Due on receipt" },
		issuedAt: { type: Date, default: Date.now },
		paidAt: { type: Date },
		status: {
			type: String,
			enum: ["paid", "unpaid", "cancelled"],
			default: "paid",
		},
	},
	{ timestamps: true }
);

PaymentInvoiceSchema.index({ paymentId: 1 });
PaymentInvoiceSchema.index({ userId: 1, issuedAt: -1 });

module.exports = mongoose.model("PaymentInvoice", PaymentInvoiceSchema);
