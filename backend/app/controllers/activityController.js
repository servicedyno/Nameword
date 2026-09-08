const Activity = require("../models/activity");
const Domain = require("../models/Domain");
const User = require("../models/User");

/**
 * Save a new activity
 * @param {Object} activityData
 * @returns {Promise<Activity>}
 */
const saveActivity = async (activityData) => {
	const { userId, domain, activityType, activity, status } = activityData;

	const user = await User.findById(userId);
	if (!user) {
		throw new Error("User not found");
	}

	const newActivity = new Activity({
		user: userId,
		domain: domain,
		activityType,
		activity,
		status,
		userInfo: {
			name: user.name,
		},
	});
 
	return await newActivity.save();
};                                  
 
const getDomainActivity = async (req, res, next) => {
	try {
		const { domain } = req.params;
		const activities = await Activity.find({
			domain: domain,
			activityType: "domain",
		}).sort({ createdAt: -1 });
		res.json(activities);
	} catch (error) {
		next(error);
	}
};

const getDnsActivity = async (req, res, next) => {
	try {
		const { domain } = req.params;
		const activities = await Activity.find({
			domain: domain,
			activityType: "dns",
		}).sort({ createdAt: -1 });
		res.json(activities);
	} catch (error) {
		next(error);
	}
};

module.exports = {
	saveActivity,
	getDomainActivity,
	getDnsActivity,
};
