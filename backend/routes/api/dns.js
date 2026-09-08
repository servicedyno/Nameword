const router = require("express").Router();
const DnsController = require("../../app/controllers/connect-reseller/DnsController");
const { getDnsActivity } = require("../../app/controllers/activityController");

const {
	domainRequiredRules,
	domainRequiredBodyRules,
	restoreDNSHistoryRules,
	addDnsRules,
	deleteDnsRules,
	modifyDnsRules,
} = require("../../app/validations");
const validateRequest = require("../../app/middlewares/validate-request");
const validateAPIKey = require("../../app/middlewares/validate-apikey");
const currentUser = require("../../app/middlewares/current-user");
const requireAuth = require("../../app/middlewares/require-auth");

router.use(validateAPIKey, requireAuth);
router.get(
	"/manage",
	domainRequiredRules,
	validateRequest,
	DnsController.manageDNSRecords
);
router.get("/add", addDnsRules, validateRequest, DnsController.addDNSRecord);
router.get(
	"/modify",
	modifyDnsRules,
	validateRequest,
	DnsController.modifyDNSRecord
);
router.get(
	"/delete",
	deleteDnsRules,
	validateRequest,
	DnsController.deleteDNSRecord
);
router.get(
	"/view",
	domainRequiredRules,
	validateRequest,
	DnsController.viewDNSRecord
);
router.get("/activity/:domain", getDnsActivity);

// DNSSEC CRUD routes
router.get("/dnssec/view", DnsController.viewDNSSEC);
router.post("/dnssec/add", DnsController.addDNSSEC);
router.put("/dnssec/modify", DnsController.modifyDNSSEC);
router.delete("/dnssec/delete", DnsController.deleteDNSSEC);

// DNS History routes
router.get("/history", domainRequiredRules, validateRequest, DnsController.getDNSHistory);
router.post("/history/restore", restoreDNSHistoryRules, validateRequest, DnsController.restoreDNSHistory);

// Nameserver routes
router.get(
	"/nameservers/view",
	domainRequiredRules,
	validateRequest,
	DnsController.viewNameservers
);
router.get(
	"/nameservers/update",
	domainRequiredRules,
	validateRequest,
	DnsController.updateNameservers
);

module.exports = router;
