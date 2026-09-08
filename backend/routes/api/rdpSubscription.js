const express = require("express");
const router = express.Router();
const { getUserDataMiddleware } = require("../../app/middlewares/user");
const validateRequest = require("../../app/middlewares/validate-request");
const { getSubscription, updateSubscription, renewSubscription, renewUsingWalletSubscription } = require("../../app/controllers/rdp/rdpSubscriptionController");
const { renweSubscriptionRules, updateSubscriptionRules } = require("../../app/validations/rdpSubscriptionRules");

// 🔍 Get all RDP subscriptions for user
router.get("/all", getUserDataMiddleware, getSubscription);

// ✏️ Update specific RDP subscription
router.put("/update/:subscription_id", updateSubscriptionRules, validateRequest, getUserDataMiddleware, updateSubscription);

// 💰 Renew RDP subscription manually (wallet-independent)
router.post("/renew", renweSubscriptionRules, validateRequest, getUserDataMiddleware, renewSubscription);

// 💳 Renew RDP subscription using wallet balance
router.post("/renew-using-wallet", renweSubscriptionRules, validateRequest, getUserDataMiddleware, renewUsingWalletSubscription);

module.exports = router;
