const router = require("express").Router();
const { checkSchema } = require('express-validator');
const { mongoIdRules } = require('../../app/validations');

const APIKeyController = require('../../app/controllers/APIKeyController');
const validateRequest = require('../../app/middlewares/validate-request');
const currentUser = require('../../app/middlewares/current-user');
const requireAuth = require("../../app/middlewares/require-auth");
const { keyValidationRules } = require("../../app/validations/apiKeyRules");



router.post("/user/api-keys", currentUser, requireAuth, keyValidationRules, validateRequest, APIKeyController.store);
router.get("/user/api-keys", currentUser, requireAuth, APIKeyController.list);
router.delete("/user/api-keys/:id", currentUser, requireAuth, mongoIdRules, validateRequest, APIKeyController.destroy);
//router.get("/auth/me", currentUser, requireAuth, LoginController.currentUser);
//router.post("/auth/logout", currentUser, requireAuth, LoginController.logout);


module.exports = router;