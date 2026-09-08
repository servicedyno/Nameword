const schedule = require("node-schedule");
const moment = require("moment");
const Subscription = require("../models/Subscription");
const transporter = require('../services/mailer');
const Wallet = require("../models/Wallet");

const CPANEL_FIRST_REMINDER_DAYS = 5;
const CPANEL_FINAL_REMINDER_DAYS = 1;

const sendCPanelInsufficientEmail = async ({ user, subscription, reminderTime }) => {
    try {
        if (!user || !user.email) return;

        // Email content
        const userEmailContent = {
            subject: `⚠ Insufficient Funds: Your cPanel License Renewal`,
            html: `
                  <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 10px; overflow: hidden; box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.15);">
                
                <!-- Header -->
                <div style="background-color: #ff9800; color: white; padding: 20px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px;">⚠ Insufficient Funds for Auto-Renewal</h1>
                </div>

                <!-- Body Content -->
                <div style="padding: 20px; background-color: #f9f9f9;">
                    <p style="font-size: 18px; line-height: 1.6;">
                        Hello <strong>${user?.name}</strong>,
                    </p>
                    <p style="font-size: 18px; color: #ff4d4d; font-weight: bold;">
                        Your cPanel license <strong>(${subscription?.cPanelPlanId?.name})</strong> for VPS <strong>${subscription?.vmId?.label}</strong> is scheduled for renewal in <strong>${reminderTime}</strong>, but your wallet has insufficient funds.
                    </p>
                    <p style="font-size: 18px; line-height: 1.6;">
                        To avoid service disruption, please add funds to your wallet before the renewal date.
                    </p>

                    <!-- Subscription Details -->
                    <table style="width: 100%; margin-top: 15px; border-collapse: separate; border-spacing: 0 10px;">
                        <tr>
                            <td style="font-size: 16px; padding: 12px; background-color: #fff; border: 1px solid #ddd; border-radius: 5px;">
                                <strong>VPS Instance:</strong> ${subscription?.vmId?.label}
                            </td>
                        </tr>
                        <tr>
                            <td style="font-size: 16px; padding: 12px; background-color: #fff; border: 1px solid #ddd; border-radius: 5px;">
                                <strong>License Type:</strong> ${subscription?.cPanelPlanId?.name}
                            </td>
                        </tr>
                        <tr>
                            <td style="font-size: 16px; padding: 12px; background-color: #fff; border: 1px solid #ddd; border-radius: 5px;">
                                <strong>Renewal Price:</strong> $${subscription?.cPanelPlanId?.price} (USD)
                            </td>
                        </tr>
                        <tr>
                            <td style="font-size: 16px; padding: 12px; background-color: #fff; border: 1px solid #ddd; border-radius: 5px;">
                                <strong>Next Renewal Date:</strong> ${moment(subscription?.cPanel?.expiryDate).format("MMMM Do YYYY")}
                            </td>
                        </tr>
                    </table>
                </div>

                <!-- Footer -->
                <div style="padding: 15px; background-color: #f1f1f1; text-align: center; font-size: 14px; color: #666;">
                    This is an automated message. Please do not reply to this email.
                </div>
            </div>
            `,
        };

        const adminEmailContent = {
            subject: `⚠ User Insufficient Funds for cPanel License Renewal`,
            html: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 10px; overflow: hidden; box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.15);">
                
                <!-- Header -->
                <div style="background-color: #ff9800; color: white; padding: 20px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px;">⚠ User Insufficient Funds for Renewal</h1>
                </div>

                <!-- Body Content -->
                <div style="padding: 20px; background-color: #f9f9f9;">
                    <p style="font-size: 18px; line-height: 1.6;">
                        User <strong>${user?.name}</strong> ${user?.email ? `(<a href="mailto:${user?.email}" style="color: #007bff;">${user.email}</a>)` : ""} has insufficient funds for their cPanel License Renewal.
                    </p>

                    <!-- VPS Details -->
                    <table style="width: 100%; margin-top: 15px; border-collapse: separate; border-spacing: 0 10px;">
                        <tr>
                            <td style="font-size: 16px; padding: 12px; background-color: #fff; border: 1px solid #ddd; border-radius: 5px;">
                                <strong>License:</strong> ${subscription?.cPanelPlanId?.name}
                            </td>
                        </tr>
                        <tr>
                            <td style="font-size: 16px; padding: 12px; background-color: #fff; border: 1px solid #ddd; border-radius: 5px;">
                                <strong>Required Amount:</strong> $${subscription?.cPanelPlanId?.price} (USD)
                            </td>
                        </tr>
                        <tr>
                            <td style="font-size: 16px; padding: 12px; background-color: #fff; border: 1px solid #ddd; border-radius: 5px;">
                                <strong>Renewal Scheduled In:</strong> ${reminderTime}
                            </td>
                        </tr>
                        <tr>
                            <td style="font-size: 16px; padding: 12px; background-color: #fff; border: 1px solid #ddd; border-radius: 5px;">
                                <strong>VPS Instance:</strong> ${subscription?.vmId?.label}
                            </td>
                        </tr>
                        <tr>
                            <td style="font-size: 16px; padding: 12px; background-color: #fff; border: 1px solid #ddd; border-radius: 5px;">
                                <strong>License Type:</strong> ${subscription?.cPanelPlanId?.name}
                            </td>
                        </tr>
                    </table>
                </div>

                <!-- Footer -->
                <div style="padding: 15px; background-color: #f1f1f1; text-align: center; font-size: 14px; color: #666;">
                    This is an automated message for the admin.
                </div>
            </div>
            `
        }

        // Send Email
        const userMailResponse = await transporter.sendMail({
            from: process.env.MAIL_FROM_ADDRESS,
            to: user.email,
            subject: userEmailContent.subject,
            html: userEmailContent.html,
        });

        const adminMailResponse = await transporter.sendMail({
            from: process.env.MAIL_FROM_ADDRESS,
            to: process.env.ADMIN_MAIL_ADDRESS,
            subject: adminEmailContent.subject,
            html: adminEmailContent.html,
        });


        console.log(`cPanel Insufficient email sent to ${user.email}: ${userMailResponse.messageId}`);
        console.log(`cPanel Insufficient email sent to Admin ${process.env.ADMIN_MAIL_ADDRESS}: ${adminMailResponse.messageId}`);

    } catch (error) {
        console.error("❌ Error sending cPanel insufficient funds:", error);
    }
};

const sendCPanelAutoRenewalReminderEmail = async ({ user, subscription, reminderTime, timeUnit }) => {
    try {

        if (!user || !user.email) return;

        const emailContent = {
            subject: `⏳ Your cPanel License Will Auto-Renew in ${reminderTime} ${timeUnit}!`,
            html: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 10px; overflow: hidden; box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.15);">
                
                <!-- Header -->
                <div style="background-color: #ff9800; color: white; padding: 20px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px;">⏳ Auto-Renewal Reminder</h1>
                </div>

                <!-- Body Content -->
                <div style="padding: 20px; background-color: #f9f9f9;">
                    <p style="font-size: 18px; line-height: 1.6;">
                        Hello <strong>${user?.name}</strong>,
                    </p>
                    <p style="font-size: 18px; color: #ff9800; font-weight: bold;">
                        Your cPanel license <strong>(${subscription?.cPanelPlanId?.name})</strong> for VPS <strong>${subscription?.vmId?.label}</strong> is set to auto-renew in ${reminderTime} ${timeUnit}.
                    </p>
                    <p style="font-size: 18px; line-height: 1.6;">
                        The renewal fee of $${subscription?.cPanelPlanId?.price} (USD) will be deducted automatically from your wallet.
                    </p>

                    <!-- Subscription Details -->
                    <table style="width: 100%; margin-top: 15px; border-collapse: separate; border-spacing: 0 10px;">
                        <tr>
                            <td style="font-size: 16px; padding: 12px; background-color: #fff; border: 1px solid #ddd; border-radius: 5px;">
                                <strong>VPS Instance:</strong> ${subscription?.vmId?.label}
                            </td>
                        </tr>
                        <tr>
                            <td style="font-size: 16px; padding: 12px; background-color: #fff; border: 1px solid #ddd; border-radius: 5px;">
                                <strong>License Type:</strong> ${subscription?.cPanelPlanId?.name}
                            </td>
                        </tr>
                        <tr>
                            <td style="font-size: 16px; padding: 12px; background-color: #fff; border: 1px solid #ddd; border-radius: 5px;">
                                <strong>Renewal Price:</strong> $${subscription?.cPanelPlanId?.price} (USD)
                            </td>
                        </tr>
                        <tr>
                            <td style="font-size: 16px; padding: 12px; background-color: #fff; border: 1px solid #ddd; border-radius: 5px;">
                                <strong>Next Renewal Date:</strong> ${moment(subscription?.cPanel?.expiryDate).format("MMMM Do YYYY")}
                            </td>
                        </tr>
                    </table>

                    <p style="font-size: 18px; line-height: 1.6; margin-top: 15px;">
                        If you do not want to renew, please disable auto-renewal in your account settings before the renewal date.
                    </p>
                </div>

                <!-- Footer -->
                <div style="padding: 15px; background-color: #f1f1f1; text-align: center; font-size: 14px; color: #666; border-radius: 0 0 10px 10px;">
                    This is an automated message. Please do not reply to this email.
                </div>
            </div>
        `,
        };

        // Send Email
        const userMailResponse = await transporter.sendMail({
            from: process.env.MAIL_FROM_ADDRESS,
            to: user.email,
            subject: emailContent.subject,
            html: emailContent.html,
        });

        console.log(`cPanel Auto-Renewal email sent to ${user.email}: ${userMailResponse.messageId}`);
    } catch (error) {
        console.error("Error sending cPanel auto-renewal reminder:", error);
    }
};

