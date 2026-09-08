const { body, param } = require("express-validator");

const updateOSRules = [
    param("os_id")
        .exists().withMessage("OS ID is required.")
        .isMongoId().withMessage("Invalid OS ID format."),

    body("name")
        .optional()
        .isString().trim().notEmpty().withMessage("OS name must be a non-empty string."),

    body("version")
        .optional()
        .isString().trim().notEmpty().withMessage("Version must be a non-empty string."),

    body("cloud")
        .optional()
        .isString().trim().notEmpty().withMessage("Cloud image name must be a non-empty string."),

    body("family")
        .optional()
        .isString().trim().notEmpty().withMessage("Family must be a non-empty string."),

    body("caption")
        .optional()
        .isString().trim().notEmpty().withMessage("Caption must be a non-empty string."),

    body("os_name")
        .optional()
        .isString().trim().notEmpty().withMessage("OS short name must be a non-empty string."),

    body("price")
        .optional()
        .isFloat({ min: 0 }).withMessage("Price must be a non-negative number."),

    body("priceDuration")
        .optional()
        .isIn(["monthly", null]).withMessage("Price duration must be 'monthly' or null.")
];

module.exports = { updateOSRules };
