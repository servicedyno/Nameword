const ComputeEngineController = require("../controllers/compute-engine/ComputeEngineController");
const Subscription = require("../models/Subscription");
const Transaction = require("../models/Transaction");
const Wallet = require("../models/Wallet");
const transporter = require("../services/mailer");
const moment = require("moment");
const { calculateNextPaymentDate } = require("./walletHelper");
const nunjucks = require("nunjucks");
const env = require("../../start/env");

const sendSubscriptionCancellationEmail = async (subscription) => {
    const { userId: user, billingCycleId: billingCycle, vmId } = subscription;

    const emailHtml = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #ff4d4d; color: white; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; border-radius: 10px 10px 0 0;">
            ⚠ Your VPS Subscription Has Been Cancelled
        </div>
        <div style="padding: 20px; background-color: #f9f9f9; border-radius: 0 0 10px 10px; box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.2);">
            <p style="font-size: 18px; line-height: 1.6;">
                Hello <strong>${user?.name}</strong>,
            </p>
            <p style="font-size: 18px; line-height: 1.6;">
                Your <strong>${billingCycle?.type} VPS Plan</strong> has been successfully cancelled.
            </p>
            ${vmId ? `<p style="font-size: 18px; line-height: 1.6;">Your VPS instance <strong>${vmId?.label}</strong> has been deleted.</p>` : ""}

            <p style="font-size: 18px; line-height: 1.6;">
                If you wish to reactivate your subscription, please create a new VPS from your dashboard.
            </p>

            <table style="width: 100%; margin-top: 20px; border-collapse: separate; border-spacing: 0 10px;">
                <tr>
                    <td style="font-size: 16px; padding: 15px; background-color: #eee; border: 1px solid #ddd; border-radius: 5px;">
                        <strong>User Name:</strong> ${user?.name}
                    </td>
                </tr>
                <tr>
                    <td style="font-size: 16px; padding: 15px; background-color: #eee; border: 1px solid #ddd; border-radius: 5px;">
                        <strong>Email:</strong> ${user?.email}
                    </td>
                </tr>
                <tr>
                    <td style="font-size: 16px; padding: 15px; background-color: #eee; border: 1px solid #ddd; border-radius: 5px;">
                        <strong>VPS Instance:</strong> ${vmId?.label}
                    </td>
                </tr>
                <tr>
                    <td style="font-size: 16px; padding: 15px; background-color: #eee; border: 1px solid #ddd; border-radius: 5px;">
                        <strong>Billing Cycle:</strong> ${billingCycle?.type}
                    </td>
                </tr>
                <tr>
                    <td style="font-size: 16px; padding: 15px; background-color: #eee; border: 1px solid #ddd; border-radius: 5px;">
                        <strong>Status:</strong> Cancelled
                    </td>
                </tr>
            </table>

            <p style="font-size: 18px; line-height: 1.6; margin-top: 20px;">
                If you have any questions or need further assistance, please don't hesitate to reach out to our support team.
            </p>

            <div style="padding-top: 20px; color: #7f8c8d; font-size: 12px; text-align: center;">
                This is an automated message. Please do not reply to this email.
            </div>
        </div>
    </div>`;

    try {
        await transporter.sendMail({
            from: process.env.MAIL_FROM_ADDRESS,
            to: user.email,
            subject: `⚠ Your VPS Subscription Has Been Cancelled`,
            html: emailHtml,
        });
        console.log(`📩 Subscription cancellation email sent to ${user.email}`);
    } catch (error) {
        console.error('⚠ Error sending cancellation email:', error);
    }
};

const sendUserRenewalConfirmationEmail = async (subscription) => {
    const user = subscription.userId;
    if (!user || !user.email) return;

    try {
        // Check if user has email notifications enabled for subscriptions and payments
        const { shouldSendEmail } = require('../utils/notificationHelper');
        const canSendEmail = await shouldSendEmail(user, 'subscriptionsAndPayments');
        if (!canSendEmail) {
            console.log(`Email notification disabled for user ${user.email} - skipping renewal confirmation email`);
            return;
        }

        const productName = `${subscription?.cPanelPlanId?.name || subscription?.cPanelPlanId?.id || 'cPanel License'}`;
        const amount = subscription?.cPanelPlanId?.price || 0;
        const newExpiryDate = moment(subscription?.cPanel?.expiryDate).format("MMMM Do YYYY");
        
        let html = nunjucks.render('mails/renewal_success.html', {
            NAME: user.name || user.email,
            PRODUCT_NAME: productName,
            CURRENCY: 'USD',
            AMOUNT: amount.toFixed(2),
            NEW_EXPIRY_DATE: newExpiryDate,
            invoiceLink: env.FRONTEND_URL + '/account/invoices',
            logoUrl: env.FRONTEND_URL
        });

        await transporter.sendMail({
            from: process.env.MAIL_FROM_ADDRESS,
            to: user.email,
            subject: `Renewal confirmed - ${productName}`,
            html: html,
        });

        console.log(`📨 Renewal confirmation email sent to ${user?.email}`);
    } catch (error) {
        console.error('Error sending renewal confirmation email:', error);
    }
};

const sendAdminLicenseRenewalEmail = async (subscription) => {
    const user = subscription.userId;
    if (!user) return;

    const emailContent = {
        subject: `⚠️ cPanel License Renewal Required`,
        html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border-radius: 10px; overflow: hidden; box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.2);">
            <div style="background-color: #ff9800; color: white; text-align: center; padding: 20px; font-size: 24px; font-weight: bold; border-radius: 10px 10px 0 0;">
                ⚠️ cPanel License Renewal Required
            </div>
            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px;">
                <p style="font-size: 18px; line-height: 1.6;">
                    Hello <strong>${user?.name}</strong> (${user?.email}),
                </p>
                <p style="font-size: 18px; line-height: 1.6;">
                    Your <strong>${subscription?.cPanelPlanId?.type} VPS Plan</strong> is about to expire. Please find the details below:
                </p>

                <table style="width: 100%; margin-top: 10px; border-collapse: separate; border-spacing: 0 10px;">
                    <tr>
                        <td style="font-size: 16px; padding: 15px; background-color: #eee; border: 1px solid #ddd; border-radius: 5px;">
                            <strong>VPS Instance:</strong> ${subscription?.vmId?.label}
                        </td>
                    </tr>
                    <tr>
                        <td style="font-size: 16px; padding: 15px; background-color: #eee; border: 1px solid #ddd; border-radius: 5px;">
                            <strong>License Type:</strong> ${subscription?.cPanelPlanId?.name || subscription?.cPanelPlanId?.id}
                        </td>
                    </tr>
                    <tr>
                        <td style="font-size: 16px; padding: 15px; background-color: #eee; border: 1px solid #ddd; border-radius: 5px;">
                            <strong>License Price:</strong> $${subscription?.cPanelPlanId?.price || 0}
                        </td>
                    </tr>
                    <tr>
                        <td style="font-size: 16px; padding: 15px; background-color: #eee; border: 1px solid #ddd; border-radius: 5px;">
                            <strong>New Expiry Date:</strong> ${moment(subscription?.cPanel?.expiryDate).format("MMMM Do YYYY")}
                        </td>
                    </tr>
                    <tr>
                        <td style="font-size: 16px; padding: 15px; background-color: #eee; border: 1px solid #ddd; border-radius: 5px;">
                            <strong>Auto Renewal Status:</strong> ${subscription.autoRenewable ? "Enabled" : "Disabled"}
                        </td>
                    </tr>
                </table>

                <p style="font-size: 18px; line-height: 1.6; margin-top: 20px;">
                    Please activate the cPanel license for this user. If you have any questions, feel free to reach out.
                </p>

                <div style="padding-top: 20px; color: #7f8c8d; font-size: 12px; text-align: center;">
                    This is an automated message for the admin.
                </div>
            </div>
        </div>
        `,
    };

    await transporter.sendMail({
        from: process.env.MAIL_FROM_ADDRESS,
        to: process.env.ADMIN_MAIL_ADDRESS,
        subject: emailContent.subject,
        html: emailContent.html,
    });

    console.log(`📨 cPanel license renewal notification sent to admin`);
};

