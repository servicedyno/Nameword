const Domain = require("../../models/Domain");
const apiClient = require("../../utils/apiclient");
const domainProviderApiClient = require("../../utils/domainProviderApiClient");
const { saveActivity } = require("../activityController");
const Cloudflare = require("cloudflare");
const axios = require("axios");
const transporter = require("../../services/mailer");
const nunjucks = require("nunjucks");
const env = require("../../../start/env");
const User = require("../../models/User");

const cloudflare = new Cloudflare({
	apiEmail: process.env.CLOUDFLARE_EMAIL,
	apiKey: process.env.CLOUDFLARE_API_KEY,
});

// Helper function to call Cloudflare DNSSEC API directly
const cloudflareDNSSEC = {
	read: async (zoneId) => {
		try {
			const response = await axios.get(
				`https://api.cloudflare.com/client/v4/zones/${zoneId}/dnssec`,
				{
					headers: {
						"X-Auth-Email": process.env.CLOUDFLARE_EMAIL,
						"X-Auth-Key": process.env.CLOUDFLARE_API_KEY,
						"Content-Type": "application/json",
					},
				}
			);
			return response.data;
		} catch (error) {
			throw error;
		}
	},
	edit: async (zoneId, data) => {
		try {
			const response = await axios.patch(
				`https://api.cloudflare.com/client/v4/zones/${zoneId}/dnssec`,
				data,
				{
					headers: {
						"X-Auth-Email": process.env.CLOUDFLARE_EMAIL,
						"X-Auth-Key": process.env.CLOUDFLARE_API_KEY,
						"Content-Type": "application/json",
					},
				}
			);
			return response.data;
		} catch (error) {
			throw error;
		}
	},
};

// Track restored DNS records to filter them from history
// Key: domain, Value: Array of {recordName, recordType, restoredAt}
const restoredDNSRecords = new Map();

// Helper function to clean up old restore tracking entries (older than 1 minute)
const cleanupRestoredRecords = () => {
	const oneMinuteAgo = Date.now() - 60000;
	for (const [domain, records] of restoredDNSRecords.entries()) {
		const filtered = records.filter(r => r.restoredAt > oneMinuteAgo);
		if (filtered.length === 0) {
			restoredDNSRecords.delete(domain);
		} else {
			restoredDNSRecords.set(domain, filtered);
		}
	}
};

class DnsController {
	async manageDNSRecords(req, res) {
		const { domain, domainId, provider } = req.query;
		
		// Get provider from domain data if not provided
		let domainData = await Domain.findOne({ websiteName: domain, deletedAt: { $eq: null } });
		const actualProvider = domainData?.provider || provider || "hostbay";
		
		// For HostBay, DNS management might be enabled by default
		// Try to enable it, but if domain doesn't exist, return appropriate error
		if (actualProvider === "hostbay") {
			const params = {
				WebsiteName: domain,
			};
			
			const manageResponse = await domainProviderApiClient.request(
				"ManageDNSRecords",
				params,
				"POST",
				actualProvider
			);
			
			const dnsRecordsResponse = await domainProviderApiClient.get(
				"ViewDNSRecord",
				params,
				actualProvider
			);
	
			if (manageResponse?.responseMsg?.statusCode === 404 || manageResponse?.responseMsg?.statusCode >= 400) {

				if (dnsRecordsResponse?.responseData?.records) {
					return res.status(200).json({
						responseMsg: {
							id: 0,
							reason: null,
							statusCode: 200,
							message: "DNS Management is available for this domain",
						},
						responseData: {
							message: "DNS Management is enabled",
							records: dnsRecordsResponse.responseData.records,
							total: dnsRecordsResponse.responseData.records?.length || 0,
							id: 0,
							reason: null,
							statusCode: 200,
						},
					});
				}
				
				// If no records found, return success message
				return res.status(200).json({
					responseMsg: {
						id: 0,
						reason: null,
						statusCode: 200,
						message: "DNS Management is available for this domain",
					},
					responseData: {
						message: "DNS Management is available. You can proceed to add DNS records.",
						records: [],
						total: 0,
						id: 0,
						reason: null,
						statusCode: 200,
					},
				});
			}
			
			// If manage was successful, return manage response with DNS records
			if (dnsRecordsResponse?.responseData?.records) {
				return res.status(200).json({
					responseMsg: manageResponse.responseMsg || {
						id: 0,
						reason: null,
						statusCode: 200,
						message: "DNS Management enabled successfully",
					},
					responseData: {
						message: "DNS Management enabled successfully",
						records: dnsRecordsResponse.responseData.records,
						total: dnsRecordsResponse.responseData.records?.length || 0,
						id: 0,
						reason: null,
						statusCode: 200,
					},
				});
			}
			
			// Return manage response if no records
			return res.status(200).json(manageResponse);
		}
		
		// For other providers, get domain details first
		try {
			const detail = await domainProviderApiClient.request(
				"ViewDomain",
				{ websiteName: domain, domainId },
				null,
				actualProvider
			);
			
			// Check if responseData exists
			if (!detail || !detail.responseData) {
				return res.status(404).json({
					responseMsg: {
						id: 0,
						reason: "Domain not found",
						statusCode: 404,
						message: `Domain ${domain} not found or not accessible`,
					},
					responseData: null,
				});
			}
			
			// Original code - kept for reference
			// const id = detail.responseData.websiteId;
			
			// Updated code with fallback options
			const id = detail.responseData.websiteId || detail.responseData.domainNameId || domainId;
			
			if (!id) {
				return res.status(400).json({
					responseMsg: {
						id: 0,
						reason: "Domain ID not found",
						statusCode: 400,
						message: "Unable to retrieve domain ID. Please provide domainId parameter.",
					},
					responseData: null,
				});
			}                          
			
			const params = {
				WebsiteName: domain,
				WebsiteId: id,
			};
                            
			// If provider is OpenProvider, create/update Cloudflare zone
			// if (provider === 'openprovider') {
			// 	try {
			// 		// Check if domain already has a Cloudflare zone
			// 		const zones = await cloudflare.zones.list({ name: domain });
			// 		let zoneId;

			// 		if (zones.result.length === 0) {
			// 			// Create new zone
			// 			const response = await cloudflare.zones.create({
			// 				name: domain,
			// 				type: 'full',
			// 			});
			// 			zoneId = response.id;

			// 			// Set SSL encryption mode to 'Full'
			// 			await cloudflare.zones.settings.edit('ssl', {
			// 				value: 'full',
			// 				zone_id: zoneId,
			// 			});

			// 			// Enable 'Always use HTTPS' setting
			// 			await cloudflare.zones.settings.edit('always_use_https', {
			// 				value: 'on',
			// 				zone_id: zoneId,
			// 			});

			// 			// Update nameservers in OpenProvider
			// 			await domainProviderApiClient.get('UpdateNameServer', {
			// 				domainNameId: domainId,
			// 				websiteName: domain,
			// 				nameServer1: response.name_servers[0],
			// 				nameServer2: response.name_servers[1],
			// 			}, provider);

			// 			// Add default A record
			// 			// await cloudflare.dns.records.create({
			// 			// 	zone_id: zoneId,
			// 			// 	type: 'A',
			// 			// 	name: '@',
			// 			// 	content: process.env.SERVER_IP,
			// 			// 	ttl: 3600,
			// 			// 	proxied: true
			// 			// });
			// 		} else {
			// 			zoneId = allZones[0].id;
			// 		}

			// 		// Get DNS records from OpenProvider
			// 		const openProviderResponse = await domainProviderApiClient.get(
			// 			"ViewDNSRecord",
			// 			params,
			// 			provider
			// 		);

			// 		// Sync DNS records to Cloudflare
			// 		if (openProviderResponse.records) {
			// 			for (const record of openProviderResponse.records) {
			// 				const recordName = record.name === domain ? '@' : record.name.replace(`.${domain}`, '');

			// 				// Check if record exists
			// 				const existingRecords = await cloudflare.dns.records.list({
			// 					zone_id: zoneId,
			// 					name: recordName,
			// 					type: record.type
			// 				});

			// 				if (existingRecords.result.length === 0) {
			// 					// Create new record
			// 					await cloudflare.dns.records.create({
			// 						zone_id: zoneId,
			// 						type: record.type,
			// 						name: recordName,
			// 						content: record.value,
			// 						ttl: record.ttl || 3600,
			// 						proxied: true
			// 					});
			// 				}
			// 			}
			// 		}

			// 		return res.status(200).json({
			// 			responseMsg: {
			// 				id: 0,
			// 				reason: null,
			// 				statusCode: data.code === 0 ? 200 : data.code,
			// 				message: data.message ?? "Success",
			// 			},
			// 			responseData: {
			// 				message:
			// 	data.code === 0
			// 		? "DNS Management enabled successfully"
			// 		: "Failed to enable DNS Management",
			// id: 0,
			// reason: null,
			// statusCode: data.code === 0 ? 200 : data.code,
			// 			},
			// 			// message: 'DNS records managed successfully',
			// 			// cloudflare: {
			// 			// 	zoneId,
			// 			// 	nameservers: zones.result[0]?.name_servers
			// 			// }
			// 		});
			// 	} catch (error) {
			// 		console.error('Error managing DNS records:', error);
			// 		return res.status(500).json({ message: 'Error managing DNS records' });
			// 	}
			// }

			// For other providers, use existing logic
			const response = await domainProviderApiClient.get(
				"ManageDNSRecords",
				params,
				actualProvider
			);

			return res.status(200).json(response);
		} catch (error) {
			console.error("Error managing DNS records:", error);
			return res.status(500).json({
				responseMsg: {
					id: 0,
					reason: error.message || "Unknown error",
					statusCode: 500,
					message: error.message || "Error managing DNS records",
				},
				responseData: null,
			});
		}
	}

