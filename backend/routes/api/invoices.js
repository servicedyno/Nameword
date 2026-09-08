const express = require("express");
const router = express.Router();
const {
	getInvoice,
	getInvoices,
} = require("../../app/controllers/invoice/InvoiceController");
const validateAPIKey = require("../../app/middlewares/validate-apikey");
const requireAuth = require("../../app/middlewares/require-auth");
router.use(validateAPIKey, requireAuth);
// @route   GET api/v1/invoices/:id
// @desc    Get a single invoice
// @access  Private
router.get("/:id", getInvoice);

// @route   GET api/v1/invoices
// @desc    Get all invoices for a user
// @access  Private
router.get("/", getInvoices);

module.exports = router;
