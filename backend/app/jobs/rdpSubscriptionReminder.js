const schedule = require('node-schedule');
const moment = require('moment');
const RDPSubscription = require('../models/RDPSubscription');
const RDPInstance = require('../models/RDPInstance');
const Wallet = require('../models/Wallet');
const RDPEmailController = require('../controllers/rdp/rdpEmailController');

const reminderJob = async () => {
    try {
        const now = new Date();
        const subscriptions = await RDPSubscription.find({ status: 'active' })
            .populate('billingCycleId')
            .populate('rdpId')
            .populate('planId')
            .populate('userId');

        for (const sub of subscriptions) {
            const exp = moment(sub.subscriptionEnd);
            const nowMoment = moment(now);
            const diffMinutes = exp.diff(nowMoment, 'minutes');
            const diffDays = exp.diff(nowMoment, 'days');
            const billingType = sub.billingCycleId?.type?.toLowerCase();

            const rdp = await RDPInstance.findById(sub.rdpId);
            const wallet = await Wallet.findOne({ userId: sub.userId._id });
            const balance = wallet?.balance?.get("USD") || 0;
            const price = sub.price || 0;

            const hasSufficientFunds = balance >= price;

            const emailParams = {
                user: sub.userId,
                rdp,
                plan: sub.planId,
                billingCycle: billingType,
                subscription: sub,
                expiresAt: exp.format("MMMM D, YYYY, hh:mm A")
            };

            console.log("###subscription###", sub._id, diffMinutes)
            // 🔁 Hourly: 15 minutes before
            if (billingType === 'hourly' && diffMinutes <= 15 && !sub?.renewal?.firstReminderSent) {
                if (sub.autoRenewable) {
                    if (hasSufficientFunds) {
                        await RDPEmailController.sendRenewalReminder({ ...emailParams, minutesLeft: 15 });
                    } else {
                        await RDPEmailController.sendLowBalanceReminder({ ...emailParams, amountDue: price, currentBalance: balance });
                    }
                } else {
                    await RDPEmailController.sendManualRenewReminder({ ...emailParams, minutesLeft: 15 });
                }

                sub.renewal.firstReminderSent = true;
                sub.renewal.firstReminderSentAt = now;
                await sub.save();
            }

            // 🗓 Monthly/Quarterly/Annually
            if (['monthly', 'quarterly', 'annually'].includes(billingType)) {
                // 7 days before
                if (diffDays === 7 && !sub?.renewal?.firstReminderSent) {
                    if (sub.autoRenewable) {
                        if (hasSufficientFunds) {
                            await RDPEmailController.sendRenewalReminder({ ...emailParams, daysLeft: 7 });
                        } else {
                            await RDPEmailController.sendLowBalanceReminder({ ...emailParams, amountDue: price, currentBalance: balance });
                        }
                    } else {
                        await RDPEmailController.sendManualRenewReminder({ ...emailParams, daysLeft: 7 });
                    }

                    sub.renewal.firstReminderSent = true;
                    sub.renewal.firstReminderSentAt = now;
                    await sub.save();
                }

                // 1 day before
                if (diffDays === 1 && !sub?.renewal?.finalReminderSent) {
                    if (sub.autoRenewable) {
                        if (hasSufficientFunds) {
                            await RDPEmailController.sendRenewalReminder({ ...emailParams, daysLeft: 1 });
                        } else {
                            await RDPEmailController.sendLowBalanceReminder({ ...emailParams, amountDue: price, currentBalance: balance });
                        }
                    } else {
                        await RDPEmailController.sendManualRenewReminder({ ...emailParams, daysLeft: 1 });
                    }

                    sub.renewal.finalReminderSent = true;
                    sub.renewal.finalReminderSentAt = now;
                    await sub.save();
                }
            }
        }

    } catch (error) {
        console.error('❌ Error in subscription reminder job:', error);
    }
};

const sendReminderJob = schedule.scheduleJob('* * * * *', () => {
    console.log('Running RDP Subscription Reminder Job...');
    reminderJob();
});

module.exports = sendReminderJob;