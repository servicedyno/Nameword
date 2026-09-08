const moment = require('moment');
const RDPSubscription = require('../models/RDPSubscription');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const RDPEmailController = require('../controllers/rdp/rdpEmailController');

const calculateSubscriptionEnd = async ({ billingCycleType, base = moment() }) => {
    if (!billingCycleType) throw new Error('Invalid billing cycle ID');
    let end;

    console.log("##billingCycleType",billingCycleType.toLowerCase());
    switch (billingCycleType.toLowerCase()) {
        case 'hourly':
            end = base.clone().add(1, 'hour');
            break;
        case 'monthly':
            end = base.clone().add(28, 'days');
            break;
        case 'quarterly':
            end = base.clone().add(28 * 3, 'days'); // 84 days
            break;
        case 'annually':
            end = base.clone().add(28 * 12, 'days'); // 336 days
            break;
        default:
            throw new Error('Unsupported billing cycle type');
    }

    return end.toDate();
};

const renewRDPSubscriptionAndUpdateDB = async ({ subscriptionId, useWallet = false }) => {

    let wallet, oldBalance, transaction = null;
    let originalStatus;
    try {
        const subscription = await RDPSubscription.findById(subscriptionId)
            .populate("userId")
            .populate("billingCycleId")
            .populate("rdpId")
            .populate("planId");

        if (!subscription) throw new Error("Subscription not found.");

        originalStatus = subscription.status;
        const userId = subscription.userId._id;
        const billingType = subscription.billingCycleId.type.toLowerCase();
        const plan = subscription.planId;
        const price = subscription.price;

        const now = moment();
        const currentEnd = moment(subscription.subscriptionEnd);
        const baseDate = currentEnd.isAfter(now) ? currentEnd : now;
        const newEnd = await calculateSubscriptionEnd({ billingCycleType: billingType, base: baseDate });


        // 🪙 Wallet flow
        if (useWallet) {
            wallet = await Wallet.findOne({ userId });

            if (!wallet) {
                wallet = new Wallet({ userId });
                await wallet.save();
            }

            oldBalance = wallet.balance.get("USD") || 0;
            if (oldBalance < price) throw new Error("Insufficient wallet balance.");

            // Deduct balance
            wallet.balance.set("USD", oldBalance - price);
            await wallet.save();

            // Record transaction
            const reference = `rdp_renew_${subscriptionId}_${moment().format("YYYYMMDDHHmmss")}`;
            transaction = new Transaction({
                userId,
                walletId: wallet._id,
                amount: price,
                currency: "USD",
                type: "debit",
                method: "wallet_balance",
                reference,
                status: "completed",
                from: "rdp-subscription",
                createdAt: new Date()
            });
            await transaction.save();
        }

        // ⏳ Update subscription
        subscription.subscriptionEnd = newEnd;
        subscription.status = "active";
        subscription.renewal.firstReminderSent = false;
        subscription.renewal.finalReminderSent = false;
        subscription.renewal.firstReminderSentAt = null;
        subscription.renewal.finalReminderSentAt = null;
        await subscription.save();

        // 📧 Send confirmation email
        await RDPEmailController.sendRDPRenewalConfirmationEmail(subscription);

        return {
            success: true,
            message: "RDP subscription renewed successfully.",
            transactionReference: transaction?.reference || null,
            subscriptionEnd: newEnd.toISOString()
        };
    } catch (error) {
        console.error("❌ Error in renewRDPSubscriptionLogic:", error);

        // 🧯 Rollback if needed
        if (useWallet && wallet && typeof oldBalance !== "undefined") {
            wallet.balance.set("USD", oldBalance);
            await wallet.save();
        }

        if (useWallet && transaction) {
            await Transaction.deleteOne({ _id: transaction._id });
        }

        if (originalStatus === "expired") {
            await RDPSubscription.updateOne(
                { _id: subscriptionId },
                { $set: { status: "expired" } }
            );
        }

        return {
            success: false,
            message: error.message || "Failed to renew subscription"
        };
    }
};


module.exports = { calculateSubscriptionEnd, renewRDPSubscriptionAndUpdateDB };
