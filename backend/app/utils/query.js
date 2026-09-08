const mongoose = require('mongoose');
var debug = require('debug')('bozzname:server');


const assignTierAndBadges = async (userId) => {
	try {
		const User = mongoose.model('user');
		const MembershipTier = mongoose.model('membership_tier');
		const Badge = mongoose.model('badge');

		const user = await User.findById(userId);

		if (!user) {
			throw new Error('User not found');
		}
	
		const totalRewardPoints = await user.rewardPoints();
		//debug("Total Reward point", totalRewardPoints);
		let newTier;
	
		if (totalRewardPoints < 500) {
			newTier = await MembershipTier.findOne({ name: 'Starter' });
		}else if (totalRewardPoints < 2000) {
			newTier = await MembershipTier.findOne({ name: 'Pro' });
		} else if (totalRewardPoints < 5000) {
			newTier = await MembershipTier.findOne({ name: 'Elite' });
		} else {
			newTier = await MembershipTier.findOne({ name: 'VIP' });
		}
	
		if (!newTier) {
			throw new Error('Tier not found');
		}
	
		//debug("New Tier",newTier);
		//debug("User Tier", !user.membershipTier);
		//debug("equals Tier", !user.membershipTier.equals(newTier._id));
		if (!user.membershipTier || !user.membershipTier.equals(newTier._id)) {
			user.membershipTier = newTier._id;
			const userBadgeIds = user.badges.map(badge => badge.badge._id);
			//debug("userBadgeIds", userBadgeIds);
			const newBadges = await Badge.find({ membershipTier: newTier._id }).where('_id').nin(userBadgeIds);
			//debug("new badges", newBadges);
			newBadges.forEach(badge => {
				user.badges.push({ badge: badge._id });
			});
			await user.save();
		}
	}catch(error){
			console.error('Error assigning tier and badges:', error);
		}
	};
  
module.exports ={assignTierAndBadges};