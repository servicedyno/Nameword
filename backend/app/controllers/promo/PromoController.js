const User = require("../../models/User");
const BadRequestError = require("../../errors/BadRequestError");
const NotFoundError = require("../../errors/NotFoundError");

const validatePromoCode = async (req, res) => {
	try {
		const { promoCode, discount } = req.body;
		const userId = req.user?._id || req.user?.id;

		if (!promoCode || typeof promoCode !== "string") {
			return res.status(400).json({
				success: false,
				message: "Promocode is required",
			});
		}

		if (!discount || typeof discount !== "number" || discount <= 0) {
			return res.status(400).json({
				success: false,
				message: "Valid discount amount is required",
			});
		}

		if (!userId) {
			return res.status(401).json({
				success: false,
				message: "User authentication required",
			});
		}

		const normalizedCode = promoCode.trim().toUpperCase();

		// Check if user has already used this promocode
		const user = await User.findById(userId);
		if (!user) {
			return res.status(404).json({
				success: false,
				message: "User not found",
			});
		}

		const hasUsedPromoCode = user.usedPromoCodes?.some(
			(used) => used.code.toUpperCase() === normalizedCode
		);

		if (hasUsedPromoCode) {
			return res.status(400).json({
				success: false,
				message: "This promocode has already been used by you",
				data: {
					valid: false,
					discount: 0,
					code: normalizedCode,
					alreadyUsed: true,
				},
			});
		}

		
		return res.json({
			success: true,
			message: "Promocode is valid",
			data: {
				valid: true,
				discount: discount, 
				code: normalizedCode,
				alreadyUsed: false,
			},
		});
	} catch (error) {
		console.error("Error validating promocode:", error);
		return res.status(500).json({
			success: false,
			message: "Error validating promocode",
			error: error.message,
		});
	}
};

/**
 * Mark promocode as used for user
 * Called after successful purchase
 */
const markPromoCodeAsUsed = async (userId, promoCode, orderReference = null) => {
	try {
		if (!userId || !promoCode) {
			console.warn("markPromoCodeAsUsed: Missing userId or promoCode");
			return;
		}

		const normalizedCode = promoCode.trim().toUpperCase();
		// Handle both string ID and ObjectId
		const user = await User.findById(userId.toString());

		if (!user) {
			console.warn(`markPromoCodeAsUsed: User not found for userId: ${userId}`);
			return;
		}

		// Check if already used
		const hasUsedPromoCode = user.usedPromoCodes?.some(
			(used) => used.code.toUpperCase() === normalizedCode
		);

		if (hasUsedPromoCode) {
			console.log(`Promocode ${normalizedCode} already marked as used for user ${userId}`);
			return;
		}

		// Add to used promocodes
		if (!user.usedPromoCodes) {
			user.usedPromoCodes = [];
		}

		user.usedPromoCodes.push({
			code: normalizedCode,
			usedAt: new Date(),
			orderReference: orderReference || null,
		});

		await user.save();
		console.log(`✅ Promocode ${normalizedCode} marked as used for user ${userId}`);
	} catch (error) {
		console.error("Error marking promocode as used:", error);
	}
};

module.exports = {
	validatePromoCode,
	markPromoCodeAsUsed,
};

