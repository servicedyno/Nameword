const { splitDomain } = require("../tldConfig");
const { parsePhoneNumberFromString } =require('libphonenumber-js');
const getExchangeRate = require("../../../../utils/currency");

// Object containing API endpoint mappings for OpenProvider domain operations
const openproviderMappings = {
	// Check domain availability and get pricing information
	checkdomainavailable: {
		steps: [
			// Check domain availability
			{
				method: "POST",
				path: "/domains/check",
				params: (p) => ({
					domains: [
						{
							...splitDomain(p.websiteName),
						},
					],
					with_price: true,
				}),
			},
			// Get transfer pricing
			{
				method: "GET",
				path: "/domains/prices",
				params: (p) => ({
					"domain.name": splitDomain(p.websiteName).name,
					"domain.extension": splitDomain(p.websiteName).extension,
					operation: "transfer",
				}),
			},
			// Get renewal pricing
			{
				method: "GET",
				path: "/domains/prices",
				params: (p) => ({
					"domain.name": splitDomain(p.websiteName).name,
					"domain.extension": splitDomain(p.websiteName).extension,
					operation: "renew",
				}),
			},
		],
		// Combine responses from multiple API calls
		combine: async (responses) => {
			return {
				available: responses[0].data.results[0].status === "free",
				registrationFee:
					responses[0].data.results[0].price.product.price &&
					responses[0].data.results[0].price.product.currency !==
						"USD"
						? Number(
								(
									(await getExchangeRate(
										responses[0].data.results[0].price
											.product.currency,
										"USD"
									)) *
									responses[0].data.results[0].price.product
										.price
								).toFixed(2)
						  )
						: Number(
								responses[0].data.results[0].price.product
									.price || 0
						  ),
				domainType: responses[1].data.is_premium
					? "Premium"
					: "Standard",
				transferFee:
					responses[1].data.price?.product?.price &&
					responses[1].data.price?.product?.currency !== "USD"
						? Number(
								(
									(await getExchangeRate(
										responses[1].data.price?.product
											?.currency,
										"USD"
									)) * responses[1].data.price?.product?.price
								).toFixed(2)
						  )
						: Number(responses[1].data.price?.product?.price || 0),
				renewalfee:
					responses[2].data.price?.product?.price &&
					responses[2].data.price?.product?.currency !== "USD"
						? Number(
								(
									(await getExchangeRate(
										responses[2].data.price?.product
											?.currency,
										"USD"
									)) * responses[2].data.price?.product?.price
								).toFixed(2)
						  )
						: Number(responses[2].data.price?.product?.price || 0),
			};
		},
		// combine: async(responses) => {
		// 	console.log("00000",await getExchangeRate("USD", "INR"));
		// 	console.log("bdfbfbd", responses[0].data.results[0]);
		// 	return {
		// 		available: responses[0].data.results[0].status === "free",
		// 		registrationFee:
		// 			responses[0].data.results[0].price.product.price || 0,
		// 		domainType: responses[1].data.is_premium
		// 			? "Premium"
		// 			: "Standard",
		// 		transferFee: responses[1].data.price?.product?.price || 0,
		// 		renewalfee: responses[2].data.price?.product?.price || 0,
		// 	};
		// },
		message: (responses) =>
			responses[0].data.results[0].status === "free"
				? "Domain is available"
				: "Domain is not available",
	},

	// Get domain name suggestions
	domainSuggestion: {
		method: "POST",
		path: "/domains/suggest-name",
		params: (p) => ({
			language: "eng",
			limit: p.maxResult,
			name: p.keyword,
			provider: "namestudio",
			sensitive: false,
			tlds: [""],
		}),
	},

	// Get TLD suggestions
	getTldSuggestion: {
		method: "GET",
		path: "/tlds",
		params: (p) => ({ status: "ACT", limit: 999 }),
	},

	// Check domain pricing for multiple years
	checkDomainPrice: {
		steps: [
			// Check domain availability
			{
				method: "POST",
				path: "/domains/check",
				params: (p) => ({
					domains: [
						{
							...splitDomain(p.websiteName),
						},
					],
					with_price: true,
				}),
			},
			// Get pricing for years 1-10
			...Array.from({ length: 10 }, (_, i) => ({
				method: "GET",
				path: "/domains/prices",
				params: (p) => ({
					"domain.name": splitDomain(p.websiteName).name,
					"domain.extension": splitDomain(p.websiteName).extension,
					operation: "create",
					period: i + 1,
				}),
			})),
		],

		combine: async (responses) => {
			console.log("Responses:", responses);
			return {
				available: responses[0].data.results[0].status === "free",
				0: await Promise.all(
					responses.slice(1).map(async (response, index) => ({
						description: `Registration Price for ${
							index + 1
						} year is ${
							// response.data.price.product.price
							(
								(await getExchangeRate(
									response.data.price.product.currency,
									"USD"
								)) * response.data.price.product.price
							).toFixed(2)
						}`,
					}))
				),
			};
		},
		message: (responses) =>
			responses[0].data.results[0].status === "free"
				? "Domain is available"
				: "Domain is not available",
	},

	// (await getExchangeRate(response.data.price.product.currency, "USD") * response.data.price.product.price).toFixed(2)

	// Register a new domain
	domainorder: {
		method: "POST",
		path: "/domains",
		params: (p) => ({
			admin_handle: p.handle,
			billing_handle: p.handle,
			owner_handle: p.handle,
			tech_handle: p.handle,
			domain: splitDomain(p.Websitename),
			period: parseInt(p.Duration),
			name_servers: [
				...(p.ns1 ? [{ name: p.ns1 }] : []),
				...(p.ns2 ? [{ name: p.ns2 }] : []),
				...(p.ns3 ? [{ name: p.ns3 }] : []),
				...(p.ns4 ? [{ name: p.ns4 }] : []),
			],
			autorenew: "default",
			is_dnssec_enabled: false,
			is_private_whois_enabled: p.IsWhoisProtection == "true",
			...(p.promoCode ? { promo_code: p.promoCode } : {}),
			// additional_data: {
			// 	abogado_acceptance: "",
			// 	admin_sing_pass_id: "",
			// 	ae_acceptance: "1",
			// 	allocation_token: "",
			// 	auth_code: "",
			// 	bank_acceptance: "",
			// 	company_registration_number: "",
			// 	coop_acceptance: "1",
			// 	customer_uin: "",
			// 	customer_uin_doc_type: {},
			// 	domain_name_variants: [],
			// 	eligibility_type: "",
			// 	eligibility_type_relationship: "",
			// 	es_annex_acceptance: "1",
			// 	ftld_token: "",
			// 	gay_donation_acceptance: "1",
			// 	gay_rights_protection_acceptance: "1",
			// 	id_number: "",
			// 	id_type: "",
			// 	idn_script: "",
			// 	insurance_acceptance: "",
			// 	intended_use: "generic",
			// 	law_acceptance: "",
			// 	legal_type: "Individual",
			// 	maintainer: "",
			// 	membership_id: "",
			// 	mobile_phone_number_verification: "",
			// 	ngo_ong_eligibility_acceptance: "",
			// 	ngo_ong_policy_acceptance: "",
			// 	passport_number: "X123456",
			// 	rurf_blocked_domains: "",
			// 	self_service: "1",
			// 	trademark: "1",
			// 	trademark_id: "",
			// 	travel_acceptance: "1",
			// 	vat: "11843009X",
			// 	verification_code: "",
			// 	vote_acceptance: "",
			// 	voto_acceptance: ""
			// }
		}),
	},

	// View domain details
	ViewDomain: {
		method: "GET",
		path: "/domains",
		params: (p) => ({
			...(p?.domainId && { id: p?.domainId }),
			full_name: p.websiteName,
		}),
	},
	// Transfer domain to OpenProvider
	TransferOrder: {
		method: "POST",
		path: "/domains/transfer",
		params: (p) => ({
			domain: splitDomain(p.WebsiteName),
			admin_handle: p.handle,
			owner_handle: p.handle,
			tech_handle: p.handle,
			whois_protection: p.IsWhoisProtection === "true",
		}),
	},

	// Cancel domain transfer
	CancelTransfer: {
		method: "POST",
		path: "/domains/transfer/cancel",
		params: (p) => ({ id: p.id }),
	},

	// Check transfer status
	syncTransfer: {
		method: "GET",
		path: "/domains/transfer/status",
		params: (p) => ({ domain_name: p.domainName }),
	},

	// Renew domain registration
	RenewalOrder: {
		method: "POST",
		path: (p) => `/domains/${p.Id}/renew`,
		params: (p) => ({
			domain: splitDomain(p.Websitename),
			period: parseInt(p.Duration),
		}),
	},

	// Update nameservers
	UpdateNameServer: {
		method: "PUT",
		path: (p) => `/domains/${p.domainNameId}`,
		params: (p) => ({
			name_servers: [
				...Array.from({ length: 13 }, (_, i) => i + 1)
					.filter((num) => p[`nameServer${num}`])
					.map((num) => ({ name: p[`nameServer${num}`] })),
			],
		}),
	},

	// Update authorization code
	updateAuthCode: {
		method: "PUT",
		path: (p) => `/domains/${p.domainNameId}`,
		params: (p) => ({ auth_code: p.authCode }),
	},

	// Manage domain lock status
	ManageDomainLock: {
		method: "PUT",
		path: (p) => `/domains/${p.domainNameId}`,
		params: (p) => ({ is_locked: p.isDomainLocked }),
	},

	// Manage WHOIS privacy protection
	ManageDomainPrivacyProtection: {
		method: "PUT",
		path: (p) => `/domains/${p.domainNameId}`,
		params: (p) => ({ is_private_whois_enabled: p.iswhoisprotected }),
	},

	// Get EPP/Authorization code
	ViewEPPCode: {
		method: "GET",
		path: "/domains",
		params: (p) => ({ id: p.domainNameId }),
	},

	// Create DNS zone
	ManageDNSRecords: {
		method: "POST",
		path: "/dns/zones",
		params: (p) => ({
			domain: splitDomain(p.WebsiteName),
			type: "master",
			records: [],
		}),
	},

	// Add DNS record
	AddDNSRecord: {
		method: "PUT",
		path: (p) => `/dns/zones/${p.WebsiteName}`,
		params: (p) => ({
			records: {
				add: [
					{
						name:
							p.RecordName ||
							(p.RecordType === "CNAME"
								? p.WebsiteName
								: undefined),
						prio: p.recordPriority,
						ttl: p.RecordTTL,
						type: p.RecordType,
						value: p.RecordValue,
					},
				],
			},
		}),
	},

	// Modify DNS record
	ModifyDNSRecord: {
		method: "PUT",
		path: (p) => `/dns/zones/${p.WebsiteName}`,
		params: (p) => ({
			name: p.WebsiteName,
			domain: splitDomain(p.WebsiteName),
			records: {
				update: [
					{
						original_record: {
							name: p.OldRecordName
								? p.OldRecordName
								: p.RecordType === "CNAME"
								? p.WebsiteName
								: undefined,
							// prio:1, // Number(p.OldRecordPriority),
							ttl: Number(p.OldRecordTTL),
							type: p.OldRecordType,
							value: p.OldRecordValue,
						},
						record: {
							name: p.RecordName
								? p.RecordName
								: p.RecordType === "CNAME"
								? p.WebsiteName
								: undefined,
							// prio: 1,//Number(p.RecordPriority),
							ttl: Number(p.RecordTTL),
							type: p.RecordType,
							value: p.RecordValue,
						},
					},
				],
			},
		}),
	},

	// Delete DNS record
	DeleteDNSRecord: {
		method: "PUT",
		path: (p) => `/dns/zones/${p.WebsiteName}`,
		params: (p) => ({
			name: p.WebsiteName,
			domain: splitDomain(p.WebsiteName),
			records: {
				remove: [
					{
						name: p.RecordName
							? p.RecordName
							: p.RecordType === "CNAME"
							? p.WebsiteName
							: undefined,
						ttl: Number(p.RecordTTL),
						type: p.RecordType,
						value: p.RecordValue,
					},
				],
			},
		}),
	},

	// View DNS records
	ViewDNSRecord: {
		method: "GET",
		path: (p) => `/dns/zones/${p.WebsiteName}`,
		params: (p) => ({ with_records: true }),
	},

	// Set domain forwarding
	SetDomainForwarding: {
		method: "POST",
		path: (p) => `/dns/zones/${p.WebsiteId}/forwards`,
		params: (p) => ({ forward: p.forward }),
	},

	// Get domain forwarding settings
	GetDomainForwarding: {
		method: "GET",
		path: (p) => `/dns/zones/${p.WebsiteId}/forwards`,
	},

	// Update domain forwarding
	updatedomainforwarding: {
		method: "PUT",
		path: (p) => `/dns/zones/${p.WebsiteId}/forwards/${p.forwardId}`,
		params: (p) => ({ forward: p.forward }),
	},

	// Delete domain forwarding
	deletedomainforwarding: {
		method: "DELETE",
		path: (p) => `/dns/zones/${p.WebsiteId}/forwards/${p.forwardId}`,
	},

	// Add child nameserver
	AddChildNameServer: {
		method: "PUT",
		path: (p) => `/domains/${p.domainNameId}`,
		params: (p) => ({
			name_servers: p.nameServer,
		}),
	},

	// Modify child nameserver IP
	ModifyChildNameServerIP: {
		method: "PUT",
		path: (p) => `/domains/${p.domainNameId}`,
		params: (p) => ({
			name_servers: p.nameServer,
		}),
	},

	// Modify child nameserver hostname
	ModifyChildNameServerHostname: {
		method: "PUT",
		path: (p) => `/domains/${p.domainNameId}`,
		params: (p) => ({
			name_servers: p.nameServer,
		}),
	},

	// Delete child nameserver
	DeleteChildNameServer: {
		method: "PUT",
		path: (p) => `/domains/${p.domainNameId}`,
		params: (p) => ({
			name_servers: p.nameServer,
		}),
	},

	// Get child nameservers
	getchildnameservers: {
		method: "GET",
		path: "/domains",
		params: (p) => ({ id: p.id }),
	},

	// Add client to OpenProvider
	AddClient: {
		method: "POST",
		path: "/customers",
		params: (p) => ({
			"address": {
				"street": p.Address1,
				"number": "",
				"city": p.City || "",
				"zipcode": p.Zip || "",
				"state": p.StateName || "",
				"country": p.CountryName
			},
			"company_name": p.CompanyName,
			"email": p.email,
			"name": {
				"first_name": p.FirstName,
				"full_name": `${p.FirstName}  ${p.LastName}`,
				"initials": `${p.FirstName}  ${p.LastName}`.split(' ').filter(Boolean).map(name => name[0].toUpperCase()).join('.'),
				"last_name": p.LastName || "", "prefix": "Mx."
			},
			"phone": {
				"area_code": parsePhoneNumberFromString(p.PhoneNo).nationalNumber.slice(0, 3),
				"country_code": parsePhoneNumberFromString(p.PhoneNo).countryCallingCode,
				"subscriber_number": parsePhoneNumberFromString(p.PhoneNo).nationalNumber
			}
		}),
	},

	ManageDomainDNSSEC: {
		method: "PUT",
		path: (p) => `/domains/${p.websiteName}`,
		params: (p) => ({
			dnssec: p.dnssec || [],
			...(p.oldDnssec ? { oldDnssec: p.oldDnssec } : {}),
		}),
	},

	AddTechnicalContact: {
		method: "POST",
		path: "/contacts",
		params: (p) => ({
			first_name: p.firstName,
			last_name: p.lastName,
			email: p.email,
			phone: p.phone,
			address: p.address,
			type: "technical",
			// Add other required fields as per OpenProvider API
		}),
	},

	GetTechnicalContacts: {
		method: "GET",
		path: "/contacts",
		params: (p) => ({
			type: "technical",
			domain: p.domainName,
		}),
	},

	DeleteTechnicalContact: {
		method: "DELETE",
		path: (p) => `/contacts/${p.contactId}`,
		params: (p) => ({}),
	},

	modifyDomainRequest: {
		method: "POST",
		path: "/domains/modify",
		params: (p) => ({
			domain: { name: p.domainName }, // or use splitDomain if needed
			owner_handle: p.owner_handle, // the client handle
			// add other fields as required by OpenProvider API
		}),
	},

	// Customer management mappings
	AddCustomer: {
		method: "POST",
		path: "/customers",
		params: (p) => {
			// Validate required fields
			const firstName = p.firstName || p.first_name || "";
			const lastName = p.lastName || p.last_name || "";
			const email = p.email || "";
			const street = p.address || p.street || "";
			const city = p.city || "";
			const zipcode = p.zip || p.zipcode || "";
			const country = p.country || "";
			const phone = p.phone || p.subscriber_number || "";

			// Parse phone number to extract just the subscriber number
			let subscriberNumber = phone;
			if (phone && typeof phone === "string") {
				// Remove country code and area code if they're included in the phone number
				subscriberNumber = phone
					.replace(/^\+\d{1,3}-?/, "") // Remove country code like +1- or +1
					.replace(/^\d{3}-?/, "") // Remove area code like 555- or 555
					.replace(/[^\d]/g, ""); // Remove any non-digit characters
			}

			// Parse fax number similarly
			const faxNumber = p.fax || p.faxNo || "";
			let faxSubscriberNumber = faxNumber;
			if (faxNumber && typeof faxNumber === "string") {
				faxSubscriberNumber = faxNumber
					.replace(/^\+\d{1,3}-?/, "") // Remove country code
					.replace(/^\d{3}-?/, "") // Remove area code
					.replace(/[^\d]/g, ""); // Remove any non-digit characters
			}

			return {
				name: {
					first_name: firstName,
					last_name: lastName,
					initials:
						p.initials ||
						(firstName && lastName
							? `${firstName.charAt(0)}.${lastName.charAt(0)}.`
							: ""),
					full_name: p.full_name || `${firstName} ${lastName}`.trim(),
					prefix: p.prefix || "",
				},
				address: {
					street: street,
					number: p.addressNumber || p.number || "1",
					city: city,
					zipcode: zipcode,
					country: country,
					state: p.state || "",
				},
				phone: {
					country_code: p.phoneCountryCode || p.country_code || "+1",
					area_code: p.phoneAreaCode || p.area_code || "555",
					subscriber_number: subscriberNumber,
				},
				email: email,
				company_name: p.companyName || p.company_name || "",
				fax: faxNumber
					? {
							country_code:
								p.faxCountryCode || p.fax_country_code || "+1",
							area_code:
								p.faxAreaCode || p.fax_area_code || "555",
							subscriber_number: faxSubscriberNumber,
					  }
					: undefined,
				tags: Array.isArray(p.tags)
					? p.tags.map((tag) => ({
							key: tag.key || "customer",
							value: tag.value || "",
					  }))
					: [],
			};
		},
	},

	GetCustomerDetails: {
		method: "GET",
		path: (p) => `/customers/${p.handle}`,
		params: (p) => ({
			with_additional_data: p.withAdditionalData || "false",
		}),
	},

	UpdateCustomer: {
		method: "PUT",
		path: (p) => `/customers/${p.handle}`,
		params: (p) => {
			// Validate required fields
			const firstName = p.firstName || p.first_name || "";
			const lastName = p.lastName || p.last_name || "";
			const email = p.email || "";
			const street = p.address || p.street || "";
			const city = p.city || "";
			const zipcode = p.zip || p.zipcode || "";
			const country = p.country || "";
			const phone = p.phone || p.subscriber_number || "";

			// Parse phone number to extract just the subscriber number
			let subscriberNumber = phone || '1234567890';
			if (phone && typeof phone === "string") {
				// Remove country code and area code if they're included in the phone number
				subscriberNumber = phone
					.replace(/^\+\d{1,3}-?/, "") // Remove country code like +1- or +1
					.replace(/^\d{3}-?/, "") // Remove area code like 555- or 555
					.replace(/[^\d]/g, ""); // Remove any non-digit characters
			}

			// Parse fax number similarly
			const faxNumber = p.fax || p.faxNo || "";
			let faxSubscriberNumber = faxNumber;
			if (faxNumber && typeof faxNumber === "string") {
				faxSubscriberNumber = faxNumber
					.replace(/^\+\d{1,3}-?/, "") // Remove country code
					.replace(/^\d{3}-?/, "") // Remove area code
					.replace(/[^\d]/g, ""); // Remove any non-digit characters
			}

			return {
				name: {
					first_name: firstName,
					last_name: lastName,
					initials:
						p.initials ||
						(firstName && lastName
							? `${firstName.charAt(0)}.${lastName.charAt(0)}.`
							: ""),
					full_name: p.full_name || `${firstName} ${lastName}`.trim(),
					prefix: p.prefix || "",
				},
				address: {
					street: street,
					number: p.addressNumber || p.number || "1",
					city: city,
					zipcode: zipcode,
					country: country,
					state: p.state || "",
				},
				phone: {
					country_code: p.phoneCountryCode || p.country_code || "+1",
					area_code: p.phoneAreaCode || p.area_code || "555",
					subscriber_number: subscriberNumber,
				},
				email: email,
				company_name: p.companyName || p.company_name || "",
				fax: faxNumber
					? {
							country_code:
								p.faxCountryCode || p.fax_country_code || "+1",
							area_code:
								p.faxAreaCode || p.fax_area_code || "555",
							subscriber_number: faxSubscriberNumber,
					  }
					: undefined,
				tags: Array.isArray(p.tags)
					? p.tags.map((tag) => ({
							key: tag.key || "customer",
							value: tag.value || "",
					  }))
					: [],
			};
		},
	},

	DeleteCustomer: {
		method: "DELETE",
		path: (p) => `/customers/${p.handle}`,
		params: (p) => ({}),
	},

	// Domain contact management mappings
	ModifyDomainContacts: {
		method: "PUT",
		path: (p) => `/domains/${p.domainId}`,
		params: (p) => {
			const updateData = {};

			// Only include the contact types that are being updated
			if (p.contacts.owner_handle !== undefined) {
				updateData.owner_handle = p.contacts.owner_handle;
			}
			if (p.contacts.customerId !== undefined) {
				updateData.customerId = p.contacts.customerId;
			}
			if (p.contacts.admin_handle !== undefined) {
				updateData.admin_handle = p.contacts.admin_handle;
			}
			if (p.contacts.tech_handle !== undefined) {
				updateData.tech_handle = p.contacts.tech_handle;
			}
			if (p.contacts.billing_handle !== undefined) {
				updateData.billing_handle = p.contacts.billing_handle;
			}

			return updateData;
		},
	},

	// Legacy mapping for backward compatibility
	UpdateDomainContacts: {
		method: "PUT",
		path: (p) => `/domains/${p.domainId}`,
		params: (p) => {
			const updateData = {};

			// Only include the contact types that are being updated
			if (p.contacts.owner_handle !== undefined) {
				updateData.owner_handle = p.contacts.owner_handle;
			}
			if (p.contacts.admin_handle !== undefined) {
				updateData.admin_handle = p.contacts.admin_handle;
			}
			if (p.contacts.tech_handle !== undefined) {
				updateData.tech_handle = p.contacts.tech_handle;
			}
			if (p.contacts.billing_handle !== undefined) {
				updateData.billing_handle = p.contacts.billing_handle;
			}

			return updateData;
		},
	},
};

module.exports = openproviderMappings;