const sendCPanelExpiryReminderEmail = async ({ user, subscription }) => {
    try {
        if (!user || !user.email) return;

        // Email content
        const emailContent = {
            subject: `🚨 Your cPanel License Will Expire Soon!`,
            html: `
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: auto; font-family: Arial, sans-serif; border-radius: 10px; overflow: hidden; box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.2);">
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #d32f2f; color: white; padding: 20px; text-align: center; font-size: 24px; font-weight: bold;">
                            🚨 cPanel License Expiry Notice
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
                                    <td style="padding: 10px 0; font-size: 16px;">
                                        Your cPanel license<strong> (${subscription?.cPanelPlanId?.name || subscription?.cPanelPlanId?.id})</strong> for VPS <strong>${subscription?.vmId?.label}</strong> will expire on:
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 10px; font-size: 22px; font-weight: bold; color: #d32f2f;">
                                        ${moment(subscription?.cPanel?.expiryDate).format("MMMM Do YYYY")}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; font-size: 16px;">
                                        Please renew your license before it expires to continue using cPanel services without any interruption.
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Security Warning -->
                    <tr>
                        <td style="padding: 20px;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fff4e5; padding: 15px; border-radius: 5px;">
                                <tr>
                                    <td style="color: #e67e22; font-size: 16px;">
                                        ⚠️ If your license expires, you may lose access to cPanel services.
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td>
                            <div style="padding: 15px; background-color: #f1f1f1; text-align: center; font-size: 14px; color: #666; border-radius: 0 0 10px 10px;">
                                This is an automated message. Please do not reply to this email.
                            </div>
                        </td>
                    </tr>
                </table>
            `,
        };

        // Send Email
        await transporter.sendMail({
            from: process.env.MAIL_FROM_ADDRESS,
            to: user.email,
            subject: emailContent.subject,
            html: emailContent.html,
        });

        console.log(`📨 cPanel license expiry reminder sent to ${user?.email}`);

    } catch (error) {
        console.error("❌ Error sending cPanel expiry reminder:", error);
    }
};

