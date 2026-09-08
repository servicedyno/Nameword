const { Client } = require("ssh2");
const Admin = require("../models/Admin");
const cryptr = require("../services/cryptr");
const { CloudCatalogClient } = require("@google-cloud/billing");
const path = require("path");
const VPSBillingCycleDiscount = require("../models/VPSBillingCycleDiscount");
const User = require("../models/User");
const VpsPlan = require("../models/VPSPlan");
const MembershipTier = require("../models/MembershipTier");
const moment = require("moment");
const fs = require("fs")

/**
 * Get Plesk login details for a given host
 * @param {string} host - The host IP or domain
 * @param {number} retries - Number of retry attempts (default: 3)
 * @param {number} delay - Delay between retries in milliseconds (default: 10000)
 * @returns {Promise<{loginUrl: string, username: string, password: string}>}
 */
const getPleskLoginDetails = async ({
	host,
	retries = 3,
	delay = 10000,
	isWindows,
}) => {
	const adminSSHKey = await Admin.findOne({ sshKeyName: "ssh-admin" });
	if (!adminSSHKey) {
		throw new Error("Admin SSH key not found");
	}

	return new Promise(async (resolve, reject) => {
		let attempts = 0;

		const attemptConnection = async () => {
			const conn = new Client();

			try {
				await new Promise((connResolve, connReject) => {
					const connectionTimeout = setTimeout(() => {
						conn.end();
						connReject(new Error("Connection timeout"));
					}, 20000);

					conn.on("ready", () => {
						clearTimeout(connectionTimeout);
						console.log("✅ SSH Connection established");

						conn.shell((err, stream) => {
							if (err) {
								conn.end();
								return connReject(
									new Error("Shell error: " + err.message)
								);
							}

							let output = "";
							let errorOutput = "";
							let pleskLoginUrl = null;

							const commandTimeout = setTimeout(() => {
								conn.end();
								connReject(new Error("Command timeout"));
							}, 15000);

							stream.on("data", (data) => {
								const text = data.toString();
								output += text;
								console.log("📜 Output received:", text);

								const urlRegex = /https:\/\/[^\s]+/g;
								const matches = text.match(urlRegex);

								if (matches) {
									for (let url of matches) {
										if (
											url.includes("login") &&
											url.includes(host)
										) {
											pleskLoginUrl = url.trim();
											console.log(
												"🔗 Found Plesk reset link:",
												pleskLoginUrl
											);
											conn.end();
											clearTimeout(commandTimeout);
											connResolve({
												resetLink: pleskLoginUrl,
											});
											resolve({
												resetLink: pleskLoginUrl,
											});
											break;
										}
									}
								}
							});

							stream.stderr.on("data", (data) => {
								errorOutput += data.toString();
								console.error("⚠️ STDERR:", data.toString());
							});

							stream.on("close", () => {
								clearTimeout(commandTimeout);
								if (!pleskLoginUrl) {
									connReject(
										new Error(
											"Could not retrieve Plesk login URL"
										)
									);
								}
							});

							console.log("🚀 Requesting Plesk login link...");
							const command = isWindows
								? `plesk bin extension.exe --uninstall imunify360 || plesk bin extension.exe --disable imunify360 || echo "Imunify360 not installed, continuing..."  &&
                                 plesk bin admin --get-login-link\r\n`
								: `sudo plesk bin extension --uninstall imunify360 || sudo plesk bin extension --disable imunify360 || echo "Imunify360 not installed, continuing..." &&
                                    sudo plesk bin admin --get-login-link\n`;
							stream.write(command);
							stream.write("exit\n");
						});
					});

					conn.on("error", (err) => {
						clearTimeout(connectionTimeout);
						connReject(
							new Error("SSH connection error: " + err.message)
						);
					});

					conn.connect({
						host: host,
						port: 22,
						username: adminSSHKey.username,
						privateKey: cryptr.decrypt(adminSSHKey.privateKey),
						readyTimeout: 20000,
					});
				});
			} catch (error) {
				attempts++;
				console.log(`Attempt ${attempts} failed: ${error.message}`);

				if (attempts >= retries) {
					reject(
						new Error(
							`Failed to get Plesk login details after ${retries} attempts`
						)
					);
				} else {
					console.log(`Retrying in ${delay / 1000} seconds...`);
					await new Promise((r) => setTimeout(r, delay));
					await attemptConnection();
				}
			}
		};

		await attemptConnection();
	});
};

