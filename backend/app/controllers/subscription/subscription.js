const VpsPlan = require("../../models/VPSPlan");
const CPanelPlan = require("../../models/CpanelPlan");
const OperatingSystem = require("../../models/OperatingSystem");
const VPSBillingCycleDiscount = require("../../models/VPSBillingCycleDiscount");
const Subscription = require("../../models/Subscription");
const { calculateNextPaymentDate } = require("../../helpers/walletHelper");
const ComputeEngineController = require("../compute-engine/ComputeEngineController");
const {
    sendSubscriptionCancellationEmail,
    renewCPanelLicense,
    sendUserRenewalConfirmationEmail,
    sendAdminLicenseRenewalEmail,
    renewSubscriptionByWallet,
    sendCPanelSubscriptionCancellationEmail,
    sendAdminCPanelSubscriptionCancelledEmail,
    sendAutoRenewalEmail
} = require("../../helpers/subscriptionHelper");
const moment = require("moment");

const createSubscription = async (req, res) => {
    try {
        const { userId, vpsPlanId, osId, cPanelPlanId, billingCycle, autoRenew } = req.body;

        // Fetch required details
        const vpsPlan = await VpsPlan.findById(vpsPlanId);
        const os = await OperatingSystem.findById(osId);
        const billingCycleDiscount = await VPSBillingCycleDiscount.findOne({ type: billingCycle });
        const cPanelPlan = cPanelPlanId ? await CPanelPlan.findById(cPanelPlanId) : null;

        winston.info('Selected Plan Details:', {
            vpsPlanId,
            os,
            billingCycleDiscount,
            cPanelPlan
        });

        if (!vpsPlan || !os || !billingCycleDiscount) {
            return res.status(400).json({ success: false, message: "Invalid plan, OS, or billing cycle." });
        }

        // Calculate base price
        let basePrice = vpsPlan.monthlyPrice; // Default monthly pricen
        if (billingCycle === "hourly") {
            basePrice = vpsPlan.hourlyPrice * 730; // Approximate hours in a month
        }

        // Apply billing cycle discount
        const discountAmount = (basePrice * billingCycleDiscount.discount) / 100;
        let totalPrice = basePrice - discountAmount;

        // Add OS price (Windows has extra cost)
        totalPrice += os.price;

        // Add cPanel plan price if selected
        if (cPanelPlan) {
            totalPrice += cPanelPlan.price;
        }

        // Determine subscription end date based on billing cycle
        let endDate = new Date();
        if (billingCycle === "monthly") endDate.setMonth(endDate.getMonth() + 1);
        else if (billingCycle === "quarterly") endDate.setMonth(endDate.getMonth() + 3);
        else if (billingCycle === "annually") endDate.setFullYear(endDate.getFullYear() + 1);

        // Create subscription
        const subscription = new Subscription({
            userId,
            vpsPlanId,
            osId,
            cPanelPlanId,
            billingCycle,
            startDate: new Date(),
            endDate,
            autoRenew,
            totalPrice
        });

        await subscription.save();
        return res.status(201).json({ success: true, message: "Subscription created successfully.", data: subscription });

    } catch (error) {
        console.error("Error creating subscription:", error);
        return res.status(500).json({ success: false, message: "Error creating subscription.", details: error.message });
    }
}

const getSubscription = async (req, res) => {
    try {
        const userId = req.user._id;
        const { vps_id, subscription_id, status = "active" } = req.query;
        console.log("##userId", userId)
        // const { vps_id, status="active" } = req.query; 

        // Build the query to find subscriptions
        const query = { userId };

        if (subscription_id) {
            query._id = subscription_id;
        }
        // If vps_id is provided, add it to the query
        if (vps_id) {
            query.vmId = vps_id;
        }
        if (status) {
            query.status = status;
        }

        // Fetch subscriptions based on the query
        const subscriptions = await Subscription.find(query)
            .populate('planId') // Populate plan details
            .populate('billingCycleId') // Populate billing cycle details
            .populate('cPanelPlanId') // Populate cPanel plan details
            .populate('osId') // Populate OS details
            .populate('diskTypeId') // Populate disk type details
            .populate('vmId') // Populate VM details
            .lean();

        // Return the subscriptions in the response
        res.status(200).json({
            success: true,
            data: subscriptions,
            message: 'Subscriptions retrieved successfully.',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: `Error retrieving subscriptions: ${error.message}`,
        });
    }
};

const updateSubscription = async (req, res) => {
    try {
        const userId = req.user._id;
        const { subscription_id } = req.params;
        const { autoRenewable } = req.body;

        // Find the subscription
        const subscription = await Subscription.findOne({ _id: subscription_id, userId }).populate('billingCycleId');

        if (!subscription) {
            return res.status(404).json({ message: 'Subscription not found', success: false });
        }
        console.log("###subscription", subscription)
        const expirationDate = subscription.subscriptionEnd;
        // Update the autoRenewable field if provided
        if (autoRenewable !== undefined) {
            subscription.autoRenewable = autoRenewable;

            await subscription.save();
            if (autoRenewable) {
                return res.status(200).json({
                    success: true,
                    message: `Auto-renewal enabled. Your VPS will automatically renew on ${expirationDate}.`,
                    data: subscription,
                });
            } else {
                return res.status(200).json({
                    success: true,
                    message: `Auto-renewal disabled. Your VPS will expire on ${expirationDate} unless manually renewed.`,
                    data: subscription,
                });
            }
        }
        await subscription.save();

        res.status(200).json({
            success: true,
            message: 'Subscription updated successfully.',
            data: subscription,
        });
    } catch (error) {
        res.status(500).json({ message: `Error updating subscription: ${error.message}`, success: false });
    }
};

