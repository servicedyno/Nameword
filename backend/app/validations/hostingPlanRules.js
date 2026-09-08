const { body, param, query } = require("express-validator");

const createHostingPlanRules = [
	body("name").exists().isString().trim().notEmpty(),
	body("priceMonthly").exists().isFloat({ min: 0 }),
	body("originalPriceMonthly").optional().isFloat({ min: 0 }),
	body("discountPercent").optional().isFloat({ min: 0, max: 100 }),
	body("currency").optional().isString().trim().isLength({ min: 3, max: 3 }),
	body("websites").optional().isInt({ min: 0 }),
	body("storageGb").optional().isInt({ min: 0 }),
	body("emailAccounts").optional().isInt({ min: 0 }),
	body("controlPanel").optional().isString().trim(),
	body("features").optional().isArray(),
	body("provider").optional().isIn(["openprovider", "none"]),
	body("providerProduct").optional().isIn(["plesk", "ssl", "domain", "hosting", null]),
	body("providerSku").optional().isString().trim(),
	body("isActive").optional().isBoolean(),
	body("sortOrder").optional().isInt({ min: 0 })
];

const updateHostingPlanRules = [
	query("planId").exists().isMongoId(),
	body("name").optional().isString().trim().notEmpty(),
	body("priceMonthly").optional().isFloat({ min: 0 }),
	body("originalPriceMonthly").optional().isFloat({ min: 0 }),
	body("discountPercent").optional().isFloat({ min: 0, max: 100 }),
	body("currency").optional().isString().trim().isLength({ min: 3, max: 3 }),
	body("websites").optional().isInt({ min: 0 }),
	body("storageGb").optional().isInt({ min: 0 }),
	body("emailAccounts").optional().isInt({ min: 0 }),
	body("controlPanel").optional().isString().trim(),
	body("features").optional().isArray(),
	body("provider").optional().isIn(["openprovider", "none"]),
	body("providerProduct").optional().isIn(["plesk", "ssl", "domain", "hosting", null]),
	body("providerSku").optional().isString().trim(),
	body("isActive").optional().isBoolean(),
	body("sortOrder").optional().isInt({ min: 0 })
];

const deleteHostingPlanRules = [param("planId").exists().isMongoId()];

const listHostingPlansRules = [query("active").optional().isBoolean().toBoolean()];

module.exports = {
	createHostingPlanRules,
	updateHostingPlanRules,
	deleteHostingPlanRules,
	listHostingPlansRules
};


