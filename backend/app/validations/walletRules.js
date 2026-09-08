const { body, param } = require("express-validator");

const createWalletRules = [
    body("userId")
        .optional()
        .isMongoId().withMessage("Invalid User ID format.")
];

const getWalletRules = [
    param("userId")
        .optional()
        .isMongoId().withMessage("Invalid User ID format.")
];

const fundWalletRules = [
    body("userId")
        .optional()
        .isMongoId().withMessage("Invalid User ID format."),

    body("amount")
        .exists().withMessage("Amount is required.")
        .isFloat({ min: 0.01 }).withMessage("Amount must be a positive number."),

    body("currency")
        .exists().withMessage("Currency is required.")
        .isIn(["NGN", "USD", "BTC"]).withMessage("Currency must be one of 'NGN', 'USD', or 'BTC'."),

    body("method")
        .exists().withMessage("Payment method is required.")
        .isIn(["cryptocurrency", "wallet_balance", "ngn_bank_transfer"]).withMessage("Invalid payment method."),

    body("reference")
        .exists().withMessage("Transaction reference is required.")
        .isString().withMessage("Reference must be a string.")
];

const processPaymentRules = [
    body("userId")
        .optional()
        .isMongoId().withMessage("Invalid User ID format."),

    body("amount")
        .exists().withMessage("Amount is required.")
        .isFloat({ min: 0.01 }).withMessage("Amount must be a positive number."),

    body("currency")
        .exists().withMessage("Currency is required.")
        .isIn(["NGN", "USD", "BTC"]).withMessage("Currency must be one of 'NGN', 'USD', or 'BTC'."),

    body("method")
        .exists().withMessage("Payment method is required.")
        .isIn(["cryptocurrency", "wallet_balance", "ngn_bank_transfer"]).withMessage("Invalid payment method."),

    body("reference")
        .exists().withMessage("Transaction reference is required.")
        .isString().withMessage("Reference must be a string.")
];

const dynoCheckoutURLRules = [
    body("amount")
        .exists().withMessage("Amount is required.")
        .isFloat({ min: 0 }).withMessage("Amount must be greater than 0.")
];


module.exports = {
    createWalletRules,
    getWalletRules,
    fundWalletRules,
    processPaymentRules,
    dynoCheckoutURLRules
};
