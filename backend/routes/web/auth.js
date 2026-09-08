const router = require("express").Router();

const SocialAuthController = require("../../app/controllers/auth/SocialAuthController");
const currentUser = require("../../app/middlewares/current-user");
const requireAuth = require("../../app/middlewares/require-auth");

router.get("/google", SocialAuthController.initAuth);
router.get("/google/callback", SocialAuthController.googleCallback);

// Google account link
router.get(
	"/google/link",
	currentUser,
	requireAuth,
	SocialAuthController.linkGoogleAccount,
);

router.get(
	"/google/link/callback",
	currentUser,
	requireAuth,
	SocialAuthController.linkGoogleCallback,
);

module.exports = router;
