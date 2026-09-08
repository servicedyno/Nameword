const express = require('express');

const authMiddleware = require("../../../app/middlewares/require-auth");
const validateApiKey = require('../../../app/middlewares/validate-apikey');
const validateRequest = require('../../../app/middlewares/validateRequest');                                                                                                

const {
	/*****************************Zone Records*****************************/
	zonesValidation,
	showZoneValidation,
	createZoneValidation,
	pauseZoneValidation,
	unpauseZoneValidation,
	purgeCacheValidation,
	terminateZoneValidation,

	/*****************************DNS Records*****************************/
	dnsValidation,
	createDnsValidation,
	editDnsValidation,
	deleteDnsValidation,
	
	/*****************************Rulesets*****************************/
	rulesetsValidation,
	createRulesetValidation,
	showRulesetValidation,
	deleteRulesetValidation,

	/*****************************Rules*****************************/
	createRuleValidation,
	deleteRuleValidation
} = require('../../../app/validations/hosting/CloudflareValidations');

const {
	/*****************************Zone Records*****************************/
	zones,
	showZone,
	createZone,
	pauseZone,
	unpauseZone,
	purgeCache,
	terminateZone,

	/*****************************DNS Records*****************************/
	dns,
	createDns,
	editDns,
	deleteDns,
	
	/*****************************Rulesets*****************************/
	rulesets,
	createRuleset,
	showRuleset,
	deleteRuleset,

	/*****************************Rules*****************************/
	createRule,
	deleteRule
} = require('../../../app/controllers/hosting/CloudflareController');

const router = express.Router();

router.use(validateApiKey, authMiddleware);

/*****************************Zone Records*****************************/
router.get('/zones', zonesValidation, validateRequest, zones);
router.get('/zones/:domainId', showZoneValidation, validateRequest, showZone);
router.post('/zones', createZoneValidation, validateRequest, createZone);
router.patch('/zones/:domainId/pause', pauseZoneValidation, validateRequest, pauseZone);
router.patch('/zones/:domainId/unpause', unpauseZoneValidation, validateRequest, unpauseZone);
router.post('/zones/:domainId/cache', purgeCacheValidation, validateRequest, purgeCache);
router.delete('/zones/:domainId', terminateZoneValidation, validateRequest, terminateZone);

/*****************************DNS Records*****************************/
router.get('/zones/:domainId/dns/', dnsValidation, validateRequest, dns);
router.post('/zones/:domainId/dns', createDnsValidation, validateRequest, createDns);
router.patch('/zones/:domainId/dns/:recordId', editDnsValidation, validateRequest, editDns);
router.delete('/zones/:domainId/dns/:recordId', deleteDnsValidation, validateRequest, deleteDns);

/*****************************Rulesets*****************************/
router.get('/zones/:domainId/rulesets/', rulesetsValidation, validateRequest, rulesets);
router.post('/zones/:domainId/rulesets', createRulesetValidation, validateRequest, createRuleset);
router.get('/zones/:domainId/rulesets/:rulesetId', showRulesetValidation, validateRequest, showRuleset);
router.delete('/zones/:domainId/rulesets/:rulesetId', deleteRulesetValidation, validateRequest, deleteRuleset);
router.post('/zones/:domainId/rulesets/:rulesetId/rules', createRuleValidation, validateRequest, createRule);
router.delete('/zones/:domainId/rulesets/:rulesetId/rules/:ruleId', deleteRuleValidation, validateRequest, deleteRule);

module.exports = router;
