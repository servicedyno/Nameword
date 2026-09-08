const schedule = require("node-schedule");
const moment = require("moment");
const Subscription = require("../models/Subscription");
const ComputeEngineController = require("../controllers/compute-engine/ComputeEngineController");
const { sendVMDeletionEmail, renewSubscriptionByWallet } = require("../helpers/subscriptionHelper");
const transporter = require("../services/mailer");
const Wallet = require("../models/Wallet");
const { calculateNextPaymentDate } = require("../helpers/walletHelper");

// Configurable Settings
const GRACE_PERIOD_DAYS = 5; // Grace period before suspension
const SUSPENSION_PERIOD_DAYS = 0; // Days before full termination
const REINSTATEMENT_FEE = 1; // Reinstatement fee after grace period (in USD)

const sendInsufficientFundsEmail = async (subscription) => {
    const { userId: user, billingCycleId: billingCycle, price, cPanelPlanId: cPanelDetails, vmId: vpsDetails, osId: os, autoRenewable } = subscription;

    const userEmailHtml = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #ff4d4d; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0;">⚠ Auto-Renewal Failed!</h1>
        </div>
        <div style=" background-color: #f9f9f9; border-radius: 0 0 10px 10px;">
            <div style="padding: 20px;">
            <p style="font-size: 18px;">
                Hello <strong>${user.name}</strong>,
            </p>
            <p style="font-size: 18px; color: #ff4d4d;">
                Your <strong>${billingCycle.type} VPS Plan</strong> could not be renewed due to insufficient wallet balance.
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
            </div>
        <div style="padding: 15px; background-color: #f1f1f1; text-align: center; font-size: 14px; color: #666; border-radius: 0 0 10px 10px;">
            This is an automated message. Please do not reply to this email.
        </div>
        </div>
    </div>`;

    const adminEmailHtml = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #ff9800; color: white; text-align: center; border-radius: 10px 10px 0 0; padding: 20px;">
            <h1 style="margin: 0;">⚠ Auto-Renewal Failed for a User</h1>
        </div>
        <div style="background-color: #f9f9f9; border-radius: 0 0 10px 10px;">
            <div style="padding: 20px;">
                <p style="font-size: 18px;">
                    User <strong>${user.name}</strong> has insufficient funds for auto-renewal.
                </p>
                <p style="font-size: 18px; color: #ff4d4d;">
                    <strong>Plan:</strong> ${billingCycle.type} VPS Plan
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
                
                <!-- Contact User Button if user email exists -->
                ${user?.email ? `
                    <div style="text-align: center; margin-top: 20px;">
                        <a href="mailto:${user.email}" 
                        style="background-color: #007bff; color: white; text-decoration: none; padding: 12px 24px; font-size: 18px; border-radius: 5px; display: inline-block;">
                            📧 Contact User
                        </a>
                    </div>
                ` : ``}
                
                <p style="font-size: 18px;">
                    Please follow up with the user if necessary.
                </p>
            </div>

            <!-- Footer -->
            <div style="padding: 15px; background-color: #f1f1f1; text-align: center; font-size: 14px; color: #666; border-radius: 0 0 10px 10px;">
                This is an automated message. Please do not reply to this email.
            </div>
        </div>
    </div>
`

    try {

        await transporter.sendMail({
            from: process.env.MAIL_FROM_ADDRESS,
            to: user.email,
            subject: `⚠ Auto-Renewal Failed: Insufficient Wallet Balance`,
            html: userEmailHtml,
        });
        await transporter.sendMail({
            from: process.env.MAIL_FROM_ADDRESS,
            to: process.env.ADMIN_MAIL_ADDRESS,
            subject: `⚠ Auto-Renewal Failed: Insufficient Wallet Balance`,
            html: adminEmailHtml,
        });
        console.log(`📩 Insufficient funds email sent to ${user.email}`);
    } catch (error) {
        console.error('⚠ Error sending insufficient funds email:', error);
    }
};

