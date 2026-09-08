const User = require("../../models/User");
const jwt = require("jsonwebtoken");
const VerificationCode = require("../../models/VerificationCode");
const transporter = require("../../services/mailer");
const env = require("../../../start/env");
const nunjucks = require("nunjucks");
const { generateRandomOtp } = require("../../utils/common");
const { uploadFile, getSignedURL } = require("../../utils/gCloudStorage");
const {
	createClientOnBothProviders,
} = require("../../services/domainProviderClient");
const {
	RequestValidationError,
} = require("../../errors/RequestValidationError");
const fs = require("fs");
const BadRequestError = require("../../errors/BadRequestError");

class RegisterController {
	async register(req, res, next) {
		try {
			let profileImgPath = null;
			const file = req.file;
			if (file && !file.mimetype.startsWith("image")) {
				throw new RequestValidationError([
					{
						type: "field",
						path: "profileImg",
						msg: "Please upload an image file",
					},
				]);
			}
			if (file) {
				const uploadResult = await uploadFile(file);
				if (uploadResult) {
					profileImgPath = uploadResult[1]?.name;
				}
				fs.unlinkSync(req.file.path);
			}

			// Create user with profile image
			const userPayload = {
				...req.body,
				...(profileImgPath && { profileImg: profileImgPath }),
			};
			let user = await User.create(userPayload);

			// Create client on domain providers
			try {
				const clientData = {
					FirstName: user.name.split(" ")[0] || user.name,
					LastName: user.name.split(" ").slice(1).join(" ") || "",
					UserName: user.email,
					Password:
						req.body.password ||
						Math.random().toString(36).slice(-8),
					CompanyName: req.body.companyName || "Individual",
					Address1: req.body.address || "Not provided",
					City: req.body.city || "Not provided",
					StateName: req.body.state || "Not provided",
					CountryName: req.body.country || "US",
					Zip: req.body.zip || "00000",
					PhoneNo_cc: req.body.phoneCountryCode || "+1",
					PhoneNo: req.body.mobile || req.body.phone || "0000000000",
					Faxno_cc: req.body.faxCountryCode || "",
					FaxNo: req.body.fax || "",
					Alternate_Phone_cc:
						req.body.alternatePhoneCountryCode || "",
					Alternate_Phone: req.body.alternatePhone || "",
					Id: user._id.toString(),
					email: user.email,
				};

				const clientResponse = await createClientOnBothProviders(
					clientData
				);

				if (clientResponse.length > 0) {
					clientResponse.forEach(async (client) => {
						if (client.provider && client.responseData) {
							user.domainProviderClient[client.provider] = {
								clientId:
									client.responseData.clientId ||
									client.responseData.id ||
									client.responseData.customerId,
								username: clientData.UserName,
							};
						}
					});
				}

				await user.save();
			} catch (clientError) {
				console.error(
					"Failed to create domain provider client:",
					clientError
				);
			}

			const { otp, expiresAt } = generateRandomOtp();
			await VerificationCode.create({
				email: user.email,
				otp,
				expiresAt,
			});
			const profileUrl = await getSignedURL(profileImgPath);
			user.profileImg = profileUrl;
			const { shouldSendEmail } = require("../../utils/notificationHelper");
			const canSendEmail = await shouldSendEmail(user, 'accountAndSecurity');
			if (canSendEmail) {
				let html = nunjucks.render("mails/verification_code.html", { otp, name: user.name || user.email, logoUrl: env.FRONTEND_URL });
				const info = await transporter.sendMail({
					from: env.MAIL_FROM_ADDRESS,
					to: user.email,
					subject: "Verify your Nameword account",
					html: html, // html body
				});
			}
			return res.status(201).json({ data: user, message: "OTP sent successfully.", success: true, expiresAt });
		} catch (err) {
			next(err);
		}
	}

