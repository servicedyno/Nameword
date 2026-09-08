// Twilio implementation (commented out - replaced with Telnyx)
// const twilio = require("twilio");
// const env = require("../../start/env");
// const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

// const twilioSendOtp = async (mobile) => {
// 	try {
// 		const verification = await client.verify.v2
// 			.services(env.TWILIO_VERIFY_SID)
// 			.verifications.create({ to: mobile, channel: "sms" });

// 		return { success: true, status: verification.status };
// 	} catch (error) {
// 		console.error("Twilio Error:", error);
// 		return { success: false, error: error.message };
// 	}
// };

// const twilioMobileOtpVerify = async (mobile, otp) => {
// 	try {
// 		const verificationCheck = await client.verify.v2
// 			.services(env.TWILIO_VERIFY_SID)
// 			.verificationChecks.create({
// 				code: otp,
// 				to: mobile,
// 			});

// 		if (verificationCheck?.status === "approved") {
// 			return { success: true, message: "OTP verified successfully!" };
// 		} else {
// 			return { success: false, error: "Invalid OTP!" };
// 		}
// 	} catch (error) {
// 		console.error("Twilio Verification Error:", error);
// 		return { success: false, error: "OTP verification failed!" };
// 	}
// };

// Telnyx implementation
const axios = require("axios");
const env = require("../../start/env");
const moment = require("moment");
const { generateRandomOtp } = require("../utils/common");
const VerificationCode = require("../models/VerificationCode");

const telnyxSendOtp = async (mobile) => {
	try {

		const { otp, expiresAt } = generateRandomOtp();


		await VerificationCode.deleteOne({ mobile });

		// Store OTP in database
		await VerificationCode.create({
			mobile,
			otp,
			expiresAt,
		});

		// Send SMS via Telnyx
		const message = `Your verification code is: ${otp}`;
		
		const response = await axios.post(
			"https://api.telnyx.com/v2/messages",
			{
				from: env.TELNYX_PHONE_NUMBER,
				to: mobile,
				text: message,
				messaging_profile_id: env.TELNYX_PROFILE_ID,
			},
			{
				headers: {
					Authorization: `Bearer ${env.TELNYX_ACCESS_TOKEN}`,
					"Content-Type": "application/json",
				},
			}
		);

		return { success: true, status: response.data?.data?.status || "sent" };
	} catch (error) {
		console.error("Telnyx Error:", error.response?.data || error.message);
		return { success: false, error: error.response?.data?.errors?.[0]?.detail || error.message };
	}
};

const telnyxMobileOtpVerify = async (mobile, otp) => {
	try {
		// Find the stored OTP
		const verificationCode = await VerificationCode.findOne({
			mobile,
			otp,
		});

		if (!verificationCode) {
			return { success: false, error: "Invalid OTP!" };
		}

		// Check if OTP is expired
		const now = moment();
		const isOtpExpired = moment(verificationCode.expiresAt).isBefore(now);

		if (isOtpExpired) {
			await VerificationCode.deleteOne({ mobile });
			return { success: false, error: "OTP has expired!" };
		}

		// Delete the used OTP
		await VerificationCode.deleteOne({ mobile });

		return { success: true, message: "OTP verified successfully!" };
	} catch (error) {
		console.error("Telnyx Verification Error:", error);
		return { success: false, error: "OTP verification failed!" };
	}                                                         
};


const twilioSendOtp = telnyxSendOtp;
const twilioMobileOtpVerify = telnyxMobileOtpVerify;

module.exports = { twilioSendOtp, twilioMobileOtpVerify };
