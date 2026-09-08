const User = require("../../models/User");
const Domain = require("../../models/Domain");
const BadRequestError = require("../../errors/BadRequestError");
const NotFoundError = require("../../errors/NotFoundError");
const domainProviderApiClient = require("../../utils/domainProviderApiClient");
const {
	createClientOnBothProviders,
	createDomainProviderClient,
} = require("../../services/domainProviderClient");
const apiClient = require("../../utils/apiclient");

class DomainContactController {
	// Get all contacts of a specific type for a domain
	static async getAll(req, res) {
		const { domainName } = req.params;
		const { contactType = "technical" } = req.query; // Default to technical for backward compatibility
		const domain = await Domain.findOne({ websiteName: domainName, deletedAt: { $eq: null } });
		if (!domain) throw new NotFoundError("Domain not found");
		const provider = domain.provider;
		const user = await User.findById(req.user.id);
		if (!user) throw new NotFoundError("User not found");

		// Helper function to normalize HostBay contact format to our standard format
		const normalizeHostBayContact = (hostbayContact, contactType) => {
			if (!hostbayContact) return null;

			// Parse phone number (format: "+1 1234567890" or "1234567890")
			let phoneCountryCode = "+1";
			let phoneSubscriber = "";
			if (hostbayContact.phone) {
				const phoneStr = String(hostbayContact.phone).trim();
				if (phoneStr.startsWith("+")) {
					const parts = phoneStr.split(" ");
					phoneCountryCode = parts[0] || "+1";
					phoneSubscriber = parts.slice(1).join(" ") || phoneStr.substring(1);
				} else {
					phoneSubscriber = phoneStr;
				}
			}

			return {
				handle: contactType, // HostBay doesn't use handles, use contact type as identifier
				name: {
					first_name: hostbayContact.first_name || "",
					last_name: hostbayContact.last_name || "",
					full_name: `${hostbayContact.first_name || ""} ${hostbayContact.last_name || ""}`.trim(),
				},
				email: hostbayContact.email || "",
				phone: {
					country_code: phoneCountryCode,
					subscriber_number: phoneSubscriber,
				},
				address: {
					street: hostbayContact.address || "",
					addressLine2: hostbayContact.address_line_2 || "",
					city: hostbayContact.city || "",
					state: hostbayContact.state || "",
					country: hostbayContact.country || "",
					zipcode: hostbayContact.postal_code || hostbayContact.zipcode || "",
				},
				company_name: hostbayContact.company || hostbayContact.company_name || "",
			};
		};

		try {
			const domainDetails = await domainProviderApiClient.request(
				"ViewDomain",
				{ websiteName: domainName },
				null,
				provider
			);
			console.log(
				"Domain details response:",
				JSON.stringify(domainDetails, null, 2)
			);

			// Check if the API request failed (non-200 status code)
			if (domainDetails?.responseMsg && domainDetails.responseMsg.statusCode !== 200) {
				const errorMessage = domainDetails.responseMsg.message || 
					domainDetails.providerError?.message || 
					`Failed to fetch domain details from ${provider}`;
				
				return res.status(domainDetails.responseMsg.statusCode || 500).json({
					error: "Failed to fetch domain contacts",
					message: errorMessage,
					responseMsg: domainDetails.responseMsg,
					providerError: domainDetails.providerError,
					provider,
				});
			}

			// 2. Extract contact handles/IDs
			let contactHandles = {};

			if (provider === "hostbay") {
				// Check if HostBay managed contacts
				const contactTypeFlag = domainDetails?.responseData?.contact_type || domainDetails?.data?.contact_type;
				
				const storedContacts = domain.contacts || {};

				if (contactTypeFlag === "hostbay_managed" && !Object.values(storedContacts || {}).some(Boolean)) {
					console.log("HostBay manages WHOIS contacts automatically. No manual handles available and no stored contacts found.");
					return res.json({
						domain: domainName,
						provider,
						contacts: {
							registrant: null,
							admin: null,
							technical: null,
							billing: null,
						},
						message: "HostBay managed contacts — no manual handles available.",
					});
				}
				const extractAddressParts = (address, fallbackLine2 = "") => {
					if (!address || typeof address !== "string") {
						return { street: address || "", addressLine2: fallbackLine2 || "" };
					}
					const parts = address
						.split(",")
						.map((part) => part.trim())
						.filter((part) => part.length > 0);
					if (parts.length === 0) {
						return { street: address.trim(), addressLine2: fallbackLine2 || "" };
					}
					const street = parts.shift();
					return {
						street,
						addressLine2: parts.join(", ") || fallbackLine2 || "",
					};
				};

				const normalizeStoredContact = (contact) => {
					if (!contact) return null;
					const normalized = JSON.parse(JSON.stringify(contact));
					if (normalized.address) {
						const currentStreet = normalized.address.street || "";
						const currentLine2 = normalized.address.addressLine2 || "";
						const { street, addressLine2 } = extractAddressParts(currentStreet, currentLine2);
						normalized.address.street = street;
						normalized.address.addressLine2 = addressLine2;
					}
					return normalized;
				};

				if (contactType && contactType.toLowerCase() !== "all") {
					const contactTypeKey = contactType.toLowerCase();
					const key =
						contactTypeKey === "tech"
							? "technical"
							: contactTypeKey === "administrative"
								? "admin"
								: contactTypeKey;
					const normalizedContact = normalizeStoredContact(storedContacts[key], key);

					return res.json({
						domain: domainName,
						provider,
						contacts: {
							[contactTypeKey]: normalizedContact || null,
						},
						message: normalizedContact ? undefined : "No contact data stored for this type.",
					});
				}

				const adminContact = normalizeStoredContact(storedContacts.admin, "admin");
				const technicalContact = normalizeStoredContact(storedContacts.technical || storedContacts.tech, "technical");
				const contacts = {
					registrant: normalizeStoredContact(storedContacts.registrant, "registrant"),
					administrative: adminContact,
					admin: adminContact,
					technical: technicalContact,
					tech: technicalContact,
					billing: normalizeStoredContact(storedContacts.billing, "billing"),
				};

				return res.json({
					domain: domainName,
					provider,
					contacts,
					message: Object.values(contacts).some(Boolean)
						? undefined
						: "No stored contact data available for this domain.",
				});
			}


			if (provider === "openprovider") {
				contactHandles = {
					registrant:
						domainDetails?.responseData?.owner_handle ||
						domainDetails?.responseData?.admin_handle,
					technical: domainDetails?.responseData?.tech_handle,
					admin: domainDetails?.responseData?.admin_handle,
					billing: domainDetails?.responseData?.billing_handle,
				};
			} else if (provider === "connectreseller") {
				contactHandles = {
					registrant:
						domainDetails?.responseData?.registrantContactId,
					technical: domainDetails?.responseData?.technicalContactId,
					admin: domainDetails?.responseData?.adminContactId,
					billing: domainDetails?.responseData?.billingContactId,
				};
			}

			console.log("Extracted contact handles:", contactHandles);
			console.log("Contact type:", contactType);
			// If specific contact type is requested, only return that type
			if (contactType && contactType.toLowerCase() !== "all") {
				const contactTypeKey = contactType.toLowerCase();
				const handle = contactHandles[contactTypeKey];
				console.log("Handle:", handle);
				if (!handle) {
					return res.json({
						domain: domainName,
						provider,
						contacts: {
							[contactTypeKey]: null,
						},
					});
				}

				try {
					const contactDetails =
						await domainProviderApiClient.request(
							provider === "openprovider"
								? "GetCustomerDetails"
								: "ViewRegistrant",
							{
								...(provider === "openprovider"
									? { handle }
									: {
										contactId: handle,
									}),
							},
							"get",
							provider
						);

					console.log("Contact details:", contactDetails);
					let normalizedContact = null;
					if (contactDetails?.responseData) {
						normalizedContact =
							provider === "openprovider"
								? {
									handle: contactDetails?.responseData
										?.handle,
									name: {
										first_name:
											contactDetails?.responseData
												?.name?.first_name,
										last_name:
											contactDetails?.responseData
												?.name?.last_name,
										full_name:
											contactDetails?.responseData
												?.name?.full_name,
									},
									email: contactDetails?.responseData
										?.email,
									phone: {
										country_code:
											contactDetails?.responseData
												?.phone?.country_code,
										subscriber_number:
											contactDetails?.responseData
												?.phone?.subscriber_number,
									},
									address: {
										street: contactDetails?.responseData
											?.address?.street,
										city: contactDetails?.responseData
											?.address?.city,
										state: contactDetails?.responseData
											?.address?.state,
										country:
											contactDetails?.responseData
												?.address?.country,
										zipcode:
											contactDetails?.responseData
												?.address?.zipcode,
									},
									company_name:
										contactDetails?.responseData
											?.company_name,
									fax: contactDetails?.responseData?.fax,
									tags: contactDetails?.responseData
										?.tags,
								}
								: {
									handle:
										contactDetails?.responseData
											?.ContactId ||
										contactDetails?.responseData
											?.clientId,
									name: {
										first_name:
											contactDetails?.responseData?.Name?.split(
												" "
											)[0] ||
											contactDetails?.responseData
												?.FirstName,
										last_name:
											contactDetails?.responseData?.Name?.split(
												" "
											)
												.slice(1)
												.join(" ") ||
											contactDetails?.responseData
												?.LastName,
										full_name:
											contactDetails?.responseData
												?.Name ||
											`${contactDetails?.responseData?.FirstName} ${contactDetails?.responseData?.LastName}`,
									},
									email:
										contactDetails?.responseData
											?.emailaddress ||
										contactDetails?.responseData
											?.EmailAddress,
									phone: {
										country_code:
											contactDetails?.responseData
												?.phoneNo_cc || "+1",
										subscriber_number:
											contactDetails?.responseData
												?.phoneNo ||
											contactDetails?.responseData
												?.PhoneNo,
									},
									address: {
										street:
											contactDetails?.responseData
												?.address ||
											contactDetails?.responseData
												?.Address,
										city:
											contactDetails?.responseData
												?.city ||
											contactDetails?.responseData
												?.City,
										state:
											contactDetails?.responseData
												?.stateName ||
											contactDetails?.responseData
												?.StateName,
										country:
											contactDetails?.responseData
												?.countryName ||
											contactDetails?.responseData
												?.CountryCode,
										zipcode:
											contactDetails?.responseData
												?.zip ||
											contactDetails?.responseData
												?.ZipCode,
									},
									company_name:
										contactDetails?.responseData
											?.companyName ||
										contactDetails?.responseData
											?.CompanyName,
									fax:
										contactDetails?.responseData
											?.faxNo ||
											contactDetails?.responseData?.FaxNo
											? {
												country_code:
													contactDetails
														?.responseData
														?.faxNo_cc ||
													"+1",
												subscriber_number:
													contactDetails
														?.responseData
														?.faxNo ||
													contactDetails
														?.responseData
														?.FaxNo,
											}
											: null,
								};
					}
					console.log("Normalized contact:", normalizedContact);

					// If API didn't return contact data, try to get from DB
					if (!normalizedContact && domain.contacts && domain.contacts[contactTypeKey]) {
						console.log(`[${provider} GetAll] No API data for ${contactTypeKey}, using DB data`);
						normalizedContact = domain.contacts[contactTypeKey];
					}

					// If we have contact data (from API or DB), save/update it in DB
					if (normalizedContact) {
						if (!domain.contacts) {
							domain.contacts = {};
						}
						domain.contacts[contactTypeKey] = normalizedContact;
						domain.contacts.lastUpdated = new Date();
						await domain.save();
						console.log(`[${provider} GetAll] Saved ${contactTypeKey} contact to DB`);
					}

					return res.json({
						domain: domainName,
						provider,
						contacts: {
							[contactTypeKey]: normalizedContact,
						},
					});
				} catch (error) {
					console.error(
						`Error fetching ${contactType} contact details:`,
						error
					);
					
					// Try to get from DB if API failed
					let dbContact = null;
					if (domain.contacts && domain.contacts[contactTypeKey]) {
						console.log(`[${provider} GetAll] API failed, using DB data for ${contactTypeKey}`);
						dbContact = domain.contacts[contactTypeKey];
					}
					
					return res.json({
						domain: domainName,
						provider,
						contacts: {
							[contactTypeKey]: dbContact,
						},
						error: dbContact ? null : `Failed to fetch ${contactType} contact details`,
					});
				}
			}

			// 3. Fetch complete contact details for each handle/ID if all contacts are requested
			const contacts = {};
			for (const [role, handle] of Object.entries(contactHandles)) {
				if (handle) {
					try {
						const contactDetails =
							await domainProviderApiClient.request(
								provider === "openprovider"
									? "GetCustomerDetails"
									: "ViewRegistrant",
								{
									...(provider === "openprovider"
										? { handle }
										: {
											contactId: handle,
										}),
								},
								"get",
								provider
							);

						console.log(
							`Contact details for ${role}:`,
							JSON.stringify(contactDetails, null, 2)
						);

						let normalizedContact = null;
						// Use the same normalization logic for consistency
						if (contactDetails?.responseData) {
							normalizedContact =
								provider === "openprovider"
									? {
										handle: contactDetails?.responseData
											?.handle,
										name: {
											first_name:
												contactDetails?.responseData
													?.name?.first_name,
											last_name:
												contactDetails?.responseData
													?.name?.last_name,
											full_name:
												contactDetails?.responseData
													?.name?.full_name,
										},
										email: contactDetails?.responseData
											?.email,
										phone: {
											country_code:
												contactDetails?.responseData
													?.phone?.country_code,
											subscriber_number:
												contactDetails?.responseData
													?.phone
													?.subscriber_number,
										},
										address: {
											street: contactDetails
												?.responseData?.address
												?.street,
											city: contactDetails
												?.responseData?.address
												?.city,
											state: contactDetails
												?.responseData?.address
												?.state,
											country:
												contactDetails?.responseData
													?.address?.country,
											zipcode:
												contactDetails?.responseData
													?.address?.zipcode,
										},
										company_name:
											contactDetails?.responseData
												?.company_name,
										fax: contactDetails?.responseData
											?.fax,
										tags: contactDetails?.responseData
											?.tags,
									}
									: {
										handle:
											contactDetails?.responseData
												?.ContactId ||
											contactDetails?.responseData
												?.clientId,
										name: {
											first_name:
												contactDetails?.responseData?.Name?.split(
													" "
												)[0] ||
												contactDetails?.responseData
													?.FirstName,
											last_name:
												contactDetails?.responseData?.Name?.split(
													" "
												)
													.slice(1)
													.join(" ") ||
												contactDetails?.responseData
													?.LastName,
											full_name:
												contactDetails?.responseData
													?.Name ||
												`${contactDetails?.responseData?.FirstName} ${contactDetails?.responseData?.LastName}`,
										},
										email:
											contactDetails?.responseData
												?.emailaddress ||
											contactDetails?.responseData
												?.EmailAddress,
										phone: {
											country_code:
												contactDetails?.responseData
													?.phoneNo_cc || "+1",
											subscriber_number:
												contactDetails?.responseData
													?.phoneNo ||
												contactDetails?.responseData
													?.PhoneNo,
										},
										address: {
											street:
												contactDetails?.responseData
													?.address ||
												contactDetails?.responseData
													?.Address,
											city:
												contactDetails?.responseData
													?.city ||
												contactDetails?.responseData
													?.City,
											state:
												contactDetails?.responseData
													?.stateName ||
												contactDetails?.responseData
													?.StateName,
											country:
												contactDetails?.responseData
													?.countryName ||
												contactDetails?.responseData
													?.CountryCode,
											zipcode:
												contactDetails?.responseData
													?.zip ||
												contactDetails?.responseData
													?.ZipCode,
										},
										company_name:
											contactDetails?.responseData
												?.companyName ||
											contactDetails?.responseData
												?.CompanyName,
										fax:
											contactDetails?.responseData
												?.faxNo ||
												contactDetails?.responseData
													?.FaxNo
												? {
													country_code:
														contactDetails
															?.responseData
															?.faxNo_cc ||
														"+1",
													subscriber_number:
														contactDetails
															?.responseData
															?.faxNo ||
														contactDetails
															?.responseData
															?.FaxNo,
												}
												: null,
									};
						}
						console.log(
							`Normalized contact for ${role}:`,
							JSON.stringify(normalizedContact, null, 2)
						);
						contacts[role] = normalizedContact;
					} catch (error) {
						console.error(
							`Error fetching ${role} contact details:`,
							error
						);
						contacts[role] = {
							handle,
							error: "Failed to fetch details",
						};
					}
				}
			}

			return res.json({
				domain: domainName,
				provider,
				contacts,
			});
		} catch (error) {
			console.error("Error fetching domain contacts:", error);
			throw new BadRequestError("Failed to fetch domain contacts");
		}
	}

