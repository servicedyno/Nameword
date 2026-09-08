const schedule = require('node-schedule');
const moment = require('moment');
const Subscription = require('../models/Subscription');
const CpanelAccount = require('../models/hosting/CpanelAccount');
const PleskAccount = require('../models/hosting/PleskAccount');
const User = require('../models/User');
const transporter = require('../services/mailer');
const nunjucks = require('nunjucks');
const env = require('../../start/env');
const { shouldSendEmail } = require('../utils/notificationHelper');

// Calculate grace period based on plan type
const getGracePeriod = (planName) => {
	if (!planName) return 7; // Default grace period
	
	const planLower = planName.toLowerCase();
	if (planLower.includes('7 days') || planLower.includes('pro 7')) {
		return 1;
	} else if (planLower.includes('30 days') || planLower.includes('pro 30')) {
		return 2;
	} else if (planLower.includes('monthly')) {
		return 7;
	}
	return 7; // Default
};

// Send hosting expiring soon email
const sendHostingExpiringSoonEmail = async (hostingAccount, daysUntilExpiry, expiryDate, planName) => {
	try {
		const user = await User.findById(hostingAccount.user);
		if (!user || !user.email) return;

		// Check if user has email notifications enabled for service status and changes
		const canSendEmail = await shouldSendEmail(user, 'serviceStatusAndChanges');
		if (!canSendEmail) {
			console.log(`Email notification disabled for user ${user.email} - skipping hosting expiring soon email`);
			return;
		}

		const graceDays = getGracePeriod(planName);
		const formattedExpiryDate = moment(expiryDate).format("MMMM Do YYYY");
		
		let html = nunjucks.render('mails/hosting_expiring_soon.html', {
			NAME: user.name || user.email,
			PLAN_NAME: planName || 'Hosting',
			DAYS: daysUntilExpiry,
			EXPIRY_DATE: formattedExpiryDate,
			GRACE_DAYS: graceDays,
			renewHostingLink: env.FRONTEND_URL + '/hosting',
			logoUrl: env.FRONTEND_URL
		});

		await transporter.sendMail({
			from: process.env.MAIL_FROM_ADDRESS,
			to: user.email,
			subject: `Your hosting expires in ${daysUntilExpiry} days`,
			html: html,
		});

		console.log(`Hosting expiring soon email sent to ${user.email} for ${planName}`);
	} catch (error) {
		console.error('Error sending hosting expiring soon email:', error);
	}
};

// Send hosting grace period warning email
const sendHostingGracePeriodWarningEmail = async (hostingAccount, daysRemaining, expiryDate, planName) => {
	try {
		const user = await User.findById(hostingAccount.user);
		if (!user || !user.email) return;

		// Check if user has email notifications enabled for service status and changes
		const canSendEmail = await shouldSendEmail(user, 'serviceStatusAndChanges');
		if (!canSendEmail) {
			console.log(`Email notification disabled for user ${user.email} - skipping hosting grace period warning email`);
			return;
		}

		const graceDays = getGracePeriod(planName);
		const formattedExpiryDate = moment(expiryDate).format("MMMM Do YYYY");
		
		let html = nunjucks.render('mails/hosting_grace_period_warning.html', {
			NAME: user.name || user.email,
			PLAN_NAME: planName || 'Hosting',
			GRACE_DAYS: daysRemaining,
			EXPIRY_DATE: formattedExpiryDate,
			renewHostingLink: env.FRONTEND_URL + '/hosting',
			logoUrl: env.FRONTEND_URL
		});

		await transporter.sendMail({
			from: process.env.MAIL_FROM_ADDRESS,
			to: user.email,
			subject: `Grace period started — ${daysRemaining} day(s) remaining`,
			html: html,
		});

		console.log(`Hosting grace period warning email sent to ${user.email} for ${planName}`);
	} catch (error) {
		console.error('Error sending hosting grace period warning email:', error);
	}
};

