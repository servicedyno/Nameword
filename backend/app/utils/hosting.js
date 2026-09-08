const axios = require("axios");
const winston = require("winston");
const Cloudflare = require("cloudflare");
const fs = require("fs");
const transporter = require("../services/mailer");
const nunjucks = require("nunjucks");
const env = require("../../start/env");

const User = require("../models/User");
const Domain = require("../models/Domain");
const CpanelAccount = require("../models/hosting/CpanelAccount");
const PleskAccount = require("../models/hosting/PleskAccount");
const RewardPointLog = require("../models/RewardPointLog");
const MembershipTier = require("../models/MembershipTier");

const cloudflareHelper = require("../helpers/cloudflareHelper");
const apiClient = require("./apiclient");
const pleskApi = require("../utils/pleskApiClient");
const { generatePassword } = require("./common");
const domainProviderApiClient = require("./domainProviderApiClient");

const CR_CUSTOMER_ID = process.env.CR_CUSTOMER_ID;

const axiosInstance = axios.create({
	baseURL: process.env.WHM_SERVER_URL,
	headers: {
		Authorization: `whm ${process.env.WHM_USERNAME}:${process.env.WHM_API_KEY}`,
	},
});

const cloudflare = new Cloudflare({
	apiEmail: process.env.CLOUDFLARE_EMAIL,
	apiKey: process.env.CLOUDFLARE_API_KEY,
});

module.exports.createUserAccount = async (
	name,
	email,
	password,
	telegramId
) => {
	const user = new User({
		name: name,
		password: password,
		telegramId: telegramId,
	});
	const newTier = await MembershipTier.findOne({ name: "Starter" });
	user.membershipTier = newTier._id;
	await user.save();

	return user;
};

module.exports.createCpanelAccount = async (
	user,
	domain,
	telegramId,
	password,
	plan
) => {
	try {
		let account, message;

		// Add random string to username
		const username =
			"u" + telegramId + Math.random().toString(36).substring(2, 7);

		const whmResponse = await axiosInstance.get(
			`/json-api/createacct?api.version=1&domain=${domain}&username=${username}&password=${password}&plan=${plan}`
		);
		if (whmResponse.data.metadata.result === 1) {
			const cpanelAccount = new CpanelAccount({
				user: user._id,
				domain: null,
				username: username,
				plan: plan,
			});
			await cpanelAccount.save();
			account = cpanelAccount;
			message = "Cpanel created successfully";
		} else {
			account = null;
			message = "WHM: " + whmResponse.data.metadata.reason;
			console.log(whmResponse);
		}

		return { account, message };
	} catch (error) {
		console.log(error.message);
		return {
			account: null,
			message: "WHM ERROR: " + error.message,
		};
	}
};

module.exports.deleteCpanelAccount = async (cpanelAccount) => {
	if (cpanelAccount) {
		// Get account info before deletion for email
		const accountInfo = await CpanelAccount.findById(cpanelAccount._id).populate('user');
		const planName = accountInfo?.plan || 'Hosting';
		
		await axiosInstance.get(
			`/json-api/removeacct?api.version=1&username=${cpanelAccount.username}`
		);
		await CpanelAccount.findByIdAndDelete(cpanelAccount._id);
		
		// Send hosting deleted email
		if (accountInfo && accountInfo.user && accountInfo.user.email) {
			try {
				const { shouldSendEmail } = require("./notificationHelper");
				const canSendEmail = await shouldSendEmail(accountInfo.user, 'serviceStatusAndChanges');
				if (canSendEmail) {
					let html = nunjucks.render('mails/hosting_deleted.html', {
						NAME: accountInfo.user.name || accountInfo.user.email,
						PLAN_NAME: planName,
						viewHostingPlansLink: env.FRONTEND_URL + '/hosting',
						logoUrl: env.FRONTEND_URL
					});
					
					await transporter.sendMail({
						from: process.env.MAIL_FROM_ADDRESS,
						to: accountInfo.user.email,
						subject: 'Hosting account deleted',
						html: html,
					});
					
					console.log(`Hosting deleted email sent to ${accountInfo.user.email} for ${planName}`);
				}
			} catch (emailError) {
				console.error("Error sending hosting deleted email:", emailError);
			}
		}
	}
};