	// Add a contact to a domain
	static async add(req, res) {
		const { domainName } = req.params;
		const { contactType = "technical" } = req.query; // Default to technical for backward compatibility
		const domain = await Domain.findOne({ websiteName: domainName });
		if (!domain) throw new NotFoundError("Domain not found");
		const provider = domain.provider;
		const user = await User.findById(req.user.id);
		if (!user) throw new NotFoundError("User not found");
		const contactData = req.body;

		if (
			!contactData.firstName ||
			!contactData.lastName ||
			!contactData.email
		) {
			return res.status(400).json({
				error: "Missing required fields",
				message: "firstName, lastName, and email are required",
				received: {
					firstName: contactData.firstName,
					lastName: contactData.lastName,
					email: contactData.email,
					fullBody: req.body,
				},
				provider,
			});
		}

		let contactHandleOrId;
		let contactResponse;

		try {
			if (provider === "openprovider") {
				// 1. Create contact customer using proper OpenProvider structure
				contactResponse = await domainProviderApiClient.request(
					"AddCustomer",
					{
						firstName: contactData.firstName,
						lastName: contactData.lastName,
						initials: contactData.initials,
						prefix: contactData.prefix,
						email: contactData.email,
						address: contactData.address,
						addressNumber: contactData.addressNumber,
						city: contactData.city,
						zip: contactData.zip,
						country: contactData.country,
						state: contactData.state,
						phoneCountryCode: contactData.phoneCountryCode,
						phoneAreaCode: contactData.phoneAreaCode,
						phone: contactData.phone,
						companyName: contactData.companyName,
						fax: contactData.fax,
						faxCountryCode: contactData.faxCountryCode,
						faxAreaCode: contactData.faxAreaCode,
						tags: contactData.tags,
					},
					"post",
					provider
				);

				console.log("contactResponse =======>", contactResponse);
				if (!contactResponse?.responseData?.handle) {
					throw new BadRequestError(
						"Failed to add contact. Please try again."
					);
				}

				contactHandleOrId = contactResponse.responseData.handle;

				// 2. Update domain with new handle
				const contacts = {};

				console.log("registrant =======>", contactType.toLowerCase());
				// Set only the specific contact type we want to modify
				switch (contactType.toLowerCase()) {
					case "registrant":
						contacts.admin_handle = contactHandleOrId;
						break;
					case "admin":
						contacts.admin_handle = contactHandleOrId;
						break;
					case "billing":
						contacts.billing_handle = contactHandleOrId;
						break;
					case "technical":
					default:
						contacts.tech_handle = contactHandleOrId;
						break;
				}

				const domainDetails = await domainProviderApiClient.request(
					"ViewDomain",
					{ websiteName: domainName },
					null,
					provider
				);

				const { websiteId } = domainDetails?.responseData;
				if (!websiteId) {
					throw new BadRequestError(
						"Could not get domain ID for contact update"
					);
				}

				console.log("contacts =======>", contacts);
				const updateRes = await domainProviderApiClient.request(
					"ModifyDomainContacts",
					{
						domainId: websiteId,
						contacts: contacts,
					},
					"put",
					provider
				);
				console.log("updateRes =======>", updateRes);
				if (updateRes?.responseMsg?.statusCode !== 200) {
					const errorMessage = updateRes?.responseMsg?.message || 
						updateRes?.providerError?.desc || 
						"Failed to add contact. Please try again.";
					throw new BadRequestError(errorMessage);
				}

				// API call succeeded - now save to DB
				console.log(`[${provider} Add] API call successful, saving to DB`);
				const contactTypeKey = contactType.toLowerCase();
				
				// Normalize contact data for DB storage
				const normalizedContact = {
					handle: contactHandleOrId,
					name: {
						first_name: contactData.firstName || "",
						last_name: contactData.lastName || "",
						full_name: `${contactData.firstName || ""} ${contactData.lastName || ""}`.trim(),
					},
					email: contactData.email || "",
					phone: {
						country_code: contactData.phoneCountryCode || "+1",
						subscriber_number: contactData.phone || "",
					},
					address: {
						street: contactData.address || "",
						addressLine2: "",
						city: contactData.city || "",
						state: contactData.state || "",
						country: contactData.country || "",
						zipcode: contactData.zip || "",
					},
					company_name: contactData.companyName || "",
				};

				if (normalizedContact) {
					if (!domain.contacts) {
						domain.contacts = {};
					}
					domain.contacts[contactTypeKey] = normalizedContact;
					domain.contacts.lastUpdated = new Date();
					await domain.save();
					console.log(`[${provider} Add] Saved ${contactTypeKey} contact to DB`);
				}
			} else if (provider === "connectreseller") {
				// Get client ID (create client if needed)
				let clientId =
					user?.domainProviderClient?.connectreseller?.clientId;
				if (!clientId) {
					// Generate a random password for the client
					const generateRandomPassword = () => {
						const chars =
							"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
						let password = "";
						for (let i = 0; i < 12; i++) {
							password += chars.charAt(
								Math.floor(Math.random() * chars.length)
							);
						}
						return password;
					};

					const clientParams = {
						FirstName: contactData.firstName,
						LastName: contactData.lastName,
						UserName: contactData.email,
						Password: generateRandomPassword(),
						CompanyName: contactData.companyName || "",
						Address1: contactData.address,
						City: contactData.city,
						StateName: contactData.state || "",
						CountryName: contactData.country,
						Zip: contactData.zip,
						PhoneNo_cc: contactData.phoneCountryCode || "+1",
						PhoneNo: contactData.phone,
						Faxno_cc: contactData.faxCountryCode || "",
						FaxNo: contactData.fax || "",
						Alternate_Phone_cc: "",
						Alternate_Phone: "",
						Id: user.id.toString(),
					};

					contactResponse = await domainProviderApiClient.request(
						"AddClient",
						clientParams,
						null,
						provider
					);

					clientId =
						contactResponse?.responseData?.clientId ||
						contactResponse?.clientId;

					if (!user.domainProviderClient) {
						user.domainProviderClient = {};
					}
					user.domainProviderClient.connectreseller = {
						clientId,
						username: user.email,
					};
					await user.save();
				}

				if (!clientId) {
					throw new Error(
						"Failed to create client - no client ID returned"
					);
				}

				// 1. Create registrant contact using the official API
				const contactParams = {
					firstName: contactData.firstName,
					lastName: contactData.lastName,
					email: contactData.email,
					companyName: contactData.companyName || "",
					address: contactData.address,
					city: contactData.city,
					state: contactData.state || "",
					country: contactData.country,
					zip: contactData.zip,
					phoneCountryCode: contactData.phoneCountryCode || "+1",
					phone: contactData.phone,
					faxCountryCode: contactData.faxCountryCode || "",
					fax: contactData.fax || "",
					alternatePhoneCountryCode: "",
					alternatePhone: "",
					clientId: clientId,
				};

				console.log(
					"Creating registrant contact with params:",
					JSON.stringify(contactParams, null, 2)
				);

				// Create registrant contact
				const contactCreateResponse =
					await domainProviderApiClient.request(
						"AddRegistrantContact",
						contactParams,
						null,
						provider
					);

				console.log(
					"AddRegistrantContact response:",
					JSON.stringify(contactCreateResponse, null, 2)
				);

				if (contactCreateResponse?.responseMsg?.statusCode !== 200) {
					throw new Error(
						`Failed to create contact: ${contactCreateResponse?.responseMsg?.message ||
						"Unknown error"
						}`
					);
				}

				// Extract contact ID from response - need to check the actual response structure
				const newContactId =
					contactCreateResponse?.responseData?.contactId?.toString() ||
					contactCreateResponse?.responseData?.RegistrantContactId?.toString() ||
					contactCreateResponse?.responseMsg?.id?.toString();

				if (!newContactId) {
					throw new Error("Failed to get contact ID from response");
				}

				// Wait a moment for the contact to be fully processed
				await new Promise((resolve) => setTimeout(resolve, 2000));

				const contactDetails = await domainProviderApiClient.request(
					"ViewRegistrant",
					{
						contactId: newContactId,
					},
					"get",
					provider
				);

				console.log(
					"Contact details:=====================================>",
					contactDetails
				);

				// 2. Get current domain details to get domainNameId and preserve other contacts
				const domainDetails = await domainProviderApiClient.request(
					"ViewDomain",
					{ websiteName: domainName },
					null,
					provider
				);

				const domainNameId = domainDetails?.responseData?.domainNameId;
				if (!domainNameId) {
					throw new Error(
						"Could not get domainNameId from domain details"
					);
				}

				// 3. Assign the new contact to the domain using official updatecontact endpoint
				const updateContactParams = {
					domainNameId: domainNameId,
					websiteName: domainName,
					adminContactId: domainDetails?.responseData?.adminContactId,
					billingContactId:
						domainDetails?.responseData?.billingContactId,
					registrantContactId:
						domainDetails?.responseData?.registrantContactId,
					technicalContactId:
						domainDetails?.responseData?.technicalContactId,
				};

				// Update the specific contact type
				switch (contactType.toLowerCase()) {
					case "registrant":
						updateContactParams.registrantContactId = newContactId;
						break;
					case "admin":
						updateContactParams.adminContactId = newContactId;
						break;
					case "billing":
						updateContactParams.billingContactId = newContactId;
						break;
					case "technical":
					default:
						updateContactParams.technicalContactId = newContactId;
				}

				console.log(
					"Updating domain contacts with params:",
					JSON.stringify(updateContactParams, null, 2)
				);

				const assignmentResponse =
					await domainProviderApiClient.request(
						"ModifyDomainContact",
						updateContactParams,
						null,
						provider
					);

				console.log(
					"ModifyDomainContact response:",
					JSON.stringify(assignmentResponse, null, 2)
				);

				if (assignmentResponse?.responseMsg?.statusCode !== 200) {
					throw new Error(
						`Failed to assign contact to domain: ${assignmentResponse?.responseMsg?.message ||
						"Unknown error"
						}`
					);
				}

				// API call succeeded - now save to DB
				console.log(`[${provider} Add] API call successful, saving to DB`);
				const contactTypeKey = contactType.toLowerCase();
				
				// Normalize contact data for DB storage
				const normalizedContact = {
					handle: newContactId,
					name: {
						first_name: contactData.firstName || "",
						last_name: contactData.lastName || "",
						full_name: `${contactData.firstName || ""} ${contactData.lastName || ""}`.trim(),
					},
					email: contactData.email || "",
					phone: {
						country_code: contactData.phoneCountryCode || "+1",
						subscriber_number: contactData.phone || "",
					},
					address: {
						street: contactData.address || "",
						addressLine2: "",
						city: contactData.city || "",
						state: contactData.state || "",
						country: contactData.country || "",
						zipcode: contactData.zip || "",
					},
					company_name: contactData.companyName || "",
				};

				if (normalizedContact) {
					if (!domain.contacts) {
						domain.contacts = {};
					}
					domain.contacts[contactTypeKey] = normalizedContact;
					domain.contacts.lastUpdated = new Date();
					await domain.save();
					console.log(`[${provider} Add] Saved ${contactTypeKey} contact to DB`);
				}

				// Format response to match OpenProvider structure
				return res.status(200).json({
					success: true,
					message: `${contactType} contact created and assigned successfully`,
					data: {
						contactId: newContactId,
						contactType: contactType,
						contactData: normalizedContact,
					},
					provider: "connectreseller",
				});
			} else if (provider === "hostbay") {
				// For HostBay, we need to get current domain contacts and update the specific one
				const domainDetails = await domainProviderApiClient.request(
					"ViewDomain",
					{ websiteName: domainName },
					null,
					provider
				);

				const responseData = domainDetails?.responseData || domainDetails?.data || {};
				
				// Get existing contacts
				const existingContacts = {
					registrant: responseData.registrant || responseData.registrant_contact || {},
					admin: responseData.admin || responseData.admin_contact || {},
					tech: responseData.tech || responseData.technical || responseData.technical_contact || {},
					billing: responseData.billing || responseData.billing_contact || {},
				};

				// Helper to convert our contact data to HostBay format
				// HostBay API expects: first_name, last_name, email, phone, address, city, state, postal_code, country, company
				const formatHostBayContact = (data) => {
					if (!data || (typeof data !== "object")) {
						return {};
					}

					// Parse phone - HostBay expects phone as string: "+1.5551234567" (with dot, not space) per API docs
					let phone = "";
					if (data.phoneCountryCode && data.phone) {
						const countryCode = data.phoneCountryCode.startsWith("+") 
							? data.phoneCountryCode 
							: `+${data.phoneCountryCode}`;
						// HostBay format: "+1.5551234567" (dot separator)
						const subscriber = String(data.phone).replace(/\s+/g, ""); // Remove spaces
						phone = `${countryCode}.${subscriber}`;
					} else if (data.phone && typeof data.phone === "object" && data.phone.country_code && data.phone.subscriber_number) {
						const countryCode = data.phone.country_code.startsWith("+") 
							? data.phone.country_code 
							: `+${data.phone.country_code}`;
						// HostBay format: "+1.5551234567" (dot separator)
						const subscriber = String(data.phone.subscriber_number).replace(/\s+/g, ""); // Remove spaces
						phone = `${countryCode}.${subscriber}`;
					} else if (typeof data.phone === "string") {
						// If already in HostBay format or needs conversion
						let phoneStr = data.phone.trim();
						// If it has space, convert to dot format
						if (phoneStr.includes(" ")) {
							const parts = phoneStr.split(" ");
							if (parts[0].startsWith("+")) {
								phone = `${parts[0]}.${parts.slice(1).join("").replace(/\s+/g, "")}`;
							} else {
								phone = `+${parts[0]}.${parts.slice(1).join("").replace(/\s+/g, "")}`;
							}
						} else {
							phone = phoneStr;
						}
					}

					return {
						first_name: data.firstName || data.name?.first_name || data.first_name || "",
						last_name: data.lastName || data.name?.last_name || data.last_name || "",
						email: data.email || "",
						phone: phone,
					address: data.address || data.address?.street || "",
					address_line_2: data.addressLine2 || data.address?.addressLine2 || data.address2 || "",
						city: data.city || data.address?.city || "",
						state: data.state || data.address?.state || "",
						postal_code: data.zip || data.zipcode || data.address?.zipcode || data.postal_code || "",
						country: data.country || data.address?.country || "",
						company: data.companyName || data.company_name || data.company || "",
					};
				};

				// Create new contact in HostBay format
				const newContact = formatHostBayContact(contactData);

				// Update the specific contact type
				const contactTypeKey = contactType.toLowerCase();
				const updatedContacts = { ...existingContacts };
				
				switch (contactTypeKey) {
					case "registrant":
						updatedContacts.registrant = newContact;
						break;
					case "admin":
						updatedContacts.admin = newContact;
						break;
					case "technical":
					case "tech":
						updatedContacts.tech = newContact;
						break;
					case "billing":
						updatedContacts.billing = newContact;
						break;
					default:
						updatedContacts.tech = newContact;
				}

				// Update domain contacts via HostBay API
				// HostBay expects all contacts in the request body
				// Ensure we send all required contact types (even if empty, to preserve existing ones)
				const contactsToUpdate = {
					registrant: updatedContacts.registrant || existingContacts.registrant || {},
					admin: updatedContacts.admin || existingContacts.admin || {},
					tech: updatedContacts.tech || existingContacts.tech || {},
					billing: updatedContacts.billing || existingContacts.billing || {},
				};

				console.log("Adding HostBay contact, updating with:", JSON.stringify(contactsToUpdate, null, 2));

				const updateResponse = await domainProviderApiClient.request(
					"updateDomainContacts",
					{
						domain_name: domainName,
						registrant: contactsToUpdate.registrant,
						admin: contactsToUpdate.admin,
						tech: contactsToUpdate.tech,
						billing: contactsToUpdate.billing,
					},
					"put",
					provider
				);

				if (!updateResponse?.responseMsg || updateResponse?.responseMsg?.statusCode !== 200) {
					const errorMessage = updateResponse?.responseMsg?.message || 
						updateResponse?.message || 
						"Failed to add contact. Please try again.";
					throw new BadRequestError(errorMessage);
				}

				// API call succeeded - now save to DB
				console.log("[HostBay Add] API call successful, saving to DB");
				// const contactTypeKey = contactType.toLowerCase();
				
				// Helper to convert HostBay format to our normalized format for DB storage
				const convertHostBayToNormalized = (hostbayContact, type) => {
					if (!hostbayContact || Object.keys(hostbayContact).length === 0) return null;
					
					// Parse phone from HostBay format "+1.5551234567"
					let phoneCountryCode = "+1";
					let phoneSubscriber = "";
					if (hostbayContact.phone) {
						const phoneStr = String(hostbayContact.phone);
						if (phoneStr.includes(".")) {
							const parts = phoneStr.split(".");
							phoneCountryCode = parts[0] || "+1";
							phoneSubscriber = parts.slice(1).join("");
						} else if (phoneStr.startsWith("+")) {
							const parts = phoneStr.split(" ");
							phoneCountryCode = parts[0] || "+1";
							phoneSubscriber = parts.slice(1).join(" ");
						} else {
							phoneSubscriber = phoneStr;
						}
					}

					const extractAddressParts = (address) => {
						if (!address || typeof address !== "string") {
							return { street: address || "", addressLine2: "" };
						}
						const parts = address
							.split(",")
							.map((part) => part.trim())
							.filter((part) => part.length > 0);
						if (parts.length === 0) {
							return { street: address.trim(), addressLine2: "" };
						}
						const street = parts.shift();
						return {
							street,
							addressLine2: parts.join(", "),
						};
					};

					const { street, addressLine2 } = extractAddressParts(hostbayContact.address);
					
					return {
						handle: type,
						name: {
							first_name: hostbayContact.first_name || "",
							last_name: hostbayContact.last_name || "",
							full_name: `${hostbayContact.first_name || ""} ${hostbayContact.last_name || ""}`.trim(),
						},
						email: hostbayContact.email || "",
						phone: {
							country_code: phoneCountryCode,
							subscriber_number: phoneSubscriber,
						},
						address: {
							street: street || "",
							addressLine2: hostbayContact.address_line_2 || addressLine2 || "",
							city: hostbayContact.city || "",
							state: hostbayContact.state || "",
							country: hostbayContact.country || "",
							zipcode: hostbayContact.postal_code || "",
						},
						company_name: hostbayContact.company || "",
					};
				};

				// Convert and save contact to DB
				const normalizedContact = convertHostBayToNormalized(newContact, contactTypeKey);
				if (normalizedContact) {
					if (!domain.contacts) {
						domain.contacts = {};
					}
					domain.contacts[contactTypeKey] = normalizedContact;
					domain.contacts.lastUpdated = new Date();
					await domain.save();
					console.log(`[HostBay Add] Saved ${contactTypeKey} contact to DB`);
				}

				// Return normalized response
				return res.status(200).json({
					success: true,
					message: `${contactType} contact added successfully`,
					data: {
						contactType: contactType,
						contactData: normalizedContact,
					},
					provider: "hostbay",
				});
			}
		} catch (error) {
			console.error(`Error adding ${contactType} contact:`, error);
			throw new BadRequestError(`Failed to add ${contactType} contact`);
		}
	}

