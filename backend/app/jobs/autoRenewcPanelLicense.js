const schedule = require("node-schedule");
const moment = require("moment");
const Subscription = require("../models/Subscription");
const { renewCPanelLicense } = require("../helpers/subscriptionHelper");
const transporter = require("../services/mailer");

const sendInsufficientFundsEmail = async ({ user, subscription }) => {
    try {
        if (!user || !user.email) return;

        const emailContent = {
            subject: `⚠ Auto-Renewal Failed: Insufficient Wallet Balance`,
            html: `
                <table width="100%" cellpadding="0" cellspacing="0" 
                    style="max-width: 600px; margin: auto; font-family: Arial, sans-serif; border-radius: 10px; overflow: hidden; box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.2);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #ff4d4d; color: white; padding: 20px; text-align: center; font-size: 24px; font-weight: bold;">
                            ⚠ Auto-Renewal Failed!
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 20px; background-color: #f9f9f9;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="padding: 10px 0; font-size: 18px;">
                                        Hello <strong>${user?.name}</strong>,
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; font-size: 16px; color: #ff4d4d;">
                                        Your cPanel license <strong>(${subscription?.cPanelPlanId?.name || subscription?.cPanelPlanId?.id})</strong> for VPS 
                                        <strong>${subscription?.vmId?.label}</strong> could not be renewed due to insufficient wallet balance.
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; font-size: 16px;">
                                        <strong>Required Amount:</strong> $${subscription?.cPanelPlanId?.price} (USD)
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; font-size: 16px;">
                                        Please add funds to your wallet to enable auto-renewal and prevent service disruption.
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding-top: 20px; color: #7f8c8d; font-size: 12px; text-align: center;">
                            This is an automated message. Please do not reply to this email.
                        </td>
                    </tr>
                </table>
            `,
        };

        await transporter.sendMail({
            from: process.env.MAIL_FROM_ADDRESS,
            to: user.email,
            subject: emailContent.subject,
            html: emailContent.html,
        });

        console.log(`📩 Insufficient funds email sent to ${user.email}`);
    } catch (error) {
        console.error("❌ Error sending insufficient funds email:", error);
    }
};

const sendAdminInsufficientFundsEmail = async ({ user, subscription }) => {
    try {
        const adminEmailContent = {
            subject: `⚠ Auto-Renewal Failed for a User - Insufficient Wallet Balance`,
            html: `
                <table width="100%" cellpadding="0" cellspacing="0" 
                    style="max-width: 600px; margin: auto; font-family: Arial, sans-serif; border-radius: 10px; overflow: hidden; box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.2);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #ff9800; color: white; padding: 20px; text-align: center; font-size: 24px; font-weight: bold;">
                            ⚠ User Auto-Renewal Failed
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 20px; background-color: #f9f9f9;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="padding: 10px 0; font-size: 18px;">
                                        User <strong>${user?.name}</strong> 
                                        has insufficient funds for auto-renewal.
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; font-size: 16px; color: #ff4d4d;">
                                        <strong>cPanel License:</strong> ${subscription?.cPanelPlanId?.name || subscription?.cPanelPlanId?.id}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; font-size: 16px;">
                                        <strong>VPS Instance:</strong> ${subscription?.vmId?.label} (${subscription?.vmId?.host})
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; font-size: 16px;">
                                        <strong>Required Amount:</strong> $${subscription?.cPanelPlanId?.price} (USD)
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Contact User Button -->
                    ${user?.email ? `<tr>
                        <td style="padding: 20px; text-align: center;">
                            <a href="mailto:${user?.email}"
                                style="background-color: #007bff; color: white; text-decoration: none; padding: 12px 24px; font-size: 18px; border-radius: 5px; display: inline-block;">
                                📧 Contact User
                            </a>
                        </td>
                    </tr>` : ""}

                    <!-- Footer -->
                    <tr>
                        <td style="padding-top: 20px; color: #7f8c8d; font-size: 12px; text-align: center;">
                            This is an automated message for the admin.
                        </td>
                    </tr>
                </table>
            `,
        };

        await transporter.sendMail({
            from: process.env.MAIL_FROM_ADDRESS,
            to: process.env.ADMIN_MAIL_ADDRESS,
            subject: adminEmailContent.subject,
            html: adminEmailContent.html,
        });

        console.log(`📩 Admin notified about user's insufficient funds`);
    } catch (error) {
        console.error("❌ Error sending admin insufficient funds email:", error);
    }
};

