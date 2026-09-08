const router = require("express").Router();
const { adminRegisterRules, loginRules, getMongoIdRule } = require('../../app/validations');
const AuthController = require('../../app/controllers/admin/AuthController');
const UserController = require('../../app/controllers/admin/UserController');

const validateRequest = require('../../app/middlewares/validate-request');
const currentAdmin = require('../../app/middlewares/current-admin');
const requireAdminAuth = require("../../app/middlewares/require-admin-auth");
const validateAdminRegisterKey = require("../../app/middlewares/validateAdminRegisterKey");
const { createVPSPlan, updateVPSPlan, deleteVPSPlan } = require("../../app/controllers/admin/VPSPlanController");
const { createVPSPlanRules, updateVPSPlanRules, deleteVPSPlanRules } = require("../../app/validations/vpsPlanRules");
const { updateBillingCycleRules } = require("../../app/validations/vpsBillingCycleDiscount");
const { updateBillingCycle } = require("../../app/controllers/admin/VPSBillingCycleDiscountController");
const { createCPanelPlan, updateCPanelPlan, deleteCPanelPlan, getCPanelPlan } = require("../../app/controllers/admin/CPanelPlanController");
const { createCPanelPlanRules, updateCPanelPlanRules, deleteCPanelPlanRules } = require("../../app/validations/cPanelPlanRules");
const { getAllOS, updateOS } = require("../../app/controllers/opeating-system/OperatingSystemcontroller");
const { updateOSRules } = require("../../app/validations/operatingSystemRules");
const { getAllMembershipTiers, increaseVpsPriceIncrease } = require("../../app/controllers/admin/MembershipTierController");
const { vpsPriceIncreaseRules } = require("../../app/validations/adminRules");
const { updateVPSDisk } = require("../../app/controllers/vps-disks/vps-disks");
const { updateVPSDiskRules } = require("../../app/validations/vpsDiskRules");
const { createRDPPlan, updateRDPPlan, deleteRDPPlan } = require("../../app/controllers/admin/RDPController");
const { updateRDPBillingCycleDiscounts, getRDPBillingCycleDiscount } = require("../../app/controllers/admin/RDPBillingCycleDiscountController");
const { createOrUpdateRDPPlanRules, deleteRDPPlanValidation } = require("../../app/validations/rdpRules");


router.post("/register", validateAdminRegisterKey, adminRegisterRules , validateRequest, AuthController.register);
router.post("/login", loginRules, validateRequest, AuthController.login);
router.post("/logout", currentAdmin, requireAdminAuth, AuthController.logout);
router.get("/users", currentAdmin, requireAdminAuth, UserController.list);
router.post("/user/:userId/ban", currentAdmin, requireAdminAuth, getMongoIdRule('userId'), validateRequest,UserController.banUser);
router.post("/user/:userId/unban", currentAdmin, requireAdminAuth, getMongoIdRule('userId'), validateRequest,UserController.unbanUser);
router.delete("/user/:userId/delete", currentAdmin, requireAdminAuth, getMongoIdRule('userId'), validateRequest,UserController.deleteUser);

// *************************************************************
//     🔧 VPS PLAN MANAGEMENT ROUTES
// *************************************************************

router.post("/vps-plan/create", currentAdmin, requireAdminAuth, createVPSPlanRules, validateRequest, createVPSPlan);
router.put("/vps-plan/update/:planId", updateVPSPlanRules, validateRequest, updateVPSPlan);
router.delete("/vps-plan/delete/:planId", deleteVPSPlanRules, validateRequest, deleteVPSPlan);

// *************************************************************
//     💳 BILLING CYCLE MANAGEMENT ROUTES
// *************************************************************

// Update Billing Cycle Discount or enable/disable
router.put("/vps-billing-cycle-discount/update/:billingCycleId", 
    updateBillingCycleRules, 
    validateRequest, 
    updateBillingCycle
);

// *************************************************************
//     CPanel Plans Management Routes (WHM & Plesk)
// *************************************************************

// Create a new cPanel Plan (WHM/Plesk)
router.get("/cpanel-plan",
    getCPanelPlan
);
router.post("/cpanel-plan",
    createCPanelPlanRules,
    validateRequest,
    createCPanelPlan
);

// Update an existing cPanel Plan
router.put("/cpanel-plan/:cPanelPlanId",
    updateCPanelPlanRules,
    validateRequest,
    updateCPanelPlan
);

// Delete a cPanel Plan
router.delete("/cpanel-plan/:cPanelPlanId",
    deleteCPanelPlanRules,
    validateRequest,
    deleteCPanelPlan
);

// *************************************************************
//     OS management
// *************************************************************

router.get("/vps-os", getAllOS)
router.put("/vps-os/:os_id", updateOSRules, validateRequest, updateOS);

// *************************************************************
//     🔧 MEMBERSHIP TIER MANAGEMENT ROUTES
// *************************************************************

// Get all membership tiers
router.get("/membership-tiers", currentAdmin, requireAdminAuth, getAllMembershipTiers);

// Update VPS price increase
router.patch("/membership-tier/:tierId/increase-percentage", vpsPriceIncreaseRules, validateRequest, currentAdmin, requireAdminAuth, increaseVpsPriceIncrease);


// *************************************************************
//     🔧 DISK MANAGEMENT ROUTES
// *************************************************************

// Update Disk
router.post("/vps-disk/:disk_id", updateVPSDiskRules, validateRequest, updateVPSDisk);

// *************************************************************
//     RDP ROUTES
// *************************************************************


// Create a new plan
router.post("/rdp/plan", createOrUpdateRDPPlanRules, validateRequest, createRDPPlan);

// Update a plan by ID
router.put("/rdp/plan/:plan_id", createOrUpdateRDPPlanRules, validateRequest, updateRDPPlan);

// Delete a plan by ID
router.delete("/rdp/plan/:plan_id", deleteRDPPlanValidation, validateRequest, deleteRDPPlan);


// Get all RDP billing cycle discounts
router.get("/rdp-billing-cycle-discount/all", getRDPBillingCycleDiscount);

// Update Billing Cycle Discount or enable/disable
router.put("/rdp-billing-cycle-discount/update/:billingCycleId", 
    updateBillingCycleRules, 
    validateRequest, 
    updateRDPBillingCycleDiscounts
);

module.exports = router;