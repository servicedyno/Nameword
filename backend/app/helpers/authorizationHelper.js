const Domain = require('../../app/models/Domain');
const CpanelAccount = require("../models/hosting/CpanelAccount");
const PleskAccount = require("../models/hosting/PleskAccount");

const domainBelongsToUser = async (domainId, userId) => {
	// Fetch the domain
	const domain = await Domain.findById(domainId);
	if (!domain) {
		throw new Error('Domain not found');
	}

	// Check if the domain belongs to the user
	if (domain.user.toString() !== userId.toString()) {
		throw new Error('Unauthorized domain access');
	}

	return domain;
};

const cPanelBelongsToUser = async (cPanelId, userId) => {
	const cPanelAccount = await CpanelAccount.findById(cPanelId).populate('domain');
	if (!cPanelAccount) {
		throw new Error('Account not found');
	}

	if (cPanelAccount.user.toString() !== userId.toString()) {
		throw new Error('Unauthorized cpanel account access');
	}

	return cPanelAccount;
}

const pleskBelongsToUser = async (pleskId, userId) => {
	const pleskAccount = await PleskAccount.findById(pleskId).populate('domain');
	if (!pleskAccount) {
		throw new Error('Account not found');
	}

	if (pleskAccount.user.toString() !== userId.toString()) {
		throw new Error('Unauthorized plesk account access');
	}

	return pleskAccount;
}

module.exports = {
	domainBelongsToUser,
	cPanelBelongsToUser,
	pleskBelongsToUser
}