const sendCPanelSubscriptionExpiredEmail = async ({ user, subscription }) => {
    try {
        if (!user || !user.email) return;

        const emailContent = {
            subject: `❌ Your cPanel License Has Expired`,
            html: `
                <table width="100%" cellpadding="0" cellspacing="0" 
                    style="max-width: 600px; margin: auto; font-family: Arial, sans-serif; border-radius: 10px; overflow: hidden; box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.2);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #d32f2f; color: white; padding: 20px; text-align: center; font-size: 24px; font-weight: bold;">
                            ❌ cPanel Subscription Expired!
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 20px; background-color: #f9f9f9;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="padding: 10px 0; font-size: 18px;">
                                        Hello <strong>${user?.name}</strong>,
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; font-size: 16px; color: #d32f2f;">
                                        Your cPanel license <strong>(${subscription?.cPanelPlanId?.name || subscription?.cPanelPlanId?.id})</strong> for VPS 
                                        <strong>${subscription?.vmId?.label}</strong> has expired as auto-renewal was disabled.
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; font-size: 16px;">
                                        Please renew manually to continue using cPanel services.
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding-top: 20px; color: #7f8c8d; font-size: 12px; text-align: center;">
                            This is an automated message. Please do not reply to this email.
                        </td>
                    </tr>
                </table>
            `,
        };

        await transporter.sendMail({
            from: process.env.MAIL_FROM_ADDRESS,
            to: user.email,
            subject: emailContent.subject,
            html: emailContent.html,
        });

        console.log(`📩 Expiry notification sent to ${user.email}`);
    } catch (error) {
        console.error("❌ Error sending cPanel expiry email:", error);
    }
};

const sendAdminCPanelSubscriptionExpiredEmail = async ({ user, subscription }) => {
    try {
        const adminEmailContent = {
            subject: `❌ User's cPanel Subscription Expired`,
            html: `
                <table width="100%" cellpadding="0" cellspacing="0" 
                    style="max-width: 600px; margin: auto; font-family: Arial, sans-serif; border-radius: 10px; overflow: hidden; box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.2);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #ff9800; color: white; padding: 20px; text-align: center; font-size: 24px; font-weight: bold;">
                            ❌ User's cPanel Subscription Expired
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 20px; background-color: #f9f9f9;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="padding: 10px 0; font-size: 18px;">
                                        User <strong>${user?.name}</strong> 
                                        did not renew their cPanel subscription.
                                    </td>
                                </tr>
                                 <!-- Contact User Button -->
                                    ${user?.email ? `<tr>
                                        <td style="padding: 20px; text-align: center;">
                                            <a href="mailto:${user?.email}"
                                                style="background-color: #007bff; color: white; text-decoration: none; padding: 12px 24px; font-size: 18px; border-radius: 5px; display: inline-block;">
                                                📧 Contact User
                                            </a>
                                        </td>
                                    </tr>` : ""}
                            </table>
                        </td>
                    </tr>
                </table>
            `,
        };

        await transporter.sendMail({
            from: process.env.MAIL_FROM_ADDRESS,
            to: process.env.ADMIN_MAIL_ADDRESS,
            subject: adminEmailContent.subject,
            html: adminEmailContent.html,
        });

        console.log(`📩 Admin notified about user's expired cPanel subscription`);
    } catch (error) {
        console.error("❌ Error sending admin cPanel expiry email:", error);
    }
};

