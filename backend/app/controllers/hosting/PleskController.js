const winston = require("winston");
const Cloudflare = require("cloudflare");
const fs = require('fs');
const nunjucks = require("nunjucks");
const transporter = require("../../services/mailer");
const env = require("../../../start/env");

const Domain = require('../../models/Domain');
const User = require('../../models/User');
const PleskAccount = require('../../models/hosting/PleskAccount');

const { getPriceForDomain } = require("../../utils/api");
const { domainBelongsToUser, pleskBelongsToUser } = require('../../helpers/authorizationHelper')
const apiClient = require("../../utils/apiclient");
const cloudflareHelper = require("../../helpers/cloudflareHelper");

const { deleteFile, getOSDetails } = require('../../utils/hosting');
const { Client } = require('ssh2');
const axios = require("axios");

const {
	createUserAccount,
	createPleskAccount,
	updatePleskAccountStatus,
	changePleskAccountPlan,
	changePleskAccountPassword,
	deletePleskAccount,
	registerDomain,
	deleteDomain,
	createRewardLog,
	deleteRewardLog,
	createCloudflareRuleset, showPleskPlan, showPleskPlans, deletePleskPlan, createPleskPlan, updatePleskPlan,
} = require("../../utils/hosting");

const { generatePassword } = require("../../utils/common");
const domainProviderApiClient = require("../../utils/domainProviderApiClient");


const PLESK_PANEL_URL = process.env.PLESK_PANEL_URL;
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
				path: 'pleskAccounts',
				populate: { path: 'domain' },
				match
			});

		const accounts = user?.pleskAccounts || [];

		res.json({ total: accounts.length, data: accounts });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