	async addDNSRecord(req, res) {
		let {
			dnsZoneId,
			recordName,
			recordType,
			recordValue,
			recordPriority,
			recordTTL,
			domain,
			provider,
		} = req.query;

		// If domain is not provided, try to extract it from recordName or find from database
		if (!domain && recordName) {
			// Try to find domain from database using recordName
			let domainFromDb = await Domain.findOne({ websiteName: recordName, deletedAt: { $eq: null } });
			if (domainFromDb) {
				domain = recordName;
			} else if (recordName.includes('.')) {
				// If recordName is a subdomain, try to find the root domain
				const parts = recordName.split('.');
				if (parts.length >= 2) {
					const possibleDomain = parts.slice(-2).join('.'); // Get last two parts (e.g., example.com)
					domainFromDb = await Domain.findOne({ websiteName: possibleDomain, deletedAt: { $eq: null } });
					if (domainFromDb) {
						domain = possibleDomain;
					}
				}
			}
		}

		let domainData = await Domain.findOne({ websiteName: domain, deletedAt: { $eq: null } });

		provider = domainData?.provider || provider;

		// Validate record type for HostBay (only supports: A, AAAA, CNAME, MX, TXT, NS, SRV)
		if (provider === "hostbay") {
			const supportedTypes = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SRV"];
			if (!supportedTypes.includes(recordType?.toUpperCase())) {
				return res.status(400).json({
					responseMsg: {
						id: 0,
						reason: "unsupported_record_type",
						statusCode: 400,
						message: `HostBay does not support ${recordType} records. Supported types: ${supportedTypes.join(", ")}`,
						code: null,
					},
					responseData: null,
					provider: "hostbay",
				});
			}
		}

		if (
			domainData?.provider === "openprovider" &&
			domainData?.cloudflare?.zoneId
		) {
			try {
				const zoneId = domainData?.cloudflare?.zoneId;
				const formattedName =
					recordName === domain
						? "@"
						: recordName.replace(`.${domain}`, "");

				const response = await cloudflare.dns.records.create({
					zone_id: zoneId,
					type: recordType,
					name: formattedName,
					content: recordValue,
					ttl: Number(recordTTL) || 3600,
					proxied: true,
				});

				// Log DNS add activity for Cloudflare
				try {
					await saveActivity({
						userId: req.user.id,
						domain: domain,
						activityType: "dns",
						activity: `Added DNS record ${recordName} (${recordType}) [Cloudflare]`,
						status:
							response?.success === false
								? "Rejected"
								: "Successful",
					});
				} catch (activityError) {
					console.error(
						"Failed to log DNS add activity:",
						activityError
					);
				}

				return res.status(200).json({
					responseMsg: {
						id: 0,
						reason: null,
						statusCode: 200,
						message: "Success",
					},
					responseData: {
						message: "Records ADDED Successfully",
						id: null,
						reason: null,
						statusCode: 200,
					},
				});
			} catch (error) {
				console.error("Error adding DNS record:", error);
				return res.status(500).json({
					responseMsg: {
						id: 0,
						reason: null,
						statusCode: error?.response?.status || 500,
						message:
							error.response?.data?.desc ||
							error?.message ||
							"Unknown error occurred",
					},
					responseData: null,
				});
			}
		}

		// For other providers, use existing logic
		// For HostBay, format record name correctly
		let formattedRecordName = recordName;
		if (provider === "hostbay") {
			// HostBay expects "@" for root domain, or subdomain name without domain suffix
			if (recordName === domain || recordName === "@") {
				formattedRecordName = "@";
			} else if (recordName.endsWith(`.${domain}`)) {
				formattedRecordName = recordName.replace(`.${domain}`, "");
			}
		} else if (provider === "openprovider") {
			formattedRecordName = recordName === domain
				? null
				: recordName.replace(`.${domain}`, "");
		}
		
		const params = {
			RecordName: formattedRecordName,
			RecordType: recordType,
			RecordValue: recordValue,
			RecordPriority: recordPriority,
			RecordTTL: recordTTL,
			WebsiteName: domain,
		};

		// Only add DNSZoneID for providers that need it (not HostBay)
		if (provider !== "hostbay" && dnsZoneId) {
			params.DNSZoneID = dnsZoneId;
		}

		const response = await domainProviderApiClient.request(
			"AddDNSRecord",
			params,
			"POST",
			provider
		);

		// Check if the response indicates an error
		const responseStatusCode = response?.responseMsg?.statusCode;
		const isError = responseStatusCode && responseStatusCode !== 200;


		let errorMessage = response?.responseMsg?.message;
		if (isError && response?.providerError) {

			if (response.providerError.detail && Array.isArray(response.providerError.detail)) {
				const errorDetails = response.providerError.detail
					.map((detail) => detail.msg || detail.message)
					.filter(Boolean)
					.join("; ");
				if (errorDetails) {
					errorMessage = errorDetails;
				}
			} else if (response.providerError.message) {
				errorMessage = response.providerError.message;
			}
		}

		// Log DNS add activity for other providers
		try {
			await saveActivity({
				userId: req.user.id,
				domain: domain,
				activityType: "dns",
				activity: `Added DNS record ${recordName} (${recordType})`,
				status: isError ? "Rejected" : "Successful",
			});
		} catch (activityError) {
			console.error("Failed to log DNS add activity:", activityError);
		}

		// Return appropriate HTTP status code based on response
		if (isError) {

			if (errorMessage && errorMessage !== response?.responseMsg?.message) {
				response.responseMsg.message = errorMessage;
			}
			return res.status(responseStatusCode || 500).json(response);
		}

		return res.status(200).json(response);
	}

