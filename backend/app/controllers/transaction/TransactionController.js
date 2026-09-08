const Transaction = require("../../models/Transaction");

// Get all transactions for a user
const getTransactions = async (req, res) => {
	try {
		const userId = req.user.id;
		const transactions = await Transaction.find({ userId })
			.populate("userId", "name email")
			.sort({
				createdAt: -1,
			});

		if (!transactions.length) {
			return res
				.status(404)
				.json({ success: false, message: "No transactions found" });
		}

		res.json({ success: true, data: transactions });
	} catch (error) {
		res.status(500).json({
			success: false,
			message: "Error fetching transactions",
			error: error.message,
		});
	}
};

module.exports = { getTransactions };
