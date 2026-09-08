const Payment = require("../models/Payment");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const { createInvoiceFromPayment } = require("./invoiceHelper");
const transporter = require("../services/mailer");
const nunjucks = require("nunjucks");
const moment = require("moment");
const env = require("../../start/env");
const { shouldSendEmail } = require("./notificationHelper");

const createPaymentRecord = async (paymentData) => {
	try {
		const {
			userId,
			service,
			title,
			amount,
			currency = "USD",
			paymentMethod,
			status = "completed",
			transactionId,
			metadata = {},
			paymentId: providedPaymentId,
			invoiceId: providedInvoiceId,
		} = paymentData;

		// Validate required fields
		if (!userId || !service || !title || amount === undefined || !paymentMethod) {
			throw new Error("Missing required payment fields");
		}

		// Generate paymentId and invoiceId when not provided (avoids validation failure when pre-save hooks run after validation)
		let paymentId = providedPaymentId;
		if (!paymentId) {
			const timestamp = Date.now();
			const random = Math.random().toString(36).substring(2, 8).toUpperCase();
			paymentId = `N_${timestamp}${random}`;
		}
		let invoiceId = providedInvoiceId;
		if (!invoiceId) {
			try {
				const lastPayment = await Payment.findOne({ invoiceId: /^HCY-\d+$/ })
					.sort({ invoiceId: -1 })
					.select("invoiceId")
					.lean();
				let nextNumber = 13714580;
				if (lastPayment && lastPayment.invoiceId) {
					const match = lastPayment.invoiceId.match(/(\d+)$/);
					if (match) nextNumber = parseInt(match[1], 10) + 1;
				}
				invoiceId = `HCY-${String(nextNumber).padStart(8, "0")}`;
			} catch (err) {
				invoiceId = `HCY-${String(Date.now()).slice(-8)}`;
			}
		}

		// Determine service type if not explicitly set
		let serviceType = service;
		if (typeof service === "string") {
			serviceType = service;
		} else if (service.toLowerCase().includes("domain")) {
			if (service.toLowerCase().includes("transfer")) {
				serviceType = "Domain Transfer";
			} else if (service.toLowerCase().includes("renew")) {
				serviceType = "Domain Renewal";
			} else {
				serviceType = "Domain Registration";
			}
		} else if (service.toLowerCase().includes("hosting")) {
			serviceType = "Premium Web Hosting";
		} else if (service.toLowerCase().includes("vps")) {
			serviceType = "VPS Hosting";
		} else if (service.toLowerCase().includes("rdp")) {
			serviceType = "RDP Hosting";
		}

		const payment = new Payment({
			userId,
			paymentId,
			invoiceId,
			service: serviceType,
			title,
			amount: Math.abs(amount), // Ensure positive amount
			currency,
			paymentMethod,
			status,
			transactionId,
			metadata,
			paidAt: new Date(),
		});

		await payment.save();
		console.log(`✅ Payment record created: ${payment.paymentId} for ${title}`);


		if (status === "completed") {
			try {
				await createInvoiceFromPayment(payment);
			} catch (invoiceError) {
				console.error("Failed to create invoice record (payment saved):", invoiceError);
			}
		}

		// Send payment successful email if payment is completed
		if (status === "completed") {
			try {
				const user = await User.findById(userId);
				if (user && user.email) {
				
					const canSendEmail = await shouldSendEmail(user, 'subscriptionsAndPayments');
					if (!canSendEmail) {
						console.log(`Email notification disabled for user ${user.email} - skipping payment success email`);
						return payment;
					}

					const paymentDate = moment(payment.paidAt || new Date()).format("MMMM Do YYYY, h:mm A");
					
					let html = nunjucks.render('mails/payment_successful.html', {
						NAME: user.name || user.email,
						CURRENCY: currency,
						AMOUNT: Math.abs(amount).toFixed(2),
						INVOICE_NUMBER: payment.invoiceId || payment.paymentId,
						DATE: paymentDate,
						viewReceiptLink: env.FRONTEND_URL + `/payment/${payment.paymentId}`,
						logoUrl: env.FRONTEND_URL
					});
					
					await transporter.sendMail({
						from: process.env.MAIL_FROM_ADDRESS,
						to: user.email,
						subject: `Payment received - ${currency} ${Math.abs(amount).toFixed(2)}`,
						html: html,
					});
					
					console.log(`Payment successful email sent to ${user.email} for payment ${payment.paymentId}`);
				}
			} catch (emailError) {
				console.error("Error sending payment successful email:", emailError);
			}
		}
		
		return payment;
	} catch (error) {
		console.error("❌ Error creating payment record:", error);
		throw error;
	}
};