// Function to send emails for VPS statuses (grace_period, suspended, terminated, etc.)
const sendVPSStatusEmail = async (user, vm, status) => {
    const emailContent = {
        subject: "",
        html: "",
    };

    switch (status) {
        case "pending_renewal":
            emailContent.subject = "⚠️ Your VPS Subscription Renewal is Pending";
            emailContent.html = `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                    <div style="background-color: #ff9800; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="margin: 0;">⚠️ Renewal Pending</h1>
                    </div>
                    <div style="padding: 20px; background-color: #f9f9f9; border-radius: 0 0 10px 10px;">
                        <p style="font-size: 18px; line-height: 1.6;">
                            Hello <strong>${user.name}</strong>,
                        </p>
                        <p style="font-size: 18px; line-height: 1.6;">
                            Your VPS instance <strong>${vm?.label}</strong> is in the renewal process. We are currently waiting for the payment to go through in order to continue your service.
                        </p>
                        <p style="font-size: 18px; line-height: 1.6; color: #ff9800;">
                            Please ensure that your payment is successful to avoid service disruption.
                        </p>
                        <p style="font-size: 18px; line-height: 1.6;">
                            If you have any questions or need assistance, please contact our support team.
                        </p>
                    </div>
                </div>`;
            break;

        case "grace_period":
            emailContent.subject = "⚠️ Your VPS Subscription is in Grace Period";
            emailContent.html = `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                    <div style="background-color: #ff4d4d; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="margin: 0;">⚠️ Grace Period Activated</h1>
                    </div>
                    <div style="padding: 20px; background-color: #f9f9f9; border-radius: 0 0 10px 10px;">
                        <p style="font-size: 18px; line-height: 1.6;">
                            Hello <strong>${user.name}</strong>,
                        </p>
                        <p style="font-size: 18px; color: #ff4d4d;">
                            Due to insufficient funds, your VPS instance <strong>${vm?.label}</strong> is now in the grace period. You have a limited time to add funds to your wallet before your VPS is suspended.
                        </p>
                        <p style="font-size: 18px; line-height: 1.6;">
                            Please add funds to your wallet within the next <strong>${GRACE_PERIOD_DAYS} days</strong> to avoid service disruption.
                        </p>
                        <p style="font-size: 18px; line-height: 1.6;">
                            If you need help with this process, please reach out to our support team.
                        </p>
                    </div>
                </div>`;
            break;

        case "suspended":
            emailContent.subject = "🚫 Your VPS Subscription Has Been Suspended";
            emailContent.html = `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                    <div style="background-color: #ff4d4d; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="margin: 0;">⚠️ Your VPS Has Been Suspended</h1>
                    </div>
                    <div style="padding: 20px; background-color: #f9f9f9; border-radius: 0 0 10px 10px;">
                        <p style="font-size: 18px; line-height: 1.6;">
                            Hello <strong>${user.name}</strong>,
                        </p>
                        <p style="font-size: 18px; color: #ff4d4d;">
                            Your VPS instance <strong>${vm?.label}</strong> has been temporarily suspended due to non-payment.
                        </p>
                        <p style="font-size: 18px; line-height: 1.6;">
                            Please add funds to your wallet to reactivate your VPS.
                        </p>
                        <p style="font-size: 18px; line-height: 1.6;">
                            You can add funds and re-enable your VPS from your account dashboard.
                        </p>
                    </div>
                </div>`;
            break;

        case "terminated":
            emailContent.subject = "❌ Your VPS Subscription Has Been Terminated";
            emailContent.html = `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                    <div style="background-color: #d32f2f; color: white; padding: 20px; text-align: center; font-size: 24px; font-weight: bold;">
                        Your VPS Has Been Terminated
                    </div>
                    <div style="padding: 20px; background-color: #f9f9f9; border-radius: 0 0 10px 10px;">
                        <p style="font-size: 18px; line-height: 1.6;">
                            Hello <strong>${user.name}</strong>,
                        </p>
                        <p style="font-size: 18px; color: #d32f2f;">
                            Unfortunately, your VPS instance <strong>${vm?.label}</strong> has been terminated due to non-payment and has been permanently deleted.
                        </p>
                        <p style="font-size: 18px; line-height: 1.6;">
                            If you wish to create a new VPS, you can do so through your account dashboard.
                        </p>
                        <p style="font-size: 18px; line-height: 1.6;">
                            Please note that this action is irreversible, and your VPS data has been lost.
                        </p>
                    </div>
                </div>`;
            break;
        case "active":
            emailContent.subject = "✅ Your VPS Subscription is Active";
            emailContent.html = `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                    <div style="background-color: #4caf50; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="margin: 0;">✅ Your VPS is Active</h1>
                    </div>
                    <div style="padding: 20px; background-color: #f9f9f9; border-radius: 0 0 10px 10px;">
                        <p style="font-size: 18px; line-height: 1.6;">
                            Hello <strong>${user.name}</strong>,
                        </p>
                        <p style="font-size: 18px; line-height: 1.6;">
                            Your VPS instance <strong>${vm?.label}</strong> is now active and ready to use. Your subscription has been successfully renewed or reactivated.
                        </p>
                        <p style="font-size: 18px; line-height: 1.6; color: #4caf50;">
                            Thank you for renewing your VPS! If you have any questions or need assistance, feel free to contact our support team.
                        </p>
                    </div>
                </div>`;
            break;

        default:
            return;
    }

    try {
        // Check if user has email notifications enabled for service status and changes
        const { shouldSendEmail } = require('../utils/notificationHelper');
        const canSendEmail = await shouldSendEmail(user, 'serviceStatusAndChanges');
        if (!canSendEmail) {
            console.log(`Email notification disabled for user ${user.email} - skipping VPS status email`);
            return;
        }

        await transporter.sendMail({
            from: process.env.MAIL_FROM_ADDRESS,
            to: user.email,
            subject: emailContent.subject,
            html: emailContent.html,
        });
        console.log(`Email sent to ${user.email} regarding ${status}`);
    } catch (error) {
        console.error(`Error sending email to ${user.email}:`, error);
    }
};

