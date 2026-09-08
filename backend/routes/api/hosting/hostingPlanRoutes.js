const express = require('express');

const authMiddleware = require("../../../app/middlewares/require-auth");
const validateApiKey = require('../../../app/middlewares/validate-apikey');
const validateRequest = require('../../../app/middlewares/validateRequest');

const {
	createHostingPlanRules,
	updateHostingPlanRules,
	deleteHostingPlanRules,
	listHostingPlansRules
} = require('../../../app/validations/hostingPlanRules');

const {
	listHostingPlans,
	createHostingPlan,
	getHostingPlanById,
	updateHostingPlan,
	deleteHostingPlan,
	listOpenproviderPleskItems
} = require('../../../app/controllers/admin/HostingPlanController');

const router = express.Router();

// Public: list active plans (no auth)
router.get('/public/plans', listHostingPlansRules, validateRequest, listHostingPlans);

// Admin routes
// router.use(validateApiKey, authMiddleware);

router.get('/plans', listHostingPlansRules, validateRequest, listHostingPlans);
router.get('/plans/:planId', getHostingPlanById);
router.post('/plans',
    //  createHostingPlanRules,
    //   validateRequest,
       createHostingPlan);

router.put('/plans', updateHostingPlanRules, validateRequest, updateHostingPlan);
router.delete('/plans/:planId', deleteHostingPlanRules, validateRequest, deleteHostingPlan);

// Helper to fetch Openprovider Plesk items for mapping SKUs
router.get('/openprovider/plesk-items', listOpenproviderPleskItems);

module.exports = router;


