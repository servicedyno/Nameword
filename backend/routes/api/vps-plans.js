const router = require("express").Router();
const { getAllVPSPlans } = require("../../app/controllers/vps-plans/vps-plans");
const { getUserDataMiddleware } = require("../../app/middlewares/user");

// Get all VPS Plans
router.get('/all', getUserDataMiddleware, getAllVPSPlans)

module.exports = router;