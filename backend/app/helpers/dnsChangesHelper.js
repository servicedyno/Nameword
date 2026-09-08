const transporter = require('../services/mailer');
const nunjucks = require('nunjucks');
const env = require('../../start/env');
const User = require('../models/User');
const { shouldSendEmail } = require('../utils/notificationHelper');

const sendDNSChangesSummary = async ({ userId, domainName, changes }) => {
	try {
		if (!changes || changes.length === 0) return;

		const user = await User.findById(userId);
		if (!user || !user.email) return;

		// Check if user has email notifications enabled for service status and changes
		const canSendEmail = await shouldSendEmail(user, 'serviceStatusAndChanges');
		if (!canSendEmail) {
			console.log(`Email notification disabled for user ${user.email} - skipping DNS changes summary email`);
			return;
		}

		let html = nunjucks.render('mails/dns_changes_summary.html', {
			NAME: user.name || user.email,
			DOMAIN_NAME: domainName,
			CHANGES: changes,
			dnsCheckerLink: env.FRONTEND_URL + '/tools/dns-checker',
			dnsConfigLink: env.FRONTEND_URL + `/domains/${domainName}/dns`,
			logoUrl: env.FRONTEND_URL
		});

		await transporter.sendMail({
			from: process.env.MAIL_FROM_ADDRESS,
			to: user.email,
			subject: `DNS changes summary - ${domainName}`,
			html: html,
		});

		console.log(`DNS changes summary email sent to ${user.email} for ${domainName}`);
	} catch (error) {
		console.error('Error sending DNS changes summary email:', error);
	}
};

module.exports = { sendDNSChangesSummary };