// Send hosting pending deletion warning email
const sendHostingPendingDeletionWarningEmail = async (hostingAccount, daysUntilDeletion, deletionDate, planName) => {
	try {
		const user = await User.findById(hostingAccount.user);
		if (!user || !user.email) return;

		// Check if user has email notifications enabled for service status and changes
		const canSendEmail = await shouldSendEmail(user, 'serviceStatusAndChanges');
		if (!canSendEmail) {
			console.log(`Email notification disabled for user ${user.email} - skipping hosting pending deletion warning email`);
			return;
		}

		const formattedDeletionDate = moment(deletionDate).format("MMMM Do YYYY");
		
		let html = nunjucks.render('mails/hosting_pending_deletion_warning.html', {
			NAME: user.name || user.email,
			PLAN_NAME: planName || 'Hosting',
			DAYS: daysUntilDeletion,
			DELETION_DATE: formattedDeletionDate,
			renewHostingLink: env.FRONTEND_URL + '/hosting',
			logoUrl: env.FRONTEND_URL
		});

		await transporter.sendMail({
			from: process.env.MAIL_FROM_ADDRESS,
			to: user.email,
			subject: `Urgent: Hosting deleted in ${daysUntilDeletion} days`,
			html: html,
		});

		console.log(`Hosting pending deletion warning email sent to ${user.email} for ${planName}`);
	} catch (error) {
		console.error('Error sending hosting pending deletion warning email:', error);
	}
};

// Send hosting suspended email (grace period ended)
const sendHostingSuspendedEmail = async (hostingAccount, planName, suspensionDate) => {
	try {
		const user = await User.findById(hostingAccount.user);
		if (!user || !user.email) return;

		// Check if user has email notifications enabled for service status and changes
		const canSendEmail = await shouldSendEmail(user, 'serviceStatusAndChanges');
		if (!canSendEmail) {
			console.log(`Email notification disabled for user ${user.email} - skipping hosting suspended email`);
			return;
		}

		const DELETION_DAYS = 7; // Days until permanent deletion
		const deletionDate = moment(suspensionDate).add(DELETION_DAYS, 'days');
		const daysUntilDeletion = deletionDate.diff(moment(), 'days');
		
		let html = nunjucks.render('mails/hosting_suspended.html', {
			NAME: user.name || user.email,
			PLAN_NAME: planName || 'Hosting',
			DELETION_DAYS: daysUntilDeletion > 0 ? daysUntilDeletion : DELETION_DAYS,
			renewHostingLink: env.FRONTEND_URL + '/hosting',
			logoUrl: env.FRONTEND_URL
		});

		await transporter.sendMail({
			from: process.env.MAIL_FROM_ADDRESS,
			to: user.email,
			subject: 'Hosting suspended — Renew to restore',
			html: html,
		});

		console.log(`Hosting suspended email sent to ${user.email} for ${planName}`);
	} catch (error) {
		console.error('Error sending hosting suspended email:', error);
	}
};