	async modifyDNSRecord(req, res) {
		let {
			dnsZoneId,
			dnsZoneRecordId,
			recordId, 
			recordName,
			recordType,
			recordValue,
			recordTTL,
			recordPriority,
			oldRecordName,
			oldRecordType,
			oldRecordValue,
			oldRecordTTL,
			oldRecordPriority,
			domain,
			provider,
		} = req.query;

		// Use recordId if provided, otherwise fall back to dnsZoneRecordId
		const recordIdToUse = recordId || dnsZoneRecordId;

		// If provider is OpenProvider, modify record in Cloudflare
		let domainData = await Domain.findOne({ websiteName: domain, deletedAt: { $eq: null } });

		provider = domainData?.provider || provider;

		// Validate provider is set
		if (!provider) {
			return res.status(400).json({
				responseMsg: {
					id: 0,
					reason: "missing_provider",
					statusCode: 400,
					message: "Provider is required. Please provide 'provider' parameter or ensure domain exists in database.",
					code: null,
				},
				responseData: null,
			});
		}

		// Validate provider is supported
		const supportedProviders = ["hostbay", "openprovider", "connectreseller"];
		if (!supportedProviders.includes(provider.toLowerCase())) {
			return res.status(400).json({
				responseMsg: {
					id: 0,
					reason: "invalid_provider",
					statusCode: 400,
					message: `Unsupported provider: ${provider}. Supported providers: ${supportedProviders.join(", ")}`,
					code: null,
				},
				responseData: null,
			});
		}

		// Normalize provider name to lowercase
		provider = provider.toLowerCase();

		// Validate record ID is provided for HostBay (required in path)
		if (provider === "hostbay" && !recordIdToUse) {
			return res.status(400).json({
				responseMsg: {
					id: 0,
					reason: "missing_record_id",
					statusCode: 400,
					message: "Record ID is required for HostBay. Use 'recordId' or 'dnsZoneRecordId' parameter.",
					code: null,
				},
				responseData: null,
				provider: "hostbay",
			});
		}

		// Validate record type for HostBay (only supports: A, AAAA, CNAME, MX, TXT, NS, SRV)
		if (provider === "hostbay" && recordType) {
			const supportedTypes = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SRV"];
			if (!supportedTypes.includes(recordType?.toUpperCase())) {
				return res.status(400).json({
					responseMsg: {
						id: 0,
						reason: "unsupported_record_type",
						statusCode: 400,
						message: `HostBay does not support ${recordType} records. Supported types: ${supportedTypes.join(", ")}`,
						code: null,
					},
					responseData: null,
					provider: "hostbay",
				});
			}
		}
		if (
			domainData?.provider === "openprovider" &&
			domainData?.cloudflare?.zoneId
		) {
			try {
				const zoneId = domainData?.cloudflare?.zoneId;
				const formattedName =
					recordName === domain
						? "@"
						: recordName.replace(`.${domain}`, "");

				// Update record in Cloudflare
				const response = await cloudflare.dns.records.edit(
					recordIdToUse || dnsZoneRecordId,
					{
						zone_id: zoneId,
						type: recordType,
						name: formattedName,
						content: recordValue,
						ttl: Number(recordTTL) || 3600,
						proxied: true,
					}
				);

				return res.status(200).json({
					responseMsg: {
						id: 0,
						reason: null,
						statusCode: 200,
						message: "Success",
					},
					responseData: {
						message: "Records Modified Successfully",
						id: null,
						reason: null,
						statusCode: 200,
					},
				});
			} catch (error) {
				console.error("Error modifying DNS record:", error);
				return res.status(500).json({
					responseMsg: {
						id: 0,
						reason: null,
						statusCode: error?.response?.status || 500,
						message:
							error.response?.data?.desc ||
							error?.message ||
							"Unknown error occurred",
					},
					responseData: null,
				});
			}
		}

		// For other providers, use existing logic
		// For HostBay, format record names correctly
		let formattedRecordName = recordName;
		let formattedOldRecordName = oldRecordName;
		
		if (provider === "hostbay") {
	
			if (recordName === domain || recordName === "@") {
				formattedRecordName = "@";
			} else if (recordName && recordName.endsWith(`.${domain}`)) {
				formattedRecordName = recordName.replace(`.${domain}`, "");
			}
			
			if (oldRecordName === domain || oldRecordName === "@") {
				formattedOldRecordName = "@";
			} else if (oldRecordName && oldRecordName.endsWith(`.${domain}`)) {
				formattedOldRecordName = oldRecordName.replace(`.${domain}`, "");
			}
		} else if (provider === "openprovider") {
			formattedRecordName = recordName === domain
				? null
				: recordName.replace(`.${domain}`, "");
			formattedOldRecordName = oldRecordName === domain
				? null
				: oldRecordName.replace(`.${domain}`, "");
		}
		
		const params = {
			DNSZoneID: dnsZoneId,
			DNSZoneRecordID: recordIdToUse, // Use the resolved record ID
			RecordID: recordIdToUse, // Also provide as RecordID for HostBay compatibility
			RecordName: formattedRecordName,
			RecordType: recordType,
			RecordValue: recordValue,
			RecordTTL: recordTTL,
			RecordPriority: recordPriority,
			OldRecordName: formattedOldRecordName,
			OldRecordType: oldRecordType,
			OldRecordValue: oldRecordValue,
			OldRecordTTL: oldRecordTTL,
			OldRecordPriority: oldRecordPriority,
			WebsiteName: domain,
		};

		// Only add DNSZoneID for providers that need it (not HostBay)
		if (provider === "hostbay") {
			delete params.DNSZoneID;
		}
		
		// ModifyDNSRecord is a PUT request for HostBay
		let response;
		try {
			response = await domainProviderApiClient.request(
				"ModifyDNSRecord",
				params,
				provider === "hostbay" ? "PUT" : null,
				provider
			);
		} catch (error) {
			console.error("Error calling domainProviderApiClient:", error);
			return res.status(500).json({
				responseMsg: {
					id: 0,
					reason: "api_client_error",
					statusCode: 500,
					message: error.message || "Failed to modify DNS record",
					code: null,
				},
				responseData: null,
				provider: provider,
			});
		}

		// Check if the response indicates an error
		const responseStatusCode = response?.responseMsg?.statusCode;
		const isError = responseStatusCode && responseStatusCode !== 200;

		// Extract error message from providerError if available
		let errorMessage = response?.responseMsg?.message;
		if (isError && response?.providerError) {
			// Try to extract a more descriptive error message from providerError
			if (response.providerError.detail && Array.isArray(response.providerError.detail)) {
				const errorDetails = response.providerError.detail
					.map((detail) => detail.msg || detail.message)
					.filter(Boolean)
					.join("; ");
				if (errorDetails) {
					errorMessage = errorDetails;
				}
			} else if (response.providerError.message) {
				errorMessage = response.providerError.message;
			}
		}

		// Log DNS modify activity
		try {
			await saveActivity({
				userId: req.user.id,
				domain: domain,
				activityType: "dns",
				activity: `Modified DNS record ${recordName} (${recordType})`,
				status: isError ? "Rejected" : "Successful",
			});
		} catch (activityError) {
			console.error("Failed to log DNS modify activity:", activityError);
		}

		// Return appropriate HTTP status code based on response
		if (isError) {
			// Update the response message with the extracted error message
			if (errorMessage && errorMessage !== response?.responseMsg?.message) {
				response.responseMsg.message = errorMessage;
			}
			return res.status(responseStatusCode || 500).json(response);
		}

		// Send DNS record updated email
		try {
			const user = await User.findById(req.user?.id || req.user?._id);
			if (user && user.email && !isError) {
				const { shouldSendEmail } = require("../../utils/notificationHelper");
				const canSendEmail = await shouldSendEmail(user, 'serviceStatusAndChanges');
				if (canSendEmail) {
					let html = nunjucks.render('mails/dns_record_updated.html', {
						NAME: user.name || user.email,
						DOMAIN_NAME: domain,
						RECORD_TYPE: recordType,
						RECORD_NAME: recordName,
						OLD_VALUE: oldRecordValue || 'N/A',
						NEW_VALUE: recordValue,
						dnsSettingsLink: env.FRONTEND_URL + `/domains/${domain}/dns`,
						logoUrl: env.FRONTEND_URL
					});
					
					await transporter.sendMail({
						from: process.env.MAIL_FROM_ADDRESS,
						to: user.email,
						subject: `DNS record updated - ${domain}`,
						html: html,
					});
				}
			}
		} catch (emailError) {
			console.error("Error sending DNS record updated email:", emailError);
		}

		return res.status(200).json(response);
	}

	async deleteDNSRecord(req, res) {
		let {
			dnsZoneId,
			dnsZoneRecordId,
			recordId, // Also accept recordId as alias (HostBay uses this)
			domain,
			recordName,
			recordTTL,
			recordPriority,
			recordType,
			recordValue,
			provider,
		} = req.query;

		// Use recordId if provided, otherwise fall back to dnsZoneRecordId
		const recordIdToUse = recordId || dnsZoneRecordId;

		// If provider is OpenProvider, delete record from Cloudflare
		let domainData = await Domain.findOne({ websiteName: domain });

		provider = domainData?.provider || provider;

		// Validate provider is set
		if (!provider) {
			return res.status(400).json({
				responseMsg: {
					id: 0,
					reason: "missing_provider",
					statusCode: 400,
					message: "Provider is required. Please provide 'provider' parameter or ensure domain exists in database.",
					code: null,
				},
				responseData: null,
			});
		}

		// Validate provider is supported
		const supportedProviders = ["hostbay", "openprovider", "connectreseller"];
		if (!supportedProviders.includes(provider.toLowerCase())) {
			return res.status(400).json({
				responseMsg: {
					id: 0,
					reason: "invalid_provider",
					statusCode: 400,
					message: `Unsupported provider: ${provider}. Supported providers: ${supportedProviders.join(", ")}`,
					code: null,
				},
				responseData: null,
			});
		}

		// Normalize provider name to lowercase
		provider = provider.toLowerCase();

		// Validate record ID is provided for HostBay (required in path)
		if (provider === "hostbay" && !recordIdToUse) {
			return res.status(400).json({
				responseMsg: {
					id: 0,
					reason: "missing_record_id",
					statusCode: 400,
					message: "Record ID is required for HostBay. Use 'recordId' or 'dnsZoneRecordId' parameter.",
					code: null,
				},
				responseData: null,
				provider: "hostbay",
			});
		}
		if (
			domainData?.provider === "openprovider" &&
			domainData?.cloudflare?.zoneId
		) {
			try {
				const zoneId = domainData?.cloudflare?.zoneId;

				// Delete record from Cloudflare
				await cloudflare.dns.records.delete(recordIdToUse || dnsZoneRecordId, {
					zone_id: zoneId,
				});

				return res.status(200).json({
					responseMsg: {
						id: 0,
						reason: null,
						statusCode: 200,
						message: "Success",
					},
					responseData: {
						message: "Records Deleted Successfully",
						id: null,
						reason: null,
						statusCode: 200,
					},
				});
			} catch (error) {
				console.error("Error deleting DNS record:", error);
				return res.status(500).json({
					responseMsg: {
						id: 0,
						reason: null,
						statusCode: error?.response?.status || 500,
						message:
							error.response?.data?.desc ||
							error?.message ||
							"Unknown error occurred",
					},
					responseData: null,
				});
			}
		}

		// For other providers, use existing logic
		// For HostBay, format record name correctly
		let formattedRecordName = recordName;
		
		if (provider === "hostbay") {
			// HostBay expects "@" for root domain, or subdomain name without domain suffix
			if (recordName === domain || recordName === "@") {
				formattedRecordName = "@";
			} else if (recordName && recordName.endsWith(`.${domain}`)) {
				formattedRecordName = recordName.replace(`.${domain}`, "");
			}
		} else if (provider === "openprovider") {
			formattedRecordName = recordName === domain
				? null
				: recordName.replace(`.${domain}`, "");
		}
		
		const params = {
			DNSZoneID: dnsZoneId,
			DNSZoneRecordID: recordIdToUse, // Use the resolved record ID
			RecordID: recordIdToUse, // Also provide as RecordID for HostBay compatibility
			RecordName: formattedRecordName,
			RecordType: recordType,
			RecordValue: recordValue,
			RecordTTL: recordTTL,
			RecordPriority: recordPriority,
			WebsiteName: domain,
		};

		// Only add DNSZoneID for providers that need it (not HostBay)
		if (provider === "hostbay") {
			delete params.DNSZoneID;
		}
		
		// DeleteDNSRecord is a DELETE request for HostBay
		let response;
		try {
			response = await domainProviderApiClient.request(
				"DeleteDNSRecord",
				params,
				provider === "hostbay" ? "DELETE" : null,
				provider
			);
		} catch (error) {
			console.error("Error calling domainProviderApiClient:", error);
			return res.status(500).json({
				responseMsg: {
					id: 0,
					reason: "api_client_error",
					statusCode: 500,
					message: error.message || "Failed to delete DNS record",
					code: null,
				},
				responseData: null,
				provider: provider,
			});
		}

		// Check if the response indicates an error
		const responseStatusCode = response?.responseMsg?.statusCode;
		const isError = responseStatusCode && responseStatusCode !== 200;

		// Extract error message from providerError if available
		let errorMessage = response?.responseMsg?.message;
		if (isError && response?.providerError) {
			// Try to extract a more descriptive error message from providerError
			if (response.providerError.detail && Array.isArray(response.providerError.detail)) {
				const errorDetails = response.providerError.detail
					.map((detail) => detail.msg || detail.message)
					.filter(Boolean)
					.join("; ");
				if (errorDetails) {
					errorMessage = errorDetails;
				}
			} else if (response.providerError.message) {
				errorMessage = response.providerError.message;
			}
		}

		// Log DNS delete activity
		try {
			await saveActivity({
				userId: req.user.id,
				domain: domain,
				activityType: "dns",
				activity: `Deleted DNS record ${recordName || recordIdToUse} (${recordType || "N/A"})`,
				status: isError ? "Rejected" : "Successful",
			});
		} catch (activityError) {
			console.error("Failed to log DNS delete activity:", activityError);
		}

		// Return appropriate HTTP status code based on response
		if (isError) {
			// Update the response message with the extracted error message
			if (errorMessage && errorMessage !== response?.responseMsg?.message) {
				response.responseMsg.message = errorMessage;
			}
			return res.status(responseStatusCode || 500).json(response);
		}

		// Send DNS record deleted email
		try {
			const user = await User.findById(req.user?.id || req.user?._id);
			if (user && user.email && !isError) {
				const { shouldSendEmail } = require("../../utils/notificationHelper");
				const canSendEmail = await shouldSendEmail(user, 'serviceStatusAndChanges');
				if (canSendEmail) {
					let html = nunjucks.render('mails/dns_record_deleted.html', {
						NAME: user.name || user.email,
						DOMAIN_NAME: domain,
						RECORD_TYPE: recordType || 'N/A',
						RECORD_NAME: recordName || recordIdToUse,
						RECORD_VALUE: recordValue || 'N/A',
						dnsSettingsLink: env.FRONTEND_URL + `/domains/${domain}/dns`,
						logoUrl: env.FRONTEND_URL
					});
					
					await transporter.sendMail({
						from: process.env.MAIL_FROM_ADDRESS,
						to: user.email,
						subject: `DNS record removed - ${domain}`,
						html: html,
					});
				}
			}
		} catch (emailError) {
			console.error("Error sending DNS record deleted email:", emailError);
		}

		return res.status(200).json(response);
	}