// Send email notifying user about insufficient funds and reinstatement fee
const sendReinstatementFeeEmail = async (user, vm) => {
    const emailContent = {
        subject: "⚠️ Reinstatement Fee Applied to Your VPS Subscription",
        html: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #ff9800; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="margin: 0;">⚠️ Reinstatement Fee Applied</h1>
                </div>
                <div style="padding: 20px; background-color: #f9f9f9; border-radius: 0 0 10px 10px;">
                    <p style="font-size: 18px; line-height: 1.6;">
                        Hello <strong>${user?.name}</strong>,
                    </p>
                    <p style="font-size: 18px; line-height: 1.6; color: #ff9800;">
                        Your VPS instance <strong>${vm?.label}</strong> is in the grace period due to insufficient funds. 
                        In order to reactivate the VPS, a reinstatement fee of $${REINSTATEMENT_FEE} (USD) is required.
                    </p>
                    <p style="font-size: 18px; line-height: 1.6;">
                        Please add funds to your wallet within the next <strong>${GRACE_PERIOD_DAYS}</strong> days to avoid suspension of your VPS.
                    </p>
                    <p style="font-size: 18px; line-height: 1.6;">
                        You can top up your wallet and reactivate the VPS directly from your account dashboard.
                    </p>
                </div>
                 <div style="padding: 15px; background-color: #f1f1f1; text-align: center; font-size: 14px; color: #666;">
                    This is an automated message. Please do not reply to this email.
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail({
            from: process.env.MAIL_FROM_ADDRESS,
            to: user.email,
            subject: emailContent.subject,
            html: emailContent.html,
        });
        console.log(`Reinstatement fee email sent to ${user.email}`);
    } catch (error) {
        console.error(`❌ Error sending reinstatement fee email:`, error);
    }
};

