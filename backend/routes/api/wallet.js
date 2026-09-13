const express = require("express");
const {
        createWallet,
        getWallet,
        fundWallet,
        processPayment,
        getDynocheckoutUrl,
        handleDynoPaymentWebhook,
        getHostbayWalletTransactions,
        createCryptoTopup,
        getCryptoTopupStatus,
        listPendingCryptoTopups,
        listCryptoTopups,
        cancelCryptoTopup,
        listRewardPointLogs,
        getReferralInfo,
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
        cryptoTopupRules,
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
router.post("/crypto-topup", cryptoTopupRules, validateRequest, createCryptoTopup);
router.get("/crypto-topups/pending", listPendingCryptoTopups);
router.get("/crypto-topups", listCryptoTopups);
router.get("/crypto-topup/:paymentId/status", getCryptoTopupStatus);
router.post("/crypto-topup/:paymentId/cancel", cancelCryptoTopup);
router.get("/reward-points", listRewardPointLogs);
router.get("/referral", getReferralInfo);
// Payment history - new implementation
router.get("/transactions", getPaymentHistory);
router.get("/transactions/:id", getPaymentById);
router.get("/transactions/:id/invoice", downloadInvoice);
// Refund history
router.get("/refunds", getRefundHistory);

module.exports = router;