const createAccount = async (req, res) => {
	const { domainId, username, email, plan } = req.body;
	const password = generatePassword();

	try {
		const domain = await domainBelongsToUser(domainId, req.user.id);
		const user = await User.findById(req.user.id);

		// Check if the user already has a Plesk account for the domain
		const existingAccount = await PleskAccount.findOne({ user: req.user.id, domain: domain._id });
		if (existingAccount) return res.status(409).json({ message: 'Account already exists for this domain' });

		// Check if the username is already taken
		const existingUsername = await PleskAccount.findOne({ username });
		if (existingUsername) return res.status(409).json({ message: 'Username already taken' });

		// Call Plesk API to create account
		const { account, message } = await createPleskAccount(user, email, domain.websiteName, username, password, plan);
		if (account) {
			user.pleskAccounts.push(account._id);
			await user.save();

			// Send hosting purchase email
			try {
				if (user.email) {
					let html = nunjucks.render('mails/hosting_purchase.html', {
						NAME: user.name || user.email,
						PLAN_NAME: plan || 'Plesk Hosting',
						SERVER_LOCATION: process.env.PLESK_SERVER_URL || 'US',
						STORAGE: 'Unlimited',
						BANDWIDTH: 'Unlimited',
						IP_ADDRESS: 'Assigned automatically',
						controlPanelLink: env.FRONTEND_URL + '/hosting/plesk',
						setupGuideLink: env.FRONTEND_URL + '/help/hosting-setup',
						logoUrl: env.FRONTEND_URL
					});
					
					await transporter.sendMail({
						from: process.env.MAIL_FROM_ADDRESS,
						to: user.email,
						subject: `Hosting activated - ${plan || 'Plesk Hosting'}`,
						html: html,
					});
					
					console.log(`Hosting purchase email sent to ${user.email}`);
				}
			} catch (emailError) {
				console.error("Error sending hosting purchase email:", emailError);
			}

			res.status(201).json({
				message: 'Account created successfully',
				data: {
					id: account._id,
					username: account.username,
					password,
					plan: account.plan,
					domain: domain.websiteName
				}
			});
		} else {
			res.status(500).json({ message });
		}
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

const suspendAccount = async (req, res) => {
	const { pleskId } = req.params;
	const { reason } = req.body;

	try {
		const account = await pleskBelongsToUser(pleskId, req.user.id);

		// Call Plesk API to suspend the account
		const { success, message } = await updatePleskAccountStatus(account, true, reason);

		const status = success ? 200 : 500;

		res.status(status).json({ message });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

const unsuspendAccount = async (req, res) => {
	const { pleskId } = req.params;

	try {
		const account = await pleskBelongsToUser(pleskId, req.user.id);

		// Call Plesk API to unsuspend the account
		const { success, message } = await updatePleskAccountStatus(account, false, '');

		const status = success ? 200 : 500;

		res.status(status).json({ message });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

const changePlan = async (req, res) => {
	const { pleskId } = req.params;
	const { plan } = req.body;

	try {
		const pleskAccount = await pleskBelongsToUser(pleskId, req.user.id);

		// Call Plesk API to change the hosting plan
		const { success, message } = await changePleskAccountPlan(pleskAccount, plan);

		const status = success ? 200 : 500;

		res.status(status).json({ message });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

const changePassword = async (req, res) => {
	const { pleskId } = req.params;
	const { password } = req.body;

	try {
		const pleskAccount = await pleskBelongsToUser(pleskId, req.user.id);

		// Call Plesk API to change the password
		const { success, message } = await changePleskAccountPassword(pleskAccount, password);

		const status = success ? 200 : 500;

		res.status(status).json({ message });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

const terminateAccount = async (req, res) => {
	const { pleskId } = req.params;

	try {
		const pleskAccount = await pleskBelongsToUser(pleskId, req.user.id);

		// Call Plesk API to delete account
		const { success, message } = await deletePleskAccount(pleskAccount);

		const status = success ? 200 : 500;

		res.status(status).json({ message });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

const telegramHosting = async (req, res) => {
	const { telegramId, name, email, domain, existingDomain, plan, nameserver,provider } = req.body;

	let user, pleskAccount, domainPrice, domainInstance, rewardLog;

	let ns1 = process.env.PLESK_NS1;
	let ns2 = process.env.PLESK_NS2;

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

		winston.info('Creating Plesk account');
		const username = "u" + telegramId + Math.random().toString(36).substring(2, 7);
		const { account, message } = await createPleskAccount(user, email, domain, username, password, plan);
		if (account) {
			pleskAccount = account;
			user.pleskAccounts.push(pleskAccount._id);
			await user.save();
			winston.info('Plesk account created successfully');
			console.log('Plesk account created successfully', pleskAccount);
			
			// Send hosting purchase email
			try {
				if (user.email) {
					let html = nunjucks.render('mails/hosting_purchase.html', {
						NAME: user.name || user.email,
						PLAN_NAME: plan || 'Plesk Hosting',
						SERVER_LOCATION: process.env.PLESK_SERVER_URL || 'US',
						STORAGE: 'Unlimited',
						BANDWIDTH: 'Unlimited',
						IP_ADDRESS: 'Assigned automatically',
						controlPanelLink: env.FRONTEND_URL + '/hosting/plesk',
						setupGuideLink: env.FRONTEND_URL + '/help/hosting-setup',
						logoUrl: env.FRONTEND_URL
					});
					
					await transporter.sendMail({
						from: process.env.MAIL_FROM_ADDRESS,
						to: user.email,
						subject: `Hosting activated - ${plan || 'Plesk Hosting'}`,
						html: html,
					});
					
					console.log(`Hosting purchase email sent to ${user.email}`);
				}
			} catch (emailError) {
				console.error("Error sending hosting purchase email:", emailError);
			}
		} else {
			winston.error('Error creating plesk account:', message);
			console.error('Error creating plesk account:', message);
			return res.status(500).json({ message });
		}

		if (existingDomain) {
			pleskAccount.domainName = domain;
			await pleskAccount.save();
			winston.info('Existing domain added to plesk account');
			console.log('Existing domain added to plesk account');
		} else {
			// Get the domain availability and price
			winston.info('Checking domain availability');
			domainPrice = await getPriceForDomain(domain, 1);
			if (!domainPrice) {
				return res.status(500).json({ message: 'Domain not available for registration' });
			}

			winston.info('Registering new domain:', domain);
			const domainCreated = await registerDomain(user, domain, domainPrice.price, { ns1, ns2 });
			if (domainCreated.domain) {
				domainInstance = domainCreated.domain
				pleskAccount.domain = domainInstance._id;
				user.domains.push(domainInstance._id);
				await pleskAccount.save();
				await user.save();
				winston.info('Domain registered successfully with price:', domainPrice.price);
				console.log('Domain registered successfully', domainInstance);
			} else {
				winston.error('Error registering domain:', domainCreated.message);
				console.error('Error registering domain:', domainCreated.message);
				await deletePleskAccount(pleskAccount);
				return res.status(500).json({ message });
			}
		}

		// Update nameservers
		if (nameserver === 'cloudflare') {
			const response = await cloudflare.zones.create({
				name: existingDomain ? domain : domainInstance.websiteName,
				type: 'full',
			});

			// Set SSL encryption mode to 'Full'
			await cloudflare.zones.settings.edit('ssl', {
				value: 'full',
				zone_id: response.id,
			})

			// Enable 'Always use HTTPS' setting
			await cloudflare.zones.settings.edit('always_use_https', {
				value: 'on',
				zone_id: response.id,
			})

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
					await deletePleskAccount(pleskAccount);
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
				content: process.env.PLESK_SERVER_IP,
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
				plan: pleskAccount.plan,
				domain: domain,
				url: PLESK_PANEL_URL,
				username: pleskAccount.username,
				password,
				nameservers: { ns1, ns2 }
			}
		});
	} catch (error) {
		await deletePleskAccount(pleskAccount);
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
		// const response = await apiClient.request('checkdomainavailable', { websiteName: domain });
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
		const domainPlesk = await PleskAccount.findOne({ domainName: domain });
		return domainDB || domainPlesk
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
		// Call Plesk API to get the list of hosting plans
		const { success, message, data } = await showPleskPlans();

		const status = success ? 200 : 500;

		if (success) {
			res.status(status).json({ data });
		} else {
			res.status(status).json({ message });
		}
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}

const createPlan = async (req, res) => {
	const { planName, quota, bwlimit, maxaddon, maxpop, maxsql } = req.body;

	try {
		// Call Plesk API to create a new hosting plan
		const { success, message } = await createPleskPlan(planName, quota, bwlimit, maxaddon, maxpop, maxsql);

		const status = success ? 201 : 500;

		res.status(status).json({ message });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}

const showPlan = async (req, res) => {
	const { planName } = req.params;

	try {
		// Call Plesk API to get the details of a hosting plan
		const { success, message, data } = await showPleskPlan(planName);

		const status = success ? 200 : 500;

		if (success) {
			res.status(status).json({ data });
		} else {
			res.status(status).json({ message });
		}
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}

const updatePlan = async (req, res) => {
	const { planName } = req.params;
	const { quota, bwlimit, maxaddon, maxpop, maxsql } = req.body;

	try {
		// Call Plesk API to update a hosting plan
		const { success, message } = await updatePleskPlan(planName, quota, bwlimit, maxaddon, maxpop, maxsql);

		const status = success ? 200 : 500;

		res.status(status).json({ message });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}

const deletePlan = async (req, res) => {
	const { planName } = req.params;

	try {
		// Call Plesk API to delete a hosting plan
		const { success, message } = await deletePleskPlan(planName);

		const status = success ? 200 : 500;

		res.status(status).json({ message });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}

// To Install Plesk
const installPlesk = async (req, res) => {
    const { host, username } = req.body;
    const privateKeyPath = req.file.path;

    const privateKeyContent = fs.readFileSync(privateKeyPath, 'utf8');

    console.log('Private Key Content:', privateKeyPath);

    const conn = new Client();

    conn.on('ready', async () => {
        console.log('SSH Client :: ready');

        // Step 1: Check if Plesk is already installed
        conn.exec('sudo plesk version', (err, stream) => {
            if (err) {
                console.error('Error checking Plesk installation:', err);
                deleteFile(privateKeyPath);
                return res.status(500).json({ message: 'Error checking Plesk installation: ' + err.message });
            }

            let isInstalled = false;
            let checkOutput = '';

            stream.on('data', (data) => {
                checkOutput += data.toString();
                console.log('Plesk Check Output:', checkOutput);

                if (checkOutput.trim()) {
                    isInstalled = true;
                }
            }).stderr.on('data', (data) => {
                console.error('Plesk Check STDERR:', data.toString());
            }).on('close', () => {
                if (isInstalled) {
                    console.log('Plesk is already installed:', checkOutput);
                    conn.end();
                    deleteFile(privateKeyPath);
                    return res.status(400).json({
                        message: 'Plesk is already installed.',
                        version: checkOutput.trim(),
                    });
                }

                // Proceed with installation if not installed
                console.log('Plesk is not installed. Proceeding with installation.');

                const defaultPassword = process.env.PLESK_DEFAULT_PASSWORD || 'Password@123*456';

                // Step 2: Get OS Details
                getOSDetails(conn).then((osDetails) => {
                    console.log('Detected OS:', osDetails);

                    // Step 3: Determine installation commands based on OS
                    let installCommands = `
                        sudo su 
                        echo 'root:${defaultPassword}' | chpasswd
                        wget https://autoinstall.plesk.com/one-click-installer &&
                        chmod +x one-click-installer &&
                        ./one-click-installer
                    `;

                    conn.shell((err, stream) => {
                        if (err) {
                            console.error('Error opening shell:', err);
                            deleteFile(privateKeyPath);
                            return res.status(500).json({ message: 'Error opening shell: ' + err.message });
                        }

                        let commandOutput = '';
                        let fatalErrorMessage = '';
                        let fatalErrorDetected = false;

                        stream.on('close', (code, signal) => {
                            conn.end();
                            console.log('Shell closed with code:', code, 'signal:', signal);

                            if (!fatalErrorDetected) {
                                const pleskUri = `https://${host}:8880`;
                                deleteFile(privateKeyPath);
                                res.status(200).json({
                                    message: 'Plesk installation completed successfully.',
                                    pleskUri,
                                });
                            } else {
                                console.error('Installation process encountered errors. Output:', commandOutput);
                                deleteFile(privateKeyPath);
                                res.status(500).json({
                                    message: 'Installation process encountered errors.',
                                    lastError: fatalErrorMessage?.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, ''),
                                    details: commandOutput,
                                });
                            }
                        }).on('data', (data) => {
                            const output = data.toString();
                            console.log('Shell output:', output);

                            commandOutput += output;

                            // Check for the completion message
                            const successMessageRegex = /Plesk is now running on your server/;
                            if (successMessageRegex.test(output)) {
                                fatalErrorDetected = false;
                                console.log('Plesk installation completed successfully. Exiting shell.');
                                stream.end('exit\n');
                                conn.end();
                            }

                            // Check for FATAL errors
                            if (output.includes('FATAL') || output.includes('ERROR')) {
                                console.error('Detected FATAL error in STDOUT:', output);

                                const match = output.match(/\(FATAL\): (.+)/) || output.match(/\(ERROR\): (.+)/);
                                if (match && match[1]) {
                                    fatalErrorMessage = match[1];
                                }

                                fatalErrorDetected = true;
                                stream.end('exit\n');
                                conn.end();
                            }
                        }).stderr.on('data', (data) => {
                            const errorOutput = data.toString();
                            commandOutput += errorOutput;
                            console.error('STDERR:', errorOutput);
                            deleteFile(privateKeyPath);
                            return res.status(500).json({ message: errorOutput });
                        });

                        stream.end(installCommands + '\nexit\n');
                    });
                }).catch((osError) => {
                    console.error('Error detecting OS:', osError);
                    deleteFile(privateKeyPath);
                    res.status(500).json({ message: 'Error detecting OS: ' + osError.message });
                });
            });
        });
    }).connect({
        host: host,
        port: 22,
        username: username,
        privateKey: privateKeyContent,
    });

    conn.on('error', (err) => {
        console.error('SSH Connection Error:', err);
        deleteFile(privateKeyPath);
        res.status(500).json({ message: 'Error connecting to VM via SSH: ' + err.message });
    });
};

// To Setup Plesk License
const setupPleskLicense = async (req, res) => {
    console.log(req.body);
    const { host, username, activationCode } = req.body;
    const privateKeyPath = req.file.path;
    let privateKeyContent;

    try {
        privateKeyContent = fs.readFileSync(privateKeyPath, 'utf8');
    } catch (err) {
        console.error('Error reading private key file:', err);
        return res.status(500).json({ message: 'Error reading private key file: ' + err.message });
    }

    const apiUrl = `https://${host}:8880/api/v2/licenses`;
    const auth = Buffer.from(`${username}:${privateKeyContent}`).toString('base64');

    try {
        const response = await axios.post(apiUrl, {
            key: activationCode
        }, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 200) {
            console.log('Plesk license setup completed successfully.');
            deleteFile(privateKeyPath);
            return res.status(200).json({ message: 'Plesk license setup completed successfully.' });
        } else {
            deleteFile(privateKeyPath);
            return res.status(response.status).json({ message: 'Error setting up Plesk license.', details: response.data });
        }
    } catch (error) {
        console.error('Error setting up Plesk license:', error);
        deleteFile(privateKeyPath);
        return res.status(500).json({ message: 'Error setting up Plesk license.', details: error.message });
    }
};

module.exports = {
	accounts,
	createAccount,
	suspendAccount,
	unsuspendAccount,
	changePlan,
	changePassword,
	terminateAccount,

	telegramHosting,
	checkNewDomainAvailability,
	checkExistingDomainAvailability,

	plans,
	createPlan,
	showPlan,
	updatePlan,
	deletePlan,

	installPlesk,
	setupPleskLicense
};