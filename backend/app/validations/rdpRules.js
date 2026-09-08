const { query, body, param } = require('express-validator');

const getRDPPlansWithPriceRules = [
    query("zone")
        .exists().withMessage("Zone is required.")
        .isString().withMessage("Zone must be a string.")
        .isLength({ min: 1 }).withMessage("Zone cannot be empty."),
    query("os_uuid")
        .exists().withMessage("OS UUID is required.")
        .isString().withMessage("OS UUID must be a string.")
        .isLength({ min: 1 }).withMessage("OS UUID cannot be empty.")
]

const createRDPServerRules = [
    body("zone")
        .exists().withMessage("Zone is required.")
        .isString().withMessage("Zone must be a string.")
        .notEmpty().withMessage("Zone cannot be empty."),

    body("os_uuid")
        .exists().withMessage("OS UUID is required.")
        .isString().withMessage("OS UUID must be a string.")
        .notEmpty().withMessage("OS UUID cannot be empty."),

    body("hostname")
        .exists().withMessage("Hostname is required.")
        .isString().withMessage("Hostname must be a string.")
        .notEmpty().withMessage("Hostname cannot be empty."),

    body("title")
        .exists().withMessage("Title is required.")
        .isString().withMessage("Title must be a string.")
        .notEmpty().withMessage("Title cannot be empty."),

    body("plan_id")
        .exists().withMessage("Plan ID is required.")
        .isMongoId().withMessage("Plan ID must be a valid MongoDB ObjectId."),

    body("billingCycleId")
        .exists().withMessage("Billing Cycle ID is required.")
        .isMongoId().withMessage("Billing Cycle ID must be a valid MongoDB ObjectId."),

    body("price")
        .exists().withMessage("Price is required.")
        .isFloat({ min: 0 }).withMessage("Price must be a valid number greater than or equal to 0."),

    body("labels")
        .optional()
        .isArray().withMessage("Labels must be an array of key-value objects."),

    body("labels.*.key")
        .optional()
        .isString().withMessage("Each label key must be a string."),

    body("labels.*.value")
        .optional()
        .isString().withMessage("Each label value must be a string."),

    body("storageLables")
        .optional()
        .isArray().withMessage("Storage labels must be an array of key-value objects."),

    body("storageLables.*.key")
        .optional()
        .isString().withMessage("Each storage label key must be a string."),

    body("storageLables.*.value")
        .optional()
        .isString().withMessage("Each storage label value must be a string.")
];

const startRDPServerRules = [
    param("rdp_id")
        .exists().withMessage("RDP Instance ID is required.")
        .isMongoId().withMessage("Invalid RDP Instance ID.")
];

const stopRDPServerRules = [
    param("rdp_id")
        .exists().withMessage("RDP Instance ID is required.")
        .isMongoId().withMessage("Invalid RDP Instance ID.")
];

const getRDPServerRules = [
    param("rdp_id")
        .exists().withMessage("RDP Instance ID is required.")
        .isMongoId().withMessage("Invalid RDP Instance ID.")
];

const restartRDPServerRules = [
    param("rdp_id")
        .exists().withMessage("RDP Instance ID is required.")
        .isMongoId().withMessage("Invalid RDP Instance ID.")
];

const deleteRDPServerRules = [
    param("rdp_id")
        .exists().withMessage("RDP Instance ID is required.")
        .isMongoId().withMessage("Invalid RDP Instance ID.")
];

const getReinstallOSRules = [
    param("rdp_id")
        .exists().withMessage("RDP Instance ID is required.")
        .isMongoId().withMessage("Invalid RDP Instance ID.")
]

const reinstallWindowsRules = [
    param("rdp_id")
        .exists().withMessage("RDP instance ID is required.")
        .isMongoId().withMessage("Invalid RDP instance ID."),
    body("os_uuid")
        .exists().withMessage("OS UUID is required.")
        .isString().withMessage("OS UUID must be a string.")
];

// Validation rules for creating/updating an RDP Plan
const createOrUpdateRDPPlanRules = [
    body("name").exists().isString(),
    body("cpu").exists().isInt({ min: 1 }),
    body("ram").exists().isInt({ min: 1 }),
    body("storage.type").exists().isIn(["HDD", "SSD"]),
    body("storage.size").exists().isInt({ min: 1 }),
    body("networkSpeed.type").exists().isIn(["Mbps", "Gbps"]),
    body("networkSpeed.speed").exists().isInt({ min: 1 }),
    body("increment.unit").optional().isIn(["percentage", "currency"]),
    body("increment.value").optional().isFloat({ min: 0 })
];

// Delete RDP Plan validation
const deleteRDPPlanValidation = [
    param("plan_id")
        .exists().withMessage("Plan ID is required.")
        .isMongoId().withMessage("Invalid Plan ID format.")
];


// Export validation rules
module.exports = {
    getRDPPlansWithPriceRules,
    createRDPServerRules,
    startRDPServerRules,
    restartRDPServerRules,
    deleteRDPServerRules,
    getRDPServerRules,
    stopRDPServerRules,
    reinstallWindowsRules,
    getReinstallOSRules,
    createOrUpdateRDPPlanRules,
    deleteRDPPlanValidation,
};