// Check hosting subscriptions expiring soon
const checkHostingExpiry = async () => {
	try {
		const today = moment().startOf('day');
		const sevenDaysFromNow = moment().add(7, 'days').endOf('day');

		// Find subscriptions with cPanel licenses expiring in 7 days
		const expiringSubscriptions = await Subscription.find({
			'cPanel.expiryDate': {
				$gte: today.toDate(),
				$lte: sevenDaysFromNow.toDate()
			},
			'cPanel.status': 'active',
			status: { $in: ['active', 'pending_renewal'] },
			'cPanel.renewal.firstReminderSent': { $ne: true }
		})
		.populate('userId')
		.populate('cPanelPlanId');

		for (const subscription of expiringSubscriptions) {
			const daysUntilExpiry = moment(subscription.cPanel.expiryDate).diff(today, 'days');
			const planName = subscription.cPanelPlanId?.name || subscription.cPanelPlanId?.type || 'cPanel Hosting';
			
			// Find associated cPanel account
			const cpanelAccount = await CpanelAccount.findOne({
				user: subscription.userId._id,
				deletedAt: { $exists: false }
			});

			if (cpanelAccount) {
				await sendHostingExpiringSoonEmail(
					cpanelAccount,
					daysUntilExpiry,
					subscription.cPanel.expiryDate,
					planName
				);
				
				// Mark reminder as sent
				subscription.cPanel.renewal.firstReminderSent = true;
				subscription.cPanel.renewal.firstReminderSentAt = new Date();
				await subscription.save();
			}
		}

		// Check for VPS subscriptions that might include hosting (subscriptionEnd)
		const expiringVPSSubscriptions = await Subscription.find({
			subscriptionEnd: {
				$gte: today.toDate(),
				$lte: sevenDaysFromNow.toDate()
			},
			status: { $in: ['active', 'pending_renewal'] },
			'vpsPlanReminders.renewal.firstReminderSent': { $ne: true },
			cPanelPlanId: { $exists: true, $ne: null } // Has hosting plan
		})
		.populate('userId')
		.populate('cPanelPlanId')
		.populate('billingCycleId');

		for (const subscription of expiringVPSSubscriptions) {
			const daysUntilExpiry = moment(subscription.subscriptionEnd).diff(today, 'days');
			const planName = subscription.cPanelPlanId?.name || subscription.cPanelPlanId?.type || 'Hosting';
			
			// Find associated cPanel or Plesk account
			const cpanelAccount = await CpanelAccount.findOne({
				user: subscription.userId._id,
				deletedAt: { $exists: false }
			}) || await PleskAccount.findOne({
				user: subscription.userId._id,
				deletedAt: { $exists: false }
			});

			if (cpanelAccount) {
				await sendHostingExpiringSoonEmail(
					cpanelAccount,
					daysUntilExpiry,
					subscription.subscriptionEnd,
					planName
				);
				
				// Mark reminder as sent
				subscription.vpsPlanReminders.renewal.firstReminderSent = true;
				subscription.vpsPlanReminders.renewal.firstReminderSentAt = new Date();
				await subscription.save();
			}
		}

		// Check for hosting accounts in grace period (expired but not yet suspended)
		const yesterday = moment().subtract(1, 'days').endOf('day');
		const gracePeriodSubscriptions = await Subscription.find({
			$or: [
				{
					'cPanel.expiryDate': {
						$gte: yesterday.startOf('day').toDate(),
						$lte: yesterday.endOf('day').toDate()
					},
					'cPanel.status': 'active'
				},
				{
					subscriptionEnd: {
						$gte: yesterday.startOf('day').toDate(),
						$lte: yesterday.endOf('day').toDate()
					},
					status: { $in: ['active', 'pending_renewal'] },
					cPanelPlanId: { $exists: true, $ne: null }
				}
			],
			'cPanel.renewal.gracePeriodWarningSent': { $ne: true }
		})
		.populate('userId')
		.populate('cPanelPlanId');

		for (const subscription of gracePeriodSubscriptions) {
			const expiryDate = subscription.cPanel?.expiryDate || subscription.subscriptionEnd;
			const planName = subscription.cPanelPlanId?.name || subscription.cPanelPlanId?.type || 'Hosting';
			const graceDays = getGracePeriod(planName);
			
			if (expiryDate) {
				const graceEndDate = moment(expiryDate).add(graceDays, 'days');
				const daysRemaining = graceEndDate.diff(moment(), 'days');
				
				// Check if in grace period (expired but grace period not ended)
				if (moment().isAfter(expiryDate) && moment().isBefore(graceEndDate) && daysRemaining > 0) {
					const cpanelAccount = await CpanelAccount.findOne({
						user: subscription.userId._id,
						deletedAt: { $exists: false }
					}) || await PleskAccount.findOne({
						user: subscription.userId._id,
						deletedAt: { $exists: false }
					});

					if (cpanelAccount) {
						await sendHostingGracePeriodWarningEmail(
							cpanelAccount,
							daysRemaining,
							expiryDate,
							planName
						);
						
						// Mark warning as sent
						if (subscription.cPanel) {
							subscription.cPanel.renewal.gracePeriodWarningSent = true;
							subscription.cPanel.renewal.gracePeriodWarningSentAt = new Date();
						}
						await subscription.save();
					}
				}
			}
		}

		// Check for suspended hosting accounts (grace period ended)
		const suspendedCpanelAccounts = await CpanelAccount.find({
			status: 'suspended',
			deletedAt: { $exists: false },
			suspensionEmailSent: { $ne: true }
		}).populate('user');

		for (const account of suspendedCpanelAccounts) {
			// Find associated subscription to get plan name
			const subscription = await Subscription.findOne({
				userId: account.user._id,
				cPanelPlanId: { $exists: true, $ne: null }
			}).populate('cPanelPlanId');

			if (subscription) {
				const planName = subscription.cPanelPlanId?.name || subscription.cPanelPlanId?.type || account.plan || 'Hosting';
				const graceDays = getGracePeriod(planName);
				const expiryDate = subscription.cPanel?.expiryDate || subscription.subscriptionEnd;
				
				if (expiryDate) {
					const graceEndDate = moment(expiryDate).add(graceDays, 'days');
					const DELETION_DAYS = 7;
					const deletionDate = moment(graceEndDate).add(DELETION_DAYS, 'days');
					const daysUntilDeletion = deletionDate.diff(moment(), 'days');
					
					// Check if in pending deletion phase (after grace period, before permanent deletion)
					if (moment().isAfter(graceEndDate) && moment().isBefore(deletionDate) && daysUntilDeletion > 0) {
						// Check if pending deletion warning already sent
						const pendingDeletionWarningSent = subscription.cPanel?.renewal?.pendingDeletionWarningSent || false;
						
						if (!pendingDeletionWarningSent) {
							await sendHostingPendingDeletionWarningEmail(
								account,
								daysUntilDeletion,
								deletionDate.toDate(),
								planName
							);
							
							// Mark warning as sent
							if (subscription.cPanel) {
								subscription.cPanel.renewal.pendingDeletionWarningSent = true;
								subscription.cPanel.renewal.pendingDeletionWarningSentAt = new Date();
							}
							await subscription.save();
						}
					} else if (moment().isAfter(graceEndDate) && !account.suspensionEmailSent) {
						// Send suspended email if grace period just ended
						await sendHostingSuspendedEmail(account, planName, graceEndDate.toDate());
						
						// Mark email as sent
						account.suspensionEmailSent = true;
						await account.save();
					}
				}
			}
		}

		const suspendedPleskAccounts = await PleskAccount.find({
			status: 'suspended',
			deletedAt: { $exists: false },
			suspensionEmailSent: { $ne: true }
		}).populate('user');

		for (const account of suspendedPleskAccounts) {
			const planName = account.plan || 'Hosting';
			const graceDays = getGracePeriod(planName);
			const DELETION_DAYS = 7;
			
			// For Plesk, estimate based on account creation/update date
			// Assuming account was suspended recently, calculate deletion date
			const suspensionDate = account.updatedAt || account.createdAt || new Date();
			const deletionDate = moment(suspensionDate).add(graceDays + DELETION_DAYS, 'days');
			const daysUntilDeletion = deletionDate.diff(moment(), 'days');
			
			// Check if in pending deletion phase
			if (daysUntilDeletion > 0 && daysUntilDeletion <= DELETION_DAYS) {
				// Check if pending deletion warning already sent
				if (!account.pendingDeletionWarningSent) {
					await sendHostingPendingDeletionWarningEmail(
						account,
						daysUntilDeletion,
						deletionDate.toDate(),
						planName
					);
					
					account.pendingDeletionWarningSent = true;
					await account.save();
				}
			} else if (!account.suspensionEmailSent) {
				// Send suspended email if not sent yet
				await sendHostingSuspendedEmail(account, planName, suspensionDate);
				
				account.suspensionEmailSent = true;
				await account.save();
			}
		}

		console.log(`Hosting expiry check completed. Found ${expiringSubscriptions.length} cPanel licenses, ${expiringVPSSubscriptions.length} VPS subscriptions with hosting expiring soon, ${suspendedCpanelAccounts.length} suspended cPanel accounts, ${suspendedPleskAccounts.length} suspended Plesk accounts.`);
	} catch (error) {
		console.error('Error in hosting expiry check:', error);
	}
};

// Schedule the job to run daily at 12:00 AM
schedule.scheduleJob('0 0 * * *', () => {
	console.log('🔍 Checking for expiring hosting accounts...');
	checkHostingExpiry();
});

module.exports = { checkHostingExpiry, sendHostingExpiringSoonEmail };