module.exports.registerDomain = async (
	user,
	websiteName,
	price,
	nameservers,
	provider
) => {
	try {
		let domain, message;

		//change
		const response = await domainProviderApiClient.request(
			"domainorder",
			{
				ProductType: 1,
				Websitename: websiteName,
				Duration: 1,
				IsWhoisProtection: true,
				ns1: nameservers.ns1,
				ns2: nameservers.ns2,
				Id: CR_CUSTOMER_ID,
				provider: provider,
				handle: "JC960450-US",
				isEnablePremium: 0,
			},
			null,
			provider
		);

		if (response?.responseMsg?.statusCode === 200) {
			//change
			const domainResponse = await domainProviderApiClient.request("ViewDomain", {
				websiteName,
				domainId:
					response.responseData?.domainCreateResponse?.domainId ||
					null,
				
			},
			null,
			provider
		);

			domain = new Domain({
				user: user._id,
				domainNameId: domainResponse.responseData.domainNameId,
				customerId: domainResponse.responseData.customerId,
				websiteName: domainResponse.responseData.websiteName,
				orderDate: domainResponse.responseData.orderDate,
				expirationDate: domainResponse.responseData.expirationDate,
				price: price,
			});
			await domain.save();

			message = "Domain registration successful";
		} else {
			domain = null;
			message = "CR: " + response?.responseMsg?.message;
		}
		return { domain, message };
	} catch (error) {
		console.log(error.message);
		return {
			domain: null,
			message: "CR ERROR: " + error.message,
		};
	}
};

module.exports.deleteDomain = async (domain) => {
	if (domain) Domain.findByIdAndDelete(domain._id);
};

module.exports.createRewardLog = async (user, domainPrice) => {
	let earnRate = user.membershipTier?.benefits?.earnRate;
	if (!earnRate) earnRate = 1;
	const rewardLog = new RewardPointLog({
		userId: user._id,
		rewardPoints: (domainPrice.price * earnRate).toFixed(2),
		operationType: "credit",
	});
	await rewardLog.save();

	return rewardLog;
};

module.exports.deleteRewardLog = async (rewardLog) => {
	if (rewardLog) await RewardPointLog.findByIdAndDelete(rewardLog._id);
};

module.exports.generatePassword = async () => {
	let password;
	const requiredStrength = 40;
	let currentStrength = 0;

	while (currentStrength < requiredStrength) {
		password = generatePassword();
		try {
			const res = await axiosInstance.get(
				`/json-api/get_password_strength?api.version=1&password=${password}`
			);
			currentStrength = res.data.strength;
		} catch (error) {
			winston.error("Error generating password:", error.message);
		}
	}

	return password;
};

module.exports.createCloudflareRuleset = async (zoneId) => {
	try {
		await cloudflare.rulesets.create({
			zone_id: zoneId,
			phase: "http_request_firewall_custom",
			kind: "zone",
			name: "PrivHost Enhanced Security Ruleset",
			description:
				"Ruleset to enhance security by filtering high-threat traffic, bots, and certain data center IPs.",
			rules: [
				{
					action: "block",
					description: "Block IPs with high threat scores (over 50)",
					enabled: true,
					expression: "cf.threat_score gt 50",
				},
				{
					action: "block",
					description: "Block traffic from known bot sources",
					enabled: true,
					expression: "cf.client.bot",
				},
				{
					action: "block",
					description: "Block traffic from data center IPs (ASNs)",
					enabled: true,
					expression:
						"ip.geoip.asnum in {16509 14618 7224 15169 8075 8068 12076 14061 393406 63949 20473 16276 35540 24940 45102 37963 10532 36351 27257 31898 20773 16265 12876 54113 20940 15133 54825}",
				},
			],
		});
	} catch (error) {
		console.error("Error creating ruleset:", error);
		winston.error(
			"Error creating ruleset:",
			cloudflareHelper.getErrorMessage(error)
		);
	}
};

