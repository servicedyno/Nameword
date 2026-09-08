const schedule = require("node-schedule");
const moment = require("moment");
const RDPSubscription = require("../models/RDPSubscription");
const Wallet = require("../models/Wallet");
const RDPEmailController = require("../controllers/rdp/rdpEmailController");
const UpCloudController = require("../controllers/upcloud/upcloudController");
const { renewRDPSubscriptionAndUpdateDB, calculateSubscriptionEnd } = require("../helpers/rdpHelper");
const RDPInstance = require("../models/RDPInstance");

const GRACE_PERIOD_DAYS = 5;
const REINSTATEMENT_FEE = 0; // in USD

const processRDPLifecycle = async () => {
    try {
        const now = moment.utc();
        const bufferTime = moment.utc().subtract(1, "minutes");

        const subscriptions = await RDPSubscription.find({
            subscriptionEnd: { $lt: bufferTime.toDate() },
            status: { $in: ["active", "pending_renewal", "grace_period", "suspended"] },
        }).populate("userId").populate("planId").populate("billingCycleId").populate("rdpId");

        console.log(`🔁 Found ${subscriptions.length} subscriptions for lifecycle processing`);

        for (const subscription of subscriptions) {
            const { rdpId: rdp, userId: user } = subscription;
            const wallet = await Wallet.findOne({ userId: user._id });

            const balance = wallet?.balance.get("USD") || 0;
            const totalDue = subscription.price + REINSTATEMENT_FEE;
            const status = subscription.status;
            const end = moment.utc(subscription.subscriptionEnd);
            const graceEnd = end.clone().add(GRACE_PERIOD_DAYS, "days");

            switch (status) {
                case "active":
                    if (subscription.autoRenewable) {
                        subscription.status = "pending_renewal";
                        await subscription.save();
                    } else {
                        console.log(`🔻 Auto-renew disabled for ${subscription._id}. Checking server status before termination...`);

                        const rdp = subscription.rdpId;

                        try {
                            // Step 1: Get live status from UpCloud
                            const serverStatusRes = await UpCloudController.getRDPServerDetails(rdp.serverId);
                            const serverStatus = serverStatusRes?.data?.state?.toLowerCase() || "unknown";

                            console.log(`🔍 Current UpCloud RDP status: ${serverStatus}`);

                            if (serverStatus === "stopped") {
                                // Server is already stopped — safe to delete immediately
                                await terminateRDP(subscription);
                            } else if (serverStatus === "started") {
                                // Need to stop first, then delay termination
                                console.log("⏸️ RDP is running. Suspending first...");
                                await suspendRDP(subscription);
                            } else {
                                console.warn("⚠️ Unknown or transitional RDP state. Skipping termination for now.");
                            }
                        } catch (err) {
                            console.error("❌ Error during RDP termination flow:", err.message);
                        }
                    }

                    break;

                case "pending_renewal":
                    const renewal = await renewRDPSubscriptionAndUpdateDB({ subscriptionId: subscription._id, useWallet: true });

                    if (!renewal.success) {
                        subscription.status = "grace_period";
                        subscription.graceEndDate = graceEnd.toDate();
                        await subscription.save();

                        const price = subscription.price;
                        const expiry = moment(subscription.subscriptionEnd).format("MMMM D, YYYY, hh:mm A");

                        await RDPEmailController.sendInsufficientFundsEmail(user, rdp, price, balance, expiry);
                        // await RDPEmailController.sendReinstatementFeeEmail(user, rdp, REINSTATEMENT_FEE);
                        await suspendRDP(subscription);
                    }
                    break;

                case "grace_period":
                    if (now.isBefore(graceEnd)) {
                        if (balance >= totalDue) {
                            wallet.balance.set("USD", balance - totalDue);
                            await wallet.save();

                            const newEnd = await calculateSubscriptionEnd({ billingCycleType: subscription.billingCycleId.type });

                            subscription.status = "active";
                            subscription.subscriptionEnd = newEnd;
                            await subscription.save();

                            await RDPEmailController.sendReactivatedEmail({ user, rdp, subscription, billingCycle: subscription.billingCycleId.type });
                            await UpCloudController.startRDPServer(rdp.serverId);
                        }
                    } else {
                        if (balance >= totalDue) {
                            wallet.balance.set("USD", balance - totalDue);
                            await wallet.save();

                            const newEnd = await calculateSubscriptionEnd({ billingCycleType: subscription.billingCycleId.type });

                            subscription.status = "active";
                            subscription.subscriptionEnd = newEnd;
                            await subscription.save();

                            await RDPEmailController.sendReactivatedEmail({ user, rdp, subscription, billingCycle: subscription.billingCycleId.type });
                            await UpCloudController.startRDPServer(rdp.serverId);
                        } else {
                            await suspendRDP(subscription);
                            subscription.status = "suspended";
                            await subscription.save();
                        }
                    }
                    break;

                case "suspended":
                    console.log("###suspended")
                    if (now.diff(graceEnd, "days") >= 0) {
                        const serverStatusRes = await UpCloudController.getRDPServerDetails(rdp.serverId);
                        const serverStatus = serverStatusRes?.data?.state?.toLowerCase() || "unknown";

                        console.log(`🔍 Current UpCloud RDP status: ${serverStatus}`);
                        if (serverStatus === "started") {
                            // Need to stop first, then delay termination
                            console.log("⏸️ RDP is running. Suspending first...");
                            await suspendRDP(subscription);
                        } else {
                            await terminateRDP(subscription);
                        }
                    }
                    break;
            }
        }
    } catch (err) {
        console.error("❌ Error in RDP lifecycle job:", err);
    }
};

const suspendRDP = async (subscription) => {
    try {
        const rdp = subscription.rdpId;
        await UpCloudController.stopRDPServer(rdp?.serverId);
        console.log(`⏸️ Suspended RDP ${rdp?.title}`);
    } catch (err) {
        console.error("❌ Failed to suspend RDP:", err);
    }
};

const terminateRDP = async (subscription) => {
    try {
        const rdp = subscription.rdpId;

        // Step 1: Delete from UpCloud
        await UpCloudController.deleteRDPServer(rdp?.serverId);

        // Step 2: Delete from local RDPInstance collection
        await RDPInstance.findByIdAndDelete(rdp._id);

        // Step 3: Update subscription status
        subscription.status = "terminated";
        await subscription.save();

        // Step 4: Notify user
        await RDPEmailController.sendTerminationEmail(subscription.userId, rdp);

        console.log(`🗑️ Terminated and deleted RDP ${rdp.title}`);
    } catch (err) {
        console.error("❌ Failed to terminate RDP:", err);
    }
};


schedule.scheduleJob("*/3 * * * *", () => {
    console.log("🕐 Running RDP Lifecycle Auto-Renewal Job...");
    processRDPLifecycle();
});

module.exports = processRDPLifecycle;