	// Update a contact
	static async update(req, res) {
		const { domainName, contactId } = req.params;
		const { contactType = "technical" } = req.query;
		const domain = await Domain.findOne({ websiteName: domainName, deletedAt: { $eq: null } });
		if (!domain) throw new NotFoundError("Domain not found");
		const provider = domain.provider;
		const user = await User.findById(req.user.id);
		if (!user) throw new NotFoundError("User not found");
		const contactData = req.body;

		// console.log("Updating contact with data:", contactData);

		try {
			let updateResponse;

			if (provider === "openprovider") {
				// Update customer using OpenProvider structure
				updateResponse = await domainProviderApiClient.request(
					"UpdateCustomer",
					{
						handle: contactId?.replace(/^'+|'+$/g, ""), 
						firstName: contactData.firstName || contactData.registrant?.first_name,
						lastName: contactData.lastName || contactData.registrant?.last_name,
						initials: contactData.initials,
						prefix: contactData.prefix,
						email: contactData.email || contactData.registrant?.email,
						address: contactData.address || contactData.registrant?.address,
						addressNumber: contactData.addressNumber,
						city: contactData.city 	|| contactData.registrant?.city,
						zip: contactData.zip || contactData.registrant?.zipcode || contactData.registrant?.postal_code,
						country: contactData.country || contactData.registrant?.country,
						state: contactData.state || contactData.registrant?.state,
						phoneCountryCode: contactData.phoneCountryCode,
						phoneAreaCode: contactData.phoneAreaCode,
						phone: contactData.phone || contactData.registrant?.phone,
						companyName: contactData.companyName || contactData.registrant?.company,
						fax: contactData.fax,
						faxCountryCode: contactData.faxCountryCode,
						faxAreaCode: contactData.faxAreaCode,
						tags: contactData.tags,
					},
					"put",
					provider
				);
			} else if (provider === "hostbay") {
				// Get current domain contacts first
				const domainDetails = await domainProviderApiClient.request(
					"ViewDomain",
					{ websiteName: domainName },
					null,
					provider
				);

				const responseData = domainDetails?.responseData || domainDetails?.data || {};
				
				// Helper to convert normalized DB contact to HostBay format
				const convertNormalizedToHostBay = (normalizedContact) => {
					if (!normalizedContact || Object.keys(normalizedContact).length === 0) return {};
					
					// Format phone
					let phone = "";
					if (normalizedContact.phone) {
						const countryCode = normalizedContact.phone.country_code || "+1";
						const subscriber = normalizedContact.phone.subscriber_number || "";
						phone = `${countryCode}.${subscriber.replace(/\s+/g, "")}`;
					}
					
					// Format address
					let address = "";
					if (normalizedContact.address) {
						const street = normalizedContact.address.street || "";
						const addressLine2 = normalizedContact.address.addressLine2 || "";
						address = [street, addressLine2].filter(Boolean).join(", ");
					}
					
					return {
						first_name: normalizedContact.name?.first_name || "",
						last_name: normalizedContact.name?.last_name || "",
						email: normalizedContact.email || "",
						phone: phone,
						address: address,
						city: normalizedContact.address?.city || "",
						state: normalizedContact.address?.state || "",
						postal_code: normalizedContact.address?.zipcode || "",
						country: normalizedContact.address?.country || "",
						company: normalizedContact.company_name || "",
					};
				};
				
				// Get existing contacts from database first (more reliable), then fallback to API response
				const dbContacts = domain.contacts || {};
				const apiContacts = {
					registrant: responseData.registrant || responseData.registrant_contact || {},
					admin: responseData.admin || responseData.admin_contact || {},
					tech: responseData.tech || responseData.technical || responseData.technical_contact || {},
					billing: responseData.billing || responseData.billing_contact || {},
				};
				
				// Prefer database contacts, convert to HostBay format if they exist
				const existingContacts = {
					registrant: dbContacts.registrant ? convertNormalizedToHostBay(dbContacts.registrant) : apiContacts.registrant,
					admin: dbContacts.admin ? convertNormalizedToHostBay(dbContacts.admin) : apiContacts.admin,
					tech: dbContacts.technical ? convertNormalizedToHostBay(dbContacts.technical) : apiContacts.tech,
					billing: dbContacts.billing ? convertNormalizedToHostBay(dbContacts.billing) : apiContacts.billing,
				};

				// Helper to convert country name to ISO 2-character code
				const getCountryCode = (countryName) => {
					if (!countryName) return "";
					const countryNameStr = String(countryName).trim();
					
					// If already a 2-character code, return as is
					if (countryNameStr.length === 2 && /^[A-Z]{2}$/i.test(countryNameStr)) {
						return countryNameStr.toUpperCase();
					}
					
					// Common country name to code mappings
					const countryMap = {
						"united states": "US",
						"united states of america": "US",
						"usa": "US",
						"canada": "CA",
						"united kingdom": "GB",
						"uk": "GB",
						"australia": "AU",
						"germany": "DE",
						"france": "FR",
						"italy": "IT",
						"spain": "ES",
						"netherlands": "NL",
						"belgium": "BE",
						"switzerland": "CH",
						"austria": "AT",
						"sweden": "SE",
						"norway": "NO",
						"denmark": "DK",
						"finland": "FI",
						"poland": "PL",
						"portugal": "PT",
						"greece": "GR",
						"ireland": "IE",
						"new zealand": "NZ",
						"south africa": "ZA",
						"india": "IN",
						"china": "CN",
						"japan": "JP",
						"south korea": "KR",
						"singapore": "SG",
						"hong kong": "HK",
						"mexico": "MX",
						"brazil": "BR",
						"argentina": "AR",
						"chile": "CL",
					};
					
					const normalizedName = countryNameStr.toLowerCase();
					return countryMap[normalizedName] || countryNameStr.substring(0, 2).toUpperCase();
				};

				// Helper to convert our contact data to HostBay format and merge with existing data
				// HostBay API expects: first_name, last_name, email, phone, address (STRING), city, state, postal_code, country (2-CHAR CODE), company
				// This function merges new data with existing data to preserve fields not provided
				const formatHostBayContact = (data, existingContact = {}) => {
					if (!data || (typeof data !== "object")) {
						return existingContact || {};
					}

					// Start with existing contact data to preserve fields not being updated
					const merged = { ...existingContact };

					// Handle nested structure (from our normalized format)
					// Only update fields that are actually provided (not empty strings)
					const firstName = data.firstName || data.name?.first_name || data.first_name;
					if (firstName !== undefined && firstName !== null && firstName !== "") {
						merged.first_name = firstName;
					}

					const lastName = data.lastName || data.name?.last_name || data.last_name;
					if (lastName !== undefined && lastName !== null && lastName !== "") {
						merged.last_name = lastName;
					}

					const email = data.email;
					if (email !== undefined && email !== null && email !== "") {
						merged.email = email;
					}
					
					// Parse phone - handle multiple formats
					// HostBay expects phone as string: "+1.5551234567" (with dot, not space) per API docs
					let phone = null;
					if (data.phoneCountryCode && data.phone) {
						const countryCode = data.phoneCountryCode.startsWith("+") 
							? data.phoneCountryCode 
							: `+${data.phoneCountryCode}`;
						// HostBay format: "+1.5551234567" (dot separator)
						const subscriber = String(data.phone).replace(/\s+/g, ""); // Remove spaces
						phone = `${countryCode}.${subscriber}`;
					} else if (data.phone && typeof data.phone === "object" && data.phone.country_code && data.phone.subscriber_number) {
						const countryCode = data.phone.country_code.startsWith("+") 
							? data.phone.country_code 
							: `+${data.phone.country_code}`;
						// HostBay format: "+1.5551234567" (dot separator)
						const subscriber = String(data.phone.subscriber_number).replace(/\s+/g, ""); // Remove spaces
						phone = `${countryCode}.${subscriber}`;
					} else if (typeof data.phone === "string" && data.phone.trim() !== "") {
						// If already in HostBay format or needs conversion
						let phoneStr = data.phone.trim();
						// If it has space, convert to dot format
						if (phoneStr.includes(" ")) {
							const parts = phoneStr.split(" ");
							if (parts[0].startsWith("+")) {
								phone = `${parts[0]}.${parts.slice(1).join("").replace(/\s+/g, "")}`;
							} else {
								phone = `+${parts[0]}.${parts.slice(1).join("").replace(/\s+/g, "")}`;
							}
						} else {
							phone = phoneStr;
						}
					}
					if (phone !== null) {
						merged.phone = phone;
						console.log(`[HostBay Update] Formatted phone: ${phone}`);
					}

					// Address must be a STRING, not an object
					// Combine address line 1 and line 2 into a single string
					let addressStr = "";
					if (data.address && typeof data.address === "string") {
						addressStr = data.address;
					} else if (data.address && typeof data.address === "object") {
						// Handle nested address object
						const street = data.address.street || "";
						const addressLine2 = data.address.addressLine2 || "";
						addressStr = [street, addressLine2].filter(Boolean).join(", ");
					} else if (data.address1 || data.address) {
						// Handle flat structure
						const street = data.address1 || data.address || "";
						const addressLine2 = data.address2 || "";
						addressStr = [street, addressLine2].filter(Boolean).join(", ");
					}
				if (addressStr && addressStr.trim() !== "") {
					merged.address = addressStr.trim();
				}
				const addressLine2Value =
					(data.address && typeof data.address === "object" && data.address.addressLine2) ||
					data.address2 ||
					"";
				if (addressLine2Value !== undefined) {
					merged.address_line_2 = addressLine2Value || "";
				}

					const city = data.city || data.address?.city;
					if (city !== undefined && city !== null && city !== "") {
						merged.city = city;
					}

					const state = data.state || data.address?.state;
					if (state !== undefined && state !== null && state !== "") {
						merged.state = state;
					}

					const postalCode = data.zip || data.zipcode || data.address?.zipcode || data.postal_code;
					if (postalCode !== undefined && postalCode !== null && postalCode !== "") {
						merged.postal_code = postalCode;
					}

					// Country must be a 2-character ISO code
					const country = data.country || data.address?.country;
					if (country !== undefined && country !== null && country !== "") {
						merged.country = getCountryCode(country);
					}

					const company = data.companyName || data.company_name || data.company;
					if (company !== undefined && company !== null && company !== "") {
						merged.company = company;
					}

					return merged;
				};

				// Determine which contact type to update
				const contactTypeKey = contactType.toLowerCase();
				const updatedContacts = { ...existingContacts };

				console.log(`[HostBay Update] Contact type: ${contactTypeKey}`);
				console.log(`[HostBay Update] Existing contacts:`, JSON.stringify(existingContacts, null, 2));
				console.log(`[HostBay Update] Incoming contact data:`, JSON.stringify(contactData, null, 2));

				// If contactData has nested structure (registrant, admin, etc.), use it
				// Otherwise, treat it as a single contact update
				if (contactData.registrant || contactData.admin || contactData.tech || contactData.billing) {
					// Nested structure - update all provided contacts
					if (contactData.registrant) {
						updatedContacts.registrant = formatHostBayContact(contactData.registrant, existingContacts.registrant);
					}
					if (contactData.admin) {
						updatedContacts.admin = formatHostBayContact(contactData.admin, existingContacts.admin);
					}
					if (contactData.tech || contactData.technical) {
						updatedContacts.tech = formatHostBayContact(contactData.tech || contactData.technical, existingContacts.tech);
					}
					if (contactData.billing) {
						updatedContacts.billing = formatHostBayContact(contactData.billing, existingContacts.billing);
					}
				} else {
					// Single contact update - merge with existing contact data
					const existingContactForType = existingContacts[contactTypeKey] || existingContacts[contactTypeKey === "technical" ? "tech" : contactTypeKey] || {};
					const updatedContact = formatHostBayContact(contactData, existingContactForType);
					
					switch (contactTypeKey) {
						case "registrant":
							updatedContacts.registrant = updatedContact;
							break;
						case "admin":
							updatedContacts.admin = updatedContact;
							break;
						case "technical":
						case "tech":
							updatedContacts.tech = updatedContact;
							break;
						case "billing":
							updatedContacts.billing = updatedContact;
							break;
						default:
							updatedContacts.tech = updatedContact;
					}
				}

				// Helper to ensure a contact has all required fields (HostBay requires all fields)
				const ensureCompleteContact = (contact, fallbackContact = {}) => {
					// If contact is empty or missing required fields, use fallback or registrant
					if (!contact || Object.keys(contact).length === 0 || 
						!contact.first_name || !contact.last_name || !contact.email || 
						!contact.phone || !contact.address || !contact.city || 
						!contact.postal_code || !contact.country) {
						// Use fallback contact if available, otherwise return null (will use registrant)
						return fallbackContact && Object.keys(fallbackContact).length > 0 
							? fallbackContact 
							: null;
					}
					return contact;
				};

				// Update domain contacts via HostBay API
				// HostBay expects all contacts in the request body with ALL required fields
				// If a contact type is missing required fields, use registrant as fallback
				// If all contacts are empty, use the contact being updated as base for all
				const registrantContact = updatedContacts.registrant || existingContacts.registrant || {};
				const adminContact = updatedContacts.admin || existingContacts.admin || {};
				const techContact = updatedContacts.tech || existingContacts.tech || {};
				const billingContact = updatedContacts.billing || existingContacts.billing || {};
				
				// Determine the best fallback contact to use
				// Priority: 1) registrant (if complete), 2) the contact being updated (if complete), 3) any complete contact
				let fallbackContact = null;
				
				// Helper to check if a contact is complete
				const isContactComplete = (contact) => {
					return contact && Object.keys(contact).length > 0 &&
						contact.first_name && contact.last_name && contact.email &&
						contact.phone && contact.address && contact.city &&
						contact.postal_code && contact.country;
				};
				
				console.log("[HostBay Update] Checking contacts for completeness:");
				console.log("[HostBay Update] registrantContact complete:", isContactComplete(registrantContact));
				console.log("[HostBay Update] adminContact complete:", isContactComplete(adminContact));
				console.log("[HostBay Update] techContact complete:", isContactComplete(techContact));
				console.log("[HostBay Update] billingContact complete:", isContactComplete(billingContact));
				console.log("[HostBay Update] contactType being updated:", contactType);
				
				// Check if registrant is complete
				if (isContactComplete(registrantContact)) {
					fallbackContact = registrantContact;
					console.log("[HostBay Update] Using registrant as fallback");
				}
				// If registrant is not complete, check the contact being updated
				else if (contactType === 'admin' && isContactComplete(adminContact)) {
					fallbackContact = adminContact;
					console.log("[HostBay Update] Using admin (being updated) as fallback");
				}
				else if (contactType === 'technical' && isContactComplete(techContact)) {
					fallbackContact = techContact;
					console.log("[HostBay Update] Using tech (being updated) as fallback");
				}
				else if (contactType === 'billing' && isContactComplete(billingContact)) {
					fallbackContact = billingContact;
					console.log("[HostBay Update] Using billing (being updated) as fallback");
				}
				// If still no fallback, check other contacts
				else if (isContactComplete(adminContact)) {
					fallbackContact = adminContact;
					console.log("[HostBay Update] Using admin as fallback");
				}
				else if (isContactComplete(techContact)) {
					fallbackContact = techContact;
					console.log("[HostBay Update] Using tech as fallback");
				}
				else if (isContactComplete(billingContact)) {
					fallbackContact = billingContact;
					console.log("[HostBay Update] Using billing as fallback");
				}
				
				console.log("[HostBay Update] Selected fallback contact:", fallbackContact ? "Found" : "None");
				
				// Only ensure the contact being updated is complete
				// For other contacts, preserve existing data - only use fallback if they're completely empty
				let finalRegistrant, finalAdmin, finalTech, finalBilling;
				
				// Helper to check if contact has meaningful data (not just empty object)
				const hasContactData = (contact) => {
					return contact && Object.keys(contact).length > 0 && 
						(contact.first_name || contact.email || contact.phone || contact.address);
				};
				
				if (contactTypeKey === "registrant") {
					// Updating registrant - ensure it's complete, preserve others
					if (!fallbackContact) {
						throw new BadRequestError("Cannot update registrant contact: Contact data is incomplete. Please provide all required fields (first_name, last_name, email, phone, address, city, postal_code, country).");
					}
					finalRegistrant = ensureCompleteContact(registrantContact, fallbackContact) || fallbackContact;
					// Preserve existing data for others - only use fallback if completely empty AND HostBay requires it
					finalAdmin = hasContactData(adminContact) ? adminContact : (fallbackContact || {});
					finalTech = hasContactData(techContact) ? techContact : (fallbackContact || {});
					finalBilling = hasContactData(billingContact) ? billingContact : (fallbackContact || {});
				} else if (contactTypeKey === "admin") {
					// Updating admin - ensure it's complete, preserve others
					if (!fallbackContact) {
						throw new BadRequestError("Cannot update admin contact: Contact data is incomplete. Please provide all required fields (first_name, last_name, email, phone, address, city, postal_code, country).");
					}
					finalAdmin = ensureCompleteContact(adminContact, fallbackContact) || fallbackContact;
					// Preserve existing data for others
					finalRegistrant = hasContactData(registrantContact) ? registrantContact : (fallbackContact || {});
					finalTech = hasContactData(techContact) ? techContact : (fallbackContact || {});
					finalBilling = hasContactData(billingContact) ? billingContact : (fallbackContact || {});
				} else if (contactTypeKey === "technical" || contactTypeKey === "tech") {
					// Updating tech - ensure it's complete, preserve others
					if (!fallbackContact) {
						throw new BadRequestError("Cannot update technical contact: Contact data is incomplete. Please provide all required fields (first_name, last_name, email, phone, address, city, postal_code, country).");
					}
					finalTech = ensureCompleteContact(techContact, fallbackContact) || fallbackContact;
					// Preserve existing data for others
					finalRegistrant = hasContactData(registrantContact) ? registrantContact : (fallbackContact || {});
					finalAdmin = hasContactData(adminContact) ? adminContact : (fallbackContact || {});
					finalBilling = hasContactData(billingContact) ? billingContact : (fallbackContact || {});
				} else if (contactTypeKey === "billing") {
					// Updating billing - ensure it's complete, preserve others
					if (!fallbackContact) {
						throw new BadRequestError("Cannot update billing contact: Contact data is incomplete. Please provide all required fields (first_name, last_name, email, phone, address, city, postal_code, country).");
					}
					finalBilling = ensureCompleteContact(billingContact, fallbackContact) || fallbackContact;
					// Preserve existing data for others - DO NOT fill with billing data if they're empty
					// Only use fallback if HostBay API absolutely requires complete contacts
					finalRegistrant = hasContactData(registrantContact) ? registrantContact : (fallbackContact || {});
					finalAdmin = hasContactData(adminContact) ? adminContact : (fallbackContact || {});
					finalTech = hasContactData(techContact) ? techContact : (fallbackContact || {});
				} else {
					// Unknown contact type - use old behavior as fallback
					if (!fallbackContact) {
						throw new BadRequestError("Cannot update contacts: All existing contacts are empty and the new contact data is incomplete. Please provide all required fields (first_name, last_name, email, phone, address, city, postal_code, country).");
					}
					finalRegistrant = ensureCompleteContact(registrantContact, fallbackContact) || fallbackContact;
					finalAdmin = ensureCompleteContact(adminContact, fallbackContact) || fallbackContact;
					finalTech = ensureCompleteContact(techContact, fallbackContact) || fallbackContact;
					finalBilling = ensureCompleteContact(billingContact, fallbackContact) || fallbackContact;
				}

				// Final validation: ensure all contacts have all required fields
				const requiredFields = ['first_name', 'last_name', 'email', 'phone', 'address', 'city', 'postal_code', 'country'];
				const validateContact = (contact, contactType) => {
					for (const field of requiredFields) {
						if (!contact[field]) {
							throw new BadRequestError(`Missing required field '${field}' for ${contactType} contact.`);
						}
					}
				};
				
				validateContact(finalRegistrant, 'registrant');
				validateContact(finalAdmin, 'admin');
				validateContact(finalTech, 'tech');
				validateContact(finalBilling, 'billing');

				const contactsToUpdate = {
					registrant: finalRegistrant,
					admin: finalAdmin,
					tech: finalTech,
					billing: finalBilling,
				};

				console.log("[HostBay Update] Final contacts to send:", JSON.stringify(contactsToUpdate, null, 2));
				console.log("[HostBay Update] API Request - Domain:", domainName);
				console.log("[HostBay Update] API Request - Method: PUT");
				console.log("[HostBay Update] API Request - Endpoint: /domains/" + domainName + "/contacts");

				updateResponse = await domainProviderApiClient.request(
					"updateDomainContacts",
					{
						domain_name: domainName,
						registrant: contactsToUpdate.registrant,
						admin: contactsToUpdate.admin,
						tech: contactsToUpdate.tech,
						billing: contactsToUpdate.billing,
					},
					"put",
					provider
				);

				console.log("[HostBay Update] API Response:", JSON.stringify(updateResponse, null, 2));

				if (!updateResponse?.responseMsg || updateResponse?.responseMsg?.statusCode !== 200) {
					const errorMessage = updateResponse?.responseMsg?.message || 
						updateResponse?.message || 
						updateResponse?.providerError?.message ||
						"Failed to update HostBay domain contacts";
					throw new BadRequestError(errorMessage);
				}

				// API call succeeded - now save to DB
				console.log("[HostBay Update] API call successful, saving to DB");
				
				// Helper to convert HostBay format to our normalized format for DB storage
				const convertHostBayToNormalized = (hostbayContact, type) => {
					if (!hostbayContact || Object.keys(hostbayContact).length === 0) return null;
					
					// Parse phone from HostBay format "+1.5551234567"
					let phoneCountryCode = "+1";
					let phoneSubscriber = "";
					if (hostbayContact.phone) {
						const phoneStr = String(hostbayContact.phone);
						if (phoneStr.includes(".")) {
							const parts = phoneStr.split(".");
							phoneCountryCode = parts[0] || "+1";
							phoneSubscriber = parts.slice(1).join("");
						} else if (phoneStr.startsWith("+")) {
							const parts = phoneStr.split(" ");
							phoneCountryCode = parts[0] || "+1";
							phoneSubscriber = parts.slice(1).join(" ");
						} else {
							phoneSubscriber = phoneStr;
						}
					}

					const extractAddressParts = (address) => {
						if (!address || typeof address !== "string") {
							return { street: address || "", addressLine2: "" };
						}
						const parts = address
							.split(",")
							.map((part) => part.trim())
							.filter((part) => part.length > 0);
						if (parts.length === 0) {
							return { street: address.trim(), addressLine2: "" };
						}
						const street = parts.shift();
						return {
							street,
							addressLine2: parts.join(", "),
						};
					};

					const { street, addressLine2 } = extractAddressParts(hostbayContact.address);
					
					return {
						handle: type,
						name: {
							first_name: hostbayContact.first_name || "",
							last_name: hostbayContact.last_name || "",
							full_name: `${hostbayContact.first_name || ""} ${hostbayContact.last_name || ""}`.trim(),
						},
						email: hostbayContact.email || "",
						phone: {
							country_code: phoneCountryCode,
							subscriber_number: phoneSubscriber,
						},
						address: {
							street: street || "",
							addressLine2: hostbayContact.address_line_2 || addressLine2 || "",
							city: hostbayContact.city || "",
							state: hostbayContact.state || "",
							country: hostbayContact.country || "",
							zipcode: hostbayContact.postal_code || "",
						},
						company_name: hostbayContact.company || "",
					};
				};

				// Save updated contact to DB
				if (!domain.contacts) {
					domain.contacts = {};
				}
				
				if (contactTypeKey === "all") {
					// Save all contacts
					if (updatedContacts.registrant) {
						domain.contacts.registrant = convertHostBayToNormalized(updatedContacts.registrant, "registrant");
					}
					if (updatedContacts.admin) {
						domain.contacts.admin = convertHostBayToNormalized(updatedContacts.admin, "admin");
					}
					if (updatedContacts.tech) {
						domain.contacts.technical = convertHostBayToNormalized(updatedContacts.tech, "technical");
					}
					if (updatedContacts.billing) {
						domain.contacts.billing = convertHostBayToNormalized(updatedContacts.billing, "billing");
					}
				} else {
					// Save single contact
					const contactToSave = updatedContacts[contactTypeKey] || updatedContacts[contactTypeKey === "technical" ? "tech" : contactTypeKey];
					if (contactToSave) {
						domain.contacts[contactTypeKey] = convertHostBayToNormalized(contactToSave, contactTypeKey);
					}
				}
				
				domain.contacts.lastUpdated = new Date();
				await domain.save();
				console.log(`[HostBay Update] Saved ${contactTypeKey} contact to DB`);

				// Return normalized response for frontend
				const normalizedContact = contactTypeKey === "all" 
					? {
						registrant: convertHostBayToNormalized(updatedContacts.registrant, "registrant"),
						admin: convertHostBayToNormalized(updatedContacts.admin, "admin"),
						technical: convertHostBayToNormalized(updatedContacts.tech, "technical"),
						billing: convertHostBayToNormalized(updatedContacts.billing, "billing"),
					}
					: convertHostBayToNormalized(
						updatedContacts[contactTypeKey] || updatedContacts[contactTypeKey === "technical" ? "tech" : contactTypeKey],
						contactTypeKey
					);

				return res.status(200).json({
					message: `${contactType} contact updated successfully`,
					contact: normalizedContact,
					result: {
						responseMsg: {
							id: 0,
							reason: null,
							statusCode: 200,
							message: "Success",
						},
						provider,
					},
				});

			} else if (provider === "connectreseller") {
				// Update contact using official ModifyRegistrantContact endpoint
				updateResponse = await domainProviderApiClient.request(
					"ModifyRegistrantContact",
					{
						firstName: contactData.firstName,
						lastName: contactData.lastName,
						email: contactData.email,
						companyName: contactData.companyName || "",
						address: contactData.address,
						city: contactData.city,
						state: contactData.state || "",
						country: contactData.country,
						zip: contactData.zip,
						phoneCountryCode: contactData.phoneCountryCode || "+1",
						phone: contactData.phone,
						faxCountryCode: contactData.faxCountryCode || "",
						fax: contactData.fax || "",
						alternatePhoneCountryCode: "",
						alternatePhone: "",
						contactId: contactId,
					},
					null,
					provider
				);

				console.log(
					"ConnectReseller updateResponse =======>",
					updateResponse
				);

				if (updateResponse?.responseMsg?.statusCode !== 200) {
					throw new BadRequestError(
						`Failed to update contact: ${updateResponse?.responseMsg?.message ||
						"Unknown error"
						}`
					);
				}
			}

			// Normalize the response
			const normalizedContact =
				provider === "openprovider"
					? {
						handle: updateResponse?.responseData?.handle,
						name: {
							first_name:
								updateResponse?.responseData?.name
									?.first_name,
							last_name:
								updateResponse?.responseData?.name
									?.last_name,
							full_name:
								updateResponse?.responseData?.name
									?.full_name,
						},
						email: updateResponse?.responseData?.email,
						phone: {
							country_code:
								updateResponse?.responseData?.phone
									?.country_code,
							subscriber_number:
								updateResponse?.responseData?.phone
									?.subscriber_number,
						},
						address: {
							street: updateResponse?.responseData?.address
								?.street,
							city: updateResponse?.responseData?.address
								?.city,
							state: updateResponse?.responseData?.address
								?.state,
							country:
								updateResponse?.responseData?.address
									?.country,
							zipcode:
								updateResponse?.responseData?.address
									?.zipcode,
						},
						company_name:
							updateResponse?.responseData?.company_name,
						fax: updateResponse?.responseData?.fax,
						tags: updateResponse?.responseData?.tags,
					}
					: {
						handle: updateResponse?.responseData?.ContactId,
						name: {
							first_name:
								updateResponse?.responseData?.FirstName,
							last_name:
								updateResponse?.responseData?.LastName,
							full_name: `${updateResponse?.responseData?.FirstName} ${updateResponse?.responseData?.LastName}`,
						},
						email: updateResponse?.responseData?.EmailAddress,
						phone: {
							country_code: "+1",
							subscriber_number:
								updateResponse?.responseData?.PhoneNo,
						},
						address: {
							street: updateResponse?.responseData?.Address,
							city: updateResponse?.responseData?.City,
							state: updateResponse?.responseData?.StateName,
							country:
								updateResponse?.responseData?.CountryCode,
							zipcode: updateResponse?.responseData?.ZipCode,
						},
						company_name:
							updateResponse?.responseData?.CompanyName,
						fax: updateResponse?.responseData?.FaxNo
							? {
								country_code: "+1",
								subscriber_number:
									updateResponse?.responseData?.FaxNo,
							}
							: null,
					};

			// Check for provider error
			const responseMsg =
				updateResponse?.responseMsg ||
				updateResponse?.result?.responseMsg ||
				null;

			if (responseMsg?.statusCode && responseMsg.statusCode !== 200) {
				return res.status(responseMsg.statusCode).json({
					message:
						responseMsg.message ||
						updateResponse?.providerError?.desc ||
						`Failed to update ${contactType} contact`,
					errorCode:
						responseMsg.code ||
						updateResponse?.providerError?.code ||
						null,
					providerError: updateResponse?.providerError || null,
				});
			}

			// API call succeeded - now save to DB
			console.log(`[${provider} Update] API call successful, saving to DB`);
			const contactTypeKey = contactType.toLowerCase();
			
			if (normalizedContact) {
				if (!domain.contacts) {
					domain.contacts = {};
				}
				domain.contacts[contactTypeKey] = normalizedContact;
				domain.contacts.lastUpdated = new Date();
				await domain.save();
				console.log(`[${provider} Update] Saved ${contactTypeKey} contact to DB`);
			}

			return res.status(200).json({
				message: `${contactType} contact updated successfully`,
				contact: normalizedContact,
				result: {
					responseMsg: responseMsg,
					provider: provider,
				},
			});


		} catch (error) {
			console.error(`Error updating ${contactType} contact:`, error);
			throw new BadRequestError(
				`Failed to update ${contactType} contact`
			);
		}
	}

