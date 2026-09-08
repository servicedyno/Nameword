const express = require('express');

const validateRequest = require('../../../app/middlewares/validateRequest');

const { installWHM, setupWHMLicense } = require('../../../app/controllers/hosting/whmController');
const { getSSHDataMiddleware } = require('../../../app/middlewares/ssh');

const router = express.Router();

// Install WHM on a Virtual Machine
router.post('/install/whm', validateRequest, getSSHDataMiddleware, installWHM);

// Setup WHM license on a Virtual Machine
router.post('/setup/license/whm', validateRequest, getSSHDataMiddleware, setupWHMLicense);

module.exports = router;
