const { body, param } = require("express-validator");

const renweSubscriptionRules = [
    body("userId")
        .optional()
        .isMongoId().withMessage("Invalid User ID format."),

    body("subscriptionId")
        .exists().withMessage("subscriptionId is required.")
        .isMongoId().withMessage("Invalid subscription ID format.")

];

const cancelSubscriptionRules = [
    param('subscription_id')
        .exists().withMessage('Subscription ID is required.')
        .isMongoId().withMessage('Invalid Subscription ID format.'),
];

module.exports = {
    renweSubscriptionRules,
    cancelSubscriptionRules
};
