const router = require("express").Router();
const DomainForwardController = require("../../app/controllers/connect-reseller/DomainForwardController");

const {
	setDomainForwardRules,
	websiteIDRequiredRules,
	domainNameIdRequiredRules,
} = require("../../app/validations");
const validateRequest = require("../../app/middlewares/validate-request");
const validateAPIKey = require("../../app/middlewares/validate-apikey");
const currentUser = require("../../app/middlewares/current-user");
const requireAuth = require("../../app/middlewares/require-auth");

router.use(validateAPIKey, requireAuth);
router.get(
	"/set",
	setDomainForwardRules,
	validateRequest,
	DomainForwardController.store
);
router.get(
	"/get",
	websiteIDRequiredRules,
	validateRequest,
	DomainForwardController.view
);
router.get(
	"/all",
	websiteIDRequiredRules,
	validateRequest,
	DomainForwardController.all
);
router.get(
	"/update",
	setDomainForwardRules,
	validateRequest,
	DomainForwardController.update
);
router.get(
	"/delete",
	websiteIDRequiredRules,
	domainNameIdRequiredRules,
	validateRequest,
	DomainForwardController.destroy
);

module.exports = router;
