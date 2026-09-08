const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
	description: { type: String, required: true },
	domain: { type: String },
	quantity: { type: Number, required: true },
	period: { type: String },
	price: { type: Number, required: true },
	total: { type: Number, required: true },
});

const InvoiceSchema = new mongoose.Schema({
	invoiceNumber: {
		type: String,
		required: true,
		unique: true,
	},
	userId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "user",
		required: true,
	},
	transactionId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Transaction",
		required: true,
	},
	from: {
		name: { type: String, default: "example.com" },
		email: { type: String, default: "example@gmail.com" },
	},
	to: {
		name: { type: String, required: true },
		email: { type: String, required: true },
	},
	items: [itemSchema],
	subtotal: {
		type: Number,
		required: true,
	},
	vat: {
		percentage: { type: Number, default: 20 },
		amount: { type: Number, default: 0 },
	},
	total: {
		type: Number,
		required: true,
	},
	status: {
		type: String,
		enum: ["paid", "unpaid", "cancelled"],
		default: "paid",
	},
	issuedAt: {
		type: Date,
		default: Date.now,
	},
	paidAt: {
		type: Date,
	},
});

module.exports = mongoose.model("Invoice", InvoiceSchema);
