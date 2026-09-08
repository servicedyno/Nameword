const path = require("path");
const { GoogleAuth } = require("google-auth-library");
const compute = require("@google-cloud/compute");
const { MetricServiceClient } = require("@google-cloud/monitoring");
const fs = require("fs");
const { jsPDF } = require("jspdf");
const User = require("../../models/User");
const SSHKey = require("../../models/SSHKeys");
const Admin = require("../../models/Admin");
const VM = require("../../models/VM");
const moment = require("moment");
const {
	getPleskLoginDetails,
	getPleskTempLoginDetails,
	getVMCostDetails,
	fetchVPSPlansWithCosts,
	getDiskCostDetails,
	calculateProRatedCost,
	sendVPSSuspensionEmail,
} = require("../../helpers/computeEngineHelper");
const transporter = require("../../services/mailer");
const CPanelPlan = require("../../models/CpanelPlan");
const VpsPlan = require("../../models/VPSPlan");
const OperatingSystem = require("../../models/OperatingSystem");
const VPSBillingCycleDiscount = require("../../models/VPSBillingCycleDiscount");
const VPSDisk = require("../../models/VPSDisk");
const VPS = require("../../models/VPS");
const Subscription = require("../../models/Subscription");
const { default: mongoose } = require("mongoose");
const TelegramBot = require("node-telegram-bot-api");
require("jspdf-autotable");

