const router = require("express").Router();
const { loginRules , registerRules, emailRules, passwordResetRules, telegramRegisterRules, updateUserRules, 
    verifyEmailRules, changePasswordRules, updateUserDetailsRules, accountReactivateRules, 
    sendMobileOtpRules,
    verifyMobileOtpRules,
    TwoFactorVerifyRules,
    changeEmail
} = require('../../app/validations');
const LoginController = require('../../app/controllers/auth/LoginController');
const RegisterController = require('../../app/controllers/auth/RegisterController');
const SocialAuthController = require('../../app/controllers/auth/SocialAuthController');
const PasswordResetController = require('../../app/controllers/auth/PasswordResetController');
const VerificationController = require("../../app/controllers/auth/VerificationController");
const validateRequest = require('../../app/middlewares/validate-request');
const currentUser = require('../../app/middlewares/current-user');
const requireAuth = require("../../app/middlewares/require-auth");
const { checkMissingEmail, updateUser } = require("../../app/controllers/telegram/TelegramController");
const { getUserDataMiddleware } = require("../../app/middlewares/user");
const UserController = require("../../app/controllers/auth/UserController");
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.post("/register", upload.single('profileImg'), registerRules, validateRequest, RegisterController.register);
router.post("/register-telegram-user", telegramRegisterRules, validateRequest, RegisterController.registerTelegramUser)
router.post("/login", loginRules, validateRequest, LoginController.login);
router.get("/me", currentUser, requireAuth, LoginController.currentUser);
router.post("/logout", currentUser, requireAuth, LoginController.logout);
router.post("/forgot-password", emailRules, validateRequest, PasswordResetController.sendResetLink);
router.post("/reset-password", passwordResetRules, validateRequest, PasswordResetController.resetPassword);
router.post("/change-password", currentUser, requireAuth, changePasswordRules, validateRequest, UserController.changePassword);
router.post("/telegram", SocialAuthController.telegramCallback);
router.post("/telegram/link", currentUser, requireAuth, SocialAuthController.linkTelegramAccount);
router.get("/telegram/unlink", currentUser, requireAuth, SocialAuthController.unlinkTelegramAccount);
router.post("/send-email-code", emailRules, validateRequest, VerificationController.sendEmailVerificationCode);
router.post("/send-mobile-otp", sendMobileOtpRules, validateRequest, VerificationController.sendMobileOTP);
router.post("/verify-mobile-otp", verifyMobileOtpRules, validateRequest, VerificationController.verifyMobileOTP);
router.post("/verify-email-code", verifyEmailRules, validateRequest, VerificationController.verifyEmailVerificationCode);
router.post("/update-userDetails", currentUser, requireAuth, updateUserDetailsRules, validateRequest, UserController.updateUserDetails);
router.post("/deactivate-account", currentUser, requireAuth, UserController.deactivateAccount);
router.delete("/delete-account", currentUser, requireAuth, UserController.deleteUserAccount);
router.post("/request-account-reactivate", emailRules, validateRequest, UserController.sendReactivateAccountLink);
router.post("/reactivate-account", accountReactivateRules, validateRequest, UserController.reactivateAccount);
router.post("/update-profile-picture", currentUser, requireAuth, upload.single('profileImg'), UserController.updateProfilePicture);
router.post("/delete-profile-picture", currentUser, requireAuth, UserController.deleteProfilePicture);
router.get("/notification-preferences", currentUser, requireAuth, UserController.getNotificationPreferences);
router.post("/notification-preferences", currentUser, requireAuth, UserController.updateNotificationPreferences);

// Check if the user has an email, and request it if missing
router.get("/check-missing-email", getUserDataMiddleware, checkMissingEmail);

// Update email for a Telegram user
router.post("/update-user", updateUserRules, validateRequest, getUserDataMiddleware, updateUser);

// Google account unLink
router.get("/google/unlink", currentUser, requireAuth, SocialAuthController.unlinkGoogleAccount);

// 2FA verify
router.post("/2fa/verify", TwoFactorVerifyRules, validateRequest, VerificationController.verify2FACode );

// change Email for register use

router.post("/change-email", changeEmail, validateRequest, RegisterController.changeEmail );


module.exports = router;