	async viewDNSRecord(req, res) {
		const { domain, domainId, provider } = req.query;
		let domainData = await Domain.findOne({ websiteName: domain, deletedAt: { $eq: null } });

		// If provider is OpenProvider, get records from Cloudflare
		if (
			domainData?.provider === "openprovider" &&
			domainData?.cloudflare?.zoneId
		) {
			try {
				const zoneId = domainData?.cloudflare?.zoneId;
				// Get records from Cloudflare
				const response = await cloudflare.dns.records.list({
					zone_id: zoneId,
				});
				console.log("response ===========>", response);
				// Format records to match OpenProvider format
				const formattedRecords = response.result.map((record) => ({
					// name: record.name === '@' ? domain : `${record.name}`,
					name: record.name,
					type: record.type,
					value: record.content,
					ttl: record.ttl,
					priority: record.priority,
					id: record.id,
					modified_on: record.modified_on,
					created_on: record.created_on,
				}));

				formattedRecords.sort((a, b) => {
					const aTime = a.modified_on ? new Date(a.modified_on).getTime() : (a.created_on ? new Date(a.created_on).getTime() : 0);
					const bTime = b.modified_on ? new Date(b.modified_on).getTime() : (b.created_on ? new Date(b.created_on).getTime() : 0);
					return bTime - aTime; 
				});

				return res.status(200).json({
					responseMsg: {
						id: 0,
						reason: null,
						statusCode: 200,
						message: "Success",
					},
					responseData: {
						records: formattedRecords,
						statusCode: 200,
					},
				});
			} catch (error) {
				console.error("Error viewing DNS records:", error);
				return res.status(500).json({
					responseMsg: {
						id: 0,
						reason: null,
						statusCode: error?.response?.status || 500,
						message:
							error.response?.data?.desc ||
							error?.message ||
							"Unknown error occurred",
					},
					responseData: null,
				});
			}
		}

		// For HostBay, we can directly fetch DNS records without needing websiteId
		if (provider === "hostbay" || domainData?.provider === "hostbay") {
			const params = {
				WebsiteName: domain,
			};
			const response = await domainProviderApiClient.get(
				"ViewDNSRecord",
				params,
				"hostbay"
			);
			
			// Sort records by most recent first if records exist
			if (response?.responseData?.records && Array.isArray(response.responseData.records)) {
				response.responseData.records.sort((a, b) => {
					// Sort by modified_on if available, otherwise by created_on, otherwise by id (descending)
					const aTime = a.modified_on ? new Date(a.modified_on).getTime() : 
								  (a.created_on ? new Date(a.created_on).getTime() : 
								   (a.updated_at ? new Date(a.updated_at).getTime() : 
								    (a.id ? parseInt(a.id) : 0)));
					const bTime = b.modified_on ? new Date(b.modified_on).getTime() : 
								  (b.created_on ? new Date(b.created_on).getTime() : 
								   (b.updated_at ? new Date(b.updated_at).getTime() : 
								    (b.id ? parseInt(b.id) : 0)));
					return bTime - aTime; // Descending order (most recent first)
				});
			}
			
			return res.status(200).json(response);
		}
		
		// For other providers, use existing logic
		const detail = await domainProviderApiClient.request(
			"ViewDomain",
			{
				websiteName: domain,
				domainId,
			},
			null,
			provider
		);
		const id = detail.responseData?.websiteId;
		const params = {
			WebsiteName: domain,
			WebsiteId: id,
		};
		const response = await domainProviderApiClient.get(
			"ViewDNSRecord",
			params,
			provider
		);
		
		// Sort records by most recent first if records exist
		if (response?.responseData?.records && Array.isArray(response.responseData.records)) {
			response.responseData.records.sort((a, b) => {
				// Sort by modified_on if available, otherwise by created_on, otherwise by id (descending)
				const aTime = a.modified_on ? new Date(a.modified_on).getTime() : 
							  (a.created_on ? new Date(a.created_on).getTime() : 
							   (a.updated_at ? new Date(a.updated_at).getTime() : 
							    (a.lastModifyDate ? new Date(a.lastModifyDate).getTime() : 
							     (a.id ? parseInt(a.id) : 0))));
				const bTime = b.modified_on ? new Date(b.modified_on).getTime() : 
							  (b.created_on ? new Date(b.created_on).getTime() : 
							   (b.updated_at ? new Date(b.updated_at).getTime() : 
							    (b.lastModifyDate ? new Date(b.lastModifyDate).getTime() : 
							     (b.id ? parseInt(b.id) : 0))));
				return bTime - aTime; // Descending order (most recent first)
			});
		}
		
		return res.status(200).json(response);
	}

	// DNSSEC CRUD APIs
	async viewDNSSEC(req, res) {
		let { domain, provider } = req.query;
		console.log("provider ===========>", provider);
		if (!provider) {
			provider = "connectreseller";
		}
		try {
			let domainData = await Domain.findOne({ websiteName: domain, deletedAt: { $eq: null } });
			if (
				domainData?.provider === "openprovider" &&
				domainData?.cloudflare?.zoneId
			) {
				const zoneId = domainData.cloudflare.zoneId;
				const response = await cloudflareDNSSEC.read(zoneId);
				return res.status(200).json({
					responseMsg: { statusCode: 200, message: "Success" },
					responseData: { dnssec: response.result },
				});
			}
			if (
				domainData?.provider === "hostbay" &&
				domainData?.cloudflare?.zoneId
			) {
				const zoneId = domainData.cloudflare.zoneId;
				const response = await cloudflareDNSSEC.read(zoneId);
				return res.status(200).json({
					responseMsg: { statusCode: 200, message: "Success" },
					responseData: { dnssec: response.result },
				});
			}
			let response;
			if (provider === "openprovider") {
				// OpenProvider: Get domain details, extract DNSSEC info
				response = await domainProviderApiClient.get(
					"ViewDomain",
					{ websiteName: domain },
					provider
				);
				const dnssec = response?.responseData?.dnssec || [];
				return res.status(200).json({
					responseMsg: { statusCode: 200, message: "Success" },
					responseData: { dnssec },
				});
			} else if (provider === "hostbay") {
				// HostBay: Use GetDNSSec
				response = await domainProviderApiClient.get(
					"GetDNSSec",
					{ domain, websiteName: domain },
					provider
				);
				return res.status(200).json(response);
			} else {
				// ConnectReseller: Use GetDNSSec
				response = await domainProviderApiClient.get(
					"GetDNSSec",
					{ domain },
					provider
				);
				return res.status(200).json(response);
			}
		} catch (error) {
			return res
				.status(500)
				.json({ message: error.message || "Error viewing DNSSEC" });
		}
	}

