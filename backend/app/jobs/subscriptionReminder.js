const schedule = require('node-schedule');
const moment = require('moment');
const Subscription = require('../models/Subscription');
const transporter = require('../services/mailer');
const Wallet = require('../models/Wallet');
const { shouldSendEmail } = require('../utils/notificationHelper');

const REMINDER_MINUTES_BEFORE_EXPIRY = 15;
const FIRST_REMINDER_DAYS_MONTHLY = 5;
const FINAL_REMINDER_DAYS_MONTHLY = 1;
const FIRST_REMINDER_DAYS_LONG_TERM = 30;
const FINAL_REMINDER_DAYS_LONG_TERM = 5;

const nunjucks = require("nunjucks");
const env = require("../../start/env");

// Send Reminder Email
const sendReminderEmail = async ({ subscription, timeUnit, reminderTime }) => {
    const { userId: user, billingCycleId: billingCycle, vmId: vpsDetails, osId: os, autoRenewable, price, cPanelPlanId: cPanelDetails } = subscription;

    const canSendEmail = await shouldSendEmail(user, 'subscriptionsAndPayments');
    if (!canSendEmail) {
        console.log(`Email notification disabled for user ${user.email || user._id} - skipping subscription reminder email`);
        return;
    }

    const plan = `${billingCycle?.type} VPS Plan`;
    
    // For 7 days reminder, use template
    if (reminderTime === 7 && timeUnit === 'days') {
        try {
            const renewalDate = moment(subscription.subscriptionEnd).format("MMMM Do YYYY");
            const paymentMethod = "Wallet"; // Default, can be enhanced
            
            let html = nunjucks.render('mails/subscription_renewal_reminder.html', {
                NAME: user.name || user.email,
                PRODUCT_NAME: plan,
                RENEWAL_DATE: renewalDate,
                CURRENCY: 'USD',
                AMOUNT: price.toFixed(2),
                PAYMENT_METHOD: paymentMethod,
                updatePaymentLink: env.FRONTEND_URL + '/account/payment',
                manageSubscriptionLink: env.FRONTEND_URL + '/account/subscriptions',
                logoUrl: env.FRONTEND_URL
            });

            await transporter.sendMail({
                from: process.env.MAIL_FROM_ADDRESS,
                to: user.email,
                subject: `Your ${plan} renews in 7 days`,
                html: html,
            });

            console.log(`Reminder email sent to ${user.email}`);
            return;
        } catch (error) {
            console.error('Error sending reminder email with template:', error);
            // Fall through to inline HTML
        }
    }
    
    const emailHtml = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #ff9800; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0;">Reminder!</h1>
        </div>
        <div style="padding: 10px 20px; background-color: #f9f9f9; border-radius: 0 0 10px 10px;">
            <p style="font-size: 18px; line-height: 1.6;">
                Hello <strong>${user?.name}</strong>,
            </p>
            <p style="font-size: 18px; line-height: 1.6;">
                This is a friendly reminder that your <strong style="text-transform: capitalize;">${billingCycle?.type} Plan</strong> will automatically renew after <strong>${reminderTime} ${timeUnit}</strong>.
            </p>
            <p style="font-size: 18px; line-height: 1.6; color: #ff9800;">
                Here’s your VPS details:
            </p>

            <table style="width: 100%; margin-top: 10px; border-collapse: separate; border-spacing: 0 10px;">
              <tr>
                  <td style="font-size: 16px; padding: 15px; background-color: #eee; border: 1px solid #ddd; border-radius: 5px;">
                      <strong>VPS Instance Name:</strong> ${vpsDetails?.label}
                  </td>
              </tr>
              <tr>
                  <td style="font-size: 16px; padding: 15px; background-color: #eee; border: 1px solid #ddd; border-radius: 5px;">
                      <strong>OS System:</strong> ${os?.name ?? 'Not Selected'}
                  </td>
              </tr>
              ${cPanelDetails?.type ? `<tr>
                  <td style="font-size: 16px; padding: 15px; background-color: #eee; border: 1px solid #ddd; border-radius: 5px;">
                      <strong>CPanel:</strong> ${cPanelDetails?.type ?? 'Not Selected'}
                  </td>
              </tr>` : ``}
              <tr>
                  <td style="font-size: 16px; padding: 15px; background-color: #eee; border: 1px solid #ddd; border-radius: 5px;">
                      <strong>Price:</strong> $${price}
                  </td>
              </tr>
              <tr>
                  <td style="font-size: 16px; padding: 15px; background-color: #eee; border: 1px solid #ddd; border-radius: 5px;">
                      <strong>Billing Cycle:</strong> ${billingCycle?.type}
                  </td>
              </tr>
              <tr>
                  <td style="font-size: 16px; padding: 15px; background-color: #eee; border: 1px solid #ddd; border-radius: 5px;">
                      <strong>Auto Renewal Status:</strong> ${autoRenewable ? "Enabled" : "Disabled"}
                  </td>
              </tr>
            </table>

            <p style="font-size: 18px; margin-top: 10px; line-height: 1.6;">
                If you wish to cancel the renewal, please take action immediately in your account dashboard.
            </p>
            
        </div>
    </div>
  `;

    try {

        const mailResponse = await transporter.sendMail({
            from: process.env.MAIL_FROM_ADDRESS,
            to: user.email,
            subject: `⏳ Reminder: Your ${plan} Will Renew Soon`,
            html: emailHtml,
        });

        console.log(`Reminder email sent to ${user.email}: ${mailResponse.messageId}`);
    } catch (error) {
        console.error('Error sending reminder email:', error);
    }
};

// Send Insufficient funds Email
const sendInsufficientEmail = async ({ subscription, timeUnit, reminderTime }) => {
    const { userId: user, billingCycleId: billingCycle, vmId: vpsDetails, osId: os, autoRenewable, price, cPanelPlanId: cPanelDetails } = subscription;

    // Check if user has email notifications enabled for subscriptions and payments
    const canSendEmail = await shouldSendEmail(user, 'subscriptionsAndPayments');
    if (!canSendEmail) {
        console.log(`Email notification disabled for user ${user.email || user._id} - skipping insufficient funds email`);
        return;
    }

    const userEmailHtml = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #ff4d4d; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0;">⚠ Insufficient Funds for Renewal</h1>
        </div>
        <div style="padding: 10px 20px; background-color: #f9f9f9; border-radius: 0 0 10px 10px;">
            <p style="font-size: 18px; line-height: 1.6;">
                Hello <strong>${user.name}</strong>,
            </p>
            <p style="font-size: 18px; line-height: 1.6; color: #ff4d4d;">
                Your <strong>${billingCycle.type} VPS Plan</strong> is set to renew in <strong>${reminderTime} ${timeUnit}</strong>, but your wallet has insufficient funds.
            </p>
            <p style="font-size: 18px;">
                <strong>Required Amount:</strong> $${price} (USD)
            </p>

            <!-- VPS Details -->
             <table style="width: 100%; margin-top: 10px; border-collapse: separate; border-spacing: 0 10px;">
              <tr>
                  <td style="font-size: 16px; padding: 15px; background-color: #eee; border: 1px solid #ddd; border-radius: 5px;">
                      <strong>VPS Instance Name:</strong> ${vpsDetails?.label}
                  </td>
              </tr>
              <tr>
                  <td style="font-size: 16px; padding: 15px; background-color: #eee; border: 1px solid #ddd; border-radius: 5px;">
                      <strong>OS System:</strong> ${os?.name ?? 'Not Selected'}
                  </td>
              </tr>
              ${cPanelDetails?.type ? `<tr>
                  <td style="font-size: 16px; padding: 15px; background-color: #eee; border: 1px solid #ddd; border-radius: 5px;">
                      <strong>CPanel:</strong> ${cPanelDetails?.type ?? 'Not Selected'}
                  </td>
              </tr>` : ``}
              <tr>
                  <td style="font-size: 16px; padding: 15px; background-color: #eee; border: 1px solid #ddd; border-radius: 5px;">
                      <strong>Price:</strong> $${price}
                  </td>
              </tr>
              <tr>
                  <td style="font-size: 16px; padding: 15px; background-color: #eee; border: 1px solid #ddd; border-radius: 5px;">
                      <strong>Billing Cycle:</strong> ${billingCycle?.type}
                  </td>
              </tr>
              <tr>
                  <td style="font-size: 16px; padding: 15px; background-color: #eee; border: 1px solid #ddd; border-radius: 5px;">
                      <strong>Auto Renewal Status:</strong> ${autoRenewable ? "Enabled" : "Disabled"}
                  </td>
              </tr>
            </table>

            <p style="font-size: 18px;">
                Please add funds or contact support for any help.
            </p>

            <!-- Footer -->
            <div style="padding-top: 20px; color: #7f8c8d; font-size: 12px; text-align: center;">
                This is an automated message. Please do not reply to this email.
            </div>
        </div>
    </div>
  `;

    const adminEmailHtml = ` 
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #ff9800; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0;">⚠ User Insufficient Funds for Renewal</h1>
        </div>
        <div style="padding: 20px; background-color: #f9f9f9; border-radius: 0 0 10px 10px;">
            <p style="font-size: 18px;">
                User <strong>${user.name}</strong> ${user?.email ? `<a href="mailto:${user.email}" style="color: #007bff;">${user.email}</a>` : ""} has insufficient funds for auto-renewal.
            </p>
            <p style="font-size: 18px; color: #ff4d4d;">
                <strong>Plan:</strong> ${billingCycle.type} VPS Plan
            </p>
            <p style="font-size: 18px;">
                <strong>Required Amount:</strong> $${price} (USD)
            </p>
            <p style="font-size: 18px;">
                Renewal is scheduled in <strong>${reminderTime} ${timeUnit}</strong>.
            </p>

            <!-- VPS Details -->
            <table style="width: 100%; margin-top: 10px; border-collapse: separate; border-spacing: 0 10px;">
            <tr>
                <td style="font-size: 16px; padding: 15px; background-color: #eee; border: 1px solid #ddd; border-radius: 5px;">
                    <strong>VPS Instance Name:</strong> ${vpsDetails?.label}
                </td>
            </tr>
            <tr>
                <td style="font-size: 16px; padding: 15px; background-color: #eee; border: 1px solid #ddd; border-radius: 5px;">
                    <strong>OS System:</strong> ${os?.name ?? 'Not Selected'}
                </td>
            </tr>
            ${cPanelDetails?.type ? `<tr>
                <td style="font-size: 16px; padding: 15px; background-color: #eee; border: 1px solid #ddd; border-radius: 5px;">
                    <strong>CPanel:</strong> ${cPanelDetails?.type ?? 'Not Selected'}
                </td>
            </tr>` : ``}
            <tr>
                <td style="font-size: 16px; padding: 15px; background-color: #eee; border: 1px solid #ddd; border-radius: 5px;">
                    <strong>Price:</strong> $${price}
                </td>
            </tr>
            <tr>
                <td style="font-size: 16px; padding: 15px; background-color: #eee; border: 1px solid #ddd; border-radius: 5px;">
                    <strong>Billing Cycle:</strong> ${billingCycle?.type}
                </td>
            </tr>
            <tr>
                <td style="font-size: 16px; padding: 15px; background-color: #eee; border: 1px solid #ddd; border-radius: 5px;">
                    <strong>Auto Renewal Status:</strong> ${autoRenewable ? "Enabled" : "Disabled"}
                </td>
            </tr>
            </table>
            <p style="font-size: 18px;">
            Please follow up if necessary.
            </p>

            <!-- Contact User Button -->
            ${user?.email ? `
                <div style="text-align: center; margin-top: 20px;">
                    <a href="mailto:${user.email}" 
                    style="background-color: #007bff; color: white; text-decoration: none; padding: 12px 24px; font-size: 18px; border-radius: 5px; display: inline-block;">
                        📧 Contact User
                    </a>
                </div>` : ""}
        </div>
    </div>`;


    try {

        const userMailResponse = await transporter.sendMail({
            from: process.env.MAIL_FROM_ADDRESS,
            to: user.email,
            subject: `⚠ Insufficient Funds: Your ${billingCycle.type} VPS Plan Renews in ${reminderTime} ${timeUnit}`,
            html: userEmailHtml,
        });

        const adminMailResponse = await transporter.sendMail({
            from: process.env.MAIL_FROM_ADDRESS,
            to: process.env.ADMIN_MAIL_ADDRESS,
            subject: `⚠ User ${user.name} Has Insufficient Funds for Auto-Renewal`,
            html: adminEmailHtml,
        });

        console.log(`VPS Plan Insufficient email sent to ${user.email}: ${userMailResponse.messageId}`);
        console.log(`VPS Plan Insufficient email sent to Admin ${process.env.ADMIN_MAIL_ADDRESS}: ${adminMailResponse.messageId}`);
    } catch (error) {
        console.error('Error sending Insufficent funds email:', error);
    }
};

