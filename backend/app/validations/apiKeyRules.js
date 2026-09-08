const { body } = require("express-validator");

module.exports.keyValidationRules = [
  // Name validation
  body("name")
    .trim()
    .notEmpty().withMessage("Name is required"),

  // Expiration date validation
  body("expiration")
    .notEmpty().withMessage("Expiration date is required")
    .isISO8601().withMessage("Expiration date must be in YYYY-MM-DD format")
    .toDate()
    .custom((value) => {
      if (value <= new Date()) {
        throw new Error("Expiration date must be in the future");
      }
      return true;
    }),
];