const processVPSLifecycle = async () => {
    try {
        const currentDate = moment.utc();

        const bufferTime = moment.utc().subtract(1, 'minutes'); 
        // Fetch only subscriptions that need action
        const subscriptions = await Subscription.find({
            subscriptionEnd: { $lt: bufferTime.toDate() }, // Expired subscriptions
            status: { $in: ["active", "pending_renewal", "grace_period", "suspended"] }
        }).populate("userId").populate("vmId").populate("billingCycleId").populate("cPanelPlanId").populate("osId");

        if (subscriptions.length === 0) {
            console.log("No subscriptions need action at this moment.");
            return;
        } else {
            console.log(`Found ${subscriptions.length} subscriptions needing action.`);
        }

        for (const subscription of subscriptions) {
            const subscriptionEnd = moment.utc(subscription.subscriptionEnd);
            const graceEndDate = subscriptionEnd.clone().add(GRACE_PERIOD_DAYS, "days").utc();
            const suspendEndDate = graceEndDate.clone().add(SUSPENSION_PERIOD_DAYS, "days").utc();
            console.log("Subscription Status: ", subscription.status, suspendEndDate)
            switch (subscription.status) {
                /** 📌 If Subscription Just Expired **/
                case "active":
                    if (subscription?.autoRenewable) {
                        console.log("Subscription Auto Renew")
                        await Subscription.updateOne(
                            { _id: subscription._id },
                            { $set: { status: "pending_renewal" } }
                        );
                    } else {
                        await terminateVPS(subscription);
                        await Subscription.updateOne(
                            { _id: subscription._id },
                            { $set: { status: "expired" } }
                        );
                    }
                    break;

                /** 🔄 **Attempt Auto-Renewal** **/
                case "pending_renewal":
                    const renewal = await renewSubscriptionByWallet({
                        subscriptionId: subscription._id,
                        isAutoRenewal: true
                    });
                    if(subscription?.cPanel?.status === "expired") {

                    }
                    if (!renewal.success) {
                        await Subscription.updateOne(
                            { _id: subscription._id },
                            { $set: { status: "grace_period", graceEndDate: graceEndDate.toDate() } }
                        );
                        await sendInsufficientFundsEmail(subscription)
                        await sendReinstatementFeeEmail(subscription?.userId, subscription?.vmId);
                        await suspendVPS(subscription);
                        console.warn(`⚠ Insufficient funds for VPS ${subscription.vmId?.label}. Grace period started.`);
                    }
                    break;

                /** ⏳ **Handle Grace Period** **/
                case "grace_period":
                    const wallet = await Wallet.findOne({ userId: subscription.userId });

                    if (!wallet) {
                        console.log("⚠ No wallet found for user");
                        return;
                    }

                    const userBalance = wallet.balance.get("USD") || 0;
                    const reinstatementFee = REINSTATEMENT_FEE;
                    const subscriptionFee = subscription.price;
                    const totalRequiredAmount = reinstatementFee + subscriptionFee;

                    // Check if grace period is active or expired
                    if (currentDate.isBefore(graceEndDate)) {
                        console.log("Grace period is still active.");

                        if (userBalance >= totalRequiredAmount) {
                            // Deduct both reinstatement and subscription fee
                            wallet.balance.set("USD", userBalance - totalRequiredAmount);
                            await wallet.save();

                            const nextSubscriptionEndDate = calculateNextPaymentDate(subscription.subscriptionEnd, subscription.billingCycleId.type);

                            // Reactivate VPS and update subscription
                            await Subscription.updateOne(
                                { _id: subscription._id },
                                {
                                    $set: {
                                        status: "active",
                                        cycleStart: moment.utc(),
                                        updatedAt: moment.utc(),
                                        subscriptionEnd: nextSubscriptionEndDate,
                                        "vpsPlanReminders.renewal.firstReminderSent": true,
                                        "vpsPlanReminders.renewal.firstReminderSentAt": new Date(),
                                        "vpsPlanReminders.renewal.finalReminderSent": true,
                                        "vpsPlanReminders.renewal.finalReminderSentAt": new Date()
                                    }
                                }
                            );

                            console.log(`VPS for subscription ${subscription._id} reactivated successfully.`);
                            await ComputeEngineController.startVPSInstance(subscription.vmId); // Optionally start VPS

                            await sendVPSStatusEmail(subscription.userId, subscription.vmId, "active");
                        } else {
                            // Grace period expired or insufficient funds
                            console.log(`Insufficient funds for VPS ${subscription.vmId?.label}. Grace period continues.`);;
                        }
                    } else {
                        // Grace period expired, check if user has sufficient funds for reactivation
                        console.log("Grace period expired.");

                        if (userBalance >= totalRequiredAmount) {
                            // Deduct both reinstatement fee and subscription fee
                            wallet.balance.set("USD", userBalance - totalRequiredAmount);
                            await wallet.save();

                            const nextSubscriptionEndDate = calculateNextPaymentDate(subscription.subscriptionEnd, subscription.billingCycleId.type);

                            // Reactivate VPS and update subscription
                            await Subscription.updateOne(
                                { _id: subscription._id },
                                {
                                    $set: {
                                        status: "active",
                                        cycleStart: moment.utc(),
                                        updatedAt: moment.utc(),
                                        subscriptionEnd: nextSubscriptionEndDate,
                                        "vpsPlanReminders.renewal.firstReminderSent": true,
                                        "vpsPlanReminders.renewal.firstReminderSentAt": new Date(),
                                        "vpsPlanReminders.renewal.finalReminderSent": true,
                                        "vpsPlanReminders.renewal.finalReminderSentAt": new Date()
                                    }
                                }
                            );

                            console.log(`VPS for subscription ${subscription._id} reactivated successfully.`);
                            await ComputeEngineController.startVPSInstance(subscription.vmId); // Optionally start VPS

                            await sendVPSStatusEmail(subscription.userId, subscription.vmId, "active");
                        } else {
                            // Proceed to suspend VPS if no funds added after grace period
                            console.log(`Grace period expired. VPS suspended due to insufficient funds.`);
                            await suspendVPS(subscription);
                            await Subscription.updateOne(
                                { _id: subscription._id },
                                { $set: { status: "suspended" } }
                            );
                            await sendVPSStatusEmail(subscription.userId, subscription.vmId, "suspended");
                        }
                    }
                    break;


                /** 🚫 **Handle Suspension & Final Termination** **/
                case "suspended":
                    console.log("####is suspended", currentDate.isSameOrAfter(suspendEndDate))
                    if (currentDate.isSameOrAfter(suspendEndDate)) {
                        await terminateVPS(subscription);
                        console.warn(`❌ VPS ${subscription.vmId?.label} terminated.`);
                    }
                    break;
            }
        }
    } catch (error) {
        console.error("❌ Error in VPS lifecycle process:", error);
    }
};

