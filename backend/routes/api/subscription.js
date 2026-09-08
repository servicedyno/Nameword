const express = require("express");
const router = express.Router();
const { createSubscription, getSubscription, updateSubscription, renewUsingWalletSubscription, renewSubscription, cancelSubscription, renewcPanelUsingWalletSubscription, renewcPanelSubscription, cancelCPanelSubscription } = require("../../app/controllers/subscription/subscription");
const { getUserDataMiddleware } = require("../../app/middlewares/user");
const { renweSubscriptionRules, cancelSubscriptionRules } = require("../../app/validations/subscriptionRules");
const validateRequest = require("../../app/middlewares/validate-request");

// Create Subscription
router.post("/create", createSubscription);

// Get all subscriptions
router.get("/all", getUserDataMiddleware, getSubscription);

// Update Subscription
router.put("/update/:subscription_id", getUserDataMiddleware, updateSubscription);

// Renew Subscription Using Wallet
router.post("/renew-using-wallet", renweSubscriptionRules, validateRequest, getUserDataMiddleware, renewUsingWalletSubscription);

// Renew Subscription
router.post("/renew", renweSubscriptionRules, validateRequest, getUserDataMiddleware, renewSubscription);

// Renew CPanel Subscription Using Wallet
router.post("/cpanel/renew-using-wallet", renweSubscriptionRules, validateRequest, getUserDataMiddleware, renewcPanelUsingWalletSubscription);

// Renew Subscription
router.post("/cpanel/renew", renweSubscriptionRules, validateRequest, getUserDataMiddleware, renewcPanelSubscription);

// Cancel Subscription
router.post("/cancel/:subscription_id", cancelSubscriptionRules, validateRequest, getUserDataMiddleware, cancelSubscription);

// Cancel CPanel Subscription
router.post("/cpanel/cancel/:subscription_id", cancelSubscriptionRules, validateRequest, getUserDataMiddleware, cancelCPanelSubscription); 

module.exports = router;
