const { body } = require("express-validator");

const vpsPriceIncreaseRules = [
    body("type")
        .exists().withMessage("Type is required.")
        .isIn(['vpsPurchase', 'vpsUpgrade']).withMessage("Type must be either 'vpsPurchase' or 'vpsUpgrade'."),

    body("unit")
        .optional()
        .isIn(['percentage', 'currency']).withMessage("Unit must be either 'percentage' or 'currency'."),

    body("value")
        .exists().withMessage("Value is required.")
        .isFloat({ min: 0 }).withMessage("Value must be a non-negative number.")
];

module.exports = { vpsPriceIncreaseRules };