// const sendCPanelLicenseCancellationEmail = async ({ user, subscription }) => {
//     try {
//         if (!user || !user.email) return;

//         // Email content for user
//         const userEmailContent = {
//             subject: `❌ Your cPanel License Has Been Canceled`,
//             html: `
//                 <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: auto; font-family: Arial, sans-serif; border-radius: 10px; overflow: hidden; box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.2);">
//                     <!-- Header -->
//                     <tr>
//                         <td style="background-color: #d32f2f; color: white; padding: 20px; text-align: center; font-size: 24px; font-weight: bold;">
//                             ❌ cPanel License Canceled
//                         </td>
//                     </tr>

//                     <!-- Body Content -->
//                     <tr>
//                         <td style="padding: 20px; background-color: #f9f9f9;">
//                             <table width="100%" cellpadding="0" cellspacing="0">
//                                 <tr>
//                                     <td style="padding: 10px 0; font-size: 18px;">
//                                         Hello <strong>${user?.name || user?.email}</strong>,
//                                     </td>
//                                 </tr>
//                                 <tr>
//                                     <td style="padding: 10px 0; font-size: 16px; color: #d32f2f;">
//                                         Your cPanel license <strong>${subscription?.cPanelPlanId?.name || subscription?.cPanelPlanId?.id}</strong> for VPS <strong>${subscription?.vmId?.label}</strong> has expired and has been automatically canceled.
//                                     </td>
//                                 </tr>
//                                 <tr>
//                                     <td style="padding: 10px 0; font-size: 16px;">
//                                         Please contact support immediately or renew your subscription for accessing cPanel.
//                                     </td>
//                                 </tr>
//                             </table>
//                         </td>
//                     </tr>

