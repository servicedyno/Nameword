const express = require("express");
const router = express.Router();
const DomainProviderClientController = require("../../app/controllers/DomainProviderClientController");
const validateAPIKey = require("../../app/middlewares/validate-apikey");
const requireAuth = require("../../app/middlewares/require-auth");

router.use(validateAPIKey, requireAuth);

// Create a client on domain provider
router.post("/create", DomainProviderClientController.createClient);

// Get client information for the current user
router.get("/info", DomainProviderClientController.getClientInfo);

// Update client status
router.put("/status", DomainProviderClientController.updateClientStatus);

// Retry client creation for a specific provider
router.post(
	"/retry/:provider",
	DomainProviderClientController.retryClientCreation
);

module.exports = router;