	async changeEmail(req,res,next){
		try {
			const { id , email } = req.body;

			const user = await User.findById(id);
			if (!user) {
			 throw new BadRequestError("User not found!");
			}
		
		// Check if email already exists (excluding soft-deleted users)
		const existingUser = await User.findOne({
			email: email,
			$or: [
				{ deletedAt: { $exists: false } },
				{ deletedAt: null }
			]
		});
		if (existingUser && existingUser._id.toString() !== id) {
			throw new BadRequestError("This email is already in use");
		}

			if (user.email === email) {
				throw new BadRequestError("New email cannot be the same as current email");
			}

			await User.findByIdAndUpdate(id, { email: email});

			const { otp, expiresAt } = generateRandomOtp();
			await VerificationCode.deleteOne({ email: email });
			
			await VerificationCode.create({
				email: email,
				otp,
				expiresAt,
			});

			const { shouldSendEmail } = require("../../utils/notificationHelper");
			const canSendEmail = await shouldSendEmail(user, 'accountAndSecurity');
			if (canSendEmail) {
				let html = nunjucks.render("mails/email_change_verification.html", { 
					NAME: user.name || email, 
					OTP_CODE: otp, 
					logoUrl: env.FRONTEND_URL 
				});
				const info = await transporter.sendMail({
					from: env.MAIL_FROM_ADDRESS,
					to: email,
					subject: "Verify your new email address",
					html: html, // html body
				});
			}
			return res.status(200).json({
				success: true,
				message: "Verification code sent to new email",
				data: {
					email: email,
					expiresAt,
				},
			});
		} catch (err) {
			next(err);
		}
	}

	async registerTelegramUser(req, res) {
		try {
			const { telegramId, name, email } = req.body;
			
			let user = await User.findOne({
				telegramId: telegramId,
				$or: [
					{ deletedAt: { $exists: false } },
					{ deletedAt: null }
				]
			});
			if (!user) {
				user = await User.create({
					name: name ?? email,
					telegramId,
					email,
					banned: false,
				});

				// Create client on domain providers
				try {
					const clientData = {
						FirstName: user.name.split(" ")[0] || user.name,
						LastName: user.name.split(" ").slice(1).join(" ") || "",
						UserName: user.email,
						Password:
							req.body.password ||
							Math.random().toString(36).slice(-8),
						CompanyName: req.body.companyName || "Individual",
						Address1: req.body.address || "Not provided",
						City: req.body.city || "Not provided",
						StateName: req.body.state || "Not provided",
						CountryName: req.body.country || "US",
						Zip: req.body.zip || "00000",
						PhoneNo_cc: req.body.phoneCountryCode || "+1",
						PhoneNo:
							req.body.mobile || req.body.phone || "0000000000",
						Faxno_cc: req.body.faxCountryCode || "",
						FaxNo: req.body.fax || "",
						Alternate_Phone_cc:
							req.body.alternatePhoneCountryCode || "",
						Alternate_Phone: req.body.alternatePhone || "",
						Id: user._id.toString(),
						email: user.email,
					};

					const clientResponse = await createClientOnBothProviders(
						clientData
					);

					if (clientResponse.length > 0) {
						clientResponse.forEach(async (client) => {
							if (client.provider && client.responseData) {
								user.domainProviderClient[client.provider] = {
									clientId:
										client.responseData.clientId ||
										client.responseData.id ||
										client.responseData.customerId,
									username: clientData.UserName,
								};
							}
						});
					}

					await user.save();
				} catch (clientError) {
					console.error(
						"Failed to create domain provider client:",
						clientError
					);
				}
			} else {
				return res.status(400).json({ error: "User already exists" });
			}
			const userJwt = jwt.sign(
				{
					id: user.id,
					email: user.email,
				},
				process.env.JWT_KEY
			);
			req.session = { jwt: userJwt };
			return res.status(201).json({ data: user });
		} catch (err) {
			return res.status(500).json({
				message: "Something went wrong!",
				details: err.message,
			});
		}
	}
}

module.exports = new RegisterController();