module.exports.createPleskAccount = async (
	user,
	email,
	domain,
	username,
	password,
	plan
) => {
	try {
		let account, message;

		const customerPacket = {
			packet: {
				customer: {
					add: {
						gen_info: {
							pname: user.name || username,
							login: username,
							passwd: password,
							status: 0,
							email: email,
						},
					},
				},
			},
		};

		const customerResponse = await pleskApi.request(customerPacket);
		if (customerResponse.packet.system?.status === "error") {
			return {
				success: false,
				message: customerResponse.packet.system.errtext,
			};
		}

		const customerData =
			customerResponse?.packet?.customer?.add?.result || {};

		// Check if customer creation was successful
		if (customerData.status === "ok") {
			// Packet to create subscription
			const subscriptionPacket = {
				packet: {
					webspace: {
						add: {
							gen_setup: {
								name: domain,
								"owner-id": customerData.id,
								ip_address: process.env.PLESK_SERVER_IP,
							},
							hosting: {
								vrt_hst: {
									property: [
										{ name: "ftp_login", value: username },
										{
											name: "ftp_password",
											value: password,
										},
									],
								},
							},
							"plan-name": plan,
						},
					},
				},
			};

			// Create subscription for the customer
			const subscriptionResponse = await pleskApi.request(
				subscriptionPacket
			);
			if (subscriptionResponse.packet.system?.status === "error") {
				return {
					success: false,
					message: subscriptionResponse.packet.system.errtext,
				};
			}

			const subscriptionData =
				subscriptionResponse?.packet?.webspace?.add?.result || {};

			if (subscriptionData.status === "ok") {
				const pleskAccount = new PleskAccount({
					pleskId: customerData.id,
					pleskGuid: customerData.guid,
					subscriptionId: subscriptionData.id,
					subscriptionGuid: subscriptionData.guid,
					user: user._id,
					domain: null,
					username: username,
					plan: plan,
				});
				await pleskAccount.save();

				account = pleskAccount;
				message = "Plesk account and subscription created successfully";
			} else {
				// Delete customer if subscription creation failed
				const deleteCustomer = {
					packet: {
						customer: {
							del: {
								filter: {
									id: customerData.id,
								},
							},
						},
					},
				};
				await pleskApi.request(deleteCustomer);

				account = null;
				message = `Plesk Subscription Error: ${subscriptionData.errcode} | ${subscriptionData.errtext}`;
			}
		} else {
			account = null;
			message = `Plesk Customer Error: ${customerData.errcode} | ${customerData.errtext}`;
		}

		return { account, message };
	} catch (error) {
		console.log(error.message);
		return {
			account: null,
			message: "PLESK ERROR: " + error.message,
		};
	}
};

module.exports.updatePleskAccountStatus = async (
	pleskAccount,
	suspend,
	description
) => {
	if (pleskAccount) {
		const packet = {
			packet: {
				customer: {
					set: {
						filter: {
							id: pleskAccount.pleskId,
						},
						values: {
							gen_info: {
								status: suspend ? 16 : 0,
								description: description,
							},
						},
					},
				},
			},
		};

		const response = await pleskApi.request(packet);
		if (response.packet.system?.status === "error") {
			return {
				success: false,
				message: response.packet.system.errtext,
			};
		}

		const data = response.packet.customer.set.result;

		if (data.status === "ok") {
			pleskAccount.status = "suspended";
			await pleskAccount.save();

			const status = suspend ? "suspended" : "unsuspended";

			return {
				success: true,
				message: `Plesk account ${status} successfully`,
			};
		} else {
			return {
				success: false,
				message: "Error suspending account: " + data.errtext,
			};
		}
	}

	return {
		success: false,
		message: "Plesk account not found",
	};
};

module.exports.changePleskAccountPlan = async (pleskAccount, plan) => {
	if (pleskAccount) {
		const packet = {
			packet: {
				webspace: {
					"switch-subscription": {
						filter: {
							id: pleskAccount.subscriptionId,
						},
						"plan-guid": "",
					},
				},
			},
		};

		const response = await pleskApi.request(packet);
		if (response.packet.system?.status === "error") {
			return {
				success: false,
				message: response.packet.system.errtext,
			};
		}

		const data = response.packet.webspace["switch-subscription"].result;

		if (data.status === "ok") {
			pleskAccount.plan = plan;
			await pleskAccount.save();

			return {
				success: true,
				message: "Plan updated successfully",
			};
		} else {
			return {
				success: false,
				message: "Error updating plan: " + data.errtext,
			};
		}
	}

	return {
		success: false,
		message: "Plesk account not found",
	};
};