const sendCPanelSubscriptionCancellationEmail = async (subscription) => {
    const { userId: user, cPanelPlanId: cPanelPlan, vmId } = subscription;

    const emailHtml = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #ff4d4d; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0;">⚠ Your cPanel Subscription Has Been Cancelled</h1>
        </div>
        <div style="padding: 20px; background-color: #f9f9f9; border-radius: 0 0 10px 10px;">
            <p style="font-size: 18px; line-height: 1.6;">
                Hello <strong>${user?.name}</strong>,
            </p>
            <p style="font-size: 18px; line-height: 1.6;">
                Your <strong>${cPanelPlan?.name}</strong> cPanel subscription has been successfully cancelled.
            </p>
            
            <p style="font-size: 18px; line-height: 1.6;">
                <strong>VPS Instance:</strong> ${vmId ? `<strong>${vmId?.label}</strong> has been deleted as part of the cancellation process.` : 'Not available.'}
            </p>

            <p style="font-size: 18px; line-height: 1.6;">
                <strong>cPanel Plan Details:</strong>
            </p>
            <table style="width: 100%; margin-top: 10px; border-collapse: separate; border-spacing: 0 10px;">
              <tr>
                  <td style="font-size: 16px; padding: 15px; background-color: #eee; border: 1px solid #ddd; border-radius: 5px;">
                      <strong>Plan Name:</strong> ${cPanelPlan?.name ?? 'Not Available'}
                  </td>
              </tr>
              <tr>
                  <td style="font-size: 16px; padding: 15px; background-color: #eee; border: 1px solid #ddd; border-radius: 5px;">
                      <strong>Plan Type:</strong> ${cPanelPlan?.type ?? 'Not Available'}
                  </td>
              </tr>
              <tr>
                  <td style="font-size: 16px; padding: 15px; background-color: #eee; border: 1px solid #ddd; border-radius: 5px;">
                      <strong>License Price:</strong> $${cPanelPlan?.price ?? 'Not Available'}
                  </td>
              </tr>
              <tr>
                  <td style="font-size: 16px; padding: 15px; background-color: #eee; border: 1px solid #ddd; border-radius: 5px;">
                      <strong>Cancellation Reason:</strong> User has cancelled the cPanel subscription
                  </td>
              </tr>
            </table>

            <p style="font-size: 18px; line-height: 1.6;">
                If you wish to reactivate your cPanel subscription, please create a new VPS or contact our support team.
            </p>

            <p style="font-size: 18px; line-height: 1.6;">
                Please note that this cancellation is permanent. If you want to create a new subscription, please visit your dashboard and follow the necessary steps.
            </p>

            <!-- Footer -->
            <div style="padding-top: 20px; color: #7f8c8d; font-size: 12px; text-align: center;">
                This is an automated message. Please do not reply to this email.
            </div>
        </div>
    </div>`;

    try {
        await transporter.sendMail({
            from: process.env.MAIL_FROM_ADDRESS,
            to: user.email,
            subject: `⚠ Your cPanel Subscription Has Been Cancelled`,
            html: emailHtml,
        });
        console.log(`📩 cPanel subscription cancellation email sent to ${user.email}`);
    } catch (error) {
        console.error('⚠ Error sending cPanel cancellation email:', error);
    }
};


const sendAdminCPanelSubscriptionCancelledEmail = async (subscription) => {
    const { userId: user, cPanelPlanId: cPanelPlan, vmId } = subscription;

    const adminEmailHtml = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #ff9800; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0;">⚠ cPanel Subscription Cancelled for User</h1>
        </div>
        <div style="padding: 20px; background-color: #f9f9f9; border-radius: 0 0 10px 10px;">
            <p style="font-size: 18px; line-height: 1.6;">
                Hello Admin,
            </p>
            <p style="font-size: 18px; line-height: 1.6;">
                The cPanel subscription for the following user has been cancelled:
            </p>
            <p style="font-size: 18px; line-height: 1.6; color: #ff4d4d;">
                <strong>User:</strong> ${user?.name} (${user?.email ?? 'No email available'})
            </p>
            <p style="font-size: 18px; line-height: 1.6;">
                <strong>cPanel Plan:</strong> ${cPanelPlan?.name ?? 'Not selected'}
            </p>
            <p style="font-size: 18px; line-height: 1.6;">
                <strong>VPS Instance:</strong> ${vmId?.label ?? 'Not available'}
            </p>
            <p style="font-size: 18px; line-height: 1.6;">
                <strong>Reason:</strong> Subscription cancellation.
            </p>
            <p style="font-size: 18px; line-height: 1.6;">
                Please note that this action has been completed due to non-payment or other reasons.
            </p>

            <!-- Contact User Button -->
            ${user?.email ? `
                <div style="text-align: center; margin-top: 20px;">
                    <a href="mailto:${user.email}" 
                    style="background-color: #007bff; color: white; text-decoration: none; padding: 12px 24px; font-size: 18px; border-radius: 5px; display: inline-block;">
                        📧 Contact User
                    </a>
                </div>` : ''}

            <p style="font-size: 18px; line-height: 1.6; margin-top: 20px;">
                If you need any further assistance or details, please feel free to follow up with the user.
            </p>
        </div>
        <div style="padding-top: 20px; color: #7f8c8d; font-size: 12px; text-align: center;">
            This is an automated message for the admin.
        </div>
    </div>`;

    try {
        await transporter.sendMail({
            from: process.env.MAIL_FROM_ADDRESS,
            to: process.env.ADMIN_MAIL_ADDRESS,
            subject: `⚠ cPanel Subscription Cancelled for User ${user?.name}`,
            html: adminEmailHtml,
        });
        console.log(`📨 Admin notification sent for cPanel subscription cancellation`);
    } catch (error) {
        console.error('⚠ Error sending admin cPanel cancellation email:', error);
    }
};