//                     <!-- Footer -->
//                     <tr>
//                         <td style="padding-top: 20px; color: #7f8c8d; font-size: 12px; text-align: center;">
//                             This is an automated message. Please do not reply to this email.
//                         </td>
//                     </tr>
//                 </table>
//             `,
//         };

//         // Send Email to User
//         await transporter.sendMail({
//             from: process.env.MAIL_FROM_ADDRESS,
//             to: user.email,
//             subject: userEmailContent.subject,
//             html: userEmailContent.html,
//         });

//         console.log(`📨 cPanel license cancellation email sent to ${user?.email}`);

//     } catch (error) {
//         console.error("❌ Error sending cPanel cancellation email:", error);
//     }
// };

// const sendAdminLicenseCancellationEmail = async ({ user, subscription }) => {
//     try {
//         const adminEmailContent = {
//             subject: `❌ cPanel License Expired and Canceled`,
//             html: `
//                 <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: auto; font-family: Arial, sans-serif; border-radius: 10px; overflow: hidden; box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.2);">
//                     <!-- Header -->
//                     <tr>
//                         <td style="background-color: #ff9800; color: white; padding: 20px; text-align: center; font-size: 24px; font-weight: bold;">
//                             ❌ cPanel License Auto-Canceled
//                         </td>
//                     </tr>

//                     <!-- Body Content -->
//                     <tr>
//                         <td style="padding: 20px; background-color: #f9f9f9;">
//                             <table width="100%" cellpadding="0" cellspacing="0">
//                                 <tr><td style="padding: 10px 0; font-size: 18px;"><strong>User:</strong> ${user?.name || user?.email}</td></tr>
//                                 <tr><td style="padding: 10px 0; font-size: 18px;"><strong>VPS Instance:</strong> ${subscription?.vmId?.label}</td></tr>
//                                 <tr><td style="padding: 10px 0; font-size: 18px;"><strong>VPS IP:</strong> ${subscription?.vmId?.host}</td></tr>
//                                 <tr><td style="padding: 10px 0; font-size: 18px;"><strong>License Type:</strong> ${subscription?.cPanelPlanId?.name || subscription?.cPanelPlanId?.id}</td></tr>
//                                 <tr><td style="padding: 10px 0; font-size: 18px;"><strong>Expiration Date:</strong> ${moment(subscription?.cPanel?.expiryDate).format("MMMM Do YYYY")}</td></tr>
//                                 <tr><td style="padding: 10px 0; font-size: 18px; color: #d32f2f;"><strong>Status:</strong> The cPanel license was not renewed and has been automatically canceled.</td></tr>
//                             </table>
//                         </td>
//                     </tr>

//                     <!-- Footer -->
//                     <tr>
//                         <td style="padding-top: 20px; color: #7f8c8d; font-size: 12px; text-align: center;">
//                             This is an automated message for the admin.
//                         </td>
//                     </tr>
//                 </table>
//             `,
//         };