// Send temporary link if in progress
const getPleskTempLoginDetails = async ({
	host,
	retries = 3,
	delay = 10000,
	isWindows,
}) => {
	const adminSSHKey = await Admin.findOne({ sshKeyName: "ssh-admin" });
	if (!adminSSHKey) {
		throw new Error("Admin SSH key not found");
	}
	let tempURL;
	return new Promise(async (resolve, reject) => {
		let attempts = 0;

		const attemptConnection = async () => {
			const conn = new Client();
			try {
				await new Promise((connResolve, connReject) => {
					const connectionTimeout = setTimeout(() => {
						conn.end();
						connReject(new Error("Connection timeout"));
					}, 20000);

					conn.on("ready", () => {
						clearTimeout(connectionTimeout);
						console.log("✅ SSH Connection established");

						conn.shell((err, stream) => {
							if (err) {
								conn.end();
								return connReject(
									new Error("Shell error: " + err.message)
								);
							}

							let output = "";
							let errorOutput = "";
							let pleskLoginUrl = null;

							const commandTimeout = setTimeout(() => {
								conn.end();
								connReject(new Error("Command timeout"));
							}, 15000);

							stream.on("data", (data) => {
								const text = data.toString();
								output += text;
								console.log("📜 Output received:", text);

								const urlRegex = /https:\/\/[^\s]+/g;
								const matches = text.match(urlRegex);
								let tempLink, resetLink;
								if (matches) {
									for (let url of matches) {
										if (
											url.includes("login") &&
											url.includes(host)
										) {
											pleskLoginUrl = url.trim();
											console.log(
												"🔗 Found Plesk reset link:",
												pleskLoginUrl
											);
											resetLink = pleskLoginUrl;
										}
										if (url.includes("plesk.page")) {
											tempURL = url.trim();
											console.log(
												"🔗 Found Temporary link:",
												tempURL
											);
											tempLink = tempURL;
										}

										if (
											(url.includes("login") &&
												url.includes(host)) ||
											url.includes("plesk.page")
										) {
											conn.end();
											clearTimeout(commandTimeout);
											connResolve({
												resetLink,
												tempLink,
											});
											resolve({
												resetLink,
												tempLink,
											});
											break;
										}
									}
								}
							});

							stream.stderr.on("data", (data) => {
								errorOutput += data.toString();
								console.error("⚠️ STDERR:", data.toString());
							});

							stream.on("close", () => {
								clearTimeout(commandTimeout);
								if (!pleskLoginUrl) {
									connReject(
										new Error(
											"Could not retrieve Plesk login URL"
										)
									);
								}
							});

							console.log("🚀 Requesting Plesk login link...");
							const command = isWindows
								? `plesk bin extension.exe --uninstall imunify360 || plesk bin extension.exe --disable imunify360 || echo "Imunify360 not installed, continuing..."  &&
                                plesk bin admin --get-login-link\r\n`
								: `sudo plesk bin extension --uninstall imunify360 || sudo plesk bin extension --disable imunify360 || echo "Imunify360 not installed, continuing..." &&
                                sudo plesk bin admin --get-login-link\n`;
							stream.write(command);
							stream.write("exit\n");
						});
					});

					conn.on("error", (err) => {
						clearTimeout(connectionTimeout);
						connReject(
							new Error("SSH connection error: " + err.message)
						);
					});

					conn.connect({
						host: host,
						port: 22,
						username: adminSSHKey.username,
						privateKey: cryptr.decrypt(adminSSHKey.privateKey),
						readyTimeout: 20000,
					});
				});
			} catch (error) {
				attempts++;
				console.log(`Attempt ${attempts} failed: ${error.message}`);

				if (attempts >= retries) {
					reject(
						new Error(
							`Failed to get Plesk login details after ${retries} attempts`
						)
					);
				} else {
					console.log(`Retrying in ${delay / 1000} seconds...`);
					await new Promise((r) => setTimeout(r, delay));
					await attemptConnection();
				}
			}
		};

		await attemptConnection();
	});
};

