const mongoose = require("mongoose");

const CounterSchema = new mongoose.Schema({
	_id: { type: String, required: true },
	sequence_value: { type: Number, default: 999 },
});

CounterSchema.statics.getNextInvoiceNumber = async function () {
	const counter = await this.findByIdAndUpdate(
		{ _id: "invoiceNumber" },
		{ $inc: { sequence_value: 1 } },
		{ new: true, upsert: true }
	);
	return counter.sequence_value;
};

module.exports = mongoose.model("Counter", CounterSchema);
