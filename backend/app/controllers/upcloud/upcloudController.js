const axios = require("axios");
const getExchangeRate = require("../../utils/currency");
const RDPBillingCycleDiscount = require("../../models/RDPBillingCycleDiscount");

const UPCLOUD_API_BASE = "https://api.upcloud.com/1.3";
const IS_CLOUD_NATIVE_PLAN = true;
const IS_MAXIOPS_PLAN = true;

class UpCloudController {
    static async authenticate() {
        try {
            const username = process.env.UPCLOUD_USERNAME;
            const password = process.env.UPCLOUD_PASSWORD;

            if (!username || !password) {
                throw new Error("UpCloud credentials are missing.");
            }

            return { username, password };
        } catch (error) {
            console.error("❌ UpCloud Authentication Error:", error.message);
            throw new Error("Failed to authenticate with UpCloud.");
        }
    }

    static async getZonesList() {
        try {
            // Step 1: Authenticate
            const { username, password } = await UpCloudController.authenticate();

            // Step 2: Fetch datacenters
            const response = await axios.get(`${UPCLOUD_API_BASE}/zone`, {
                auth: {
                    username,
                    password,
                },
                headers: {
                    "Content-Type": "application/json",
                }
            });

            if (response.data?.zones?.zone) {
                console.log(`✅ Retrieved ${response.data.zones?.zone.length} UpCloud zones.`);
                return response.data.zones?.zone;
            } else {
                throw new Error("No zones retrieved from UpCloud.");
            }
        } catch (error) {
            console.error("❌ Error fetching UpCloud zones:", error.response?.data || error.message);
            throw new Error("Failed to fetch UpCloud zones.");
        }
    }

    static async getWindowsOSList() {
        try {
            // Step 1: Authenticate
            const { username, password } = await UpCloudController.authenticate();

            // Step 2: Fetch OS list
            const response = await axios.get(`${UPCLOUD_API_BASE}/storage/template`, {
                auth: {
                    username,
                    password,
                },
                headers: {
                    "Content-Type": "application/json",
                }
            });

            // Filter only Windows OS templates from the response
            const windowsOSList = response.data?.storages?.storage.filter(os => os.title.includes("Windows"));

            if (windowsOSList.length > 0) {
                // Sort the OS list based on the version (extracting the year from the title)
                const sortedWindowsOSList = windowsOSList.sort((a, b) => {
                    // Extract year from the title (e.g., "Windows Server 2022" -> 2022)
                    const yearA = parseInt(a.title.split(' ')[2]);
                    const yearB = parseInt(b.title.split(' ')[2]);

                    // Sort in descending order (latest versions first)
                    return yearB - yearA;
                });

                // Add monthly and hourly price to each Windows OS
                const updatedWindowsOSList = sortedWindowsOSList.map(os => {
                    // Calculate hourly price (license price per hour) and round it up to two decimal places
                    let hourlyPrice = os.license / 100;
                    hourlyPrice = Math.ceil(hourlyPrice * 100) / 100; // Round up to 2 decimal places

                    // Calculate monthly price (license price for 720 hours in a month)
                    const monthlyPrice = Math.ceil(hourlyPrice * 720); // Round to nearest whole number

                    // Return updated OS template with added prices
                    return {
                        ...os,
                        // hourlyPrice: hourlyPrice.toFixed(2), // Format hourly price to two decimal places
                        // monthlyPrice
                    };
                });

                console.log(`✅ Retrieved ${updatedWindowsOSList.length} Windows OS templates with prices.`);
                return updatedWindowsOSList;
            } else {
                throw new Error("No Windows OS templates found.");
            }
        } catch (error) {
            console.error("❌ Error fetching Windows OS list:", error.response?.data || error.message);
            throw new Error("Failed to fetch Windows OS list.");
        }
    }

