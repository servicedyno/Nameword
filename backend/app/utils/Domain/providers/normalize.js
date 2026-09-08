///provider/normalize.js
const axios = require("axios");
const config = require("../config");
const { getOpenproviderToken } = require("./openprovider/auth");
const { splitDomain } = require("./tldConfig");
const getExchangeRate = require("../../../utils/currency");
const { getCachedTldList } = require("../../../utils/tldCache");

	// Response handlers for different domain operations
const responseHandlers = {
	// Check domain availability and get pricing
	checkdomainavailable: (data) =>
		data.data.combined || {
			registrationFee:
				data?.data?.results?.[0]?.registration_price?.reseller_price
					?.price || 0,
			renewalFee:
				data?.data?.results?.[0]?.renewal_price?.reseller_price
					?.price || 0,
			transferFee:
				data?.data?.results?.[0]?.transfer_price?.reseller_price
					?.price || 0,
			available: data?.data?.results?.[0]?.status === "available",
		},

	// Get hosting plans
	GetHostingPlans: (data) => {
		// Handle HostBay response format - data.data.plans
		if (data?.data?.plans && Array.isArray(data.data.plans)) {
			return data.data.plans;
		}
		// Handle HostBay direct array format
		if (data?.data && Array.isArray(data.data)) {
			return data.data;
		}
		// Handle ConnectReseller response format
		if (data?.responseData && Array.isArray(data.responseData)) {
			return data.responseData;
		}
		// Handle nested responseData structure
		if (data?.responseData?.plans && Array.isArray(data.responseData.plans)) {
			return data.responseData.plans;
		}
		// Handle direct plans array
		if (data?.plans && Array.isArray(data.plans)) {
			return data.plans;
		}
		// Handle results array (some APIs use this)
		if (data?.results && Array.isArray(data.results)) {

			return data.results;
		}
		// Handle data.results array
		if (data?.data?.results && Array.isArray(data.data.results)) {

			return data.data.results;
		}
		

		// Return empty array if no valid structure found
		return [];
	},

	// Get domain price information

	checkDomainPrice: (data) => {
		// console.log('checkDomainPrice data:', data.data.combined)
		return data.data.combined || null
	},
	// Get TLD suggestions based on website name
	async getTldSuggestion(data, params, token) {
		try {
			const baseName = params.websiteName.split(".")[0].toLowerCase();
			
			// Use cached TLD list instead of fetching every time
			const tldList = data?.data?.results || await getCachedTldList();
			const tlds = Array.isArray(tldList) 
				? tldList.map((item) => item.name || item).slice(0, 50)
				: [];

			// Fetch domain suggestions from OpenProvider
			const suggesionResponse = await axios({
				method: "POST",
				url: `${config.openprovider.apiUrl}/domains/suggest-name`,
				headers: { Authorization: `Bearer ${token}` },
				data: {
					language: "eng",
					limit: 50,
					name: baseName,
					provider: "namestudio",
					sensitive: false,
					tlds: tlds,
				},
				timeout: 30000, // Increased timeout
			});

			if (!suggesionResponse?.data?.data?.results || suggesionResponse.data.data.results.length === 0) {
				console.log("No suggestions returned from OpenProvider");
				return [];
			}


			const allDomains = suggesionResponse.data.data.results.filter(
				(item) => {
					const domainBase = item.domain?.toLowerCase() || "";
					return domainBase === baseName || 
						   domainBase.startsWith(baseName) ||
						   domainBase.includes(baseName);
				}
			);

			// If no exact/close matches, use top suggestions as fallback
			const domainsToCheck = allDomains.length > 0 
				? allDomains.slice(0, 15)
				: suggesionResponse.data.data.results.slice(0, 15);

			if (domainsToCheck.length === 0) {
				console.log("No domains to check for pricing");
				return [];
			}

			// Fetch pricing for all domains at once
			const priceResponseTld = await axios({
				method: "POST",
				url: `${config.openprovider.apiUrl}/domains/check`,
				headers: { Authorization: `Bearer ${token}` },
				data: {
					domains: domainsToCheck.map((domain) => ({
						name: (domain.domain || domain).toLowerCase().split(".")[0],
						extension: (domain.tld || domain.domain?.split(".")[1] || "").toLowerCase(),
					})).filter(d => d.name && d.extension),
					with_price: true,
				},
				timeout: 30000, // Increased timeout
			});

			if (!priceResponseTld?.data?.data?.results || priceResponseTld.data.data.results.length === 0) {
				console.log("No pricing data returned");
				return domainsToCheck.map((domain) => ({
					websiteName: domain.domain || domain,
					domainType: domain?.is_premium ? "Premium" : "Standard",
					available: domain?.status === "free",
					registrationFee: 0,
				}));
			}

			// Batch exchange rate calls by currency
			const currencyRates = new Map();
			const uniqueCurrencies = new Set();
			
			priceResponseTld.data.data.results.forEach((item) => {
				const currency = item?.price?.product?.currency;
				if (currency && currency !== "USD") {
					uniqueCurrencies.add(currency);
				}
			});

			// Fetch exchange rates for all unique currencies at once
			const exchangeRatePromises = Array.from(uniqueCurrencies).map(async (currency) => {
				try {
					const rate = await getExchangeRate(currency, "USD");
					return { currency, rate };
				} catch (error) {
					console.error(`Failed to fetch exchange rate for ${currency}:`, error.message);
					return { currency, rate: 1 }; // Fallback to 1 if rate fetch fails
				}
			});

			const exchangeRates = await Promise.all(exchangeRatePromises);
			exchangeRates.forEach(({ currency, rate }) => {
				currencyRates.set(currency, rate);
			});
			currencyRates.set("USD", 1); // USD to USD is 1

			// Process suggestions with batched exchange rates
			const suggestions = priceResponseTld.data.data.results.map((item) => {
				try {
					const priceData = item?.price?.product;
					if (!priceData) {
						return {
							websiteName: item.domain,
							domainType: item?.is_premium ? "Premium" : "Standard",
							available: item?.status === "free",
							registrationFee: 0,
						};
					}

					const currency = priceData.currency || "USD";
					const exchangeRate = currencyRates.get(currency) || 1;
					const price = (exchangeRate * priceData.price).toFixed(2);

					return {
						websiteName: item.domain,
						domainType: item?.is_premium ? "Premium" : "Standard",
						available: item?.status === "free",
						registrationFee: parseFloat(price) || 0,
					};
				} catch (error) {
					console.error("Error processing suggestion:", error);
					return {
						websiteName: item.domain,
						domainType: "Standard",
						available: false,
						registrationFee: 0,
					};
				}
			});

			// Filter out invalid suggestions and sort by availability
			return suggestions
				.filter(s => s.websiteName)
				.sort((a, b) => {
					// Available domains first
					if (a.available && !b.available) return -1;
					if (!a.available && b.available) return 1;
					// Then by price (lower first)
					return a.registrationFee - b.registrationFee;
				});
		} catch (error) {
			console.error("Error in getTldSuggestion:", error.message);
			// Return empty array on error instead of crashing
			return [];
		}
	},

	// Get domain suggestions with pricing
	async domainSuggestion(data, _, token) {
		const domains = data.data.results || [];
		const priceResponse = await axios({
			method: "POST",
			url: `${config.openprovider.apiUrl}/domains/check`,
			headers: { Authorization: `Bearer ${token}` },
			data: {
				domains: domains.map((domain) => (splitDomain(domain.name))),
				with_price: true,
			},
			timeout: 30000,
		});

		// Wait for all async operations to complete
		const suggestions = await Promise.all(
			domains.map(async (domain, index) => {
				try {
					const priceData = priceResponse.data?.data?.results[index]?.price?.product;
					if (!priceData) {
						return { domainName: domain.name, price: 0 };
					}

					// Skip exchange rate fetch if currency is already USD
					const currency = priceData.currency?.toUpperCase();
					const exchangeRate = currency === "USD" ? 1 : await getExchangeRate(currency || "USD", "USD");
					const price = (exchangeRate * priceData.price).toFixed(2);

					return {
						domainName: domain.name,
						price: parseFloat(price) || 0
					};
				} catch (error) {
					return { domainName: domain.name, price: 0 };
				}
			})
		);

		return {
			registryDomainSuggestionList: suggestions
		};

		// return {
		// 	registryDomainSuggestionList: domains.map(async(domain, index) => ({
		// 		domainName: domain.name,
		// 		price:(await getExchangeRate(priceResponse.data?.data?.results[index]?.price?.product.currency, "USD") * priceResponse.data?.data?.results[index]?.price?.product.price).toFixed(2) || 0,
		// 	})),
		// };
	},

	// Handle domain order response
	domainorder: (data, params) => [
		{
			domainCreateResp: null,
			domainCreateResponse: {
				msgCode: data.code === 0 ? 1000 : 1,
				msg:
					data.code === 0
						? "Command completed successfully"
						: "Command failed",
				name: params.websiteName,
				creationDate: data?.data?.activation_date,
				expiryDate: data.data.expiration_date,
				domainId: data.data.id,
				status: data.data?.status,
			},
			contactsCreateRS: null,
			hostsCreateRS: [],
			error: null,
			sedoMsg: null,
		},
	],

	// Handle domain transfer order response
	TransferOrder: (data) => ({ orderId: data.data.order_id }),

	// Handle domain renewal order response
	RenewalOrder: (data, params) => ({
		statusCode: data.code,
		message:
			data.data.status === "ACT"
				? "Domain renewed successfully"
				: "FAILED",
		reason: "",
		expiryDate: "",
		domainName: params.websiteName,
	}),

	// View domain details
	ViewDomain: (data, params) => {
		const {
			id,
			owner_handle,
			order_date,
			expiration_date,
			name_servers,
			...rest
		} = data?.data?.results?.[0] || {};
		return {
			...rest, // rest of the keys
			domainNameId: id,
			websiteId:id,
			customerId: owner_handle,
			websiteName: params?.websiteName,
			orderDate: order_date,
			expirationDate: expiration_date,
			nameServers: name_servers || [],
			...name_servers?.reduce((acc, ns, index) => {
                   acc[`nameserver${index + 1}`] = ns.name;
                   return acc;
               }, {})
   
		};
	},

	// Update nameserver response handler
	UpdateNameServer: (data) => ({
		msgCode: data.code === 0 ? 1000 : 1,
		msg:
			data.code === 0
				? "Nameserver updated successfully"
				: "Failed to update nameserver",
	}),

	// Update auth code response handler
	updateAuthCode: (data) => ({
		msgCode: data.code === 0 ? 1000 : 1,
		msg:
			data.code === 0
				? "Authcode updated successfully"
				: "Failed to update authcode",
	}),

	// Manage domain lock response handler
	ManageDomainLock: (data) => ({
		message:
			data.code === 0
				? "Domain lock updated successfully"
				: "Failed to update domain lock",
		id: 0,
		reason: null,
		statusCode: data.code === 0 ? 200 : data.code,
	}),

	// Manage privacy protection response handler
	ManageDomainPrivacyProtection: (data) => ({
		message:
			data.code === 0
				? "Privacy protection updated successfully"
				: "Failed to update privacy protection",
		id: 0,
		reason: null,
		statusCode: data.code === 0 ? 200 : data.code,
	}),

	// View EPP code response handler
	ViewEPPCode: (data) => data?.data?.results?.[0]?.auth_code,

	// Manage DNS records response handler
	ManageDNSRecords: (data) => {
		return {
		message:
			data.code === 0
				? "DNS Management enabled successfully"
				: "Failed to enable DNS Management",
		id: 0,
		reason: null,
		statusCode: data.code === 0 ? 200 : data.code,
	}},

	// Add DNS record response handler
	AddDNSRecord: (data) => ({
		message: "Records ADDED Successfully",
		id: null,
		reason: null,
		statusCode: data.code === 0 ? 200 : data.code,
	}),

	// Modify DNS record response handler
	ModifyDNSRecord: (data) => ({
		message:
			data.code === 0
				? "DNS record modified successfully"
				: "Failed to modify DNS record",
		statusCode: data.code === 0 ? 200 : data.code,
		id: null,
		reason: null,
	}),

	// Delete DNS record response handler
	DeleteDNSRecord: (data) => ({
		message:
			data.code === 0
				? "DNS record deleted successfully"
				: "Failed to delete DNS record",
		statusCode: data.code === 0 ? 200 : data.code,
		id: null,
		reason: null,
	}),

	// View DNS records response handler
	ViewDNSRecord: (data) => ({
		records: data.data?.records || [],
		statusCode: data.code === 0 ? 200 : data.code,
	}),

	// Set domain forwarding response handler
	SetDomainForwarding: (data) => ({
		message:
			data.code === 0
				? "Domain forwarding set successfully"
				: "Failed to set domain forwarding",
		statusCode: data.code === 0 ? 200 : data.code,
	}),

	// Get domain forwarding response handler
	GetDomainForwarding: (data) => ({
		forwarding: data.data?.forwarding || {},
		statusCode: data.code === 0 ? 200 : data.code,
	}),

	// Update domain forwarding response handler
	updatedomainforwarding: (data) => ({
		message:
			data.code === 0
				? "Domain forwarding updated successfully"
				: "Failed to update domain forwarding",
		statusCode: data.code === 0 ? 200 : data.code,
	}),

	// Delete domain forwarding response handler
	deletedomainforwarding: (data) => ({
		message:
			data.code === 0
				? "Domain forwarding deleted successfully"
				: "Failed to delete domain forwarding",
		statusCode: data.code === 0 ? 200 : data.code,
	}),

	// Add child nameserver response handler
	AddChildNameServer: (data, params) => ({
		message:
			data.code === 0
				? `Child nameserver ${params?.hostName} added successfully`
				: "Failed to add child nameserver",
		statusCode: data.code === 0 ? 200 : data.code,
		name: params?.hostName || null,
		creationDate: data.data?.creationDate || null,
	}),

	// Modify child nameserver IP response handler
	ModifyChildNameServerIP: (data, params) => ({
		message:
			data.code === 0
				? `Child nameserver ${params?.hostName} modify successfully`
				: "Failed to modify child nameserver",
		statusCode: data.code === 0 ? 200 : data.code,
		name: params?.hostName || null,
		creationDate: data.data?.creationDate || null,
	}),

	// Modify child nameserver hostname response handler
	ModifyChildNameServerHostname: (data, params) => ({
		message:
			data.code === 0
				? `Child nameserver ${params?.hostName} modify successfully`
				: "Failed to modify child nameserver",
		statusCode: data.code === 0 ? 200 : data.code,
		name: params?.hostName || null,
		creationDate: data.data?.creationDate || null,
	}),

	// Delete child nameserver response handler
	DeleteChildNameServer: (data, params) => ({
		message:
			data.code === 0
				? `Child nameserver ${params?.hostName} deleted successfully`
				: "Failed to delete child nameserver",
		statusCode: data.code === 0 ? 200 : data.code,
		name: params?.hostName || null,
		creationDate: data.data?.creationDate || null,
	}),

	// Get child nameservers response handler
	getchildnameservers: (data) =>
		data?.data?.results?.[0]?.name_servers?.filter((ns) => ns?.ip) || [],

	// Default response handler
	default: (data) => data.data || data,
};

