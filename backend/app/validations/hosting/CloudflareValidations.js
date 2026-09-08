const { body, param, query } = require('express-validator');

/*****************************Zone Records*****************************/
const zonesValidation = [
	query('status').optional()
		.isIn(['initializing', 'pending', 'active', 'moved'])
		.withMessage('Status must be one of: initializing, pending, active, moved')
];

const showZoneValidation = [
	param('domainId').trim().isMongoId(),
];

const createZoneValidation = [
	body('domainId').trim().isMongoId()
];

const pauseZoneValidation = [
	param('domainId').trim().isMongoId(),
];

const unpauseZoneValidation = [
	param('domainId').trim().isMongoId(),
];

const purgeCacheValidation = [
	param('domainId').trim().isMongoId(),
	body('action').trim().notEmpty()
		.isIn(['purge_everything', 'purge_by_url'])
		.withMessage('Action must be one of: purge_everything, purge_by_url'),
	body('url').if(body('action').equals('purge_by_url')).trim().isURL().withMessage('URL is required')
];

const terminateZoneValidation = [
	param('domainId').trim().isMongoId(),
];

/*****************************DNS Records*****************************/
const dnsValidation = [
	param('domainId').trim().isMongoId(),
];

const createDnsValidation = [
	param('domainId').trim().isMongoId(),
	body('type').trim().notEmpty().withMessage('Type is required'),
	body('name').trim().notEmpty().withMessage('Name is required'),
	body('content').trim().notEmpty().withMessage('Content is required'),
	body('ttl').optional().isInt().withMessage('TTL must be a number'),
	body('proxied').optional().isBoolean().withMessage('Proxied must be a boolean')
];

const editDnsValidation = [
	param('domainId').trim().isMongoId(),
	param('recordId').trim().notEmpty().withMessage('DNS record id is required'),
	body('type').trim().notEmpty().withMessage('Type is required'),
	body('name').trim().notEmpty().withMessage('Name is required'),
	body('content').trim().notEmpty().withMessage('Content is required'),
	body('ttl').optional().isInt().withMessage('TTL must be a number'),
	body('proxied').optional().isBoolean().withMessage('Proxied must be a boolean')
];

const deleteDnsValidation = [
	param('domainId').trim().isMongoId(),
	param('recordId').trim().notEmpty().withMessage('DNS Record id is required')
];


/*****************************Rulesets*****************************/
const rulesetsValidation = [
	param('domainId').trim().isMongoId(),
];

const createRulesetValidation = [
	param('domainId').trim().isMongoId(),
	body('name').trim().notEmpty().withMessage('Name is required'),
	body('description').optional().trim(),
];

const showRulesetValidation = [
	param('domainId').trim().isMongoId(),
	param('rulesetId').trim().notEmpty().withMessage('Ruleset id is required'),
];

const deleteRulesetValidation = [
	param('domainId').trim().isMongoId(),
	param('rulesetId').trim().notEmpty().withMessage('Ruleset id is required'),
]

/*****************************Rules*****************************/
const createRuleValidation = [
	param('domainId').trim().isMongoId(),
	param('rulesetId').trim().notEmpty().withMessage('Ruleset id is required'),
	body('action').trim().notEmpty().withMessage('Action is required'),
	body('expression').trim().notEmpty().withMessage('Expression is required'),
	body('description').optional().trim(),
];

const deleteRuleValidation = [
	param('domainId').trim().isMongoId(),
	param('rulesetId').trim().notEmpty().withMessage('Ruleset id is required'),
	param('ruleId').trim().notEmpty().withMessage('Rule id is required')
];

module.exports = {
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
};