// Function to get the cost details based on the parameters
const getVMCostDetails = async (plans) => {
	try {
		const filePath = path.resolve(__dirname, '../../config/service-account.json');
		const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
		
		data.private_key_id = process.env.PRIVATE_KEY_ID;
		fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

		const billingClient = new CloudCatalogClient({
			keyFilename: path.join(
				__dirname,
				"../../config/service-account.json"
			),
		});

		const iterable = billingClient.listSkusAsync({
			parent: "services/6F81-5844-456A",
			currencyCode: "USD",
		});

		const skus = [];
		for await (const response of iterable) {
			skus.push(response); // Flatten the response into the skus array
		}

		// If plans is not an array, convert it to an array
		if (!Array.isArray(plans)) {
			plans = [plans];
		}

		const results = [];

		for (const plan of plans) {
			const {
				memoryGb = 15,
				vcpuCount = 4,
				region,
				diskSizeGb,
				diskType,
				preemptible = "false",
			} = plan;

			const regionalSkus = skus.filter((sku) =>
				sku.serviceRegions.includes(region)
			);

			let totalCost = 0;
			const isPreemptible = preemptible === "true";

			// Calculate vCPU cost
			const vcpuSku = regionalSkus.find(
				(sku) =>
					sku.description.includes("VCPU") &&
					sku.category.usageType ===
						(isPreemptible ? "Preemptible" : "OnDemand")
			);

			if (vcpuSku) {
				const vcpuPrice =
					vcpuSku.pricingInfo[0].pricingExpression.tieredRates[0]
						.unitPrice.nanos / 1e9;
				totalCost += vcpuPrice * vcpuCount * 730; // Monthly cost
			}

			// Calculate RAM cost
			const ramSku = regionalSkus.find(
				(sku) =>
					sku.category.resourceGroup === "RAM" &&
					sku.category.usageType ===
						(isPreemptible ? "Preemptible" : "OnDemand")
			);

			if (ramSku) {
				const ramPrice =
					ramSku.pricingInfo[0].pricingExpression.tieredRates[0]
						.unitPrice.nanos / 1e9;
				totalCost += ramPrice * memoryGb * 730; // Monthly cost
			}

			// Calculate Disk cost
			const diskSku = regionalSkus.find(
				(sku) =>
					sku.category.resourceFamily === "Storage" &&
					sku.category.usageType ===
						(isPreemptible ? "Preemptible" : "OnDemand") &&
					sku.category.resourceGroup ===
						(diskType === "pd-standard" ? "PDStandard" : "SSD")
			);

			if (diskSku) {
				const pricingExpression =
					diskSku.pricingInfo[0].pricingExpression;
				const tieredRates = pricingExpression.tieredRates;
				let diskPrice = 0;

				for (const tier of tieredRates) {
					const unitPrice = tier.unitPrice.nanos / 1e9;
					diskPrice += unitPrice * diskSizeGb;
				}
				totalCost += diskPrice; // Monthly cost
			}

			const totalCostInHour = (totalCost / 730).toFixed(2);
			const totalCostInMonth = totalCost.toFixed(2);

			results.push({
				success: true,
				data: {
					totalCostInHour,
					totalCostInMonth,
					currency: "USD",
				},
			});
		}

		return results.length === 1 ? results[0] : results; // Return single result if only one plan was processed
	} catch (error) {
		console.error("Error estimating VM cost:", error.message);
		return {
			success: false,
			message: `Error fetching pricing information: ${error.message}`,
		};
	}
};