// Function to send email notification after VPS deletion
const sendVMDeletionEmail = async (user, vpsDetails, subscription) => {
    const emailHtml = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #ff4d4d; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0;">⚠ Your VPS Has Been Deleted!</h1>
        </div>
        <div style="padding: 20px; background-color: #f9f9f9; border-radius: 0 0 10px 10px;">
            <p style="font-size: 18px;">
                Hello <strong>${user.name}</strong>,
            </p>
            <p style="font-size: 18px; color: #ff4d4d;">
                Your VPS instance <strong>${vpsDetails.label}</strong> has been permanently deleted due to subscription expiration.
            </p>
            <p style="font-size: 18px;">
                If you need a new VPS, you can create one from your account dashboard.
            </p>
        </div>
    </div>`;

    try {
        // const lastEmailTime = subscription?.lastexpireOrRenewEmailSentAt ? moment(subscription?.lastexpireOrRenewEmailSentAt) : null;

        // if (subscription?.expireOrRenewEmailSent && lastEmailTime && lastEmailTime.isAfter(moment())) {
        //     console.log(`⏭️ Skipping email for ${subscription._id}, already sent.`);
        //     return;
        // }
        await transporter.sendMail({
            from: process.env.MAIL_FROM_ADDRESS,
            to: user.email,
            subject: `⚠ Your VPS Has Been Deleted!`,
            html: emailHtml,
        });
        console.log(`VM deletion email sent to ${user.email}`);
        await Subscription.updateOne(
            { _id: subscription._id },
            {
                $set: {
                    status: "expired",
                    // expireOrRenewEmailSent: true,
                    // lastexpireOrRenewEmailSentAt: new Date()
                }
            }
        );
    } catch (error) {
        console.error('Error sending VM deletion email:', error);
    }
};

const renewCPanelLicense = async (subscriptionId) => {
    try {
        // Fetch subscription details
        const subscription = await Subscription.findById(subscriptionId)
            .populate('userId')
            .populate('cPanelPlanId');

        if (!subscription) {
            throw new Error("Subscription not found.");
        }

        const userId = subscription.userId._id;
        let wallet = await Wallet.findOne({ userId });

        // Auto-create wallet if not found
        if (!wallet) {
            wallet = new Wallet({ userId });
            await wallet.save();
            console.log(`🔹 Auto-created wallet for user ${userId}`);
            wallet = await Wallet.findOne({ userId }); // Re-fetch wallet
        }

        const userBalance = wallet.balance.get("USD") || 0;
        const price = subscription.cPanelPlanId.price;

        if (userBalance < price) {
            throw new Error("Insufficient balance to renew subscription.");
        }

        // **Rollback Variables**
        const oldWalletBalance = userBalance; // Store old balance for rollback
        let transaction = null;
        let subscriptionUpdated = false;

        try {
            // Deduct balance from wallet
            wallet.balance.set("USD", userBalance - price);
            await wallet.save();

            // Create a transaction record
            const reference = `renewal_${subscriptionId}_${moment().format("YYYYMMDDHHmmss")}`;
            transaction = new Transaction({
                userId: wallet.userId,
                walletId: wallet._id,
                amount: price,
                currency: "USD",
                type: "debit",
                method: "wallet_balance",
                reference: reference,
                status: "completed",
                from: "nameword",
                createdAt: new Date(),
            });

            await transaction.save();

            // Calculate new expiry date
            const newExpiryDate = ComputeEngineController.calculateCPanelExpiryDate(
                subscription.cPanelPlanId.billingDuration,
                subscription.cPanelPlanId.durationValue,
                subscription.cPanel.expiryDate
            );

            // Update subscription details
            const updateResult = await Subscription.updateOne(
                { _id: subscriptionId },
                {
                    $set: {
                        "cPanel.status": "active",
                        "cPanel.expiryDate": newExpiryDate,
                        "cPanel.renewal.firstReminderSent": false,
                        "cPanel.renewal.finalReminderSent": false,
                        "cPanel.renewal.firstReminderSentAt": null,
                        "cPanel.renewal.finalReminderSentAt": null,
                        "cPanel.licenseCanceled": false,
                    }
                }
            );

            if (updateResult.modifiedCount === 0) {
                throw new Error("Failed to update subscription.");
            }
            subscriptionUpdated = true; // Mark that subscription was successfully updated

            console.log(`✅ cPanel License ${subscriptionId} renewed successfully. Transaction Ref: ${transaction.reference}`);

        } catch (err) {
            console.error("❌ Error during renewal process. Rolling back...", err);

            // **Rollback Steps**
            if (wallet.balance.get("USD") !== oldWalletBalance) {
                wallet.balance.set("USD", oldWalletBalance); // Revert wallet balance
                await wallet.save();
                console.log("✅ Wallet balance rollback successful.");
            }

            if (transaction) {
                await Transaction.deleteOne({ _id: transaction._id }); // Remove failed transaction
                console.log("✅ Transaction rollback successful.");
            }

            if (subscriptionUpdated) {
                // Restore previous subscription state (Assuming we store backup data)
                await Subscription.updateOne(
                    { _id: subscriptionId },
                    {
                        $set: {
                            "cPanel.status": "expired",
                            "cPanel.licenseCanceled": true
                        }
                    }
                );
                console.log("✅ Subscription rollback successful.");
            }

            throw err; // Re-throw error for handling in API or cron job
        }

        // Fetch updated subscription details after renewal
        const updatedSubscription = await Subscription.findById(subscriptionId)
            .populate('userId')
            .populate('cPanelPlanId');

        // Send email notifications
        await sendUserRenewalConfirmationEmail(updatedSubscription);
        await sendAdminLicenseRenewalEmail(updatedSubscription);

        return {
            success: true,
            message: "cPanel License renewed successfully.",
            transactionReference: transaction.reference,
            subscriptionEnd: updatedSubscription.cPanel.expiryDate
        };

    } catch (error) {
        console.error("❌ Error renewing cPanel License:", error);
        return { success: false, message: error.message || "Something went wrong." };
    }
};

const sendAutoRenewalEmail = async (subscription) => {
    const { userId: user, billingCycleId: billingCycle, vmId: vpsDetails, price } = subscription;

    try {
        
        const { shouldSendEmail } = require('../utils/notificationHelper');
        const canSendEmail = await shouldSendEmail(user, 'subscriptionsAndPayments');
        if (!canSendEmail) {
            console.log(`Email notification disabled for user ${user.email || user._id} - skipping auto-renewal email`);
            return;
        }

        const productName = `${billingCycle?.type} VPS Plan`;
        const nextExpiryDate = moment(subscription.subscriptionEnd).format("MMMM Do YYYY");
        
        let html = nunjucks.render('mails/renewal_success.html', {
            NAME: user.name || user.email,
            PRODUCT_NAME: productName,
            CURRENCY: 'USD',
            AMOUNT: price.toFixed(2),
            NEW_EXPIRY_DATE: nextExpiryDate,
            invoiceLink: env.FRONTEND_URL + '/account/invoices',
            logoUrl: env.FRONTEND_URL
        });

        await transporter.sendMail({
            from: process.env.MAIL_FROM_ADDRESS,
            to: user.email,
            subject: `Renewal confirmed - ${productName}`,
            html: html,
        });
        console.log(`📩 Auto-renewal email sent to ${user.email}`);
    } catch (error) {
        console.error('⚠ Error sending auto-renewal email:', error);
    }
};


const renewSubscriptionByWallet = async ({ subscriptionId, isAutoRenewal = false }) => {
    try {
        // Fetch subscription details
        const subscription = await Subscription.findById(subscriptionId)
            .populate("userId")
            .populate("vmId")
            .populate("planId")
            .populate("billingCycleId")
            .populate("cPanelPlanId")
            .populate("osId")
            .populate("diskTypeId");

        if (!subscription) {
            throw new Error("Subscription not found.");
        }

        // If auto-renewal, use subscription's userId
        const user = subscription.userId._id;
        if (!user) {
            throw new Error("User not found.");
        }

        // Fetch user's wallet
        let wallet = await Wallet.findOne({ userId: user._id });
        if (!wallet) {
            wallet = new Wallet({ userId: user._id });
            await wallet.save();
            wallet = await Wallet.findOne({ userId: user._id });
        }

        const userBalance = wallet.balance.get("USD") || 0;
        const price = subscription.price;

        // Check if the user has enough balance
        if (userBalance < price) {
            throw new Error("Insufficient balance to renew subscription.");
        }

        // **Rollback Variables**
        const oldWalletBalance = userBalance; // Store old balance for rollback
        let transaction = null;
        let subscriptionUpdated = false;

        try {
            // Deduct balance from wallet
            wallet.balance.set("USD", userBalance - price);
            await wallet.save();

            // Create a transaction record
            const reference = `${isAutoRenewal ? "auto_" : ""}renewal_${subscriptionId}_${moment().format("YYYYMMDDHHmmss")}`;
            transaction = new Transaction({
                userId: wallet.userId,
                walletId: wallet._id,
                amount: price,
                currency: "USD",
                type: "debit",
                method: "wallet_balance",
                reference: reference,
                status: "completed",
                from: "nameword",
                createdAt: new Date(),
            });

            await transaction.save();

            // Calculate and update next payment date
            const newEndDate = calculateNextPaymentDate(subscription.subscriptionEnd, subscription.billingCycleId.type);

            // Update subscription details
            const updateResult = await Subscription.updateOne(
                { _id: subscriptionId },
                {
                    $set: {
                        status: "active",
                        cycleStart: moment.utc(),
                        updatedAt: moment.utc(),
                        subscriptionEnd: newEndDate,
                        "vpsPlanReminders.renewal.firstReminderSent": true,
                        "vpsPlanReminders.renewal.firstReminderSentAt": new Date(),
                        "vpsPlanReminders.renewal.finalReminderSent": true,
                        "vpsPlanReminders.renewal.finalReminderSentAt": new Date()
                    }
                }
            );

            if (updateResult.modifiedCount === 0) {
                throw new Error("Failed to update subscription.");
            }
            subscriptionUpdated = true; // Mark that subscription was successfully updated

            console.log(`✅ Subscription ${subscriptionId} renewed successfully. Transaction Ref: ${transaction.reference}`);

        } catch (err) {
            console.error("❌ Error during renewal process. Rolling back...", err);

            // **Rollback Steps**
            if (wallet.balance.get("USD") !== oldWalletBalance) {
                wallet.balance.set("USD", oldWalletBalance); // Revert wallet balance
                await wallet.save();
                console.log("✅ Wallet balance rollback successful.");
            }

            if (transaction) {
                await Transaction.deleteOne({ _id: transaction._id }); // Remove failed transaction
                console.log("✅ Transaction rollback successful.");
            }

            if (subscriptionUpdated) {
                // Restore previous subscription state
                console.log("✅ Subscription rollback successful.");
            }

            throw err; // Re-throw error for handling in API or cron job
        }

        // Fetch updated subscription details after renewal
        const updatedSubscription = await Subscription.findById(subscriptionId)
            .populate("userId")
            .populate("vmId")
            .populate("planId")
            .populate("billingCycleId")
            .populate("cPanelPlanId")
            .populate("osId")
            .populate("diskTypeId");

        // Send email notifications
        await sendAutoRenewalEmail(updatedSubscription);

        return {
            success: true,
            message: "Subscription renewed successfully.",
            transactionReference: transaction.reference,
            data: updatedSubscription,
        };

    } catch (error) {
        console.error("❌ Error renewing subscription:", error);
        return { success: false, message: error.message || "Something went wrong." };
    }
};

module.exports = {
    sendSubscriptionCancellationEmail,
    sendUserRenewalConfirmationEmail,
    sendAdminLicenseRenewalEmail,
    renewCPanelLicense,
    sendVMDeletionEmail,
    renewSubscriptionByWallet,
    sendCPanelSubscriptionCancellationEmail,
    sendAdminCPanelSubscriptionCancelledEmail,
    sendAutoRenewalEmail
}