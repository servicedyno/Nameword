const Invoice = require("../../models/Invoice");

// Get a single invoice
const getInvoice = async (req, res) => {
	try {
		const { id } = req.params;
		const userId = req.user.id;

		const invoice = await Invoice.findOne({ _id: id, userId }).populate(
			"userId",
			"name email"
		);

		if (!invoice) {
			return res
				.status(404)
				.json({ success: false, message: "Invoice not found" });
		}

		res.json({ success: true, data: invoice });
	} catch (error) {
		res.status(500).json({
			success: false,
			message: "Error fetching invoice",
			error: error.message,
		});
	}
};

// Get all invoices for a user
const getInvoices = async (req, res) => {
	try {
		const userId = req.user.id;
		const invoices = await Invoice.find({ userId }).sort({
			issuedAt: -1,
		});

		if (!invoices.length) {
			return res
				.status(404)
				.json({ success: false, message: "No invoices found" });
		}

		res.json({ success: true, data: invoices });
	} catch (error) {
		res.status(500).json({
			success: false,
			message: "Error fetching invoices",
			error: error.message,
		});
	}
};

module.exports = { getInvoice, getInvoices };
