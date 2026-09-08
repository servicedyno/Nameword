const { body, param } = require("express-validator");

const renweSubscriptionRules = [
  body("subscription_id")
    .exists().withMessage("Subscription ID is required.")
    .isMongoId().withMessage("Invalid Subscription ID format.")
];

const updateSubscriptionRules = [
  param("subscription_id")
    .exists().withMessage("Subscription ID is required in URL.")
    .isMongoId().withMessage("Invalid Subscription ID format."),
  body("autoRenewable")
    .optional()
    .isBoolean().withMessage("autoRenewable must be a boolean.")
];

module.exports = {
  renweSubscriptionRules,
  updateSubscriptionRules
};