	async addDNSSEC(req, res) {
		const { domain, provider } = req.body;
		try {
			let domainData = await Domain.findOne({ websiteName: domain, deletedAt: { $eq: null } });
			let response,
				status = "Successful";
			if (
				domainData?.provider === "openprovider" &&
				domainData?.cloudflare?.zoneId
			) {
				const zoneId = domainData.cloudflare.zoneId;
				response = await cloudflareDNSSEC.edit(zoneId, {
					status: "active",
				});
				status =
					response?.success === false ? "Rejected" : "Successful";
			} else if (
				domainData?.provider === "hostbay" &&
				domainData?.cloudflare?.zoneId
			) {
				const zoneId = domainData.cloudflare.zoneId;
				response = await cloudflareDNSSEC.edit(zoneId, {
					status: "active",
				});
				status =
					response?.success === false ? "Rejected" : "Successful";
			} else if (provider === "openprovider") {
				// OpenProvider: Update domain with DNSSEC data
				const { keyTag, algorithm, digestType, digest } = req.body;
				const params = {
					websiteName: domain,
					dnssec: [{ keyTag, algorithm, digestType, digest }],
				};
				response = await domainProviderApiClient.request(
					"ManageDomainDNSSEC",
					params,
					"PUT",
					provider
				);
			} else if (provider === "hostbay") {
				const { keyTag, algorithm, digestType, digest } = req.body;
				const params = {
					domain,
					websiteName: domain,
					keyTag,
					algorithm,
					digestType,
					digest,
				};
				response = await domainProviderApiClient.request(
					"AddDNSSec",
					params,
					"POST",
					provider
				);
			} else {
				// ConnectReseller: AddDNSSec
				const { keyTag, algorithm, digestType, digest } = req.body;
				const params = {
					domain,
					keyTag,
					algorithm,
					digestType,
					digest,
				};
				response = await domainProviderApiClient.request(
					"AddDNSSec",
					params,
					"POST",
					provider
				);
			}

			// Log DNSSEC add activity
			try {
				await saveActivity({
					userId: req.user.id,
					domain: domain,
					activityType: "dnssec",
					activity: `Added DNSSEC record`,
					status,
				});
			} catch (activityError) {
				console.error(
					"Failed to log DNSSEC add activity:",
					activityError
				);
			}
			return res.status(200).json(response);
		} catch (error) {
			console.log("error ===========>", error);
			return res
				.status(500)
				.json({ message: error.message || "Error adding DNSSEC" });
		}
	}

	async modifyDNSSEC(req, res) {
		const { domain, provider } = req.body;
		try {
			let domainData = await Domain.findOne({ websiteName: domain, deletedAt: { $eq: null } });
			let response,
				status = "Successful";
			if (
				domainData?.provider === "openprovider" &&
				domainData?.cloudflare?.zoneId
			) {
				const zoneId = domainData.cloudflare.zoneId;
				response = await cloudflareDNSSEC.edit(zoneId, {
					status: "active",
				});
				status =
					response?.success === false ? "Rejected" : "Successful";
			} else if (
				domainData?.provider === "hostbay" &&
				domainData?.cloudflare?.zoneId
			) {
				const zoneId = domainData.cloudflare.zoneId;
				response = await cloudflareDNSSEC.edit(zoneId, {
					status: "active",
				});
				status =
					response?.success === false ? "Rejected" : "Successful";
			} else if (provider === "openprovider") {
				const {
					keyTag,
					algorithm,
					digestType,
					digest,
					oldKeyTag,
					oldAlgorithm,
					oldDigestType,
					oldDigest,
				} = req.body;
				// OpenProvider: Update domain with new DNSSEC data
				const params = {
					websiteName: domain,
					dnssec: [{ keyTag, algorithm, digestType, digest }],
					oldDnssec: [
						{
							keyTag: oldKeyTag,
							algorithm: oldAlgorithm,
							digestType: oldDigestType,
							digest: oldDigest,
						},
					],
				};
				response = await domainProviderApiClient.request(
					"ManageDomainDNSSEC",
					params,
					"PUT",
					provider
				);
			} else if (provider === "hostbay") {
				const {
					keyTag,
					algorithm,
					digestType,
					digest,
					oldKeyTag,
					oldAlgorithm,
					oldDigestType,
					oldDigest,
				} = req.body;
				// HostBay: Delete old, add new
				await domainProviderApiClient.request(
					"DeleteDNSSec",
					{
						domain,
						websiteName: domain,
						keyTag: oldKeyTag,
						algorithm: oldAlgorithm,
						digestType: oldDigestType,
						digest: oldDigest,
					},
					"DELETE",
					provider
				);
				response = await domainProviderApiClient.request(
					"AddDNSSec",
					{ domain, websiteName: domain, keyTag, algorithm, digestType, digest },
					"POST",
					provider
				);
			} else {
				const {
					keyTag,
					algorithm,
					digestType,
					digest,
					oldKeyTag,
					oldAlgorithm,
					oldDigestType,
					oldDigest,
				} = req.body;
				// ConnectReseller: Delete old, add new
				await domainProviderApiClient.request(
					"DeleteDNSSec",
					{
						domain,
						keyTag: oldKeyTag,
						algorithm: oldAlgorithm,
						digestType: oldDigestType,
						digest: oldDigest,
					},
					"POST",
					provider
				);
				response = await domainProviderApiClient.request(
					"AddDNSSec",
					{ domain, keyTag, algorithm, digestType, digest },
					"POST",
					provider
				);
			}

			// Log DNSSEC modify activity
			try {
				await saveActivity({
					userId: req.user.id,
					domain: domain,
					activityType: "dnssec",
					activity: `Modified DNSSEC record`,
					status,
				});
			} catch (activityError) {
				console.error(
					"Failed to log DNSSEC modify activity:",
					activityError
				);
			}
			return res.status(200).json(response);
		} catch (error) {
			console.log("error ===========>", error);
			return res
				.status(500)
				.json({ message: error.message || "Error modifying DNSSEC" });
		}                 
	}                 
                                     
	async deleteDNSSEC(req, res) {
		const { domain, provider } = req.body;  
		try {
			let domainData = await Domain.findOne({ websiteName: domain, deletedAt: { $eq: null } });
			let response,
				status = "Successful";
			if (
				domainData?.provider === "openprovider" &&
				domainData?.cloudflare?.zoneId
			) {
				const zoneId = domainData.cloudflare.zoneId;
				response = await cloudflareDNSSEC.edit(zoneId, {
					status: "disabled",
				});
				status =
					response?.success === false ? "Rejected" : "Successful";
			} else if (
				domainData?.provider === "hostbay" &&
				domainData?.cloudflare?.zoneId
			) {
				const zoneId = domainData.cloudflare.zoneId;
				response = await cloudflareDNSSEC.edit(zoneId, {
					status: "disabled",
				});
				status =
					response?.success === false ? "Rejected" : "Successful";
			} else if (provider === "openprovider") {
				const { keyTag, algorithm, digestType, digest } = req.body;
				// OpenProvider: Remove DNSSEC data
				const params = {
					websiteName: domain,
					dnssec: [], // Remove all
				};
				response = await domainProviderApiClient.request(
					"ManageDomainDNSSEC",
					params,
					"PUT",
					provider
				);
			} else if (provider === "hostbay") {
				const { keyTag, algorithm, digestType, digest } = req.body;                                                                                                                         
				// HostBay: DeleteDNSSec   
				const params = {
					domain,
					websiteName: domain,
					keyTag,
					algorithm,
					digestType,
					digest,
				};
				response = await domainProviderApiClient.request(
					"DeleteDNSSec",
					params,
					"DELETE",
					provider
				);
			} else {
				const { keyTag, algorithm, digestType, digest } = req.body;
				// ConnectReseller: DeleteDNSSec
				const params = {
					domain,
					keyTag,
					algorithm,
					digestType,
					digest,
				};
				response = await domainProviderApiClient.request(
					"DeleteDNSSec",
					params,
					"POST",
					provider
				);
			}

			// Log DNSSEC delete activity
			try {
				await saveActivity({
					userId: req.user.id,
					domain: domain,
					activityType: "dnssec",
					activity: `Deleted DNSSEC record`,
					status,
				});
			} catch (activityError) {
				console.error(
					"Failed to log DNSSEC delete activity:",
					activityError
				);
			}      
			return res.status(200).json(response);
		} catch (error) {
			return res
				.status(500)                   
				.json({ message: error.message || "Error deleting DNSSEC" });         
		}  
	}                                                            
          
	// DNS History APIs 
	async getDNSHistory(req, res) {
		const { domain, limit, offset } = req.query;
		let { provider } = req.query;
		try {
			let domainData = await Domain.findOne({ websiteName: domain, deletedAt: { $eq: null } });
			provider = domainData?.provider || provider || "connectreseller";

			const params = {
				websiteName: domain,
				limit: limit || 50,
				offset: offset || 0,
			};

			const response = await domainProviderApiClient.get(
				"GetDNSHistory",
				params,
				provider
			);                  

			const responseStatus =
				response?.responseMsg?.statusCode || response?.statusCode;
			const providerErrorDetail = response?.providerError?.detail;

			// HostBay returns 404 when no history exists - treat as empty result
			if (
				responseStatus === 404 ||
				(typeof providerErrorDetail === "string" &&
					providerErrorDetail.toLowerCase() === "not found")
			) {
				return res.status(200).json({
					responseMsg: {
						id: 0,
						reason: null,
						statusCode: 200,                              
						message: "No DNS history found",
						code: null,
					},
					responseData: {
						history: [],
						total: 0,
					},
					provider,
				});     
			}

			// Ensure history array exists to avoid undefined issues on frontend
			let historyData = response?.responseData?.history || [];
			if (!Array.isArray(historyData)) {
				historyData = [];
			}

			// Clean up old restore tracking entries
			cleanupRestoredRecords();

			// Filter out entries that match recently restored records
			const restoredRecords = restoredDNSRecords.get(domain) || [];
			const filteredHistory = historyData.filter((item) => {
				if (restoredRecords.length === 0) {
					return true; // No restored records to filter
				}

				const itemName = item.name || "";
				const itemType = item.record_type || item.type || "";
				const itemDate = item.date || item.created_at;
				
				if (!itemDate) {
					return true; // Keep entries without dates
				}

				// Check if this entry matches a recently restored record
				for (const restored of restoredRecords) {
					const itemTimestamp = new Date(itemDate).getTime();
					const timeDiff = itemTimestamp - restored.restoredAt;
					// Filter entries created within 10 seconds after restore that match the record
					if (
						timeDiff >= 0 && 
						timeDiff <= 10000 && // 10 seconds window
						itemName === restored.recordName &&
						itemType === restored.recordType
					) {
						return false; // Exclude this entry
					}
				}
				return true;
			});

			response.responseData = {
				...(response.responseData || {}),
				history: filteredHistory,
				total: filteredHistory.length,
			};

			return res.status(200).json(response);
		} catch (error) { 
			console.error("Error fetching DNS history:", error);      

			// Gracefully handle `Not Found` responses from provider
			if (
				error?.response?.status === 404 ||
				error?.response?.data?.detail === "Not Found"
			) {
				return res.status(200).json({
					responseMsg: {
						id: 0,
						reason: null,   
						statusCode: 200,
						message: "No DNS history found",         
						code: null,       
					},             
					responseData: {                 
						history: [],
						total: 0,           
					},
					provider,         
				});
			}        
               
			return res.status(500).json({
				responseMsg: {
					id: 0,
					reason: null,
					statusCode: 500,
					message: error.message || "Error fetching DNS history",
				},
				responseData: null,
			});
		}
	}

