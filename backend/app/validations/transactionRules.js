const { param } = require("express-validator");

const getTransactionsRules = [
    param("userId")
        .optional(true)
        .isMongoId().withMessage("Invalid User ID format.")
];

module.exports = {
    getTransactionsRules
};
