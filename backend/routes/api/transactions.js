const express = require("express");
const {
	getTransactions,
} = require("../../app/controllers/transaction/TransactionController");
const { getUserDataMiddleware } = require("../../app/middlewares/user");
const validateRequest = require("../../app/middlewares/validate-request");
const {
	getTransactionsRules,
} = require("../../app/validations/transactionRules");
const validateAPIKey = require("../../app/middlewares/validate-apikey");
const requireAuth = require("../../app/middlewares/require-auth");
const router = express.Router();
router.use(validateAPIKey, requireAuth);

router.get("/get", getTransactionsRules, validateRequest, getTransactions);

module.exports = router;
