const schedule = require('node-schedule');
const moment = require('moment');
const Domain = require('../models/Domain');
const User = require('../models/User');
const transporter = require('../services/mailer');
const nunjucks = require('nunjucks');
const env = require('../../start/env');
const { shouldSendEmail } = require('../utils/notificationHelper');

// Send domain expiring soon email
const sendDomainExpiringSoonEmail = async (domain, daysUntilExpiry) => {
	try {
		const user = await User.findById(domain.user);
		if (!user || !user.email) return;

		const canSendEmail = await shouldSendEmail(user, 'serviceStatusAndChanges');
		if (!canSendEmail) {
			console.log(`Email notification disabled for user ${user.email} - skipping domain expiring soon email`);
			return;
		}

		const expiryDate = moment(domain.expirationDate).format("MMMM Do YYYY");
		
		let html = nunjucks.render('mails/domain_expiring_soon.html', {
			NAME: user.name || user.email,
			DOMAIN_NAME: domain.websiteName,
			DAYS: daysUntilExpiry,
			EXPIRY_DATE: expiryDate,
			renewDomainLink: env.FRONTEND_URL + `/domains/${domain.websiteName}/renew`,
			logoUrl: env.FRONTEND_URL
		});

		await transporter.sendMail({
			from: process.env.MAIL_FROM_ADDRESS,
			to: user.email,
			subject: `${domain.websiteName} expires in ${daysUntilExpiry} days`,
			html: html,
		});

		console.log(`Domain expiring soon email sent to ${user.email} for ${domain.websiteName}`);
	} catch (error) {
		console.error('Error sending domain expiring soon email:', error);
	}
};

// Send domain expired email
const sendDomainExpiredEmail = async (domain) => {
	try {
		const user = await User.findById(domain.user);
		if (!user || !user.email) return;

		// Check if user has email notifications enabled for service status and changes
		const canSendEmail = await shouldSendEmail(user, 'serviceStatusAndChanges');
		if (!canSendEmail) {
			console.log(`Email notification disabled for user ${user.email} - skipping domain expired email`);
			return;
		}

		const expiryDate = moment(domain.expirationDate).format("MMMM Do YYYY");
		const GRACE_DAYS = 30; // Grace period before domain is released
		
		let html = nunjucks.render('mails/domain_expired.html', {
			NAME: user.name || user.email,
			DOMAIN_NAME: domain.websiteName,
			EXPIRY_DATE: expiryDate,
			GRACE_DAYS: GRACE_DAYS,
			renewDomainLink: env.FRONTEND_URL + `/domains/${domain.websiteName}/renew`,
			logoUrl: env.FRONTEND_URL
		});

		await transporter.sendMail({
			from: process.env.MAIL_FROM_ADDRESS,
			to: user.email,
			subject: `${domain.websiteName} has expired`,
			html: html,
		});

		console.log(`Domain expired email sent to ${user.email} for ${domain.websiteName}`);
	} catch (error) {
		console.error('Error sending domain expired email:', error);
	}
};

// Check domains expiring soon and expired
const checkDomainExpiry = async () => {
	try {
		const today = moment().startOf('day');
		const sevenDaysFromNow = moment().add(7, 'days').endOf('day');
		const thirtyDaysFromNow = moment().add(30, 'days').endOf('day');
		const yesterday = moment().subtract(1, 'days').endOf('day');

		// Find domains expiring in 7 days
		const domainsExpiringSoon = await Domain.find({
			expirationDate: {
				$gte: today.toDate(),
				$lte: sevenDaysFromNow.toDate()
			},
			status: 'Active',
			deletedAt: { $exists: false },
			expiryReminderSent: { $ne: true }
		}).populate('user');

		for (const domain of domainsExpiringSoon) {
			const daysUntilExpiry = moment(domain.expirationDate).diff(today, 'days');
			await sendDomainExpiringSoonEmail(domain, daysUntilExpiry);
			
			// Mark reminder as sent
			domain.expiryReminderSent = true;
			await domain.save();
		}

		// Find domains that expired yesterday (to send expired notification)
		const expiredDomains = await Domain.find({
			expirationDate: {
				$gte: yesterday.startOf('day').toDate(),
				$lte: yesterday.endOf('day').toDate()
			},
			status: 'Active',
			deletedAt: { $exists: false },
			expiredNotificationSent: { $ne: true }
		}).populate('user');

		for (const domain of expiredDomains) {
			await sendDomainExpiredEmail(domain);
			
			// Mark expired notification as sent
			domain.expiredNotificationSent = true;
			await domain.save();
		}

		console.log(`Domain expiry check completed. Found ${domainsExpiringSoon.length} expiring soon, ${expiredDomains.length} expired.`);
	} catch (error) {
		console.error('Error in domain expiry check:', error);
	}
};

// Schedule the job to run daily at 12:00 AM
schedule.scheduleJob('0 0 * * *', () => {
	console.log('🔍 Checking for expiring and expired domains...');
	checkDomainExpiry();
});

module.exports = { checkDomainExpiry, sendDomainExpiringSoonEmail, sendDomainExpiredEmail };

