const { getAllVPSDisks } = require("../../app/controllers/vps-disks/vps-disks");

const router = require("express").Router();

// Get all VPS disks
router.get('/all', getAllVPSDisks);

module.exports = router;