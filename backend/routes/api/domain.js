const router = require("express").Router();
const DomainController = require("../../app/controllers/connect-reseller/DomainController");
const {
	getDomainActivity,
} = require("../../app/controllers/activityController");
const {
	websiteNameRequiredRules,
	domainSearchRules,
	domainSuggestionRules,
	domainOrderRules,
	domainTransferRules,
	domainTLDOrderRules,
	domainRenewRules,
} = require("../../app/validations");
const validateRequest = require("../../app/middlewares/validate-request");
const validateAPIKey = require("../../app/middlewares/validate-apikey");
const currentUser = require("../../app/middlewares/current-user");
const requireAuth = require("../../app/middlewares/require-auth");
const DomainContactController = require("../../app/controllers/domain/DomainContactController");

router.get(
	"/suggestion",
	domainSuggestionRules,
	validateRequest,
	DomainController.domainSuggestion
);
router.get(
	"/search",
	domainSearchRules,
	validateRequest,
	DomainController.domainSearch
);
router.get(
	"/tld-suggestion",
	websiteNameRequiredRules,
	validateRequest,
	DomainController.getTldSuggestion
);
router.get(
	"/price",
	websiteNameRequiredRules,
	validateRequest,
	DomainController.checkDomainPrice
);
router.get("/list", currentUser, requireAuth, DomainController.domainList);
router.get("/transfer/list", currentUser, requireAuth, DomainController.getDomainTransferList);
router.get("/view-domain", currentUser, requireAuth, DomainController.viewDomain);
router.get("/bundles", DomainController.getDomainBundles);
router.get(
	"/order",
	currentUser, requireAuth,
	domainOrderRules,
	validateRequest,
	DomainController.placeDomainOrder
);
router.use(validateAPIKey, requireAuth);
router.get(
	"/tld-order",
	domainTLDOrderRules,
	validateRequest,
	DomainController.placeTldDomainOrder
);
router.get(
	"/transfer",
	domainTransferRules,
	validateRequest,
	DomainController.domainTransfer
);
router.get("/cancel-transfer", DomainController.domainCancelTransfer);
router.get("/validate-transfer", DomainController.domainValidateTransfer);
router.get("/transfer/status", currentUser, requireAuth, DomainController.getDomainTransferStatus);
router.get(
	"/renew",
	domainRenewRules,
	validateRequest,
	DomainController.domainRenew
);
router.get("/modiify-nameserver", DomainController.modifyNameserver);
router.get("/modify-authcode", DomainController.modifyAuthcode);
router.get("/manage-lock", DomainController.manageDomainLock);
router.get("/manage-privacy", DomainController.manageDomainPrivacy);
router.post(
	"/bulk-manage-autorenew",
	currentUser,
	requireAuth,
	DomainController.bulkManageAutoRenewal
);
router.post(
	"/bulk-manage-lock",
	currentUser,
	requireAuth,
	DomainController.bulkManageDomainLock
);
router.post(
	"/bulk-modify-nameserver",
	currentUser,
	requireAuth,
	DomainController.bulkModifyNameserver
);
router.get(
	"/whois",
	validateAPIKey,
	currentUser,
	requireAuth,
	DomainController.getWhoisInfo
);
router.post(
	"/privacy/enable",
	validateAPIKey,
	currentUser,
	requireAuth,
	DomainController.enableDomainPrivacy
);
router.post(
	"/privacy/disable",
	validateAPIKey,
	currentUser,
	requireAuth,
	DomainController.disableDomainPrivacy
);
router.post(
	"/privacy/dynocheckout-url",
	currentUser,
	requireAuth,
	DomainController.getDomainPrivacyDynocheckoutUrl
);
router.get(
	"/privacy/dynocheckout-webhook",
	DomainController.handleDomainPrivacyDynoPaymentWebhook
);
router.post(
	"/privacy/dynocheckout-webhook",
	DomainController.handleDomainPrivacyDynoPaymentWebhook
);
router.post(
	"/renew/dynocheckout-url",
	currentUser,
	requireAuth,
	DomainController.getDomainRenewDynocheckoutUrl
);
router.get(
	"/renew/dynocheckout-webhook",
	DomainController.handleDomainRenewDynoPaymentWebhook
);
router.post(
	"/renew/dynocheckout-webhook",
	DomainController.handleDomainRenewDynoPaymentWebhook
);
router.post(
	"/transfer/dynocheckout-url",
	currentUser,
	requireAuth,
	DomainController.getDomainTransferDynocheckoutUrl
);
router.get(
	"/transfer/dynocheckout-webhook",
	DomainController.handleDomainTransferDynoPaymentWebhook
);
router.post(
	"/transfer/dynocheckout-webhook",
	DomainController.handleDomainTransferDynoPaymentWebhook
);
router.get("/view-secret-key", DomainController.viewSecretKey);
router.get("/manage-dns-records", DomainController.manageDnsRecords);
router.get("/activity/:domain", getDomainActivity);
router.get("/:domainName/auth-code", DomainController.getDomainAuthCode);
router.get("/:domainName/contacts", DomainContactController.getAll);
router.post("/:domainName/contacts", DomainContactController.add);
router.put("/:domainName/contacts/:contactId", DomainContactController.update);
router.delete(
	"/:domainName/contacts/:contactId",
	DomainContactController.remove
);
router.delete("/:id",DomainContactController.removeDomain);

// DNS Records routes
const DnsController = require("../../app/controllers/connect-reseller/DnsController");
router.get(
	"/:domainName/dns/records",
	currentUser,
	requireAuth,
	DnsController.getDNSRecordsByDomain.bind(DnsController)
);
router.post(
	"/:domainName/dns/records",
	currentUser,
	requireAuth,
	DnsController.createDNSRecordByDomain.bind(DnsController)
);

router.post(
	"/dynocheckout-url",
	currentUser,
	requireAuth,
	DomainController.getDomainDynocheckoutUrl
);

router.get(
	"/dynocheckout-webhook",
	DomainController.handleDomainDynoPaymentWebhook
);

module.exports = router;