const getDiskCostDetails = async (diskTypes, region = "us-central1", res) => {
	try {
		const filePath = path.resolve(__dirname, '../../config/service-account.json');
		const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
		
		data.private_key_id = process.env.PRIVATE_KEY_ID;
		fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
		
		const billingClient = new CloudCatalogClient({
			keyFilename: path.join(
				__dirname,
				"../../config/service-account.json"
			),
		});

		const iterable = billingClient.listSkusAsync({
			parent: "services/6F81-5844-456A",
			currencyCode: "USD",
		});

		const skus = [];
		for await (const response of iterable) {
			skus.push(response); // Flatten the response into the skus array
		}

		// Ensure diskTypes is an array
		if (!Array.isArray(diskTypes)) {
			diskTypes = [diskTypes];
		}

		let results = [];
		let diskPrices = [];
		for (const diskType of diskTypes) {
			const regionalSkus = skus.filter((sku) =>
				sku.serviceRegions.includes(region)
			);
			// Define disk type mapping to JSON description
			const diskTypeMapping = {
				"pd-standard": "Standard PD",
				"pd-balanced": "Balanced PD",
				"pd-ssd": "SSD PD",
				// "pd-extreme": "Extreme PD"
			};

			// Find the matching SKU in the JSON data
			let diskSku = regionalSkus.find((sku) =>
				sku.description.includes(diskTypeMapping[diskType])
			);

			if (!diskSku) {
				results.push({
					diskType,
					success: false,
					message: `Pricing details not found for disk type: ${diskType}`,
				});
				continue;
			}

			if (diskSku) {
				const pricingInfo = diskSku.pricingInfo[0];
				const pricingExpression = pricingInfo.pricingExpression;
				const usageUnit = pricingExpression.usageUnit;
				const baseUnitConversionFactor =
					pricingExpression.baseUnitConversionFactor || 1;
				const tieredRates = pricingExpression.tieredRates || [];

				let pricePerGB = 0;

				for (const tier of tieredRates) {
					const unitPrice = tier.unitPrice;
					const units = Number(unitPrice.units) || 0;
					const nanos = Number(unitPrice.nanos) || 0;
					pricePerGB += units + nanos / 1e9; // Convert nanos to decimal and add
				}

				let pricePerGBMonthly = 0;
				let pricePerGBHourly = 0;

				// **Handling Different Usage Units**
				if (usageUnit === "GiBy.mo" || usageUnit === "GiBy") {
					pricePerGBMonthly = pricePerGB;
					pricePerGBHourly = pricePerGB / 730;
				} else if (usageUnit === "GiBy.h" || usageUnit === "h") {
					pricePerGBHourly = pricePerGB;
					pricePerGBMonthly = pricePerGB * 730;
				} else if (usageUnit === "mo") {
					pricePerGBMonthly = pricePerGB;
					pricePerGBHourly =
						pricePerGB /
						(baseUnitConversionFactor > 0
							? baseUnitConversionFactor / 3600
							: 730);
				} else if (usageUnit === "s") {
					// Convert per-second pricing to hourly and monthly
					pricePerGBHourly = pricePerGB * 3600; // Convert to per-hour
					pricePerGBMonthly = pricePerGBHourly * 730; // Convert to per-month
				} else if (usageUnit === "GiBy.s") {
					// Convert per second pricing to hourly and monthly using base conversion factor
					const conversionFactor =
						baseUnitConversionFactor > 0
							? baseUnitConversionFactor
							: 1073741824;
					pricePerGBHourly = (pricePerGB * 3600) / conversionFactor;
					pricePerGBMonthly = pricePerGBHourly * 730;
				} else if (usageUnit === "MiBy.mo") {
					// Convert MiB per month to GiB per month
					pricePerGBMonthly = pricePerGB / 1024;
					pricePerGBHourly = pricePerGBMonthly / 730;
				} else if (usageUnit === "MiBy.h") {
					// Convert MiB per hour to GiB per hour
					pricePerGBHourly = pricePerGB / 1024;
					pricePerGBMonthly = pricePerGBHourly * 730;
				} else if (usageUnit === "MiBy.s") {
					// Convert MiB per second to GiB per second, then to hourly and monthly
					pricePerGBHourly = (pricePerGB * 3600) / 1024;
					pricePerGBMonthly = pricePerGBHourly * 730;
				} else {
					// Default fallback (assuming monthly)
					pricePerGBMonthly = pricePerGB;
					pricePerGBHourly = pricePerGB / 730;
				}

				diskPrices.push({
					diskType,
					pricePerGBMonthly: pricePerGBMonthly.toFixed(4),
					pricePerGBHourly: pricePerGBHourly.toFixed(6),
				});
			}
		}
		return diskPrices;
	} catch (error) {
		console.error("Error fetching disk cost details:", error.message);
		return {
			success: false,
			message: `Error fetching pricing information: ${error.message}`,
		};
	}
};

