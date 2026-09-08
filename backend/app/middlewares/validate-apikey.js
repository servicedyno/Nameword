const NotAuthorizedError = require("../errors/NotAuthorizedError");
const { hmacHash, sessionizeUser } = require("../utils/common");
const User = require("../models/User");
const ForbiddenError = require("../errors/ForbiddenError");
const BadRequestError = require("../errors/BadRequestError");
const APIKeyController = require("../controllers/APIKeyController");

const validateAPIKey = async (req, res, next) => {
	let token = req.headers["x-api-key"];
	if (!token) {
		return res.status(400).json({
			success: false,
			message: "No API key provided. Please create an API key first and try again.",
			redirect: true
		});
	}

	let [userId, apiKey] = token.split("|");
	if (!userId || !apiKey) {
		return res.status(400).json({
			success: false,
			message: "Invalid API key format. Please create an API key first and try again.",
			redirect: true
		});
	}
	let tokenHash = hmacHash(apiKey);

	const user = await User.findById(userId).select("-password").populate({
		path: "apiKeys",
		match: { tokenHash, expiresAt: { $gt: new Date() }, deletedAt: null },
	});
	if (!user) {
		return res.status(400).json({
			success: false,
			message: "Expired API key. Please create an new API key and try again.",
			redirect: true
		});
	}
	if (user.apiKeys.length === 0) {
		return next();
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
	await APIKeyController.updateUseAPIKeyTime(tokenHash);
	req.user = sessionizeUser(user);
	next();
};

module.exports = validateAPIKey;
