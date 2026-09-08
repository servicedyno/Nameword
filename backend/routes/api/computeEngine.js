const router = require("express").Router();
const { instanceConfigurationRules, instanceRules, listInstancesRules, generateReportRules, checkProjectId, checkProjectIDAndArea, zoneListRules, diskTypesRules, attachSSHKeysRules, deleteInstanceRules, getInstanceRules, vpsConfigurationRules, vpsIdParamsRules, upgradeDiskRules, upgradeVPSRules } = require('../../app/validations/instanceRules');
const validateRequest = require('../../app/middlewares/validate-request');
const ComputeEngineController = require('../../app/controllers/compute-engine/ComputeEngineController');
const { getSSHDataMiddleware } = require("../../app/middlewares/ssh");
const { getUserDataMiddleware } = require("../../app/middlewares/user");
const { getAllVPSDisks } = require("../../app/controllers/vps-disks/vps-disks");
const { getVPSMiddleware } = require("../../app/middlewares/vps");

// Route to fetch OS list
router.get('/list-os', ComputeEngineController.getAvailableOS);

// Route to fetch VPS plans
router.get('/list-vps-plans', ComputeEngineController.getAvailableVPSPlans)

// Route to fetch disk type list
router.get('/disk-type-list', getAllVPSDisks);

// Route to create a new VM instance
router.post('/create/vm/instance', instanceConfigurationRules, validateRequest, getUserDataMiddleware, ComputeEngineController.createInstance);

// Route to create a new createVPS instance
router.post('/create/vps', vpsConfigurationRules, validateRequest, getUserDataMiddleware, ComputeEngineController.createVPS);

// Route to start an existing VM instance
router.post('/start/vps/:vps_id', instanceRules, validateRequest, getVPSMiddleware, ComputeEngineController.startVPS);

// Route to stop an existing VM instance
router.post('/stop/vps/:vps_id', instanceRules, validateRequest, getVPSMiddleware, ComputeEngineController.stopVPS);

// Route to restart a VM instance
router.post('/restart/vps/:vps_id', instanceRules, validateRequest, getVPSMiddleware, ComputeEngineController.restartVPS);

// Route to delete a vps
router.delete('/delete/vps/:vps_id', deleteInstanceRules, validateRequest, getUserDataMiddleware, ComputeEngineController.deleteVPS);

// Route to check the status of a VM instance
router.post('/status/vps/:vps_id', instanceRules, validateRequest, getVPSMiddleware, ComputeEngineController.statusVPS);

// Route to list all vps instances
router.get('/list/vps', listInstancesRules, validateRequest, getUserDataMiddleware, ComputeEngineController.listVPS);

// Route to get a VM instance
router.get('/get/vps/:vps_id', getInstanceRules, validateRequest, getUserDataMiddleware, ComputeEngineController.getVPS);

//Route to reboot a VM instance
router.post('/reboot/vps/:vps_id', instanceRules, validateRequest, getVPSMiddleware, ComputeEngineController.rebootVPS);

// Route to get upgrade options
router.get('/upgrade/vps/:vps_id', vpsIdParamsRules, validateRequest, getUserDataMiddleware, getVPSMiddleware, ComputeEngineController.getUpgradeVPS);

// Route to upgrade vps
router.post('/upgrade/vps/:vps_id', upgradeVPSRules, validateRequest, getUserDataMiddleware, getVPSMiddleware, ComputeEngineController.upgradeVPS);

// Route to get upgrade disk options
router.get('/upgrade/disk/:vps_id', vpsIdParamsRules, validateRequest, ComputeEngineController.getUpgradeDiskOptions);

// Route to upgrade disk
router.post('/upgrade/disk/:vps_id', upgradeDiskRules, validateRequest, getUserDataMiddleware, getVPSMiddleware, ComputeEngineController.upgradeDisk);

// Route to update a VM instance
router.post('/update/vm/instance', instanceConfigurationRules, validateRequest, ComputeEngineController.updateInstance);

// Route to update a VM instance plan details
router.post('/update/plan/vm', getUserDataMiddleware, ComputeEngineController.updateInstancePlanDetails)

// Route to generate a usage report for a VM instance
router.post('/generate-report', generateReportRules, validateRequest, ComputeEngineController.generateReport);

// Route to get a list of areas for a VM instance
router.get('/areas', checkProjectId, validateRequest, ComputeEngineController.getAreas);

// Route to get a list of regions for a VM instance
router.get('/regions', checkProjectIDAndArea, validateRequest, ComputeEngineController.getRegions);

// Route to get a list of zones for a VM instance
router.get('/zones', zoneListRules, validateRequest, ComputeEngineController.getZones);

// Route to get a cost of a VM instance
router.get('/cost/vm/instance', validateRequest, ComputeEngineController.getVMCost);

// Route to attach an SSH key to a VM instance
router.post('/attach/sshkeys/:vps_id', getUserDataMiddleware, attachSSHKeysRules, validateRequest, ComputeEngineController.attachSSHKeys);

// Route to dettach an SSH key from a VM instance
router.delete('/detach/sshkeys/:vps_id', getUserDataMiddleware, attachSSHKeysRules, validateRequest, ComputeEngineController.detachSSHKeys);

// Route to fetch Cpanel Options for VM
router.get('/vm/cpanel', ComputeEngineController.getcPanelOptions);

// Route to fetch WHM Options for VM
router.get('/vm/whm', ComputeEngineController.getWHMOptions);

// Route to fetch Plesk optins for VM
router.get('/vm/plesk', ComputeEngineController.getPleskOptions);

// Route to fetch Plesk reset password link
router.get('/vm/reset-plesk-password-link', getUserDataMiddleware, ComputeEngineController.getPleskResetLink);


module.exports = router;