	async restoreDNSHistory(req, res) {
		const { domain, historyId } = req.body;
		let { provider } = req.body;
		try {
			let domainData = await Domain.findOne({ websiteName: domain, deletedAt: { $eq: null } });
			provider = domainData?.provider || provider || "connectreseller";

			// Get DNS history to find the specific history entry
			const historyParams = {
				websiteName: domain,
				limit: 100,
				offset: 0,
			};

			const historyResponse = await domainProviderApiClient.get(
				"GetDNSHistory",
				historyParams,
				provider
			);

			const historyData = historyResponse?.responseData?.history || [];
			const historyEntry = Array.isArray(historyData) 
				? historyData.find(item => (item.id || item.history_id) == historyId)
				: null;

			if (!historyEntry) {
				return res.status(404).json({
					responseMsg: {
						id: 0,
						reason: "history_not_found",
						statusCode: 404,
						message: "DNS history record not found. The history ID may not exist or DNS history may not be available for this domain.",
						code: null,
					},
					responseData: null,
					provider,
				});
			}
	
			const action = historyEntry.action || historyEntry.action_type || "create";
			const recordType = historyEntry.record_type || historyEntry.type;
			let recordName = historyEntry.name;
			const recordContent = historyEntry.content || historyEntry.value;
			const recordTTL = historyEntry.ttl || historyEntry.old_ttl || 3600;
			const recordPriority = historyEntry.priority !== null && historyEntry.priority !== undefined 
				? historyEntry.priority 
				: (historyEntry.old_priority !== null && historyEntry.old_priority !== undefined ? historyEntry.old_priority : 0);
			const recordId = historyEntry.cloudflare_record_id || historyEntry.record_id;

			let restoreResult = null;
			let restoreError = null;

			try {
				// Format record name based on provider
				let formattedRecordName = recordName;
				if (provider === "hostbay") {
					if (recordName === domain || recordName === "@") {
						formattedRecordName = "@";
					} else if (recordName.endsWith(`.${domain}`)) {
						formattedRecordName = recordName.replace(`.${domain}`, "");
					}
				} else if (provider === "openprovider") {
					formattedRecordName = recordName === domain
						? null
						: recordName.replace(`.${domain}`, "");
				}

				// Handle Cloudflare-managed domains
				if (domainData?.provider === "openprovider" && domainData?.cloudflare?.zoneId) {
					const zoneId = domainData?.cloudflare?.zoneId;
					const cfFormattedName = recordName === domain
						? "@"
						: recordName.replace(`.${domain}`, "");

					if (action === "delete") {
						// Restore deleted record by adding it back to Cloudflare
						const response = await cloudflare.dns.records.create({
							zone_id: zoneId,
							type: recordType,
							name: cfFormattedName,
							content: recordContent,
							ttl: Number(recordTTL) || 3600,
							proxied: true,
						});
						restoreResult = { responseMsg: { statusCode: 200 }, responseData: response };
					} else if (action === "create") {
						// Restore created record by adding it back
						const response = await cloudflare.dns.records.create({
							zone_id: zoneId,
							type: recordType,
							name: cfFormattedName,
							content: recordContent,
							ttl: Number(recordTTL) || 3600,
							priority: recordPriority || undefined,
							proxied: true,
						});
						restoreResult = { responseMsg: { statusCode: 200 }, responseData: response };
					} else if (action === "update" && recordId) {
						// Restore updated record by modifying it back to old values
						const oldContent = historyEntry.old_content || historyEntry.old_value || recordContent;
						const oldTTL = historyEntry.old_ttl || recordTTL;
						
						const response = await cloudflare.dns.records.edit(recordId, {
							zone_id: zoneId,
							type: recordType,
							name: cfFormattedName,
							content: oldContent,
							ttl: Number(oldTTL) || 3600,
							priority: historyEntry.old_priority !== undefined ? historyEntry.old_priority : (recordPriority || undefined),
							proxied: true,
						});
						restoreResult = { responseMsg: { statusCode: 200 }, responseData: response };
					}
				} else {
					// For other providers (HostBay, etc.), use domainProviderApiClient
					if (action === "delete" || action === "create") {
						// Restore by adding the record
						const addParams = {
							RecordName: formattedRecordName,
							RecordType: recordType,
							RecordValue: recordContent,
							RecordTTL: recordTTL,
							RecordPriority: recordPriority || 0,
							WebsiteName: domain,
						};

						restoreResult = await domainProviderApiClient.request(
							"AddDNSRecord",
							addParams,
							"POST",
							provider
						);
					} else if (action === "update") {
						// Restore by modifying to old values
						const oldContent = historyEntry.old_content || historyEntry.old_value || recordContent;
						const oldTTL = historyEntry.old_ttl || recordTTL;
						const oldPriority = historyEntry.old_priority !== undefined ? historyEntry.old_priority : recordPriority;
						
						const modifyParams = {
							WebsiteName: domain,
							RecordID: recordId,
							RecordName: formattedRecordName,
							RecordType: recordType,
							RecordValue: oldContent,
							RecordTTL: oldTTL,
							RecordPriority: oldPriority || 0,
							OldRecordName: formattedRecordName,
							OldRecordType: recordType,
							OldRecordValue: recordContent,
							OldRecordTTL: recordTTL,
							OldRecordPriority: recordPriority || 0,
						};

						restoreResult = await domainProviderApiClient.request(
							"ModifyDNSRecord",
							modifyParams,
							"PUT",
							provider
						);
					}
				}

				// Check if restore was successful
				const restoreStatus = restoreResult?.responseMsg?.statusCode || restoreResult?.statusCode || (restoreResult?.success === false ? 500 : 200);
				
				if (restoreStatus !== 200) {
					restoreError = restoreResult?.responseMsg?.message || restoreResult?.responseData?.message || "Failed to restore DNS record";
				}
			} catch (restoreErr) {
				console.error("Error restoring DNS record from history:", restoreErr);
				restoreError = restoreErr.message || restoreErr?.response?.data?.message || "Failed to restore DNS record";
			}

			if (restoreError) {
				return res.status(500).json({
					responseMsg: {
						id: 0,
						reason: "restore_failed",
						statusCode: 500,
						message: restoreError,
						code: null,
					},
					responseData: null,
					provider,
				});
			}

			// Track the restored record to filter it from history
			const restoredRecords = restoredDNSRecords.get(domain) || [];
			restoredRecords.push({
				recordName: recordName,
				recordType: recordType,
				restoredAt: Date.now(),
			});
			restoredDNSRecords.set(domain, restoredRecords);
			
			// Clean up old entries periodically
			if (restoredRecords.length > 10) {
				cleanupRestoredRecords();
			}

			try {
				await saveActivity({
					userId: req.user.id,
					domain: domain,
					activityType: "dns",
					activity: `Restored DNS record from history (Platform Managed): ${recordType} ${recordName}`,
					status: "Successful",
				});
			} catch (activityError) {
				console.error("Failed to log DNS restore activity:", activityError);
			}

			return res.status(200).json({
				responseMsg: {
					id: 0,
					reason: null,
					statusCode: 200,
					message: "DNS configuration restored successfully.",
					code: null,
				},
				responseData: {
					message: "DNS history restored successfully",
					historyId: historyId,
					domain: domain,
					action: action,
					recordType: recordType,
					recordName: recordName,
				},
				provider,
			});
		} catch (error) {
			console.error("Error restoring DNS history:", error);

			// Handle 404 errors gracefully
			if (
				error?.response?.status === 404 ||
				error?.response?.data?.detail === "Not Found"
			) {
				return res.status(404).json({
					responseMsg: {
						id: 0,
						reason: "history_not_found",
						statusCode: 404,
						message: "DNS history record not found. The history ID may not exist or DNS history may not be available for this domain.",
						code: null,
					},
					responseData: null,
					provider: provider || "unknown",
				});
			}

			return res.status(500).json({
				responseMsg: {
					id: 0,
					reason: null,
					statusCode: 500,
					message: error.message || "Error restoring DNS history",
				},
				responseData: null,
			});
		}
	}

