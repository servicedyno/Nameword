const { param, body } = require("express-validator");

const updateBillingCycleRules = [
    // Validate billingCycleId in URL params
    param("billingCycleId")
        .exists().withMessage("Billing cycle ID is required.")
        .isMongoId().withMessage("Invalid billing cycle ID format."),

    // Validate Discount (if provided)
    body("discount")
        .optional()
        .isInt({ min: 0, max: 100 }).withMessage("Discount must be between 0 and 100."),

    // Validate Enabled (if provided)
    body("enabled")
        .optional()
        .isBoolean().withMessage("Enabled must be a boolean (true or false)."),

    // Ensure at least one field is provided
    body().custom((value, { req }) => {
        if (req.body.discount === undefined && req.body.enabled === undefined) {
            throw new Error("At least one field (discount or enabled) must be provided.");
        }
        return true;
    })
];;

module.exports = {
    updateBillingCycleRules
};