module.exports.changePleskAccountPassword = async (pleskAccount, password) => {
	if (pleskAccount) {
		const packet = {
			packet: {
				customer: {
					set: {
						filter: {
							id: pleskAccount.pleskId,
						},
						values: {
							gen_info: {
								passwd: password,
							},
						},
					},
				},
			},
		};

		const response = await pleskApi.request(packet);
		if (response.packet.system?.status === "error") {
			return {
				success: false,
				message: response.packet.system.errtext,
			};
		}

		const data = response.packet.customer.set.result;

		if (data.status === "ok") {
			return {
				success: true,
				message: "Password updated successfully",
			};
		} else {
			return {
				success: false,
				message: "Error updating password: " + data.errtext,
			};
		}
	}

	return {
		success: false,
		message: "Plesk account not found",
	};
};

module.exports.deletePleskAccount = async (
	pleskAccount,
	softDelete = false
) => {
	if (pleskAccount) {
		const packet = {
			packet: {
				customer: {
					del: {
						filter: {
							id: pleskAccount.pleskId,
						},
					},
				},
			},
		};

		const response = await pleskApi.request(packet);
		if (response.packet.system?.status === "error") {
			return {
				success: false,
				message: response.packet.system.errtext,
			};
		}

		const data = response.packet.customer.del.result;

		if (data.status === "ok") {
			const userId = pleskAccount.user;
			const user = await User.findById(userId);
			user.pleskAccounts = user.pleskAccounts.filter(
				(id) => id.toString() !== pleskAccount._id
			);
			await user.save();

			const account = await PleskAccount.findById(pleskAccount._id);
			const planName = account?.plan || 'Hosting';

			// Send hosting deleted email before deletion
			if (user && user.email) {
				try {
					const { shouldSendEmail } = require("./notificationHelper");
					const canSendEmail = await shouldSendEmail(user, 'serviceStatusAndChanges');
					if (canSendEmail) {
						let html = nunjucks.render('mails/hosting_deleted.html', {
							NAME: user.name || user.email,
							PLAN_NAME: planName,
							viewHostingPlansLink: env.FRONTEND_URL + '/hosting',
							logoUrl: env.FRONTEND_URL
						});
						
						await transporter.sendMail({
							from: process.env.MAIL_FROM_ADDRESS,
							to: user.email,
							subject: 'Hosting account deleted',
							html: html,
						});
						
						console.log(`Hosting deleted email sent to ${user.email} for ${planName}`);
					}
				} catch (emailError) {
					console.error("Error sending hosting deleted email:", emailError);
				}
			}

			if (softDelete) {
				await account.softDelete();
			} else {
				await account.deleteOne();
			}

			return {
				success: true,
				message: "Plesk account deleted successfully",
			};
		} else {
			return {
				success: false,
				message: "Error deleting account: " + data.errtext,
			};
		}
	}
};

module.exports.showPleskPlans = async () => {
	const packet = {
		packet: {
			"service-plan": {
				get: {
					filter: {},
				},
			},
		},
	};

	const response = await pleskApi.request(packet);
	if (response.packet.system?.status === "error") {
		return {
			success: false,
			message: response.packet.system.errtext,
		};
	}

	const data = response.packet["service-plan"].get.result;

	if (Array.isArray(data)) {
		return {
			success: true,
			data: data,
		};
	} else {
		return {
			success: false,
			message: "Error fetching plans: " + data.errtext,
		};
	}
};

module.exports.createPleskPlan = async (
	planName,
	quota,
	bwlimit,
	maxaddon,
	maxpop,
	maxsql
) => {
	const packet = {
		packet: {
			"service-plan": {
				add: {
					name: planName,
					limits: {
						limit: [
							{
								name: "disk_space",
								value: quota * 1024 * 1024,
							},
							{
								name: "max_traffic",
								value: bwlimit * 1024 * 1024,
							},
							{
								name: "max_site",
								value: maxaddon,
							},
							{
								name: "max_box",
								value: maxpop,
							},
							{
								name: "max_db",
								value: maxsql,
							},
						],
					},
				},
			},
		},
	};

	const response = await pleskApi.request(packet);
	if (response.packet.system?.status === "error") {
		return {
			success: false,
			message: response.packet.system.errtext,
		};
	}

	const data = response.packet["service-plan"].add.result;

	if (data.status === "ok") {
		return {
			success: true,
			message: "Plan created successfully",
		};
	} else {
		return {
			success: false,
			message: "Error creating plan: " + data.errtext,
		};
	}
};

