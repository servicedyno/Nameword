const express = require("express");
const router = express.Router();
const { getRDPPlans, getZonesList, getRDPPlansWithPrice, getWindowsOSList, createRDPServer, startRDPServer, restartRDPServer, deleteRDPServer, getRDPServerDetails, stopRDPServer, getRDPServersDetails, reinstallRDPServer, getReinstallOSList } = require("../../app/controllers/rdp/rdpController");
const validateRequest = require("../../app/middlewares/validate-request");
const { getRDPPlansWithPriceRules, createRDPServerRules, startRDPServerRules, restartRDPServerRules, deleteRDPServerRules, getRDPServerRules, stopRDPServerRules, reinstallWindowsRules, getReinstallOSRules } = require("../../app/validations/rdpRules");
const { getUserDataMiddleware } = require("../../app/middlewares/user");
const { validateUserOwnsRDPInstance } = require("../../app/middlewares/rdp");

// Get all plans
router.get("/plans", getRDPPlans);

// Get UpCloud zones list
router.get("/zones", getZonesList);

// Get Operating System list
router.get("/os-list", getWindowsOSList);

// Get all RDP plans with UpCloud pricing and Windows license fee
router.get("/plans-with-price", getRDPPlansWithPriceRules, validateRequest, getRDPPlansWithPrice);

// To create a RDP windows server
router.post("/server", createRDPServerRules, validateRequest, getUserDataMiddleware, createRDPServer);

// To get a RDP windows servers list
router.get('/servers', getUserDataMiddleware, getRDPServersDetails);

// To get a RDP windows server details
router.get('/server/:rdp_id', getRDPServerRules, validateRequest, getUserDataMiddleware, validateUserOwnsRDPInstance, getRDPServerDetails);

// To start a RDP windows server
router.post('/server/:rdp_id/start', startRDPServerRules, validateRequest, getUserDataMiddleware, validateUserOwnsRDPInstance, startRDPServer);

// To stop a RDP windows server
router.post('/server/:rdp_id/stop', stopRDPServerRules, validateRequest, getUserDataMiddleware, validateUserOwnsRDPInstance, stopRDPServer);

// To restart a RDP windows server
router.post('/server/:rdp_id/restart', restartRDPServerRules, validateRequest, getUserDataMiddleware, validateUserOwnsRDPInstance, restartRDPServer);

// To delete a RDP windows server
router.delete('/server/:rdp_id', deleteRDPServerRules, validateRequest, getUserDataMiddleware, validateUserOwnsRDPInstance, deleteRDPServer);

// To get the list of OS for reinstalling a RDP windows server
router.get("/server/:rdp_id/reinstall/os-list", getReinstallOSRules, validateRequest, getUserDataMiddleware, validateUserOwnsRDPInstance, getReinstallOSList);

// To reinstall a RDP windows server
router.post('/server/:rdp_id/reinstall', reinstallWindowsRules, validateRequest, getUserDataMiddleware, validateUserOwnsRDPInstance, reinstallRDPServer);

module.exports = router;
