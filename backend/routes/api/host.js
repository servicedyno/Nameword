const router = require("express").Router();
const HostController  = require("../../app/controllers/connect-reseller/HostController");

const { 
    addChildNameServerRules,
    modifyChildNameServerIPRules,
    modifyChildNameServerHostRules,
    domainNameIdOptionalRules,
    deleteChildNameServerRules

 } = require('../../app/validations');
const validateRequest = require('../../app/middlewares/validate-request');
const validateAPIKey = require('../../app/middlewares/validate-apikey');
const currentUser = require('../../app/middlewares/current-user');
const requireAuth = require("../../app/middlewares/require-auth");

router.use(validateAPIKey,requireAuth);
router.get("/add-child-nameserver",addChildNameServerRules, validateRequest, HostController.addChildNameServer);
router.get("/modify-child-nameserver-ip",modifyChildNameServerIPRules, validateRequest, HostController.modifyChildNameServerIP);
router.get("/modify-child-nameserver-host",modifyChildNameServerHostRules, validateRequest, HostController.modifyChildNameServerHost);
router.get("/delete-child-nameserver",deleteChildNameServerRules, validateRequest, HostController.deleteChildNameServer);
router.get("/get-child-nameserver",domainNameIdOptionalRules, validateRequest, HostController.getChildNameServer);
 


module.exports = router;                  