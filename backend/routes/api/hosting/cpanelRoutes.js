const express = require('express');

const authMiddleware = require("../../../app/middlewares/require-auth");
const validateApiKey = require('../../../app/middlewares/validate-apikey');
const validateRequest = require('../../../app/middlewares/validateRequest');

const {
	accountsValidation,
	createAccountValidation,
	telegramHostingValidation,
	suspendAccountValidation,
	unsuspendAccountValidation,
	changePlanValidation,
	changePasswordValidation,
	loginValidation,
	loginWebmailValidation,
	terminateAccountValidation,
	domainValidation,
	showPlanValidation,
	createPlanValidation,
	updatePlanValidation,
	deletePlanValidation
} = require('../../../app/validations/hosting/cPanelValidations');

const {
	accounts,
	createAccount,
	suspendAccount,
	unsuspendAccount,
	changePlan,
	changePassword,
	login,
	loginWebmail,
	terminateAccount,
	telegramHosting,
	checkNewDomainAvailability,
	checkExistingDomainAvailability,
	plans,
	showPlan,
	createPlan,
	updatePlan,
	deletePlan
} = require('../../../app/controllers/hosting/cPanelController');

const router = express.Router();

// router.use(validateApiKey, authMiddleware);

router.get('/accounts', accountsValidation, validateRequest, accounts);
router.post('/accounts', createAccountValidation, validateRequest, createAccount);
router.patch('/accounts/:cpanelId/suspend', suspendAccountValidation, validateRequest, suspendAccount);
router.patch('/accounts/:cpanelId/unsuspend', unsuspendAccountValidation, validateRequest, unsuspendAccount);
router.patch('/accounts/:cpanelId/plan', changePlanValidation, validateRequest, changePlan);
router.patch('/accounts/:cpanelId/password', changePasswordValidation, validateRequest, changePassword);
router.get('/accounts/:cpanelId/login', loginValidation, validateRequest, login);
router.get('/accounts/:cpanelId/login/webmail', loginWebmailValidation, validateRequest, loginWebmail);
router.delete('/accounts/:cpanelId', terminateAccountValidation, validateRequest, terminateAccount);

router.post('/accounts/telegram', telegramHostingValidation, validateRequest, telegramHosting);
router.get('/accounts/telegram/domain/new', domainValidation, validateRequest, checkNewDomainAvailability);
router.get('/accounts/telegram/domain/existing', domainValidation, validateRequest, checkExistingDomainAvailability);

router.get('/plans', plans);                                                                                         
router.post('/plans', createPlanValidation, validateRequest, createPlan);
router.get('/plans/:planName', showPlanValidation, validateRequest, showPlan);
router.patch('/plans/:planName', updatePlanValidation, validateRequest, updatePlan);
router.delete('/plans/:planName', deletePlanValidation, validateRequest, deletePlan);

module.exports = router;