	async viewNameservers(req, res) {
		let { domain, provider } = req.query;

		// Get domain data to determine provider
		let domainData = await Domain.findOne({ websiteName: domain, deletedAt: { $eq: null } });
		provider = domainData?.provider || provider || "hostbay";

		// Validate provider is set
		if (!provider) {
			return res.status(400).json({
				responseMsg: {
					id: 0,
					reason: "missing_provider",
					statusCode: 400,
					message: "Provider is required. Please provide 'provider' parameter or ensure domain exists in database.",
					code: null,
				},
				responseData: null,
			});
		}

		// Normalize provider name to lowercase
		provider = provider.toLowerCase();

		try {
			// Get nameservers from provider API
			let nameservers = [];
			let providerResponse;

			// For HostBay, use dedicated ViewNameservers endpoint
			if (provider === "hostbay") {
				providerResponse = await domainProviderApiClient.request(
					"ViewNameservers",
					{ websiteName: domain },
					null,
					provider
				);
				nameservers = providerResponse?.responseData?.nameservers || [];
			} else {
				// For other providers, use existing ViewDomain logic
				providerResponse = await domainProviderApiClient.request(
					"ViewDomain",
					{ websiteName: domain },
					null,
					provider
				);
				nameservers = providerResponse?.responseData?.nameServers || 
								providerResponse?.responseData?.nameservers || 
								[];
			}

			let isNameWordNameservers = false;
			let cloudflareNameservers = null;

			if (domainData?.cloudflare?.zoneId) {
				try {
					const cloudflareZone = await cloudflare.zones.get({
						zone_id: domainData.cloudflare.zoneId,
					});

					cloudflareNameservers = cloudflareZone?.name_servers || [];
					
					// Compare current nameservers with Cloudflare nameservers
					if (Array.isArray(nameservers) && Array.isArray(cloudflareNameservers)) {
					
						const currentNS = nameservers.map(ns => typeof ns === 'string' ? ns.toLowerCase() : (ns?.name || ns?.hostname || '').toLowerCase()).sort();
						const cloudflareNS = cloudflareNameservers.map(ns => ns.toLowerCase()).sort();
						
						isNameWordNameservers = 
							currentNS.length === cloudflareNS.length &&
							currentNS.every((ns, index) => ns === cloudflareNS[index]);
					}
				} catch (cloudflareError) {
					console.error("Error fetching Cloudflare zone:", cloudflareError);
					// If Cloudflare fetch fails, continue without setting isNameWordNameservers
				}
			}

			return res.status(200).json({
				responseMsg: {
					id: 0,
					reason: null,
					statusCode: 200,
					message: "Success",
					code: null,
				},
				responseData: {
					nameservers: Array.isArray(nameservers) ? nameservers : [],
					domain: providerResponse?.responseData?.domain || domain,
					isNameWordNameservers: isNameWordNameservers,
					cloudflareNameservers: cloudflareNameservers, 
				},
				provider: provider,
			});
		} catch (error) {
			console.error("Error viewing nameservers:", error);
			return res.status(500).json({
				responseMsg: {
					id: 0,
					reason: "api_error",
					statusCode: 500,
					message: error.message || "Failed to fetch nameservers",
					code: null,
				},
				responseData: null,
				provider: provider,
			});
		}
	}

	async updateNameservers(req, res) {
		let {
			domain,
			nameServer1,
			nameServer2,
			nameServer3,
			nameServer4,
			provider,
			useNameWordNameservers, 
		} = req.query;

		// Get domain data to determine provider
		let domainData = await Domain.findOne({ websiteName: domain, deletedAt: { $eq: null } });
		provider = domainData?.provider || provider || "hostbay";

		// Validate provider is set
		if (!provider) {
			return res.status(400).json({
				responseMsg: {
					id: 0,
					reason: "missing_provider",
					statusCode: 400,
					message: "Provider is required. Please provide 'provider' parameter or ensure domain exists in database.",
					code: null,
				},
				responseData: null,
			});
		}

		// Normalize provider name to lowercase
		provider = provider.toLowerCase();

		if (useNameWordNameservers === "true" || useNameWordNameservers === true) {
			if (!domainData?.cloudflare?.zoneId) {
				return res.status(400).json({
					responseMsg: {
						id: 0,
						reason: "no_cloudflare_zone",
						statusCode: 400,
						message: "Domain does not have a Cloudflare zone. Cannot use NameWord nameservers.",
						code: null,
					},
					responseData: null,
					provider: provider,
				});
			}

			try {                                                                                                                                 
				const cloudflareZone = await cloudflare.zones.get({
					zone_id: domainData.cloudflare.zoneId,
				});

				const cloudflareNameservers = cloudflareZone?.name_servers || [];
				if (cloudflareNameservers.length < 2) {
					return res.status(400).json({
						responseMsg: {
							id: 0,
							reason: "insufficient_cloudflare_nameservers",
							statusCode: 400,
							message: "Cloudflare zone does not have sufficient nameservers.",
							code: null,
						},
						responseData: null,
						provider: provider,
					});
				}

				nameServer1 = cloudflareNameservers[0];
				nameServer2 = cloudflareNameservers[1];
				nameServer3 = cloudflareNameservers[2] || null;
				nameServer4 = cloudflareNameservers[3] || null;
			} catch (cloudflareError) {
				console.error("Error fetching Cloudflare zone:", cloudflareError);
				return res.status(500).json({
					responseMsg: {
						id: 0,
						reason: "cloudflare_fetch_error",
						statusCode: 500,
						message: "Failed to fetch Cloudflare nameservers: " + cloudflareError.message,
						code: null,
					},
					responseData: null,
					provider: provider,
				});
			}
		}

		// Validate at least one nameserver is provided
		const nameservers = [nameServer1, nameServer2, nameServer3, nameServer4].filter(Boolean);
		if (nameservers.length === 0) {
			return res.status(400).json({
				responseMsg: {
					id: 0,
					reason: "missing_nameservers",
					statusCode: 400,
					message: "At least one nameserver is required",
					code: null,
				},
				responseData: null,
				provider: provider,
			});
		}

		try {
			const params = {
				websiteName: domain,
				nameServer1: nameServer1 || null,
				nameServer2: nameServer2 || null,
				nameServer3: nameServer3 || null,
				nameServer4: nameServer4 || null,
			};

			const response = await domainProviderApiClient.request(
				"UpdateNameServer",
				params,
				provider === "hostbay" ? "PUT" : null,
				provider
			);

			// Check if the response indicates an error
			const responseStatusCode = response?.responseMsg?.statusCode;
			const isError = responseStatusCode && responseStatusCode !== 200;

			// Extract error message from providerError if available
			let errorMessage = response?.responseMsg?.message;
			if (isError && response?.providerError) {
				if (response.providerError.detail && Array.isArray(response.providerError.detail)) {
					const errorDetails = response.providerError.detail
						.map((detail) => detail.msg || detail.message)
						.filter(Boolean)
						.join("; ");
					if (errorDetails) {
						errorMessage = errorDetails;
					}
				} else if (response.providerError.message) {
					errorMessage = response.providerError.message;
				}
			}

			// Log nameserver update activity
			try {
				await saveActivity({
					userId: req.user.id,
					domain: domain,
					activityType: "dns",
					activity: `Updated nameservers for ${domain}`,
					status: isError ? "Rejected" : "Successful",
				});
			} catch (activityError) {
				console.error("Failed to log nameserver update activity:", activityError);
			}

			// Return appropriate HTTP status code based on response
			if (isError) {
				if (errorMessage && errorMessage !== response?.responseMsg?.message) {
					response.responseMsg.message = errorMessage;
				}
				return res.status(responseStatusCode || 500).json(response);
			}

			return res.status(200).json(response);
		} catch (error) {
			console.error("Error updating nameservers:", error);
			return res.status(500).json({
				responseMsg: {
					id: 0,
					reason: "api_error",
					statusCode: 500,
					message: error.message || "Failed to update nameservers",
					code: null,
				},
				responseData: null,
				provider: provider,
			});
		}
	}