// Send Expiry Email
const sendExpiryEmail = async ({ subscription, timeUnit, reminderTime }) => {
    const { userId: user, billingCycleId: billingCycle, vmId: vpsDetails, osId: os, cPanelPlanId: cPanelDetails, price, autoRenewable } = subscription;

    // Check if user has email notifications enabled for subscriptions and payments
    const canSendEmail = await shouldSendEmail(user, 'subscriptionsAndPayments');
    if (!canSendEmail) {
        console.log(`Email notification disabled for user ${user.email || user._id} - skipping expiry email`);
        return;
    }

    const plan = `${billingCycle.type} VPS Plan`;
    const emailHtml = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #ff4d4d; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0;">⚠ Urgent: Your VPS Will Expire Soon!</h1>
        </div>
        <div style="padding: 10px 20px; background-color: #f9f9f9; border-radius: 0 0 10px 10px;">
            <p style="font-size: 18px; line-height: 1.6;">
                Hello <strong>${user.name}</strong>,
            </p>
            <p style="font-size: 18px; line-height: 1.6; color: #ff4d4d;">
                Your <strong style="text-transform: capitalize;">${billingCycle.type} Plan</strong> is set to <strong>expire after ${reminderTime} ${timeUnit}</strong>!
            </p>
            <p style="font-size: 18px; line-height: 1.6;">
                To prevent service disruption, please renew your subscription before it expires.
            </p>

            <p style="font-size: 18px; line-height: 1.6; color: #ff4d4d;">
                Here’s your VPS details:
            </p>

            <table style="width: 100%; margin-top: 10px; border-collapse: separate; border-spacing: 0 10px;">
              <tr>
                  <td style="font-size: 16px; padding: 15px; background-color: #eee; border: 1px solid #ddd; border-radius: 5px;">
                      <strong>VPS Instance Name:</strong> ${vpsDetails?.label}
                  </td>
              </tr>
              <tr>
                  <td style="font-size: 16px; padding: 15px; background-color: #eee; border: 1px solid #ddd; border-radius: 5px;">
                      <strong>OS System:</strong> ${os?.name ?? 'Not Selected'}
                  </td>
              </tr>
              ${cPanelDetails?.type ? `<tr>
                  <td style="font-size: 16px; padding: 15px; background-color: #eee; border: 1px solid #ddd; border-radius: 5px;">
                      <strong>CPanel:</strong> ${cPanelDetails.type ?? 'Not Selected'}
                  </td>
              </tr>` : ``}
              <tr>
                  <td style="font-size: 16px; padding: 15px; background-color: #eee; border: 1px solid #ddd; border-radius: 5px;">
                      <strong>Price:</strong> $${price}
                  </td>
              </tr>
              <tr>
                  <td style="font-size: 16px; padding: 15px; background-color: #eee; border: 1px solid #ddd; border-radius: 5px;">
                      <strong>Billing Cycle:</strong> ${billingCycle.type}
                  </td>
              </tr>
              <tr>
                  <td style="font-size: 16px; padding: 15px; background-color: #eee; border: 1px solid #ddd; border-radius: 5px;">
                      <strong>Auto Renewal Status:</strong> ${autoRenewable ? "Enabled" : "Disabled"}
                  </td>
              </tr>
            </table>

            <p style="font-size: 18px; line-height: 1.6; margin-top: 15px;">
                If you take no action, your VPS will be deactivated once the plan expires.
            </p>

        </div>
    </div>
  `;

    try {
        const mailResponse = await transporter.sendMail({
            from: process.env.MAIL_FROM_ADDRESS,
            to: user.email,
            subject: `⚠ Urgent: Your ${plan} Will Expire Soon!`,
            html: emailHtml,
        });

        console.log(`Expiry warning email sent to ${user.email}: ${mailResponse.messageId}`);
    } catch (error) {
        console.error('Error sending expiry warning email:', error);
    }
};

// Function to check hourly subscriptions and send reminders
const processHourlyExpiringSubscriptions = async () => {
    try {
        const currentDate = moment();
        const reminderTime = REMINDER_MINUTES_BEFORE_EXPIRY;

        // Fetch subscriptions that are about to expire
        const subscriptions = await Subscription.aggregate([
            {
                $lookup: {
                    from: 'vpsbillingcyclediscounts',
                    localField: 'billingCycleId',
                    foreignField: '_id',
                    as: 'billingCycleId'
                }
            },
            { $unwind: '$billingCycleId' },

            { $lookup: { from: 'vpsplans', localField: 'planId', foreignField: '_id', as: 'planId' } },
            { $unwind: { path: '$planId', preserveNullAndEmptyArrays: true } },

            { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'userId' } },
            { $unwind: { path: '$userId', preserveNullAndEmptyArrays: true } },

            { $lookup: { from: 'cpanelplans', localField: 'cPanelPlanId', foreignField: '_id', as: 'cPanelPlanId' } },
            { $unwind: { path: '$cPanelPlanId', preserveNullAndEmptyArrays: true } },

            { $lookup: { from: 'operatingsystems', localField: 'osId', foreignField: '_id', as: 'osId' } },
            { $unwind: { path: '$osId', preserveNullAndEmptyArrays: true } },

            { $lookup: { from: 'vps', localField: 'vmId', foreignField: '_id', as: 'vmId' } },
            { $unwind: { path: '$vmId', preserveNullAndEmptyArrays: true } },

            {
                $match: {
                    'billingCycleId.type': 'Hourly',
                    status: 'active',
                    // subscriptionEnd: { $lte: currentDate.clone().add(reminderTime, "minutes").toDate() },
                    $or: [
                        { "vpsPlanReminders.renewal.firstReminderSent": false },
                        { "vpsPlanReminders.renewal.firstReminderSent": { $exists: false } }
                    ]
                }
            }
        ]);

        console.log("Hourly subscriptions needing reminders:", subscriptions.length);

        for (const subscription of subscriptions) {
            const subscriptionEnd = moment(subscription.subscriptionEnd);
            const minutesRemaining = subscriptionEnd.diff(currentDate, "minutes");

            console.log(`🔍 Subscription ${subscription._id}: ${minutesRemaining} minutes remaining until expiry.`);

            // Check if already sent
            if (subscription?.vpsPlanReminders?.renewal?.firstReminderSent) {
                console.log(`⏭️ Skipping subscription ${subscription._id}, already sent reminder.`);
                continue;
            }

            if (subscriptionEnd.isBefore(currentDate.clone().add(reminderTime, 'minutes'))) {
                const user = subscription.userId;
                console.log(`📧 Sending hourly reminder for subscription ${subscription._id} to ${user.email}`);

                if (subscription?.autoRenewable) {
                    const wallet = await Wallet.findOne({ userId: user });
                    if (subscription.price > wallet.balance.get("USD")) {
                        await sendInsufficientEmail({ subscription, timeUnit: "Minutes", reminderTime: reminderTime });
                    } else {
                        await sendReminderEmail({ subscription, timeUnit: "Minutes", reminderTime: reminderTime });
                    }
                } else {
                    await sendExpiryEmail({ subscription, timeUnit: "Minutes", reminderTime: reminderTime });
                }

                // ✅ **Update First Reminder as Sent**
                await Subscription.updateOne(
                    { _id: subscription._id },
                    {
                        $set: {
                            "vpsPlanReminders.renewal.firstReminderSent": true,
                            "vpsPlanReminders.renewal.firstReminderSentAt": new Date()
                        }
                    }
                );

                console.log(`✅ Hourly reminder sent to ${user.email} for subscription ${subscription._id}`);
            }
        }
    } catch (error) {
        console.error('❌ Error checking hourly subscriptions:', error);
    }
};

// Function to check other subscriptions and send reminders
const processOtherExpiringSubscriptions = async () => {
    try {
        const today = moment().startOf("day");
        // Find subscriptions that are expiring within the next reminderDays
        const subscriptions = await Subscription.aggregate([
            {
                $lookup: {
                    from: 'vpsbillingcyclediscounts',
                    localField: 'billingCycleId',
                    foreignField: '_id',
                    as: 'billingCycleId'
                }
            },
            { $unwind: '$billingCycleId' },

            { $lookup: { from: 'vpsplans', localField: 'planId', foreignField: '_id', as: 'planId' } },
            { $unwind: { path: '$planId', preserveNullAndEmptyArrays: true } },

            { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'userId' } },
            { $unwind: { path: '$userId', preserveNullAndEmptyArrays: true } },

            { $lookup: { from: 'cpanelplans', localField: 'cPanelPlanId', foreignField: '_id', as: 'cPanelPlanId' } },
            { $unwind: { path: '$cPanelPlanId', preserveNullAndEmptyArrays: true } },

            { $lookup: { from: 'operatingsystems', localField: 'osId', foreignField: '_id', as: 'osId' } },
            { $unwind: { path: '$osId', preserveNullAndEmptyArrays: true } },

            { $lookup: { from: 'vps', localField: 'vmId', foreignField: '_id', as: 'vmId' } },
            { $unwind: { path: '$vmId', preserveNullAndEmptyArrays: true } },

            {
                $match: {
                    'billingCycleId.type': { $in: ['Monthly', 'Quarterly', 'Annually'] },
                    status: 'active',
                    $or: [
                        // First Reminder not sent
                        { "vpsPlanReminders.renewal.firstReminderSent": false },
                        { "vpsPlanReminders.renewal.firstReminderSent": { $exists: false } },
                        { "vpsPlanReminders.renewal.firstReminderSentAt": { $lt: today.clone().subtract(1, "days").toDate() } },

                        // Final Reminder not sent
                        { "vpsPlanReminders.renewal.finalReminderSent": false },
                        { "vpsPlanReminders.renewal.finalReminderSent": { $exists: false } },
                        { "vpsPlanReminders.renewal.finalReminderSentAt": { $lt: today.clone().subtract(1, "days").toDate() } }
                    ]
                }
            }
        ]);
        console.log("Long term subscriptions needing reminders:", subscriptions.length);
        for (const subscription of subscriptions) {
            const expirationDate = moment(subscription.subscriptionEnd);
            const billingType = subscription.billingCycleId.type;

            let reminderDays = 0;
            let sendFirstReminder = false;
            let sendFinalReminder = false;
            const dayDifference = expirationDate.diff(today, "days");
            console.log("Day difference", dayDifference);
            // Check for first & final reminders separately
            if (billingType === "Monthly") {
                if (!subscription.vpsPlanReminders?.renewal?.firstReminderSent && dayDifference === FIRST_REMINDER_DAYS_MONTHLY) {
                    reminderDays = FIRST_REMINDER_DAYS_MONTHLY;
                    sendFirstReminder = true;
                } else if (!subscription.vpsPlanReminders?.renewal?.finalReminderSent && dayDifference === FINAL_REMINDER_DAYS_MONTHLY) {
                    reminderDays = FINAL_REMINDER_DAYS_MONTHLY;
                    sendFinalReminder = true;
                }
            } else if (["Quarterly", "Annually"].includes(billingType)) {
                if (!subscription.vpsPlanReminders?.renewal?.firstReminderSent && dayDifference === FIRST_REMINDER_DAYS_LONG_TERM) {
                    reminderDays = FIRST_REMINDER_DAYS_LONG_TERM;
                    sendFirstReminder = true;
                } else if (!subscription.vpsPlanReminders?.renewal?.finalReminderSent && dayDifference === FINAL_REMINDER_DAYS_LONG_TERM) {
                    reminderDays = FINAL_REMINDER_DAYS_LONG_TERM;
                    sendFinalReminder = true;
                }
            }

            const user = subscription.userId;
            console.log(`Sending ${reminderDays} days reminder for subscription ${subscription._id}`);
            if (reminderDays === 0) {
                console.log(`⏭️ Skipping subscription ${subscription._id}, ${dayDifference} not within reminder range.`);
                continue;
            }

            if (sendFirstReminder || sendFinalReminder) {
                if (subscription.autoRenewable) {
                    const wallet = await Wallet.findOne({ userId: user });
                    if (subscription.price > wallet.balance.get("USD")) {
                        await sendInsufficientEmail({ subscription, timeUnit: "Days", reminderTime: reminderDays });
                    } else {
                        await sendReminderEmail({ subscription, timeUnit: "Days", reminderTime: reminderDays });
                    };
                } else {
                    await sendExpiryEmail({ subscription, timeUnit: "Days", reminderTime: reminderDays });
                }

                if (sendFinalReminder) {
                    await Subscription.updateOne(
                        { _id: subscription._id },
                        {
                            $set: {
                                "vpsPlanReminders.renewal.finalReminderSent": true,
                                "vpsPlanReminders.renewal.finalReminderSentAt": new Date()
                            }
                        }
                    );
                }
                if (sendFirstReminder) {
                    await Subscription.updateOne(
                        { _id: subscription._id },
                        {
                            $set: {
                                "vpsPlanReminders.renewal.firstReminderSent": true,
                                "vpsPlanReminders.renewal.firstReminderSentAt": new Date()
                            }
                        }
                    );
                }
                console.log(`Monthly, Quarterly or Annually reminder sent to ${user.email} for subscription ${subscription._id}`);
            }
        }

    } catch (error) {
        console.error('Error checking other subscriptions:', error);
    }
};

// Schedule the job to run every minute for hourly subscriptions
schedule.scheduleJob('* * * * *', () => {
    console.log('Running subscription reminder job for hourly plans...');
    processHourlyExpiringSubscriptions();
});

// Schedule the job to run daily at 12 AM for other subscriptions
// schedule.scheduleJob('* * * * *', () => {
schedule.scheduleJob('0 12 * * *', () => {
    console.log('Running daily subscription reminder job...');
    processOtherExpiringSubscriptions();
});
