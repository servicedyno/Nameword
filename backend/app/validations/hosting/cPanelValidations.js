const { body, param, query } = require('express-validator');

const accountsValidation = [
	query('status').trim().optional()
		.isIn(['active', 'suspended']).withMessage('Status must be one of: active, suspended'),
];

const createAccountValidation = [
	body('domainId').trim().isMongoId(),
	body('username').trim().isString().notEmpty().withMessage('Username is required'),
	body('plan').trim().isString(),
];

const domainValidation = [
	query('domain').trim().notEmpty().withMessage('Domain is required')
]

const telegramHostingValidation = [
	body('telegramId').trim().isString().notEmpty().withMessage('Telegram ID is required'),
	body('name').trim().optional(),
	body('email').trim()
		.notEmpty().withMessage('Email is required').bail()
		.isEmail().withMessage('Invalid email address'),
	body('domain').trim().notEmpty().withMessage('Domain is required'),
	body('existingDomain').isBoolean().withMessage('Existing domain must be a boolean'),
	body('plan').trim().notEmpty().withMessage('Plan is required')
		.isIn(['Freedom Plan', 'Starter Plan', 'Business Plan', 'Pro Plan'])
		.withMessage('Invalid plan'),
	body('nameserver').trim().notEmpty().withMessage('Nameserver is required')
		.isIn(['privhost', 'cloudflare'])
		.withMessage('Invalid nameserver'),
];

const suspendAccountValidation = [
	param('cpanelId').trim().isMongoId(),
	body('reason').trim().isString().default('Unknown'),
];

const unsuspendAccountValidation = [
	param('cpanelId').trim().isMongoId(),
];

const terminateAccountValidation = [
	param('cpanelId').trim().isMongoId(),
];

const changePlanValidation = [
	param('cpanelId').trim().isMongoId(),
	body('plan').trim().isString().notEmpty().withMessage('Plan is required'),
];

const changePasswordValidation = [
	param('cpanelId').trim().isMongoId(),
	body('password').trim().isString().notEmpty().withMessage('Password is required'),
];

const loginValidation = [
	param('cpanelId').trim().isMongoId(),
];

const loginWebmailValidation = [
	param('cpanelId').trim().isMongoId(),
];

const showPlanValidation = [
	param('planName').trim().notEmpty().withMessage('Plan name is required'),
]

const createPlanValidation = [
	body('planName').trim().notEmpty().withMessage('Plan name is required'),
	body('quota').trim().notEmpty().withMessage('Quota is required'),
	body('bwlimit').trim().notEmpty().withMessage('Bandwidth limit is required'),
	body('maxaddon').trim().notEmpty().withMessage('Max addon is required'),
	body('maxpop').trim().notEmpty().withMessage('Max pop is required'),
	body('maxsql').trim().notEmpty().withMessage('Max sql is required'),
];

const updatePlanValidation = [
	param('planName').trim().notEmpty().withMessage('Plan name is required'),
	body('quota').trim().notEmpty().withMessage('Quota is required'),
	body('bwlimit').trim().notEmpty().withMessage('Bandwidth limit is required'),
	body('maxaddon').trim().notEmpty().withMessage('Max addon is required'),
	body('maxpop').trim().notEmpty().withMessage('Max pop is required'),
	body('maxsql').trim().notEmpty().withMessage('Max sql is required'),
];

const deletePlanValidation = [
	body('planName').trim().notEmpty().withMessage('Plan name is required'),
];

module.exports = {
	accountsValidation,
	createAccountValidation,
	domainValidation,
	telegramHostingValidation,
	suspendAccountValidation,
	unsuspendAccountValidation,
	changePlanValidation,
	changePasswordValidation,
	loginValidation,
	loginWebmailValidation,
	terminateAccountValidation,
	showPlanValidation,
	createPlanValidation,
	updatePlanValidation,
	deletePlanValidation
};
