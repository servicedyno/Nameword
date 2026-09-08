const Payment = require("../../models/Payment");
const PaymentInvoice = require("../../models/PaymentInvoice");
const User = require("../../models/User");
const mongoose = require("mongoose");
const { generateInvoicePDF } = require("../../utils/invoicePdfGenerator");
const { createInvoiceFromPayment } = require("../../utils/invoiceHelper");

// Get payment history with pagination
const getPaymentHistory = async (req, res) => {
	try {
		const userId = req.user.id;
		const page = parseInt(req.query.page) || 1;
		const perPage = parseInt(req.query.per_page) || 50;
		const skip = (page - 1) * perPage;

	
		const payments = await Payment.find({ userId })
			.sort({ paidAt: -1, createdAt: -1 })
			.skip(skip)
			.limit(perPage)
			.lean();

		const total = await Payment.countDocuments({ userId });

		const transactions = payments.map((payment) => ({
			id: payment.paymentId.replace("N_", ""),
			paymentId: payment.paymentId,
			invoiceId: payment.invoiceId,
			service: payment.service,
			title: payment.title,
			amount: -Math.abs(payment.amount), 
			currency: payment.currency,
			status: payment.status,
			created_at: payment.paidAt || payment.createdAt,
			paid_at: payment.paidAt || payment.createdAt,
			type: "debit",
			metadata: payment.metadata || {},
		}));

		return res.json({
			success: true,
			data: {
				transactions,
				pagination: {
					page,
					per_page: perPage,
					total,
					total_pages: Math.ceil(total / perPage),
				},
			},
		});
	} catch (error) {
		console.error("Error fetching payment history:", error);
		return res.status(500).json({
			success: false,
			message: "Failed to fetch payment history",
			error: error.message,
		});
	}
};

// Get single payment by ID
const getPaymentById = async (req, res) => {
	try {
		const userId = req.user.id;
		const { id } = req.params;

		const payment = await Payment.findOne({
			userId,
			$or: [
				{ paymentId: id.startsWith("N_") ? id : `N_${id}` },
				{ invoiceId: id },
			],
		}).lean();

		if (!payment) {
			return res.status(404).json({
				success: false,
				message: "Payment not found",
			});
		}

		return res.json({
			success: true,
			data: {
				id: payment.paymentId.replace("N_", ""),
				paymentId: payment.paymentId,
				invoiceId: payment.invoiceId,
				service: payment.service,
				title: payment.title,
				amount: -Math.abs(payment.amount),
				currency: payment.currency,
				status: payment.status,
				created_at: payment.paidAt || payment.createdAt,
				paid_at: payment.paidAt || payment.createdAt,
				type: "debit",
				metadata: payment.metadata || {},
			},
		});
	} catch (error) {
		console.error("Error fetching payment:", error);
		return res.status(500).json({
			success: false,
			message: "Failed to fetch payment",
			error: error.message,
		});
	}
};

const downloadInvoice = async (req, res) => {
	try {
		const userId = req.user.id;
		const { id } = req.params;

		const payment = await Payment.findOne({
			userId,
			$or: [
				{ paymentId: id.startsWith("N_") ? id : `N_${id}` },
				{ invoiceId: id },
			],
		}).lean();

		if (!payment) {
			return res.status(404).json({
				success: false,
				message: "Payment not found",
			});
		}

		// Use saved PaymentInvoice if available; create on-the-fly for old payments
		let paymentInvoice = await PaymentInvoice.findOne({
			paymentId: payment._id,
			userId,
		}).lean();

		if (!paymentInvoice && payment.status === "completed") {
			try {
				const paymentDoc = await Payment.findById(payment._id);
				if (paymentDoc) {
					const inv = await createInvoiceFromPayment(paymentDoc);
					paymentInvoice = inv ? (inv.toObject ? inv.toObject() : inv) : null;
				}
			} catch (e) {
				console.warn("Could not create invoice for legacy payment:", e.message);
			}
		}

		const pdfBuffer = await generateInvoicePDF(payment, userId, paymentInvoice);

		const filename = `invoice_${payment.invoiceId}_${payment.paymentId}.pdf`;

		res.setHeader("Content-Type", "application/pdf");
		res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
		res.setHeader("Content-Length", pdfBuffer.length);

		return res.send(pdfBuffer);
	} catch (error) {
		console.error("Error downloading invoice:", error);
		
		let statusCode = 500;
		let errorMessage = "Failed to generate invoice";
		
		if (error.message === "Payment not found") {
			statusCode = 404;
			errorMessage = "Payment not found";
		} else if (error.message === "User not found") {
			statusCode = 404;
			errorMessage = "User not found";
		} else if (error.message) {
			errorMessage = error.message;
		}
		
		return res.status(statusCode).json({
			success: false,
			message: errorMessage,
			error: error.message,
		});
	}
};

// Get refund history with pagination
const getRefundHistory = async (req, res) => {
	try {
		const userId = req.user.id;
		const page = parseInt(req.query.page) || 1;
		const perPage = parseInt(req.query.per_page) || 50;
		const skip = (page - 1) * perPage;

		// Get payments with status "refunded"
		const refunds = await Payment.find({ 
			userId,
			status: "refunded"
		})
			.sort({ paidAt: -1, createdAt: -1 })
			.skip(skip)
			.limit(perPage)
			.lean();

		const total = await Payment.countDocuments({ 
			userId,
			status: "refunded"
		});

		const transactions = refunds.map((refund) => ({
			id: refund.paymentId.replace("N_", ""),
			paymentId: refund.paymentId,
			invoiceId: refund.invoiceId,
			service: refund.service,
			title: refund.title,
			amount: Math.abs(refund.amount),
			currency: refund.currency,
			status: refund.status,
			created_at: refund.metadata?.refundedAt || refund.updatedAt || refund.createdAt,
			refunded_at: refund.metadata?.refundedAt || refund.updatedAt || refund.createdAt,
			type: "credit",
			metadata: refund.metadata || {},
		}));

		return res.json({
			success: true,
			data: {
				transactions,
				pagination: {
					page,
					per_page: perPage,
					total,
					total_pages: Math.ceil(total / perPage),
				},
			},
		});
	} catch (error) {
		console.error("Error fetching refund history:", error);
		return res.status(500).json({
			success: false,
			message: "Failed to fetch refund history",
			error: error.message,
		});
	}
};

module.exports = {
	getPaymentHistory,
	getPaymentById,
	downloadInvoice,
	getRefundHistory,
};