    static async getPlansWithPrices({ plans, zone, os_uuid }) {
        try {
            // Step 1: Authenticate to UpCloud API
            const { username, password } = await UpCloudController.authenticate();

            // Step 2: Fetch pricing data from UpCloud API
            const response = await axios.get(
                `https://api.upcloud.com/1.3/price`,
                {
                    auth: {
                        username,
                        password,
                    },
                    headers: {
                        "Content-Type": "application/json",
                    }
                }
            );

            // Step 3: Check if pricing data for zones exists
            if (response.data?.prices?.zone) {
                // Step 4: Find the specific zone price from the fetched data
                const specificZonePrice = response.data?.prices?.zone?.find(specZone => specZone?.name === zone);

                // Step 5: Proceed if pricing data for the specified zone is available
                if (specificZonePrice && Object.keys(specificZonePrice).length > 0) {

                    // Step 6: Fetch the Windows license fee from UpCloud API for the provided OS UUID
                    const windowsOSResponse = await axios.get(
                        `https://api.upcloud.com/1.3/storage/${os_uuid}`,
                        {
                            auth: {
                                username,
                                password,
                            },
                            headers: {
                                "Content-Type": "application/json",
                            }
                        }
                    );

                    // Step 6: Get EUR → USD exchange rate
                    const eurToUsdRate = await getExchangeRate('EUR', 'USD');
                    // USD conversion for each component
                    const convertEUR = (value) => (value * eurToUsdRate).toFixed(2);

                    // Fetch billing cycle discounts
                    const billingCycles = await RDPBillingCycleDiscount.find({ enabled: true });

                    // Step 8: Map over each plan and update it with pricing data
                    const updatedPlans = plans.map(plan => {
                        const { name, cpu, ram } = plan;

                        // Define constant for hours in a month (28 and 30 days)
                        const HOURS_IN_MONTH_28_DAYS = 28 * 24;
                        const HOURS_IN_MONTH_30_DAYS = 30 * 24;

                        // Step 9: Find the plan price based on CPU and RAM configuration
                        const planKey = `server_plan_${IS_CLOUD_NATIVE_PLAN ? 'CLOUDNATIVE-' : ''}${cpu}xCPU-${ram}GB`;
                        const planData = specificZonePrice[planKey];
                        const planPrice = planData ? (planData.price / 100) : 0;

                        // Step 10: Calculate the monthly plan price by multiplying by the hours in a month (28 days)
                        const monthlyPlanPrice = (planPrice * HOURS_IN_MONTH_28_DAYS).toFixed(2);

                        // Step 11: Find the OS license fee
                        const windowsLicenseFee = ((windowsOSResponse.data?.storage?.license / 100) || 0) * (plan?.cpu || 1);
                        const monthlyWindowsLicenseFee = (windowsLicenseFee * HOURS_IN_MONTH_30_DAYS).toFixed(2);

                        // Step 12: Find the storage fee
                        const storageFeeFor1GB = IS_MAXIOPS_PLAN ? specificZonePrice?.storage_maxiops?.price / 100 : specificZonePrice?.storage_standard?.price / 100;
                        const storageFee = storageFeeFor1GB * plan?.storage?.size;
                        const monthlyStorageFee = (storageFee * HOURS_IN_MONTH_30_DAYS).toFixed(2);

                        // Step 13: Find the networking fee
                        const networkFee = specificZonePrice?.ipv4_address?.price / 100 || 0;
                        const monthlyNetworkFee = (networkFee * HOURS_IN_MONTH_30_DAYS).toFixed(2);

                        // Step 14: Calculate the total cost (plan price + license fee + storage + network)
                        const increment = plan?.increment || null

                        // 🧮 Apply increment to individual components
                        const applyIncrement = (value) => {
                            value = parseFloat(value)
                            if (!increment) return value;
                            if (increment.unit === 'percentage') return value + (value * increment.value / 100);
                            if (increment.unit === 'currency') return value + increment.value;
                            return value;
                        };

                        const finalPlanPrice = applyIncrement(planPrice);
                        const finalLicenseFee = applyIncrement(windowsLicenseFee);
                        const finalStorageFee = applyIncrement(storageFee);
                        const finalNetworkFee = applyIncrement(networkFee);

                        // 🧮 Apply increment (if exists)
                        let total = parseFloat(finalPlanPrice) + parseFloat(finalLicenseFee) + parseFloat(finalStorageFee) + parseFloat(finalNetworkFee);

                        // Step 15: Calculate the hourly price and format it
                        const hourlyPrice = parseFloat(convertEUR(total)).toFixed(3).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');

                        const finalMonthlyPlanPrice = applyIncrement(monthlyPlanPrice);
                        const finalMonthlyLicenseFee = applyIncrement(monthlyWindowsLicenseFee);
                        const finalMonthlyStorageFee = applyIncrement(monthlyStorageFee);
                        const finalMonthlyNetworkFee = applyIncrement(monthlyNetworkFee);

                        // Step 16: Calculate the monthly price with all fees
                        const monthlyPrice = parseFloat(finalMonthlyPlanPrice)
                            + parseFloat(finalMonthlyLicenseFee)
                            + parseFloat(finalMonthlyStorageFee)
                            + parseFloat(finalMonthlyNetworkFee);

                        const priceBreakdown = {
                            planPrice: convertEUR(finalMonthlyPlanPrice),
                            windowsLicenseFee: convertEUR(finalMonthlyLicenseFee),
                            storageFee: convertEUR(finalMonthlyStorageFee),
                            networkFee: convertEUR(finalMonthlyNetworkFee),
                            hourlyPrice: hourlyPrice,
                            monthlyPrice: convertEUR(monthlyPrice),
                            currency: 'USD'
                        }

                        // Billing cycle prices
                        const billingCyclePlans = billingCycles.map(cycle => {
                            const type = cycle.type.toLowerCase();
                            const isHourly = type === 'hourly';
                        
                            const HOURS_IN_MONTH = 28 * 24; // 672 hours
                            const multiplier = isHourly ? (1 / HOURS_IN_MONTH) :
                                type === 'monthly' ? 1 :
                                type === 'quarterly' ? 3 :
                                type === 'annually' ? 12 : 1;
                        
                            const calc = (value) => parseFloat(value) * multiplier;
                            const discount = cycle.discount;
                        
                            // Component-wise totals
                            const planComponent = calc(priceBreakdown.planPrice);
                            const licenseComponent = calc(priceBreakdown.windowsLicenseFee);
                            const storageComponent = calc(priceBreakdown.storageFee);
                            const networkComponent = calc(priceBreakdown.networkFee);
                        
                            const subtotal = planComponent + licenseComponent + storageComponent + networkComponent;
                            const savings = isHourly ? 0 : (subtotal * discount) / 100;
                            const finalTotal = subtotal - savings;
                        
                            return {
                                _id: cycle._id,
                                billingCycle: cycle.type,
                                discountPercentage: discount,
                                originalPrice: subtotal.toFixed(2),
                                savings: savings.toFixed(2),
                                finalPrice: finalTotal.toFixed(2),
                                priceBreakdown: {
                                    planPrice: planComponent.toFixed(isHourly ? 3 : 2),
                                    windowsLicenseFee: licenseComponent.toFixed(isHourly ? 3 : 2),
                                    storageFee: storageComponent.toFixed(isHourly ? 3 : 2),
                                    networkFee: networkComponent.toFixed(isHourly ? 3 : 2),
                                    totalBeforeDiscount: subtotal.toFixed(isHourly ? 3 : 2),
                                    finalPrice: finalTotal.toFixed(isHourly ? 3 : 2),
                                    currency: 'USD'
                                }
                            };
                        });                     

                        // Step 17: Return the updated plan details with breakdown of costs
                        return {
                            name: plan.name,
                            cpu: plan.cpu,
                            ram: plan.ram,
                            storage: plan.storage,
                            // priceBreakdown,
                            billingCyclePlans
                        };
                    });

                    return updatedPlans;
                }
            } else {
                throw new Error("No plan pricing data retrieved from UpCloud.");
            }
        } catch (error) {
            console.error("❌ Error fetching UpCloud pricing:", error.response?.data || error.message);
            throw new Error("Something went wrong while fetching UpCloud pricing.");
        }
    }

