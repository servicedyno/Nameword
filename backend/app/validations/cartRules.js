const { body } = require("express-validator");
const { query } = require("express-validator");

const addToCartRules = [
  body("itemType")
    .trim()
    .notEmpty()
    .withMessage((_, { path }) => `The ${path} field is required.`)
    .isIn(["domain", "bundle", "hosting"])
    .withMessage("itemType must be one of: domain, bundle, hosting"),

  // Domain item fields
  body("websiteName").if(body("itemType").equals("domain")).trim().notEmpty(),
  body("action")
    .if(body("itemType").equals("domain"))
    .trim()
    .notEmpty()
    .isIn(["register", "transfer", "renew"]),
  body("years").if(body("itemType").equals("domain")).optional().isInt({ min: 1, max: 10 }).toInt(),
  body("whoisProtection").if(body("itemType").equals("domain")).optional().isBoolean().toBoolean(),
  body("nameservers").if(body("itemType").equals("domain")).optional().isArray(),

  // Bundle fields
  body("bundle.name").if(body("itemType").equals("bundle")).notEmpty(),
  body("bundle.termYears").if(body("itemType").equals("bundle")).optional().isInt({ min: 1, max: 10 }).toInt(),
  body("bundle.items").if(body("itemType").equals("bundle")).isArray(),

  // Hosting fields
  body("hosting.planName")
    .if(body("itemType").equals("hosting"))
    .trim()
    .notEmpty(),
  body("hosting.provider")
    .if(body("itemType").equals("hosting"))
    .trim()
    .notEmpty(),
  body("hosting.planId")
    .if(body("itemType").equals("hosting"))
    .notEmpty(),
  body("hosting.tenureLabel")
    .if(body("itemType").equals("hosting"))
    .optional()
    .isString(),
  body("hosting.tenureMonths")
    .if(body("itemType").equals("hosting"))
    .optional()
    .isFloat({ gt: 0 })
    .toFloat(),
  body("hosting.domainOption")
    .if(body("itemType").equals("hosting"))
    .isIn(["new", "existing", "external"]),
  body("hosting.domainName")
    .if(body("hosting.domainOption").equals("new"))
    .trim()
    .notEmpty(),

  // Price fields
  body("price.amount").notEmpty().isFloat({ gt: 0 }).toFloat(),
  body("price.currency").optional().isString().isLength({ min: 3, max: 3 }),
  body("price.originalAmount").optional().isFloat({ gt: 0 }).toFloat(),
  body("price.discountPercent").optional().isFloat({ min: 0, max: 100 }).toFloat(),
];

const removeFromCartRules = [query("id").trim().isMongoId()];

module.exports = {
  addToCartRules,
  removeFromCartRules
};


