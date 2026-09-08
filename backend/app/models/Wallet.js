const mongoose = require("mongoose");

const WalletSchema = new mongoose.Schema({
	userId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "user",
		required: true,
		unique: true,
	},

	balance: {
		type: Map,
		of: Number,
		default: () =>
			new Map([
				["NGN", 0],
				["USD", 0],
				["BTC", 0],
			]),
	},

	lastTransactionAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Wallet", WalletSchema);
