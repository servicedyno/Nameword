const User = require("../../models/User");
const jwt = require("jsonwebtoken");
const BadRequestError = require("../../errors/BadRequestError");
const { assignTierAndBadges } = require("../../utils/query");
const ForbiddenError = require("../../errors/ForbiddenError");
const { generateRandomOtp } = require("../../utils/common");
const VerificationCode = require("../../models/VerificationCode");
const nunjucks = require("nunjucks");
const transporter = require("../../services/mailer");
const env = require("../../../start/env");
const { generate2FASecret, generateQRFromSecret } = require("../../utils/twoFactor");
const { saveUserSession, deleteUserSession } = require("../../services/userSession");
const { generateJwtToken } = require("../../helpers/generateJwt");
const { hash } = require("bcrypt");

class LoginController {
	async login(req, res) {
		const { email, password } = req.body;
		const user = await User.findOne({ email, deletedAt: { $exists: false } });
		if (!user) {
			throw new BadRequestError("Invalid credentials.");
		}
		if (!user.password) {
			throw new BadRequestError("Invalid credentials");
		}                                                                                                                                            

		// Check if account is locked
		if (user.locked) {
			if (user.lockedUntil && user.lockedUntil > new Date()) {
				throw new ForbiddenError(
					"Your account is locked due to multiple failed login attempts. Please try again later or contact support."
				);
			} else {
				// Lock expired, unlock the account
				user.locked = false;
				user.failedLoginAttempts = 0;
				user.lockedUntil = null;
				await user.save();
			}
		}

		const isValid = await user.isValidPassword(password);
		
		if (!isValid) {
			// Increment failed login attempts
			user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
			const MAX_ATTEMPTS = 5;
			
			if (user.failedLoginAttempts >= MAX_ATTEMPTS) {
				// Lock account for 1 hour
				user.locked = true;
				user.lockedUntil = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
				
				// Send account locked email
				try {
					const { shouldSendEmail } = require("../../utils/notificationHelper");
					const canSendEmail = await shouldSendEmail(user, 'accountAndSecurity');
					if (canSendEmail) {
						let html = nunjucks.render('mails/account_locked.html', {
							NAME: user.name || user.email,
							unlockAccountLink: env.FRONTEND_URL + '/account/unlock',
							logoUrl: env.FRONTEND_URL
						});
						
						await transporter.sendMail({
							from: env.MAIL_FROM_ADDRESS,
							to: user.email,
							subject: "Your Nameword account is locked",
							html: html,
						});
						
						console.log(`Account locked email sent to ${user.email}`);
					} else {
						console.log(`Email notification disabled for user ${user.email} - skipping account locked email`);
					}
				} catch (emailError) {
					console.error("Error sending account locked email:", emailError);
				}
				
				await user.save();
				throw new ForbiddenError(
					"Your account has been locked due to multiple failed login attempts. Please check your email for unlock instructions."
				);
			} else {
				await user.save();
			}
			
			throw new BadRequestError("Invalid credentials");
		}

		// Reset failed login attempts on successful login
		if (user.failedLoginAttempts > 0) {
			user.failedLoginAttempts = 0;
			user.locked = false;
			user.lockedUntil = null;
			await user.save();
		}

		if (user.banned) {
			throw new ForbiddenError(
				"Your account has been banned. Please contact support for further assistance."
			);
		}

		if (user.deactivated) {
			throw new ForbiddenError(
				"Your account has been deactivated. Please contact support for further assistance."
			);
		}

		if (!user.isProfileVerified || user.notifyEmail){
			const { otp, expiresAt } = generateRandomOtp();

			await VerificationCode.findOneAndUpdate(
				{ email: user.email },
				{
					otp,
					expiresAt,
 				},
				{
					upsert: true,
					new: true,
					setDefaultsOnInsert: true,
				}
			);
			
			try {
				// Check if user has email notifications enabled for account and security
				const { shouldSendEmail } = require("../../utils/notificationHelper");
				const canSendEmail = await shouldSendEmail(user, 'accountAndSecurity');
				if (canSendEmail) {
					let html = nunjucks.render("mails/login_verification_code.html", { 
						otp, 
						name: user.name || user.email, 
						logoUrl: env.APP_URL 
					});
					const info = await transporter.sendMail({
						from: env.MAIL_FROM_ADDRESS,
						to: user.email,
						subject: "Your Nameword login code",
						html: html,
					});
					console.log("Login OTP email sent successfully:", info);
				} else {
					console.log(`Email notification disabled for user ${user.email} - skipping login OTP email`);
				}
			} catch (emailError) {
				console.error("Error sending login OTP email:", emailError);
				// Continue even if email fails, OTP is still saved
			}
			return res.status(200).json({ data: user, message: "OTP sent successfully.", success: true, expiresAt });
		}

		if (user.enabled2FA){
			if (!user.twoFactorSecret) {
				const result = await generate2FASecret(user.email);
				user.twoFactorSecret = result.secret;
				await user.save();
				return res.status(200).json({ qrCode: result.qrCode, success: true, data: user, message:"2FA is enabled. Scan the QR code with your app." });
			} else {
			
				const result = await generateQRFromSecret(user.email, user.twoFactorSecret);
				return res.status(200).json({ 
					qrCode: result.qrCode, 
					success: true, 
					data: user, 
					message: "2FA is enabled. You can scan the QR code again if needed, or enter your existing 2FA code to continue.",
					allowManualEntry: true
				});
			}
		}

		const userSession = await saveUserSession({ req, userId: user._id, loginType: "Email" });                                                                                  		                                                                                                                                                         				 		          
		const token = generateJwtToken(user, userSession._id);

		const loginDetails = await User.findById(user._id)
			.populate("membershipTier")
			.populate("badges.badge")
			.populate({
				path: 'apiKeys',
				match: {
					expiresAt: { $gt: new Date() },
					deletedAt: null
				},
				options: {
					sort: { createdAt: -1 },
					limit: 1
				}
			});
		const latestApiKey = loginDetails.apiKeys.length > 0 ? loginDetails.apiKeys[0].toJSON({ virtuals: true }) : null;
		let rewardPoints = await loginDetails.rewardPoints();

		let userData = await user.getProfileWithSignedURL();
		userData._doc.hasPassword = !!user.password;
		userData._doc.latestApiKey = latestApiKey;
		userData._doc.rewardPoints = rewardPoints;

		req.session.jwt = token;
		return res.status(200).json({ data: userData, token: token, message: "Logged in successfully.", success: true });
	}

	async currentUser(req, res, next) {
		const user = await User.findById(req.user.id)
		.populate("membershipTier")
		.populate("badges.badge")
			.populate({
				path: 'apiKeys',
				match: {
					expiresAt: { $gt: new Date() },
					deletedAt: null
				},
				options: {
					sort: { createdAt: -1 },
					limit: 1
				}
			});

		let rewardPoints = await user.rewardPoints();
		let userJson = user.toJSON({ virtuals: true });
		const latestApiKey = user.apiKeys.length > 0 ? user.apiKeys[0].toJSON({ virtuals: true }) : null;

		userJson.rewardPoints = rewardPoints;
		userJson.latestApiKey = latestApiKey;
		let userData = await user.getProfileWithSignedURL();

		userData._doc.hasPassword = !!user.password;
		userData._doc.latestApiKey = latestApiKey;
		userData._doc.rewardPoints = rewardPoints;

		return res.json({ data: userData });
	}    
                                                                                                                                                                                                            
	async logout(req, res, next) {
		await deleteUserSession(req?.user?.sessionId);
		req.session = null;
		req.user = null;
		return res.json({ message: "Logout successfully.", success:true});
	}
}

module.exports = new LoginController();