// Function to Fetch VPS Plan cost information
const calculateBillingCyclePrices = async ({ hourlyPrice, monthlyPrice }) => {
	const billingCycles = await VPSBillingCycleDiscount.find({ enabled: true });
	return billingCycles.map((cycle) => {
		let originalPrice = monthlyPrice;
		let finalPrice,
			savings = 0;

		if (cycle.type.toLowerCase() === "hourly") {
			finalPrice = hourlyPrice;
			originalPrice = hourlyPrice;
		} else {
			let multiplier =
				cycle.type.toLowerCase() === "monthly"
					? 1
					: cycle.type.toLowerCase() === "quarterly"
					? 3
					: 12;
			let totalPrice = originalPrice * multiplier;
			savings = (totalPrice * cycle.discount) / 100;
			finalPrice = totalPrice - savings;
			originalPrice = originalPrice * multiplier;
		}

		return {
			finalPrice: finalPrice?.toFixed(2),
			savings: savings?.toFixed(2),
			originalPrice: originalPrice?.toFixed(2),
			...cycle.toObject(),
		};
	});
};

const getUserMembershipPlan = async (userId) => {
	try {
		const user = await User.findById(userId).populate("membershipTier");

		if (!user || !user.membershipTier) {
			console.log("User or membership plan not found");
			return await MembershipTier.findOne({ name: "Starter" });
		}

		return user.membershipTier;
	} catch (error) {
		console.error("Error retrieving user membership plan:", error);
		throw error;
	}
};

/**
 * Fetch VPS Plans with Cost Calculations
 * @param {Object} params - Parameters for the function
 * @param {String} params.userId - The user ID
 * @param {String} params.region - The region for VPS plans
 * @param {String} params.diskType - The disk type for VPS plans
 * @param {Boolean} params.preemptible - Whether the instance is preemptible
 * @returns {Array} - Returns a list of VPS plans with price calculations
 */