const renewcPanelUsingWalletSubscription = async (req, res) => {
    try {
        const { subscriptionId } = req.body;
        const result = await renewCPanelLicense(subscriptionId);

        if (!result.success) {
            return res.status(400).json({ success: false, message: result.message });
        }

        return res.status(200).json({
            success: true,
            message: result.message,
            transactionReference: result.transactionReference,
            subscriptionEnd: result.subscriptionEnd
        });

    } catch (error) {
        console.error("❌ Error in API renewal:", error);
        return res.status(500).json({ success: false, message: error.message || "Something went wrong." });
    }
};


const renewcPanelSubscription = async (req, res) => {
    try {
        const { subscriptionId } = req.body;

        // Fetch subscription details
        const subscription = await Subscription.findById(subscriptionId)
            .populate('userId')            // Fetch user details
            .populate('vmId')              // Fetch VM details
            .populate('planId')            // Fetch Plan details
            .populate('billingCycleId')    // Fetch Billing Cycle details
            .populate('cPanelPlanId')      // Fetch cPanel Plan details
            .populate('osId')              // Fetch OS details
            .populate('diskTypeId');       // Fetch Disk Type details

        if (!subscription) {
            return res.status(404).json({ success: false, message: "Subscription not found." });
        }

        if(!subscription.price <= 0) {
            return res.status(400).json({ success: false, message: "Free Trial subscription can't be renew." });
        }

        // Calculate and update next payment date
        const cPanelLicenseExpiryDate = ComputeEngineController.calculateCPanelExpiryDate(subscription.cPanelPlanId.billingDuration, subscription.cPanelPlanId.durationValue, subscription?.cPanel?.expiryDate);

        await Subscription.updateOne(
            { _id: subscriptionId },
            {
                $set: {
                    // Update cPanel license status and expiry date
                    "cPanel.status": "active", // Set cPanel status to "active"
                    "cPanel.expiryDate": cPanelLicenseExpiryDate, // Update cPanel expiry date
                    "cPanel.licenseCanceled": false, // Set licenseCanceled flag to false

                    // Reset cPanel renewal reminders
                    "cPanel.renewal.firstReminderSent": false, // Reset first reminder for renewal
                    "cPanel.renewal.firstReminderSentAt": null, // Nullify the timestamp for the first renewal reminder
                    "cPanel.renewal.finalReminderSent": false, // Reset final reminder for renewal
                    "cPanel.renewal.finalReminderSentAt": null, // Nullify the timestamp for the final renewal reminder
                }
            }
        );

        console.log(`✅ cPanel License ${subscriptionId} renewed successfully.`);

        // Fetch updated subscription details after renewal
        const updatedSubscription = await Subscription.findById(subscriptionId)
            .populate('userId')
            .populate('vmId')
            .populate('planId')
            .populate('billingCycleId')
            .populate('cPanelPlanId')
            .populate('osId')
            .populate('diskTypeId');

        // Send email notifications
        await sendUserRenewalConfirmationEmail(updatedSubscription); // Send to user
        await sendAdminLicenseRenewalEmail(updatedSubscription); // Send to admin

        return res.status(200).json({
            success: true,
            message: "cPanel License renewed successfully.",
            data: updatedSubscription,
            cPanelLicenseExpiryDate: cPanelLicenseExpiryDate
        });

    } catch (error) {
        console.error("Error renewing cPanel License:", error);
        return res.status(500).json({ success: false, message: error?.message || "Something went wrong" });
    }
};

const renewUsingWalletSubscription = async (req, res) => {
    try {
        const response = await renewSubscriptionByWallet({
            subscriptionId: req.body.subscriptionId,
            isAutoRenewal: false
        });

        if (!response.success) {
            return res.status(400).json(response);
        }

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({ success: false, message: error?.message || "Something went wrong" });
    }
};