	// Delete a contact from a domain
	static async remove(req, res) {
		const { domainName, contactId } = req.params;
		const { contactType = "technical" } = req.query; // Default to technical for backward compatibility
		const domain = await Domain.findOne({ websiteName: domainName, deletedAt: { $eq: null } });
		if (!domain) throw new NotFoundError("Domain not found");
		const provider = domain.provider;
		const user = await User.findById(req.user.id);
		if (!user) throw new NotFoundError("User not found");

		try {
			if (provider === "openprovider") {
				// Get current domain details first to get the owner handle
				const domainDetails = await domainProviderApiClient.request(
					"ViewDomain",
					{ websiteName: domainName },
					null,
					provider
				);

				const { websiteId } = domainDetails?.responseData;
				if (!websiteId) {
					throw new BadRequestError(
						"Could not get domain ID for contact update"
					);
				}

				// Get the owner handle to use as replacement
				const ownerHandle = domainDetails?.responseData?.owner_handle;
				if (!ownerHandle) {
					throw new BadRequestError(
						"Could not find domain owner handle for contact replacement"
					);
				}

				// For OpenProvider, we cannot set contacts to null
				// Instead, we replace the contact with the domain owner
				const contacts = {};
				switch (contactType.toLowerCase()) {
					case "registrant":
						// Cannot remove registrant, it's required
						throw new BadRequestError(
							"Cannot remove registrant contact - it is required for the domain"
						);
					case "admin":
						contacts.admin_handle = ownerHandle;
						break;
					case "technical":
						contacts.tech_handle = ownerHandle;
						break;
					case "billing":
						contacts.billing_handle = ownerHandle;
						break;
				}

				console.log("contacts =======>", contacts);
				const updateRes = await domainProviderApiClient.request(
					"ModifyDomainContacts",
					{
						domainId: websiteId,
						contacts: contacts,
					},
					"put",
					provider
				);

				// Optional: Delete the customer from OpenProvider if requested
				const { deleteCustomer } = req.query;
				if (deleteCustomer === "true" && contactId) {
					try {
						await domainProviderApiClient.request(
							"DeleteCustomer",
							{ handle: contactId },
							"delete",
							provider
						);

						return res.json({
							message: `${contactType} contact replaced with domain owner and customer deleted successfully`,
							result: updateRes,
							note: "Contact was replaced with domain owner and the customer was deleted from OpenProvider",
						});
					} catch (deleteError) {
						console.error("Error deleting customer:", deleteError);
						return res.json({
							message: `${contactType} contact replaced with domain owner successfully, but customer deletion failed`,
							result: updateRes,
							note: "Contact was replaced but customer deletion failed - the customer may be used by other domains",
							deleteError: deleteError.message,
						});
					}
				}

				return res.json({
					message: `${contactType} contact replaced with domain owner successfully`,
					result: updateRes,
					note: "In OpenProvider, contacts cannot be removed - they are replaced with the domain owner contact. Use ?deleteCustomer=true to also delete the customer from OpenProvider.",
				});
			} else if (provider === "connectreseller") {
				// For ConnectReseller, we can actually delete contacts
				// First, get current domain details to preserve other contacts
				const domainDetails = await domainProviderApiClient.request(
					"ViewDomain",
					{
						websiteName: domainName,
						userName: user.username || user.email.split("@")[0],
					},
					null,
					provider
				);

				if (!domainDetails?.responseData) {
					throw new BadRequestError("Could not get domain details");
				}

				// 1. Delete the contact
				const deleteRes = await domainProviderApiClient.request(
					"DeleteContact",
					{
						userName: user.username || user.email.split("@")[0],
						contactId: contactId,
					},
					"post",
					provider
				);

				console.log("ConnectReseller deleteRes =======>", deleteRes);

				if (deleteRes?.responseMsg?.statusCode !== 200) {
					throw new BadRequestError("Failed to delete contact");
				}

				// 2. Update domain to remove the specific contact ID
				// Keep existing contacts for other types, set the specific type to null or default
				const currentDomainData = domainDetails.responseData;
				const updateData = {
					userName: user.username || user.email.split("@")[0],
					domainName: domain.websiteName,
					registrantContactId: currentDomainData.registrantContactId,
					adminContactId: currentDomainData.adminContactId,
					techContactId: currentDomainData.technicalContactId,
					billingContactId: currentDomainData.billingContactId,
				};

				// Set the appropriate contact ID to null based on contact type
				switch (contactType.toLowerCase()) {
					case "registrant":
						// Cannot remove registrant for ConnectReseller either
						throw new BadRequestError(
							"Cannot remove registrant contact - it is required for the domain"
						);
					case "admin":
						updateData.adminContactId =
							currentDomainData.registrantContactId; // Use registrant as fallback
						break;
					case "billing":
						updateData.billingContactId =
							currentDomainData.registrantContactId; // Use registrant as fallback
						break;
					case "technical":
					default:
						updateData.techContactId =
							currentDomainData.registrantContactId; // Use registrant as fallback
				}

				console.log(
					"ConnectReseller domain updateData =======>",
					updateData
				);
				const updateDomainRes = await domainProviderApiClient.request(
					"ModifyDomainContact",
					updateData,
					"post",
					provider
				);

				console.log(
					"ConnectReseller updateDomainRes =======>",
					updateDomainRes
				);

				return res.json({
					message: `${contactType} contact deleted and replaced with registrant contact successfully`,
					result: deleteRes,
					note: "Contact was deleted and replaced with the registrant contact to maintain domain compliance",
				});
			} else if (provider === "hostbay") {
				// For HostBay, we cannot actually delete contacts - we replace them with registrant
				// Get current domain details
				const domainDetails = await domainProviderApiClient.request(
					"ViewDomain",
					{ websiteName: domainName },
					null,
					provider
				);

				const responseData = domainDetails?.responseData || domainDetails?.data || {};
				
				// Get existing contacts
				const existingContacts = {
					registrant: responseData.registrant || responseData.registrant_contact || {},
					admin: responseData.admin || responseData.admin_contact || {},
					tech: responseData.tech || responseData.technical || responseData.technical_contact || {},
					billing: responseData.billing || responseData.billing_contact || {},
				};

				// Cannot remove registrant contact
				if (contactType.toLowerCase() === "registrant") {
					throw new BadRequestError(
						"Cannot remove registrant contact - it is required for the domain"
					);
				}

				// Replace the specified contact type with registrant contact
				const contactTypeKey = contactType.toLowerCase();
				const updatedContacts = { ...existingContacts };

				switch (contactTypeKey) {
					case "admin":
						updatedContacts.admin = existingContacts.registrant;
						break;
					case "technical":
					case "tech":
						updatedContacts.tech = existingContacts.registrant;
						break;
					case "billing":
						updatedContacts.billing = existingContacts.registrant;
						break;
					default:
						throw new BadRequestError(
							`Invalid contact type: ${contactType}. Cannot remove this contact type.`
						);
				}

				// Update domain contacts via HostBay API
				// HostBay expects all contacts in the request body
				const contactsToUpdate = {
					registrant: updatedContacts.registrant || existingContacts.registrant || {},
					admin: updatedContacts.admin || existingContacts.admin || {},
					tech: updatedContacts.tech || existingContacts.tech || {},
					billing: updatedContacts.billing || existingContacts.billing || {},
				};

				console.log("Removing HostBay contact, updating with:", JSON.stringify(contactsToUpdate, null, 2));

				const updateRes = await domainProviderApiClient.request(
					"updateDomainContacts",
					{
						domain_name: domainName,
						registrant: contactsToUpdate.registrant,
						admin: contactsToUpdate.admin,
						tech: contactsToUpdate.tech,
						billing: contactsToUpdate.billing,
					},
					"put",
					provider
				);

				if (!updateRes?.responseMsg || updateRes?.responseMsg?.statusCode !== 200) {
					const errorMessage = updateRes?.responseMsg?.message || 
						updateRes?.message || 
						updateRes?.providerError?.message ||
						"Failed to remove contact";
					throw new BadRequestError(errorMessage);
				}

				return res.json({
					message: `${contactType} contact replaced with registrant contact successfully`,
					result: updateRes,
					note: "In HostBay, contacts cannot be deleted - they are replaced with the registrant contact to maintain domain compliance",
				});
			}
		} catch (error) {
			console.error(`Error deleting ${contactType} contact:`, error);
			throw new BadRequestError(
				`Failed to delete ${contactType} contact`
			);
		}
	}

	static async removeDomain (req,res){
		try {
			const user = await User.findById(req.user.id);
			if (!user) throw new NotFoundError("User not found");

			const { id } = req.params;
			const domain = await Domain.findOne({
				_id: id,
				deletedAt: { $eq: null },
			});

			if (!domain) throw new NotFoundError("Domain not found");

			if (!user?.domains?.includes(id)) throw new NotFoundError("Domain not found");
			const provider = domain.provider;

			if (provider !== "hostbay") throw new BadRequestError("Unsupported provider type.");

			const domainDetails = await domainProviderApiClient.request(
				"DeleteDomain",
				{ websiteName: domain.websiteName },
				"DELETE",
				provider
			);

			const responseData = domainDetails?.responseData || domainDetails?.data || {};

			if (responseData){
				domain.deletedAt = new Date();
				await domain.save();
				return res.status(200).json({
					message: "Domain deleted successfully",
					success: true,
					responseData
				});
			}


			return res.status(400).json({ message: "Failed to delete domain.", responseData })
		} catch (error) {
			return res.status(error.statusCode || 500).json({ message: error?.message || "Something went wrong, Please try again", success: false})
		}
	}
}

module.exports = DomainContactController;
