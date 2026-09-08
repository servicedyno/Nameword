const router = require("express").Router();
const { openFirewallRules, closeFirewallRules } = require('../../app/validations/firewallRules');
const validateRequest = require('../../app/middlewares/validate-request');
const FirewallController = require('../../app/controllers/firewall/FirewallController');

// Route to open firewall ports
router.post('/open', openFirewallRules, validateRequest, FirewallController.openPorts);

// Route to close firewall ports
router.post('/close', closeFirewallRules, validateRequest, FirewallController.closePorts);

module.exports = router;