const fetchVPSPlansWithCosts = async ({
	userId,
	region,
	diskType,
	preemptible,
}) => {
	try {
		const plans = await VpsPlan.find();

		const planDetails = plans.map((plan) => ({
			memoryGb: plan.specs.RAM,
			vcpuCount: plan.specs.vCPU,
			diskSizeGb: plan.specs.disk,
			region,
			diskType,
			preemptible: preemptible || false,
		}));

		// Get cost estimates
		const costResponses = await getVMCostDetails(planDetails);
		console.log("###costResponses", costResponses);

		const vpsPlansWithCosts = [];

		for (let i = 0; i < plans.length; i++) {
			const plan = plans[i];
			const costResponse = costResponses[i];

			if (!costResponse.success) {
				throw new Error("Failed to retrieve cost for VPS plans");
			}

			let finalMonthlyPrice = parseFloat(
				costResponse.data.totalCostInMonth
			);
			let finalHourlyPrice = parseFloat(
				costResponse.data.totalCostInHour
			);

			// Apply increment based on unit type
			if (plan.increment.unit === "percentage") {
				finalMonthlyPrice +=
					(finalMonthlyPrice * plan.increment.value) / 100;
				finalHourlyPrice +=
					(finalHourlyPrice * plan.increment.value) / 100;
			} else if (plan.increment.unit === "currency") {
				finalMonthlyPrice += plan.increment.value;
				finalHourlyPrice += plan.increment.value;
			}

			// Apply user membership benefits
			const userMembershipPlan = await getUserMembershipPlan(userId);
			if (userMembershipPlan?.benefits?.vpsPriceIncrease) {
				userMembershipPlan.benefits.vpsPriceIncrease.forEach(
					(increase) => {
						if (increase.type === "vpsPurchase") {
							if (increase.unit === "percentage") {
								finalMonthlyPrice +=
									(finalMonthlyPrice * increase.value) / 100;
								finalHourlyPrice +=
									(finalHourlyPrice * increase.value) / 100;
							} else if (increase.unit === "currency") {
								finalMonthlyPrice += increase.value;
								finalHourlyPrice += increase.value;
							}
						}
					}
				);
			}

			// Round the final monthly price
			finalMonthlyPrice = Math.round(finalMonthlyPrice);

			// Calculate billing cycle prices
			const billingData = await calculateBillingCyclePrices({
				hourlyPrice: finalHourlyPrice,
				monthlyPrice: finalMonthlyPrice,
			});

			vpsPlansWithCosts.push({
				...plan.toObject(),
				hourlyPrice: finalHourlyPrice.toFixed(3),
				monthlyPrice: finalMonthlyPrice,
				billingCycles: billingData,
			});
		}

		return vpsPlansWithCosts;
	} catch (error) {
		console.error("Error fetching VPS plans with costs:", error);
		throw error;
	}
};

const calculateProRatedCost = (
	subscription,
	newPlanPrice,
	currentPlanPrice,
	currentBillingCycleType
) => {
	const today = moment();
	const startDate = subscription?.cycleStart
		? moment(subscription.cycleStart)
		: moment(subscription.createdAt);
	const endDate = moment(subscription.subscriptionEnd);

	let proRatedCost = 0;

	if (currentBillingCycleType === "Hourly") {
		// Calculate total hours and remaining hours
		const totalBillingHours = endDate.diff(startDate, "hours");
		let remainingHours = endDate.diff(today, "hours");
		if (remainingHours < 0) remainingHours = 0;

		if (totalBillingHours > 0) {
			const oldPlanHourlyCost = currentPlanPrice / totalBillingHours;
			const unusedBalance = oldPlanHourlyCost * remainingHours;
			const newPlanHourlyCost = newPlanPrice / totalBillingHours;
			const newPlanProRatedCost = newPlanHourlyCost * remainingHours;
			proRatedCost = newPlanProRatedCost - unusedBalance;
		} else {
			proRatedCost = newPlanPrice; // Charge full price if no cycle
		}
	} else {
		// Calculate total days and remaining days
		const totalBillingDays = endDate.diff(startDate, "days");
		let remainingDays = endDate.diff(today, "days");
		console.log("##remainingDays", remainingDays);
		console.log("##totalBillingDays", totalBillingDays);
		if (remainingDays < 0) remainingDays = 0;

		if (totalBillingDays > 0) {
			const oldPlanDailyCost = currentPlanPrice / totalBillingDays;
			const unusedBalance = oldPlanDailyCost * remainingDays;
			const newPlanDailyCost = newPlanPrice / totalBillingDays;
			const newPlanProRatedCost = newPlanDailyCost * remainingDays;
			proRatedCost = newPlanProRatedCost - unusedBalance;
		} else {
			proRatedCost = newPlanPrice; // Charge full price if no cycle
		}
	}

	return Math.max(parseFloat(proRatedCost.toFixed(2)), 0); // Ensure no negative values
};

module.exports = {
	getPleskLoginDetails,
	getPleskTempLoginDetails,
	getVMCostDetails,
	fetchVPSPlansWithCosts,
	getDiskCostDetails,
	calculateProRatedCost,
};
