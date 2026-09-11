const express = require("express");
const {
	getTransactions,
} = require("../../app/controllers/transaction/TransactionController");
const { getUserDataMiddleware } = require("../../app/middlewares/user");
const validateRequest = require("../../app/middlewares/validate-request");
const {
	getTransactionsRules,
} = require("../../app/validations/transactionRules");
const sessionOrApiKey = require("../../app/middlewares/session-or-apikey");
const router = express.Router();
router.use(...sessionOrApiKey);

router.get("/get", getTransactionsRules, validateRequest, getTransactions);

module.exports = router;