// Normalize API response based on provider and operation type
const normalizeResponse = async (provider, params, data, type) => {
	// Handle HostBay responses
	if (provider === "hostbay") {
		const normalized = {
			responseMsg: {
				id: 0,
				reason: null,
				statusCode: data?.success !== false ? 200 : data?.statusCode || 500,
				message: data?.message || "Success",
			},
			// Don't set default responseData for OrderHosting - let specific handler set it
			responseData: type === "OrderHosting" ? null : (data?.data || data),
		};

		// Handle specific HostBay response types
		if (type === "domainorder") {
			normalized.responseData = {
				domain: data?.data?.domain_name || data?.data?.domain || params?.domain_name || params?.websiteName,
				id: data?.data?.provider_id || data?.data?.id || data?.data?.domain_id,
				status: data?.data?.status || "active",
				activation_date: data?.data?.created_at || new Date().toISOString(),
				expiration_date: data?.data?.expiration_date || data?.data?.expiry_date || data?.data?.expires_at,
				// Add missing fields from HostBay response
				cloudflare_zone_id: data?.data?.cloudflare_zone_id || null,
				privacy_enabled: data?.data?.privacy_enabled || false,
				is_locked: data?.data?.is_locked || false,
				contact_type: data?.data?.contact_type || null,
				updated_at: data?.data?.updated_at || null,
				auto_renew: data?.data?.auto_renew || false,
			};
		} else if (type === "TransferOrder") {
			const transferPayload =
				(data && typeof data === "object" && data.data) || {};
			const defaultDomain =
				params?.domain_name ||
				params?.domainName ||
				params?.websiteName ||
				null;

			normalized.responseMsg.message =
				data?.message || "Domain transfer initiated successfully";
			normalized.responseData = {
				...transferPayload,
				domain: transferPayload.domain || transferPayload.domain_name || defaultDomain,
				orderId:
					transferPayload.order_id ||
					transferPayload.id ||
					transferPayload.transfer_id ||
					null,
				status:
					transferPayload.status ||
					transferPayload.transfer_status ||
					"pending",
			};
		} else if (type === "ApproveTransfer") {
			const payload =
				(data && typeof data === "object" && data.data) || {};
			normalized.responseMsg.message =
				data?.message || "Outgoing transfer approved";
			normalized.responseData = {
				...payload,
				domain:
					payload.domain ||
					payload.domain_name ||
					params?.domain_name ||
					params?.domainName ||
					params?.websiteName ||
					null,
				status:
					payload.status ||
					payload.transfer_status ||
					"approved",
			};
		} else if (type === "RejectTransfer") {
			const payload =
				(data && typeof data === "object" && data.data) || {};
			normalized.responseMsg.message =
				data?.message || "Outgoing transfer rejected";
			normalized.responseData = {
				...payload,
				domain:
					payload.domain ||
					payload.domain_name ||
					params?.domain_name ||
					params?.domainName ||
					params?.websiteName ||
					null,
				status:
					payload.status ||
					payload.transfer_status ||
					"rejected",
			};
		} else if (type === "RestartTransfer") {
			const payload =
				(data && typeof data === "object" && data.data) || {};
			normalized.responseMsg.message =
				data?.message || "Domain transfer restarted";
			normalized.responseData = {
				...payload,
				domain:
					payload.domain ||
					payload.domain_name ||
					params?.domain_name ||
					params?.domainName ||
					params?.websiteName ||
					null,
				status:
					payload.status ||
					payload.transfer_status ||
					"restarted",
			};
		} else if (type === "ViewDomain") {
			const domainData = data?.data || {};
			const contactType = domainData?.contact_type || domainData?.contactType;
			const privacyInfo =
				domainData?.privacy ||
				domainData?.privacy_protection ||
				domainData?.privacyProtection ||
				domainData?.privacy_guard ||
				null;
			const isPrivacyEnabled =
				typeof domainData?.privacy_protection === "boolean"
					? domainData.privacy_protection
					: typeof privacyInfo?.enabled === "boolean"
						? privacyInfo.enabled
						: domainData?.is_private_whois_enabled === true ||
						  domainData?.is_private_whois_enabled === "true" ||
						  domainData?.whois_privacy === true ||
						  domainData?.whois_privacy?.enabled === true ||
						  contactType === "hostbay_managed";
			normalized.responseData = {
				domainNameId: domainData?.id || domainData?.domain_id,
				websiteId: domainData?.id || domainData?.domain_id,
				customerId: domainData?.customer_id || null,
				websiteName: domainData?.domain || params?.websiteName,
				orderDate: domainData?.created_at || domainData?.registered_at,
				expirationDate: domainData?.expiry_date || domainData?.expires_at,
				status: domainData?.status || "active",
				autorenew: domainData?.auto_renew || false,
				// Include nameservers
				nameservers: domainData?.nameservers || domainData?.name_servers || [],
				nameServers: domainData?.nameservers || domainData?.name_servers || [],
				// Include contact information if available
				registrant: domainData?.registrant || domainData?.registrant_contact || null,
				admin: domainData?.admin || domainData?.admin_contact || null,
				tech: domainData?.tech || domainData?.technical || domainData?.technical_contact || null,
				billing: domainData?.billing || domainData?.billing_contact || null,
				contact_type: contactType || null,
				privacy: privacyInfo,
				is_private_whois_enabled: Boolean(isPrivacyEnabled),
			};
		} else if (type === "checkdomainavailable") {
			normalized.responseData = {
				available: data?.data?.available !== false,
				registrationFee: data?.data?.registration_price || data?.data?.price || 0,
				renewalfee: data?.data?.renewal_price || data?.data?.price || 0,
				transferFee: data?.data?.transfer_price || data?.data?.price || 0,
			};
		} else if (type === "checkDomainPrice") {
			normalized.responseData = {
				"0": data?.data?.pricing || [],
			};
		} else if (type === "GetDomainContacts") {
			// Normalize GetDomainContacts response
			const contactsData = data?.data || {};
			normalized.responseData = {
				registrant: contactsData?.registrant || contactsData?.registrant_contact || null,
				admin: contactsData?.admin || contactsData?.admin_contact || null,
				tech: contactsData?.tech || contactsData?.technical || contactsData?.technical_contact || null,
				billing: contactsData?.billing || contactsData?.billing_contact || null,
			};
		} else if (type === "updateDomainContacts") {
			// Normalize updateDomainContacts response
			// HostBay might return the updated contacts or just a success message
			const updateData = data?.data || {};
			normalized.responseData = {
				registrant: updateData?.registrant || null,
				admin: updateData?.admin || null,
				tech: updateData?.tech || updateData?.technical || null,
				billing: updateData?.billing || null,
				success: data?.success !== false,
			};
		} else if (type === "ManageDomainLock") {
			const desiredLock =
				typeof params?.isDomainLocked === "string"
					? params.isDomainLocked.trim().toLowerCase() === "true"
					: Boolean(params?.isDomainLocked);
			const lockStatusRaw =
				data?.data?.status ||
				data?.data?.state ||
				data?.data?.lock_status ||
				data?.data?.lockStatus;
			const lockedFlag =
				typeof data?.data?.locked === "boolean"
					? data.data.locked
					: typeof data?.data?.is_locked === "boolean"
					? data.data.is_locked
					: typeof lockStatusRaw === "string"
					? ["locked", "lock", "enabled"].includes(
							lockStatusRaw.trim().toLowerCase()
					  )
					: desiredLock;
			const message =
				data?.message ||
				(lockedFlag ? "Domain locked successfully" : "Domain unlocked successfully");
			normalized.responseData = {
				isLocked: lockedFlag,
				lockStatus: lockedFlag ? "locked" : "unlocked",
			};
			normalized.responseMsg.message = message;
		} else if (type === "updateAuthCode") {
			const authCode =
				data?.data?.auth_code ||
				data?.data?.authCode ||
				data?.data?.epp_code ||
				data?.data?.eppCode ||
				data?.data?.code ||
				null;
			const message =
				data?.message ||
				(authCode
					? "Authcode reset successfully"
					: "Authcode reset request submitted");
			normalized.responseData = {
				authCode,
				message,
			};
			normalized.responseMsg.message = message;
		} else if (type === "GetAuthCode") {
			const authCode =
				data?.data?.auth_code ||
				data?.data?.authCode ||
				data?.data?.epp_code ||
				data?.data?.eppCode ||
				data?.data?.code ||
				data?.data ||
				null;
			const message =
				data?.message ||
				(authCode
					? "Authorization code retrieved successfully"
					: "Authorization code unavailable");
			normalized.responseData = {
				authCode,
				message,
			};
			normalized.responseMsg.message = message;
		} else if (type === "ManageDNSRecords") {
			normalized.responseData = {
				message: data?.success !== false
					? "DNS Management enabled successfully"
					: "Failed to enable DNS Management",
				id: 0,
				reason: null,
				statusCode: data?.success !== false ? 200 : data?.statusCode || 500,
			};
		} else if (type === "AddDNSRecord") {
			normalized.responseData = {
				message: "Records ADDED Successfully",
				id: data?.data?.id || null,
				reason: null,
				statusCode: data?.success !== false ? 200 : data?.statusCode || 500,
			};
		} else if (type === "ModifyDNSRecord") {
			normalized.responseData = {
				message: data?.success !== false
					? "DNS record modified successfully"
					: "Failed to modify DNS record",
				statusCode: data?.success !== false ? 200 : data?.statusCode || 500,
				id: data?.data?.id || null,
				reason: null,
			};
		} else if (type === "DeleteDNSRecord") {
			normalized.responseData = {	
				message: data?.success !== false
					? "DNS record deleted successfully"
					: "Failed to delete DNS record",
				statusCode: data?.success !== false ? 200 : data?.statusCode || 500,
				id: null,
				reason: null,
			};
		} else if (type === "DeleteDomain") {
			normalized.responseData = {
				message: data?.success !== false
					? "Domain deleted successfully"
					: "Failed to delete Domain",
				statusCode: data?.success !== false ? 200 : data?.statusCode || 500,
				id: null,
				reason: null,
			};
		} else if (type === "GetHostingPlans") {
			// Handle HostBay hosting plans response
			// HostBay returns: { success: true, data: { plans: [...] } }
			console.log("HostBay GetHostingPlans - Raw data:", JSON.stringify(data, null, 2));
			
			// Extract plans array from nested structure
			let plans = [];
			if (data?.data?.plans && Array.isArray(data.data.plans)) {
				plans = data.data.plans;
			} else if (Array.isArray(data?.data)) {
				plans = data.data;
			} else if (Array.isArray(data?.plans)) {
				plans = data.plans;
			}
			
			console.log("HostBay GetHostingPlans - Extracted plans:", plans);
			normalized.responseData = plans;
			console.log("HostBay GetHostingPlans - Final normalized.responseData:", normalized.responseData);
		} else if (type === "CalculateHostingPrice") {
			console.log("HostBay CalculateHostingPrice - Raw data:", JSON.stringify(data, null, 2));
			

			if (data?.data && typeof data.data === "object") {
		
				normalized.responseData = data.data;
			} else if (data?.success === true && typeof data === "object") {
		
				const { success, ...priceData } = data;
				normalized.responseData = priceData;
			} else {
				normalized.responseData = data;
			}
			
			console.log("HostBay CalculateHostingPrice - Final normalized.responseData:", JSON.stringify(normalized.responseData, null, 2));
		} else if (type === "OrderHosting") {
			console.log("HostBay OrderHosting - Raw data:", JSON.stringify(data, null, 2));
			
			// Handle new HostBay response structure: { success: true, data: {...}, message: "..." }
			if (data?.success === true && data?.data && typeof data.data === "object") {
				// New structure: { success: true, data: { order_id, ... } }
				normalized.responseData = data.data;
			} 
			// Handle case where data itself is the order data (fallback)
			else if (data?.data && typeof data.data === "object") {
				normalized.responseData = data.data;
			}
			// Handle case where response is directly the order data (old structure)
			else if (data?.order_id || data?.id) {
				normalized.responseData = data;
			}
			// Fallback: use data if it's an object
			else if (typeof data === "object" && data !== null) {
				normalized.responseData = data;
			} else {
				// Last resort: try data.data or data itself
				normalized.responseData = data?.data || data || {};
			}
			
			console.log("HostBay OrderHosting - Final normalized.responseData:", JSON.stringify(normalized.responseData, null, 2));
			console.log("HostBay OrderHosting - responseData exists?", !!normalized.responseData);
		} else if (type === "ViewDNSRecord") {

			const records = data?.data?.records || data?.data || [];
			normalized.responseData = {
				records: Array.isArray(records) ? records.map((record) => {

					return {
						name: record.name, // Keep original name from HostBay (full FQDN)
						type: record.type,
						value: record.value || record.content,
						ttl: record.ttl || 300,
						priority: record.priority || null,
						id: record.id || record.record_id,
					};
				}) : [],
				total: data?.data?.total || records.length || 0,
				statusCode: data?.success !== false ? 200 : data?.statusCode || 500,
			};
		} else if (type === "AddChildNameServer" || type === "ModifyChildNameServerIP" || type === "ModifyChildNameServerHostname") {
			normalized.responseData = {
				message: data?.success !== false
					? `Child nameserver ${params?.hostName || params?.newHostName || ""} ${type.includes("Add") ? "added" : "modified"} successfully`
					: `Failed to ${type.includes("Add") ? "add" : "modify"} child nameserver`,
				statusCode: data?.success !== false ? 200 : data?.statusCode || 500,
				name: params?.hostName || params?.newHostName || null,
				creationDate: data?.data?.created_at || null,
			};
		} else if (type === "DeleteChildNameServer") {
			normalized.responseData = {
				message: data?.success !== false
					? `Child nameserver ${params?.hostName || ""} deleted successfully`
					: "Failed to delete child nameserver",
				statusCode: data?.success !== false ? 200 : data?.statusCode || 500,
				name: params?.hostName || null,
			};
		} else if (type === "ViewNameservers") {
			const nameservers = data?.data?.nameservers || [];
			normalized.responseData = {
				nameservers: Array.isArray(nameservers) ? nameservers : [],
				domain: data?.data?.domain || params?.websiteName,
			};
		} else if (type === "getchildnameservers") {
			// Format child nameservers to match expected structure
			const nameservers = data?.data?.nameservers || data?.data || [];
			normalized.responseData = {
				childNameservers: Array.isArray(nameservers) ? nameservers.map((ns) => ({
					hostname: ns.hostname || ns.name || ns.host,
					ipAddress: ns.ip_address || ns.ip || ns.ipAddress,
					host: ns.hostname || ns.name || ns.host,
					ip: ns.ip_address || ns.ip || ns.ipAddress,
				})) : [],
			};
		} else if (type === "AddDNSSec") {
			normalized.responseData = {
				message: data?.success !== false
					? "DNSSEC record added successfully"
					: "Failed to add DNSSEC record",
				statusCode: data?.success !== false ? 200 : data?.statusCode || 500,
			};
		} else if (type === "DeleteDNSSec") {
			normalized.responseData = {
				message: data?.success !== false
					? "DNSSEC record deleted successfully"
					: "Failed to delete DNSSEC record",
				statusCode: data?.success !== false ? 200 : data?.statusCode || 500,
			};
		} else if (type === "GetDNSSec") {
			// Format DNSSEC records to match expected structure
			const dnssec = data?.data?.dnssec || data?.data || [];
			normalized.responseData = {
				dnssec: Array.isArray(dnssec) ? dnssec.map((record) => ({
					keyTag: record.key_tag || record.keyTag,
					algorithm: record.algorithm,
					digestType: record.digest_type || record.digestType,
					digest: record.digest,
				})) : [],
			};
		} else if (type === "GetDNSHistory") {
			// Format DNS history to match expected structur
			const history = data?.data?.history || data?.data || [];
			normalized.responseData = {
				history: Array.isArray(history) ? history.map((item) => ({
					// Essential fields with fallbacks
					id: item.id || item.history_id,
					date: item.date || item.created_at,
					created_at: item.created_at || item.date,
					// DNS record fields
					record_type: item.record_type || item.type,
					type: item.type || item.action_type || item.record_type,
					action: item.action || item.action_type,
					action_type: item.action_type || item.action,
					// Record details
					name: item.name,	
					content: item.content,
					ttl: item.ttl,
					priority: item.priority,
					// Cloudflare specific
					cloudflare_record_id: item.cloudflare_record_id,
					// Old values (for comparison)
					old_content: item.old_content,
					old_ttl: item.old_ttl,
					old_priority: item.old_priority,
					// Additional metadata
					domain_name: item.domain_name,
					user_id: item.user_id,
					metadata: item.metadata,
					description: item.description || item.message,
					// Preserve all other fields
					...item,
				})) : [],
				total: data?.data?.total || history.length,
			};
		} else if (type === "RestoreDNSHistory") {
			normalized.responseData = {
				message: data?.success !== false
					? "DNS configuration restored successfully"
					: "Failed to restore DNS configuration",
				statusCode: data?.success !== false ? 200 : data?.statusCode || 500,
			};
		} else if (type === "UpdateNameServer") {
			normalized.responseData = {
				message: data?.success !== false
					? "Nameservers updated successfully"
					: "Failed to update nameservers",
				statusCode: data?.success !== false ? 200 : data?.statusCode || 500,
			};
		} else if (type === "GetWhois") {
			const whoisPayload = data?.data || {};
			const whoisContacts =
				whoisPayload?.contacts || {
					registrant: whoisPayload?.registrant || whoisPayload?.registrant_contact || null,
					admin: whoisPayload?.admin || whoisPayload?.admin_contact || null,
					tech:
						whoisPayload?.tech ||
						whoisPayload?.technical ||
						whoisPayload?.technical_contact ||
						null,
					billing: whoisPayload?.billing || whoisPayload?.billing_contact || null,
				};
			const privacyNode =
				whoisPayload?.privacy ||
				whoisPayload?.privacy_protection ||
				whoisPayload?.privacy_guard ||
				null;
			const privacyEnabled =
				typeof whoisPayload?.privacy_protection === "boolean"
					? whoisPayload.privacy_protection
					: typeof privacyNode?.enabled === "boolean"
						? privacyNode.enabled
						: whoisPayload?.is_private_whois_enabled === true ||
						  whoisPayload?.is_private_whois_enabled === "true" ||
						  whoisPayload?.whois_privacy === true ||
						  whoisPayload?.whois_privacy?.enabled === true;

			normalized.responseData = {
				domain: whoisPayload?.domain || whoisPayload?.domain_name || params?.websiteName,
				is_private_whois_enabled: Boolean(privacyEnabled),
				privacy: privacyNode,
				contacts: whoisContacts,
				whois: whoisPayload?.whois || whoisPayload?.record || null,
				raw: whoisPayload,
			};
		} else if (type === "EnableDomainPrivacy" || type === "DisableDomainPrivacy") {
			const action = type === "EnableDomainPrivacy" ? "enabled" : "disabled";
			const success = data?.success !== false;
			const downstreamPrivacy =
				data?.data?.privacy ||
				data?.data?.privacy_protection ||
				data?.data?.privacy_guard ||
				null;
			const payload = data?.data && typeof data.data === "object" ? data.data : {};
			const message =
				data?.message ||
				payload?.message ||
				`Privacy protection ${action}${success ? "" : " failed"}`;
			const privacyEnabled = Boolean(
				payload?.privacy_enabled ??
				payload?.privacyEnabled ??
				payload?.is_private_whois_enabled ??
				(action === "enabled" ? success : !success)
			);

			normalized.responseMsg.message = message;
			normalized.responseMsg.statusCode = success ? 200 : 400;
			normalized.responseData = {
				...payload,
				is_private_whois_enabled: privacyEnabled,
				success,
				privacy: downstreamPrivacy,
			};
		}

		return normalized;
	}

	 
	  
	// Only process for openprovider
	if (provider !== "openprovider") return data;

	const token = await getOpenproviderToken();
	const normalized = {
		responseMsg: {
			id: 0,
			reason: null,
			statusCode: data.code === 0 ? 200 : data.code,
			message: data.message ?? "Success",
		},
		responseData: {},
	};

	// Get appropriate handler based on operation type or use default
	const handler = responseHandlers[type] || responseHandlers.default;
	normalized.responseData = await handler(data, params, token);

	return normalized;
};

module.exports = normalizeResponse;
