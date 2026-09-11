const express = require("express");
const {
	createWallet,
	getWallet,
	fundWallet,
	processPayment,
	getDynocheckoutUrl,
	handleDynoPaymentWebhook,
	getHostbayWalletTransactions,
} = require("../../app/controllers/wallet/WalletController");
const {
	getPaymentHistory,
	getPaymentById,
	downloadInvoice,
	getRefundHistory,
} = require("../../app/controllers/payment/PaymentHistoryController");
const { getUserDataMiddleware } = require("../../app/middlewares/user");
const validateRequest = require("../../app/middlewares/validate-request");
const {
	createWalletRules,
	getWalletRules,
	fundWalletRules,
	processPaymentRules,
	dynoCheckoutURLRules,
} = require("../../app/validations/walletRules");
const sessionOrApiKey = require("../../app/middlewares/session-or-apikey");
const router = express.Router();

router.get("/dynocheckout-webhook", handleDynoPaymentWebhook);
router.post("/dynocheckout-webhook", handleDynoPaymentWebhook);
router.use(...sessionOrApiKey);
router.post("/create", createWalletRules, validateRequest, createWallet);
router.get("/get", getWalletRules, validateRequest, getWallet);

router.post("/fund", fundWalletRules, validateRequest, fundWallet);
router.post("/pay", processPaymentRules, validateRequest, processPayment);
router.post(
	"/dynocheckout-url",
	dynoCheckoutURLRules,
	validateRequest,
	getDynocheckoutUrl
);
// Payment history - new implementation
router.get("/transactions", getPaymentHistory);
router.get("/transactions/:id", getPaymentById);
router.get("/transactions/:id/invoice", downloadInvoice);
// Refund history
router.get("/refunds", getRefundHistory);

module.exports = router;