// Create the path to the JSON credential (key) file
const filePath = path.resolve(__dirname, '../../../config/service-account.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

data.private_key_id = process.env.PRIVATE_KEY_ID;
fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
const keyFilePath = path.join(
	__dirname,
	"../../../config/service-account.json"
);

// Load the JSON key filen
const auth = new GoogleAuth({
	keyFilename: keyFilePath,
	scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});

// WHM Credentials
const WHM_USERNAME = "root";
const WHM_PASSWORD = "4DysYJemcrl8acX5CD/Syw==";
const ADMIN_MAIL_ADDRESS = process.env.ADMIN_MAIL_ADDRESS;

class ComputeEngineController {
	// Get an authenticated client for Google Cloud
	static async getAuthClient() {
		return await auth.getClient();
	}

	// Get a client to manage VM instances
	static async getInstancesClient() {
		const authClient = await ComputeEngineController.getAuthClient();
		return new compute.InstancesClient({ auth: authClient });
	}

	static async getImagesClient() {
		const authClient = await ComputeEngineController.getAuthClient();
		return new compute.ImagesClient({ auth: authClient });
	}

	// Get a client to monitor VM instances
	static async getMonitoringClient(projectId) {
		const authClient = await ComputeEngineController.getAuthClient();
		return new MetricServiceClient({
			authClient: authClient,
			projectId: projectId,
		});
	}

	static async getZoneClient() {
		const authClient = await ComputeEngineController.getAuthClient();
		return new compute.ZonesClient({ auth: authClient });
	}

	// Get a client to manage VM instances
	static async getDisksClient() {
		const authClient = await ComputeEngineController.getAuthClient();
		return new compute.DisksClient({ auth: authClient });
	}

	static async getRegionClient() {
		const authClient = await ComputeEngineController.getAuthClient();
		return new compute.RegionsClient({ auth: authClient });
	}

	static async getDiskTypesClient() {
		const authClient = await ComputeEngineController.getAuthClient();
		return new compute.DiskTypesClient({ auth: authClient });
	}

	static async getRegionOperationsClient() {
		const authClient = await ComputeEngineController.getAuthClient();
		return new compute.RegionOperationsClient({ auth: authClient });
	}

	// Get a client to manage snapshots
	static async getSnapshotsClient() {
		const authClient = await ComputeEngineController.getAuthClient();
		return new compute.SnapshotsClient({ auth: authClient });
	}

	// Get a client to manage operations on VM instances
	static async getOperationsClient() {
		const authClient = await ComputeEngineController.getAuthClient();
		return new compute.ZoneOperationsClient({ auth: authClient });
	}
	static async getGlobalOperationsClient() {
		const authClient = await ComputeEngineController.getAuthClient();
		return new compute.GlobalOperationsClient({ auth: authClient });
	}

	static async getZoneOperationsClient() {
		const authClient = await ComputeEngineController.getAuthClient();
		return new compute.ZoneOperationsClient({ auth: authClient });
	}

	static async getRegionalOperationsClient() {
		const authClient = await ComputeEngineController.getAuthClient();
		return new compute.RegionOperationsClient({ auth: authClient });
	}

	static async getRegionDisksClient() {
		const authClient = await ComputeEngineController.getAuthClient();
		return new compute.RegionDisksClient({ auth: authClient });
	}

	static async getAddressesClient() {
		const authClient = await ComputeEngineController.getAuthClient();
		return new compute.AddressesClient({ auth: authClient });
	}

	// Wait for a Google Cloud operation to complete
	static async waitForOperation(operationsClient, operation, project, zone) {
		console.log(`Waiting for operation ${operation.name} to complete...`);
		while (operation.status !== "DONE") {
			if (!!operation?.zone) {
				[operation] = await operationsClient.wait({
					operation: operation.name,
					project,
					zone: operation.zone.split("/").pop(),
				});
			} else if (operation?.region) {
				[operation] = await operationsClient.wait({
					operation: operation.name,
					project,
					region: operation.region.split("/").pop(),
				});
			} else {
				[operation] = await operationsClient.wait({
					operation: operation.name,
					project,
				});
			}
		}
		console.log("result of operation ", operation?.status);
		return operation;
	}

	// Function to release a static IP address
	static async releaseStaticIpAddress(project, region, name) {
		const addressesClient =
			await ComputeEngineController.getAddressesClient();
		try {
			await addressesClient.delete({
				project: project,
				region: region,
				address: `${name}-static-ip`,
			});
			return { isSuccess: true };
		} catch (error) {
			return { isSuccess: false };
		}
	}

	// List OS
	static async getAvailableOS(req, res) {
		try {
			const { cPanel } = req.query;

			// Fetch all OS options from MongoDB
			let osList = await OperatingSystem.find();

			// Apply filtering if cPanel is specified
			if (cPanel) {
				switch (cPanel.toLowerCase()) {
					case "whm":
						osList = osList.filter((os) =>
							["ubuntu", "almalinux"]?.includes(
								os?.os_name?.toLowerCase()
							)
						);
						break;
					case "plesk":
						osList = osList.filter((os) =>
							["ubuntu", "win", "centos"]?.includes(
								os?.os_name?.toLowerCase()
							)
						);
						break;
				}
			}

			// Format response
			const response = osList?.map((os) => ({
				name: os?.name,
				caption: os?.caption,
				value: os?.os_name,
				...os.toObject(),
			}));

			return res.status(200).json({
				success: true,
				message: "Available OS images.",
				data: response,
			});
		} catch (error) {
			console.error("Error fetching OS images:", error);
			return res.status(500).json({
				success: false,
				message: `Error fetching OS images: ${error.message}`,
			});
		}
	}

	// List VPS Plans [telegram-bot]
	static async getAvailableVPSPlans(_, res) {
		try {
			// Fetch all VPS plans from MongoDB
			const vpsPlans = await VpsPlan.find();

			// Format data structure
			const formattedPlans = vpsPlans.map((plan) => ({
				name: plan.name,
				monthlyPrice: plan.monthlyPrice,
				hourlyPrice: plan.hourlyPrice,
				label: `${plan.name} – ${plan.specs.vCPU} vCPU, ${plan.specs.RAM}GB RAM, ${plan.specs.disk}GB Disk`,
				specs: {
					vCPU: plan.specs.vCPU,
					RAM: plan.specs.RAM,
					disk: plan.specs.disk,
				},
				level: plan.level,
				upgrade_options: plan.upgrade_options || [],
			}));

			return res.status(200).json({
				success: true,
				message: "VPS plans fetched successfully",
				data: { plans: formattedPlans },
			});
		} catch (error) {
			console.error("Error fetching VPS plans:", error);
			return res.status(500).json({
				success: false,
				message: `Error fetching VPS plans: ${error.message}`,
			});
		}
	}

	// Create a new Google Cloud Virtual Machine and install OS.
	static async createInstance(req, res) {
		const instancesClient =
			await ComputeEngineController.getInstancesClient();
		const operationsClient =
			await ComputeEngineController.getOperationsClient();
		const regionalOperationClient =
			await ComputeEngineController.getRegionalOperationsClient();
		const addressesClient =
			await ComputeEngineController.getAddressesClient();
		const imagesClient = await ComputeEngineController.getImagesClient();

		const {
			name,
			diskSizeGB,
			os,
			autoDelete,
			boot,
			diskType,
			machineType,
			networkName,
			googleConsoleProjectId,
			zone,
			autoRenewable,
			plan,
			vCPUs,
			RAM,
			cPanel = "",
			billingCycle,
			license,
		} = req.body;

		let addressOperation, region, pleskCredentials;

		try {
			const userId = req.user._id;
			region = zone.split("-")[0] + "-" + zone.split("-")[1];

			// If cPanel is selected
			let sourceImage;
			const networkTags = ["http-server", "https-server"];

			console.log("cPanel selected", cPanel.toLowerCase());
			const isWindows = os?.includes("win");
			switch (cPanel.toLowerCase()) {
				case "whm":
					networkTags.push("whm");
					return res.send({ data: "WHM work is in progress!" });
				case "plesk":
					console.log("###inside plesk");
					networkTags.push("plesk");
					// Determine license type - if not specified, use BYOL
					const licenseType = license
						? license.toLowerCase()
						: "byol";
					let imageNamePattern;
					if (licenseType === "byol") {
						imageNamePattern = `plesk-obsidian-byol-${os}*`;
					} else {
						imageNamePattern = `plesk-obsidian-${licenseType}-${
							os === "centos" ? "almalinux" : os
						}*`;
					}

					const [images] = await imagesClient.list({
						project: "plesk-public",
						filter: `name=${imageNamePattern}`,
					});

					// Sort images by creationTimestamp using moment and get the latest one
					const latestImage = images.sort((a, b) =>
						moment(b.creationTimestamp).diff(
							moment(a.creationTimestamp)
						)
					)[0];
					sourceImage = latestImage.selfLink;
					console.log("###source Image", sourceImage);
					break;
				default:
					const osDetail = await OperatingSystem.findOne({
						os_name: os,
					});
					console.log("###osDetail", osDetail);
					if (!osDetail) {
						console.error(`❌ No matching OS found for: ${os}`);
					}
					sourceImage = `projects/${osDetail?.cloud}/global/images/family/${osDetail?.family}`;
					console.log("###source Image", sourceImage);
					break;
			}

			// Reserve a new static external IP address
			const [addressResponse] = await addressesClient.insert({
				project: googleConsoleProjectId,
				region,
				addressResource: {
					name: `${name}-static-ip`,
					addressType: "EXTERNAL",
				},
			});
			console.log("###addressResponse", addressResponse);
			addressOperation = addressResponse.latestResponse;
			addressOperation = await ComputeEngineController.waitForOperation(
				regionalOperationClient,
				addressOperation,
				googleConsoleProjectId,
				zone,
				region
			);

			if (addressOperation.error) {
				if (addressOperation) {
					await ComputeEngineController.releaseStaticIpAddress(
						googleConsoleProjectId,
						region,
						name
					);
				}
				res.status(500).json({
					message: "Failed to reserve static IP address.",
					success: false,
				});
			} else {
				// Get the reserved static IP address
				const [address] = await addressesClient.get({
					project: googleConsoleProjectId,
					region,
					address: `${name}-static-ip`,
				});

				const staticIp = address.address;

				const sshAdmin = await Admin.findOne({
					sshKeyName: "ssh-admin",
				});
				let sshUsername = sshAdmin.username;

				console.log("###staticIp", staticIp);
				const [response] = await instancesClient.insert({
					project: googleConsoleProjectId,
					zone: zone,
					instanceResource: {
						name: name,
						machineType: `zones/${zone}/machineTypes/${machineType}`,
						tags: {
							items: networkTags,
						},
						disks: [
							{
								autoDelete: autoDelete,
								boot: boot,
								initializeParams: {
									sourceImage,
									diskSizeGb: diskSizeGB,
									diskType: `zones/${zone}/diskTypes/${diskType}`,
								},
							},
						],
						networkInterfaces: [
							{
								network: networkName,
								accessConfigs: [
									{
										name: "External NAT",
										type: "ONE_TO_ONE_NAT",
										natIP: staticIp,
									},
								],
							},
						],
						metadata: {
							items: [
								{
									key: "ssh-keys",
									value: `${sshUsername}:${sshAdmin.publicKey}`,
								},
								...(sourceImage.toLowerCase().includes("win")
									? [
											{
												key: "enable-windows-ssh",
												value: "TRUE",
											},
											{
												key: "sysprep-specialize-script-cmd",
												value: "googet -noconfirm=true install google-compute-engine-ssh",
											},
									  ]
									: []),
							],
						},
					},
				});

				let operation = response.latestResponse;
				operation = await ComputeEngineController.waitForOperation(
					operationsClient,
					operation,
					googleConsoleProjectId,
					zone
				);

				if (operation.error) {
					if (addressOperation) {
						await ComputeEngineController.releaseStaticIpAddress(
							googleConsoleProjectId,
							region,
							name
						);
					}
					res.status(500).json({
						message: `Error creating VM: ${
							operation?.error?.message ||
							operation?.error?.errors?.[0]?.message
						}`,
						success: false,
					});
				} else {
					// Fetch the instance details after creation
					const [instance] = await instancesClient.get({
						project: googleConsoleProjectId,
						zone: zone,
						instance: name,
					});
					console.log("###instance details:", instance);

					// Get OS details
					const osList = await OperatingSystem.find();
					console.log("###OS details:", osList);
					console.log("##source image", sourceImage);
					const osInfo = osList.find(
						(osData) => osData.os_name === os
					);

					console.log("###osInfo", osInfo);

					console.log(
						"####autoRenewable",
						autoRenewable,
						typeof autoRenewable,
						autoRenewable ? true : false
					);
					// Create a record for the VM in the database
					const newVM = await VM.create({
						userId: userId,
						instanceName: instance.name,
						zone,
						autoRenewable: autoRenewable ? true : false,
						plan,
						vCPUs,
						RAM,
						disk: diskSizeGB,
						diskType,
						os: osInfo?.name,
						cPanel,
						machineType: instance.machineType,
						sourceImage,
						networkName,
						status: instance.status,
						projectId: googleConsoleProjectId,
						staticIp: staticIp,
						billingCycle,
					});

					const newVMDetails = newVM.toObject();

					// If Plesk is selected, start background process to fetch credentials
					if (cPanel.toLowerCase() === "plesk") {
						// Start background process to fetch Plesk credentials
						ComputeEngineController.fetchPleskCredentialsInBackground(
							{
								staticIp,
								userId,
								instanceName: instance.name,
								isWindows,
							}
						);
					}

					res.status(201).json({
						success: true,
						message: `VM ${name} created successfully.`,
						data: {
							host: staticIp,
							name: instance.name,
							machineType: instance.machineType,
							status: instance.status,
							id: instance.id,
							zone: instance.zone,
							networkInterfaces: instance.networkInterfaces,
							disks: instance.disks,
							metadata: instance.metadata,
							tags: instance.tags,
							selfLink: instance.selfLink,
							autoRenewable: autoRenewable ? true : false,
							...(cPanel.toLowerCase() === "plesk" && {
								pleskCredentials: {
									loginUrl: `http://${staticIp}:8880`,
								},
							}),
							...newVMDetails,
						},
					});
				}
			}
		} catch (error) {
			console.log("###error", error);
			if (addressOperation) {
				await ComputeEngineController.releaseStaticIpAddress(
					googleConsoleProjectId,
					region,
					name
				);
			}
			res.status(500).json({
				message: `Error creating VM: ${error.message}`,
				success: false,
			});
		}
	}

	static calculateSubscriptionDates(billingCycleType) {
		const date = moment();
		switch (billingCycleType.toLowerCase()) {
			case "monthly":
				date.add(1, "months");
				break;
			case "quarterly":
				date.add(3, "months");
				break;
			case "annually":
				date.add(1, "years");
				break;
			case "hourly":
				date.add(1, "hours");
				break;
			default:
				// Default case can be handled as needed, e.g., set to monthly
				date.add(1, "months");
				break;
		}

		return { subscriptionEnd: date.toDate() };
	}

	static calculateCPanelExpiryDate(
		billingDuration,
		durationValue,
		currentExpiryDate
	) {
		const currentDate = moment.utc();
		let expiryDate = moment.utc(currentExpiryDate);

		// Check if the current subscription end date is before today's date
		if (expiryDate.isBefore(currentDate, "day")) {
			expiryDate = currentDate;
		}
		switch (billingDuration) {
			case "monthly":
				expiryDate.add(durationValue, "months");
				break;
			case "quarterly":
				expiryDate.add(durationValue * 3, "months");
				break;
			case "annually":
				expiryDate.add(durationValue, "years");
				break;
			case "days":
				expiryDate.add(durationValue, "days");
				break;
			default:
				expiryDate.add(durationValue, "months"); // Default to monthly
				break;
		}
		return expiryDate.toDate();
	}

	static async createVPS(req, res) {
		const instancesClient =
			await ComputeEngineController.getInstancesClient();
		const operationsClient =
			await ComputeEngineController.getOperationsClient();
		const imagesClient = await ComputeEngineController.getImagesClient();

		const {
			label,
			vps_name,
			planId,
			billingCycleId,
			cPanelPlanId,
			osId,
			diskTypeId,
			networkName = "global/networks/default",
			price,
			boot = true,
			zone,
			googleConsoleProjectId,
			autoRenewable = false,
			autoDelete = true,
			telegramBotToken = "",
		} = req.body;

		let region;

		const vpsPlan = await VpsPlan.findById(planId);
		if (!vpsPlan) {
			return res
				.status(404)
				.json({ message: "VPS Plan not found", success: false });
		}

		// Fetch Billing Cycle details based on billingCycleId
		const billingCycle = await VPSBillingCycleDiscount.findById(
			billingCycleId
		);
		if (!billingCycle) {
			return res
				.status(404)
				.json({ message: "Billing Cycle not found", success: false });
		}

		// Fetch cPanel Plan details based on licenseId
		let cPanelPlan;
		if (cPanelPlanId) {
			cPanelPlan = await CPanelPlan.findById(cPanelPlanId);
			if (!cPanelPlan) {
				return res
					.status(404)
					.json({ message: "cPanel Plan not found", success: false });
			}
		}

		// Fetch OS details based on osId
		const osDetail = await OperatingSystem.findById(osId);
		if (!osDetail) {
			return res.status(404).json({
				message: "Operating System not found",
				success: false,
			});
		}

		// Fetch Disk details based on diskTypeId
		const diskDetails = await VPSDisk.findById(diskTypeId);
		if (!diskDetails) {
			return res
				.status(404)
				.json({ message: "Disk not found", success: false });
		}

		// Log the retrieved details for debugging
		console.log("VPS Plan:", vpsPlan);
		console.log("Billing Cycle:", billingCycle);
		console.log("cPanel Plan:", cPanelPlan);
		console.log("OS Detail:", osDetail);
		console.log("Disk Detail:", diskDetails);

		let osName = osDetail?.os_name || "ubuntu";
		let licenseName = cPanelPlan?.id || "byol";
		let machineType = vpsPlan?.specs?.machineType || "e2-standard-2";
		let diskSizeGB = vpsPlan?.specs?.disk;
		let cPanel = cPanelPlan?.type;
		let diskType = diskDetails?.type;

		try {
			const userId = req.user._id;
			region = zone.split("-")[0] + "-" + zone.split("-")[1];

			// If cPanel is selected
			let sourceImage;
			const networkTags = ["http-server", "https-server"];

			const isWindows = osName?.includes("win");
			switch (cPanel?.toLowerCase()) {
				case "whm":
					networkTags.push("whm");

					// Set WHM Image Source (Custom cPanel Image)
					sourceImage = `projects/${googleConsoleProjectId}/global/images/cpanel-${osName}-custom-image-vm`;
					break;
				case "plesk":
					console.log("Getting plesk image...");
					networkTags.push("plesk");
					// Determine license type - if not specified, use BYOL
					const licenseType = licenseName
						? licenseName.toLowerCase()
						: "byol";
					let imageNamePattern;
					if (licenseType === "byol") {
						imageNamePattern = `plesk-obsidian-byol-${osName}*`;
					} else {
						imageNamePattern = `plesk-obsidian-${licenseType}-${
							osName === "centos" ? "almalinux" : osName
						}*`;
					}

					const [images] = await imagesClient.list({
						project: "plesk-public",
						filter: `name=${imageNamePattern}`,
					});

					// Sort images by creationTimestamp using moment and get the latest one
					const latestImage = images.sort((a, b) =>
						moment(b.creationTimestamp).diff(
							moment(a.creationTimestamp)
						)
					)[0];
					sourceImage = latestImage.selfLink;
					console.log("###source Image", sourceImage);
					break;
				default:
					if (!osDetail) {
						console.error(`❌ No matching OS found for: ${osName}`);
					}
					sourceImage = `projects/${osDetail?.cloud}/global/images/family/${osDetail?.family}`;
					console.log("###source Image", sourceImage);
					break;
			}

			const sshAdmin = await Admin.findOne({ sshKeyName: "ssh-admin" });
			let sshUsername = sshAdmin.username;

			const [response] = await instancesClient.insert({
				project: googleConsoleProjectId,
				zone: zone,
				instanceResource: {
					name: vps_name,
					machineType: `zones/${zone}/machineTypes/${machineType}`,
					tags: {
						items: networkTags,
					},
					disks: [
						{
							autoDelete: autoDelete,
							boot: boot,
							initializeParams: {
								sourceImage,
								diskSizeGb: diskSizeGB,
								diskType: `zones/${zone}/diskTypes/${diskType}`,
							},
						},
					],
					networkInterfaces: [
						{
							network: networkName,
							accessConfigs: [{ type: "ONE_TO_ONE_NAT" }],
						},
					],
					metadata: {
						items: [
							{
								key: "ssh-keys",
								value: `${sshUsername}:${sshAdmin.publicKey}`,
							},
							...(sourceImage.toLowerCase().includes("win")
								? [
										{
											key: "enable-windows-ssh",
											value: "TRUE",
										},
										{
											key: "sysprep-specialize-script-cmd",
											value: "googet -noconfirm=true install google-compute-engine-ssh",
										},
								  ]
								: []),
						],
					},
				},
			});

			let operation = response.latestResponse;
			operation = await ComputeEngineController.waitForOperation(
				operationsClient,
				operation,
				googleConsoleProjectId,
				zone
			);

			if (operation.error) {
				res.status(500).json({
					message: `Error creating VM: ${
						operation?.error?.message ||
						operation?.error?.errors?.[0]?.message
					}`,
					success: false,
				});
			} else {
				// Fetch the instance details after creation
				const [instance] = await instancesClient.get({
					project: googleConsoleProjectId,
					zone: zone,
					instance: vps_name,
				});
				console.log("###instance details:", instance);

				// Extract external IP from network interfaces
				let staticIp = null;
				if (
					instance.networkInterfaces &&
					instance.networkInterfaces.length > 0
				) {
					const accessConfigs =
						instance.networkInterfaces[0].accessConfigs || [];
					const natIPConfig = accessConfigs.find(
						(config) => config.natIP
					);
					if (natIPConfig) {
						staticIp = natIPConfig.natIP;
					}
				}
				// Create a record for the VM in the database
				const newVPS = await VPS.create({
					host: staticIp,
					userId: userId,
					label: label,
					vps_name: vps_name,
					zone,
					region: region,
					networkName,
					sourceImage,
					status: instance.status,
					projectId: googleConsoleProjectId,
					staticIp: staticIp,
				});
				console.log("##billingCycle", billingCycle);
				// Determine next payment date and subscription end date based on billing cycle type
				const { subscriptionEnd } =
					ComputeEngineController.calculateSubscriptionDates(
						billingCycle.type
					);

				let cPanelLicenseExpiryDate;
				// If Plesk is selected, send email for WHM credentials
				if (cPanel?.toLowerCase() === "whm") {
					cPanelLicenseExpiryDate =
						ComputeEngineController.calculateCPanelExpiryDate(
							cPanelPlan.billingDuration,
							cPanelPlan.durationValue
						);
				}
				// Create a subscription for the VM
				const subscription = await Subscription.create({
					userId: userId,
					vmId: newVPS._id,
					autoRenewable: !!autoRenewable,
					planId: planId,
					billingCycleId: billingCycleId,
					cPanelPlanId: cPanelPlanId,
					price: price,
					osId: osId,
					diskTypeId: diskTypeId,
					status: "active",
					subscriptionEnd: subscriptionEnd,
					cPanel: cPanelPlanId
						? {
								status: "active",
								expiryDate: cPanelLicenseExpiryDate,
								licenseCanceled: false,
								renewal: {
									firstReminderSent: false,
									firstReminderSentAt: null,
									finalReminderSent: false,
									finalReminderSentAt: null,
								},
								expiry: {
									firstReminderSent: false,
									firstReminderSentAt: null,
									finalReminderSent: false,
									finalReminderSentAt: null,
								},
						  }
						: undefined,
					vpsPlanReminders: {
						renewal: {
							firstReminderSent: false,
							firstReminderSentAt: null,
							finalReminderSent: false,
							finalReminderSentAt: null,
						},
					},
				});

				const populatedSubscription = await Subscription.findById(
					subscription._id
				)
					.populate("userId") // Fetch user details
					.populate("vmId") // Fetch VM details
					.populate("planId") // Fetch Plan details
					.populate("billingCycleId") // Fetch Billing Cycle details
					.populate("cPanelPlanId") // Fetch cPanel Plan details
					.populate("osId") // Fetch OS details
					.populate("diskTypeId"); // Fetch Disk Type details

				const newVPSDetails = newVPS.toObject();

				// If Plesk is selected, start background process to fetch credentials
				if (cPanel?.toLowerCase() === "plesk") {
					// Start background process to fetch Plesk credentials
					ComputeEngineController.fetchPleskCredentialsInBackground({
						staticIp,
						userId,
						instanceName: instance.name,
						isWindows,
						telegramBotToken,
					});
				}
				// If whm is selected, send email for WHM credentials
				if (cPanel?.toLowerCase() === "whm") {
					await ComputeEngineController.sendWHMCredentialsEmail({
						userId,
						telegramBotToken,
						credentials: {
							success: true,
							instanceName: vps_name,
							loginUrl: `https://${staticIp}:2087`,
							username: WHM_USERNAME,
							password: WHM_PASSWORD,
						},
					});
					if (cPanelPlan?.id !== "trial") {
						console.log(
							"###Cpanel",
							populatedSubscription.cPanelPlanId
						);
						await ComputeEngineController.sendWHMCredentialsToAdminEmail(
							{
								userId,
								credentials: {
									instanceName: vps_name,
									loginUrl: `https://${staticIp}:2087`,
									username: WHM_USERNAME,
									password: WHM_PASSWORD,
								},
								cPanelPlanId:
									populatedSubscription.cPanelPlanId,
							}
						);
					}
				}

				res.status(201).json({
					success: true,
					message: `VPS ${label} created successfully.`,
					data: {
						host: staticIp,
						machineType: instance.machineType,
						status: instance.status,
						id: instance.id,
						zone: instance.zone,
						networkInterfaces: instance.networkInterfaces,
						disks: instance.disks,
						metadata: instance.metadata,
						tags: instance.tags,
						selfLink: instance.selfLink,
						autoRenewable: autoRenewable ? true : false,
						...(cPanel?.toLowerCase() === "whm" && {
							whmCredentials: {
								loginUrl: `https://${staticIp}:2087`,
								username: WHM_USERNAME,
								password: WHM_PASSWORD,
							},
						}),
						...(cPanel?.toLowerCase() === "plesk" && {
							pleskCredentials: {
								loginUrl: `https://${staticIp}:8443`,
							},
						}),
						...newVPSDetails,
						subscription: populatedSubscription,
					},
				});
			}
			// }
		} catch (error) {
			console.log("###error", error);
			// if (addressOperation) {
			//     await ComputeEngineController.releaseStaticIpAddress(googleConsoleProjectId, region, vps_name);
			// }
			res.status(500).json({
				message: `Error creating VPS: ${error.message}`,
				success: false,
			});
		}
	}

	// New method to handle background Plesk credential fetching
	static async fetchPleskCredentialsInBackground({
		staticIp,
		userId,
		instanceName,
		isWindows = false,
		telegramBotToken,
	}) {
		const maxAttempts = 15;
		const delayBetweenAttempts = 10000; // 10 seconds
		let attempts = 0;
		let timeoutId;

		const cleanup = () => {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
		};

		const attemptFetch = async () => {
			try {
				const pleskCredentials = await getPleskLoginDetails({
					host: staticIp,
					isWindows,
				});
				console.log("###pleskCredentials", pleskCredentials);
				// If credentials are successfully fetched, send success email
				await ComputeEngineController.sendPleskCredentialsEmail({
					userId,
					telegramBotToken,
					credentials: {
						success: true,
						instanceName,
						loginUrl: `https://${staticIp}:8443`,
						...pleskCredentials,
					},
				});

				cleanup(); // Clean up timeout
				return true;
			} catch (error) {
				console.warn(
					`Attempt ${attempts + 1}/${maxAttempts} failed:`,
					error.message
				);
				return false;
			}
		};

		const runAttempts = async () => {
			try {
				while (attempts < maxAttempts) {
					const success = await attemptFetch();
					if (success) return;

					attempts++;
					if (attempts < maxAttempts) {
						// Use Promise with timeout for better cleanup
						await new Promise((resolve) => {
							timeoutId = setTimeout(
								resolve,
								delayBetweenAttempts
							);
						});
					}
				}

				// If all attempts failed, send failure email
				await ComputeEngineController.sendPleskCredentialsEmail({
					userId,
					telegramBotToken,
					credentials: {
						success: false,
						instanceName,
						loginUrl: `https://${staticIp}:8443`,
					},
				});
			} catch (error) {
				console.error(
					"Fatal error in background Plesk credential fetch:",
					error
				);
				cleanup();

				// Send failure email in case of fatal error
				await ComputeEngineController.sendPleskCredentialsEmail({
					userId,
					telegramBotToken,
					credentials: {
						success: false,
						instanceName,
						loginUrl: `https://${staticIp}:8443`,
					},
				});
			} finally {
				cleanup();
			}
		};

		// Start the background process with proper error boundary
		runAttempts().catch((error) => {
			console.error("Error in background Plesk credential fetch:", error);
			cleanup();
		});
	}

	// New method to send email notifications
	static async sendPleskCredentialsEmail({
		userId,
		credentials,
		telegramBotToken,
	}) {
		try {
			const user = await User.findById(userId);
			if (!user || !user?.email) return;

			// Prepare email content based on credentials status
			const emailContent = credentials?.success
				? {
						subject: `Your Plesk Credentials for ${credentials.instanceName}`,
						html: `
                  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; border-radius: 10px; overflow: hidden;">
                        <!-- Header Section -->
                        <tr>
                            <td style="background-color: #3498db; color: white; padding: 20px; text-align: center; font-size: 24px; font-weight: bold;">
                                🔐 Plesk Login Details
                            </td>
                        </tr>

                        <!-- Content Section -->
                        <tr>
                            <td style="padding: 20px; background-color: #f9f9f9;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td style="padding: 10px 0; font-size: 18px;">
                                            Hello <strong>${
												user?.name
											}</strong>,
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 0; font-size: 18px;">
                                            Your Plesk instance has been successfully set up! Below are your login credentials:
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 0; font-size: 18px;">
                                            <strong>Instance Name:</strong> ${
												credentials.instanceName
											}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 0; font-size: 18px;">
                                            <strong>Plesk Login URL:</strong> 
                                            <a href="${
												credentials.loginUrl
											}" style="color: #3498db; text-decoration: none;">${
							credentials.loginUrl
						}</a>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 0; font-size: 18px;">
                                            <strong>Password Reset Link:</strong> 
                                            <a href="${
												credentials.resetLink
											}" style="color: #3498db; text-decoration: none;">${
							credentials.resetLink
						}</a>
                                        </td>
                                    </tr>
                                    ${
										credentials.tempLink
											? `
                                    <tr>
                                        <td style="padding: 10px 0; font-size: 18px;">
                                            <strong>Temporary Login Link:</strong> 
                                            <a href="${credentials.tempLink}" style="color: #3498db; text-decoration: none;">${credentials.tempLink}</a>
                                        </td>
                                    </tr>`
											: ""
									}
                                </table>
                            </td>
                        </tr>

                        <!-- Security Warning -->
                        <tr>
                            <td style="padding: 20px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fff4e5; padding: 15px; border-radius: 5px;">
                                    <tr>
                                        <td style="color: #e67e22; font-size: 16px;">
                                            ⚠️ Please use the password reset link to set your credentials securely.
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
				  }
				: {
						subject: `Plesk Credentials Status Update for ${credentials.instanceName}`,
						html: `
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
                    <tr>
                        <td style="padding: 20px;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="padding-bottom: 20px;">
                                        <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; margin: 0;">Plesk Access Information</h2>
                                    </td>
                                </tr>
                                
                                <tr>
                                    <td style="background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="padding: 10px 0;"><strong>Instance Name:</strong> ${
													credentials.instanceName
												}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 10px 0;"><strong>Plesk URL:</strong> <a href="${
													credentials.loginUrl
												}" style="color: #3498db; text-decoration: none;">${
							credentials.loginUrl
						}</a></td>
                                            </tr>
                                            ${
												credentials.tempLink
													? `
                                            <tr>
                                                <td style="padding: 10px 0;"><strong>Temporary Plesk URL:</strong> <a href="${credentials.tempLink}" style="color: #3498db; text-decoration: none;">${credentials.tempLink}</a></td>
                                            </tr>`
													: ""
											}
                                        </table>
                                    </td>
                                </tr>

                                <tr>
                                    <td style="padding-top: 20px;">
                                        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; padding: 15px; border-radius: 5px;">
                                            <tr>
                                                <td>
                                                    <p style="margin: 0;">To obtain your login credentials:</p>
                                                    <ol style="margin: 10px 0;">
                                                        <li>Navigate to the Plesk Reset Link section</li>
                                                        <li>Use our Telegram BOT to securely receive your credentials</li>
                                                    </ol>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <tr>
                                    <td style="padding-top: 20px;">
                                        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #e8f4f8; padding: 15px; border-radius: 5px;">
                                            <tr>
                                                <td style="color: #2980b9;">💡 Need help? Contact our support team for assistance.</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <tr>
                                    <td style="padding-top: 20px; color: #7f8c8d; font-size: 12px;">
                                        This is an automated message. Please do not reply to this email.
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            `,
				  };

			if (user?.telegramId && telegramBotToken) {
				const telegramMessage = credentials?.success
					? `🔐 *Plesk Reset Link* 🔐

🖥 *Instance Name:* ${credentials.instanceName}
🌐 *Plesk Login:* [🔗 Click here](${credentials.loginUrl})
🔄 *Reset Password:* [🔗 Reset here](${credentials.resetLink})
${
	credentials.tempLink
		? `📌 *Temporary Access:* [Click here](${credentials.tempLink})`
		: ""
}

⚠️ Use the reset link to set your credentials.`
					: `⚠️ *Plesk Installation Delay* ⚠️

The Plesk installation is taking longer than usual. Please wait a bit longer while the process completes.

ℹ️ *Plesk Access Information* ℹ️

🖥 *Instance Name:* ${credentials.instanceName}
🌐 *Plesk URL:* [🔗 Click here](${credentials.loginUrl})
${
	credentials.tempLink
		? `📌 *Temporary URL:* [🔗 Click here](${credentials.tempLink})`
		: ""
}

🔑 *To get your credentials:*
1️⃣ Go to the *Plesk Reset Link* section.

💡 Need help? Contact our support team.`;

				// Delay helper function
				const delay = (ms) =>
					new Promise((resolve) => setTimeout(resolve, ms));
				await delay(60000);

				// Create a bot
				const bot = new TelegramBot(telegramBotToken);
				bot.sendMessage(user?.telegramId, telegramMessage, {
					parse_mode: "Markdown",
				});
			}
			// Send the email
			await transporter.sendMail({
				from: process.env.MAIL_FROM_ADDRESS,
				to: user.email,
				subject: emailContent.subject,
				html: emailContent.html,
			});

			console.log(
				"Plesk credentials email sent successfully to ",
				user.email,
				"from ",
				process.env.MAIL_FROM_ADDRESS
			);
		} catch (error) {
			console.error("Error sending Plesk credentials email:", error);
		}
	}
	static async sendWHMCredentialsEmail({
		userId,
		credentials,
		telegramBotToken,
	}) {
		try {
			const user = await User.findById(userId);
			if (!user || !user.email) return;

			// Prepare email content
			const emailContent = {
				subject: `Your WHM Credentials for ${credentials.instanceName}`,
				html: `
                    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; border-radius: 10px; overflow: hidden;">
                        <!-- Header Section -->
                        <tr>
                            <td style="background-color: #007bff; color: white; padding: 20px; text-align: center; font-size: 24px; font-weight: bold;">
                                🔐 Your WHM Credentials
                            </td>
                        </tr>

                        <!-- Content Section -->
                        <tr>
                            <td style="padding: 20px; background-color: #f9f9f9;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td style="padding: 10px 0; font-size: 18px;">
                                            Hello <strong>${user?.name}</strong>,
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 0; font-size: 18px;">
                                            Your WHM (Web Host Manager) has been successfully set up! Below are your login credentials:
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 0; font-size: 18px;">
                                            <strong>VPS Instance Name:</strong> ${credentials.instanceName}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 0; font-size: 18px;">
                                            <strong>WHM Login URL:</strong> 
                                            <a href="${credentials.loginUrl}" style="color: #007bff; text-decoration: none;">${credentials.loginUrl}</a>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 0; font-size: 18px;">
                                            <strong>Username:</strong> ${credentials.username}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 0; font-size: 18px;">
                                            <strong>Password:</strong> ${credentials.password}
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
                                            ⚠️ Please log in to WHM and change your password immediately for security reasons.
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

			if (user?.telegramId && telegramBotToken) {
				const telegramMessage = `
🔐 *WHM Credentials* 🔐

🖥 *Instance Name:* \`${credentials.instanceName}\`
🌐 *URL:* [🔗 Click Here](${credentials.loginUrl})

👤 *Username:* \`${credentials.username}\`
🔑 *Password:* \`${credentials.password}\`

⚠️ *Important:* Please change your password after logging in for security.

💡 Need help? Contact our support team.
`;

				// Delay helper function
				const delay = (ms) =>
					new Promise((resolve) => setTimeout(resolve, ms));
				await delay(60000);

				// Create a bot
				const bot = new TelegramBot(telegramBotToken);
				bot.sendMessage(user?.telegramId, telegramMessage, {
					parse_mode: "Markdown",
				});
			}

			// Send the email
			await transporter.sendMail({
				from: process.env.MAIL_FROM_ADDRESS,
				to: user.email,
				subject: emailContent.subject,
				html: emailContent.html,
			});

			console.log(
				"WHM credentials email sent successfully to ",
				user.email,
				"from ",
				process.env.MAIL_FROM_ADDRESS
			);
		} catch (error) {
			console.error("Error sending WHM credentials email:", error);
		}
	}

	static async sendWHMCredentialsToAdminEmail({
		userId,
		credentials,
		cPanelPlanId,
	}) {
		try {
			const user = await User.findById(userId);
			if (!user || !user.email) return;

			// Prepare Admin Email Content
			const adminEmailContent = {
				subject: `New WHM Purchase - ${user?.name}`,
				html: `
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; border-radius: 10px; overflow: hidden;">
                    <tr>
                        <td style="background-color: #ff9800; color: white; padding: 20px; text-align: center; font-size: 24px; font-weight: bold;">
                            ⚠️ WHM License Needs to be Added!
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px; background-color: #f9f9f9;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr><td style="padding: 10px 0; font-size: 18px;"><strong>User:</strong> ${
									user?.name
								}</td></tr>
                                <tr><td style="padding: 10px 0; font-size: 18px;"><strong>VPS Instance Name:</strong> ${
									credentials?.instanceName
								}</td></tr>
                                <tr><td style="padding: 10px 0; font-size: 18px;"><strong>License Type:</strong> ${
									cPanelPlanId?.name || cPanelPlanId?.id
								}</td></tr>
                                <tr><td style="padding: 10px 0; font-size: 18px;"><strong>License Price:</strong> $${
									cPanelPlanId?.price || 0
								}</td></tr>
                                <tr><td style="padding: 10px 0; font-size: 18px;"><strong>WHM URL:</strong> <a href="${
									credentials?.loginUrl
								}" style="color: #007bff; text-decoration: none;">${
					credentials?.loginUrl
				}</a></td></tr>
                                <tr><td style="padding: 10px 0; font-size: 18px;"><strong>Username:</strong> ${
									credentials?.username
								}</td></tr>
                                <tr><td style="padding: 10px 0; font-size: 18px;"><strong>Password:</strong> ${
									credentials?.password
								}</td></tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding-top: 20px; color: #d32f2f; font-size: 16px; text-align: center;">
                            ⚠️ Please assign a WHM license to this user.
                        </td>
                    </tr>
                    <tr>
                        <td style="padding-top: 20px; color: #7f8c8d; font-size: 12px; text-align: center;">
                            This is an automated message for the admin.
                        </td>
                    </tr>
                </table>
            `,
			};

			// Send the email
			await transporter.sendMail({
				from: process.env.MAIL_FROM_ADDRESS,
				to: ADMIN_MAIL_ADDRESS,
				subject: adminEmailContent.subject,
				html: adminEmailContent.html,
			});

			console.log(
				"WHM credentials email sent successfully to admin on",
				user.email,
				"from ",
				process.env.MAIL_FROM_ADDRESS
			);
		} catch (error) {
			console.error("Error sending WHM credentials email:", error);
		}
	}

	// Function to get Plesk reset link
	static async getPleskResetLink(req, res) {
		try {
			const { host, os } = req.query;
			console.log(`🔹 Getting Plesk reset link for host: ${host}`);

			const pleskDetails = await getPleskTempLoginDetails({
				host,
				isWindows: os?.includes("win"),
			});

			res.status(200).json({
				success: true,
				message: "Successfully retrieved Plesk login details",
				data: pleskDetails,
			});
		} catch (error) {
			console.error("❌ Error getting Plesk login details:", error);
			res.status(500).json({
				success: false,
				message: `Failed to get Plesk login details: ${error.message}`,
			});
		}
	}

	static async addSSHKeyToVM(instanceId, sshKeys) {
		const vps = await VPS.findOne({ _id: instanceId });
		if (!vps) throw new Error("VPS not found");
		for (const sshkey of sshKeys) {
			vps.sshKeys.push(sshkey);
			await vps.save();
		}
		console.log("✅ SSH Key added:", sshKeys);
	}

	// Attach an SSH key to a Google Cloud Virtual Machine
	static async attachSSHKeys(req, res) {
		const { vps_id } = req.params;

		if (!mongoose.Types.ObjectId.isValid(vps_id)) {
			return res
				.status(400)
				.json({ success: false, message: "Invalid VPS ID format." });
		}

		const { project, zone, sshKeys } = req.body;
		try {
			const userId = req.user._id;

			// Validate and fetch details for all SSH keys
			const sshKeyDetails = [];
			for (const sshKeyName of sshKeys) {
				const keyDetails = await SSHKey.findOne({ userId, sshKeyName });
				if (!keyDetails) {
					return res.status(400).json({
						message: `SSH key '${sshKeyName}' not found. Please check the SSH key names and try again.`,
						success: false,
					});
				}
				sshKeyDetails.push(keyDetails);
			}

			// ✅ Check if VM exists
			const vps = await VPS.findOne({ _id: vps_id, userId });
			console.log("##vps", vps);
			if (!vps) {
				return res.status(404).json({
					message: `❌ VPS not found.`,
					success: false,
				});
			}

			// ✅ Check if requested SSH keys are already attached to this VM
			const duplicateKeys = sshKeys.filter((key) =>
				vps.sshKeys.includes(key)
			);
			if (duplicateKeys.length > 0) {
				return res.status(400).json({
					message: `⚠️ The following SSH keys are already attached to VPS: ${duplicateKeys.join(
						", "
					)}`,
					success: false,
				});
			}

			// Fetch instance details
			const instanceName = vps.vps_name;
			const instancesClient =
				await ComputeEngineController.getInstancesClient();
			const [instance] = await instancesClient.get({
				project,
				zone,
				instance: instanceName,
			});

			let metaData = instance.metadata;

			// Extract existing SSH keys
			const metaItems = metaData.items || [];
			let sshKeysEntry = metaItems.find(
				(item) => item.key === "ssh-keys"
			);

			let existingKeys = sshKeysEntry ? sshKeysEntry.value : "";
			const keysArray = existingKeys
				.split("\n")
				.filter((key) => key.trim() !== ""); // Split and remove empty lines

			// Add new SSH keys to the list
			for (const keyDetail of sshKeyDetails) {
				const newKey = `${keyDetail.username}:${keyDetail.publicKey}`;
				if (!keysArray.includes(newKey)) {
					keysArray.push(newKey); // Avoid duplicates
				}
			}

			// Update metadata with the combined SSH keys
			const updatedItems = metaItems.filter(
				(item) => item.key !== "ssh-keys"
			); // Remove existing SSH keys entry
			updatedItems.push({
				key: "ssh-keys",
				value: keysArray.join("\n"),
			});

			// Update the instance metadata with the new SSH keys
			const response = await instancesClient.setMetadata({
				project,
				zone,
				instance: instanceName,
				metadataResource: {
					items: updatedItems,
					fingerprint: metaData.fingerprint,
				},
			});

			// ✅ Store SSH keys in MongoDB VM model
			await ComputeEngineController.addSSHKeyToVM(vps._id, sshKeys);

			res.status(200).json({
				sshKeys,
				instanceName: vps.instanceName,
				message: `SSH keys have been successfully attached to your VPS '${vps.label}'.`,
				success: true,
			});
		} catch (error) {
			console.error("Error attaching SSH keys:", error);
			res.status(500).json({
				message: `Error attaching SSH keys: ${error.message}`,
			});
		}
	}

	// Detach an SSH key from a Google Cloud Virtual Machine
	static async detachSSHKeys(req, res) {
		const { vps_id } = req.params;

		if (!mongoose.Types.ObjectId.isValid(vps_id)) {
			return res
				.status(400)
				.json({ success: false, message: "Invalid VPS ID format." });
		}

		const { project, zone, sshKeys } = req.body;
		try {
			const userId = req.user._id;

			// ✅ Check if VM exists
			const vps = await VPS.findOne({ _id: vps_id, userId });
			if (!vps) {
				return res.status(404).json({
					message: `❌ VPS not found.`,
					success: false,
				});
			}
			let instanceName = vps.vps_name;
			let label = vps.label;

			// ✅ Fetch SSH keys from the database
			const sshKeyDetails = await SSHKey.find({
				userId,
				sshKeyName: { $in: sshKeys },
			});

			if (sshKeyDetails.length === 0) {
				return res.status(400).json({
					message: `⚠️ No matching SSH keys found in the database for this user.`,
					success: false,
				});
			}

			// ✅ Fetch instance details from GCP
			const instancesClient =
				await ComputeEngineController.getInstancesClient();
			const [instance] = await instancesClient.get({
				project,
				zone,
				instance: instanceName,
			});

			let metaData = instance.metadata;
			const metaItems = metaData.items || [];

			// ✅ Find `ssh-keys` entry in metadata
			let sshKeysEntry = metaItems.find(
				(item) => item.key === "ssh-keys"
			);

			if (!sshKeysEntry) {
				return res.status(400).json({
					message: `⚠️ No SSH keys found in metadata for VM '${instanceName}'.`,
					success: false,
				});
			}

			console.log("###sshKeysEntry", sshKeysEntry);
			let existingKeys = sshKeysEntry.value
				.split("\n")
				.filter((key) => key.trim() !== "");

			// ✅ Get SSH key values from the database for comparison
			const sshPublicKeyValues = sshKeyDetails.map(
				(key) => `${key.username}:${key.publicKey}`
			);

			// ✅ Remove only the specified SSH keys from metadata
			const updatedKeysArray = existingKeys.filter((existingKey) => {
				return !sshPublicKeyValues.some((keyToRemove) =>
					existingKey.includes(keyToRemove)
				);
			});

			// ✅ Update GCP instance metadata
			const updatedItems = metaItems.filter(
				(item) => item.key !== "ssh-keys"
			);
			if (updatedKeysArray.length > 0) {
				updatedItems.push({
					key: "ssh-keys",
					value: updatedKeysArray.join("\n"),
				});
			}

			await instancesClient.setMetadata({
				project,
				zone,
				instance: instanceName,
				metadataResource: {
					items: updatedItems,
					fingerprint: metaData.fingerprint,
				},
			});

			// ✅ Remove SSH keys from MongoDB VM Model
			vps.sshKeys = vps.sshKeys.filter((key) => !sshKeys.includes(key));
			await vps.save();

			res.status(200).json({
				sshKeys,
				instanceName,
				message: `✅ SSH keys have been successfully detached from VPS '${label}'.`,
				success: true,
			});
		} catch (error) {
			console.error("❌ Error detaching SSH keys:", error);
			res.status(500).json({
				message: `Error detaching SSH keys: ${error.message}`,
				success: false,
			});
		}
	}

	static async startVPSInstance(vmId) {
		const instancesClient =
			await ComputeEngineController.getInstancesClient();
		const operationsClient =
			await ComputeEngineController.getOperationsClient();

		// Fetch the VPS instance details by vmId (vmId can be the identifier of the VPS in your database)
		const vps = await VPS.findById(vmId);
		if (!vps) {
			throw new Error("VPS not found.");
		}

		const instanceName = vps?.vps_name;
		const zone = vps?.zone;
		const project = process.env.GOOGLE_PROJECT_ID || "nameword-435507";

		try {
			// Start the VPS instance
			const [response] = await instancesClient.start({
				project,
				zone,
				instance: instanceName,
			});

			// Wait for the operation to complete
			let operation = response.latestResponse;
			operation = await ComputeEngineController.waitForOperation(
				operationsClient,
				operation,
				project,
				zone
			);

			console.log(`✅ VPS ${instanceName} started successfully.`);
			return {
				success: true,
				message: `VPS ${instanceName} started successfully.`,
			};
		} catch (error) {
			console.error(
				`❌ Error starting VPS ${instanceName}:`,
				error.message
			);
			throw new Error(`Error starting VM: ${error.message}`);

			return {
				success: false,
				message: `VPS ${instanceName} not started.`,
			};
		}
	}
	// Start a Google Cloud Virtual Machine
	static async startVPS(req, res) {
		const instancesClient =
			await ComputeEngineController.getInstancesClient();
		const operationsClient =
			await ComputeEngineController.getOperationsClient();
		const { project } = req.body;
		const instanceName = req.vps.vps_name;
		const zone = req.vps.zone;
		const label = req.vps.label;

		try {
			// Fetch the current status of the VPS
			const subscription = await Subscription.findOne({
				"vmId.vps_name": instanceName,
			}).populate("vmId");

			if (!subscription) {
				return res.status(404).json({
					message: `VPS ${label} not found.`,
					success: false,
				});
			}

			// Check if the VPS is in a valid state for starting
			if (subscription.status !== "active") {
				return res.status(400).json({
					message: `VPS ${label} cannot be started. It is currently in ${subscription.status} state.`,
					success: false,
				});
			}

			const [response] = await instancesClient.start({
				project,
				zone,
				instance: instanceName,
			});

			let operation = response.latestResponse;
			operation = await ComputeEngineController.waitForOperation(
				operationsClient,
				operation,
				project,
				zone
			);

			res.status(200).json({
				message: `VPS ${label} started successfully.`,
				success: true,
			});
		} catch (error) {
			res.status(500).json({
				message: `Error starting VM: ${error.message}`,
				success: false,
			});
		}
	}

	// Suspend the VPS instance
	static async suspendVPSInstance({ vps_id, userId, project }) {
		try {
			const instancesClient =
				await ComputeEngineController.getInstancesClient();
			const operationsClient =
				await ComputeEngineController.getOperationsClient();

			// Fetch the instance details using the VPS ID
			const instance = await VPS.findOne({ _id: vps_id, userId });
			if (!instance) {
				throw new Error("VPS not found.");
			}

			const zone = instance.zone;
			const instanceName = instance.vps_name;

			// Step 1: Stop the VPS instance (Suspension in GCP means stopping the instance)
			const [response] = await instancesClient.stop({
				project,
				zone,
				instance: instanceName,
			});

			// Step 2: Wait for the operation to complete
			let operation = response.latestResponse;
			operation = await ComputeEngineController.waitForOperation(
				operationsClient,
				operation,
				project,
				zone
			);

			// Step 3: Update subscription status to "suspended"
			await VPS.updateOne(
				{ _id: vps_id, userId },
				{ $set: { status: "suspended" } }
			);

			const user = await User.findById(userId);

			console.log(`✅ VPS ${instanceName} suspended successfully.`);
			return {
				success: true,
				message: `VPS ${instanceName} suspended successfully.`,
			};
		} catch (error) {
			console.error("❌ Error suspending VPS instance:", error);
			return { success: false, message: error.message };
		}
	}

	// Stop a Google Cloud Virtual Machine
	static async stopVPS(req, res) {
		const instancesClient =
			await ComputeEngineController.getInstancesClient();
		const operationsClient =
			await ComputeEngineController.getOperationsClient();
		const { project } = req.body;

		const instanceName = req.vps.vps_name;
		const zone = req.vps.zone;
		const label = req.vps.label;

		try {
			const [response] = await instancesClient.stop({
				project,
				zone,
				instance: instanceName,
			});

			let operation = response.latestResponse;
			operation = await ComputeEngineController.waitForOperation(
				operationsClient,
				operation,
				project,
				zone
			);

			res.status(200).json({
				message: `VPS ${label} stopped successfully.`,
				success: true,
			});
		} catch (error) {
			res.status(500).json({
				message: `Error stopping VM: ${error.message}`,
				success: false,
			});
		}
	}

	// Restart a Google Cloud Virtual Machine
	static async restartVPS(req, res) {
		const instancesClient =
			await ComputeEngineController.getInstancesClient();
		const operationsClient =
			await ComputeEngineController.getOperationsClient();
		const { project } = req.body;

		const instanceName = req.vps.vps_name;
		const zone = req.vps.zone;
		const label = req.vps.label;

		try {
			// Fetch the current status of the VPS
			const subscription = await Subscription.findOne({
				"vmId.vps_name": instanceName,
			}).populate("vmId");

			if (!subscription) {
				return res.status(404).json({
					message: `VPS ${label} not found.`,
					success: false,
				});
			}

			// Check if the VPS is in a valid state for starting
			if (subscription.status !== "active") {
				return res.status(400).json({
					message: `VPS ${label} cannot be started. It is currently in ${subscription.status} state.`,
					success: false,
				});
			}

			const [response] = await instancesClient.reset({
				project,
				zone,
				instance: instanceName,
			});

			let operation = response.latestResponse;
			operation = await ComputeEngineController.waitForOperation(
				operationsClient,
				operation,
				project,
				zone
			);

			res.status(200).json({
				message: `VPS ${label} restarted successfully.`,
				success: true,
			});
		} catch (error) {
			res.status(500).json({
				message: `Error restarting VM: ${error.message}`,
				success: false,
			});
		}
	}

	// Delete a Google Cloud Virtual Machine
	static async deleteVPSInstance({
		vps_id,
		userId,
		project,
		status = "deleted",
	}) {
		try {
			const instancesClient =
				await ComputeEngineController.getInstancesClient();
			const operationsClient =
				await ComputeEngineController.getOperationsClient();
			const addressesClient =
				await ComputeEngineController.getAddressesClient();
			const disksClient = await ComputeEngineController.getDisksClient();

			// Validate VPS ID
			if (!mongoose.Types.ObjectId.isValid(vps_id)) {
				throw new Error("Invalid VPS ID format.");
			}

			// Fetch VPS details
			const vps = await VPS.findOne({ _id: vps_id, userId });
			if (!vps) {
				throw new Error("VPS not found.");
			}

			const zone = vps.zone;
			const instanceName = vps.vps_name;

			// Fetch instance details
			const [instance] = await instancesClient.get({
				project,
				zone,
				instance: instanceName,
			});

			let bootDiskName = null;
			// Extract boot disk name
			const bootDisk = instance.disks.find((disk) => disk.boot);
			if (bootDisk?.source) {
				bootDiskName = bootDisk.source.split("/").pop();
			}

			// Delete the instance
			const [response] = await instancesClient.delete({
				project,
				zone,
				instance: instanceName,
			});

			let operation = response.latestResponse;
			await ComputeEngineController.waitForOperation(
				operationsClient,
				operation,
				project,
				zone
			);
			console.log(`VPS ${instanceName} deleted successfully.`);

			// Delete the persistent disk only if it exists
			if (bootDiskName) {
				try {
					console.log(
						`Checking if disk ${bootDiskName} exists before deletion...`
					);

					// Check if the disk exists
					const [disk] = await disksClient.get({
						project,
						zone,
						disk: bootDiskName,
					});

					if (disk) {
						console.log(
							`Deleting attached disk: ${bootDiskName}...`
						);
						const [deleteDiskResponse] = await disksClient.delete({
							project,
							zone,
							disk: bootDiskName,
						});

						let operation = deleteDiskResponse.latestResponse;
						await ComputeEngineController.waitForOperation(
							operationsClient,
							operation,
							project,
							zone
						);
						console.log(
							`Disk ${bootDiskName} deleted successfully.`
						);
					}
				} catch (diskError) {
					if (diskError.code === 404) {
						console.warn(
							`Disk ${bootDiskName} not found. It may have already been deleted.`
						);
					} else {
						console.error(
							`Error deleting disk ${bootDiskName}:`,
							diskError.message
						);
					}
				}
			}

			// Delete the VPS record from DB
			await VPS.deleteOne({ _id: vps_id, userId });

			// Update subscription status
			await Subscription.updateOne(
				{ vmId: vps._id },
				{
					$set: {
						status: status,
						"cPanel.status": "deleted",
						"cPanel.licenseCanceled": true,
					},
				}
			);

			return {
				success: true,
				message: `VPS ${vps.label} deleted successfully.`,
			};
		} catch (error) {
			console.error(`Error deleting VPS: ${error.message}`);
			return {
				success: false,
				message: `Error deleting VPS: ${error.message}`,
			};
		}
	}

	static async deleteVPS(req, res) {
		const { vps_id } = req.params;
		const { project } = req.body;
		const userId = req.user._id;

		const result = await ComputeEngineController.deleteVPSInstance({
			vps_id,
			userId,
			project,
		});

		if (result.success) {
			res.status(200).json(result);
		} else {
			res.status(500).json(result);
		}
	}

	// Check Status of a virtual machine
	static async statusVPS(req, res) {
		const instancesClient =
			await ComputeEngineController.getInstancesClient();

		const { project } = req.body;

		const instanceName = req.vps.vps_name;
		const zone = req.vps.zone;
		const label = req.vps.label;

		try {
			const [instance] = await instancesClient.get({
				project: project,
				zone: zone,
				instance: instanceName,
			});

			res.status(200).json({
				success: true,
				message: `VPS ${label} status fetched successfully.`,
				data: {
					instanceName,
					status: instance.status,
					instanceDetails: instance,
				},
			});
		} catch (error) {
			res.status(500).json({
				message: `Error getting VPS status: ${error.message}`,
				success: false,
			});
		}
	}

	// Function to extract the External NAT natIP from network interfaces
	static getNatIP(networkInterfaces) {
		return (
			networkInterfaces
				?.find((networkInterface) =>
					networkInterface.accessConfigs?.some(
						(config) => config.name === "External NAT"
					)
				)
				?.accessConfigs?.find(
					(config) => config.name === "External NAT"
				)?.natIP || null
		);
	}

	// List all virtual machines
	static async listVPS(req, res) {
		const instancesClient =
			await ComputeEngineController.getInstancesClient();
		try {
			const userId = req.user._id;
			// Fetch VM details for the user
			const userVMs = await VPS.find({ userId }).lean();
			const instancesList = [];

			for (const vps of userVMs) {
				const { vps_name, zone, autoRenewable } = vps;
				const instanceName = vps_name;
				// Get instance details from GCP
				const [instance] = await instancesClient.get({
					project: req.query.project,
					zone: zone,
					instance: instanceName,
				});

				// Extract the External NAT natIP without using [0]
				const natIP = ComputeEngineController.getNatIP(
					instance.networkInterfaces
				);

				// Fetch subscription details for the current VPS
				const subscription = await Subscription.findOne({
					vmId: vps._id,
				}).lean();

				// Push the instance details along with VM model data
				instancesList.push({
					name: vps.label,
					machineType: instance.machineType,
					status: instance.status,
					zone,
					zoneFullName: instance.zone,
					networkInterfaces: instance.networkInterfaces,
					disks: instance.disks,
					metadata: instance.metadata,
					tags: instance.tags,
					selfLink: instance.selfLink,
					autoRenewable,
					host: natIP,
					...vps,
					subscription,
				});
			}
			res.status(200).json({
				data: instancesList,
				success: true,
				message: `VPS listed successfully.`,
			});
		} catch (error) {
			console.error(`Error listing VPS: ${error.message}`);
			res.status(500).json({
				message: `Error listing VPS: ${error.message}`,
				success: false,
			});
		}
	}

	// Get VM details
	static async getVPS(req, res) {
		const instancesClient =
			await ComputeEngineController.getInstancesClient();
		try {
			const { vps_id } = req.params;
			const { project } = req.query;
			const userId = req.user._id;

			if (!mongoose.Types.ObjectId.isValid(vps_id)) {
				return res.status(400).json({
					success: false,
					message: "Invalid VPS ID format.",
				});
			}

			// Fetch VM details for the user and populate subscription details
			const userVPS = await VPS.findOne({ userId, _id: vps_id }).lean();

			console.log("##userVPS", userVPS);

			if (!userVPS) {
				return res.status(404).json({
					message: `VPS ${vps_id} not found.`,
					success: false,
				});
			}

			// Get instance details from GCP
			const [instance] = await instancesClient.get({
				project,
				zone: userVPS.zone,
				instance: userVPS.vps_name,
			});

			// Extract the External NAT natIP without using [0]
			const natIP = ComputeEngineController.getNatIP(
				instance.networkInterfaces
			);

			// Fetch subscription details using the vpsId from userVM and populate all fields
			const subscription = await Subscription.findOne({
				vmId: userVPS._id,
			})
				.populate("userId") // Populate user details
				.populate("planId") // Populate plan details
				.populate("billingCycleId") // Populate billing cycle details
				.populate("cPanelPlanId") // Populate cPanel plan details
				.populate("osId") // Populate OS details
				.populate("diskTypeId") // Populate disk type details
				.lean();

			if (!subscription) {
				return res.status(404).json({
					success: false,
					message: "Subscription not found.",
				});
			}

			const {
				_id,
				status,
				price,
				autoRenewable,
				subscriptionEnd,
				createdAt,
				updatedAt,
				userId: userDetails,
				planId,
				billingCycleId,
				cPanelPlanId,
				osId,
				diskTypeId,
				cPanel,
			} = subscription;

			const response = {
				subscription_id: _id,
				subscriptionStatus: status,
				price,
				subscriptionEnd,
				autoRenewable,
				createdAt,
				updatedAt,
				userDetails: {
					id: userDetails._id,
					name: userDetails.name,
					email: userDetails.email,
				},
				planDetails: {
					id: planId._id,
					name: planId.name,
					specs: planId.specs,
					increment: planId.increment,
					level: planId.level,
				},
				billingCycleDetails: {
					id: billingCycleId._id,
					type: billingCycleId.type,
					discount: billingCycleId.discount,
					enabled: billingCycleId.enabled,
				},
				cPanelPlanDetails: {
					id: cPanelPlanId?._id,
					type: cPanelPlanId?.type,
					name: cPanelPlanId?.name,
					expiryDate: cPanel?.expiryDate,
					status: cPanel?.status,
					price: cPanelPlanId?.price,
					billingDuration: cPanelPlanId?.billingDuration,
					durationValue: cPanelPlanId?.durationValue,
				},
				osDetails: {
					id: osId._id,
					name: osId.name,
					version: osId.version,
				},
				diskTypeDetails: {
					id: diskTypeId._id,
					type: diskTypeId.type,
					basePrice: diskTypeId.basePrice,
					description: diskTypeId.description,
				},
			};

			// Push the instance details along with VM model data
			const data = {
				name: userVPS.label,
				machineType: instance.machineType,
				status: instance.status,
				id: instance.id,
				zone: userVPS.zone,
				zoneFullName: instance.zone,
				networkInterfaces: instance.networkInterfaces,
				disks: instance.disks,
				metadata: instance.metadata,
				tags: instance.tags,
				selfLink: instance.selfLink,
				host: natIP,
				...userVPS,
				...response,
			};
			console.log("###data", data);
			res.status(200).json({
				data,
				success: true,
				message: `VPS details fetched successfully.`,
			});
		} catch (error) {
			res.status(500).json({
				message: `Error fetching VM: ${error.message}`,
				success: false,
			});
		}
	}

	// Reboot a Google Cloud Virtual Machine
	static async rebootVPS(req, res) {
		const instancesClient =
			await ComputeEngineController.getInstancesClient();
		const operationsClient =
			await ComputeEngineController.getOperationsClient();

		const { project } = req.body;

		const instanceName = req.vps.vps_name;
		const zone = req.vps.zone;
		const label = req.vps.label;

		try {
			const [response] = await instancesClient.reset({
				project,
				zone,
				instance: instanceName,
			});

			let operation = response.latestResponse;
			operation = await ComputeEngineController.waitForOperation(
				operationsClient,
				operation,
				project,
				zone
			);

			res.status(200).json({
				message: `VPS ${label} rebooted successfully.`,
				success: true,
			});
		} catch (error) {
			res.status(500).json({
				message: `Error rebooting VM: ${error.message}`,
				success: false,
			});
		}
	}

	static async getDiskUsage(diskName, projectId, zone, instanceName) {
		try {
			const disksClient = await ComputeEngineController.getDisksClient();
			diskName = diskName.split("/").pop();
			const [disk] = await disksClient.get({
				project: projectId,
				zone: zone,
				disk: diskName,
			});
			console.log("disk", disk);
			// This is an approximation based on the disk's size and utilization
			// You might need to adjust this based on your specific needs and usage patterns.
			const approximateUsageGB = disk.sizeGb * (disk.usagePercent / 100);
			console.log("approximateUsageGB", approximateUsageGB);
			return approximateUsageGB;
		} catch (error) {
			console.error("Error getting disk usage:", error);
			throw error;
		}
	}

	// To retrive upgrade options
	static async getUpgradeVPS(req, res) {
		try {
			const { vps_id } = req.params;

			if (!mongoose.Types.ObjectId.isValid(vps_id)) {
				return res.status(400).json({
					success: false,
					message: "Invalid VPS ID format.",
				});
			}

			// Find subscription related to this VPS
			const subscription = await Subscription.findOne({ vmId: vps_id })
				.populate("planId")
				.populate("diskTypeId")
				.populate("osId")
				.populate("cPanelPlanId");
			if (!subscription) {
				return res.status(404).json({
					success: false,
					message: "Subscription not found for this VPS.",
				});
			}

			const currentPlan = subscription.planId;
			if (!currentPlan) {
				return res.status(404).json({
					success: false,
					message: "VPS plan details not found.",
				});
			}

			const userId = req?.user?._id;
			const region = req?.vps?.region;
			const diskType = subscription?.diskTypeId?.type;
			const preemptible = req?.query?.preemptible || false;

			const currentPlanLevel = subscription.planId.level;

			const vpsPlansWithCosts = await fetchVPSPlansWithCosts({
				userId,
				region,
				diskType,
				preemptible,
			});

			const osPrice = subscription?.osId?.price || 0;
			const cPanelPrice = subscription?.cPanelPlanId?.price || 0;

			let upgradeOptions = [];

			vpsPlansWithCosts.forEach((plan) => {
				if (plan.level > currentPlanLevel) {
					let updatedBillingCycles = plan.billingCycles.map(
						(billingCycle) => ({
							...billingCycle,
							finalPrice: (
								parseFloat(billingCycle.finalPrice) +
								osPrice +
								cPanelPrice
							).toFixed(2),
						})
					);

					let hourlyCycle = updatedBillingCycles.find(
						(cycle) => cycle.type === "Hourly"
					);
					let monthlyCycle = updatedBillingCycles.find(
						(cycle) => cycle.type === "Monthly"
					);
					let quarterlyCycle = updatedBillingCycles.find(
						(cycle) => cycle.type === "Quarterly"
					);
					let annuallyCycle = updatedBillingCycles.find(
						(cycle) => cycle.type === "Annually"
					);

					upgradeOptions.push({
						_id: plan._id,
						from: currentPlan.name,
						to: plan.name,
						monthlyPrice: monthlyCycle.finalPrice,
						hourlyPrice: hourlyCycle.finalPrice,
						quarterlyCycle: quarterlyCycle.finalPrice,
						annuallyCycle: annuallyCycle.finalPrice,
					});
				}
			});

			if (!upgradeOptions.length) {
				return res.status(200).json({
					success: true,
					message: "No upgrade options available for this VPS.",
					data: [],
				});
			}

			return res.status(200).json({
				success: true,
				message: "Available upgrade options retrieved successfully.",
				data: upgradeOptions,
			});
		} catch (error) {
			console.error("Error fetching upgrade options:", error);
			return res.status(500).json({
				success: false,
				message: `Error fetching upgrade options: ${error.message}`,
			});
		}
	}

	// To upgrade VPS
	static async upgradeVPS(req, res) {
		const { vps_id } = req.params;
		const {
			new_plan_id,
			new_plan_price,
			projectId = "nameword-435507",
		} = req.body;

		try {
			if (
				!mongoose.Types.ObjectId.isValid(vps_id) ||
				!mongoose.Types.ObjectId.isValid(new_plan_id)
			) {
				return res.status(400).json({
					success: false,
					message: "Invalid VPS ID or Plan ID format.",
				});
			}

			// Find the current subscription for the VPS
			const subscription = await Subscription.findOne({ vmId: vps_id })
				.populate("planId")
				.populate("billingCycleId")
				.populate("osId")
				.populate("vmId")
				.populate("diskTypeId")
				.populate("cPanelPlanId");

			if (!subscription) {
				return res.status(404).json({
					success: false,
					message: "Subscription not found for this VPS.",
				});
			}

			const currentPlan = subscription.planId;
			if (!currentPlan) {
				return res.status(404).json({
					success: false,
					message: "Current VPS plan details not found.",
				});
			}

			// Find the new plan in the fetched plans
			const newPlan = await VpsPlan.findById(new_plan_id);

			// if (newPlan.level <= currentPlanLevel) {
			//     return res.status(400).json({ success: false, message: "Degrading plan is not supported." });
			// }

			const updatedVPS = await ComputeEngineController.updateVPSConfig({
				googleConsoleProjectId: projectId,
				oldVPS: subscription.vmId,
				oldPlan: currentPlan,
				newPlan: newPlan.toObject(),
			});
			console.log("##updatedVPS", updatedVPS);
			if (updatedVPS.success) {
				subscription.planId = new_plan_id;
				subscription.price = new_plan_price;
				subscription.updatedAt = new Date();

				// TODO: Update VPS Configuration

				const updatedSubscription = await subscription.save();

				return res.status(200).json({
					success: true,
					message: `VPS successfully upgraded to ${newPlan.name}.`,
					data: {
						...updatedVPS,
						subscription: updatedSubscription,
						oldPlan: currentPlan,
						newPlan: newPlan,
						price: new_plan_price,
						charged: new_plan_price,
					},
				});
			} else {
				return res
					.status(400)
					.json({ success: false, message: updatedVPS.message });
			}
		} catch (error) {
			console.error("Error upgrading VPS:", error);
			return res.status(500).json({
				success: false,
				message: `Error upgrading VPS: ${error.message}`,
			});
		}
	}
	// static async upgradeVPS(req, res) {
	//     const { vps_id } = req.params;
	//     const { newPlanId } = req.body;

	//     try {
	//         if (!mongoose.Types.ObjectId.isValid(vps_id) || !mongoose.Types.ObjectId.isValid(newPlanId)) {
	//             return res.status(400).json({ success: false, message: 'Invalid VPS ID or Plan ID format.' });
	//         }

	//         // Find the current subscription for the VPS
	//         const subscription = await Subscription.findOne({ vmId: vps_id })
	//             .populate('planId')
	//             .populate('billingCycleId')
	//             .populate('osId')
	//             .populate('vmId')
	//             .populate('diskTypeId')
	//             .populate('cPanelPlanId');

	//         if (!subscription) {
	//             return res.status(404).json({ success: false, message: 'Subscription not found for this VPS.' });
	//         }

	//         const currentPlan = subscription.planId;
	//         if (!currentPlan) {
	//             return res.status(404).json({ success: false, message: 'Current VPS plan details not found.' });
	//         }

	//         // Get the current billing cycle type (e.g., "Monthly", "Quarterly", etc.)
	//         const currentBillingCycleType = subscription?.billingCycleId?.type;

	//         // Extract user and VPS details
	//         const userId = req?.user?._id;
	//         const region = req?.vps?.region;
	//         const diskType = subscription?.diskTypeId?.type;
	//         const preemptible = req?.query?.preemptible || false;
	//         const currentPlanLevel = currentPlan.level;

	//         // Fetch all VPS plans and cost
	//         const vpsPlansWithCosts = await fetchVPSPlansWithCosts({ userId, region, diskType, preemptible });

	//         // Extract OS and cPanel prices
	//         const osPrice = subscription?.osId?.price || 0;
	//         const cPanelPrice = subscription?.cPanelPlanId?.price || 0;

	//         // Find the new plan in the fetched plans
	//         const newPlanWithPricing = vpsPlansWithCosts.find(plan => plan._id.toString() === newPlanId);

	//         // if (!newPlanWithPricing || newPlanWithPricing.level <= currentPlanLevel) {
	//         //     return res.status(400).json({ success: false, message: 'Non-upgradable VPS plan selected.' });
	//         // }

	//         // Find the correct billing cycle
	//         const newBillingCycle = newPlanWithPricing.billingCycles.find(cycle => cycle.type === currentBillingCycleType);

	//         // Calculate the new plan's price including OS and cPanel costs
	//         const newPlanPrice = parseFloat(newBillingCycle.finalPrice) + osPrice + cPanelPrice;

	//         console.log("###subscription.billingCycleId", subscription.billingCycleId)
	//         // Get current plan's already paid amount
	//         const currentPlanPrice = subscription.billingCycleId?.price ? parseFloat(subscription.billingCycleId.price) : 0;

	//         const today = moment();
	//         const startDate = subscription?.cycleStart ? moment(subscription.cycleStart) : moment(subscription.createdAt);
	//         const endDate = moment(subscription.subscriptionEnd);

	//         let proRatedCost = 0;

	//         if (currentBillingCycleType === "Hourly") {

	//             let totalBillingHours = endDate.diff(startDate, 'hours'); // Total billing hours
	//             let remainingHours = endDate.diff(today, 'hours'); // Remaining hours in the cycle

	//             if (remainingHours < 0) remainingHours = 0;
	//             if (totalBillingHours <= 0) {
	//                 proRatedCost = newPlanPrice - currentPlanPrice;
	//             } else {
	//                 proRatedCost = (remainingHours / totalBillingHours) * newPlanPrice - currentPlanPrice;
	//             }
	//         } else {
	//             // If not hourly, calculate based on days
	//             const totalBillingDays = endDate.diff(startDate, 'days'); // Total billing days
	//             const remainingDays = endDate.diff(today, 'days'); // Remaining days in the cycle
	//             console.log("###totalBillingDays", totalBillingDays)
	//             console.log("###remainingDays", remainingDays)
	//             console.log("###newPlanPrice", newPlanPrice)
	//             console.log("###currentPlanPrice", currentPlanPrice)
	//             proRatedCost = (remainingDays / totalBillingDays) * newPlanPrice - currentPlanPrice;
	//             console.log("###result", proRatedCost)
	//         }

	//         // Ensure pro-rated amount is not negative
	//         const finalChargeAmount = Math.max(0, proRatedCost.toFixed(2));

	//         // TODO: Process Payment for finalChargeAmount

	//         // Update Subscription with New Plan & Billing Cycle
	//         console.log("##updated", {
	//             newPlanId,
	//             newPlanPrice,
	//         })
	//         // subscription.planId = newPlanId;
	//         // subscription.price = newPlanPrice;
	//         // subscription.updatedAt = new Date();

	//         // TODO: Update VPS Configuration

	//         const updatedSubscription = await subscription.save();

	//         return res.status(200).json({
	//             success: true,
	//             message: `VPS successfully upgraded to ${newPlanWithPricing.name}.`,
	//             data: {
	//                 subscription: updatedSubscription,
	//                 newPlan: newPlanWithPricing.name,
	//                 proRatedAmount: `$${proRatedCost}`,
	//                 price: newPlanPrice,
	//                 charged: finalChargeAmount,
	//                 billingCycleType: currentBillingCycleType
	//             }
	//         });

	//     } catch (error) {
	//         console.error('Error upgrading VPS:', error);
	//         return res.status(500).json({ success: false, message: `Error upgrading VPS: ${error.message}` });
	//     };

	// }

	// To get upgrade disk options
	static async getUpgradeDiskOptions(req, res) {
		try {
			const { vps_id } = req.params;

			// Validate vps_id
			if (!mongoose.Types.ObjectId.isValid(vps_id)) {
				return res.status(400).json({
					success: false,
					message: "Invalid VPS ID format.",
				});
			}

			// Find the current subscription for the given VPS
			const subscription = await Subscription.findOne({ vmId: vps_id })
				.populate("diskTypeId")
				.populate("vmId")
				.populate("billingCycleId")
				.populate("planId");

			if (!subscription) {
				return res.status(404).json({
					success: false,
					message: "Subscription not found for this VPS.",
				});
			}

			// Extract current disk type details
			const currentDiskType = subscription.diskTypeId;
			if (!currentDiskType) {
				return res.status(404).json({
					success: false,
					message: "Disk type information not found.",
				});
			}

			// Fetch all available disk types
			const allDiskTypes = await VPSDisk.find();

			// Filter upgrade options based on level (only allow disks with a higher level)
			const upgradeOptions = allDiskTypes.filter(
				(disk) => disk.level > currentDiskType.level
			);

			if (upgradeOptions.length === 0) {
				return res.status(200).json({
					success: true,
					message:
						"No higher-level disk types available for upgrade.",
					data: [],
				});
			}

			const diskTypes = allDiskTypes.map((disk) => disk.type);
			const skus = await getDiskCostDetails(diskTypes);

			const billingDurations = {
				Hourly: { duration: "Hour" },
				Monthly: { duration: "Month" },
				Quarterly: { duration: "Quarter" },
				Annually: { duration: "Year" },
			};

			const billingCycleType =
				subscription.billingCycleId.type || "Monthly"; // Default to Monthly
			const { duration } = billingDurations[billingCycleType];

			const currentSkuDisk = skus.find(
				(sku) => subscription.diskTypeId.type === sku.diskType
			);

			// Get the current billing cycle type (e.g., "Monthly", "Quarterly", etc.)
			const currentBillingCycleType = subscription?.billingCycleId?.type;

			const formattedOptions = upgradeOptions.map((disk) => {
				const upgradeSkuDisk = skus.find(
					(sku) => sku.diskType === disk.type
				);

				if (!upgradeSkuDisk) {
					console.warn(
						`No pricing details found for disk type: ${disk.type}`
					);
					return null;
				}

				const newPlanPriceMonthly =
					Number(upgradeSkuDisk.pricePerGBMonthly) *
					Number(subscription?.planId?.specs.disk);
				const newPlanPriceHourly =
					Number(upgradeSkuDisk.pricePerGBHourly) *
					Number(subscription?.planId?.specs.disk);
				const currentPlanPriceMonthly =
					Number(currentSkuDisk.pricePerGBMonthly) *
					Number(subscription?.planId?.specs.disk);
				const currentPriceHourly =
					Number(currentSkuDisk.pricePerGBHourly) *
					Number(subscription?.planId?.specs.disk);
				// Determine base pricing per cycle
				let price = 0;
				console.log("###price", {
					newPlanPriceMonthly,
					currentPlanPriceMonthly,
					newPlanPriceHourly,
					currentPriceHourly,
				});

				// Get Pro-Rated Cost for Hourly Billing
				if (currentBillingCycleType === "Hourly") {
					price = calculateProRatedCost(
						subscription,
						newPlanPriceHourly,
						currentPriceHourly,
						"Hourly"
					);
				} else {
					price = calculateProRatedCost(
						subscription,
						newPlanPriceMonthly,
						currentPlanPriceMonthly,
						"Monthly"
					);
				}

				return {
					id: disk._id,
					type: disk.type,
					label: disk.label,
					description: disk.description,
					level: disk.level,
					from: `${currentDiskType.label} (${currentDiskType.type})`,
					fromType: currentDiskType.type,
					to: `${disk.label} (${disk.type})`,
					toType: disk.type,
					price: price,
					duration: duration,
				};
			});

			return res.status(200).json({
				success: true,
				message:
					"Available disk upgrade options retrieved successfully.",
				data: formattedOptions,
				diskTypes,
			});
		} catch (error) {
			console.error("Error fetching disk upgrade options:", error);
			return res.status(500).json({
				success: false,
				message: `Error fetching disk upgrade options: ${error.message}`,
			});
		}
	}

	// To upgrade the disk
	static async upgradeDisk(req, res) {
		try {
			const { vps_id } = req.params;
			const {
				new_disk_id,
				new_disk_price,
				projectId = "nameword-435507",
			} = req.body;

			// Validate IDs
			if (
				!mongoose.Types.ObjectId.isValid(vps_id) ||
				!mongoose.Types.ObjectId.isValid(new_disk_id)
			) {
				return res.status(400).json({
					success: false,
					message: "Invalid VPS ID or Disk ID format.",
				});
			}

			// Find current subscription
			const subscription = await Subscription.findOne({ vmId: vps_id })
				.populate("planId")
				.populate("billingCycleId")
				.populate("diskTypeId")
				.populate("vmId");

			if (!subscription) {
				return res.status(404).json({
					success: false,
					message: "Subscription not found for this VPS.",
				});
			}

			const currentDisk = subscription?.diskTypeId;
			if (!currentDisk) {
				return res.status(404).json({
					success: false,
					message: "Current disk details not found.",
				});
			}

			// Get current billing cycle type (Hourly, Monthly, etc.)
			const currentBillingCycleType = subscription?.billingCycleId?.type;
			if (!currentBillingCycleType) {
				return res.status(400).json({
					success: false,
					message: "Current billing cycle type not found.",
				});
			}

			// Fetch new disk details
			const newDisk = await VPSDisk.findById(new_disk_id);

			if (!newDisk) {
				return res.status(404).json({
					success: false,
					message: "New disk type not found.",
				});
			}

			// Ensure new disk is an upgrade
			if (newDisk.level <= currentDisk.level) {
				return res.status(400).json({
					success: false,
					message: "Degrading disk is not supported.",
				});
			}

			const updatedDisk = await ComputeEngineController.updateDiskType({
				googleConsoleProjectId: projectId,
				oldVPS: subscription.vmId,
				newDiskType: newDisk.type,
			});
			console.log("##updatedDisk", updatedDisk);
			if (updatedDisk.success) {
				// Update subscription
				subscription.diskTypeId = new_disk_id;
				subscription.price = subscription.price + (new_disk_price || 0);
				subscription.updatedAt = new Date();
				await subscription.save();

				const updatedSubscription = await Subscription.findOne({
					vmId: vps_id,
				})
					.populate("planId")
					.populate("billingCycleId")
					.populate("diskTypeId")
					.populate("vmId");

				return res.status(200).json({
					success: true,
					message: `Disk successfully upgraded to ${newDisk.label}.`,
					data: {
						subscription: updatedSubscription,
						oldDisk: currentDisk,
						charged: new_disk_price,
						...updatedDisk,
						newDisk: updatedSubscription.diskTypeId,
					},
				});
			} else {
				return res
					.status(500)
					.json({ success: false, message: updatedDisk.message });
			}
		} catch (error) {
			console.error("Error upgrading disk:", error);
			return res.status(500).json({
				success: false,
				message: `Error upgrading disk: ${error.message}`,
			});
		}
	}

	// Update a Google Cloud Virtual Machine
	static async updateInstance(req, res) {
		const instancesClient =
			await ComputeEngineController.getInstancesClient();
		const operationsClient =
			await ComputeEngineController.getOperationsClient();
		const disksClient = await ComputeEngineController.getDisksClient();
		const snapshotsClient =
			await ComputeEngineController.getSnapshotsClient();
		const globalOperationsClient =
			await ComputeEngineController.getGlobalOperationsClient();
		const zoneOperationsClient =
			await ComputeEngineController.getZoneOperationsClient();

		const {
			name,
			diskSizeGB,
			sourceImage,
			autoDelete,
			boot,
			diskType,
			machineType,
			networkName,
			googleConsoleProjectId,
			zone,
			projectName,
			labels,
			metadata,
		} = req.body;

		try {
			// Fetch the current instance configuration
			let [currentInstance] = await instancesClient.get({
				project: googleConsoleProjectId,
				zone: zone,
				instance: name,
			});

			const currentDisk = currentInstance.disks[0];

			// Extract the current disk name from the source URL
			const currentDiskName = currentDisk?.source?.split("/").pop() ?? "";

			// Fetch the current disk details
			const [diskDetails] = await disksClient.get({
				project: googleConsoleProjectId,
				zone: zone,
				disk: currentDiskName,
			});

			const currentDiskType = diskDetails.type.split("/").pop();
			const currentDiskSizeGb = parseInt(diskDetails.sizeGb);

			let needsRestart = false;

			const needsDiskMigration = diskType && diskType !== currentDiskType;
			const needsDiskResize =
				diskSizeGB && diskSizeGB > currentDiskSizeGb;
			const needForceResize =
				diskSizeGB && diskSizeGB < currentDiskSizeGb;
			console.log("Resizing disk...");

			console.log("needsDiskResize", needsDiskResize);
			console.log("needsDiskMigration", needsDiskMigration);

			// Resize the disk if diskSizeGB is greater than the current disk size
			if (needsDiskResize) {
				const [resizeOperation] = await disksClient.resize({
					project: googleConsoleProjectId,
					zone: zone,
					disk: currentDiskName,
					disksResizeRequestResource: {
						sizeGb: diskSizeGB,
					},
				});
				currentDisk.diskSizeGb = diskSizeGB;

				// Wait for the resize operation to complete
				let operation = resizeOperation.latestResponse;
				operation = await ComputeEngineController.waitForOperation(
					operationsClient,
					operation,
					googleConsoleProjectId,
					zone
				);

				if (operation.error) {
					return res.status(500).json({
						message: `Error resizing disk: ${operation.error.message}`,
						success: false,
					});
				}

				console.log("Disk resized successfully:", currentDiskName);
			}

			if (needForceResize) {
				console.log("Forcing disk resize...");
				return res
					.status(400)
					.json({ message: "Cannot resize disk to a smaller size" });
			}

			// Stop the instance if disk operation is needed
			if (
				(needsDiskResize || needsDiskMigration) &&
				currentInstance.status === "RUNNING"
			) {
				const [stopVMInstanceOperation] = await instancesClient.stop({
					project: googleConsoleProjectId,
					zone: zone,
					instance: name,
				});
				let operation = stopVMInstanceOperation.latestResponse;
				operation = await ComputeEngineController.waitForOperation(
					operationsClient,
					operation,
					googleConsoleProjectId,
					zone
				);

				console.log("VM INSTANCE STOPPED");
			}

			// Create a snapshot of the current disk if diskType or diskSizeGB has changed
			if (needsDiskResize || needsDiskMigration) {
				let snapshotName;
				let snapshotLink;
				if (needsDiskMigration) {
					snapshotName = `${name}-snapshot-${Date.now()}`;
					const [snapshotOperation] = await snapshotsClient.insert({
						project: googleConsoleProjectId,
						zone: zone,
						snapshotResource: {
							name: snapshotName,
							sourceDisk: currentDisk?.source,
						},
					});
					let operation = snapshotOperation.latestResponse;
					operation = await ComputeEngineController.waitForOperation(
						globalOperationsClient,
						operation,
						googleConsoleProjectId
					);
					snapshotLink = operation.targetLink;
					console.log("Snapshot created:", snapshotName);
				}

				// Insert a new disk with the created snapshot
				let newDiskName;
				if (needsDiskMigration) {
					newDiskName = `${name}-disk-${Date.now()}`;
					const [diskOperation] = await disksClient.insert({
						project: googleConsoleProjectId,
						zone: zone,
						diskResource: {
							name: newDiskName,
							sizeGb: currentDisk?.diskSizeGb,
							type: `zones/${zone}/diskTypes/${diskType}`,
							sourceSnapshot: snapshotLink,
						},
					});
					let operation = diskOperation.latestResponse;
					operation = await ComputeEngineController.waitForOperation(
						operationsClient,
						operation,
						googleConsoleProjectId,
						zone
					);

					console.log("paylaod", {
						source: `projects/${googleConsoleProjectId}/zones/${zone}/disks/${newDiskName}`,
						autoDelete:
							autoDelete !== undefined
								? autoDelete
								: currentDisk?.autoDelete,
						boot: boot !== undefined ? boot : currentDisk?.boot,
						mode: "READ_WRITE", // Ensure the disk is attached in read-write mode
						type: "PERSISTENT", // Ensure the disk type is set to persistent
					});
				}

				// Attach the new disk to the instance
				if (needsDiskMigration) {
					const [attachDiskOperation] =
						await instancesClient.attachDisk({
							project: googleConsoleProjectId,
							zone: zone,
							instance: name,
							attachedDiskResource: {
								boot: !currentDisk?.boot,
								source: `projects/${googleConsoleProjectId}/zones/${zone}/disks/${newDiskName}`,
							},
						});
					let operation = attachDiskOperation.latestResponse;
					operation = await ComputeEngineController.waitForOperation(
						zoneOperationsClient,
						operation,
						googleConsoleProjectId,
						zone
					);

					console.log("New disk attached:", newDiskName);
				}

				// Detach the old disk from the instance
				if (needsDiskMigration) {
					const [detachDiskOperation] =
						await instancesClient.detachDisk({
							project: googleConsoleProjectId,
							zone: zone,
							instance: name,
							deviceName: currentDisk?.deviceName,
						});
					let operation = detachDiskOperation.latestResponse;
					operation = await ComputeEngineController.waitForOperation(
						zoneOperationsClient,
						operation,
						googleConsoleProjectId,
						zone
					);

					console.log("Old disk detached:", currentDisk?.deviceName);

					// Delete the snapshot
					const [deleteSnapshotOperation] =
						await snapshotsClient.delete({
							project: googleConsoleProjectId,
							snapshot: snapshotName,
						});
					operation = deleteSnapshotOperation.latestResponse;
					operation = await ComputeEngineController.waitForOperation(
						globalOperationsClient,
						operation,
						googleConsoleProjectId
					);

					console.log("Snapshot deleted:", snapshotName);

					// Delete the old disk
					const [deleteDiskOperation] = await disksClient.delete({
						project: googleConsoleProjectId,
						zone: zone,
						disk: currentDiskName,
					});
					operation = deleteDiskOperation.latestResponse;
					operation = await ComputeEngineController.waitForOperation(
						zoneOperationsClient,
						operation,
						googleConsoleProjectId,
						zone
					);

					console.log("Old disk deleted:", currentDisk?.deviceName);
				}

				// Get the updated instance
				let [updatedInstance] = await instancesClient.get({
					project: googleConsoleProjectId,
					zone: zone,
					instance: name,
				});
				console.log("Updated instance:", updatedInstance);
				console.log(`VPS ${name} fetched successfully.`);
				currentInstance = { ...updatedInstance };
				needsRestart = true;
			}

			const instanceResource = {
				...currentInstance,
				machineType: `zones/${zone}/machineTypes/${machineType}`,
				networkInterfaces: [{ network: networkName }],
				labels,
				metadata,
			};

			const [response] = await instancesClient.update({
				project: googleConsoleProjectId,
				zone: zone,
				instance: name,
				minimalAction: needsRestart ? "RESTART" : "REFRESH",
				mostDisruptiveAllowedAction: needsRestart
					? "RESTART"
					: "REFRESH",
				instanceResource,
			});

			let operation = response.latestResponse;
			operation = await ComputeEngineController.waitForOperation(
				operationsClient,
				operation,
				googleConsoleProjectId,
				zone
			);

			if (operation.error) {
				return res.status(500).json({
					message: `Error updating VM: ${operation.error.message}`,
					success: false,
				});
			} else {
				// Fetch the updated instance details
				const [updatedInstance] = await instancesClient.get({
					project: googleConsoleProjectId,
					zone: zone,
					instance: name,
				});

				return res.status(200).json({
					message: `VPS ${name} updated successfully.`,
					success: true,
					data: {
						diskSizeGB: updatedInstance.disks[0].diskSizeGb,
						name: updatedInstance.name,
						machineType: updatedInstance.machineType,
						status: updatedInstance.status,
						id: updatedInstance.id,
						zone: updatedInstance.zone,
						networkInterfaces: updatedInstance.networkInterfaces,
						disks: updatedInstance.disks,
						metadata: updatedInstance.metadata,
						tags: updatedInstance.tags,
						selfLink: updatedInstance.selfLink,
					},
				});
			}
		} catch (error) {
			console.error("Error updating VM:", error);
			res.status(500).json({
				message: `Error updating VM: ${error.message}`,
				success: false,
			});
		}
	}

	static async updateDiskType({
		googleConsoleProjectId = "nameword-435507",
		oldVPS,
		newDiskType = "pd-ssd",
	}) {
		const instancesClient =
			await ComputeEngineController.getInstancesClient();
		const operationsClient =
			await ComputeEngineController.getOperationsClient();
		const disksClient = await ComputeEngineController.getDisksClient();
		const globalOperationsClient =
			await ComputeEngineController.getGlobalOperationsClient();
		const snapshotsClient =
			await ComputeEngineController.getSnapshotsClient();
		const zoneOperationsClient =
			await ComputeEngineController.getZoneOperationsClient();

		const zone = oldVPS.zone;
		const vpsName = oldVPS.vps_name;

		let snapshotCreated = false;
		let snapshotName = "";
		let newDiskCreated = false;
		let newDiskName = "";

		try {
			// Step 1: Get current instance details
			let [currentInstance] = await instancesClient.get({
				project: googleConsoleProjectId,
				zone: zone,
				instance: vpsName,
			});

			// Step 2: Extract the boot disk details
			const bootDisk = currentInstance.disks.find((disk) => disk.boot);
			const currentDiskName = bootDisk?.source?.split("/").pop() ?? "";
			console.log("Current Boot Disk Name:", currentDiskName);
			const currentDisk = currentInstance.disks[0];

			// Step 3: Stop the instance before updating the boot disk
			console.log("Stopping VPS instance...");
			const [stopVMInstanceOperation] = await instancesClient.stop({
				project: googleConsoleProjectId,
				zone: zone,
				instance: vpsName,
			});

			let operation = stopVMInstanceOperation.latestResponse;
			operation = await ComputeEngineController.waitForOperation(
				operationsClient,
				operation,
				googleConsoleProjectId,
				zone
			);

			console.log("VM INSTANCE STOPPED");

			// Step 4: Get the current boot disk size
			const [currentDiskDetails] = await disksClient.get({
				project: googleConsoleProjectId,
				zone: zone,
				disk: currentDiskName,
			});
			const currentDiskSize = currentDiskDetails.sizeGb;

			// Step 5: Create a snapshot
			console.log("Creating snapshot for boot disk...");
			let snapshotLink;
			snapshotName = `${vpsName}-boot-disk-snapshot`;
			const [snapshotDetails] = await snapshotsClient.insert({
				project: googleConsoleProjectId,
				zone: zone,
				snapshotResource: {
					name: snapshotName,
					sourceDisk: currentDisk?.source,
				},
			});

			let snapshotOperation = snapshotDetails.latestResponse;
			snapshotOperation = await ComputeEngineController.waitForOperation(
				globalOperationsClient,
				snapshotOperation,
				googleConsoleProjectId
			);
			snapshotCreated = true;
			snapshotLink = snapshotOperation.targetLink;
			console.log("Snapshot created:", snapshotName);

			// Step 6: Create a new disk with the updated type
			console.log(`Creating new disk with type: ${newDiskType} ...`);
			newDiskName = `${vpsName}-new-disk-${Date.now()}`;
			const [newDiskResponse] = await disksClient.insert({
				project: googleConsoleProjectId,
				zone: zone,
				diskResource: {
					name: newDiskName,
					type: `projects/${googleConsoleProjectId}/zones/${zone}/diskTypes/${newDiskType}`,
					sizeGb: currentDiskSize,
					sourceSnapshot: snapshotLink,
				},
			});
			let diskInsertOperation = newDiskResponse.latestResponse;
			diskInsertOperation =
				await ComputeEngineController.waitForOperation(
					operationsClient,
					diskInsertOperation,
					googleConsoleProjectId,
					zone
				);
			newDiskCreated = true;
			console.log("New boot disk created successfully:", newDiskName);

			// Step 7: Detach the old boot disk
			console.log("Detaching old boot disk...");
			const [detachDiskOperation] = await instancesClient.detachDisk({
				project: googleConsoleProjectId,
				zone: zone,
				instance: vpsName,
				deviceName: bootDisk.deviceName,
			});

			operation = detachDiskOperation.latestResponse;
			operation = await ComputeEngineController.waitForOperation(
				zoneOperationsClient,
				operation,
				googleConsoleProjectId,
				zone
			);

			console.log("Old disk detached:", currentDisk?.deviceName);

			// Step 8: Set the new disk as the boot disk
			console.log("Attaching new boot disk...");
			const [attachDiskOperation] = await instancesClient.attachDisk({
				project: googleConsoleProjectId,
				zone: zone,
				instance: vpsName,
				attachedDiskResource: {
					boot: true,
					source: `projects/${googleConsoleProjectId}/zones/${zone}/disks/${newDiskName}`,
				},
			});

			operation = attachDiskOperation.latestResponse;
			operation = await ComputeEngineController.waitForOperation(
				zoneOperationsClient,
				operation,
				googleConsoleProjectId,
				zone
			);

			console.log(`Successfully attached new ${newDiskType} boot disk`);

			// Step 8:  Delete the snapshot
			const [deleteSnapshotOperation] = await snapshotsClient.delete({
				project: googleConsoleProjectId,
				snapshot: snapshotName,
			});
			operation = deleteSnapshotOperation.latestResponse;
			operation = await ComputeEngineController.waitForOperation(
				globalOperationsClient,
				operation,
				googleConsoleProjectId
			);

			console.log("Snapshot deleted:", snapshotName);

			// Step 9: Delete the old boot disk
			console.log("Deleting old boot disk...");
			const [deleteDiskOperation] = await disksClient.delete({
				project: googleConsoleProjectId,
				zone: zone,
				disk: currentDiskName,
			});

			operation = deleteDiskOperation.latestResponse;
			operation = await ComputeEngineController.waitForOperation(
				zoneOperationsClient,
				operation,
				googleConsoleProjectId,
				zone
			);

			console.log(
				`Old boot disk ${currentDiskName} deleted successfully.`
			);

			// Step 10: Restart the VPS instance
			console.log("Restarting VPS instance...");
			const [startInstanceOperation] = await instancesClient.start({
				project: googleConsoleProjectId,
				zone: zone,
				instance: vpsName,
			});

			operation = startInstanceOperation.latestResponse;
			operation = await ComputeEngineController.waitForOperation(
				operationsClient,
				operation,
				googleConsoleProjectId,
				zone
			);

			console.log("VPS Started Successfully");

			return {
				success: true,
				message: `Boot disk updated from pd-standard to ${newDiskType} successfully.`,
				newDisk: newDiskName,
				diskType: newDiskType,
			};
		} catch (error) {
			console.error("Error updating boot disk type:", error);
			try {
				// Cleanup: Delete the new disk if it was created
				if (newDiskCreated) {
					console.log("Rolling back: Deleting newly created disk...");
					await disksClient.delete({
						project: googleConsoleProjectId,
						zone: zone,
						disk: newDiskName,
					});
					console.log(`Rolled back: Deleted new disk ${newDiskName}`);
				}

				// Cleanup: Delete the snapshot if it was created
				if (snapshotCreated) {
					console.log("Rolling back: Deleting snapshot...");
					await snapshotsClient.delete({
						project: googleConsoleProjectId,
						snapshot: snapshotName,
					});
					console.log(
						`Rolled back: Deleted snapshot ${snapshotName}`
					);
				}
			} catch (cleanupError) {
				console.error("Error during cleanup:", cleanupError);
			}

			return {
				success: false,
				message: `Error updating boot disk type: ${error.message}`,
			};
		}
	}

	static async updateVPSConfig({
		googleConsoleProjectId,
		oldVPS,
		newPlan,
		oldPlan,
	}) {
		try {
			const instancesClient =
				await ComputeEngineController.getInstancesClient();
			const operationsClient =
				await ComputeEngineController.getOperationsClient();
			const disksClient = await ComputeEngineController.getDisksClient();

			const zone = oldVPS.zone;
			const instanceName = oldVPS.vps_name;

			console.log("### Updating VPS Config", {
				project: googleConsoleProjectId,
				zone,
				instance: instanceName,
				newConfig: newPlan,
			});

			// Step 1: Stop the instance before updating
			console.log("Stopping VPS instance...");
			const [stopResponse] = await instancesClient.stop({
				project: googleConsoleProjectId,
				zone,
				instance: instanceName,
			});

			let operation = stopResponse.latestResponse;
			await ComputeEngineController.waitForOperation(
				operationsClient,
				operation,
				googleConsoleProjectId,
				zone
			);
			console.log("VM instance stopped");

			// Step 2: Update vCPU & RAM (Machine Type)
			if (
				newPlan?.specs?.machineType &&
				newPlan?.specs?.machineType !== oldPlan?.specs?.machineType
			) {
				console.log(
					`Updating Machine Type to: ${newPlan?.specs?.machineType} ...`
				);
				const [setMachineResponse] =
					await instancesClient.setMachineType({
						project: googleConsoleProjectId,
						zone,
						instance: instanceName,
						instancesSetMachineTypeRequestResource: {
							machineType: `zones/${zone}/machineTypes/${newPlan?.specs?.machineType}`,
						},
					});

				operation = setMachineResponse.latestResponse;
				await ComputeEngineController.waitForOperation(
					operationsClient,
					operation,
					googleConsoleProjectId,
					zone
				);
				console.log(
					`Machine Type updated to: ${newPlan?.specs?.machineType}`
				);
			}

			// Step 3: Update Disk Size (Only Expand, Cannot Shrink)
			if (
				newPlan?.specs?.disk &&
				newPlan?.specs?.disk > oldPlan?.specs?.disk
			) {
				console.log(
					`Expanding disk size to: ${newPlan?.specs?.disk} GB ...`
				);

				// Get boot disk name
				const [instanceDetails] = await instancesClient.get({
					project: googleConsoleProjectId,
					zone,
					instance: instanceName,
				});

				const bootDisk = instanceDetails.disks.find(
					(disk) => disk.boot
				);
				const bootDiskName = bootDisk?.source?.split("/").pop();

				if (bootDiskName) {
					console.log(
						`Updating boot disk ${bootDiskName} to ${newPlan?.specs?.disk} GB ...`
					);
					const [resizeDiskResponse] = await disksClient.resize({
						project: googleConsoleProjectId,
						zone,
						disk: bootDiskName,
						disksResizeRequestResource: {
							sizeGb: newPlan?.specs?.disk,
						},
					});

					operation = resizeDiskResponse.latestResponse;
					await ComputeEngineController.waitForOperation(
						operationsClient,
						operation,
						googleConsoleProjectId,
						zone
					);
					console.log(`Disk ${bootDiskName} resized successfully.`);
				} else {
					console.warn(
						"Boot disk not found, skipping disk size update."
					);
				}
			}

			// Step 4: Restart the VPS instance
			console.log("Restarting VPS instance...");
			const [startInstanceResponse] = await instancesClient.start({
				project: googleConsoleProjectId,
				zone,
				instance: instanceName,
			});

			operation = startInstanceResponse.latestResponse;
			await ComputeEngineController.waitForOperation(
				operationsClient,
				operation,
				googleConsoleProjectId,
				zone
			);
			console.log("VPS Started Successfully");

			return {
				success: true,
				message: `VPS configuration updated successfully.`,
				newMachineType: newPlan?.specs?.machineType,
				newDiskSize: newPlan?.specs?.disk,
			};
		} catch (error) {
			console.error("Error updating VPS configuration:", error);
			return {
				success: false,
				message: `Error updating VPS configuration: ${error.message}`,
			};
		}
	}

	// Update a VM plan details
	static async updateInstancePlanDetails(req, res) {
		const {
			instanceName,
			autoRenewable,
			plan,
			vCPUs,
			RAM,
			disk,
			diskType,
			os,
			cPanel,
			billingCycle,
		} = req.body;

		try {
			const userId = req.user._id;

			// Fetch the VM details using userId and instanceName
			const vm = await VM.findOne({ instanceName, userId });
			if (!vm) {
				return res.status(404).json({
					message: `VM ${instanceName} not found.`,
					success: false,
				});
			}
			// Update fields only if they are provided
			const updates = {};
			if (autoRenewable !== undefined)
				updates.autoRenewable =
					autoRenewable == "false" || autoRenewable == false
						? false
						: true;
			if (plan !== undefined) updates.plan = plan;
			if (vCPUs !== undefined) updates.vCPUs = vCPUs;
			if (RAM !== undefined) updates.RAM = RAM;
			if (disk !== undefined) updates.disk = disk;
			if (diskType !== undefined) updates.diskType = diskType;
			if (os !== undefined) updates.os = os;
			if (cPanel !== undefined) updates.cPanel = cPanel;
			if (billingCycle !== undefined) updates.billingCycle = billingCycle;

			// Update the VM with the new values
			const updatedVM = await VM.findOneAndUpdate(
				{ instanceName, userId },
				{ $set: updates },
				{ new: true }
			);

			res.status(200).json({
				message: `VPS ${instanceName} plan details updated successfully.`,
				success: true,
				data: updatedVM,
			});
		} catch (error) {
			console.error("Error updating VM plan details:", error);
			res.status(500).json({
				message: `Error updating VM plan details: ${error.message}`,
				success: false,
			});
		}
	}

	// Generate VM usage report
	static async generateReport(req, res) {
		const { vmId, projectId, startDateTime, endDateTime } = req.body;
		console.log("req.body", req.body);

		try {
			const monitoringClient =
				await ComputeEngineController.getMonitoringClient(vmId);
			const startTime = new Date(startDateTime).toISOString();
			const endTime = new Date(endDateTime).toISOString();
			const startTimestamp = new Date(startTime).getTime();
			const endTimestamp = new Date(endTime).getTime();
			const timeDifferenceInDays =
				(endTimestamp - startTimestamp) / (24 * 60 * 60 * 1000);
			const alignmentPeriod = timeDifferenceInDays > 1 ? 86400 : 3600;

			const metrics = [
				{
					type: "compute.googleapis.com/instance/cpu/utilization",
					label: "CPU Utilization",
				},
				{
					type: "compute.googleapis.com/instance/disk/write_bytes_count",
					label: "Disk Write Bytes",
				},
				{
					type: "compute.googleapis.com/instance/disk/read_bytes_count",
					label: "Disk Read Bytes",
				},
				{
					type: "compute.googleapis.com/instance/network/received_bytes_count",
					label: "Network Received Bytes",
				},
				{
					type: "compute.googleapis.com/instance/network/sent_bytes_count",
					label: "Network Sent Bytes",
				},
			];

			const allMetricsData = await Promise.all(
				metrics.map(async (metric) => {
					const request = {
						name: monitoringClient.projectPath(projectId),
						filter: `metric.type = "${metric.type}" AND metric.labels.instance_name = "${vmId}"`,
						interval: {
							startTime: { seconds: startTimestamp / 1000 },
							endTime: { seconds: endTimestamp / 1000 },
						},
						aggregation: {
							alignmentPeriod: {
								seconds: alignmentPeriod,
							},
							perSeriesAligner: "ALIGN_MEAN",
						},
						view: "FULL",
					};

					const [timeSeries] = await monitoringClient.listTimeSeries(
						request
					);
					if (!timeSeries || timeSeries.length === 0)
						return { label: metric.label, data: [] };

					const formattedData = timeSeries
						.map((series) => {
							return series.points.map((point) => ({
								timestamp: new Date(
									point.interval.startTime.seconds * 1000
								).toISOString(),
								value: metric.type.includes("utilization")
									? `${(
											point.value.doubleValue * 100
									  ).toFixed(2)}%`
									: `${(
											point.value.doubleValue /
											(1024 * 1024)
									  ).toFixed(2)} MB`,
							}));
						})
						.flat();

					return { label: metric.label, data: formattedData };
				})
			);

			if (allMetricsData.every((metric) => metric.data.length === 0)) {
				return res.status(404).json({
					success: false,
					message: `No usage data found for VM ${vmId} in the specified time range.`,
				});
			}

			// Group data by date
			const groupedData = {};
			allMetricsData.forEach((metric) => {
				metric.data.forEach((entry) => {
					const formattedDate = new Date(
						entry.timestamp
					).toLocaleDateString("en-GB"); // Format as DD/MM/YYYY
					if (!groupedData[formattedDate]) {
						groupedData[formattedDate] = { Date: formattedDate };
					}
					groupedData[formattedDate][metric.label] = entry.value;
				});
			});

			// Convert grouped data to table rows
			const rows = Object.values(groupedData);

			// Generate PDF with jsPDF
			const doc = new jsPDF();
			doc.setFontSize(18);
			doc.text(
				`Average Daily Usage Report for VM: ${vmId.toUpperCase()}`,
				14,
				20
			);
			doc.setFontSize(12);

			// Add table headers
			const headers = ["Date", ...metrics.map((metric) => metric.label)];

			// Add table to PDF using autoTable
			doc.autoTable({
				head: [headers],
				body: rows.map((row) =>
					headers.map((header) => row[header] || "N/A")
				),
				startY: 30,
			});

			// Ensure the reports directory exists
			const reportsDir = path.join(__dirname, "reports");
			if (!fs.existsSync(reportsDir)) {
				fs.mkdirSync(reportsDir, { recursive: true });
			}

			// Save PDF as a file
			const pdfPath = path.join(reportsDir, `usage_report_${vmId}.pdf`);
			doc.save(pdfPath);

			// Read the PDF file and send it to the frontend
			const pdfData = fs.readFileSync(pdfPath);
			res.setHeader("Content-Type", "application/pdf");
			res.setHeader(
				"Content-Disposition",
				`attachment; filename=usage_report_${vmId}.pdf`
			);
			res.send(pdfData);

			// Delete the PDF file from the reports folder
			fs.unlinkSync(pdfPath);
		} catch (error) {
			console.log("error", error);
			res.status(500).json({
				message: `Error generating report: ${error.message}`,
				success: false,
			});
		}
	}

	static getRegionGroupAndLabel = (regionName) => {
		// Load region details from JSON file
		const regionDetailsPath = path.join(
			__dirname,
			"../../../config/regionDetails.json"
		);
		const regionDetails = JSON.parse(
			fs.readFileSync(regionDetailsPath, "utf8")
		);

		const formattedName = regionName
			.replace(/-/g, " ")
			.replace(/(north|east|south|west|central)/gi, " $1 ")
			.replace(/\s+/g, " ")
			.trim()
			.toUpperCase();

		const label = `${formattedName} (${
			regionDetails[regionName] || "Unknown"
		})`;

		if (/^us|southamerica/.test(regionName)) {
			return ["America", label];
		} else if (/^europe/.test(regionName)) {
			return ["Europe", label];
		} else if (/^asia/.test(regionName)) {
			return ["Asia-Pacific", label];
		} else if (/^australia/.test(regionName)) {
			return ["Australia", label];
		} else if (/^me/.test(regionName)) {
			return ["Middle East", label];
		} else if (/^africa/.test(regionName)) {
			return ["Africa", label];
		}
		return [null, null];
	};
	// Get a list of areas
	static async getAreas(req, res) {
		const regionClient = await ComputeEngineController.getRegionClient();
		const { projectId } = req.query;
		console.log("###projectId", projectId);
		try {
			const [regions] = await regionClient.list({
				project: projectId,
			});

			const groupedRegions = {
				America: [],
				Europe: [],
				"Asia-Pacific": [],
				Australia: [],
				"Middle East": [],
				Africa: [],
			};

			regions.forEach((region) => {
				const [group, label] =
					ComputeEngineController.getRegionGroupAndLabel(region.name);
				if (group) {
					groupedRegions[group].push({
						value: region.name,
						label: label,
					});
				}
			});

			const formattedRegions = Object.keys(groupedRegions).map(
				(region) => {
					const details = groupedRegions[region];
					const regionList = details.map((detail) => ({
						value: detail.value,
						label: detail.label,
					}));
					return {
						area: region,
						regionList: regionList,
					};
				}
			);

			res.status(200).json({
				data: formattedRegions,
				success: true,
				message: "Areas listed successfully.",
			});
		} catch (error) {
			res.status(500).json({
				message: `Error listing regions: ${error.message}`,
				success: false,
			});
		}
	}
	// Get a list of regions
	static async getRegions(req, res) {
		const regionClient = await ComputeEngineController.getRegionClient();
		const { projectId, area } = req.query;

		try {
			const [regions] = await regionClient.list({
				project: projectId,
			});

			const groupedRegions = {
				America: [],
				Europe: [],
				"Asia-Pacific": [],
				Australia: [],
				"Middle East": [],
				Africa: [],
			};

			regions.forEach((region) => {
				const [group, label] =
					ComputeEngineController.getRegionGroupAndLabel(region.name);
				if (group) {
					groupedRegions[group].push({
						value: region.name,
						label: label,
						description: region.description,
						status: region.status,
						zones: region.zones,
					});
				}
			});

			const regionsInAreas = groupedRegions[area];

			res.status(200).json({
				data: regionsInAreas,
				success: true,
				message: "Regions listed successfully.",
			});
		} catch (error) {
			res.status(500).json({
				message: `Error listing regions: ${error.message}`,
				success: false,
			});
		}
	}

	// Get a list of zones
	static async getZones(req, res) {
		const zoneClient = await ComputeEngineController.getZoneClient();
		const { projectId, region } = req.query;

		try {
			const [zones] = await zoneClient.list({
				project: projectId,
			});

			const filteredZones = zones.filter((zone) =>
				zone.region.endsWith(region)
			);

			const zonesList = filteredZones.map((zone) => {
				// Format the name to a more user-friendly format
				const formattedName = zone.name
					.replace(/-/g, " ")
					.toUpperCase();
				return {
					label: formattedName + ` (${zone.name})`,
					name: zone.name,
					description: zone.description,
					status: zone.status,
					region: zone.region,
				};
			});

			res.status(200).json({
				data: zonesList,
				success: true,
				message: "Zones listed successfully.",
			});
		} catch (error) {
			res.status(500).json({
				message: `Error listing zones: ${error.message}`,
				success: false,
			});
		}
	}

	// Get a cost of VM instance
	static async getVMCost(req, res) {
		const {
			memoryGb = 15,
			vcpuCount = 4,
			region,
			diskSizeGb,
			diskType,
			preemptible = "false",
		} = req.query;

		try {
			// Call the getVMCostDetails function to get the cost
			const costDetails = await getVMCostDetails({
				memoryGb,
				vcpuCount,
				region,
				diskSizeGb,
				diskType,
				preemptible,
			});

			if (!costDetails.success) {
				return res
					.status(500)
					.json({ success: false, message: costDetails.message });
			}

			// Send the cost details to the frontend
			res.status(200).json({ success: true, data: costDetails.data });
		} catch (error) {
			console.error("Error fetching VM cost:", error.message);
			res.status(500).json({ success: false, message: error.message });
		}
	}
	// static async getVMCost(req, res) {
	//     let { memoryGb = 15, vcpuCount = 4, region, diskSizeGb, diskType, preemptible = 'false' } = req.query;

	//     try {

	//         const billingClient = new CloudCatalogClient({
	//             keyFilename: path.join(__dirname, '../../../config/service-account.json')
	//         });
	//         const iterable = billingClient.listSkusAsync({
	//             parent: "services/6F81-5844-456A",
	//             currencyCode: "USD",

	//         });
	//         const skus = [];

	//         for await (const response of iterable) {
	//             skus.push(response);
	//         }

	//         const regionalSkus = skus.filter(sku => sku.serviceRegions.includes(region));

	//         let totalCost = 0;

	//         const isPreemiptible = preemptible === 'true' ? true : false;

	//         // Calculate vCPU cost
	//         const vcpuSku = regionalSkus.find(sku =>
	//             sku.description.includes('VCPU') &&
	//             sku.category.usageType === (isPreemiptible ? 'Preemptible' : 'OnDemand')
	//         );

	//         if (vcpuSku) {
	//             const vcpuPrice =
	//                 vcpuSku.pricingInfo[0].pricingExpression.tieredRates[0].unitPrice.nanos / 1e9;

	//             totalCost += vcpuPrice * vcpuCount * 730;
	//         }

	//         // Calculate RAM cost
	//         const ramSku = regionalSkus.find(sku =>
	//             sku.category.resourceGroup === 'RAM' &&
	//             sku.category.usageType === (isPreemiptible ? 'Preemptible' : 'OnDemand')
	//         );

	//         if (ramSku) {
	//             const ramPrice =
	//                 ramSku.pricingInfo[0].pricingExpression.tieredRates[0].unitPrice.nanos / 1e9;
	//             totalCost += ramPrice * memoryGb * 730;
	//         }

	//         // Determine the resource group based on disk type
	//         let diskResourceGroup;
	//         if (diskType === 'pd-standard') {
	//             diskResourceGroup = 'PDStandard';
	//         } else if (diskType === 'pd-balanced') {
	//             diskResourceGroup = 'HDBSP';
	//         } else {
	//             diskResourceGroup = 'SSD';
	//         }

	//         // Calculate Disk cost
	//         const diskSku = regionalSkus.find(sku =>
	//             sku.category.resourceFamily === 'Storage' && sku.category.usageType === (isPreemiptible ? 'Preemptible' : 'OnDemand')
	//             && sku.category.resourceGroup === diskResourceGroup
	//         );

	//         if (diskSku) {
	//             const pricingExpression = diskSku.pricingInfo[0].pricingExpression;
	//             const tieredRates = pricingExpression.tieredRates;
	//             let diskPrice = 0;

	//             // Calculate the disk price based on tiered rates
	//             for (const tier of tieredRates) {
	//                 const unitPrice = tier.unitPrice.nanos / 1e9;
	//                 diskPrice += unitPrice * diskSizeGb
	//             }
	//             totalCost += diskPrice;
	//         }

	//         const totalCostInHour = (totalCost / 730).toFixed(2);

	//         const totalCostInMonth = totalCost.toFixed(2);

	//         res.status(200).send({ data: { totalCostInHour, totalCostInMonth, currency: "USD" }, success: true, message: 'Pricing information fetched successfully.' });

	//     } catch (error) {
	//         console.error('Error estimating VM cost:', error.message);
	//         res.status(500).send({ message: `Error fetching pricing information: ${error.message}`, success: false });

	//     }
	// }

	// To Get a list of Cpanel Options for VM
	static async getcPanelOptions(req, res) {
		try {
			// Fetch unique control panel types from the database
			const uniqueControlPanels = await CPanelPlan.distinct("type", {
				enabled: true,
			});

			return res.status(200).json({
				success: true,
				data: uniqueControlPanels,
			});
		} catch (error) {
			return res.status(500).json({
				error: "Failed to fetch control panel options",
				message: error.message,
			});
		}
	}

	// To Get a WHM License or trial version
	static async getWHMOptions(req, res) {
		try {
			// Fetch all enabled WHM plans
			const whmPlans = await CPanelPlan.find({
				type: "WHM",
				enabled: true,
			});

			// Format the response
			const formattedWHMPlans = whmPlans.map((plan, index) => {
				const accountInfo =
					plan.price !== 0
						? `Up to ${
								plan.maxAccounts === 100
									? "100+"
									: plan.maxAccounts
						  } accounts`
						: "";
				const trialInfo =
					plan.price === 0 ? `(${plan.durationValue} days)` : "";

				const label =
					`${trialInfo} ${accountInfo} ($${plan.price}/${plan.billingDuration})`
						.replace(/\s+/g, " ") // Remove extra spaces
						.trim();

				return {
					_id: plan._id,
					id: plan.id,
					name: plan.name,
					label: label,
					price: plan.price,
					type: plan.type,
					tier: plan.tier,
					maxAccounts: plan.maxAccounts,
					billingDuration: plan.billingDuration,
					durationValue: plan.durationValue,
					enabled: plan.enabled,
				};
			});

			return res.status(200).json({
				success: true,
				data: formattedWHMPlans,
			});
		} catch (error) {
			console.error("Error fetching WHM options:", error);
			res.status(500).json({ message: "Error fetching WHM options" });
		}
	}

	// To Get a Plesk License or trial version
	static async getPleskOptions(req, res) {
		try {
			// Fetch all enabled Plesk plans
			const pleskPlans = await CPanelPlan.find({
				type: "Plesk",
				enabled: true,
			});
			const formattedPleskPlans = pleskPlans.map((plan, index) => {
				const domainInfo =
					plan.price !== 0
						? `– ${plan.maxDomains} domains ($${plan.price}/${plan.billingDuration})`
						: "";
				const trialInfo =
					plan.price === 0 ? `(${plan.durationValue} days)` : ""; // Display trial duration if price is 0

				const label = `${index + 1}️. ${
					plan.name
				} ${trialInfo} ${domainInfo}`
					.replace(/\s+/g, " ") // Remove extra spaces
					.trim();

				return {
					_id: plan._id,
					id: plan.id,
					name: plan.name,
					label: label,
					price: plan.price,
					type: plan.type,
					tier: plan.tier,
					maxDomains: plan.maxDomains,
					billingDuration: plan.billingDuration,
					durationValue: plan.durationValue,
					enabled: plan.enabled,
				};
			});

			return res.status(200).json({
				success: true,
				data: formattedPleskPlans,
			});
		} catch (error) {
			console.error("Error fetching Plesk options:", error);
			return res
				.status(500)
				.json({ message: "Error fetching Plesk options" });
		}
	}
}

module.exports = ComputeEngineController;
