const express = require('express');
const currentUser = require('../../app/middlewares/current-user');
const requireAuth = require('../../app/middlewares/require-auth');
const SessionController = require('../../app/controllers/user-session/SessionController');
const router = express.Router();

router.get('/', currentUser, requireAuth, SessionController.getAll);
router.get('/logout/:sessionId', currentUser, requireAuth, SessionController.logoutOne);
router.get('/logout-all', currentUser, requireAuth, SessionController.logoutAll);

module.exports = router;