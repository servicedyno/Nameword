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
	terminateAccountValidation,
	domainValidation,
	showPlanValidation,
	createPlanValidation,
	updatePlanValidation,
	deletePlanValidation
} = require('../../../app/validations/hosting/PleskValidations');

const {
	accounts,
	createAccount,
	suspendAccount,
	unsuspendAccount,
	changePlan,
	changePassword,
	terminateAccount,
	telegramHosting,
	checkNewDomainAvailability,
	checkExistingDomainAvailability,
	plans,
	showPlan,
	createPlan,
	updatePlan,
	deletePlan,
	installPlesk,
	setupPleskLicense
} = require('../../../app/controllers/hosting/PleskController');

const router = express.Router();                                                       

const multer = require('multer');

const upload = multer({ dest: 'uploads/' });
         
// Install Plesk on a Virtual Machine        
router.post('/install/plesk', upload.single('privateKey'), validateRequest, installPlesk);                
                             
                     

// Setup Plesk license on a Virtual Machine
router.post('/setup/license/plesk', upload.single('privateKey'), validateRequest, setupPleskLicense);
       
router.use(validateApiKey, authMiddleware);            

router.get('/plans', plans);
router.post('/plans', createPlanValidation, validateRequest, createPlan);
router.get('/plans/:planName', showPlanValidation, validateRequest, showPlan);
router.patch('/plans/:planName', updatePlanValidation, validateRequest, updatePlan);         
router.delete('/plans/:planName', deletePlanValidation, validateRequest, deletePlan); 
  
module.exports = router;                                                         