const { body, param } = require('express-validator');


const updateVPSDiskRules = [

    param("disk_id")
        .exists().withMessage("diskId is required.")
        .isString().withMessage("diskId must be a string."),

    body("type")
        .optional()
        .isIn(["pd-standard", "pd-balanced", "pd-ssd"]).withMessage("Type must be one of the following: 'pd-standard', 'pd-balanced', 'pd-ssd'."),
        // .isIn(["pd-standard", "pd-balanced", "pd-ssd", "pd-extreme"]).withMessage("Type must be one of the following: 'pd-standard', 'pd-balanced', 'pd-ssd', 'pd-extreme'."),

    body("level")
        .optional()
        .isInt({ min: 1 }).withMessage("Level must be a positive integer."),

    body("basePrice")
        .optional()
        .isFloat({ min: 0 }).withMessage("Base Price must be a non-negative number."),

    body("label")
        .optional()
        .isString().withMessage("Label must be a string."),

    body("description")
        .optional()
        .isString().withMessage("Description must be a string.")
];

// Export validation rules
module.exports = {
    updateVPSDiskRules
};
