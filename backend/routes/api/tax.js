const express = require("express");
const TaxController = require("../../app/controllers/tax/TaxController");
const currentUser = require("../../app/middlewares/current-user");
const requireAuth = require("../../app/middlewares/require-auth");

const router = express.Router();

// Get user's country from IP and tax rate (requires auth)
router.get("/user-country", currentUser, requireAuth, TaxController.getUserCountry.bind(TaxController));

// Get tax rate for a country (requires auth)
router.get("/tax-rates", currentUser, requireAuth, TaxController.getTaxRate.bind(TaxController));

// Validate VAT ID (requires auth)
router.post("/validate-vat", currentUser, requireAuth, TaxController.validateVatId.bind(TaxController));

module.exports = router;