// 🚫 Suspend VPS
const suspendVPS = async (subscription) => {
    try {
        if (!subscription?.vmId) return;

        console.log(`🔻 Suspending VPS: ${subscription.vmId.label}`);
        const vps_id = subscription.vmId._id;
        const userId = subscription.userId._id;
        const project = process.env.GOOGLE_PROJECT_ID || 'nameword-435507';

        // Step 1: Suspend the VPS
        const { success, message } = await ComputeEngineController.suspendVPSInstance({ vps_id, userId, project, status: "suspended" });

        if (success) {
            console.log(`✅ VPS ${subscription.vmId.label} suspended successfully.`);

            // Step 2: Send Email Notification about VPS suspension
            await sendVPSStatusEmail(subscription.userId, subscription.vmId, "suspended");

            // Step 3: Mark Subscription as Suspended in the database
            await Subscription.updateOne(
                { _id: subscription._id },
                { $set: { status: "suspended", suspendEndDate: new Date() } } // Optionally add suspendEndDate if needed
            );
        } else {
            console.error(`❌ Failed to suspend VPS ${subscription.vmId.label}. Error: ${message}`);
        }
    } catch (error) {
        console.error(`⚠ Error suspending VPS for subscription ${subscription._id}:`, error);
    }
};


// 🗑️ Terminate VPS
const terminateVPS = async (subscription) => {
    try {
        if (!subscription?.vmId) return;

        console.log(`🗑️ Deleting expired VPS: ${subscription.vmId.label}`);
        const vps_id = subscription.vmId._id;
        const userId = subscription.userId._id;
        const project = process.env.GOOGLE_PROJECT_ID || 'nameword-435507';

        // Step 1: Delete the VPS
        const { success, message } = await ComputeEngineController.deleteVPSInstance({ vps_id, userId, project, status: "terminated" });
        if (success) {
            console.log(`✅ VPS ${subscription.vmId.label} deleted successfully.`);

            // Step 2: Send Email Notification
            await sendVMDeletionEmail(subscription.userId, subscription.vmId, subscription);

            // Step 3: Mark Subscription as Expired
            await Subscription.updateOne(
                { _id: subscription._id },
                { $set: { status: "terminated", emailSent: true } }
            );
        } else {
            console.error(`❌ Failed to delete VPS ${subscription.vmId.label}. Error: ${message}`);
        }
    } catch (error) {
        console.error(`⚠ Error deleting VPS for subscription ${subscription._id}:`, error);
    }
};

// Run every hour
schedule.scheduleJob("* * * * *", () => {
    console.log("⏳ Running VPS lifecycle job...");
    processVPSLifecycle();
});
