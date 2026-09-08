const RDPBillingCycleDiscount = require("../../models/RDPBillingCycleDiscount");
const RDPInstance = require("../../models/RDPInstance");
const RDPPlan = require("../../models/RDPPlan");
const RDPSubscription = require("../../models/RDPSubscription");
const UpCloudController = require("../upcloud/upcloudController");
const RDPEmailController = require("./rdpEmailController");
const { calculateSubscriptionEnd } = require("../../helpers/rdpHelper");
const moment = require("moment");
const getExchangeRate = require("../../utils/currency");

// Get all RDP plans
const getRDPPlans = async (req, res) => {
    try {
        const plans = await RDPPlan.find({});
        res.json({ success: true, data: plans });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to fetch RDP plans" });
    }
};

// Get UpCloud zones list
const getZonesList = async (req, res) => {
    try {
        const zones = await UpCloudController.getZonesList();
        res.status(200).json({ success: true, data: zones });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Operating System list
const getWindowsOSList = async (req, res) => {
    try {
        const osList = await UpCloudController.getWindowsOSList();
        res.status(200).json({ success: true, data: osList });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

// Get all RDP plans along with pricing info
const getRDPPlansWithPrice = async (req, res) => {
    const { zone, os_uuid, plan_id } = req.query;

    try {
        const plan = await RDPPlan.findById(plan_id).lean();

        if (!plan) {
            return res.status(404).json({ success: false, message: "Plan not found" });
        }

        const enrichedPlans = await UpCloudController.getPlansWithPrices({ plans: [{ ...plan }], zone, os_uuid });
        res.status(200).json({ success: true, data: enrichedPlans[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to fetch RDP plans with price" });
    }
};

const createRDPServer = async (req, res) => {
    const { zone, os_uuid, hostname, title = "Windows RDP", labels = [], storageLables = [], plan_id, price, autoRenewable = false, billingCycleId } = req.body;
    const user = req.user;

    try {
        const plan = await RDPPlan.findById(plan_id);
        if (!plan) {
            return res.status(404).json({ success: false, message: "Plan not found" });
        }

        const { serverData } = await UpCloudController.createRDPServer({
            plan,
            zone,
            os_uuid,
            hostname,
            title,
            labels,
            storageLables
        });

        const server = serverData?.server;

        if (!server?.uuid) {
            return res.status(500).json({
                success: false,
                message: "Server creation failed: No UUID returned."
            });
        }

        // Save minimal instance info
        const newRDP = await RDPInstance.create({
            userId: user?._id || null,
            hostname,
            title,
            plan: plan._id,
            os_uuid,
            serverId: server.uuid
        });

        const billingCycle = await RDPBillingCycleDiscount.findById(billingCycleId).lean();

        // Create subscription
        const subscriptionEnd = await calculateSubscriptionEnd({billingCycleType: billingCycle?.type, base: moment()});

        const subscription = await RDPSubscription.create({
            userId: user?._id,
            rdpId: newRDP._id,
            planId: plan._id,
            billingCycleId,
            osId: os_uuid,
            price: price || 0,
            autoRenewable,
            subscriptionEnd
        });

        if (user && user?.email) {
            const ipAddress = server?.ip_addresses?.ip_address?.find((ip) => ip?.family === "IPv4" && ip?.access === "public");
            const formattedExpiry = moment(subscription?.subscriptionEnd).format('MMMM Do, YYYY');
            // Send email to user about the new server creation
            await RDPEmailController.sendSubscriptionConfirmation({
                user,
                subscription,
                expiryDate: formattedExpiry,
                billingCycle,
                title: server?.title,
                price,
                rdpCredentials: {
                    ipAddress: ipAddress?.address,
                    username: server?.username,
                    password: server?.password
                },
                vncCredentials: {
                    host: server?.remote_access_host,
                    port: server?.remote_access_port,
                    password: server?.remote_access_password
                }
            });
        }

        res.status(200).json({
            success: true,
            message: "Your RDP server is being deployed. It will be ready within approximately 5 minutes.",
            data: {
                server: serverData.server,
                rdpInstance: newRDP,
                subscription,
            }
        });

    } catch (error) {
        console.error("❌ Error creating RDP server:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to create RDP server" });
    }
};

const getRDPServersDetails = async (req, res) => {
    try {
        const userId = req.user?._id;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized. User not found.' });
        }

        // Step 1: Get all RDPInstances for user
        const instances = await RDPInstance.find({ userId }).populate('plan');

        // Step 2: Fetch live details using shared method
        const enrichedServers = await Promise.all(
            instances.map(async (instance) => {
                try {
                    const result = await UpCloudController.getRDPServerDetails(instance.serverId);
                    return {
                        local: instance,
                        upcloud: result.data || null
                    };
                } catch (err) {
                    console.warn(`⚠️ Failed to fetch UpCloud data for server ${instance.serverId}`);
                    return {
                        local: instance,
                        upcloud: null,
                        error: err.message || 'Failed to fetch server from UpCloud'
                    };
                }
            })
        );

        return res.status(200).json({
            success: true,
            message: 'Fetched RDP servers with live data.',
            data: enrichedServers
        });
    } catch (error) {
        console.error('❌ Error fetching RDP servers with UpCloud:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch RDP server list.'
        });
    }
};


const getRDPServerDetails = async (req, res) => {
    try {
        const { serverId } = req.rdpInstance;
        const result = await UpCloudController.getRDPServerDetails(serverId);

        if (!result.success) {
            return res.status(404).json({ success: false, message: result.message });
        }

        res.status(200).json({
            success: true,
            message: result.message,
            data: result.data
        });
    } catch (error) {
        console.error("❌ Error getting RDP server details:", error);
        res.status(500).json({ success: false, message: error.message || "Something went wrong" });
    }
};


const startRDPServer = async (req, res) => {
    try {
        const { serverId } = req.rdpInstance;
        const result = await UpCloudController.startRDPServer(serverId);

        if (!result.success) {
            return res.status(400).json({ success: false, message: result.message });
        }

        res.status(200).json({
            success: true,
            message: result.message,
            data: result.data
        });
    } catch (error) {
        console.error("❌ Error starting RDP server:", error);
        res.status(500).json({ success: false, message: error.message || "Something went wrong" });
    }
};


const stopRDPServer = async (req, res) => {
    try {

        const { serverId } = req.rdpInstance;
        const result = await UpCloudController.stopRDPServer(serverId);

        if (!result.success) {
            return res.status(400).json({ success: false, message: result.message });
        }

        res.status(200).json({
            success: true,
            message: result.message,
            data: result.data
        });
    } catch (error) {
        console.error("❌ Error stopping RDP server:", error);
        res.status(500).json({ success: false, message: error.message || "Something went wrong" });
    }
};


const restartRDPServer = async (req, res) => {
    try {

        const { serverId } = req.rdpInstance;
        const result = await UpCloudController.restartRDPServer(serverId);

        if (!result.success) {
            return res.status(400).json({ success: false, message: result.message });
        }

        res.status(200).json({
            success: true,
            message: result.message,
            data: result.data
        });
    } catch (error) {
        console.error("❌ Error restarting RDP server:", error);
        res.status(500).json({ success: false, message: error.message || "Something went wrong" });
    }
};

const deleteRDPServer = async (req, res) => {
    try {
        const { serverId, _id } = req.rdpInstance;

        // Step 1: Delete the server from UpCloud
        const deleteResult = await UpCloudController.deleteRDPServer(serverId);
        if (!deleteResult.success) {
            return res.status(400).json({
                success: false,
                message: deleteResult.message
            });
        }

        // Step 2: Remove the local RDP instance
        await RDPInstance.findByIdAndDelete(_id);

        // Step 3: Mark related subscription as expired
        await RDPSubscription.findOneAndUpdate(
            { rdpId: _id },
            {
                status: 'expired',
                autoRenewable: false,
                subscriptionEnd: new Date(),
                updatedAt: new Date()
            }
        );

        res.status(200).json({
            success: true,
            message: "RDP server and its subscription were successfully deleted."
        });

    } catch (error) {
        console.error("❌ Error deleting RDP server:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Something went wrong while deleting the RDP server."
        });
    }
};

const getReinstallOSList = async (req, res) => {
    try {
        const { serverId, os_uuid, _id: rdpId, plan } = req.rdpInstance;

        // Step 1: Fetch current server details
        const serverResult = await UpCloudController.getRDPServerDetails(serverId);
        if (!serverResult.success) {
            return res.status(400).json({
                success: false,
                message: serverResult.message
            });
        }

        // Step 2: Get EUR → USD conversion rate
        const eurToUsdRate = await getExchangeRate('EUR', 'USD');
        const convertEUR = (value) => parseFloat((value * eurToUsdRate).toFixed(2));

        // Step 3: Fetch subscription & billing cycle
        const subscription = await RDPSubscription.findOne({ rdpId });
        const billingCycle = await RDPBillingCycleDiscount.findById(subscription?.billingCycleId);

        // Define constant for hours in a month (30 days)
        const HOURS_IN_MONTH_30_DAYS = 30 * 24;

        const multiplier = billingCycle.type.toLowerCase() === 'monthly' ? HOURS_IN_MONTH_30_DAYS :
            billingCycle.type.toLowerCase() === 'quarterly' ? HOURS_IN_MONTH_30_DAYS * 3 :
                billingCycle.type.toLowerCase() === 'hourly' ? 1 :
                    billingCycle.type.toLowerCase() === 'annually' ? HOURS_IN_MONTH_30_DAYS * 12 : 1;
        console.log("###multiplier", multiplier)
        // Step 4: Get increment settings
        const increment = plan?.increment || null;
        const applyIncrement = (value) => {
            value = parseFloat(value);
            if (!increment) return value;
            if (increment.unit === 'percentage') return value + (value * increment.value / 100);
            if (increment.unit === 'currency') return value + increment.value;
            return value;
        };

        // Step 5: Get current OS license fee
        const currentLicenseEUR = (serverResult.data?.license / 100) * (plan?.cpu || 1);
        console.log("###currentLicenseEUR", currentLicenseEUR)
        const currentLicenseUSD = convertEUR(applyIncrement(currentLicenseEUR * multiplier));

        // Step 6: Get available Windows OS list
        const osList = await UpCloudController.getWindowsOSList();

        // Step 7: Enrich OS list with license pricing details
        const enrichedOSList = osList.map(os => {
            const baseLicenseEUR = (os.license / 100) * (plan?.cpu || 1);
            const finalLicenseUSD = convertEUR(applyIncrement(baseLicenseEUR * multiplier));

            return {
                name: os.title || os.description || os.uuid,
                uuid: os.uuid,
                finalLicenseUSD: finalLicenseUSD.toFixed(2),
                currentLicenseUSD: currentLicenseUSD.toFixed(2),
                difference: (finalLicenseUSD - currentLicenseUSD).toFixed(2),
                isMoreExpensive: finalLicenseUSD > currentLicenseUSD,
            };
        });

        return res.status(200).json({
            success: true,
            message: `Available OS list for reinstallation with ${billingCycle?.type || 'unknown'} license fee comparison.`,
            currency: "USD",
            billingCycle: billingCycle?.type || "unknown",
            currentLicenseUSD: currentLicenseUSD.toFixed(2),
            data: enrichedOSList
        });

    } catch (error) {
        console.error("❌ Error getting reinstall OS list:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Something went wrong while fetching reinstall OS list."
        });
    }
};

const reinstallRDPServer = async (req, res) => {
    try {
        const { os_uuid } = req.body;
        const { serverId, _id: rdpId, plan } = req.rdpInstance;

        // Step 1: Trigger the rebuild request to UpCloud
        const reinstallResult = await UpCloudController.reinstallWindows(serverId, os_uuid);

        if (!reinstallResult.success) {
            return res.status(400).json({
                success: false,
                message: reinstallResult.message || "Failed to reinstall Windows"
            });
        }

        // Step 2: Fetch user's subscription
        const subscription = await RDPSubscription.findOne({ rdpId });
        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: "Subscription not found for the current RDP instance."
            });
        }

        // Step 3: Get billing cycle and multiplier
        const billingCycle = await RDPBillingCycleDiscount.findById(subscription.billingCycleId);

        // Define constant for hours in a month (30 days)
        const HOURS_IN_MONTH_30_DAYS = 30 * 24;

        const multiplier = billingCycle.type.toLowerCase() === 'monthly' ? HOURS_IN_MONTH_30_DAYS :
            billingCycle.type.toLowerCase() === 'quarterly' ? HOURS_IN_MONTH_30_DAYS * 3 :
                billingCycle.type.toLowerCase() === 'hourly' ? 1 :
                    billingCycle.type.toLowerCase() === 'annually' ? HOURS_IN_MONTH_30_DAYS * 12 : 1;
        console.log("###multiplier", multiplier)


        // Step 4: Get EUR → USD rate
        const eurToUsdRate = await getExchangeRate("EUR", "USD");
        const convertEUR = (value) => parseFloat((value * eurToUsdRate).toFixed(2));

        // Step 5: Apply increment logic
        const increment = plan?.increment || null;
        const applyIncrement = (value) => {
            value = parseFloat(value);
            if (!increment) return value;
            if (increment.unit === 'percentage') return value + (value * increment.value / 100);
            if (increment.unit === 'currency') return value + increment.value;
            return value;
        };

        // Step 6: Get old OS license fee from subscription
        const oldOSDetails = await UpCloudController.getStorageDetails(req.rdpInstance.os_uuid);
        console.log("###oldOSDetails", oldOSDetails)
        const oldLicenseEUR = ((oldOSDetails?.storage?.license) / 100) * (plan?.cpu || 1);
        const oldLicenseUSD = convertEUR(applyIncrement(oldLicenseEUR * multiplier)) ;

        // Step 7: Get new OS license fee
        const newOSDetails = await UpCloudController.getStorageDetails(os_uuid);
        console.log("###newOSDetails", newOSDetails)
        const newLicenseEUR = ((newOSDetails?.storage?.license) / 100) * (plan?.cpu || 1);
        const newLicenseUSD = convertEUR(applyIncrement(newLicenseEUR * multiplier)) ;

        // Step 8: Calculate difference and update subscription price
        const priceDifference = newLicenseUSD - oldLicenseUSD;
        console.log("###priceDifference", priceDifference)
        const oldPlanPrice = subscription.price;
        subscription.price = parseFloat(subscription.price) + priceDifference;
        await subscription.save();

        // Optional: update RDPInstance's os_uuid
        req.rdpInstance.os_uuid = os_uuid;
        await req.rdpInstance.save();

        // Step 9: Send email if priceDifference is not zero
        if (priceDifference !== 0) {
            const user = req.user;
            await RDPEmailController.sendReinstallLicenseUpdate({
                user,
                oldLicenseUSD: oldLicenseUSD.toFixed(2),
                newLicenseUSD: newLicenseUSD.toFixed(2),
                oldPlanPrice: oldPlanPrice.toFixed(2),
                newPlanPrice: subscription.price.toFixed(2),
                billingCycle: billingCycle.type
            });
        }

        return res.status(200).json({
            success: true,
            message: "✅ Windows reinstallation has been triggered for your RDP server. It typically takes around 5 minutes depending on storage size. Once completed, you can start your server and begin using it.",
            data: reinstallResult.data
        });

    } catch (error) {
        console.error("❌ Error reinstalling Windows:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

module.exports = {
    getRDPPlans,
    getZonesList,
    getRDPPlansWithPrice,
    getWindowsOSList,
    createRDPServer,
    startRDPServer,
    stopRDPServer,
    restartRDPServer,
    deleteRDPServer,
    getRDPServerDetails,
    getRDPServersDetails,
    getReinstallOSList,
    reinstallRDPServer
};