const processAutomaticRefund = async (refundData) => {
	try {
		const {
			userId,
			originalPaymentId,
			originalPayment,
			amount,
			currency = "USD",
			reason,
			service,
			title,
			metadata = {},
		} = refundData;

		// Validate required fields
		if (!userId || !amount || amount <= 0) {
			throw new Error("Missing required refund fields");
		}

		// Get or create wallet
		let wallet = await Wallet.findOne({ userId });
		if (!wallet) {
			wallet = new Wallet({ userId, balance: new Map() });
			await wallet.save();
		}

		// Ensure currency exists in wallet
		if (!wallet.balance.has(currency)) {
			wallet.balance.set(currency, 0);
		}

		// Refund to wallet
		const currentBalance = wallet.balance.get(currency) || 0;
		wallet.balance.set(currency, currentBalance + amount);
		wallet.lastTransactionAt = new Date();
		await wallet.save();

		// Create refund transaction record
		const refundReference = `refund_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
		const refundTransaction = new Transaction({
			userId,
			walletId: wallet._id,
			amount,
			currency,
			type: "credit",
			method: "wallet_balance",
			reference: refundReference,
			status: "completed",
			from: "nameword",
			notes: `Automatic refund: ${reason || "Operation failed"}`,
		});
		await refundTransaction.save();

		// Create refund payment record
		const refundPayment = new Payment({
			userId,
			service: service || originalPayment?.service || "Other",
			title: title || originalPayment?.title || "Refund",
			amount: Math.abs(amount),
			currency,
			paymentMethod: "wallet_balance",
			status: "refunded",
			transactionId: refundTransaction._id,
			metadata: {
				...metadata,
				originalPaymentId: originalPaymentId || originalPayment?.paymentId,
				originalInvoiceId: originalPayment?.invoiceId,
				refundReason: reason || "Operation failed - automatic refund",
				refundedAt: new Date(),
				refundType: "automatic",
			},
			paidAt: new Date(),
		});

		await refundPayment.save();

		// Update original payment status to refunded if originalPaymentId is provided
		if (originalPaymentId) {
			await Payment.updateOne(
				{ paymentId: originalPaymentId },
				{
					$set: {
						status: "refunded",
						"metadata.refundedAt": new Date(),
						"metadata.refundReason": reason || "Operation failed - automatic refund",
					},
				}
			);
		} else if (originalPayment?._id) {
			await Payment.updateOne(
				{ _id: originalPayment._id },
				{
					$set: {
						status: "refunded",
						"metadata.refundedAt": new Date(),
						"metadata.refundReason": reason || "Operation failed - automatic refund",
					},
				}
			);
		}

		console.log(`✅ Automatic refund processed: ${refundPayment.paymentId} - $${amount} ${currency} refunded to wallet`);
		return {
			success: true,
			refundPayment,
			refundTransaction,
			newBalance: wallet.balance.get(currency),
		};
	} catch (error) {
		console.error("❌ Error processing automatic refund:", error);
		throw error;
	}
};

const creditOverpaymentToWallet = async ({ userId, amountUsd, paymentRef, transactionReference, sourceLabel = "dynopay" }) => {
	const amount = Number(amountUsd);
	if (!userId || !(amount > 0)) return null;

	const stableId = transactionReference || paymentRef;
	const currency = "USD";

	try {
		if (stableId) {
			const escaped = String(stableId).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			const existing = await Transaction.findOne({
				userId,
				type: "credit",
				from: "dynocash",
				reference: { $regex: `dynopay_overpayment_.*${escaped}` },
			}).lean();
			if (existing) {
				console.log(`[Payment] ${sourceLabel} | overpayment already credited for ref:`, stableId);
				return { credited: false, alreadyProcessed: true };
			}
		}

		let wallet = await Wallet.findOne({ userId });
		if (!wallet) {
			wallet = new Wallet({ userId, balance: new Map() });
			await wallet.save();
		}

		const ref = `dynopay_overpayment_${stableId || "unknown"}_${Date.now()}`;
		const transaction = new Transaction({
			userId,
			walletId: wallet._id,
			amount,
			currency,
			type: "credit",
			method: "dynopay",
			reference: ref,
			status: "completed",
			from: "dynocash",
		});
		await transaction.save();

		const currentBalance = wallet.balance.get(currency) || 0;
		wallet.balance.set(currency, currentBalance + amount);
		wallet.lastTransactionAt = new Date();
		await wallet.save();

		console.log(`[Payment] ${sourceLabel} | overpayment credited to wallet: $${amount.toFixed(2)} USD | newBalance:`, wallet.balance.get(currency));
		return { credited: true, amount };
	} catch (err) {
		console.error(`[Payment] ${sourceLabel} | failed to credit overpayment to wallet:`, err?.message ?? err);
		return null;
	}
};

module.exports = {
	createPaymentRecord,
	processAutomaticRefund,
	creditOverpaymentToWallet,
};