const renewCPanelLicenseJob = async () => {
    try {
        const currentTime = moment.utc(); // Use UTC time for current time
        console.log(`Current Time: ${currentTime.toISOString()}`);

        // Fetch all active cPanel subscriptions
        const expiringCPanelSubscriptions = await Subscription.aggregate([
            {
                $match: {
                    "cPanel.status": "active", // Only active licenses
                    "cPanel.licenseCanceled": false, // Ensure license is not already canceled
                }
            },
            {
                $lookup: {
                    from: "cpanelplans",
                    localField: "cPanelPlanId",
                    foreignField: "_id",
                    as: "cPanelPlanId",
                }
            },
            { $unwind: "$cPanelPlanId" },
            {
                $match: {
                    $or: [
                        { "cPanelPlanId.type": "WHM" },
                        { "cPanelPlanId.type": "Plesk", "cPanelPlanId.id": { $ne: "webhost" } }
                    ]
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "userId"
                }
            },
            {
                $lookup: {
                    from: "vps",
                    localField: "vmId",
                    foreignField: "_id",
                    as: "vmId"
                }
            },
            { $unwind: "$userId" },
            { $unwind: { path: '$vmId', preserveNullAndEmptyArrays: true } },
        ]);

        console.log(`🔍 cPanel licenses for renewal:`, expiringCPanelSubscriptions.length);

        for (const subscription of expiringCPanelSubscriptions) {
            const expirationDate = moment.utc(subscription.cPanel.expiryDate); // Use UTC time for expiration date
            const timeRemaining = expirationDate.diff(currentTime, 'minutes'); // Calculate remaining time in minutes

            console.log(`🔍 Subscription ${subscription._id}: ${timeRemaining} minutes remaining until expiration.`);

            if (timeRemaining <= 15) {
                console.log(`🔄 Processing auto-renewal for subscription ${subscription._id}`);

                if (subscription?.autoRenewable) {
                    const renewalResult = await renewCPanelLicense(subscription._id);

                    if (renewalResult?.success) {
                        console.log(`✅ Successfully renewed cPanel license for subscription ${subscription._id}`);
                    } else {
                        console.warn(`⚠ Auto-renewal failed for subscription ${subscription._id}.`);

                        await Subscription.updateOne(
                            { _id: subscription._id },
                            {
                                $set: {
                                    "cPanel.status": "expired",
                                    "cPanel.licenseCanceled": true,
                                    "cPanel.renewal.firstReminderSent": true,
                                    "cPanel.renewal.firstReminderSentAt": moment.utc().toDate(),
                                }
                            }
                        );

                        // Notify user and admin about insufficient funds
                        await sendInsufficientFundsEmail({ subscription, user: subscription.userId });
                        await sendAdminInsufficientFundsEmail({ subscription, user: subscription.userId });
                    }
                } else {
                    console.log(`⏭️ Skipping subscription ${subscription._id}, auto-renew is disabled.`);
                    await Subscription.updateOne(
                        { _id: subscription._id },
                        {
                            $set: {
                                "cPanel.status": "expired",
                                "cPanel.licenseCanceled": true,
                                "cPanel.renewal.firstReminderSent": true,
                                "cPanel.renewal.firstReminderSentAt": moment.utc().toDate(),
                            }
                        }
                        );

                    await sendCPanelSubscriptionExpiredEmail({ subscription, user: subscription.userId });
                    await sendAdminCPanelSubscriptionExpiredEmail({ subscription, user: subscription.userId });
                }
            } else {
                console.log(`⏭️ Skipping subscription ${subscription._id}, not yet in reminder range.`);
            }
        }
    } catch (error) {
        console.error("❌ Error processing cPanel license renewal:", error);
    }
};

// Run every hour for cPanel license renewal
schedule.scheduleJob('* * * * *', () => {
    console.log('🔄 Running cPanel license renewal job...');
    renewCPanelLicenseJob();
});
