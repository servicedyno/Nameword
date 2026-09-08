const axios = require("axios");
const schedule = require('node-schedule');
const winston = require("winston");
const transporter = require("../services/mailer");
const nunjucks = require("nunjucks");
const env = require("../../start/env");

const CpanelAccount = require('../models/hosting/CpanelAccount');
const PleskAccount = require('../models/hosting/PleskAccount');
const User = require('../models/User');

const { deletePleskAccount } = require("../utils/hosting");

const axiosInstance = axios.create({
	baseURL: process.env.WHM_SERVER_URL,
	headers: {
		Authorization: `whm ${process.env.WHM_USERNAME}:${process.env.WHM_API_KEY}`,
	},
});

schedule.scheduleJob('*/30 * * * *', async () => {
	const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

	const accountsToDelete = await CpanelAccount.find({
		plan: 'Freedom Plan',
		createdAt: { $lte: twelveHoursAgo },
		deletedAt: { $exists: false }
	});

	if (accountsToDelete.length > 0) {
		winston.info(`Found ${accountsToDelete.length} cPanel accounts to delete`);
	}

	for (const account of accountsToDelete) {
		try {
			// Get user info before deletion for email
			const user = await User.findById(account.user);
			const planName = account.plan || 'Hosting';
			
			await axiosInstance.get(`/json-api/removeacct?api.version=1&username=${account.username}`);
			await account.softDelete();

			// Send hosting deleted email
			if (user && user.email) {
				try {
					const { shouldSendEmail } = require("../utils/notificationHelper");
					const canSendEmail = await shouldSendEmail(user, 'serviceStatusAndChanges');
					if (canSendEmail) {
						let html = nunjucks.render('mails/hosting_deleted.html', {
							NAME: user.name || user.email,
							PLAN_NAME: planName,
							viewHostingPlansLink: env.FRONTEND_URL + '/hosting',
							logoUrl: env.FRONTEND_URL
						});
						
						await transporter.sendMail({
							from: process.env.MAIL_FROM_ADDRESS,
							to: user.email,
							subject: 'Hosting account deleted',
							html: html,
						});
						
						console.log(`Hosting deleted email sent to ${user.email} for ${planName}`);
					}
				} catch (emailError) {
					console.error("Error sending hosting deleted email:", emailError);
				}
			}

			console.log(`Deleted cPanel account for user: ${account.username}`);
			winston.info(`Deleted cPanel account for user: ${account.username}`);
		} catch (error) {
			console.error(`Failed to delete cPanel account for user: ${account.username}`, error);
			winston.error(`Failed to delete cPanel account for user: ${account.username}`, error);
		}
	}
});

// write a same job for Plesk instead of Cpanel
schedule.scheduleJob('*/30 * * * *', async () => {
	const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

	const accountsToDelete = await PleskAccount.find({
		plan: 'Freedom Plan',
		createdAt: { $lte: twelveHoursAgo },
		deletedAt: { $exists: false }
	});

	if (accountsToDelete.length > 0) {
		winston.info(`Found ${accountsToDelete.length} Plesk accounts to delete`);
	}

	for (const account of accountsToDelete) {
		try {
			const { success, message } = await deletePleskAccount(account, true);

			if (success) {
				// Email is already sent in deletePleskAccount function
				console.log(`Deleted Plesk account for user: ${account.username}`);
				winston.info(`Deleted Plesk account for user: ${account.username}`);
			} else {
				console.error(`Failed to delete Plesk account for user: ${account.username}`, message);
				winston.error(`Failed to delete Plesk account for user: ${account.username}`, message);
			}
		} catch (error) {
			console.error(`Failed to delete Plesk account for user: ${account.username}`, error);
			winston.error(`Failed to delete Plesk account for user: ${account.username}`, error);
		}
	}
});


console.log('Scheduled job to delete expired cPanel accounts is set up.');