	// Get DNS records by domain name (for domain route)
	async getDNSRecordsByDomain(req, res) {
		try {
			const { domainName } = req.params;
			const userId = req.user?.id || req.user?._id;

			if (!userId) {
				return res.status(401).json({
					success: false,
					responseMsg: {
						statusCode: 401,
						message: "Unauthorized",
					},
					responseData: null,
				});
			}

			if (!domainName) {
				return res.status(400).json({
					success: false,
					responseMsg: {
						statusCode: 400,
						message: "Domain name is required",
					},
					responseData: null,
				});
			}

			// Use existing viewDNSRecord logic but with domain from params
			const domain = domainName;
			let domainData = await Domain.findOne({ websiteName: domain, deletedAt: { $eq: null } });

			// If provider is OpenProvider, get records from Cloudflare
			if (
				domainData?.provider === "openprovider" &&
				domainData?.cloudflare?.zoneId
			) {
				try {
					const zoneId = domainData?.cloudflare?.zoneId;
					const response = await cloudflare.dns.records.list({
						zone_id: zoneId,
					});

					const formattedRecords = response.result.map((record) => ({
						name: record.name,
						type: record.type,
						value: record.content,
						ttl: record.ttl,
						priority: record.priority,
						id: record.id,
						modified_on: record.modified_on,
						created_on: record.created_on,
					}));

					// Sort by most recent first (modified_on descending, fallback to created_on)
					formattedRecords.sort((a, b) => {
						const aTime = a.modified_on ? new Date(a.modified_on).getTime() : (a.created_on ? new Date(a.created_on).getTime() : 0);
						const bTime = b.modified_on ? new Date(b.modified_on).getTime() : (b.created_on ? new Date(b.created_on).getTime() : 0);
						return bTime - aTime; // Descending order (most recent first)
					});

					return res.status(200).json({
						success: true,
						responseMsg: {
							statusCode: 200,
							message: "DNS records fetched successfully",
						},
						responseData: {
							records: formattedRecords,
						},
					});
				} catch (error) {
					console.error("Error viewing DNS records:", error);
					return res.status(500).json({
						success: false,
						responseMsg: {
							statusCode: 500,
							message: error.message || "Failed to fetch DNS records",
						},
						responseData: null,
					});
				}
			}

			// For HostBay, we can directly fetch DNS records
			if (domainData?.provider === "hostbay") {
				const params = {
					WebsiteName: domain,
				};
				const response = await domainProviderApiClient.get(
					"ViewDNSRecord",
					params,
					"hostbay"
				);
				
				// Sort records by most recent first if records exist
				if (response?.responseData?.records && Array.isArray(response.responseData.records)) {
					response.responseData.records.sort((a, b) => {
						const aTime = a.modified_on ? new Date(a.modified_on).getTime() : 
									  (a.created_on ? new Date(a.created_on).getTime() : 
									   (a.updated_at ? new Date(a.updated_at).getTime() : 
									    (a.id ? parseInt(a.id) : 0)));
						const bTime = b.modified_on ? new Date(b.modified_on).getTime() : 
									  (b.created_on ? new Date(b.created_on).getTime() : 
									   (b.updated_at ? new Date(b.updated_at).getTime() : 
									    (b.id ? parseInt(b.id) : 0)));
						return bTime - aTime; // Descending order (most recent first)
					});
				}
				
				return res.status(200).json({
					success: true,
					responseMsg: {
						statusCode: 200,
						message: "DNS records fetched successfully",
					},
					responseData: response.responseData || { records: [] },
				});
			}

			// For other providers
			const detail = await domainProviderApiClient.request(
				"ViewDomain",
				{
					websiteName: domain,
				},
				null,
				domainData?.provider || "connectreseller"
			);
			const id = detail.responseData?.websiteId;
			const params = {
				WebsiteName: domain,
				WebsiteId: id,
			};
			const response = await domainProviderApiClient.get(
				"ViewDNSRecord",
				params,
				domainData?.provider || "connectreseller"
			);
			
			// Sort records by most recent first if records exist
			if (response?.responseData?.records && Array.isArray(response.responseData.records)) {
				response.responseData.records.sort((a, b) => {
					const aTime = a.modified_on ? new Date(a.modified_on).getTime() : 
								  (a.created_on ? new Date(a.created_on).getTime() : 
								   (a.updated_at ? new Date(a.updated_at).getTime() : 
								    (a.lastModifyDate ? new Date(a.lastModifyDate).getTime() : 
								     (a.id ? parseInt(a.id) : 0))));
					const bTime = b.modified_on ? new Date(b.modified_on).getTime() : 
								  (b.created_on ? new Date(b.created_on).getTime() : 
								   (b.updated_at ? new Date(b.updated_at).getTime() : 
								    (b.lastModifyDate ? new Date(b.lastModifyDate).getTime() : 
								     (b.id ? parseInt(b.id) : 0))));
					return bTime - aTime; // Descending order (most recent first)
				});
			}
			
			return res.status(200).json({
				success: true,
				responseMsg: {
					statusCode: 200,
					message: "DNS records fetched successfully",
				},
				responseData: response.responseData || { records: [] },
			});
		} catch (error) {
			console.error("Error in getDNSRecordsByDomain:", error);
			return res.status(500).json({
				success: false,
				responseMsg: {
					statusCode: 500,
					message: error.message || "Internal server error",
				},
				responseData: null,
			});
		}
	}

	// Create DNS record by domain name (for domain route)
	async createDNSRecordByDomain(req, res) {
		try {
			const { domainName } = req.params;
			const { content, name, proxied, ttl, type } = req.body;
			const userId = req.user?.id || req.user?._id;

			if (!userId) {
				return res.status(401).json({
					success: false,
					responseMsg: {
						statusCode: 401,
						message: "Unauthorized",
					},
					responseData: null,
				});
			}

			if (!domainName) {
				return res.status(400).json({
					success: false,
					responseMsg: {
						statusCode: 400,
						message: "Domain name is required",
					},
					responseData: null,
				});
			}

			if (!type || !content) {
				return res.status(400).json({
					success: false,
					responseMsg: {
						statusCode: 400,
						message: "Type and content are required",
					},
					responseData: null,
				});
			}

			const domain = domainName;
			let domainData = await Domain.findOne({ websiteName: domain, deletedAt: { $eq: null } });
			const provider = domainData?.provider || "hostbay";

			// Validate record type for HostBay
			if (provider === "hostbay") {
				const supportedTypes = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SRV"];
				if (!supportedTypes.includes(type?.toUpperCase())) {
					return res.status(400).json({
						success: false,
						responseMsg: {
							statusCode: 400,
							message: `HostBay does not support ${type} records. Supported types: ${supportedTypes.join(", ")}`,
						},
						responseData: null,
					});
				}
			}

			// Prepare parameters for DNS record creation
			const recordName = name || "@";
			const recordValue = content;
			const recordTTL = ttl || 300;
			const recordType = type.toUpperCase();

			// Use existing addDNSRecord logic
			if (domainData?.provider === "openprovider" && domainData?.cloudflare?.zoneId) {
				try {
					const zoneId = domainData?.cloudflare?.zoneId;
					const response = await cloudflare.dns.records.create({
						zone_id: zoneId,
						type: recordType,
						name: recordName === "@" ? domain : recordName,
						content: recordValue,
						ttl: recordTTL,
						proxied: proxied || false,
					});

					// Send DNS record created email
					try {
						const user = await User.findById(req.user?.id || req.user?._id);
						if (user && user.email) {
							const { shouldSendEmail } = require("../../utils/notificationHelper");
							const canSendEmail = await shouldSendEmail(user, 'serviceStatusAndChanges');
							if (canSendEmail) {
								const finalRecordName = name === "@" ? domain : name;
								let html = nunjucks.render('mails/dns_record_created.html', {
									NAME: user.name || user.email,
									DOMAIN_NAME: domain,
									RECORD_TYPE: type,
									RECORD_NAME: finalRecordName,
									RECORD_VALUE: content,
									TTL: ttl || 3600,
									dnsSettingsLink: env.FRONTEND_URL + `/domains/${domain}/dns`,
									logoUrl: env.FRONTEND_URL
								});
								
								await transporter.sendMail({
									from: process.env.MAIL_FROM_ADDRESS,
									to: user.email,
									subject: `DNS record added - ${domain}`,
									html: html,
								});
							}
						}
					} catch (emailError) {
						console.error("Error sending DNS record created email:", emailError);
					}
					
					return res.status(201).json({
						success: true,
						responseMsg: {
							statusCode: 201,
							message: "DNS record created successfully",
						},
						responseData: {
							id: response.result.id,
							name: response.result.name,
							type: response.result.type,
							content: response.result.content,
							ttl: response.result.ttl,
						},
					});
				} catch (error) {
					console.error("Error creating DNS record:", error);
					return res.status(500).json({
						success: false,
						responseMsg: {
							statusCode: 500,
							message: error.message || "Failed to create DNS record",
						},
						responseData: null,
					});
				}
			}

			// For HostBay and other providers
			const params = {
				WebsiteName: domain,
				RecordName: recordName === "@" ? domain : `${recordName}.${domain}`,
				RecordType: recordType,
				RecordValue: recordValue,
				RecordTTL: recordTTL,
			};

			const response = await domainProviderApiClient.request(
				"AddDNSRecord",
				params,
				"POST",
				provider
			);

			if (response?.responseData !== undefined || response?.data) {
				// Send DNS record created email
				try {
					const user = await User.findById(req.user?.id || req.user?._id);
					if (user && user.email) {
						const { shouldSendEmail } = require("../../utils/notificationHelper");
						const canSendEmail = await shouldSendEmail(user, 'serviceStatusAndChanges');
						if (canSendEmail) {
							const finalRecordName = recordName === "@" ? domain : `${recordName}.${domain}`;
							let html = nunjucks.render('mails/dns_record_created.html', {
								NAME: user.name || user.email,
								DOMAIN_NAME: domain,
								RECORD_TYPE: recordType,
								RECORD_NAME: finalRecordName,
								RECORD_VALUE: recordValue,
								TTL: recordTTL,
								dnsSettingsLink: env.FRONTEND_URL + `/domains/${domain}/dns`,
								logoUrl: env.FRONTEND_URL
							});
							
							await transporter.sendMail({
								from: process.env.MAIL_FROM_ADDRESS,
								to: user.email,
								subject: `DNS record added - ${domain}`,
								html: html,
							});
						}
					}
				} catch (emailError) {
					console.error("Error sending DNS record created email:", emailError);
				}
				
				return res.status(201).json({
					success: true,
					responseMsg: {
						statusCode: 201,
						message: response?.responseMsg?.message || "DNS record created successfully",
					},
					responseData: response.responseData || response.data,
				});
			}

			return res.status(response?.responseMsg?.statusCode || 500).json({
				success: false,
				responseMsg: response?.responseMsg || {
					statusCode: 500,
					message: "Failed to create DNS record",
				},
				responseData: null,
			});
		} catch (error) {
			console.error("Error in createDNSRecordByDomain:", error);
			return res.status(500).json({
				success: false,
				responseMsg: {
					statusCode: 500,
					message: error.message || "Internal server error",
				},
				responseData: null,
			});
		}
	}
}

module.exports = new DnsController();
