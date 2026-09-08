const User = require('../models/User');


const shouldSendEmail = async (user, category) => {
	try {
			
		let userObj = user;
		if (typeof user === 'string') {
			userObj = await User.findById(user).select('notificationPreferences');
			if (!userObj) {
				console.warn(`User not found for userId: ${user}`);
				return true; 
			}
		}

		if (!userObj || !userObj.notificationPreferences) {
			return true; 
		}

		const preferences = userObj.notificationPreferences;
		
		if (preferences[category] && preferences[category].email === false) {
			return false;
		}

		return true;
	} catch (error) {
		console.error('Error checking notification preferences:', error);
		return true;
	}
};


const getUserWithPreferences = async (user) => {
	try {
		if (typeof user === 'string') {
			return await User.findById(user).select('notificationPreferences email name');
		}
		return user;
	} catch (error) {
		console.error('Error fetching user with preferences:', error);
		return null;
	}
};

module.exports = {
	shouldSendEmail,
	getUserWithPreferences,
};
