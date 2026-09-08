const axios = require('axios');
const winston = require("winston");
const Cloudflare = require("cloudflare");
const nunjucks = require("nunjucks");
const transporter = require("../../services/mailer");
const env = require("../../../start/env");

const Domain = require('../../models/Domain');
const User = require('../../models/User');
const CpanelAccount = require('../../models/hosting/CpanelAccount');

const { getPriceForDomain } = require("../../utils/api");
const { domainBelongsToUser, cPanelBelongsToUser } = require('../../helpers/authorizationHelper')
const apiClient = require("../../utils/apiclient");
const cloudflareHelper = require("../../helpers/cloudflareHelper");

const {
	createUserAccount,
	generatePassword,
	createCpanelAccount,
	deleteCpanelAccount,
	registerDomain,
	deleteDomain,
	createRewardLog,
	deleteRewardLog,
	createCloudflareRuleset
} = require("../../utils/hosting");
const domainProviderApiClient = require('../../utils/domainProviderApiClient');


const CPANEL_URL = process.env.WHM_CPANEL_URL;

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


const accounts = async (req, res) => {
	const { status } = req.query;

	try {
		const match = status ? { status } : {};

		const user = await User.findById(req.user.id)
			.populate({
				path: 'cpanelAccounts',
				populate: { path: 'domain' },
				match
			});

		const accounts = user?.cpanelAccounts || [];

		res.json({ total: accounts.length, data: accounts });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

const createAccount = async (req, res) => {
	const { domainId, username, plan } = req.body;
	const password = generatePassword();

	try {
		const domain = await domainBelongsToUser(domainId, req.user.id);
		const user = await User.findById(req.user.id);

		// Check if the user already has a cPanel account for the domain
		const existingAccount = await CpanelAccount.findOne({ user: req.user.id, domain: domain._id });
		if (existingAccount) return res.status(409).json({ message: 'Account already exists for this domain' });

		// Check if the username is already taken
		const existingUsername = await CpanelAccount.findOne({ username });
		if (existingUsername) return res.status(409).json({ message: 'Username already taken' });

		// Call WHM API to create the cPanel account
		const response = await axiosInstance.get(
			`/json-api/createacct?api.version=1&domain=${domain.websiteName}&username=${username}&password=${password}&plan=${plan}`
		);

		// If the WHM API call was successful, store the cPanel account in the database
		if (response.data.metadata.result === 1) {
			const cpanelAccount = new CpanelAccount({
				user: user.id,
				domain: domain._id,
				username: username,
				plan: plan
			});

			await cpanelAccount.save();
			user.cpanelAccounts.push(cpanelAccount._id);
			await user.save();

			res.status(201).json({
				message: 'Account created successfully',
				data: {
					id: cpanelAccount._id,
					username: cpanelAccount.username,
					password,
					plan: cpanelAccount.plan,
					domain: domain.websiteName
				}
			});
		} else {
			res.status(500).json({ message: response.data.metadata.reason });
		}
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

const suspendAccount = async (req, res) => {
	const { cpanelId } = req.params;
	const { reason } = req.body;

	try {
		const cpanelAccount = await cPanelBelongsToUser(cpanelId, req.user.id);
		const username = cpanelAccount.username;

		// Call WHM API to suspend the account
		const response = await axiosInstance.get(
			`/json-api/suspendacct?api.version=1&user=${username}&reason=${reason}`
		);

		if (response.data.metadata.result === 1) {
			cpanelAccount.status = 'suspended';
			await cpanelAccount.save();

			res.json({ message: 'Account suspended successfully' });
		} else {
			res.status(500).json({ message: response.data.metadata.reason });
		}

	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

const unsuspendAccount = async (req, res) => {
	const { cpanelId } = req.params;

	try {
		const cpanelAccount = await cPanelBelongsToUser(cpanelId, req.user.id);
		const username = cpanelAccount.username;

		// Call WHM API to unsuspend the account
		const response = await axiosInstance.get(
			`/json-api/unsuspendacct?api.version=1&user=${username}`
		);

		if (response.data.metadata.result === 1) {
			cpanelAccount.status = 'active';
			await cpanelAccount.save();

			res.json({ message: 'Account unsuspended successfully' });
		} else {
			res.status(500).json({ message: response.data.metadata.reason });
		}
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

const changePlan = async (req, res) => {
	const { cpanelId } = req.params;
	const { plan } = req.body;

	try {
		const cpanelAccount = await cPanelBelongsToUser(cpanelId, req.user.id);
		const username = cpanelAccount.username;

		// Call WHM API to change the hosting plan
		const response = await axiosInstance.get(
			`/json-api/changepackage?api.version=1&pkg=${plan}&user=${username}`
		);

		if (response.data.metadata.result === 1) {
			cpanelAccount.plan = plan;
			await cpanelAccount.save();

			res.json({ message: 'Plan changed successfully' });
		} else {
			res.status(500).json({ message: response.data.metadata.reason });
		}
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

const changePassword = async (req, res) => {
	const { cpanelId } = req.params;
	const { password } = req.body;

	try {
		const cpanelAccount = await cPanelBelongsToUser(cpanelId, req.user.id);
		const username = cpanelAccount.username;

		// Call WHM API to change the password
		const response = await axiosInstance.get(
			`/json-api/passwd?api.version=1&user=${username}&password=${password}`
		);

		if (response.data.metadata.result === 1) {
			res.json({ message: 'Password changed successfully' });
		} else {
			res.status(500).json({ message: response.data.metadata.reason });
		}
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

const login = async (req, res) => {
	const { cpanelId } = req.params;

	try {
		const cpanelAccount = await cPanelBelongsToUser(cpanelId, req.user.id);
		const username = cpanelAccount.username;

		// Call WHM API to create a cPanel login url
		const response = await axiosInstance.get(
			`/json-api/create_user_session?api.version=1&service=cpaneld&user=${username}`
		);

		if (response.data.metadata.result === 1) {
			res.json({ message: 'cPanel login successful', data: response.data.data });
		} else {
			res.status(500).json({ message: response.data.metadata.reason });
		}
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

const loginWebmail = async (req, res) => {
	const { cpanelId } = req.params;

	try {
		const cpanelAccount = await cPanelBelongsToUser(cpanelId, req.user.id);
		const username = cpanelAccount.username;

		// Call WHM API to create a Webmail login url
		const response = await axiosInstance.get(
			`/json-api/create_user_session?api.version=1&service=webmaild&user=${username}`
		);

		if (response.data.metadata.result === 1) {
			res.json({ message: 'Webmail login successful', data: response.data.data });
		} else {
			res.status(500).json({ message: response.data.metadata.reason });
		}
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

const terminateAccount = async (req, res) => {
	const { cpanelId } = req.params;

	try {
		const cpanelAccount = await cPanelBelongsToUser(cpanelId, req.user.id);
		const username = cpanelAccount.username;

		const response = await axiosInstance.get(
			`/json-api/removeacct?api.version=1&username=${username}`
		);

		if (response.data.metadata.result === 1) {
			const planName = cpanelAccount.plan || 'Hosting';
			const user = await User.findById(req.user.id);
			
			// Send hosting deleted email before deletion
			try {
				if (user && user.email) {
					const { shouldSendEmail } = require("../../utils/notificationHelper");
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
				}
			} catch (emailError) {
				console.error("Error sending hosting deleted email:", emailError);
			}

			await CpanelAccount.findByIdAndDelete(cpanelId);

			user.cpanelAccounts = user.cpanelAccounts.filter(id => id.toString() !== cpanelId);
			await user.save();

			res.json({ message: 'Account terminated successfully' });
		} else {
			res.status(500).json({ message: response.data.metadata.reason });
		}
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

const telegramHosting = async (req, res) => {
	const { telegramId, name, email, domain, existingDomain, plan, nameserver,provider } = req.body;

	let user, cpanelAccount, domainPrice, domainInstance, rewardLog;

	let ns1 = process.env.WHM_NS1;
	let ns2 = process.env.WHM_NS2;

	winston.info('Request received for telegram hosting');
	winston.info('Request details:', req.body);

	try {
		winston.info('Generating password');
		const password = await generatePassword();

		// Find user by telegramId
		user = await User.findOne({ telegramId });
		if (!user) {
			winston.info(`User not found with telegramId: ${telegramId}. Creating new user account`);
			user = await createUserAccount(name, email, password, telegramId);
			winston.info('User created successfully');
			console.log('User created successfully', user);
		}

		winston.info('Creating Cpanel account');
		const { account, message } = await createCpanelAccount(user, domain, telegramId, password, plan);
		if (account) {
			cpanelAccount = account;
			user.cpanelAccounts.push(cpanelAccount._id);
			await user.save();
			winston.info('Cpanel account created successfully');
			console.log('Cpanel account created successfully', cpanelAccount);
			
			// Send hosting purchase email
			try {
				if (user.email) {
					let html = nunjucks.render('mails/hosting_purchase.html', {
						NAME: user.name || user.email,
						PLAN_NAME: plan || 'cPanel Hosting',
						SERVER_LOCATION: process.env.WHM_SERVER_URL || 'US',
						STORAGE: 'Unlimited',
						BANDWIDTH: 'Unlimited',
						IP_ADDRESS: 'Assigned automatically',
						controlPanelLink: env.FRONTEND_URL + '/hosting/cpanel',
						setupGuideLink: env.FRONTEND_URL + '/help/hosting-setup',
						logoUrl: env.FRONTEND_URL
					});
					
					await transporter.sendMail({
						from: process.env.MAIL_FROM_ADDRESS,
						to: user.email,
						subject: `Hosting activated - ${plan || 'cPanel Hosting'}`,
						html: html,
					});
					
					console.log(`Hosting purchase email sent to ${user.email}`);
				}
			} catch (emailError) {
				console.error("Error sending hosting purchase email:", emailError);
				// Continue even if email fails
			}
		} else {
			winston.error('Error creating cpanel account:', message);
			console.error('Error creating cpanel account:', message);
			return res.status(500).json({ message });
		}

		if (existingDomain) {
			cpanelAccount.domainName = domain;
			await cpanelAccount.save();
			winston.info('Existing domain added to cpanel account');
			console.log('Existing domain added to cpanel account');
		} else {
			// Get the domain availability and price
			winston.info('Checking domain availability');
			domainPrice = await getPriceForDomain(domain, 1);
			if (!domainPrice) {
				return res.status(500).json({ message: 'Domain not available for registration' });
			}

			winston.info('Registering new domain:', domain);
			const domainCreated = await registerDomain(user, domain, domainPrice.price, { ns1, ns2 },provider);
			if (domainCreated.domain) {
				domainInstance = domainCreated.domain
				cpanelAccount.domain = domainInstance._id;
				user.domains.push(domainInstance._id);
				await cpanelAccount.save();
				await user.save();
				winston.info('Domain registered successfully with price:', domainPrice.price);
				console.log('Domain registered successfully', domainInstance);
			} else {
				winston.error('Error registering domain:', domainCreated.message);
				console.error('Error registering domain:', domainCreated.message);
				await deleteCpanelAccount(cpanelAccount);
				return res.status(500).json({ message: domainCreated.message });
			}
		}

		// Update nameservers
		if (nameserver === 'cloudflare') {
			const response = await cloudflare.zones.create({
				name: existingDomain ? domain : domainInstance.websiteName,
				type: 'full',
			});

			ns1 = response.name_servers[0];
			ns2 = response.name_servers[1];

			// Update nameservers with the domain provider
			if (!existingDomain) {
				try {

					
					await domainProviderApiClient.get('UpdateNameServer', {
						domainNameId: domainInstance.domainNameId,
						websiteName: domainInstance.websiteName,
						nameServer1: ns1,
						nameServer2: ns2,
					},provider);
				} catch (error) {
					// Rollback zone creation
					await cloudflare.zones.delete({
						zone_id: response.id,
					});

					console.error('Error updating nameservers:', error);
					winston.error('Error updating nameservers:', error);
					await deleteCpanelAccount(cpanelAccount);
					await deleteDomain(domainInstance);
					return res.status(500).json({ message: 'Zone was not created due to nameserver update failure' });
				}

				// Update the domain with the zoneId
				domainInstance.cloudflare.zoneId = response.id;
				await domainInstance.save();
			}

			const data = cloudflareHelper.formatZoneData(response);
			console.log('Zone created successfully', data);
			winston.info('Zone created successfully', data);

			// Add DNS records
			const dnsRecord = await cloudflare.dns.records.create({
				zone_id: response.id,
				type: 'A',
				name: '@',
				content: process.env.WHM_SERVER_IP,
				ttl: 3600,
				proxied: true
			});

			console.log('DNS record created successfully', dnsRecord);
			winston.info('DNS record created successfully', dnsRecord);

			// Add Ruleset for the domain
			await createCloudflareRuleset(response.id);
		}

		// Earn points if plan is not 'Freedom Plan'
		if (plan !== 'Freedom Plan' && !existingDomain) {
			winston.info('Creating reward log');
			rewardLog = await createRewardLog(user, domainPrice);
			winston.info('Reward log created successfully');
			console.log('Reward log created successfully', rewardLog);
		}

		winston.info('Hosting setup completed successfully');
		console.log('Hosting setup completed successfully');
		res.status(201).json({
			message: 'Account created successfully',
			data: {
				plan: cpanelAccount.plan,
				domain: domain,
				url: CPANEL_URL,
				username: cpanelAccount.username,
				password,
				nameservers: { ns1, ns2 }
			}
		});
	} catch (error) {
		await deleteCpanelAccount(cpanelAccount);
		await deleteDomain(domainInstance);
		await deleteRewardLog(rewardLog);

		winston.error('Error creating hosting:', error);
		console.error('Error creating hosting:', error.message);
		res.status(500).json({ message: 'Error creating hosting: ' + error.message });
	}
};

const checkNewDomainAvailability = async (req, res) => {
	const { domain } = req.query;

	try {
		const domainDB = await Domain.findOne({ websiteName: domain, deletedAt: { $eq: null } });
		const response = await domainProviderApiClient.request('checkdomainavailable', { websiteName: domain },null,
			"both");

		if (domainDB || response.responseMsg.statusCode !== 200) {
			return res.status(409).json({
				message: response.responseMsg.message,
			})
		} else {
			return res.json({
				message: response.responseMsg.message,
				data: response
			})
		}
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

const checkExistingDomainAvailability = async (req, res) => {
	const { domain } = req.query;

	try {
		const domainDB = await Domain.findOne({ websiteName: domain, deletedAt: { $eq: null } });
		const domainCpanel = await CpanelAccount.findOne({ domainName: domain });
		return domainDB || domainCpanel
			? res.status(409).json({
				message: 'Domain is already hosted',
			}) : res.json({
				message: 'Domain is available for hosting',
			})
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}

const plans = async (req, res) => {
	try {
		// Call WHM API to get the list of hosting plans
		const response = await axiosInstance.get(`/json-api/listpkgs?api.version=1`);

		if (response.data.metadata.result === 1) {
			res.json({ total: response.data.data.length, data: response.data.data });
		} else {
			res.status(500).json({ message: response.data.metadata.reason });
		}
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}

const showPlan = async (req, res) => {
	const { planName } = req.params;

	try {
		// Call WHM API to get the details of a hosting plan
		const response = await axiosInstance.get(`/json-api/getpkginfo?api.version=1&pkg=${planName}`);

		if (response.data.metadata.result === 1) {
			res.json({ data: response.data.data });
		} else {
			res.status(500).json({ message: response.data.metadata.reason });
		}
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}

const createPlan = async (req, res) => {
	const { planName, quota, bwlimit, maxaddon, maxpop, maxsql } = req.body;

	try {
		// Call WHM API to create a new hosting plan
		const response = await axiosInstance.get(
			`/json-api/addpkg?api.version=1&name=${planName}&quota=${quota}&bwlimit=${bwlimit}&maxaddon=${maxaddon}&maxpop=${maxpop}&maxsql=${maxsql}`
		);

		if (response.data.metadata.result === 1) {
			res.json({ message: 'Plan created successfully' });
		} else {
			res.status(500).json({ message: response.data.metadata.reason });
		}
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}

const updatePlan = async (req, res) => {
	const { planName } = req.params;
	const { quota, bwlimit, maxaddon, maxpop, maxsql } = req.body;

	try {
		// Call WHM API to update a hosting plan
		const response = await axiosInstance.get(
			`/json-api/editpkg?api.version=1&name=${planName}&quota=${quota}&bwlimit=${bwlimit}&maxaddon=${maxaddon}&maxpop=${maxpop}&maxsql=${maxsql}`
		);

		if (response.data.metadata.result === 1) {
			res.json({ message: 'Plan updated successfully' });
		} else {
			res.status(500).json({ message: response.data.metadata.reason });
		}
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}

const deletePlan = async (req, res) => {
	const { planName } = req.params;

	try {
		// Call WHM API to delete a hosting plan
		const response = await axiosInstance.get(
			`/json-api/killpkg?api.version=1&pkgname=${planName}`
		);

		if (response.data.metadata.result === 1) {
			res.json({ message: 'Plan deleted successfully' });
		} else {
			res.status(500).json({ message: response.data.metadata.reason });
		}
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}

module.exports = {
	accounts,
	createAccount,
	suspendAccount,
	unsuspendAccount,
	changePlan,
	changePassword,
	login,
	loginWebmail,
	terminateAccount,

	telegramHosting,
	checkNewDomainAvailability,
	checkExistingDomainAvailability,

	plans,
	showPlan,
	createPlan,
	updatePlan,
	deletePlan
};