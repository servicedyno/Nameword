const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "user",
			required: true,
			index: true,
		},
		paymentId: {
			type: String,
			required: true,
			unique: true,
			index: true,
		},
		invoiceId: {
			type: String,
			required: true,
			unique: true,
			index: true,
		},
		transactionId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Transaction",
		},
		service: {
			type: String,
			required: true,
			enum: [
				"Domain Registration",
				"Domain Transfer",
				"Domain Renewal",
				"Premium Web Hosting",
				"VPS Hosting",
				"RDP Hosting",
				"Other",
			],
		},
		title: {
			type: String,
			required: true, // Domain name or service title
		},
		amount: {
			type: Number,
			required: true,
		},
		currency: {
			type: String,
			default: "USD",
		},
		paymentMethod: {
			type: String,
			required: true,
			enum: ["wallet_balance", "credit_card", "crypto", "bank_transfer", "other"],
		},
		status: {
			type: String,
			enum: ["pending", "completed", "failed", "refunded"],
			default: "completed",
		},
		metadata: {
			type: mongoose.Schema.Types.Mixed,
			default: {},
		},
		paidAt: {
			type: Date,
			default: Date.now,
		},
	},
	{
		timestamps: true,
	}
);

// Generate unique payment ID
PaymentSchema.pre("save", async function (next) {
	if (!this.paymentId) {
		const timestamp = Date.now();
		const random = Math.random().toString(36).substring(2, 8).toUpperCase();
		this.paymentId = `N_${timestamp}${random}`;
	}
	next();
});

// Generate invoice ID if not provided
PaymentSchema.pre("save", async function (next) {
	if (!this.invoiceId) {
		try {
			const lastPayment = await mongoose.model("Payment")
				.findOne({ invoiceId: /^HCY-\d+$/ })
				.sort({ invoiceId: -1 })
				.lean();
			
			let nextNumber = 13714580; // Default starting number
			if (lastPayment && lastPayment.invoiceId) {
				const match = lastPayment.invoiceId.match(/(\d+)$/);
				if (match) {
					nextNumber = parseInt(match[1], 10) + 1;
				}
			}
			
			this.invoiceId = `HCY-${String(nextNumber).padStart(8, "0")}`;
		} catch (error) {
			const timestamp = Date.now();
			this.invoiceId = `HCY-${String(timestamp).slice(-8)}`;
		}
	}
	next();
});

module.exports = mongoose.model("Payment", PaymentSchema);

