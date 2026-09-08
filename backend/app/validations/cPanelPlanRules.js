const { body, param } = require("express-validator");

const createCPanelPlanRules = [
    body("type")
        .exists().withMessage("Type is required.")
        .isIn(["WHM", "Plesk"]).withMessage("Type must be 'WHM' or 'Plesk'."),

    body("name")
        .exists().withMessage("Plan name is required.")
        .isString().trim().notEmpty().withMessage("Plan name must be a non-empty string."),

    body("tier")
        .exists().withMessage("Plan tier is required.")
        .isString().trim().notEmpty().withMessage("Tier must be a non-empty string."),

    body("maxAccounts")
        .optional()
        .isInt({ min: 0 }).withMessage("maxAccounts must be a non-negative integer."),

    body("maxDomains")
        .optional()
        .isString().trim().notEmpty().withMessage("maxDomains must be a non-empty string."),

    body("price")
        .exists().withMessage("Price is required.")
        .isFloat({ min: 0 }).withMessage("Price must be a non-negative number."),

    body("billingDuration")
        .exists().withMessage("Billing duration is required.")
        .isIn(["monthly", "days"]).withMessage("Billing duration must be 'monthly' or 'days'."),

    body("durationValue")
        .exists().withMessage("Duration value is required.")
        .isInt({ min: 1 }).withMessage("Duration value must be a positive integer."),

    body("enabled")
        .optional()
        .isBoolean().withMessage("Enabled must be a boolean value.")
];

const updateCPanelPlanRules = [
    param("cPanelPlanId")
        .exists().withMessage("Plan ID is required.")
        .isMongoId().withMessage("Invalid Plan ID format."),

    body("name")
        .optional()
        .isString().trim().notEmpty().withMessage("Plan name must be a non-empty string."),

    body("tier")
        .optional()
        .isString().trim().notEmpty().withMessage("Tier must be a non-empty string."),

    body("maxAccounts")
        .optional()
        .isInt({ min: 0 }).withMessage("maxAccounts must be a non-negative integer."),

    body("maxDomains")
        .optional()
        .isString().trim().notEmpty().withMessage("maxDomains must be a non-empty string."),

    body("price")
        .optional()
        .isFloat({ min: 0 }).withMessage("Price must be a non-negative number."),

    body("billingDuration")
        .optional()
        .isIn(["monthly", "days"]).withMessage("Billing duration must be 'monthly' or 'days'."),

    body("durationValue")
        .optional()
        .isInt({ min: 1 }).withMessage("Duration value must be a positive integer."),

    body("enabled")
        .optional()
        .isBoolean().withMessage("Enabled must be a boolean value.")
];

const deleteCPanelPlanRules = [
    param("cPanelPlanId")
        .exists().withMessage("Plan ID is required.")
        .isMongoId().withMessage("Invalid Plan ID format.")
];

module.exports = {
    createCPanelPlanRules,
    updateCPanelPlanRules,
    deleteCPanelPlanRules
};