module.exports.showPleskPlan = async (planName) => {
	const packet = {
		packet: {
			"service-plan": {
				get: {
					filter: {
						name: planName,
					},
				},
			},
		},
	};

	const response = await pleskApi.request(packet);
	if (response.packet.system?.status === "error") {
		return {
			success: false,
			message: response.packet.system.errtext,
		};
	}

	const data = response.packet["service-plan"].get.result;

	if (data.status === "ok") {
		return {
			success: true,
			data: data,
		};
	} else {
		return {
			success: false,
			message: "Error fetching plan: " + data.errtext,
		};
	}
};

module.exports.updatePleskPlan = async (
	planName,
	quota,
	bwlimit,
	maxaddon,
	maxpop,
	maxsql
) => {
	const {
		success,
		message,
		data: planDetails,
	} = await module.exports.showPleskPlan(planName);

	if (!success) {
		return {
			success: false,
			message: message,
		};
	}

	const packet = {
		packet: {
			"service-plan": {
				set: {
					filter: {
						id: planDetails.id,
					},
					limits: {
						limit: [
							{
								name: "disk_space",
								value: quota * 1024 * 1024,
							},
							{
								name: "max_traffic",
								value: bwlimit * 1024 * 1024,
							},
							{
								name: "max_site",
								value: maxaddon,
							},
							{
								name: "max_box",
								value: maxpop,
							},
							{
								name: "max_db",
								value: maxsql,
							},
						],
					},
				},
			},
		},
	};

	const response = await pleskApi.request(packet);
	if (response.packet.system?.status === "error") {
		return {
			success: false,
			message: response.packet.system.errtext,
		};
	}

	const data = response.packet["service-plan"].set.result;

	if (data.status === "ok") {
		return {
			success: true,
			message: "Plan updated successfully",
		};
	} else {
		return {
			success: false,
			message: "Error updating plan: " + data.errtext,
		};
	}
};

module.exports.deletePleskPlan = async (planName) => {
	const {
		success,
		message,
		data: planDetails,
	} = await module.exports.showPleskPlan(planName);

	if (!success) {
		return {
			success: false,
			message: message,
		};
	}

	const packet = {
		packet: {
			"service-plan": {
				del: {
					filter: {
						id: planDetails.id,
					},
				},
			},
		},
	};

	const response = await pleskApi.request(packet);
	if (response.packet.system?.status === "error") {
		return {
			success: false,
			message: response.packet.system.errtext,
		};
	}

	const data = response.packet["service-plan"].del.result;

	if (data.status === "ok") {
		return {
			success: true,
			message: "Plan deleted successfully",
		};
	} else {
		return {
			success: false,
			message: "Error deleting plan: " + data.errtext,
		};
	}
};

// To get OS details of a virtual machine
module.exports.getOSDetails = (conn) => {
	return new Promise((resolve, reject) => {
		conn.exec("cat /etc/os-release", (err, stream) => {
			if (err)
				return reject(
					new Error("Error retrieving OS details: " + err.message)
				);

			let osDetails = "";
			stream
				.on("data", (data) => {
					osDetails += data.toString();
				})
				.on("close", (code) => {
					if (code === 0) {
						const match = osDetails.match(/^NAME="([^"]+)"/m);
						if (match && match[1]) {
							resolve(match[1]);
						} else {
							reject(
								new Error(
									"Failed to parse OS details: NAME not found."
								)
							);
						}
					} else {
						reject(
							new Error(
								"Failed to determine operating system. Exit code: " +
									code
							)
						);
					}
				})
				.stderr.on("data", (data) => {
					reject(
						new Error(
							"Error retrieving OS details: " + data.toString()
						)
					);
				});
		});
	});
};

// To Delete temporary private key file after use
module.exports.deleteFile = (filePath) => {
	console.log("Deleting temporary private key file:", filePath);
	if (!filePath) return;
	fs.unlink(filePath, (err) => {
		if (err) {
			console.error(`Error deleting file: ${filePath}`, err);
		} else {
			console.log(`Temporary file deleted: ${filePath}`);
		}
	});
};