    static async getStorageDetails(os_uuid) {
        try {
            if (!os_uuid) {
                return { success: false, message: "OS UUID is required." };
            }

            const { username, password } = await UpCloudController.authenticate();

            const response = await axios.get(
                `https://api.upcloud.com/1.3/storage/${os_uuid}`,
                {
                    auth: { username, password },
                    headers: { "Content-Type": "application/json" }
                }
            );

            return {
                success: true,
                message: "Storage details fetched successfully.",
                storage: response.data?.storage || null
            };
        } catch (error) {
            console.error("❌ Error fetching storage details:", error.response?.data || error.message);
            return {
                success: false,
                message:
                    error.response?.data?.error?.error_message ||
                    "Failed to fetch storage details from UpCloud."
            };
        }
    }


    static async createRDPServer({ plan, zone, os_uuid, hostname, title, labels, storageLables }) {
        try {
            // Step 1: Authenticate to UpCloud API
            const { username, password } = await UpCloudController.authenticate();

            const planKey = `${IS_CLOUD_NATIVE_PLAN ? 'CLOUDNATIVE-' : ''}${plan.cpu}xCPU-${plan.ram}GB`;
            console.log("###planKey", planKey)
            // Step 2: Prepare the request body for server creation
            const serverPayload = {
                server: {
                    zone,                // Zone in which to deploy the server (e.g., "us-nyc1")
                    hostname,            // Server hostname (e.g., "secure-rdp-server")
                    title,               // Title of the RDP server (e.g., "Test Windows Server")
                    labels: {
                        label: labels,
                    },      // Labels for categorization (optional)
                    plan: planKey,     // Plan name (e.g., "1xCPU-1GB")
                    storage_devices: {
                        storage_device: [
                            {
                                action: "clone",           // Clone from a template
                                labels: storageLables,  // Labels for the storage
                                storage: os_uuid,          // OS UUID (e.g., "01000000-0000-4000-8000-000010060300")
                                title: "Windows from a template", // Title of the storage
                                size: plan.storage.size,  // Storage size (in GB)
                                tier: "maxiops",           // Storage tier (e.g., "maxiops")
                            },
                        ],
                    },
                    password_delivery: "none",    // No password delivery (can be adjusted)
                    remote_access_type: "vnc",      // Remote access type (VNC)
                    remote_access_enabled: "yes",   // Enable remote access (yes/no)
                }
            };

            // Step 5: Create the RDP server using UpCloud API
            const serverResponse = await axios.post(
                'https://api.upcloud.com/1.3/server',
                serverPayload,
                {
                    auth: {
                        username,
                        password,
                    },
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );

            // Step 6: Return the server creation response
            return {
                success: true,
                serverData: serverResponse.data, // Server details like IP, status, etc.
            };
        } catch (error) {
            // Handle any errors during the process
            console.error("Error creating RDP server:", error.response?.data?.error?.error_message || error?.message);
            throw new Error(error.response?.data?.error?.error_message || "Failed to create RDP server.");
        }
    }

    static async getRDPServerDetails(uuid) {
        try {
            if (!uuid) return { success: false, message: 'Server UUID is required.' };

            const { username, password } = await this.authenticate();

            const response = await axios.get(
                `https://api.upcloud.com/1.3/server/${uuid}`,
                {
                    auth: { username, password },
                    headers: { "Content-Type": "application/json" }
                }
            );

            return {
                success: true,
                message: "RDP server details fetched successfully.",
                data: response.data?.server || response.data
            };
        } catch (error) {
            console.error("❌ Error fetching server details:", error.response?.data || error.message);
            return {
                success: false,
                message: error.response?.data?.error?.error_message || "Failed to get RDP server details."
            };
        }
    }

    static async startRDPServer(uuid) {
        try {
            if (!uuid) return { success: false, message: 'Server UUID is required.' };

            const { username, password } = await UpCloudController.authenticate();

            const response = await axios.post(
                `https://api.upcloud.com/1.3/server/${uuid}/start`,
                {},
                {
                    auth: { username, password },
                    headers: { "Content-Type": "application/json" }
                }
            );

            return {
                success: true,
                message: "RDP server is started.",
                data: response.data
            };
        } catch (error) {
            console.error("❌ Error starting RDP server:", error.response?.data || error.message);
            return {
                success: false,
                message: error.response?.data?.error?.error_message || "Failed to start RDP server."
            };
        }
    }

    static async stopRDPServer(uuid) {
        try {
            if (!uuid) return { success: false, message: 'Server UUID is required.' };

            const { username, password } = await this.authenticate();

            const response = await axios.post(
                `https://api.upcloud.com/1.3/server/${uuid}/stop`,
                {
                    stop_server: {
                        stop_type: "hard"
                    }
                },
                {
                    auth: { username, password },
                    headers: { 'Content-Type': 'application/json' }
                }
            );

            return {
                success: true,
                message: "RDP server is stopping. This process may take up to 1-2 minutes to complete.",
                data: response.data
            };
        } catch (error) {
            console.error("❌ Error stopping RDP server:", error.response?.data || error.message);
            return {
                success: false,
                message: error.response?.data?.error?.error_message || "Failed to stop RDP server."
            };
        }
    }


    static async restartRDPServer(uuid) {
        try {
            if (!uuid) return { success: false, message: 'Server UUID is required.' };

            const { username, password } = await UpCloudController.authenticate();

            const response = await axios.post(
                `https://api.upcloud.com/1.3/server/${uuid}/restart`,
                {
                    restart_server: {
                        stop_type: "hard",
                    }
                },
                {
                    auth: { username, password },
                    headers: { 'Content-Type': 'application/json' }
                }
            );

            return {
                success: true,
                message: "RDP server is restarting.",
                data: response.data
            };
        } catch (error) {
            console.error("❌ Error restarting RDP server:", error.response?.data || error.message);
            return {
                success: false,
                message: error.response?.data?.error?.error_message || "Failed to restart RDP server."
            };
        }
    }

    static async deleteRDPServer(uuid) {
        try {
            if (!uuid) return { success: false, message: 'Server UUID is required.' };

            const { username, password } = await this.authenticate();

            const response = await axios.delete(
                `https://api.upcloud.com/1.3/server/${uuid}?storages=1&backups=delete`,
                {
                    auth: { username, password },
                    headers: { "Content-Type": "application/json" }
                }
            );

            return {
                success: true,
                message: "RDP server has been successfully deleted."
            };
        } catch (error) {
            console.error("❌ Error deleting RDP server:", error.response?.data || error.message);
            return {
                success: false,
                message: error.response?.data?.error?.error_message || "Failed to delete RDP server."
            };
        }
    }

    static async reinstallWindows(serverId, os_uuid) {
        try {
            if (!serverId || !os_uuid) {
                return { success: false, message: "Server ID and OS UUID are required." };
            }

            const { username, password } = await UpCloudController.authenticate();

            // Fetch server details
            const serverResult = await UpCloudController.getRDPServerDetails(serverId);
            if (!serverResult.success) {
                return {
                    success: false,
                    message: "Unable to retrieve server details for reinstall."
                };
            }

            const server = serverResult.data;
            const storageDevices = server?.storage_devices?.storage_device || [];
            console.log("###storageDevices", storageDevices)
            // Find the primary disk to detach
            const primaryDisk = storageDevices.find(disk => disk.type === "disk");

            if (!primaryDisk?.storage) {
                return {
                    success: false,
                    message: "Primary storage disk not found for the server."
                };
            }

            // 🔁 Trigger rebuild with the cloned OS
            const response = await axios.post(
                `https://api.upcloud.com/1.3/server/${serverId}/rebuild`,
                {
                    server_rebuild: {
                        clone_source: os_uuid,
                        detach_disk: primaryDisk.storage,
                        delete_detached_disk: "yes",
                        password_delivery: "none",
                        login_user: {
                            create_password: "yes"
                        }
                    }
                },
                {
                    auth: { username, password },
                    headers: { "Content-Type": "application/json" }
                }
            );

            return {
                success: true,
                message: "Windows reinstallation (rebuild) has been triggered.",
                data: response.data
            };

        } catch (error) {
            console.error("❌ Error rebuilding Windows server:", error.response?.data || error.message);
            return {
                success: false,
                message:
                    error.response?.data?.error?.error_message || "Failed to rebuild the RDP server."
            };
        }
    }

}

module.exports = UpCloudController;
