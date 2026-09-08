const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Add User Data
const getUserDataMiddleware = async (req, res, next) => {
	let user;
	console.log(req.user,req.session.jwt,req.session)
	try {
		const telegramId = req.body?.telegramId || req?.query?.telegramId;
		if (!!telegramId) {
			user = await User.findOne({ telegramId });
		} else {
				const token = req.headers.authorization.split(" ")[1];
			// const token = req.session.jwt;

			console.log("###Token", token);
			if (!token) {
				return res
					.status(401)
					.json({ message: "Unauthorized", success: false });
			}

			// Decode the token to get the user ID
			const decoded = jwt.verify(token, process.env.JWT_KEY);
			const userId = decoded.id;

			// Fetch user details from the database
			user = await User.findById(userId);
		}
		if (!user) {
			return res
				.status(404)
				.json({ message: "User not found", success: false });
		}
		req.user = user;
		next();
	} catch (err) {
		console.error(err); // Log the error for debugging
		return res.status(500).json({
			message: "Please provide telegram Id or user Id",
			success: false,
		});
	}
};

module.exports = {
	getUserDataMiddleware,
};