const renewSubscription = async (req, res) => {
    try {
        const { subscriptionId } = req.body;

        // Fetch subscription details
        const subscription = await Subscription.findById(subscriptionId)
            .populate('userId')            // Fetch user details
            .populate('vmId')              // Fetch VM details
            .populate('planId')            // Fetch Plan details
            .populate('billingCycleId')    // Fetch Billing Cycle details
            .populate('cPanelPlanId')      // Fetch cPanel Plan details
            .populate('osId')              // Fetch OS details
            .populate('diskTypeId');       // Fetch Disk Type details

        if (!subscription) {
            return res.status(404).json({ success: false, message: "Subscription not found." });
        }

        // Calculate and update next payment date
        const subscriptionEnd = calculateNextPaymentDate(subscription.subscriptionEnd, subscription.billingCycleId.type);

        await Subscription.updateOne(
            { _id: subscriptionId },
            {
                $set: {
                    status: "active",
                    cycleStart: moment.utc(),
                    updatedAt: moment.utc(),
                    subscriptionEnd: subscriptionEnd,
                    "vpsPlanReminders.renewal.firstReminderSent": true,
                    "vpsPlanReminders.renewal.firstReminderSentAt": new Date(),
                    "vpsPlanReminders.renewal.finalReminderSent": true,
                    "vpsPlanReminders.renewal.finalReminderSentAt": new Date()
                }
            }
        );

        console.log(`✅ Subscription ${subscriptionId} renewed successfully`);

        // Fetch updated subscription details after renewal
        const updatedSubscription = await Subscription.findById(subscriptionId)
            .populate('userId')
            .populate('vmId')
            .populate('planId')
            .populate('billingCycleId')
            .populate('cPanelPlanId')
            .populate('osId')
            .populate('diskTypeId');

        // Send email notification after successful renewal
        await sendAutoRenewalEmail(updatedSubscription);

        return res.status(200).json({
            success: true,
            message: "Subscription renewed successfully.",
            subscriptionEnd: subscriptionEnd,
            data: updatedSubscription
        });

    } catch (error) {
        console.error("Error renewing subscription:", error);
        return res.status(500).json({ success: false, message: error?.message || "Something went wrong" });
    }
};

const cancelSubscription = async (req, res) => {
    try {
        const { subscription_id } = req.params;

        // Fetch subscription details
        const subscription = await Subscription.findOne({ _id: subscription_id })
            .populate("vmId")
            .populate("billingCycleId")
            .populate("userId");

        if (!subscription) {
            return res.status(404).json({ success: false, message: "Subscription not found." });
        }

        // Check if the subscription is already canceled
        if (subscription.status === "cancelled") {
            return res.status(400).json({ success: false, message: "Subscription is already cancelled." });
        }

        // If the subscription has an active VPS, delete it
        if (subscription.vmId) {
            console.log(`Deleting VPS instance: ${subscription.vmId.label}`);
            const { success, message } = await ComputeEngineController.deleteVPSInstance({
                vps_id: subscription.vmId._id,
                userId: subscription.userId._id,
                project: process.env.GOOGLE_PROJECT_ID || "nameword-435507",
                status: "cancelled"
            });

            if (!success) {
                return res.status(500).json({ success: false, message: `Failed to delete VPS: ${message}` });
            }
        }

        // Update subscription status to "cancelled"
        await Subscription.updateOne(
            { _id: subscription_id },
            { $set: { status: "cancelled", subscriptionEnd: new Date(), autoRenewable: false } }
        );

        // Send cancellation confirmation email
        await sendSubscriptionCancellationEmail(subscription);

        console.log(`✅ Subscription ${subscription_id} cancelled successfully.`);
        return res.status(200).json({
            success: true,
            message: "Subscription cancelled successfully.",
            subscription_id
        });

    } catch (error) {
        console.error("Error cancelling subscription:", error);
        return res.status(500).json({ success: false, message: error?.message || "Something went wrong" });
    }
};

const cancelCPanelSubscription = async (req, res) => {
    try {
        const { subscription_id } = req.params;

        // Fetch subscription details
        const subscription = await Subscription.findById(subscription_id)
            .populate('userId')
            .populate('cPanelPlanId');

        if (!subscription) {
            return res.status(404).json({ success: false, message: "Subscription not found." });
        }

        // If the cPanel is already canceled, return a response
        if (subscription?.cPanel?.licenseCanceled) {
            return res.status(400).json({ success: false, message: "cPanel subscription is already canceled." });
        }

        // Update subscription and cPanel status to canceled
        await Subscription.updateOne(
            { _id: subscription_id },
            {
                $set: {
                    "cPanel.status": "expired",
                    "cPanel.licenseCanceled": true,
                    "cPanel.expiry.firstReminderSent": true,
                    "cPanel.expiry.firstReminderSentAt": new Date(),
                }
            }
        );
        // Send cancellation email to user
        await sendCPanelSubscriptionCancellationEmail(subscription);

        // Send notification email to admin
        await sendAdminCPanelSubscriptionCancelledEmail(subscription);

        console.log(`✅ cPanel subscription ${subscription_id} canceled successfully.`);

        return res.status(200).json({ success: true, message: "cPanel subscription canceled successfully." });
    } catch (error) {
        console.error("❌ Error canceling cPanel subscription:", error);
        return res.status(500).json({ success: false, message: error.message || "Something went wrong." });
    }
};

module.exports = {
    createSubscription,
    getSubscription,
    updateSubscription,
    renewUsingWalletSubscription,
    renewSubscription,
    renewcPanelUsingWalletSubscription,
    renewcPanelSubscription,
    cancelSubscription,
    sendAdminLicenseRenewalEmail,
    renewCPanelLicense,
    cancelCPanelSubscription
};