//         // Send Email to Admin
//         await transporter.sendMail({
//             from: process.env.MAIL_FROM_ADDRESS,
//             to: process.env.ADMIN_MAIL_ADDRESS,
//             subject: adminEmailContent.subject,
//             html: adminEmailContent.html,
//         });

//         console.log(`📨 cPanel license cancellation email sent to admin`);

//     } catch (error) {
//         console.error("❌ Error sending admin cPanel cancellation email:", error);
//     }
// };

const licenseEmail = async () => {
    try {
        const today = moment().startOf("day");

        // Fetch active subscriptions with cPanel licenses
        const subscriptions = await Subscription.aggregate([
            {
                $match: {
                    "cPanel.status": "active",
                    $or: [
                        { "cPanel.renewal.firstReminderSent": false },
                        { "cPanel.renewal.firstReminderSentAt": { $exists: false } },
                        { "cPanel.renewal.firstReminderSentAt": null },
                        { "cPanel.renewal.firstReminderSentAt": { $lt: today.clone().subtract(1, "days").toDate() } },
                        { "cPanel.renewal.finalReminderSent": false },
                        { "cPanel.renewal.finalReminderSentAt": { $exists: false } },
                        { "cPanel.renewal.finalReminderSentAt": null },
                        { "cPanel.renewal.finalReminderSentAt": { $lt: today.clone().subtract(1, "days").toDate() } }
                    ],
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
            { $unwind: { path: "$cPanelPlanId"} },
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
            { $unwind: { path: '$userId', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$vmId', preserveNullAndEmptyArrays: true } },
        ]);

        console.log(`🔍 ${subscriptions.length} active cPanel subscriptions fetched for reminders.`);

        for (const subscription of subscriptions) {
            const expirationDate = moment(subscription?.cPanel?.expiryDate);
            const daysUntilExpiration = expirationDate.diff(today, "days");

            console.log("Days Until Expiration:", daysUntilExpiration);

            let sendFirstReminder = daysUntilExpiration === CPANEL_FIRST_REMINDER_DAYS && !subscription?.cPanel?.renewal?.firstReminderSent;
            let sendFinalReminder = daysUntilExpiration === CPANEL_FINAL_REMINDER_DAYS && !subscription?.cPanel?.renewal?.finalReminderSent;
            if (!sendFirstReminder && !sendFinalReminder) {
                console.log(`⏭️ Skipping subscription ${subscription._id}, not within reminder range.`);
                continue;
            }

            const user = subscription.userId;
            const wallet = await Wallet.findOne({ userId: user });

            if (subscription.autoRenewable) {
                if (wallet && wallet.balance.get("USD") >= subscription?.cPanelPlanId?.price) {
                    await sendCPanelAutoRenewalReminderEmail({
                        user: subscription?.userId,
                        subscription,
                        reminderTime: daysUntilExpiration,
                        timeUnit: "Days"
                    });
                } else {
                    await sendCPanelInsufficientEmail({ user: subscription?.userId, subscription, reminderTime: daysUntilExpiration });
                }
            } else {
                await sendCPanelExpiryReminderEmail({ user: subscription?.userId, subscription,  reminderTime: daysUntilExpiration });
            }

            // ✅ Mark reminders as sent only on the correct reminder days
            if (sendFinalReminder) {
                await Subscription.updateOne(
                    { _id: subscription._id },
                    {
                        $set: {
                            "cPanel.renewal.finalReminderSent": true,
                            "cPanel.renewal.finalReminderSentAt": new Date()
                        }
                    }
                );
            }
            if (sendFirstReminder) {
                await Subscription.updateOne(
                    { _id: subscription._id },
                    {
                        $set: {
                            "cPanel.renewal.firstReminderSent": true,
                            "cPanel.renewal.firstReminderSentAt": new Date()
                        }
                    }
                );
            }

            console.log(`✅ Reminder sent for subscription ${subscription._id} (${daysUntilExpiration} days until expiration).`);
        }
    } catch (error) {
        console.error("❌ Error in license expiration job:", error);
    }
};

// Schedule the job to run every day at 12:00 AM
schedule.scheduleJob("0 0 * * *", () => {
// schedule.scheduleJob("* * * * *", () => {
    console.log("🔍 Checking for expiring and expired licenses...");
    licenseEmail()
});
