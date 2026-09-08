const apiClient = require("../../utils/apiclient");
const domainProviderApiClient = require("../../utils/domainProviderApiClient");
const { validateAndApplyFee } = require("../../services/domain");
const NotFoundError = require("../../errors/NotFoundError");
const BadRequestError = require("../../errors/BadRequestError");
const RewardPointLog = require("../../models/RewardPointLog");
const User = require("../../models/User");
const Badge = require("../../models/Badge");
const Domain = require("../../models/Domain");
const Wallet = require("../../models/Wallet");
const transporter = require("../../services/mailer");
const nunjucks = require("nunjucks");
const env = require("../../../start/env");
const { getPriceForDomain } = require("../../utils/api");
const { startSession } = require("mongoose");
const { saveActivity } = require("../activityController");
const Cloudflare = require("cloudflare");
const { ensureDynoWallet, generatePaymentLink } = require("../../services/dynoPayService");
const { fetchUserTransactionById } = require("../../helpers/dynoPayHelper");
const { verifyDynoPaySignature, hasProcessed, markProcessed } = require("../../utils/dynoPayWebhook");
const Transaction = require("../../models/Transaction");
const Cart = require("../../models/CartItem");
const { createPaymentRecord, processAutomaticRefund, creditOverpaymentToWallet } = require("../../utils/paymentHelper");
const Payment = require("../../models/Payment");

const PRIVACY_PLAN_CATALOG = {
	full: {
		id: "full",
		label: "Full Privacy",
		price: 5.99,
		description:
			"Turn Full Privacy on to hide all contact info for this domain and replace the contacts with details from our privacy service provider.",
	},
	limited: {
		id: "limited",
		label: "Limited Privacy",
		price: 2.99,
		description:
			"Limited Privacy will show some contact info for this domain, State/Province and Country. No other contact details will be shown.",
	},
};
const VAT_RATE = 0.2;
const PRIVACY_VAT_RATE = VAT_RATE;
const DEFAULT_RENEWAL_MARKUP_PERCENT = 50

const cloudflare = new Cloudflare({
	apiEmail: process.env.CLOUDFLARE_EMAIL,
	apiKey: process.env.CLOUDFLARE_API_KEY,
});

const normalizeBoolean = (value, defaultValue = false) => {
	if (typeof value === "boolean") return value;
	if (typeof value === "string") {
		const normalized = value.trim().toLowerCase();
		if (normalized === "true") return true;
		if (normalized === "false") return false;
	}
	return defaultValue;
};

const parseNumeric = (value) => {
	if (value === null || typeof value === "undefined") return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
};

const interpretBoolean = (value) => {
	if (typeof value === "boolean") return value;
	if (typeof value === "number") {
		if (value === 1) return true;
		if (value === 0) return false;
	}
	if (typeof value === "string") {
		const normalized = value.trim().toLowerCase();
		if (
			[
				"true",
				"locked",
				"lock",
				"enabled",
				"enable",
				"on",
				"1",
				"yes",
				"active",
			].includes(normalized)
		) {
			return true;
		}
		if (
			[
				"false",
				"unlocked",
				"unlock",
				"disabled",
				"disable",
				"off",
				"0",
				"no",
				"inactive",
			].includes(normalized)
		) {
			return false;
		}
	}
	return undefined;
};

const resolveLockStateFromResponse = (response, fallbackValue = null) => {
	const candidates = [
		response?.responseData?.isLocked,
		response?.responseData?.locked,
		response?.responseData?.is_locked,
		response?.responseData?.lockStatus,
		response?.responseData?.lock_status,
		response?.responseMsg?.lockStatus,
		response?.responseData?.status,
		response?.responseMsg?.status,
	];

	for (const candidate of candidates) {
		const interpreted = interpretBoolean(candidate);
		if (typeof interpreted === "boolean") {
			return interpreted;
		}
	}

	if (typeof fallbackValue === "boolean") {
		return fallbackValue;
	}

	const interpretedFallback = interpretBoolean(fallbackValue);
	return typeof interpretedFallback === "boolean"
		? interpretedFallback
		: null;
};

const extractBasePriceForTerm = (descriptionList, term) => {
	if (!Array.isArray(descriptionList)) return null;

	for (const entry of descriptionList) {
		if (!entry?.description) continue;
		const matchTerm = entry.description.match(/for\s+(\d+)\s+year/i);
		if (!matchTerm) continue;
		const entryTerm = Number.parseInt(matchTerm[1], 10);
		if (Number.isNaN(entryTerm) || entryTerm !== term) continue;

		const matchPrice = entry.description.match(/is\s+([\d.]+)/i);
		if (!matchPrice) continue;
		const price = Number.parseFloat(matchPrice[1]);
		if (Number.isFinite(price) && price > 0) {
			return price;
		}
	}
	return null;
};

const getRenewalPriceWithMarkup = async ({
	websiteName,
	duration,
	provider,
	renewalFeePerc = DEFAULT_RENEWAL_MARKUP_PERCENT,
}) => {
	const response = await domainProviderApiClient.request(
		"checkDomainPrice",
		{ websiteName },
		null,
		provider
	);

	const descriptionList = response?.responseData?.["0"] || response?.responseData?.[0];

	let basePrice =
		parseNumeric(response?.responseData?.renewalfee) ||
		extractBasePriceForTerm(descriptionList, duration);

	if (!Number.isFinite(basePrice) || basePrice <= 0) {
		basePrice =
			parseNumeric(response?.responseData?.registrationFee) ||
			parseNumeric(response?.responseData?.transferFee) ||
			null;
	}

	if (!Number.isFinite(basePrice) || basePrice <= 0) {
		return { basePrice: null, renewalPrice: null };
	}

	const renewalPrice = Number(
		(basePrice + (basePrice * renewalFeePerc) / 100).toFixed(2)
	);

	return {
		basePrice,
		renewalPrice,
	};
};

const hasContactValues = (contacts) => {
	if (!contacts || typeof contacts !== "object") return false;
	return Object.values(contacts).some((entry) => Boolean(entry) && Object.keys(entry || {}).length > 0);
};

const resolveDomainProviderContext = async ({
	domainName,
	domainNameId,
	provider,
}) => {
	let domainDoc = null;
	const numericDomainId =
		typeof domainNameId === "string" && domainNameId !== ""
			? Number(domainNameId)
			: domainNameId;

	if (numericDomainId) {
		domainDoc = await Domain.findOne({ domainNameId: numericDomainId, deletedAt: { $eq: null } });
	}

	if (!domainDoc && domainName) {
		domainDoc = await Domain.findOne({
			websiteName: domainName.toLowerCase(),
			deletedAt: { $eq: null }
		});
		if (!domainDoc) {
			domainDoc = await Domain.findOne({
				websiteName: domainName,
				deletedAt: { $eq: null }
			});
		}
	}

	const providerFallback = (provider || domainDoc?.provider || "hostbay").toLowerCase();
	const allowedProviders = ["hostbay", "connectreseller", "openprovider"];
	const resolvedProvider = allowedProviders.includes(providerFallback)
		? providerFallback
		: "hostbay";

	return {
		domainDoc,
		provider: resolvedProvider,
		websiteName: domainDoc?.websiteName || domainName,
		domainNameId: domainDoc?.domainNameId || numericDomainId || domainNameId,
	};
};

const handleDomainPrivacyToggle = async ({
	controller,
	req,
	res,
	shouldEnable,
	payload = null,
}) => {
	const actionLabel = shouldEnable ? "enable" : "disable";
	try {
		const mergedPayload =
			payload || { ...req.body, ...req.query };

		const context = await resolveDomainProviderContext({
			domainName:
				mergedPayload.domain ||
				mergedPayload.websiteName ||
				mergedPayload.domainName,
			domainNameId:
				mergedPayload.domainNameId ||
				mergedPayload.domain_id ||
				mergedPayload.id,
			provider: mergedPayload.provider,
		});

		if (!context.websiteName) {
			throw new BadRequestError("domain is required");
		}

		let response;
		if (context.provider === "hostbay") {
			response = await controller.toggleHostbayPrivacy({
				context,
				shouldEnable,
				userId: req.user?.id,
			});
		} else {
			if (!context.domainNameId) {
				throw new BadRequestError(
					"domainNameId is required for this provider"
				);
			}
			const params = {
				domainNameId: context.domainNameId,
				iswhoisprotected: shouldEnable ? "true" : "false",
			};
			response = await domainProviderApiClient.request(
				"ManageDomainPrivacyProtection",
				params,
				null,
				context.provider
			);

			const success =
				response?.responseMsg?.statusCode === 200 ||
				response?.responseMsg?.statusCode === 0;

			await controller.logDomainPrivacyActivity({
				userId: req.user?.id,
				domain: context.websiteName,
				success,
				shouldEnable,
			});

			// Send WHOIS privacy enabled/disabled email
			if (success && context.domainDoc) {
				try {
					const user = await User.findById(context.domainDoc.user);
					if (user && user.email) {
						// Check if user has email notifications enabled for service status and changes
						const { shouldSendEmail } = require("../../utils/notificationHelper");
						const canSendEmail = await shouldSendEmail(user, 'serviceStatusAndChanges');
						if (canSendEmail) {
							if (shouldEnable) {
								let html = nunjucks.render('mails/whois_privacy_enabled.html', {
									NAME: user.name || user.email,
									DOMAIN_NAME: context.websiteName,
									managePrivacyLink: env.FRONTEND_URL + `/domains/${context.websiteName}/privacy`,
									logoUrl: env.FRONTEND_URL
								});
								
								await transporter.sendMail({
									from: process.env.MAIL_FROM_ADDRESS,
									to: user.email,
									subject: `WHOIS privacy enabled - ${context.websiteName}`,
									html: html,
								});
								
								console.log(`WHOIS privacy enabled email sent to ${user.email} for ${context.websiteName}`);
							} else {
								let html = nunjucks.render('mails/whois_privacy_disabled.html', {
									NAME: user.name || user.email,
									DOMAIN_NAME: context.websiteName,
									reEnablePrivacyLink: env.FRONTEND_URL + `/domains/${context.websiteName}/privacy`,
									logoUrl: env.FRONTEND_URL
								});
								
								await transporter.sendMail({
									from: process.env.MAIL_FROM_ADDRESS,
									to: user.email,
									subject: `WHOIS privacy disabled - ${context.websiteName}`,
									html: html,
								});
								
								console.log(`WHOIS privacy disabled email sent to ${user.email} for ${context.websiteName}`);
							}
						} else {
							console.log(`Email notification disabled for user ${user.email} - skipping WHOIS privacy email`);
						}
					}
				} catch (emailError) {
					console.error("Error sending WHOIS privacy email:", emailError);
				}
			}
		}

		return res
			.status(response?.responseMsg?.statusCode || 200)
			.json(response);
	} catch (error) {
		console.error(
			`Error while trying to ${actionLabel} WHOIS privacy:`,
			error
		);
		if (error instanceof BadRequestError || error instanceof NotFoundError) {
			return res.status(error.statusCode).json({ message: error.message });
		}
		if (error.response) {
			return res.status(error.response.status).json({
				message:
					error.response.data?.message ||
					error.response.data?.responseMsg?.message ||
					`Failed to ${actionLabel} domain privacy`,
			});
		}
		if (error.request) {
			return res
				.status(500)
				.json({ message: "No response received from the API" });
		}
		return res.status(500).json({
			message:
				error.message ||
				`Error in ${actionLabel} domain privacy`,
		});
	}
};

class DomainController {
	constructor() {
		this.manageDomainPrivacy = this.manageDomainPrivacy.bind(this);
		this.enableDomainPrivacy = this.enableDomainPrivacy.bind(this);
		this.disableDomainPrivacy = this.disableDomainPrivacy.bind(this);
	}

	async domainSearch(req, res) {
		const {
			websiteName,
			renewalFeePerc,
			transferFeePerc,
			registrationFeePerc,
		} = req.query;
		// const response = await apiClient.request('checkdomainavailable', { websiteName});
		const response = await domainProviderApiClient.request(
			"checkdomainavailable",
			{ websiteName },
			null,
			"both"
		);
		if (!response || !response.responseData) {
			return res
				.status(404)
				.json({ message: "Domain is not available for registration" });
		}
		const { renewalfee, registrationFee, transferFee } =
			response.responseData;

		response.responseData.renewalfee = validateAndApplyFee(
			renewalfee,
			renewalFeePerc,
			"Renewal fee"
		);
		response.responseData.registrationFee = validateAndApplyFee(
			registrationFee,
			registrationFeePerc,
			"Registration fee"
		);
		response.responseData.transferFee = validateAndApplyFee(
			transferFee,
			transferFeePerc,
			"Transfer fee"
		);                                                                                             
		return res.status(200).json(response);
	}

	async domainSuggestion(req, res) {
		let { keyword, limit = 10, provider } = req.query;
		
		if (!provider || provider === "hostbay") {
			provider = "openprovider";
		}
		
		const response = await domainProviderApiClient.request(
			"domainSuggestion",
			{ keyword, maxResult: limit },
			null,
			provider
		);
		return res.status(200).json(response);
	}

	async domainList(req, res) {
		let user = await User.findById(req.user.id).populate("domains");
		return res.status(200).json({ data: user.domains });

		// try {
		// 	// Query Domain collection directly so all of the user's domains
		// 	// (including ones added later) are returned reliably.
		// 	const domains = await Domain.find({
		// 		user: req.user.id,
		// 		deletedAt: { $eq: null },
		// 	}).sort({ createdAt: -1 }); // newest first

		// 	return res.status(200).json({ data: domains });
		// } catch (error) {
		// 	console.error("Error fetching domain list:", error);
		// 	return res.status(500).json({
		// 		message: "Failed to fetch domains",
		// 		error: error.message,
		// 	});
		// }
	}

	async getDomainTransferList(req, res) {
		try {
			// Ensure user is authenticated
			if (!req.user || !req.user.id) {
				return res.status(401).json({
					success: false,
					responseMsg: {
						statusCode: 401,
						message: "Unauthorized - User not authenticated",
					},
					responseData: [],
				});
			}

			const user = await User.findById(req.user.id);
			if (!user) {
				return res.status(401).json({
					success: false,
					responseMsg: {
						statusCode: 401,
						message: "Unauthorized - User not found",
					},
					responseData: [],
				});
			}

			// Get all domains with transfer-related status - ONLY for this user
			const domainsWithTransfers = await Domain.find({
				user: user._id, // Explicitly filter by authenticated user's ID
				"transferInfo.transferStatus": { $exists: true, $ne: null },
				deletedAt: { $eq: null }
			}).lean();

			console.log(`[getDomainTransferList] User ${user._id} has ${domainsWithTransfers.length} domains with transfer status`);

			if (domainsWithTransfers.length === 0) {
				return res.status(200).json({
					success: true,
					responseMsg: {
						statusCode: 200,
						message: "No domain transfers found for this user",
					},
					responseData: [],
				});
			}

			// Fetch transfer status from HostBay API for each domain
			// Note: All domains here are already filtered to belong to the authenticated user
			const transferList = await Promise.allSettled(
				domainsWithTransfers.map(async (domain) => {
					// Double-check: ensure domain belongs to the authenticated user
					if (domain.user && domain.user.toString() !== user._id.toString()) {
						console.warn(`[getDomainTransferList] Domain ${domain.websiteName} does not belong to user ${user._id}`);
						return null; // Skip this domain
					}

					const provider = domain.provider || "hostbay";
					
					if (provider.toLowerCase() === "hostbay") {
						try {
							const response = await domainProviderApiClient.request(
								"TransferStatus",
								{
									domain_name: domain.websiteName.toLowerCase(),
								},
								"GET",
								"hostbay"
							);

							// Map the API response status
							const apiStatus = 
								response?.responseData?.status ||
								response?.responseData?.transfer_status ||
								response?.data?.status ||
								domain.transferInfo?.transferStatus;

							let mappedTransferStatus = "Pending";
							if (apiStatus?.toLowerCase().includes("accept") || 
								apiStatus?.toLowerCase() === "accepted") {
								mappedTransferStatus = "Accepted";
							} else if (apiStatus?.toLowerCase().includes("complete") || 
								apiStatus?.toLowerCase() === "completed") {
								mappedTransferStatus = "Completed";
							} else if (apiStatus?.toLowerCase().includes("fail") || 
								apiStatus?.toLowerCase() === "failed") {
								mappedTransferStatus = "Failed";
							} else if (apiStatus?.toLowerCase().includes("pending")) {
								mappedTransferStatus = "Pending";
							}

							// Update domain in database
							await Domain.findByIdAndUpdate(domain._id, {
								"transferInfo.transferStatus": mappedTransferStatus,
								"transferInfo.acceptedAt": 
									(mappedTransferStatus === "Accepted" || mappedTransferStatus === "Completed") 
										? (domain.transferInfo?.acceptedAt || new Date())
										: domain.transferInfo?.acceptedAt,
								"transferInfo.completedAt": 
									mappedTransferStatus === "Completed" 
										? new Date()
										: domain.transferInfo?.completedAt,
							});

							return {
								...domain,
								transferInfo: {
									...domain.transferInfo,
									transferStatus: mappedTransferStatus,
								},
							};
						} catch (error) {
							console.error(`Error fetching transfer status for ${domain.websiteName}:`, error);
							// Return domain with current status from database
							return domain;
						}
					} else {
						// For non-HostBay providers, return domain as is
						return domain;
					}
				})
			);

			// Extract successful results and filter out null values
			const successfulTransfers = transferList
				.filter((result) => result.status === "fulfilled" && result.value !== null)
				.map((result) => result.value)
				// Final safety check: ensure all domains belong to the authenticated user
				.filter((domain) => {
					const domainUserId = domain.user?.toString() || domain.user;
					const currentUserId = user._id.toString();
					if (domainUserId !== currentUserId) {
						console.warn(`[getDomainTransferList] Filtered out domain ${domain.websiteName} - user mismatch`);
						return false;
					}
					return true;
				});

			console.log(`[getDomainTransferList] Returning ${successfulTransfers.length} transfer(s) for user ${user._id}`);

			return res.status(200).json({
				success: true,
				responseMsg: {
					statusCode: 200,
					message: "Transfer list retrieved successfully",
				},
				responseData: successfulTransfers,
			});
		} catch (error) {
			console.error("Error in getDomainTransferList:", error);
			return res.status(500).json({
				success: false,
				responseMsg: {
					statusCode: 500,
					message: error.message || "Internal server error",
				},
				responseData: [],
			});
		}
	}

	async getDomainBundles(req, res) {
		try {
			const { websiteName, provider, years = 1 } = req.query;

			if (!websiteName) {
				return res.status(400).json({
					success: false,
					responseMsg: {
						statusCode: 400,
						message: "websiteName is required",
					},
					responseData: [],
				});
			}

			// Extract base domain name (without TLD)
			const baseDomain = websiteName.split('.')[0];
			if (!baseDomain) {
				return res.status(400).json({
					success: false,
					responseMsg: {
						statusCode: 400,
						message: "Invalid websiteName format",
					},
					responseData: [],
				});
			}

			// Determine provider
			let domainProvider = provider;
			if (!domainProvider || domainProvider === "hostbay") {
				domainProvider = "openprovider";
			}

			console.log(`[getDomainBundles] Processing bundles for: ${baseDomain}, provider: ${domainProvider}`);

			// Get TLD suggestions
			let tldSuggestions = [];
			try {
				const tldResponse = await domainProviderApiClient.request(
					"getTldSuggestion",
					{ websiteName: baseDomain },
					null,
					domainProvider
				);
				tldSuggestions = tldResponse?.responseData || [];
				console.log(`[getDomainBundles] TLD suggestions received: ${tldSuggestions.length}`);
			} catch (error) {
				console.error(`[getDomainBundles] Error fetching TLD suggestions:`, error);
				// Continue with popular TLDs even if suggestions fail
			}
			
			// Popular TLDs for brand protection bundles (limited to top 5 for faster response)
			const popularTlds = ['.com', '.net', '.org', '.online', '.io'];
			
			// Extract TLDs from suggestions (they come as full domain names like "apple.com")
			const extractTld = (suggestion) => {
				if (suggestion.websiteName) {
					const parts = suggestion.websiteName.split('.');
					return parts.length > 1 ? '.' + parts.slice(1).join('.') : null;
				}
				return suggestion.extension || suggestion.tld || suggestion.name || null;
			};

			// Filter and prioritize popular TLDs from suggestions (limit to 5)
			const selectedTlds = popularTlds
				.map(tld => {
					const suggestion = tldSuggestions.find(s => {
						const suggestionTld = extractTld(s);
						return suggestionTld && suggestionTld.toLowerCase() === tld.toLowerCase();
					});
					if (suggestion) {
						const tldName = extractTld(suggestion) || tld;
						return { ...suggestion, tld: tldName };
					}
					return null;
				})
				.filter(Boolean)
				.slice(0, 5); // Limit to 5 TLDs for faster response

			// If no popular TLDs found in suggestions, add popular TLDs directly (fallback, limit to 5)
			if (selectedTlds.length === 0) {
				console.log(`[getDomainBundles] No popular TLDs in suggestions, using fallback for popular TLDs`);
				popularTlds.slice(0, 5).forEach(tld => {
					selectedTlds.push({
						tld: tld,
						websiteName: `${baseDomain}${tld}`
					});
				});
			}                                                             

			// If still no TLDs and we have suggestions, use first 3 from suggestions (reduced from 5)
			if (selectedTlds.length === 0 && tldSuggestions.length > 0) {
				console.log(`[getDomainBundles] Using first 3 suggestions as fallback`);
				selectedTlds.push(...tldSuggestions.slice(0, 3).map(s => ({
					...s,
					tld: extractTld(s) || '.com'
				})));
			}

			console.log(`[getDomainBundles] Selected TLDs to process: ${selectedTlds.length}`);

			// Get pricing for each TLD
			const domainPricingPromises = selectedTlds.map(async (tldData) => {
				try {
					// Use websiteName from suggestion if available, otherwise construct it
					const fullDomain = tldData.websiteName || `${baseDomain}${tldData.tld || ''}`;
					
					console.log(`[getDomainBundles] Fetching price for: ${fullDomain}`);
					
					const priceResponse = await domainProviderApiClient.request(
						"checkDomainPrice",
						{ websiteName: fullDomain },
						null,
						domainProvider
					);

					console.log(`[getDomainBundles] Price response for ${fullDomain}:`, JSON.stringify(priceResponse?.responseData || {}, null, 2)); 

					// Try multiple possible response structures
					let results = [];
					if (priceResponse?.responseData?.["0"]) {
						results = Array.isArray(priceResponse.responseData["0"]) 
							? priceResponse.responseData["0"] 
							: [priceResponse.responseData["0"]];
					} else if (priceResponse?.responseData?.prices) {
						results = Array.isArray(priceResponse.responseData.prices)
							? priceResponse.responseData.prices
							: [priceResponse.responseData.prices];
					} else if (Array.isArray(priceResponse?.responseData)) {
						results = priceResponse.responseData;
					} else if (priceResponse?.responseData) {
						// Try to extract price directly from responseData
						if (priceResponse.responseData.price || priceResponse.responseData.registrationPrice) {
							const price = priceResponse.responseData.price || priceResponse.responseData.registrationPrice;
							const tldName = tldData.tld || tldData.extension || tldData.name || '';
							return {
								name: fullDomain,
								tld: tldName,
								registrationPrice: parseFloat(price) || 0,
								renewalPrice: parseFloat(price) || 0,
								available: priceResponse?.responseData?.available !== false,
							};
						}
					}

					let registrationPrice = 0;
					let renewalPrice = 0;

					// Extract price for requested years
					const requestedYear = parseInt(years);
					
					// Try to find matching year 
					const matchingYear = results.find((r) => {
						if (!r || !r.description) return false;
						const match = r.description.match(/for\s+(\d+)\s+year/i);
						return match && parseInt(match[1]) === requestedYear;
					});

					if (matchingYear && matchingYear.description) {
						const match = matchingYear.description.match(/is\s+([\d.]+)/i);
						if (match) {
							registrationPrice = parseFloat(match[1]);
						} else {
							// Try alternative patterns
							const altMatch = matchingYear.description.match(/(?:price|cost|amount)[:\s]+([\d.]+)/i);
							if (altMatch) {
								registrationPrice = parseFloat(altMatch[1]);
							} else if (matchingYear.price) {
								registrationPrice = parseFloat(matchingYear.price);
							} else if (matchingYear.amount) {
								registrationPrice = parseFloat(matchingYear.amount);
							}
						}
					} else {
						// Fallback to 1 year price
						const firstYear = results.find((r) => {
							if (!r || !r.description) return false;
							return r.description.includes("1 year") || r.description.includes("1-year");
						});
						
						if (firstYear) {
							const match = firstYear.description?.match(/is\s+([\d.]+)/i);
							if (match) {
								const yearlyPrice = parseFloat(match[1]);
								registrationPrice = yearlyPrice * requestedYear;
							} else if (firstYear.price) {
								registrationPrice = parseFloat(firstYear.price) * requestedYear;
							} else if (firstYear.amount) {
								registrationPrice = parseFloat(firstYear.amount) * requestedYear;
							}
						} else if (results.length > 0) {
							// Last resort: use first result's price if available
							const firstResult = results[0];
							if (firstResult.price) {
								registrationPrice = parseFloat(firstResult.price) * requestedYear;
							} else if (firstResult.amount) {
								registrationPrice = parseFloat(firstResult.amount) * requestedYear;
							}
						}
					}

					// Get renewal price
					if (registrationPrice > 0) {
						renewalPrice = registrationPrice / requestedYear; // Per year renewal
					} else {
						// Try to find renewal price in response
						const renewalResult = results.find((r) => {
							if (!r || !r.description) return false;
							return r.description.toLowerCase().includes("renewal") || r.description.toLowerCase().includes("renew");
						});
						if (renewalResult) {
							const renewalMatch = renewalResult.description?.match(/is\s+([\d.]+)/i);
							if (renewalMatch) {
								renewalPrice = parseFloat(renewalMatch[1]);
							} else if (renewalResult.price) {
								renewalPrice = parseFloat(renewalResult.price);
							}
						}
					}

					// Only return if we have a valid price
					if (registrationPrice > 0) {
						const tldName = tldData.tld || tldData.extension || tldData.name || '';
						console.log(`[getDomainBundles] Successfully extracted price for ${fullDomain}: reg=${registrationPrice}, renew=${renewalPrice}`);
						return {
							name: fullDomain,
							tld: tldName,
							registrationPrice: registrationPrice,
							renewalPrice: renewalPrice,
							available: priceResponse?.responseData?.available !== false,
						};
					} else {
						console.warn(`[getDomainBundles] Could not extract price for ${fullDomain}, results:`, results);
						return null;
					}
				} catch (error) {
					console.error(`[getDomainBundles] Error fetching price for ${baseDomain}${tldData.tld || tldData.extension}:`, error);
					return null;
				}
			});

			const domainPricings = (await Promise.all(domainPricingPromises)).filter(Boolean);

			console.log(`[getDomainBundles] Successfully fetched prices for ${domainPricings.length} out of ${selectedTlds.length} TLDs`);

			if (domainPricings.length === 0) {
				console.warn(`[getDomainBundles] No domain pricings available. Selected TLDs: ${selectedTlds.length}, TLD suggestions: ${tldSuggestions.length}`);
				return res.status(200).json({
					success: true,
					responseMsg: {
						statusCode: 200,
						message: "No bundle options available",
					},
					responseData: [],
				});
			}

			// Create bundle options
			const bundles = [];

			// Bundle 1: Top 3 TLDs (com, net, org)
			const top3Tlds = domainPricings.filter(d => ['.com', '.net', '.org'].includes(d.tld)).slice(0, 3);
			if (top3Tlds.length >= 2) {
				const bundlePrice = top3Tlds.reduce((sum, d) => sum + d.registrationPrice, 0);

				bundles.push({
					name: "Brand Protection Domain Package",
					description: `Domain Package (${top3Tlds.map(d => d.tld).join(' + ')})`,
					termYears: parseInt(years),
					items: top3Tlds.map(d => ({
						name: d.name,
						renew: {
							amount: d.renewalPrice,
							currency: "USD",
							years: 1,
							displayText: `Renews in ${new Date(new Date().setFullYear(new Date().getFullYear() + parseInt(years))).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} for $${d.renewalPrice.toFixed(2)}`
						}
					})),
					price: {
						amount: bundlePrice,
						currency: "USD",
						displayText: `$${bundlePrice.toFixed(2)}`
					}
				});
			}

			// Bundle 2: Extended bundle (5+ TLDs)
			if (domainPricings.length >= 5) {
				const extendedTlds = domainPricings.slice(0, 5);
				const bundlePrice = extendedTlds.reduce((sum, d) => sum + d.registrationPrice, 0);

				bundles.push({
					name: "Brand Protection Domain Package",
					description: `Domain Package (${extendedTlds.map(d => d.tld).join(' + ')})`,
					termYears: parseInt(years),
					items: extendedTlds.map(d => ({
						name: d.name,
						renew: {
							amount: d.renewalPrice,
							currency: "USD",
							years: 1,
							displayText: `Renews in ${new Date(new Date().setFullYear(new Date().getFullYear() + parseInt(years))).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} for $${d.renewalPrice.toFixed(2)}`
						}
					})),
					price: {
						amount: bundlePrice,
						currency: "USD",
						displayText: `$${bundlePrice.toFixed(2)}`
					}
				});
			}

			// Bundle 3: Premium bundle (all available TLDs)
			if (domainPricings.length >= 3) {
				const allTlds = domainPricings;
				const bundlePrice = allTlds.reduce((sum, d) => sum + d.registrationPrice, 0);

				bundles.push({
					name: "Brand Protection Domain Package",
					description: `Domain Package (${allTlds.map(d => d.tld).join(' + ')})`,
					termYears: parseInt(years),
					items: allTlds.map(d => ({
						name: d.name,
						renew: {
							amount: d.renewalPrice,
							currency: "USD",
							years: 1,
							displayText: `Renews in ${new Date(new Date().setFullYear(new Date().getFullYear() + parseInt(years))).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} for $${d.renewalPrice.toFixed(2)}`
						}
					})),
					price: {
						amount: bundlePrice,
						currency: "USD",
						displayText: `$${bundlePrice.toFixed(2)}`
					}
				});
			}

			return res.status(200).json({
				success: true,
				responseMsg: {
					statusCode: 200,
					message: "Domain bundles fetched successfully",
				},
				responseData: bundles,
			});
		} catch (error) {
			console.error("Error in getDomainBundles:", error);
			return res.status(500).json({
				success: false,
				responseMsg: {
					statusCode: 500,
					message: error.message || "Failed to fetch domain bundles",
				},
				responseData: [],
			});
		}
	}

	async getTldSuggestion(req, res) {
		try {
			const { websiteName } = req.query;
			let { provider } = req.query;

			if (!websiteName) {
				return res.status(400).json({
					success: false,
					responseMsg: {
						statusCode: 400,
						message: "websiteName is required",
					},
					responseData: [],
				});
			}                                                                                                                 

			if (!provider || provider === "hostbay") {
				provider = "openprovider";
			}                                                                 

			console.log("TLD Suggestion Provider:", provider, "WebsiteName:", websiteName);

			const startTime = Date.now();
			const response = await domainProviderApiClient.request(
				"getTldSuggestion",
				{ websiteName },
				null,
				provider
			);
			const duration = Date.now() - startTime;
			console.log(`TLD Suggestion completed in ${duration}ms`);

			// Ensure responseData is always an array
			if (!response?.responseData) {
				response.responseData = [];
			} else if (!Array.isArray(response.responseData)) {
				response.responseData = [response.responseData];
			}

			return res.status(200).json({
				success: true,
				responseMsg: {
					statusCode: 200,
					message: response?.responseMsg?.message || "TLD suggestions fetched successfully",
				},
				responseData: response.responseData,
			});
		} catch (error) {
			console.error("Error in getTldSuggestion controller:", error);
			return res.status(500).json({
				success: false,
				responseMsg: {
					statusCode: 500,
					message: error.message || "Failed to fetch TLD suggestions",
				},
				responseData: [],
			});
		}
	}

	async checkDomainPrice(req, res) {
		try {
			const {
				websiteName,
				provider,
				registrationFeePerc = 50,
				renewalFeePerc = 50,
				transferFeePerc = 50,
				duration = 1  // Add duration parameter with default of 1 year
			} = req.query;

			// Get provider from domain document if not provided
			let domainProvider = provider;
			if (!domainProvider && websiteName) {
				const domainData = await Domain.findOne({ websiteName: websiteName.toLowerCase(), deletedAt: { $eq: null } });
				domainProvider = domainData?.provider || provider;
			}

			// For pricing, always use openprovider (not hostbay)
			// If provider is hostbay or undefined (external domain), use openprovider for pricing
			let priceProvider = 'openprovider'; // Default to openprovider for pricing
			if (domainProvider && domainProvider.toLowerCase() === 'openprovider') {
				priceProvider = 'openprovider';
			} else if (domainProvider && domainProvider.toLowerCase() === 'connectreseller') {
				priceProvider = 'connectreseller';
			}
			// For hostbay or undefined (external domains), default to openprovider

			const response = await domainProviderApiClient.request(
				"checkDomainPrice",
				{ websiteName },
				null,
				priceProvider                                                                                                   
			);  
			
			// Check if there's an error in the response from provider
			if (response?.responseMsg?.statusCode && response.responseMsg.statusCode !== 200) {
				// Return the provider error message
				const errorMessage = response?.responseMsg?.message || 
					(response?.providerError?.desc ? `Domain provider request error: { desc: '${response.providerError.desc}', code: ${response.providerError.code || response.responseMsg.code} }` : null) ||
					"Error fetching domain price";
				return res.status(response.responseMsg.statusCode || 500).json({ 
					message: errorMessage,
					responseMsg: response.responseMsg,
					providerError: response.providerError
				});
			}
			
			// Handle null response data
			if (!response || !response.responseData) {
				throw new Error("Invalid response from pricing API");
			}

			const results = response?.responseData?.["0"] || [];
			let basePrice = 0;

			// Find the price for the requested duration
			const requestedYear = parseInt(duration);
			const matchingYear = results.find((r) => {
				const match = r.description?.match(/for\s+(\d+)\s+year/i);
				return match && parseInt(match[1]) === requestedYear;
			});

			if (matchingYear) {
				const match = matchingYear.description.match(/is\s+([\d.]+)/i);
				if (match) {
					basePrice = parseFloat(match[1]);
					console.log(`[checkDomainPrice] Extracted price for ${requestedYear} year: ${basePrice} from description: "${matchingYear.description}"`);
				}
			} else {
				// Fallback: try to find first year and multiply
				const firstYear = results.find((r) => r.description?.includes("1 year"));
				if (firstYear) {
					const match = firstYear.description.match(/is\s+([\d.]+)/i);
					if (match) {
						const yearlyPrice = parseFloat(match[1]);
						basePrice = yearlyPrice * requestedYear;
						console.log(`[checkDomainPrice] Using fallback: yearly price ${yearlyPrice} × ${requestedYear} = ${basePrice}`);
					}
				}
			}

			// IMPORTANT: The price from checkDomainPrice API is already the final price (includes markup)
			// This matches the price shown in initial display, so we should NOT apply markup again
			// The price from OpenProvider's /domains/prices endpoint appears to already include markup
			const regFinal = basePrice || undefined;
			const renewFinal = basePrice || undefined;
			const transferFinal = basePrice || undefined;

			// Ensure responseData exists before setting properties
			if (!response.responseData) {
				response.responseData = {};
			}
			response.responseData.registrationFee = regFinal;
			response.responseData.renewalfee = renewFinal;
			response.responseData.transferFee = transferFinal;


			return res.status(200).json(response);
		} catch (error) {
			console.error("❌ Error in checkDomainPrice:", error);
			return res.status(500).json({ message: "Error fetching domain price" });
		}
	}


	async placeDomainOrder(req, res) {
		try {
			let {
				productType: ProductType,
				websiteName: Websitename,
				duration: Duration,
				isWhoisProtection: IsWhoisProtection,
				ns1,
				ns2,
				ns3,
				ns4,
				id: Id,
				isEnablePremium,
				provider,
				handle,
			} = req.query;

			const normalizedWhoisProtection = normalizeBoolean(
				IsWhoisProtection,
				false
			);

			provider = "hostbay";

			const domainPrice = await getPriceForDomain(Websitename, Duration);

			if (!domainPrice) {
				throw new BadRequestError("Price not found!");
			}
			let user = await User.findById(req.user.id).populate(
				"membershipTier"
			);

			if (!user) {
				throw new BadRequestError("User not found");
			}

		let hostbayContactData = user.domainProviderClient?.hostbay?.contactData || null;

			
			if (provider === "connectreseller") {
				let customerId = user.domainProviderClient?.connectreseller?.clientId;

				if (!customerId) {
					console.log("Creating ConnectReseller customer for user...");

					const nameParts = (user.name || user.email.split('@')[0]).trim().split(/\s+/);
					const firstName = nameParts[0] || "User";
					const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "Account";
					const fullName = `${firstName} ${lastName}`.trim();

					let phoneNumber = user.mobile || user.phone || "+911234567890";

					let phoneCountryCode = "+1";
					let cleanPhoneNumber = "1234567890";

					if (phoneNumber && phoneNumber.startsWith('+')) {
						const numericPhone = phoneNumber.substring(1);

						if (numericPhone.startsWith('91')) {
							phoneCountryCode = "+91";
							cleanPhoneNumber = numericPhone.substring(2) || "1234567890";
						} else if (numericPhone.startsWith('1')) {
							phoneCountryCode = "+1";
							cleanPhoneNumber = numericPhone.substring(1) || "1234567890";
						} else {
							phoneCountryCode = "+1";
							cleanPhoneNumber = numericPhone.substring(0, 10) || "1234567890";
						}
					}
					cleanPhoneNumber = cleanPhoneNumber.replace(/[^\d]/g, '');

					// Ensure phone number has at least 10 digits
					if (cleanPhoneNumber.length < 10) {
						cleanPhoneNumber = "1234567890";
					}

					const address = user.address || "123 Main Street";
					const city = user.city || "New York";
					const state = user.state || "NY";
					const country = user.country || "US";
					const zipcode = user.zipcode || user.zip || "10001";
					const companyName = user.companyName || "";

					
					const customerData = {
						Name: fullName,
						userName: user.email,  
						password: `Temp${Date.now()}@Pass`,  
						companyName: companyName,
						Address1: address,
						city: city,
						stateName: state,
						CountryName: country,
						zip: zipcode,
						phoneNo_cc: phoneCountryCode,
						phoneNo: cleanPhoneNumber,
						faxNo_cc: "",
						faxNo: "",
						alternatePhone_cc: "",
						alternatePhone: "",
					};

					console.log("ConnectReseller AddClient request data:", {
						...customerData,
						password: "***HIDDEN***"  
					});

					try {
						const customerResponse = await domainProviderApiClient.request(
							"AddClient",
							customerData,
							"get",
							provider
						);

						console.log("ConnectReseller customer response:", customerResponse);

						// Check for Client ID in response
						if (customerResponse?.responseMsg?.statusCode === 200) {
							customerId = customerResponse?.responseData?.Id ||
								customerResponse?.responseData?.id ||
								customerResponse?.responseData?.ClientId ||
								customerResponse?.responseData?.clientId;

							if (customerId) {
								// Save customer ID to user
								if (!user.domainProviderClient) {
									user.domainProviderClient = {};
								}
								if (!user.domainProviderClient.connectreseller) {
									user.domainProviderClient.connectreseller = {};
								}

								user.domainProviderClient.connectreseller = {
									clientId: customerId,
									createdAt: new Date(),
									status: "active",
									userName: user.email,
									// Store the temporary password securely if needed
									// tempPassword: customerData.password,
								};

								await user.save();

								console.log(`✅ ConnectReseller customer created with ID: ${customerId}`);
							} else {
								throw new BadRequestError("Customer created but no ID returned in response");
							}
						} else {
							const errorMsg = customerResponse?.responseMsg?.message ||
								customerResponse?.responseData?.message ||
								customerResponse?.responseData?.responseText ||
								"Unknown error during customer creation";
							console.error("Customer creation failed:", errorMsg);
							console.error("Full response:", JSON.stringify(customerResponse, null, 2));
							throw new BadRequestError(`Failed to create ConnectReseller customer: ${errorMsg}`);
						}
					} catch (error) {
						console.error("Error creating ConnectReseller customer:", error);
						if (error instanceof BadRequestError) {
							throw error;
						}
						throw new BadRequestError(
							`Failed to create customer account: ${error.message || 'Unknown error'}`
						);
					}
				}

				Id = customerId;
				console.log(`Using ConnectReseller customer ID: ${Id}`);
			}


			// OPENPROVIDER CUSTOMER REGISTRATION IF NOT EXISTS 
			if (provider === "openprovider") {
				let customerHandle = user.domainProviderClient?.openprovider?.clientId;

				if (!customerHandle) {
					// console.log("Creating OpenProvider customer for user...");

					const nameParts = (user.name || user.email.split('@')[0]).trim().split(/\s+/);
					const firstName = nameParts[0] || "User";
					const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "Account";

					let phoneNumber = user.mobile || user.phone || "1234567890";
					phoneNumber = phoneNumber.replace(/[^\d]/g, '');

					if (phoneNumber.length < 7) {
						phoneNumber = "1234567890";
					}

					const areaCode = phoneNumber.substring(0, 3).padStart(3, '0');
					const subscriberNumber = phoneNumber.substring(3).padStart(7, '0');

					const customerData = {
						firstName: firstName.substring(0, 50),
						lastName: lastName.substring(0, 50),
						email: user.email,
						address: (user.address || "123 Main St").substring(0, 100),
						addressNumber: user.addressNumber || "1",
						city: (user.city || "New York").substring(0, 50),
						zip: user.zipcode || user.zip || "10001",
						country: user.country || "US",
						state: user.state || "NY",
						phoneCountryCode: user.phoneCountryCode || "+1",
						phoneAreaCode: areaCode,
						phone: subscriberNumber,
						companyName: (user.companyName || "").substring(0, 100),
					};


					// Create customer in OpenProvider
					try {
						const customerResponse = await domainProviderApiClient.request(
							"AddCustomer",
							customerData,
							"post",
							provider
						);


						if (customerResponse?.responseMsg?.statusCode === 200 && customerResponse?.responseData?.handle) {
							customerHandle = customerResponse.responseData.handle;

							// Save customer handle to user
							if (!user.domainProviderClient) {
								user.domainProviderClient = {};
							}
							user.domainProviderClient.openprovider = {
								clientId: customerHandle,
								createdAt: new Date(),
							};
							await user.save();

						} else {
							const errorMsg = customerResponse?.responseMsg?.message ||
								customerResponse?.responseData?.message ||
								"Unknown error during customer creation";
							console.error("Customer creation failed:", errorMsg);
							console.error("Full response:", JSON.stringify(customerResponse, null, 2));
							throw new BadRequestError(`Failed to create OpenProvider customer: ${errorMsg}`);
						}
					} catch (error) {
						console.error("Error creating OpenProvider customer:", error);

						// If it's already a BadRequestError, rethrow it
						if (error instanceof BadRequestError) {
							throw error;
						}

						throw new BadRequestError(
							`Failed to create customer account: ${error.message || 'Unknown error'}`
						);
					}
				}

				// Use the customer handle for the domain order
				handle = customerHandle;
			}

		// HOSTBAY CONTACT CREATION IF NOT EXISTS
		if (provider === "hostbay") {
			// Check if user already has HostBay contact created
			if (!hostbayContactData) {
				console.log("Creating HostBay contact for user...");

				const nameParts = (user.name || user.email.split("@")[0]).trim().split(/\s+/);
				const firstName = nameParts[0] || "User";
				const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "Account";

				// Format phone number for HostBay
				let phoneNumber = user.mobile || user.phone || "+1.5551234567";
				// Ensure phone number has proper format
				if (!phoneNumber.startsWith("+")) {
					phoneNumber = `+1${phoneNumber.replace(/[^\d]/g, "")}`;
				}

				// Prepare contact data matching HostBay format
				hostbayContactData = {
					registrant: {
						first_name: firstName,
						last_name: lastName,
						email: user.email,
						phone: phoneNumber,
						address: user.address || "Suite 1, Second Floor, Sound & Vision House, Francis Rachel Street",
						city: user.city || "Victoria",
						state: user.state || "Mahe",
						postal_code: user.zipcode || user.zip || "0",
						country: user.country || "Seychelles (SC)",
						company: user.companyName || "",
					},
				};

				// Use same contact for admin, tech, and billing
				hostbayContactData.admin = { ...hostbayContactData.registrant };
				hostbayContactData.tech = { ...hostbayContactData.registrant };
				hostbayContactData.billing = { ...hostbayContactData.registrant };

				// Save contact reference to user
				if (!user.domainProviderClient) {
					user.domainProviderClient = {};
				}
				user.domainProviderClient.hostbay = {
					contactId: "created",
					contactData: hostbayContactData,
					createdAt: new Date(),
					status: "active",
				};
				await user.save();

				console.log("✅ HostBay contact prepared and saved");
			}
		}

			if (user.domains.length === 0) {
				console.log("user domains not found! inset first time badge");
				let badge = await Badge.findOne({
					name: "First Domain Registration",
				});
				if (badge) {
					user.badges.push({ badge: badge._id });
				}
			}

			let cloudflareZone;
			// If provider is OpenProvider, create Cloudflare zone first
			if (provider === "openprovider") {
				try {
					// Check if zone already exists by searching through all pages
					// let existingZone = null;
					// let page = 1;
					// const perPage = 50;

					// while (true) {
					// 	const searchResponse = await cloudflare.zones.list({
					// 		page: page,
					// 		per_page: perPage,
					// 		name: Websitename
					// 	});

					// 	if (!searchResponse.result || searchResponse.result.length === 0) {
					// 		break;
					// 	}

					// 	existingZone = searchResponse.result.find(zone => zone.name === Websitename);
					// 	if (existingZone) {
					// 		break;
					// 	}

					// 	if (page >= searchResponse.result_info.total_pages) {
					// 		break;
					// 	}
					// 	page++;
					// }

					let zoneResponse;
					// if (existingZone) {
					// 	// Use existing zone
					// 	zoneResponse = existingZone;
					// 	console.log('Using existing Cloudflare zone:', zoneResponse.id);
					// } else {
					// Create new zone
					zoneResponse = await cloudflare.zones.create({
						name: Websitename,
						type: "full",
					});
					console.log(
						"Created new Cloudflare zone:",
						zoneResponse.id
					);
					// }

					// Set SSL encryption mode to 'Full'
					await cloudflare.zones.settings.edit("ssl", {
						value: "full",
						zone_id: zoneResponse.id,
					});

					// Enable 'Always use HTTPS' setting
					await cloudflare.zones.settings.edit("always_use_https", {
						value: "on",
						zone_id: zoneResponse.id,
					});

					// Store Cloudflare zone info
					cloudflareZone = {
						zoneId: zoneResponse.id,
						nameServers: zoneResponse.name_servers,
					};

					// Use Cloudflare nameservers for domain registration
					ns1 = zoneResponse.name_servers[0];
					ns2 = zoneResponse.name_servers[1];
					ns3 = null;
					ns4 = null;
				} catch (error) {
					console.error("Error setting up Cloudflare:", error);

					let parsedMessage = error?.message || "Unknown Cloudflare error";

					try {
						const jsonStart = parsedMessage.indexOf("{");
						if (jsonStart !== -1) {
							const jsonPart = parsedMessage.slice(jsonStart);
							const parsedJson = JSON.parse(jsonPart);
							if (parsedJson?.errors?.length) {
								parsedMessage = parsedJson.errors.map(e => e.message).join(", ");
							}
						}
					} catch (_) {
						// Ignore JSON parse errors
					}

					if (cloudflareZone) {
						try {
							await cloudflare.zones.delete({ zone_id: cloudflareZone.zoneId });
						} catch (cleanupErr) {
							console.error("Error deleting Cloudflare zone:", cleanupErr);
						}
					}

					throw new BadRequestError(`Cloudflare setup failed: ${parsedMessage}`);
				}

			}


			// console.log("Placing domain order with params:", {
			// 	ProductType,
			// 	Websitename,
			// 	Duration,
			// 	IsWhoisProtection,
			// 	ns1,
			// 	ns2,
			// 	ns3,
			// 	ns4,
			// 	Id,
			// 	isEnablePremium,
			// 	handle,
			// 	provider
			// });

			// const response = await domainProviderApiClient.request(
			// 	"domainorder",
			// 	{
			// 		ProductType,
			// 		Websitename,
			// 		Duration,
			// 		IsWhoisProtection,
			// 		ns1,
			// 		ns2,
			// 		ns3,
			// 		ns4,
			// 		Id,
			// 		isEnablePremium,
			// 		handle,
			// 	},
			// 	null,
			// 	provider
			// );
			// console.log("Domain order response:", response);


			console.log("🌐 Placing domain order:", {
				ProductType,
				Websitename,
				Duration,
				IsWhoisProtection: normalizedWhoisProtection,
				ns1,
				ns2,
				ns3,
				ns4,
				Id,
				isEnablePremium,
				handle,
				provider,
			});

		let response;
		if (provider === "hostbay") {
			// Place domain order with HostBay
			response = await domainProviderApiClient.request(
				"domainorder",
				{
					domain_name: Websitename,
					period: Duration,
					privacy_protection: normalizedWhoisProtection,
					auto_renew: false,
					use_hostbay_contacts: !hostbayContactData, // Use HostBay default contacts if we don't have custom ones
				},
				"post",
				"hostbay"
			);

			// If we have custom contact data and registration succeeded, update contacts
			if (response?.responseMsg?.statusCode === 200 && hostbayContactData) {
				try {
					await domainProviderApiClient.request(
						"updateDomainContacts",
						{
							domain_name: Websitename,
							contacts: hostbayContactData,
						},
						"put",
						"hostbay"
					);
					console.log("✅ Updated domain contacts for", Websitename);
				} catch (contactError) {
					console.warn("⚠️ Failed to update domain contacts:", contactError.message);
					// Don't fail the entire registration if contact update fails
				}
			}
		} else {
				response = await domainProviderApiClient.request(
					"domainorder",
					{
						ProductType,
						Websitename,
						Duration,
						IsWhoisProtection: normalizedWhoisProtection,
						ns1,
						ns2,
						ns3,
						ns4,
						Id,
						isEnablePremium,
						handle,
					},
					null,
					provider
				);
			}

			console.log("✅ Domain order response:", response);

			if (!response || response.statusCode >= 400 || response.responseMsg?.statusCode !== 200) {
				throw new BadRequestError(
					response?.message || "Domain registration failed at provider"
				);
			}



			


			if (response?.responseMsg?.statusCode != 200) {
				// If domain registration fails and we created a Cloudflare zone, delete it
				if (cloudflareZone) {
					try {
						await cloudflare.zones.delete({
							zone_id: cloudflareZone.zoneId,
						});
					} catch (error) {
						console.error("Error deleting Cloudflare zone:", error);
					}
				}
				throw new BadRequestError(
					response.responseMsg?.message || "Domain order failed"
				);
			}

			if (response?.responseMsg?.statusCode != 200) {
				// console.log("❌ Domain order failed full response:");
				// console.log(JSON.stringify(response, null, 2)); 
				throw new BadRequestError(response.responseMsg?.message || "Domain order failed");
			}


			// View domain details - only for non-HostBay providers or if needed
			let domainResponse;
			if (provider === "hostbay") {
				// For HostBay, use the order response data directly
				const responseData = response?.responseData || response?.data || {};
				domainResponse = {
					responseMsg: {
						statusCode: response?.responseMsg?.statusCode || 200,
						message: response?.responseMsg?.message || "Success",
					},
					responseData: {
						domainNameId: responseData.id || responseData.provider_id,
						websiteId: responseData.id || responseData.provider_id,
						customerId: null,
						websiteName: responseData.domain_name || responseData.domain || Websitename,
						orderDate: responseData.activation_date || responseData.created_at || new Date(),
						expirationDate: responseData.expiration_date || responseData.expiry_date || responseData.expires_at,
						status: responseData.status || "active",
						autorenew: responseData.auto_renew || false,
						// Include additional HostBay fields
						cloudflare_zone_id: responseData.cloudflare_zone_id || null,
						privacy_enabled: responseData.privacy_enabled || false,
						is_locked: responseData.is_locked || false,
						contact_type: responseData.contact_type || null,
						updated_at: responseData.updated_at || null,
					},
				};
			} else {
				domainResponse = await domainProviderApiClient.request(
					"ViewDomain",
					{
						websiteName: Websitename,
					},
					null,
					provider
				);
			}

			if (domainResponse?.responseMsg?.statusCode != 200) {
				// If domain view fails and we created a Cloudflare zone, delete it
				if (cloudflareZone) {
					try {
						await cloudflare.zones.delete({
							zone_id: cloudflareZone.zoneId,
						});
					} catch (error) {
						console.error("Error deleting Cloudflare zone:", error);
					}
				}
				throw new BadRequestError(
					domainResponse.responseMsg?.message ||
					"Failed to view domain"
				);
			}

			let earnRate = user?.membershipTier?.benefits?.earnRate || 1;

			let rewardLog = new RewardPointLog({
				userId: user._id,
				rewardPoints: (domainPrice.price * earnRate).toFixed(2),
				operationType: "credit",
			});

			// let domain = new Domain({
			// 	user: user._id,
			// 	domainNameId: domainResponse.responseData.domainNameId,
			// 	customerId: domainResponse.responseData.customerId,
			// 	websiteName: domainResponse.responseData.websiteName,
			// 	orderDate: domainResponse.responseData.orderDate,
			// 	expirationDate: domainResponse.responseData.expirationDate,
			// 	price: domainPrice.price,
			// 	provider: provider || "openprovider",
			// 	status: 'Active',
			// 	websiteId: null,
			// 	cloudflare: cloudflareZone,
			// 	duration: Duration,
			// 	autorenew: domainResponse.responseData?.autorenew
			// });

		const convertHostBayContactToNormalized = (hostbayContact, type) => {
			if (!hostbayContact) return null;

			let phoneCountryCode = "+1";
			let phoneSubscriber = "";
			if (hostbayContact.phone) {
				const phoneStr = String(hostbayContact.phone).trim();
				if (phoneStr.includes(".")) {
					const parts = phoneStr.split(".");
					phoneCountryCode = parts[0] || "+1";
					phoneSubscriber = parts.slice(1).join("");
				} else if (phoneStr.startsWith("+")) {
					const parts = phoneStr.split(" ");
					phoneCountryCode = parts[0] || "+1";
					phoneSubscriber = parts.slice(1).join(" ") || phoneStr.substring(1);
				} else {
					phoneSubscriber = phoneStr;
				}
			}

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

		let domain;

		if (provider === "hostbay") {
			const hostbayData = domainResponse.responseData || response.responseData || response?.data || {};
			domain = new Domain({
				user: user._id,
				domainNameId: hostbayData.domainNameId || hostbayData.id || hostbayData.provider_id,
				customerId: hostbayData.customerId || null,
				websiteName: hostbayData.websiteName || hostbayData.domain_name || hostbayData.domain || Websitename,
				orderDate: hostbayData.orderDate || hostbayData.activation_date || hostbayData.created_at || new Date(),
				expirationDate: hostbayData.expirationDate || hostbayData.expiration_date || hostbayData.expiry_date || hostbayData.expires_at || new Date(Date.now() + Duration * 365 * 24 * 60 * 60 * 1000),
				price: domainPrice.price,
				provider: "hostbay",
				status: "Active",
				duration: Duration,
				autorenew: hostbayData.autorenew || hostbayData.auto_renew || false,
			});

			// Add cloudflare zone_id if available
			if (hostbayData.cloudflare_zone_id) {
				domain.cloudflare = {
					zoneId: hostbayData.cloudflare_zone_id
				};
			}

			// Set privacy status if available
			if (hostbayData.privacy_enabled !== undefined) {
				domain.privacy = {
					isEnabled: hostbayData.privacy_enabled,
					lastStatus: hostbayData.privacy_enabled ? "enabled" : "disabled",
					updatedAt: new Date()
				};
			}

			// Set lock status if available
			if (hostbayData.is_locked !== undefined) {
				domain.lockStatus = {
					isLocked: hostbayData.is_locked,
					provider: "hostbay",
					updatedAt: new Date()
				};
			}

			if (hostbayContactData) {
				const normalizedContacts = {
					registrant: convertHostBayContactToNormalized(hostbayContactData.registrant, "registrant"),
					admin: convertHostBayContactToNormalized(hostbayContactData.admin, "admin"),
					technical: convertHostBayContactToNormalized(hostbayContactData.tech || hostbayContactData.technical, "technical"),
					billing: convertHostBayContactToNormalized(hostbayContactData.billing, "billing"),
				};

				if (Object.values(normalizedContacts).some(Boolean)) {
					domain.contacts = {
						registrant: normalizedContacts.registrant || null,
						admin: normalizedContacts.admin || null,
						technical: normalizedContacts.technical || null,
						billing: normalizedContacts.billing || null,
						lastUpdated: new Date(),
					};
				}
			}
		} else {
				domain = new Domain({
					user: user._id,
					domainNameId: domainResponse.responseData.domainNameId,
					customerId: domainResponse.responseData.customerId,
					websiteName: domainResponse.responseData.websiteName,
					orderDate: domainResponse.responseData.orderDate,
					expirationDate: domainResponse.responseData.expirationDate,
					price: domainPrice.price,
					provider: provider,
					status: 'Active',
					websiteId: null,
					cloudflare: cloudflareZone,
					duration: Duration,
					autorenew: domainResponse.responseData?.autorenew
				});
			}

			
			user.domains.push(domain);

			try {
				await Promise.all([
					user.save(),
					rewardLog.save(),
					domain.save(),
				]);
			} catch (error) {
				// If saving fails and we created a Cloudflare zone, delete it
				if (cloudflareZone) {
					try {
						await cloudflare.zones.delete({
							zone_id: cloudflareZone.zoneId,
						});
					} catch (deleteError) {
						console.error(
							"Error deleting Cloudflare zone:",
							deleteError
						);
					}
				}
				throw new Error("Failed to save data: " + error.message);
			}

			// Log domain registration activity
			try {
				await saveActivity({
					userId: user._id,
					domain: domain.websiteName,
					activityType: "domain",
					activity: "Domain Registration",
					status: "Successful",
				});
			} catch (activityError) {
				console.error(
					"Failed to log domain registration activity:",
					activityError
				);
			}

			// await Cart.deleteMany({ userId: user._id });
			// console.log(`Cart cleared for user ${user._id} after successful domain purchase`);

			try {
				await Cart.deleteMany({
					userId: user._id,
					"domain.name": Websitename,
				});
				// console.log(`🛒 Removed purchased domain '${Websitename}' from cart for user ${user._id}`);
			} catch (err) {
				console.warn("Failed to remove purchased domain from cart:", err);
			}

			// Deduct reward 
			if (req.body?.rewardPointsUsed && req.body.rewardPointsUsed > 0) {
				const pointsToDeduct = Number(req.body.rewardPointsUsed);
				if (user.rewardPoints >= pointsToDeduct) {
					user.rewardPoints -= pointsToDeduct;
					await user.save();

					await RewardPointLog.create({
						userId: user._id,
						rewardPoints: pointsToDeduct,
						operationType: "debit",
						description: "Used reward points for domain purchase",
					});

					// console.log(` Deducted ${pointsToDeduct} reward points after domain purchase`);
				} else {
					console.warn(`Not enough reward points to deduct ${pointsToDeduct}`);
				}
			}

			// Deduct wallet
			if (req.body?.walletAmountUsed && req.body.walletAmountUsed > 0) {
				user.walletBalance -= req.body.walletAmountUsed;
				await user.save();

				await Transaction.create({
					userId: user._id,
					amount: req.body.walletAmountUsed,
					type: "debit",
					method: "wallet_balance",
					description: "Used wallet balance for domain purchase",
				});

				// console.log(`Deducted $${req.body.walletAmountUsed} wallet amount after domain purchase`);
			}

			return res.status(200).json(response);

			// return res.status(200).json({
			// 	message: "Domain registered successfully",
			// 	data: {
			// 		domain: domain,
			// 		cloudflare: cloudflareZone
			// 	}
			// });
		} catch (error) {
			console.log("error", error);
			return res.status(error.status || 500).json({
				message: error.message || "Internal server error",
			});
		}
	}

	async placeTldDomainOrder(req, res) {
		try {
			const {
				productType: ProductType,
				websiteName: Websitename,
				duration: Duration,
				isWhoisProtection: IsWhoisProtection,
				ns1,
				ns2,
				ns3,
				ns4,
				id: Id,
				isEnablePremium,
				isUs,
				appPurpose,
				nexusCategory,
				handle,
				provider,
			} = req.query;

			const normalizedWhoisProtection = normalizeBoolean(
				IsWhoisProtection,
				false
			);

			const domainPrice = await getPriceForDomain(Websitename, Duration);
			if (!domainPrice) {
				throw new BadRequestError("Price not found!");
			}

			let user = await User.findById(req.user.id).populate(
				"membershipTier"
			);
			if (!user) {
				throw new BadRequestError("User not found");
			}

			if (!user.domainPurchased) {
				let badge = await Badge.findOne({
					name: "First Domain Registration",
				});
				if (badge) {
					user.badges.push({ badge: badge._id });
					user.domainPurchased = true;
				}
			}

			if (provider === "openprovider") {
				try {
					const params = {
						WebsiteName: Websitename,
					};
					const response = await domainProviderApiClient.get(
						"ManageDNSRecords",
						params,
						provider
					);
					console.log("response", response);
				} catch (error) {
					throw new Error(
						"Failed to manage DNS records: " + error.message
					);
				}
			}

			const response = await domainProviderApiClient.request(
				"domainorder",
				{
					ProductType,
					Websitename,
					Duration,
					IsWhoisProtection: normalizedWhoisProtection,
					ns1,
					ns2,
					ns3,
					ns4,
					Id,
					isEnablePremium,
					isUs,
					appPurpose,
					nexusCategory,
					handle,
				},
				null,
				provider
			);

			if (response?.responseMsg?.statusCode != 200) {
				throw new BadRequestError(
					response.responseMsg?.message || "Domain order failed"
				);
			}

			const domainResponse = await domainProviderApiClient.request(
				"ViewDomain",
				{
					websiteName: Websitename,
					domainId:
						response.responseData?.domainCreateResponse?.domainId ||
						null,
				},
				null,
				provider
			);

			if (domainResponse?.responseMsg?.statusCode != 200) {
				throw new BadRequestError(
					domainResponse.responseMsg?.message ||
					"Failed to view domain"
				);
			}

			let earnRate = user?.membershipTier?.benefits?.earnRate || 1;
			let rewardLog = new RewardPointLog({
				userId: user._id,
				rewardPoints: (domainPrice.price * earnRate).toFixed(2),
				operationType: "credit",
			});

			let domain = new Domain({
				user: user._id,
				domainNameId: domainResponse.responseData.domainNameId,
				customerId: domainResponse.responseData.customerId,
				websiteName: domainResponse.responseData.websiteName,
				orderDate: domainResponse.responseData.orderDate,
				expirationDate: domainResponse.responseData.expirationDate,
				price: domainPrice.price,
				provider: provider,
			});

			user.domains.push(domain);

			try {
				await Promise.all([
					user.save(),
					rewardLog.save(),
					domain.save(),
				]);
			} catch (error) {
				throw new Error("Failed to save data: " + error.message);
			}

			// Log TLD domain registration activity
			try {
				await saveActivity({
					userId: user._id,
					domain: domain.websiteName,
					activityType: "domain",
					activity: "TLD Domain Registration",
					status: "Successful",
				});
			} catch (activityError) {
				console.error(
					"Failed to log TLD domain registration activity:",
					activityError
				);
			}

			return res.status(200).json(response);
		} catch (error) {
			return res.status(error.status || 500).json({
				message: error.message || "Internal server error",
			});
		}
	}
	async domainTransfer(req, res) {
		const payload = { ...req.query, ...req.body };
		const providerValue =
			(payload.provider || payload.Provider || "").toString().trim().toLowerCase() ||
			"";

		const {
			orderType: OrderType,
			websiteName: Websitename,
			isWhoisProtection: IsWhoisProtection,
			authCode: AuthCode,
			id: Id,
		} = req.query;

		let response;
		let domainIdentifier =
			Websitename ||
			payload.websiteName ||
			payload.domain_name ||
			payload.domain ||
			null;

		if (providerValue === "hostbay") {
			const rawDomain =
				payload.websiteName ||
				payload.Websitename ||
				payload.domain_name ||
				payload.domain ||
				"";
			const domainName = rawDomain.toString().trim();
			const authCodeValue =
				payload.authCode ||
				payload.AuthCode ||
				payload.auth_code ||
				payload.eppCode ||
				payload.epp_code ||
				"";

			if (!domainName) {
				throw new BadRequestError("domainName is required for HostBay transfer");
			}

			if (!authCodeValue) {
				throw new BadRequestError("authCode is required for HostBay transfer");
			}

			const periodValue =
				payload.period || payload.Duration || payload.transferPeriod || 1;
			const autoRenewValue = normalizeBoolean(
				payload.auto_renew ?? payload.autoRenew ?? payload.autoRenewal,
				false
			);

			response = await domainProviderApiClient.request(
				"TransferOrder",
				{
					domain_name: domainName.toLowerCase(),
					auth_code: authCodeValue,
					period: Number(periodValue) || 1,
					auto_renew: autoRenewValue,
				},
				"POST",
				"hostbay"
			);

			domainIdentifier = domainIdentifier || domainName;
		} else {
			const normalizedWhoisProtection = normalizeBoolean(
				IsWhoisProtection,
				false
			);

			response = await apiClient.request("TransferOrder", {
				OrderType,
				Websitename,
				IsWhoisProtection: normalizedWhoisProtection,
				AuthCode,
				Id,
			});
		}

		// Log domain transfer activity
		try {
			const domain = domainIdentifier
				? await Domain.findOne({ websiteName: domainIdentifier, deletedAt: { $eq: null } })
				: null;
			if (domain) {
				await saveActivity({
					userId: req.user.id,
					domain: domain.websiteName,
					activityType: "domain",
					activity: "Domain Transfer Initiated",
					status:
						response?.responseMsg?.statusCode === 200
							? "Successful"
							: "Rejected",
				});
			}
		} catch (activityError) {
			console.error(
				"Failed to log domain transfer activity:",
				activityError
			);
		}

		return res.status(200).json(response);
	}

	async domainCancelTransfer(req, res) {
		const payload = { ...req.query, ...req.body };
		const providerValue =
			(payload.provider || payload.Provider || "").toString().trim().toLowerCase() ||
			"";
		const { id } = req.query;
		const requiredParams = [
			{ name: "id", value: id, message: "id is required" },
		];

		for (let param of requiredParams) {
			if (!param.value) {
				return res.status(400).json({ message: param.message });
			}
		}

		try {
			const params = {
				id: id,
			};
			let response;
			let domainIdentifier = null;

			if (providerValue === "hostbay") {
				const rawDomain =
					payload.domain_name ||
					payload.domainName ||
					payload.websiteName ||
					payload.Websitename ||
					null;

				if (!rawDomain) {
					throw new BadRequestError(
						"domainName is required to cancel HostBay transfer"
					);
				}

				const domainName = rawDomain.toString().trim().toLowerCase();

				response = await domainProviderApiClient.request(
					"RejectTransfer",
					{ domain_name: domainName },
					"POST",
					"hostbay"
				);

				domainIdentifier = domainName;
			} else {
				//change
				response =	await apiClient.get("CancelTransfer", params);
				const domain = await Domain.findById(id);
				domainIdentifier = domain?.websiteName || null;
			}

			// Log domain transfer cancellation activity
			try {
				const domain =
					domainIdentifier
						? await Domain.findOne({ websiteName: domainIdentifier, deletedAt: { $eq: null } })
						: await Domain.findById(id);
				if (domain) {
					await saveActivity({
						userId: req.user.id,
						domain: domain.websiteName,
						activityType: "domain",
						activity: "Domain Transfer Cancelled",
						status:
							response?.responseMsg?.statusCode === 200
								? "Successful"
								: "Rejected",
					});
				}
			} catch (activityError) {
				console.error(
					"Failed to log domain transfer cancellation activity:",
					activityError
				);
			}

			return res.status(200).json(response);
		} catch (error) {
			if (error.response) {
				return res.status(error.response.status).json({
					message:
						error.response.data.message ||
						"Error placing domain order",
				});
			} else if (error.request) {
				return res
					.status(500)
					.json({ message: "No response received from the API" });
			} else {
				return res.status(500).json({
					message: "Error cancelling domain transfer order",
				});
			}
		}
	}

	async domainValidateTransfer(req, res) {
		const payload = { ...req.query, ...req.body };
		const providerValue =
			(payload.provider || payload.Provider || "").toString().trim().toLowerCase() ||
			"";
		const { domainName } = req.query;
		const requiredParams = [
			{
				name: "domainName",
				value: domainName,
				message: "domainName is required",
			},
		];

		for (let param of requiredParams) {
			if (!param.value) {
				return res.status(400).json({ message: param.message });
			}
		}

		try {
			const params = {
				domainName: domainName,
			};
			let response;

			if (providerValue === "hostbay") {
				const registrarTag =
					payload.registrar_tag ||
					payload.registrarTag ||
					payload.RegistrarTag ||
					null;

				response = await domainProviderApiClient.request(
					"ApproveTransfer",
					{
						domain_name: domainName.toLowerCase(),
						...(registrarTag ? { registrar_tag: registrarTag } : {}),
					},
					"POST",
					"hostbay"
				);
			} else {
				//change
				response = await apiClient.get("syncTransfer", params);
			}

			return res.status(200).json(response);
		} catch (error) {
			if (error.response) {
				return res.status(error.response.status).json({
					message:
						error.response.data.message ||
						"Error placing domain order",
				});
			} else if (error.request) {
				return res
					.status(500)
					.json({ message: "No response received from the API" });
			} else {
				return res.status(500).json({
					message: "Error cancelling domain transfer order",
				});
			}
		}
	}

	async getDomainTransferStatus(req, res) {
		try {
			const { domainName } = req.query;
			
			if (!domainName) {
				return res.status(400).json({
					success: false,
					responseMsg: {
						statusCode: 400,
						message: "domainName is required",
					},
					responseData: null,
				});
			}

			// Get the domain from database to check if it belongs to the user
			const user = await User.findById(req.user.id);
			if (!user) {
				return res.status(401).json({
					success: false,
					responseMsg: {
						statusCode: 401,
						message: "Unauthorized",
					},
					responseData: null,
				});
			}

			const domain = await Domain.findOne({
				user: user._id,
				websiteName: domainName.toLowerCase(),
				deletedAt: { $eq: null }
			});

			if (!domain) {
				return res.status(404).json({
					success: false,
					responseMsg: {
						statusCode: 404,
						message: "Domain not found or doesn't belong to user",
					},
					responseData: null,
				});
			}

			// Check if domain has transfer-related status
			if (!domain.transferInfo || !domain.transferInfo.transferStatus) {
				return res.status(404).json({
					success: false,
					responseMsg: {
						statusCode: 404,
						message: "Domain does not have a transfer-related status",
					},
					responseData: null,
				});
			}

			// Get transfer status from HostBay API
			const provider = domain.provider || "hostbay";
			
			if (provider.toLowerCase() === "hostbay") {
				try {
					const response = await domainProviderApiClient.request(
						"TransferStatus",
						{
							domain_name: domainName.toLowerCase(),
						},
						"GET",
						"hostbay"
					);

					// Map the API response status to our status format
					const apiStatus = 
						response?.responseData?.status ||
						response?.responseData?.transfer_status ||
						response?.data?.status ||
						domain.transferInfo.transferStatus;

					let mappedTransferStatus = "Pending";
					if (apiStatus?.toLowerCase().includes("accept") || 
						apiStatus?.toLowerCase() === "accepted") {
						mappedTransferStatus = "Accepted";
					} else if (apiStatus?.toLowerCase().includes("complete") || 
						apiStatus?.toLowerCase() === "completed") {
						mappedTransferStatus = "Completed";
					} else if (apiStatus?.toLowerCase().includes("fail") || 
						apiStatus?.toLowerCase() === "failed") {
						mappedTransferStatus = "Failed";
					} else if (apiStatus?.toLowerCase().includes("pending")) {
						mappedTransferStatus = "Pending";
					}

					// Update domain transfer info in database
					domain.transferInfo.transferStatus = mappedTransferStatus;
					if (mappedTransferStatus === "Accepted" || mappedTransferStatus === "Completed") {
						domain.transferInfo.acceptedAt = domain.transferInfo.acceptedAt || new Date();
					}
					if (mappedTransferStatus === "Completed") {
						domain.transferInfo.completedAt = new Date();
					}
					await domain.save();

					return res.status(200).json({
						success: true,
						responseMsg: {
							statusCode: 200,
							message: "Transfer status retrieved successfully",
						},
						responseData: {
							domainName: domainName,
							transferStatus: mappedTransferStatus,
							transferInfo: domain.transferInfo,
							apiResponse: response?.responseData || response?.data,
						},
					});
				} catch (error) {
					console.error("Error fetching transfer status from HostBay:", error);
					// Return current status from database if API call fails
					return res.status(200).json({
						success: true,
						responseMsg: {
							statusCode: 200,
							message: "Transfer status retrieved from database",
						},
						responseData: {
							domainName: domainName,
							transferStatus: domain.transferInfo.transferStatus,
							transferInfo: domain.transferInfo,
						},
					});
				}
			} else {
				// For other providers, return current status from database
				return res.status(200).json({
					success: true,
					responseMsg: {
						statusCode: 200,
						message: "Transfer status retrieved successfully",
					},
					responseData: {
						domainName: domainName,
						transferStatus: domain.transferInfo.transferStatus,
						transferInfo: domain.transferInfo,
					},
				});
			}
		} catch (error) {
			console.error("Error in getDomainTransferStatus:", error);
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

	async domainRenew(req, res) {
		const payload = { ...req.query, ...req.body };
		const websiteName =
			payload.websiteName ||
			payload.Websitename ||
			payload.domain ||
			null;
		const durationValue = payload.duration || payload.Duration || 1;
		const duration = Number.parseInt(durationValue, 10) || 1;
		const normalizedWhoisProtection = normalizeBoolean(
			payload.isWhoisProtection ?? payload.IsWhoisProtection,
			false
		);

		try {
			const context = await resolveDomainProviderContext({
				domainName: websiteName,
				domainNameId: payload.id || payload.domainNameId || payload.Id,
				provider: payload.provider,
			});

			if (!context.websiteName) {
				throw new BadRequestError("domain is required");
			}

			const provider = context.provider;
			const domainDoc =
				context.domainDoc ||
				(await Domain.findOne({
					websiteName: context.websiteName.toLowerCase(),
					deletedAt: { $eq: null }
				})) ||
				(await Domain.findOne({ websiteName: context.websiteName, deletedAt: { $eq: null } }));

			const user = await User.findById(req.user.id).populate(
				"membershipTier"
			);

			if (!user) {
				throw new BadRequestError("User not found");
			}

			const priceProvider =
				provider === "hostbay" ? "openprovider" : undefined;
			const domainPrice = await getPriceForDomain(
				context.websiteName,
				duration,
				priceProvider
			);

			if (!domainPrice) {
				throw new BadRequestError("Price not found!");
			}

			let response;
			let wallet;
			let holdTransaction;
			const amount = Number(domainPrice.price || 0);
			const currency = "USD";

			if (provider === "hostbay") {
				wallet = await Wallet.findOne({ userId: user._id });
				if (!wallet) {
					wallet = await Wallet.create({ userId: user._id });
				}

				const currentBalance = Number(wallet.balance.get(currency) || 0);

				if (amount <= 0) {
					throw new BadRequestError(
						"Unable to determine renewal amount."
					);
				}

				if (currentBalance < amount) {
					return res.status(400).json({
						responseMsg: {
							id: 0,
							reason: "insufficient_wallet",
							statusCode: 400,
							message:
								"Insufficient wallet balance for domain renewal.",
						},
						responseData: null,
					});
				}

				wallet.balance.set(currency, currentBalance - amount);
				wallet.lastTransactionAt = new Date();
				await wallet.save();

				holdTransaction = await Transaction.create({
					userId: user._id,
					walletId: wallet._id,
					amount,
					currency,
					type: "debit",
					method: "wallet",
					from: "hostbay_domain_renew_hold",
					reference: `hostbay_domain_renew_${Date.now()}`,
					status: "pending",
				});

				try {
					response = await domainProviderApiClient.request(
						"RenewalOrder",
						{
							Websitename: context.websiteName,
							websiteName: context.websiteName,
							Duration: duration,
							period: duration,
							IsWhoisProtection: normalizedWhoisProtection,
							Id: context.domainNameId || payload.id || payload.Id,
						},
						null,
						provider
					);

					const success =
						response?.responseMsg?.statusCode === 200 ||
						response?.responseMsg?.statusCode === 0 ||
						response?.success === true ||
						response?.status === "success";

					if (!success) {
						const message =
							response?.responseMsg?.message ||
							response?.message ||
							"Domain renewal failed";
						throw new BadRequestError(message);
					}

					holdTransaction.status = "completed";
					holdTransaction.from = "hostbay_domain_renew";
					await holdTransaction.save();

					// Create payment record for domain renewal
					try {
						await createPaymentRecord({
							userId: user._id,
							service: "Domain Renewal",
							title: context.websiteName,
							amount: amount,
							currency: currency,
							paymentMethod: "wallet_balance",
							status: "completed",
							transactionId: holdTransaction._id,
							metadata: {
								domainName: context.websiteName,
								duration: duration,
								provider: provider,
								reference: holdTransaction.reference,
							},
						});
					} catch (paymentError) {
						console.error(`Failed to create payment record for domain renewal ${context.websiteName}:`, paymentError);
					}
				} catch (error) {
					holdTransaction.status = "failed";
					holdTransaction.from = "hostbay_domain_renew_failed";
					await holdTransaction.save();

					// Create payment record for failed domain renewal
					try {
						await createPaymentRecord({
							userId: user._id,
							service: "Domain Renewal",
							title: context.websiteName,
							amount: amount,
							currency: currency,
							paymentMethod: "wallet_balance",
							status: "failed",
							transactionId: holdTransaction._id,
							metadata: {
								domainName: context.websiteName,
								duration: duration,
								provider: provider,
								reference: holdTransaction.reference,
								errorMessage: error.message || "Domain renewal failed",
							},
						});
					} catch (paymentError) {
						console.error(`Failed to create payment record for failed domain renewal ${context.websiteName}:`, paymentError);
					}

					wallet.balance.set(
						currency,
						Number(wallet.balance.get(currency) || 0) + amount
					);
					wallet.lastTransactionAt = new Date();
					await wallet.save();

					throw error;
				}
			} else {
				const OrderType =
					payload.orderType || payload.OrderType || payload.order_type;
				const requestPayload = {
					OrderType,
					Websitename: context.websiteName,
					Duration: duration,
					IsWhoisProtection: normalizedWhoisProtection,
					Id: payload.id || payload.Id || context.domainNameId,
				};
				response = await apiClient.request(
					"RenewalOrder",
					requestPayload
				);

				if (response?.responseMsg?.statusCode != 200) {
					throw new BadRequestError(
						response.responseMsg?.message ||
							"Domain renewal failed"
					);
				}
			}

			const earnRate = user?.membershipTier?.benefits?.earnRate || 1;
			const rewardPoints = (domainPrice.price * earnRate).toFixed(2);

			await new RewardPointLog({
				userId: user._id,
				rewardPoints,
				operationType: "credit",
			}).save();

			if (domainDoc) {
				try {
					const viewResponse = await domainProviderApiClient.request(
						"ViewDomain",
						{ websiteName: context.websiteName },
						null,
						provider
					);

					const expirationDate =
						viewResponse?.responseData?.expirationDate ||
						viewResponse?.responseData?.expiration_date ||
						viewResponse?.data?.expiration_date ||
						domainDoc.expirationDate;

					if (expirationDate) {
						domainDoc.expirationDate = expirationDate;
						await domainDoc.save();
					}
				} catch (viewError) {
					console.warn(
						"Failed to refresh domain details after renewal:",
						viewError?.message || viewError
					);
				}
			}

			// Log domain renewal activity
			try {
				if (domainDoc) {
					await saveActivity({
						userId: user._id,
						domain: domainDoc.websiteName,
						activityType: "domain",
						activity: "Domain Renewal",
						status: "Successful",
					});
				}
			} catch (activityError) {
				console.error(
					"Failed to log domain renewal activity:",
					activityError
				);
			}

			if (
				provider === "hostbay" &&
				!response?.responseMsg?.statusCode
			) {
				response = {
					responseMsg: {
						id: 0,
						reason: null,
						statusCode: 200,
						message: "Domain renewed successfully",
					},
					responseData: {
						domain: context.websiteName,
						provider,
						amount,
					},
				};
			}

			return res.status(200).json(response);
		} catch (error) {
			const status = error?.status || error?.statusCode || 500;
			const message =
				error instanceof BadRequestError
					? error.message
					: error?.message || "Internal server error";
			return res.status(status).json({ message });
		}
	}

	async modifyNameserver(req, res) {
		const {
			domainNameId,
			websiteName,
			nameServer1,
			nameServer2,
			nameServer3,
			nameServer4,
			nameServer5,
			nameServer6,
			nameServer7,
			nameServer8,
			nameServer9,
			nameServer10,
			nameServer11,
			nameServer12,
			nameServer13,
			provider,
		} = req.query;

		const requiredParams = [
			{
				name: "domainNameId",
				value: domainNameId,
				message: "domainNameId is required",
			},
			{
				name: "websiteName",
				value: websiteName,
				message: "websiteName (domain) is required",
			},
		];

		for (let param of requiredParams) {
			if (!param.value) {
				return res.status(400).json({ message: param.message });
			}
		}

		try {
			const params = {
				domainNameId,
				websiteName,
				nameServer1,
				nameServer2,
				nameServer3,
				nameServer4,
				nameServer5,
				nameServer6,
				nameServer7,
				nameServer8,
				nameServer9,
				nameServer10,
				nameServer11,
				nameServer12,
				nameServer13,
			};
			const response = await domainProviderApiClient.get(
				"UpdateNameServer",
				params,
				provider
			);

			// Log nameserver modification activity
			try {
				const domain = await Domain.findOne({ websiteName, deletedAt: { $eq: null } });
				if (domain) {
					await saveActivity({
						userId: req.user.id,
						domain: domain.websiteName,
						activityType: "domain",
						activity: "Nameserver Modification",
						status:
							response?.responseMsg?.statusCode === 200
								? "Successful"
								: "Rejected",
					});
				}
			} catch (activityError) {
				console.error(
					"Failed to log nameserver modification activity:",
					activityError
				);
			}

			return res.status(200).json(response);
		} catch (error) {
			if (error.response) {
				return res.status(error.response.status).json({
					message:
						error.response.data.message ||
						"Error placing domain order",
				});
			} else if (error.request) {
				return res
					.status(500)
					.json({ message: "No response received from the API" });
			} else {
				return res
					.status(500)
					.json({ message: "Error in modifying domain nameserver" });
			}
		}
	}

	async modifyAuthcode(req, res) {
		const payload = { ...req.query, ...req.body };

		try {
			const context = await resolveDomainProviderContext({
				domainName:
					payload.websiteName ||
					payload.domain ||
					payload.domain_name ||
					payload.domainName,
				domainNameId:
					payload.domainNameId ||
					payload.domain_id ||
					payload.id,
				provider: payload.provider,
			});

			if (!context.websiteName) {
				return res
					.status(400)
					.json({ message: "websiteName (domain) is required" });
			}

			if (context.provider !== "hostbay" && !context.domainNameId) {
				return res.status(400).json({
					message: "domainNameId is required for this provider",
				});
			}

			if (context.provider !== "hostbay" && !payload.authCode) {
				return res.status(400).json({
					message: "authCode is required for this provider",
				});
			}

			const requestParams =
				context.provider === "hostbay"
					? {
							websiteName: context.websiteName,
					  }
					: {
							domainNameId: context.domainNameId,
							websiteName: context.websiteName,
							authCode: payload.authCode,
					  };

			const response = await domainProviderApiClient.request(
				"updateAuthCode",
				requestParams,
				null,
				context.provider
			);

			// Log authcode modification activity
			try {
				let domainDoc = context.domainDoc;
				if (!domainDoc && context.websiteName) {
					domainDoc =
						(await Domain.findOne({
							websiteName: context.websiteName,
							deletedAt: { $eq: null }
						})) ||
						(await Domain.findOne({
							websiteName: context.websiteName.toLowerCase(),
							deletedAt: { $eq: null }
						}));
				}
				if (domainDoc && req.user?.id) {
					await saveActivity({
						userId: req.user.id,
						domain: domainDoc.websiteName,
						activityType: "domain",
						activity: "Authcode Modification",
						status:
							response?.responseMsg?.statusCode === 200
								? "Successful"
								: "Rejected",
					});
				}
			} catch (activityError) {
				console.error(
					"Failed to log authcode modification activity:",
					activityError
				);
			}

			return res
				.status(response?.responseMsg?.statusCode || 200)
				.json(response);
		} catch (error) {
			if (error.response) {
				return res.status(error.response.status).json({
					message:
						error.response.data.message ||
						"Error placing domain order",
				});
			} else if (error.request) {
				return res
					.status(500)
					.json({ message: "No response received from the API" });
			} else {
				return res
					.status(500)
					.json({ message: "Error in modifying domain authcode" });
			}
		}
	}

	async manageDomainLock(req, res) {
		const payload = { ...req.query, ...req.body };

		if (typeof payload.isDomainLocked === "undefined") {
			return res
				.status(400)
				.json({ message: "isDomainLocked is required" });
		}

		try {
			const context = await resolveDomainProviderContext({
				domainName:
					payload.websiteName ||
					payload.domain ||
					payload.domain_name ||
					payload.domainName,
				domainNameId:
					payload.domainNameId ||
					payload.domain_id ||
					payload.id,
				provider: payload.provider,
			});

			if (!context.websiteName) {
				return res
					.status(400)
					.json({ message: "websiteName (domain) is required" });
			}

			if (context.provider !== "hostbay" && !context.domainNameId) {
				return res.status(400).json({
					message: "domainNameId is required for this provider",
				});
			}

			const shouldLock = normalizeBoolean(payload.isDomainLocked);

			const requestParams =
				context.provider === "hostbay"
					? {
							websiteName: context.websiteName,
							isDomainLocked: shouldLock ? "true" : "false",
					  }
					: {
							domainNameId: context.domainNameId,
							websiteName: context.websiteName,
							isDomainLocked: shouldLock ? "true" : "false",
					  };

			const response = await domainProviderApiClient.request(
				"ManageDomainLock",
				requestParams,
				null,
				context.provider
			);

			const resolvedLockState = resolveLockStateFromResponse(
				response,
				shouldLock
			);

			const finalLockState =
				typeof resolvedLockState === "boolean"
					? resolvedLockState
					: shouldLock;

			if (response?.responseMsg?.statusCode === 200) {
				const enrichedLockStatus = {
					isLocked: finalLockState,
					provider: context.provider,
					updatedAt: new Date().toISOString(),
					source:
						typeof resolvedLockState === "boolean"
							? "response"
							: "request",
				};
				response.responseData = {
					...(response?.responseData || {}),
					lockStatus: enrichedLockStatus,
					isLocked: finalLockState,
					is_locked: finalLockState,
				};
			}

			// Persist lock status locally when available
			try {
				let domainDoc = context.domainDoc;
				if (!domainDoc && context.websiteName) {
					domainDoc =
						(await Domain.findOne({
							websiteName: context.websiteName,
							deletedAt: { $eq: null }
						})) ||
						(await Domain.findOne({
							websiteName: context.websiteName.toLowerCase(),
							deletedAt: { $eq: null }
						}));
				}
				if (domainDoc && response?.responseMsg?.statusCode === 200) {
					domainDoc.lockStatus = {
						isLocked: finalLockState,
						provider: context.provider,
						updatedAt: new Date(),
					};
					domainDoc.markModified("lockStatus");
					await domainDoc.save();
				}

				// Log domain lock management activity
				if (domainDoc && req.user?.id) {
					const lockLabel = finalLockState ? "Locked" : "Unlocked";
					await saveActivity({
						userId: req.user.id,
						domain: domainDoc.websiteName,
						activityType: "domain",
						activity: `Domain ${lockLabel}`,
						status:
							response?.responseMsg?.statusCode === 200
								? "Successful"
								: "Rejected",
					});
				}

				// Send domain unlock confirmation email when domain is unlocked
				if (domainDoc && !finalLockState && response?.responseMsg?.statusCode === 200) {
					try {
						const user = await User.findById(domainDoc.user);
						if (user && user.email) {
							// Get auth code for the domain
							let authCode = domainDoc.authInfo?.code || null;
							
							// If auth code not available, try to fetch it
							if (!authCode) {
								try {
									let authCodeResponse;
									if (context.provider === "hostbay") {
										authCodeResponse = await domainProviderApiClient.request(
											"GetAuthCode",
											{ websiteName: context.websiteName },
											null,
											"hostbay"
										);
									} else if (context.domainNameId) {
										authCodeResponse = await domainProviderApiClient.get(
											"ViewEPPCode",
											{
												domainNameId: context.domainNameId,
												websiteName: context.websiteName,
											},
											context.provider
										);
									}
									
									if (authCodeResponse?.responseMsg?.statusCode === 200) {
										authCode = 
											authCodeResponse?.responseData?.authCode ||
											authCodeResponse?.responseData?.auth_code ||
											authCodeResponse?.responseData?.authcode ||
											authCodeResponse?.responseData?.code ||
											null;
										
										// Save auth code to domain
										if (authCode && domainDoc) {
											domainDoc.authInfo = {
												code: authCode,
												provider: context.provider,
												updatedAt: new Date(),
											};
											await domainDoc.save();
										}
									}
								} catch (authCodeError) {
									console.error("Error fetching auth code:", authCodeError);
								}
							}

							if (authCode) {
								let html = nunjucks.render('mails/domain_unlock_confirmation.html', {
									NAME: user.name || user.email,
									DOMAIN_NAME: domainDoc.websiteName,
									AUTH_CODE: authCode,
									logoUrl: env.FRONTEND_URL
								});
								
								await transporter.sendMail({
									from: process.env.MAIL_FROM_ADDRESS,
									to: user.email,
									subject: `${domainDoc.websiteName} is now unlocked`,
									html: html,
								});
								
								console.log(`Domain unlock confirmation email sent to ${user.email} for ${domainDoc.websiteName}`);
							}
						}
					} catch (emailError) {
						console.error("Error sending domain unlock confirmation email:", emailError);
					}
				}
			} catch (activityError) {
				console.error(
					"Failed to log domain lock management activity:",
					activityError
				);
			}

			return res
				.status(response?.responseMsg?.statusCode || 200)
				.json(response);
		} catch (error) {
			if (error.response) {
				return res.status(error.response.status).json({
					message:
						error.response.data.message ||
						"Error placing domain order",
				});
			} else if (error.request) {
				return res
					.status(500)
					.json({ message: "No response received from the API" });
			} else {
				return res
					.status(500)
					.json({ message: "Error in modifying domain lock" });
			}
		}
	}

	async getDomainAuthCode(req, res) {
		const domainName = req.params?.domainName;
		const { provider, domainNameId } = req.query || {};

		if (!domainName) {
			return res.status(400).json({ message: "domainName is required" });
		}

		try {
			const context = await resolveDomainProviderContext({
				domainName,
				domainNameId,
				provider,
			});

			if (!context.websiteName) {
				return res.status(404).json({ message: "Domain not found" });
			}

			let response;
			if (context.provider === "hostbay") {
				response = await domainProviderApiClient.request(
					"GetAuthCode",
					{ websiteName: context.websiteName },
					null,
					"hostbay"
				);
			} else {
				if (!context.domainNameId) {
					return res.status(400).json({
						message: "domainNameId is required for this provider",
					});
				}
				response = await domainProviderApiClient.get(
					"ViewEPPCode",
					{
						domainNameId: context.domainNameId,
						websiteName: context.websiteName,
					},
					context.provider
				);
			}

			if (response?.responseMsg?.statusCode === 200) {
				try {
					let domainDoc = context.domainDoc;
					if (!domainDoc && context.websiteName) {
						domainDoc =
							(await Domain.findOne({
								websiteName: context.websiteName,
								deletedAt: { $eq: null }
							})) ||
							(await Domain.findOne({
								websiteName: context.websiteName.toLowerCase(),
								deletedAt: { $eq: null }
							}));
					}

					if (domainDoc) {
						domainDoc.authInfo = {
							code:
								response?.responseData?.authCode ||
								response?.responseData?.auth_code ||
								response?.responseData?.authcode ||
								response?.responseData?.code ||
								(domainDoc.authInfo?.code || null),
							provider: context.provider,
							updatedAt: new Date(),
						};
						domainDoc.markModified("authInfo");
						await domainDoc.save();
					}
				} catch (persistError) {
					console.error("Failed to persist domain auth code:", persistError);
				}
			}

			return res
				.status(response?.responseMsg?.statusCode || 200)
				.json(response);
		} catch (error) {
			console.error("Error fetching domain auth code:", error);
			if (error instanceof BadRequestError || error instanceof NotFoundError) {
				return res.status(error.statusCode).json({ message: error.message });
			}

			if (error.response) {
				return res.status(error.response.status).json({
					message:
						error.response.data?.message ||
						error.response.data?.responseMsg?.message ||
						"Failed to fetch domain auth code",
				});
			}

			if (error.request) {
				return res.status(500).json({
					message: "No response received from the API",
				});
			}

			return res.status(500).json({
				message: error.message || "Error fetching domain auth code",
			});
		}
	}

	async manageDomainPrivacy(req, res) {
		const payload = { ...req.query, ...req.body };
		if (typeof payload.iswhoisprotected === "undefined") {
			return res
				.status(400)
				.json({ message: "iswhoisprotected is required" });
		}
		const shouldEnable = normalizeBoolean(payload.iswhoisprotected);
		return handleDomainPrivacyToggle({
			controller: this,
			req,
			res,
			shouldEnable,
			payload,
		});
	}

	async enableDomainPrivacy(req, res) {
		return handleDomainPrivacyToggle({
			controller: this,
			req,
			res,
			shouldEnable: true,
		});
	}

	async disableDomainPrivacy(req, res) {
		return handleDomainPrivacyToggle({
			controller: this,
			req,
			res,
			shouldEnable: false,
		});
	}

	async toggleHostbayPrivacy({ context, shouldEnable, userId }) {
		const { websiteName, domainDoc } = context;
		let contactType = null;
		let isHostbayManaged = false;

		try {
			const detail = await domainProviderApiClient.request(
				"ViewDomain",
				{ websiteName },
				null,
				"hostbay"
			);
			contactType =
				detail?.responseData?.contact_type ||
				detail?.responseData?.contactType ||
				null;
			isHostbayManaged =
				contactType &&
				contactType.toLowerCase() === "hostbay_managed";
		} catch (detailError) {
			console.warn(
				`Failed to fetch HostBay domain detail for ${websiteName}:`,
				detailError?.message || detailError
			);
		}
		let cachedContacts =
			domainDoc?.privacy?.originalContacts || null;

		if (
			shouldEnable &&
			!isHostbayManaged &&
			!hasContactValues(cachedContacts)
		) {
			try {
				const contactsResponse = await domainProviderApiClient.request(
					"GetDomainContacts",
					{ domain_name: websiteName, websiteName },
					null,
					"hostbay"
				);

				if (
					contactsResponse?.responseMsg?.statusCode === 200 &&
					contactsResponse?.responseData
				) {
					const contactsData = contactsResponse.responseData;
					cachedContacts = JSON.parse(JSON.stringify(contactsData));
					if (domainDoc) {
						domainDoc.contacts = {
							...(domainDoc.contacts || {}),
							...contactsData,
							lastUpdated: new Date(),
						};
						domainDoc.privacy = domainDoc.privacy || {};
						domainDoc.privacy.originalContacts = cachedContacts;
						domainDoc.privacy.updatedAt = new Date();
						await domainDoc.save();
					}
				}
			} catch (contactError) {
				console.warn(
					`Failed to capture contacts before enabling privacy for ${websiteName}:`,
					contactError?.message || contactError
				);
			}
		}

		const endpoint = shouldEnable
			? "EnableDomainPrivacy"
			: "DisableDomainPrivacy";
		const response = await domainProviderApiClient.request(
			endpoint,
			{ domain: websiteName, websiteName },
			null,
			"hostbay"
		);

		const success = response?.responseMsg?.statusCode === 200;

		if (domainDoc && success) {
			domainDoc.privacy = domainDoc.privacy || {};
			domainDoc.privacy.lastStatus = shouldEnable ? "enabled" : "disabled";
			domainDoc.privacy.isEnabled =
				typeof response?.responseData?.is_private_whois_enabled === "boolean"
					? response.responseData.is_private_whois_enabled
					: shouldEnable;
			domainDoc.privacy.updatedAt = new Date();

			// Send WHOIS privacy enabled/disabled email for HostBay
			try {
				const user = await User.findById(domainDoc.user);
				if (user && user.email) {
					if (shouldEnable) {
						let html = nunjucks.render('mails/whois_privacy_enabled.html', {
							NAME: user.name || user.email,
							DOMAIN_NAME: websiteName,
							managePrivacyLink: env.FRONTEND_URL + `/domains/${websiteName}/privacy`,
							logoUrl: env.FRONTEND_URL
						});
						
						await transporter.sendMail({
							from: process.env.MAIL_FROM_ADDRESS,
							to: user.email,
							subject: `WHOIS privacy enabled - ${websiteName}`,
							html: html,
						});
						
						console.log(`WHOIS privacy enabled email sent to ${user.email} for ${websiteName}`);
					} else {
						let html = nunjucks.render('mails/whois_privacy_disabled.html', {
							NAME: user.name || user.email,
							DOMAIN_NAME: websiteName,
							reEnablePrivacyLink: env.FRONTEND_URL + `/domains/${websiteName}/privacy`,
							logoUrl: env.FRONTEND_URL
						});
						
						await transporter.sendMail({
							from: process.env.MAIL_FROM_ADDRESS,
							to: user.email,
							subject: `WHOIS privacy disabled - ${websiteName}`,
							html: html,
						});
						
						console.log(`WHOIS privacy disabled email sent to ${user.email} for ${websiteName}`);
					}
				}
			} catch (emailError) {
				console.error("Error sending WHOIS privacy email:", emailError);
			}

			if (
				!shouldEnable &&
				!isHostbayManaged &&
				hasContactValues(domainDoc.privacy?.originalContacts)
			) {
				try {
					await domainProviderApiClient.request(
						"updateDomainContacts",
						{
							domain_name: websiteName,
							websiteName,
							contacts: domainDoc.privacy.originalContacts,
						},
						null,
						"hostbay"
					);
					domainDoc.contacts = {
						...(domainDoc.contacts || {}),
						...domainDoc.privacy.originalContacts,
						lastUpdated: new Date(),
					};
				} catch (restoreError) {
					console.warn(
						`Failed to restore contacts after disabling privacy for ${websiteName}:`,
						restoreError?.message || restoreError
					);
				}
			}

			await domainDoc.save();
		}

		await this.logDomainPrivacyActivity({
			userId,
			domain: websiteName,
			success,
			shouldEnable,
		});

		if (isHostbayManaged && response?.responseData) {
			response.responseData.contact_type =
				response.responseData.contact_type || contactType || "hostbay_managed";
		}

		return response;
	}

	async logDomainPrivacyActivity({
		userId,
		domain,
		success,
		shouldEnable,
	}) {
		if (!userId || !domain) return;
		try {
			await saveActivity({
				userId,
				domain,
				activityType: "domain",
				activity: `Privacy Protection ${shouldEnable ? "Enabled" : "Disabled"}`,
				status: success ? "Successful" : "Rejected",
			});
		} catch (activityError) {
			console.error(
				"Failed to log domain privacy management activity:",
				activityError
			);
		}
	}

	async getWhoisInfo(req, res) {
		try {
			const payload = { ...req.query, ...req.body };
			const domainName =
				payload.domain ||
				payload.websiteName ||
				payload.domainName ||
				payload.name;

			if (!domainName) {
				throw new BadRequestError("domain is required");
			}

			const context = await resolveDomainProviderContext({
				domainName,
				domainNameId:
					payload.domainNameId ||
					payload.domain_id ||
					payload.id,
				provider: payload.provider,
			});

			if (!context.websiteName) {
				throw new NotFoundError("Domain not found");
			}

			let response;
		if (context.provider === "hostbay") {
			response = await domainProviderApiClient.request(
				"GetWhois",
				{ domain: context.websiteName, websiteName: context.websiteName },
				null,
				"hostbay"
			);

			if (
				(response?.responseMsg?.statusCode !== 200 ||
					!response?.responseData) &&
				response?.responseMsg?.statusCode !== 200
			) {
				const domainDoc = await Domain.findOne({
					websiteName: context.websiteName,
					deletedAt: { $eq: null }
				});
				const detail = await domainProviderApiClient.request(
					"ViewDomain",
					{ websiteName: context.websiteName },
					null,
					"hostbay"
				);
				const contactType =
					detail?.responseData?.contact_type ||
					detail?.responseData?.contactType ||
					null;
				const storedPrivacyEnabled =
					typeof domainDoc?.privacy?.isEnabled === "boolean"
						? domainDoc.privacy.isEnabled
						: domainDoc?.privacy?.lastStatus === "enabled";
				if (
					contactType &&
					contactType.toLowerCase() === "hostbay_managed"
				) {
					return res.status(200).json({
						responseMsg: {
							id: 0,
							reason: null,
							statusCode: 200,
							message:
								storedPrivacyEnabled
									? "WHOIS privacy is managed by HostBay and already enabled"
									: "WHOIS privacy is managed by HostBay and currently disabled",
						},
						responseData: {
							domain: context.websiteName,
							is_private_whois_enabled: storedPrivacyEnabled,
							contact_type: contactType,
							contacts: null,
							privacy: {
								managed_by: "hostbay",
								enabled: storedPrivacyEnabled,
								last_status: domainDoc?.privacy?.lastStatus || null,
							},
							raw: detail?.responseData || null,
						},
					});
				}
			}
		} else {
				const detail = await domainProviderApiClient.request(
					"ViewDomain",
					{
						websiteName: context.websiteName,
						domainNameId: context.domainNameId,
					},
					null,
					context.provider
				);

				const data = detail?.responseData || detail?.response?.data || {};
				const contacts = {
					registrant:
						data?.registrant || data?.contacts?.registrant || null,
					admin: data?.admin || data?.contacts?.admin || null,
					tech:
						data?.tech ||
						data?.technical ||
						data?.contacts?.technical ||
						data?.contacts?.tech ||
						null,
					billing:
						data?.billing || data?.contacts?.billing || null,
				};
				const isPrivacyEnabled =
					normalizeBoolean(data?.is_private_whois_enabled) ||
					normalizeBoolean(data?.IsWhoisProtection) ||
					normalizeBoolean(data?.whois_protection) ||
					normalizeBoolean(data?.privacy?.enabled);

				response = {
					responseMsg:
						detail?.responseMsg || {
							statusCode: 200,
							message: "Success",
							id: 0,
							reason: null,
						},
					responseData: {
						domain: context.websiteName,
						is_private_whois_enabled: Boolean(isPrivacyEnabled),
						contacts,
						raw: data,
					},
				};
			}

			return res
				.status(response?.responseMsg?.statusCode || 200)
				.json(response);
		} catch (error) {
			console.error("Error fetching WHOIS info:", error);
			if (error instanceof BadRequestError || error instanceof NotFoundError) {
				return res.status(error.statusCode).json({ message: error.message });
			}
			if (error.response) {
				return res.status(error.response.status).json({
					message:
						error.response.data?.message ||
						error.response.data?.responseMsg?.message ||
						"Failed to fetch WHOIS details",
				});
			}
			return res
				.status(500)
				.json({ message: error.message || "Failed to fetch WHOIS details" });
		}
	}

	async viewSecretKey(req, res) {
		const { domainNameId, provider } = req.query;

		const requiredParams = [
			{
				name: "domainNameId",
				value: domainNameId,
				message: "domainNameId is required",
			},
		];

		for (let param of requiredParams) {
			if (!param.value) {
				return res.status(400).json({ message: param.message });
			}
		}

		try {
			const params = {
				domainNameId,
			};
			const response = await domainProviderApiClient.get(
				"ViewEPPCode",
				params,
				provider
			);

			return res.status(200).json(response);
		} catch (error) {
			if (error.response) {
				return res.status(error.response.status).json({
					message:
						error.response.data.message ||
						"Error placing domain order",
				});
			} else if (error.request) {
				return res
					.status(500)
					.json({ message: "No response received from the API" });
			} else {
				return res
					.status(500)
					.json({ message: "Error in view secret key" });
			}
		}
	}

	async manageDnsRecords(req, res) {
		const { websiteId, domain, provider } = req.query;

		const requiredParams = [
			{ name: "domain", value: domain, message: "domain is required" },
			{
				name: "websiteId",
				value: websiteId,
				message: "websiteId is required",
			},
		];

		for (let param of requiredParams) {
			if (!param.value) {
				return res.status(400).json({ message: param.message });
			}
		}

		try {
			const detail = await domainProviderApiClient.request(
				"ViewDomain",
				{ websiteName: domain, domainId: websiteId },
				null,
				provider
			);
			const id = detail.responseData.websiteId;
			const params = {
				WebsiteName: domain,
				WebsiteId: id,
			};
			const response = await domainProviderApiClient.get(
				"ManageDNSRecords",
				params,
				provider
			);

			// Log DNS management activity
			try {
				await saveActivity({
					userId: req.user.id,
					domain: domain,
					activityType: "dns",
					activity: "DNS Management Enabled",
					status:
						response?.responseMsg?.statusCode === 200
							? "Successful"
							: "Rejected",
				});
			} catch (activityError) {
				console.error(
					"Failed to log DNS management activity:",
					activityError
				);
			}

			return res.status(200).json(response);
		} catch (error) {
			console.log(error);
			if (error.response) {
				return res.status(error.response.status).json({
					message:
						error.response.data.message ||
						"Error placing domain order",
				});
			} else if (error.request) {
				return res
					.status(500)
					.json({ message: "No response received from the API" });
			} else {
				return res.status(500).json({
					message: error.message || "Error in manage dns records",
				});
			}
		}
	}
	async viewDomain(req, res) {
		let { domain, provider } = req.query;

		// let user = await User.findById(req.user.id).populate("membershipTier");
		let domainData = await Domain.findOne({ websiteName: domain, deletedAt: { $eq: null } });
		provider = domainData?.provider || provider || "hostbay" || "connectreseller";

		const requiredParams = [
			{ name: "domain", value: domain, message: "domain is required" },
		];

		for (let param of requiredParams) {
			if (!param.value) {
				return res.status(400).json({ message: param.message });
			}
		}

		try {
			const detail = await domainProviderApiClient.request(
				"ViewDomain",
				{ websiteName: domain },
				null,
				provider
			);
			
			// Merge domain data from database into response
			detail.responseData = {
				...detail.responseData,
			};

			// Use orderDate from database (more reliable than provider API)
			if (domainData?.orderDate) {
				detail.responseData.orderDate = domainData.orderDate;
			}

			// Use expirationDate from database if available
			if (domainData?.expirationDate) {
				detail.responseData.expirationDate = domainData.expirationDate;
			}

			if (domainData?.lockStatus) {
				const lockStatus =
					typeof domainData.lockStatus?.toObject === "function"
						? domainData.lockStatus.toObject()
						: { ...domainData.lockStatus };
				detail.responseData = {
					...detail.responseData,
					lockStatus: lockStatus,
					isLocked:
						typeof lockStatus?.isLocked === "boolean"
							? lockStatus.isLocked
							: detail.responseData?.isLocked,
					is_locked:
						typeof lockStatus?.isLocked === "boolean"
							? lockStatus.isLocked
							: detail.responseData?.is_locked,
				};
			}
			if (domainData?.authInfo?.code) {
				detail.responseData = {
					...detail.responseData,
					authInfo:
						typeof domainData.authInfo?.toObject === "function"
							? domainData.authInfo.toObject()
							: { ...domainData.authInfo },
					auth_code:
						detail.responseData?.auth_code ||
						detail.responseData?.authCode ||
						detail.responseData?.authcode ||
						detail.responseData?.code ||
						detail.responseData?.transferCode ||
						detail.responseData?.transfer_code ||
						domainData.authInfo.code,
				};
			}
			console.log("detail =======>", detail);
			return res.status(200).json(detail);
		} catch (error) {
			console.log(error);
			if (error.response) {
				return res.status(error.response.status).json({
					message:
						error.response.data.message ||
						"Error getting domain information",
				});
			} else if (error.request) {
				return res
					.status(500)
					.json({ message: "No response received from the API" });
			} else {
				return res.status(500).json({
					message: error.message || "Error in view domain",
				});
			}
		}
	}


	async getDomainDynocheckoutUrl(req, res) {
		try {
			const { 
				amount, 
				domainData, 
				walletAmount = 0,
				rewardPointsUsed = 0,
				rewardDiscount = 0,
				hostingCartItemIds = null,
				isMixedCheckout = false
			} = req.body;
			const userId = req.user.id;
			const user = await User.findById(userId);

			if (!amount || amount <= 0) {
				return res.status(400).json({ success: false, message: "Invalid amount." });
			}

			if (!domainData) {
				return res.status(400).json({ success: false, message: "Domain data is required." });
			}

			// Step 1: Ensure wallet exists (best-effort; payment link API does not require it)
			try {
				await ensureDynoWallet(user);
			} catch (walletErr) {
				console.warn("DynoPay wallet setup skipped (payment link will still work):", walletErr?.message || walletErr);
			}

			// Step 2: Prepare metadata with domain data
			const reference = `domain_dynocheckout_${Date.now()}`;
			const frontendRedirectUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/payment-checkout`;
			const webhookUrl = `${process.env.APP_URL}/api/v1/domain/dynocheckout-webhook`;
			const normalizedDomainWhoisProtection = normalizeBoolean(
				domainData?.isWhoisProtection,
				false
			);
			
			// Normalize domainData to array if single object
			let domainDataArray = Array.isArray(domainData) ? domainData : [domainData];
			
			const meta_data = {
				userId,
				product: "domain_purchase",
				reference: reference,
				amount,
				walletAmount,
				rewardPointsUsed: rewardPointsUsed || 0,
				rewardDiscount: rewardDiscount || 0,
				domainData: domainDataArray,
				hostingCartItemIds: hostingCartItemIds || null,
				isMixedCheckout: isMixedCheckout || false,
			};

			const domainDescription = domainDataArray.length === 1
				? `Domain: ${domainDataArray[0]?.domainName || domainDataArray[0]?.domain || "domain"}`
				: `Domain purchase (${domainDataArray.length} domains)`;
			// Step 3: Try generating payment link (redirect_url = user's browser, webhook_url = backend receives payment info)
			let dynoResponse;
			try {
				dynoResponse = await generatePaymentLink(amount, frontendRedirectUrl, meta_data, user, domainDescription, webhookUrl);
			} catch (err) {
				// Handle expired or invalid token by re-registering user
				if (err?.data?.message?.includes("Authentication Expired")) {
					console.log("Token expired – re-registering user...");
					await ensureDynoWallet(user);
					dynoResponse = await generatePaymentLink(amount, frontendRedirectUrl, meta_data, user, domainDescription, webhookUrl);
				} else {
					throw err;
				}
			}

			const payload = dynoResponse?.data?.data || dynoResponse?.data || dynoResponse;
			const redirectUrl =
				payload?.payment_url ||
				payload?.payment_link ||
				payload?.redirect_url ||
				payload?.url ||
				payload?.checkout_url ||
				null;
			return res.status(200).json({
				success: true,
				message: "DynoPay redirect URL generated successfully.",
				redirect_url: redirectUrl,
			});
		} catch (error) {
			console.error("Error in getDomainDynocheckoutUrl:", error?.data || error?.response?.data || error);
			return res.status(error?.statusCode || 500).json({
				success: false,
				message: "Failed to generate DynoPay redirect URL.",
				error: typeof error === "string"
					? error
					: error?.message || error?.data?.message || "Unknown DynoPay error",
			});
		}
	}

	async getDomainPrivacyDynocheckoutUrl(req, res) {
		try {
			const { domain, domainNameId, provider, planId = "full" } = req.body;
			const userId = req.user.id;

			if (!domain) {
				return res.status(400).json({
					success: false,
					message: "Domain is required to initiate privacy checkout.",
				});
			}

			const selectedPlan = PRIVACY_PLAN_CATALOG[planId];
			if (!selectedPlan || selectedPlan.price <= 0) {
				return res.status(400).json({
					success: false,
					message: "Selected privacy plan is invalid.",
				});
			}

			const user = await User.findById(userId);
			if (!user) {
				return res.status(404).json({
					success: false,
					message: "User not found.",
				});
			}

			const context = await resolveDomainProviderContext({
				domainName: domain,
				domainNameId,
				provider,
			});

			if (!context.websiteName) {
				return res.status(404).json({
					success: false,
					message: "Domain not found.",
				});
			}

			try {
				await ensureDynoWallet(user);
			} catch (walletErr) {
				console.warn("DynoPay wallet setup skipped (payment link will still work):", walletErr?.message || walletErr);
			}

			const baseAmount = Number(selectedPlan.price);
			const vatAmount = Number((baseAmount * PRIVACY_VAT_RATE).toFixed(2));
			const amount = Number((baseAmount + vatAmount).toFixed(2));

			const reference = `domain_privacy_dynocheckout_${Date.now()}`;
			const frontendRedirectUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/domains`;
			const webhookUrl = `${process.env.APP_URL}/api/v1/domain/privacy/dynocheckout-webhook`;

			const meta_data = {
				userId,
				reference,
				product: "domain_privacy",
				planId: selectedPlan.id,
				planLabel: selectedPlan.label,
				baseAmount,
				vatAmount,
				amount,
				domainData: {
					websiteName: context.websiteName,
					domainNameId: context.domainNameId || null,
					provider: context.provider,
				},
			};

			const privacyDescription = `Whois privacy - ${domain}`;
			let dynoResponse;
			try {
				dynoResponse = await generatePaymentLink(
					amount,
					frontendRedirectUrl,
					meta_data,
					user,
					privacyDescription,
					webhookUrl
				);
			} catch (err) {
				if (err?.message?.includes("Authentication Expired")) {
					await ensureDynoWallet(user);
					dynoResponse = await generatePaymentLink(
						amount,
						frontendRedirectUrl,
						meta_data,
						user,
						privacyDescription,
						webhookUrl
					);
				} else {
					throw err;
				}
			}

			const redirectUrl =
				dynoResponse?.data?.data?.redirect_url ||
				dynoResponse?.data?.data?.payment_link ||
				dynoResponse?.data?.redirect_url ||
				null;

			if (!redirectUrl) {
				return res.status(500).json({
					success: false,
					message: "Failed to generate DynoPay redirect URL.",
				});
			}

			return res.status(200).json({
				success: true,
				message: "DynoPay redirect URL generated successfully.",
				redirect_url: redirectUrl,
				amount,
				vatAmount,
				baseAmount,
			});
		} catch (error) {
			console.error(
				"Error in getDomainPrivacyDynocheckoutUrl:",
				error?.data || error?.response?.data || error
			);
			return res.status(error?.statusCode || 500).json({
				success: false,
				message: "Failed to generate privacy checkout URL.",
				error:
					typeof error === "string"
						? error
						: error?.message ||
						  error?.data?.message ||
						  error?.response?.data?.message ||
						  "Unknown DynoPay error",
			});
		}
	}

	async processRenewalAfterDynoPayment({
		user,
		context,
		duration,
		isWhoisProtection,
	}) {
		const normalizedDuration = Number.isFinite(duration)
			? duration
			: Number.parseInt(duration, 10) || 1;
		const provider = context.provider;
		let renewalResponse;

		if (provider === "hostbay") {
			renewalResponse = await domainProviderApiClient.request(
				"RenewalOrder",
				{
					Websitename: context.websiteName,
					websiteName: context.websiteName,
					Duration: normalizedDuration,
					period: normalizedDuration,
					IsWhoisProtection: isWhoisProtection,
					Id: context.domainNameId,
				},
				null,
				provider
			);

			const success =
				renewalResponse?.responseMsg?.statusCode === 200 ||
				renewalResponse?.responseMsg?.statusCode === 0 ||
				renewalResponse?.success === true ||
				renewalResponse?.status === "success";

			if (!success) {
				const message =
					renewalResponse?.responseMsg?.message ||
					renewalResponse?.message ||
					"Domain renewal failed";
				throw new BadRequestError(message);
			}
		} else {
			const requestPayload = {
				Websitename: context.websiteName,
				Duration: normalizedDuration,
				IsWhoisProtection: isWhoisProtection,
				Id: context.domainNameId,
			};

			renewalResponse = await apiClient.request(
				"RenewalOrder",
				requestPayload
			);

			if (renewalResponse?.responseMsg?.statusCode !== 200) {
				throw new BadRequestError(
					renewalResponse?.responseMsg?.message ||
						"Domain renewal failed"
				);
			}
		}

		let viewResponse = null;
		try {
			viewResponse = await domainProviderApiClient.request(
				"ViewDomain",
				{ websiteName: context.websiteName },
				null,
				provider
			);
		} catch (viewError) {
			console.warn(
				"Failed to refresh domain details after renewal:",
				viewError?.message || viewError
			);
		}

		const expirationDate =
			viewResponse?.responseData?.expirationDate ||
			viewResponse?.responseData?.expiration_date ||
			viewResponse?.data?.expiration_date ||
			null;

		let domainDoc = context.domainDoc;
		if (!domainDoc && context.websiteName) {
			domainDoc =
				(await Domain.findOne({
					websiteName: context.websiteName.toLowerCase(),
					deletedAt: { $eq: null }
				})) ||
			(await Domain.findOne({ websiteName: context.websiteName, deletedAt: { $eq: null } }));
		}

		if (domainDoc) {
			if (expirationDate) {
				domainDoc.expirationDate = expirationDate;
			}
			if (typeof viewResponse?.responseData?.autorenew !== "undefined") {
				domainDoc.autorenew = viewResponse.responseData.autorenew;
			}
			domainDoc.duration = normalizedDuration;
			await domainDoc.save();
		}

			try {
				const priceProvider =
					provider === "hostbay" ? "openprovider" : provider;
				const { renewalPrice } = await getRenewalPriceWithMarkup({
					websiteName: context.websiteName,
					duration: normalizedDuration,
					provider: priceProvider,
				});

				if (renewalPrice) {
					const earnRate =
						user?.membershipTier?.benefits?.earnRate || 1;
					const rewardPoints = (renewalPrice * earnRate).toFixed(2);
					await RewardPointLog.create({
						userId: user._id,
						rewardPoints,
						operationType: "credit",
					});
				}
			} catch (prError) {
			console.warn(
				"Failed to record reward points after renewal:",
				prError?.message || prError
			);
		}

		try {
			await saveActivity({
				userId: user._id,
				domain: context.websiteName,
				activityType: "domain",
				activity: "Domain Renewal (DynoPay)",
				status: "Successful",
			});
		} catch (activityError) {
			console.error(
				"Failed to log domain renewal activity:",
				activityError
			);
		}

		return {
			expirationDate,
			renewalResponse,
		};
	}

	async getDomainRenewDynocheckoutUrl(req, res) {
		try {
			const {
				domain,
				domainNameId,
				provider,
				duration = 1,
				isWhoisProtection = false,
				amount: frontendAmount,
				promoCode,
				promoDiscount = 0,
				taxRate,
				vatValidated,
				countryCode,
				vatId,
			} = req.body || {};

			const userId = req.user.id;

			if (!domain) {
				return res.status(400).json({
					success: false,
					message: "Domain is required to initiate renewal checkout.",
				});
			}

			const user = await User.findById(userId);
			if (!user) {
				return res.status(404).json({
					success: false,
					message: "User not found.",
				});
			}

			const durationValue = Number.parseInt(duration, 10) || 1;
			const context = await resolveDomainProviderContext({
				domainName: domain,
				domainNameId,
				provider,
			});

			if (!context.websiteName) {
				return res.status(404).json({
					success: false,
					message: "Domain not found.",
				});
			}

			try {
				await ensureDynoWallet(user);
			} catch (walletErr) {
				console.warn("DynoPay wallet setup skipped (payment link will still work):", walletErr?.message || walletErr);
			}

			const priceProvider =
				context.provider === "hostbay" ? "openprovider" : context.provider;

			const { basePrice, renewalPrice } = await getRenewalPriceWithMarkup({
				websiteName: context.websiteName,
				duration: durationValue,
				provider: priceProvider,
			});

			const baseAmount = Number(renewalPrice || 0);
			if (!baseAmount || baseAmount <= 0) {
				return res.status(400).json({
					success: false,
					message: "Unable to determine renewal amount.",
				});
			}

			let amount;
			let vatAmount;
			const parsedFrontendAmount = Number.parseFloat(frontendAmount);
			if (parsedFrontendAmount > 0 && Number.isFinite(parsedFrontendAmount)) {
				amount = Number(parsedFrontendAmount.toFixed(2));
				const promoVal = Number(promoDiscount || 0);
				vatAmount = Number((amount - Math.max(0, baseAmount - promoVal)).toFixed(2));
				if (vatAmount < 0 || !Number.isFinite(vatAmount)) vatAmount = 0;
			} else {
				vatAmount = Number((baseAmount * VAT_RATE).toFixed(2));
				amount = Number((baseAmount + vatAmount).toFixed(2));
			}

			const reference = `domain_renew_dynocheckout_${Date.now()}`;
			const frontendRedirectUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/domains`;
			const webhookUrl = `${process.env.APP_URL}/api/v1/domain/renew/dynocheckout-webhook`;

			const normalizedWhoisProtection = normalizeBoolean(
				isWhoisProtection,
				false
			);

			const meta_data = {
				userId,
				reference,
				product: "domain_renewal",
				amount,
				baseAmount,
				vatAmount,
				duration: durationValue,
				promoCode: promoCode || null,
				promoDiscount: Number(promoDiscount || 0),
				taxRate,
				vatValidated,
				countryCode: countryCode || null,
				vatId: vatId || null,
				domainData: {
					websiteName: context.websiteName,
					domainNameId: context.domainNameId || null,
					provider: context.provider,
					duration: durationValue,
					isWhoisProtection: normalizedWhoisProtection,
					rawProviderPrice: basePrice,
					renewalMarkupPercent: DEFAULT_RENEWAL_MARKUP_PERCENT,
				},
			};

			const renewalDescription = `Domain renewal - ${context.websiteName}`;
			let dynoResponse;
			try {
				dynoResponse = await generatePaymentLink(
					amount,
					frontendRedirectUrl,
					meta_data,
					user,
					renewalDescription,
					webhookUrl
				);
			} catch (err) {
				if (err?.message?.includes("Authentication Expired")) {
					await ensureDynoWallet(user);
					dynoResponse = await generatePaymentLink(
						amount,
						frontendRedirectUrl,
						meta_data,
						user,
						renewalDescription,
						webhookUrl
					);
				} else {
					throw err;
				}
			}

			const payload = dynoResponse?.data?.data || dynoResponse?.data || dynoResponse;
			const redirectUrl =
				payload?.payment_url ||
				payload?.payment_link ||
				payload?.redirect_url ||
				payload?.url ||
				payload?.checkout_url ||
				null;

			if (!redirectUrl) {
				return res.status(500).json({
					success: false,
					message: "Failed to generate DynoPay redirect URL.",
				});
			}

			return res.status(200).json({
				success: true,
				message: "DynoPay redirect URL generated successfully.",
				redirect_url: redirectUrl,
				amount,
				vatAmount,
				baseAmount,
			});
		} catch (error) {
			console.error(
				"Error in getDomainRenewDynocheckoutUrl:",
				error?.data || error?.response?.data || error
			);
			return res.status(error?.statusCode || 500).json({
				success: false,
				message: "Failed to generate renewal checkout URL.",
				error:
					typeof error === "string"
						? error
						: error?.message ||
						  error?.data?.message ||
						  error?.response?.data?.message ||
						  "Unknown DynoPay error",
			});
		}
	}

	// Add this new handler for domain payment webhook
	async handleDomainDynoPaymentWebhook(req, res) {
		const webhookId = req.headers["x-dynopay-webhook-id"];
		if (webhookId && hasProcessed(webhookId)) {
			return res.status(200).send("OK");
		}
		const webhookSecret = process.env.DYNO_PAY_WEBHOOK_SECRET;
		const signature = req.headers["x-dynopay-signature"];
		if (webhookSecret && signature) {
			const payloadStr = typeof req.body === "object" && req.body !== null
				? JSON.stringify(req.body)
				: (typeof req.body === "string" ? req.body : JSON.stringify(req.query));
			if (!verifyDynoPaySignature(payloadStr, signature, webhookSecret)) {
				console.warn("[Payment] flow=domain_purchase | invalid signature");
				return res.status(401).send("Invalid signature");
			}
		}
		const source = { ...req.query, ...(req.body && typeof req.body === "object" ? req.body : {}) };
		const eventType = req.headers["x-dynopay-event"] || source.event;
		const frontendBase = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
		console.log("[Payment] flow=domain_purchase | webhook hit | method:", req.method, "event:", eventType, "query keys:", Object.keys(req.query || {}), "body:", req.body ? "present" : "none");
		try {
			let { transaction_id, payment_id, status, base_amount, meta_data, payment_type } = source;

			if (typeof meta_data === "string") {
				try {
					meta_data = JSON.parse(meta_data);
				} catch (e) {
					console.error("[Payment] flow=domain_purchase | invalid meta_data parse:", e?.message);
					return res.status(400).json({ success: false, message: "Invalid payment data" });
				}
			}

			const { reference, userId, amount, domainData } = meta_data || {};
			const webhookAmount = base_amount != null && base_amount !== "" ? Number(base_amount) : (meta_data?.amount != null ? Number(meta_data.amount) : undefined);
			const lookupId = transaction_id || payment_id;

			console.log("[Payment] flow=domain_purchase | event:", eventType, "| payment_id:", payment_id, "| transaction_id:", transaction_id, "| status:", status, "| userId:", userId);

			if (!reference || !userId) {
				console.warn("[Payment] flow=domain_purchase | PAYMENT_NOT_CAPTURED | reason=invalid request data (missing reference or userId)");
				markProcessed(webhookId);
				return res.status(200).json({ success: false, message: "Invalid request data." });
			}

			// Check if the transaction already exists to prevent duplicates
			const existingTransaction = await Transaction.findOne({
				reference,
				userId,
			});
			if (existingTransaction?.status === "completed") {
				console.log("[Payment] flow=domain_purchase | already processed | reference:", reference);
				markProcessed(webhookId);
				return res.status(200).json({ success: true, message: "Already processed" });
			}

			const user = await User.findById(userId);
			if (!user) {
				console.error("[Payment] flow=domain_purchase | PAYMENT_NOT_CAPTURED | reason=user not found:", userId);
				markProcessed(webhookId);
				return res.status(200).json({ success: false, message: "User not found" });
			}

			if (!user.walletToken) {
				console.warn("[Payment] flow=domain_purchase | wallet token missing (continuing with query status):", userId);
			}

			console.log('Fetching transaction details from DynoPay for id:', lookupId);
			let transactionResponse;
			if (user.walletToken && lookupId) {
				try {
					transactionResponse = await fetchUserTransactionById(
						user.walletToken,
						lookupId
					);
				} catch (fetchError) {
					console.error('❌ Failed to fetch transaction details from DynoPay:', fetchError);
				}
			}

			const responseData = transactionResponse?.data || transactionResponse;
			let verifiedStatus = status;
			if (responseData && responseData.data) {
				console.log('✅ Transaction details received from DynoPay');
				console.log('DynoPay Transaction Status:', responseData.data.status);
				console.log('DynoPay Transaction Amount:', responseData.data.base_amount);
				console.log('DynoPay Payment Mode:', responseData.data?.payment_mode);
				verifiedStatus = responseData.data.status || status;
			} else {
				console.warn('⚠️ Transaction data not found from DynoPay, using query status');
			}

			// Check payment status (new API: event=payment.confirmed or status=processing/successful)
			const isPaymentSuccessful =
				eventType === "payment.confirmed" ||
				status === "processing" ||
				verifiedStatus === "successful" ||
				status === "successful";
			console.log("[Payment] flow=domain_purchase | PAYMENT_CAPTURED:", isPaymentSuccessful, "| reference:", reference, "| event:", eventType, "| verifiedStatus:", verifiedStatus);

			if (!isPaymentSuccessful) {
				console.warn("[Payment] flow=domain_purchase | PAYMENT_NOT_CAPTURED | reason=payment failed for reference:", reference);
				if (existingTransaction) {
					existingTransaction.status = "failed";
					await existingTransaction.save();
				}
				markProcessed(webhookId);
				// Create payment records for failed domain purchases
				try {
					if (user && meta_data.domainData) {
						let domainDataArray = meta_data.domainData;
						if (!Array.isArray(domainDataArray)) {
							domainDataArray = [domainDataArray];
						}

						for (const domainData of domainDataArray) {
							const domainPrice = await getPriceForDomain(
								domainData.websiteName || domainData.name,
								domainData.duration || 1
							);

							if (domainPrice) {
								let paymentMethod = "credit_card";
								if (payment_type === "crypto") {
									paymentMethod = "crypto";
								} else if (meta_data.walletAmount && meta_data.walletAmount > 0) {
									paymentMethod = "wallet_balance";
								}

								await createPaymentRecord({
									userId: userId,
									service: "Domain Registration",
									title: domainData.websiteName || domainData.name || "Domain",
									amount: domainPrice.price,
									currency: "USD",
									paymentMethod: paymentMethod,
									status: "failed",
									metadata: {
										domainName: domainData.websiteName || domainData.name,
										duration: domainData.duration || 1,
										provider: domainData.provider || "hostbay",
										transactionId: lookupId || transaction_id,
										paymentId: payment_id,
										reference: reference,
										paymentType: payment_type,
										errorMessage: "Payment failed",
									},
								});
							}
						}
					}
				} catch (paymentError) {
					console.error(`Failed to create payment records for failed domain purchase:`, paymentError);
				}

				markProcessed(webhookId);
				return res.status(200).json({ success: false, message: "Payment failed." });
			}

			// Payment successful - now proceed with domain order
			console.log("[Payment] flow=domain_purchase | PAYMENT_CAPTURED | proceeding with domain order");
			// Create initial payment records before processing
			const isCryptoOrWallet = payment_type === "crypto" || payment_type === "CRYPTO" || (meta_data.walletAmount && meta_data.walletAmount > 0);
			let initialPaymentRecords = [];
			
			try {
				
				const userPopulated = await User.findById(userId).populate("membershipTier");
				if (!userPopulated) {
					throw new Error("User not found");
				}
				const user = userPopulated;

				let domainDataArray = meta_data.domainData;
				if (!Array.isArray(domainDataArray)) {
					domainDataArray = [domainDataArray]; // Normalize single to array
				}

				// Create payment records before processing
				for (const domainData of domainDataArray) {
					try {
						const domainPrice = await getPriceForDomain(
							domainData.websiteName || domainData.name,
							domainData.duration || 1
						);

						if (domainPrice) {
							let paymentMethod = "credit_card";
							if (payment_type === "crypto" || payment_type === "CRYPTO") {
								paymentMethod = "crypto";
							} else if (meta_data.walletAmount && meta_data.walletAmount > 0) {
								paymentMethod = "wallet_balance";
							}

							const paymentRecord = await createPaymentRecord({
								userId: userId,
								service: "Domain Registration",
								title: domainData.websiteName || domainData.name || "Domain",
								amount: domainPrice.price,
								currency: "USD",
								paymentMethod: paymentMethod,
								status: "completed",
								transactionId: existingTransaction?._id,
								metadata: {
									domainName: domainData.websiteName || domainData.name,
									duration: domainData.duration || 1,
									provider: domainData.provider || "hostbay",
									transactionId: lookupId || transaction_id,
									paymentId: payment_id,
									reference: reference,
									paymentType: payment_type,
								},
							});
							initialPaymentRecords.push(paymentRecord);
						}
					} catch (paymentError) {
						console.error(`Failed to create initial payment record for ${domainData.websiteName || domainData.name}:`, paymentError);
					}
				}

				const domainsCreated = [];
				let totalRewards = 0;


				// REGISTER USER FOR HOSTBAY IF NOT EXISTS
				const hasHostBay = domainDataArray.some(d => d.provider === "hostbay" || !d.provider);
				if (hasHostBay) {
					// Ensure provider is set to hostbay for domains without provider
					domainDataArray.forEach(d => {
						if (!d.provider) d.provider = "hostbay";
					});

					let contactData = user.domainProviderClient?.hostbay?.contactData;

					if (!contactData) {
						const nameParts = (user.name || user.email.split('@')[0]).trim().split(/\s+/);
						const firstName = nameParts[0] || "User";
						const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "Account";

						let phoneNumber = user.mobile || user.phone || "+1.5551234567";
						if (!phoneNumber.startsWith('+')) {
							phoneNumber = `+1${phoneNumber.replace(/[^\d]/g, '')}`;
						}

						contactData = {
							registrant: {
								first_name: firstName,
								last_name: lastName,
								email: user.email,
								phone: phoneNumber,
								address: user.address || "Suite 1, Second Floor, Sound & Vision House, Francis Rachel Street",
								city: user.city || "Victoria",
								state: user.state || "Mahe",
								postal_code: user.zipcode || user.zip || "0",
								country: user.country || "Seychelles (SC)",
								company: user.companyName || "",
							}
						};

						contactData.admin = { ...contactData.registrant };
						contactData.tech = { ...contactData.registrant };
						contactData.billing = { ...contactData.registrant };

						if (!user.domainProviderClient) user.domainProviderClient = {};
						user.domainProviderClient.hostbay = {
							contactId: "created",
							contactData: contactData,
							createdAt: new Date(),
							status: "active",
						};
						await user.save();
					}
				}

				// REGISTER USER FOR OPENPROVIDER IF NOT EXISTS
				const hasOpenProvider = domainDataArray.some(d => d.provider === "openprovider");
				if (hasOpenProvider) {
					let customerHandle = user.domainProviderClient?.openprovider?.clientId;

					if (!customerHandle) {
						const nameParts = (user.name || user.email.split('@')[0]).trim().split(/\s+/);
						const firstName = nameParts[0] || "User";
						const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "Account";
						let phoneNumber = (user.mobile || user.phone || "1234567890").replace(/[^\d]/g, '');
						if (phoneNumber.length < 7) phoneNumber = "1234567890";

						const customerData = {
							firstName: firstName.substring(0, 50),
							lastName: lastName.substring(0, 50),
							email: user.email,
							address: (user.address || "123 Main St").substring(0, 100),
							addressNumber: user.addressNumber || "1",
							city: (user.city || "New York").substring(0, 50),
							zip: user.zipcode || user.zip || "10001",
							country: user.country || "US",
							state: user.state || "NY",
							phoneCountryCode: user.phoneCountryCode || "+1",
							phoneAreaCode: phoneNumber.substring(0, 3).padStart(3, '0'),
							phone: phoneNumber.substring(3).padStart(7, '0'),
							companyName: (user.companyName || "").substring(0, 100),
						};

						const customerResponse = await domainProviderApiClient.request(
							"AddCustomer", customerData, "post", "openprovider"
						);

						if (customerResponse?.responseMsg?.statusCode === 200 && customerResponse?.responseData?.handle) {
							customerHandle = customerResponse.responseData.handle;
							if (!user.domainProviderClient) user.domainProviderClient = {};
							user.domainProviderClient.openprovider = { clientId: customerHandle, createdAt: new Date() };
							await user.save();
						} else {
							throw new BadRequestError(`Failed to create OpenProvider customer: ${customerResponse?.responseMsg?.message}`);
						}
					}

					domainDataArray.forEach(d => { d.handle = customerHandle; });
				}

				for (const domainData of domainDataArray) {
					// Get domain price
					const domainPrice = await getPriceForDomain(domainData.websiteName, domainData.duration);
					if (!domainPrice) {
						throw new BadRequestError(`Price not found for ${domainData.websiteName}!`);
					}

					const domainWhoisProtection = normalizeBoolean(
						domainData.isWhoisProtection,
						false
					);

					// Create Cloudflare zone if provider is openprovider
					let cloudflareZone = null;
					if (domainData.provider === "openprovider") {
						try {
							const zoneResponse = await cloudflare.zones.create({
								name: domainData.websiteName,
								type: "full",
							});
							// console.log(`Created Cloudflare zone for ${domainData.websiteName}:`, zoneResponse.id);

							await cloudflare.zones.settings.edit("ssl", { value: "full", zone_id: zoneResponse.id });
							await cloudflare.zones.settings.edit("always_use_https", { value: "on", zone_id: zoneResponse.id });

							cloudflareZone = { zoneId: zoneResponse.id, nameServers: zoneResponse.name_servers };
							domainData.ns1 = zoneResponse.name_servers[0];
							domainData.ns2 = zoneResponse.name_servers[1];
							domainData.ns3 = null;
							domainData.ns4 = null;
						} catch (error) {
							console.error(`Error setting up Cloudflare for ${domainData.websiteName}:`, error);
							throw new Error(`Failed to set up Cloudflare for ${domainData.websiteName}: ${error.message}`);
						}
					}

					// Place domain order
					let domainOrderResponse;
					let viewDomainResponse;

					if (domainData.provider === "hostbay") {
						// HostBay specific order flow
						const contactData = user.domainProviderClient?.hostbay?.contactData;

						domainOrderResponse = await domainProviderApiClient.request(
							"domainorder",
							{
								domain_name: domainData.websiteName,
								period: domainData.duration,
								privacy_protection: domainWhoisProtection,
								auto_renew: false,
								use_hostbay_contacts: !contactData,
							},
							"post",
							"hostbay"
						);

						if (domainOrderResponse?.responseMsg?.statusCode !== 200) {
							throw new BadRequestError(
								`Domain order failed for ${domainData.websiteName}: ${domainOrderResponse.responseMsg?.message || 'Unknown error'}`
							);
						}

						// Update contacts if we have custom contact data
						if (contactData && domainOrderResponse?.responseMsg?.statusCode === 200) {
							try {
								await domainProviderApiClient.request(
									"updateDomainContacts",
									{
										domain_name: domainData.websiteName,
										contacts: contactData,
									},
									"put",
									"hostbay"
								);
							} catch (contactError) {
								console.warn(`Failed to update contacts for ${domainData.websiteName}:`, contactError.message);
							}
						}

						// For HostBay, construct viewDomainResponse from order response
						const webhookResponseData = domainOrderResponse?.responseData || domainOrderResponse?.data || {};
						viewDomainResponse = {
							responseMsg: {
								statusCode: domainOrderResponse?.responseMsg?.statusCode || 200,
								message: domainOrderResponse?.responseMsg?.message || "Success",
							},
							responseData: {
								domainNameId: webhookResponseData.id || webhookResponseData.provider_id,
								websiteId: webhookResponseData.id || webhookResponseData.provider_id,
								customerId: null,
								websiteName: webhookResponseData.domain_name || webhookResponseData.domain || domainData.websiteName,
								orderDate: webhookResponseData.activation_date || webhookResponseData.created_at || new Date(),
								expirationDate: webhookResponseData.expiration_date || webhookResponseData.expiry_date || webhookResponseData.expires_at,
								status: webhookResponseData.status || "active",
								autorenew: webhookResponseData.auto_renew || false,
								// Include additional HostBay fields
								cloudflare_zone_id: webhookResponseData.cloudflare_zone_id || null,
								privacy_enabled: webhookResponseData.privacy_enabled || false,
								is_locked: webhookResponseData.is_locked || false,
								contact_type: webhookResponseData.contact_type || null,
								updated_at: webhookResponseData.updated_at || null,
							},
						};
					} else {
						// OpenProvider/ConnectReseller flow
						domainOrderResponse = await domainProviderApiClient.request(
							"domainorder",
							{
								ProductType: Number(domainData.productType),
								Websitename: domainData.websiteName,
								Duration: domainData.duration,
								IsWhoisProtection: domainWhoisProtection,
								ns1: domainData.ns1,
								ns2: domainData.ns2,
								ns3: domainData.ns3,
								ns4: domainData.ns4,
								Id: domainData.id,
								isEnablePremium: domainData.isEnablePremium,
								handle: domainData.handle || user.handle || "default",
							},
							null,
							domainData.provider
						);

						if (domainOrderResponse?.responseMsg?.statusCode !== 200) {
							if (cloudflareZone) {
								await cloudflare.zones.delete({ zone_id: cloudflareZone.zoneId });
							}
							throw new BadRequestError(
								`Domain order failed for ${domainData.websiteName}: ${domainOrderResponse.responseMsg?.message || 'Unknown error'}`
							);
						}

						if (domainOrderResponse?.responseMsg?.status === "REQ") {
							await new Promise((resolve) => setTimeout(resolve, 120000));
						}

						// View domain details
						viewDomainResponse = await domainProviderApiClient.request(
							"ViewDomain",
							{ websiteName: domainData.websiteName },
							null,
							domainData.provider
						);

						if (viewDomainResponse?.responseMsg?.statusCode !== 200) {
							if (cloudflareZone) {
								await cloudflare.zones.delete({ zone_id: cloudflareZone.zoneId });
							}
							throw new BadRequestError(
								`Failed to view ${domainData.websiteName}: ${viewDomainResponse.responseMsg?.message || 'Unknown error'}`
							);
						}
					}

					// Create reward log per domain
					let earnRate = user?.membershipTier?.benefits?.earnRate || 1;
					const rewardPoints = domainPrice.price * earnRate;
					totalRewards += rewardPoints;
					const rewardLog = new RewardPointLog({
						userId: user._id,
						rewardPoints: rewardPoints.toFixed(2),
						operationType: "credit",
					});
					await rewardLog.save();

					// Create domain record
					const viewData = viewDomainResponse.responseData || {};
					const domain = new Domain({
						user: user._id,
						domainNameId: viewData.domainNameId || viewData.id || viewData.provider_id,
						customerId: viewData.customerId || null,
						websiteName: viewData.websiteName || viewData.domain_name || viewData.domain || domainData.websiteName,
						orderDate: viewData.orderDate || viewData.activation_date || viewData.created_at || new Date(),
						expirationDate: viewData.expirationDate || viewData.expiration_date || viewData.expiry_date || viewData.expires_at,
						price: domainPrice.price,
						provider: domainData.provider || "hostbay",
						status: 'Active',
						websiteId: domainData.provider === "openprovider" ? null : (viewData.websiteId || viewData.id || viewData.provider_id),
						cloudflare: viewData.cloudflare_zone_id ? { zoneId: viewData.cloudflare_zone_id } : cloudflareZone,
						duration: domainData.duration,
						autorenew: viewData.autorenew || viewData.auto_renew || false,
					});

					// Set privacy status if available (HostBay)
					if (domainData.provider === "hostbay" && viewData.privacy_enabled !== undefined) {
						domain.privacy = {
							isEnabled: viewData.privacy_enabled,
							lastStatus: viewData.privacy_enabled ? "enabled" : "disabled",
							updatedAt: new Date()
						};
					}

					// Set lock status if available (HostBay)
					if (domainData.provider === "hostbay" && viewData.is_locked !== undefined) {
						domain.lockStatus = {
							isLocked: viewData.is_locked,
							provider: "hostbay",
							updatedAt: new Date()
						};
					}

					await domain.save();
					domainsCreated.push(domain._id);

					// Log activity per domain
					try {
						await saveActivity({
							userId: user._id,
							domain: domain.websiteName,
							activityType: "domain",
							activity: "Domain Registration (DynoPay)",
							status: "Successful",
						});
					} catch (activityError) {
						console.error(`Failed to log activity for ${domain.websiteName}:`, activityError);
					}

					// Payment record already created before processing - no need to create again
				}

				// Bulk add domains to user
				if (domainsCreated.length > 0) {
					await User.updateOne(
						{ _id: user._id },
						{ $push: { domains: { $each: domainsCreated } } }
					);
				}

				await Transaction.updateOne(
					{ reference },
					{
						$set: {
							status: "completed",
							method: payment_type,
							transactionId: lookupId || transaction_id,
							updatedAt: new Date(),
							from: "dynocash",
							domainIds: domainsCreated, // Array for multi-domain
						},
					}
				);

				// Mark promocode as used if domains were successfully purchased
				if (domainsCreated.length > 0 && meta_data.promoCode) {
					try {
						const { markPromoCodeAsUsed } = require("../promo/PromoController");
						await markPromoCodeAsUsed(userId, meta_data.promoCode, reference);
						console.log(`✅ Promocode ${meta_data.promoCode} marked as used for user ${userId}`);
					} catch (promoError) {
						console.error("Error marking promocode as used:", promoError);
						// Don't fail the request if promocode marking fails
					}
				}

				// console.log(`Domain registrations successful via DynoPay for user ${userId}: ${domainsCreated.length} domains`);


				// ✅ Deduct wallet amount only after successful domain registration
				if (meta_data.walletAmount && meta_data.walletAmount > 0) {
					const walletAmount = Number(meta_data.walletAmount);
					if (user.balance?.USD >= walletAmount) {
						user.balance.USD -= walletAmount;
						await user.save();

						await Transaction.create({
							userId,
							amount: walletAmount,
							currency: "USD",
							paymentType: "wallet",
							status: "completed",
							reference: `${reference}_wallet_partial`,
							description: "Partial wallet payment for domain purchase",
						});

						// console.log(` Deducted partial wallet amount: $${walletAmount} after domain registration success`);
					} else {
						console.warn(` Wallet balance insufficient to deduct partial $${walletAmount}`);
					}
				}


				// ✅ Deduct used reward points after successful domain registration
				if (meta_data.rewardPointsUsed && meta_data.rewardPointsUsed > 0) {
					const pointsToDeduct = Number(meta_data.rewardPointsUsed);

					if (user.rewardPoints >= pointsToDeduct) {
						user.rewardPoints -= pointsToDeduct;
						await user.save();

						await RewardPointLog.create({
							userId,
							rewardPoints: pointsToDeduct,
							operationType: "debit",
							description: "Used reward points for domain purchase",
						});

						// console.log(` Deducted ${pointsToDeduct} reward points after domain registration success`);
					} else {
						console.warn(` Insufficient reward points to deduct ${pointsToDeduct}`);
					}
				}



				try {
					const purchasedDomains = domainDataArray.map(d => d.websiteName);
					await Cart.deleteMany({
						userId: user._id,
						"domain.name": { $in: purchasedDomains },
					});
				} catch (err) {
					console.warn("Failed to remove purchased domains from cart:", err);
				}


				if (user?.membershipTier?.benefits?.earnRate) {
					const earnRate = user.membershipTier.benefits.earnRate;
					const rewardPoints = (domainPrice.price * earnRate).toFixed(2);
					await new RewardPointLog({
						userId: user._id,
						rewardPoints,
						operationType: "credit",
					}).save();
				}

				if (meta_data.isMixedCheckout && meta_data.hostingCartItemIds && Array.isArray(meta_data.hostingCartItemIds) && meta_data.hostingCartItemIds.length > 0) {
					try {
						console.log(`🔄 Mixed checkout detected: Processing ${meta_data.hostingCartItemIds.length} hosting item(s) after domain purchase`);
						
						// Import hosting controller
						const HostingPlansController = require("../../controllers/hosting/HostingPlansController");
						const hostingController = new HostingPlansController();
						
						// Process hosting orders automatically
						const { successfulOrders, failedOrders } = await hostingController.processHostingOrders(
							userId,
							meta_data.hostingCartItemIds,
							lookupId || transaction_id,
							`${reference}_hosting`,
							payment_type
						);
						
						console.log(`✅ Mixed checkout: Processed ${successfulOrders.length} hosting order(s) successfully`);
						if (failedOrders.length > 0) {
							console.warn(`⚠️ Mixed checkout: ${failedOrders.length} hosting order(s) failed:`, failedOrders);
						}
					} catch (hostingError) {
						console.error("❌ Failed to process hosting orders in mixed checkout:", hostingError);
					}
				}

				console.log("[Payment] flow=domain_purchase | PAYMENT_CAPTURED | domains registered:", domainsCreated.length);
				const overpaymentUsd = source.overpayment?.amount_usd != null ? Number(source.overpayment.amount_usd) : 0;
				if (overpaymentUsd > 0) {
					await creditOverpaymentToWallet({
						userId,
						amountUsd: overpaymentUsd,
						paymentRef: lookupId || transaction_id,
						transactionReference: source.transaction_reference,
						sourceLabel: "domain_purchase",
					});
				}
				markProcessed(webhookId);
				return res.status(200).json({ success: true, message: "Payment processed" });
			} catch (domainOrderError) {
				// console.error("Error processing domain order after payment:", domainOrderError);

				// If domain registration fails and payment was crypto/wallet, process refund
				if (isCryptoOrWallet && initialPaymentRecords.length > 0) {
					try {
						for (const paymentRecord of initialPaymentRecords) {
							await processAutomaticRefund({
								userId: userId,
								originalPaymentId: paymentRecord.paymentId,
								originalPayment: paymentRecord,
								amount: paymentRecord.amount,
								currency: paymentRecord.currency,
								reason: domainOrderError.message || "Domain registration failed",
								service: paymentRecord.service,
								title: paymentRecord.title,
								metadata: {
									...paymentRecord.metadata,
									error: domainOrderError.message,
								},
							});
						}
						console.log("[DomainController] Automatic refund processed for failed domain registration");
					} catch (refundError) {
						console.error("[DomainController] Failed to process automatic refund:", refundError);
					}
				}

				// Update transaction status to completed but mark domain order as failed
				await Transaction.updateOne(
					{ reference },
					{
						$set: {
							status: "completed",
							method: payment_type,
							transactionId: lookupId || transaction_id,
							updatedAt: new Date(),
							from: "dynocash",
							notes: `Payment received but domain order failed: ${domainOrderError.message}`,
						},
					}
				);

				console.log("[Payment] flow=domain_purchase | domain order failed after payment");
				markProcessed(webhookId);
				return res.status(200).json({ success: false, message: "Payment received but domain order failed." });
			}

		} catch (error) {
			const errMsg = error?.response?.data?.message ?? error?.data?.message ?? error?.message ?? (typeof error === "string" ? error : "Unknown error");
			console.error("[Payment] flow=domain_purchase | error:", errMsg);

			// If processing fails completely and payment was crypto/wallet, process refund
			if (isCryptoOrWallet && initialPaymentRecords.length > 0) {
				try {
					for (const paymentRecord of initialPaymentRecords) {
						await processAutomaticRefund({
							userId: userId,
							originalPaymentId: paymentRecord.paymentId,
							originalPayment: paymentRecord,
							amount: paymentRecord.amount,
							currency: paymentRecord.currency,
							reason: errMsg || "Failed to process domain order",
							service: paymentRecord.service,
							title: paymentRecord.title,
							metadata: {
								...paymentRecord.metadata,
								error: errMsg,
							},
						});
					}
					console.log("[DomainController] Automatic refund processed after webhook processing error");
				} catch (refundError) {
					const refundErrMsg = refundError?.response?.data?.message ?? refundError?.data?.message ?? refundError?.message ?? (typeof refundError === "string" ? refundError : "Unknown error");
					console.error("[DomainController] Failed to process automatic refund:", refundErrMsg);
				}
			}

			return res.status(500).json({ success: false, message: errMsg || "Internal server error." });
		}
	}

	async handleDomainRenewDynoPaymentWebhook(req, res) {
		const webhookId = req.headers["x-dynopay-webhook-id"];
		if (webhookId && hasProcessed(webhookId)) {
			return res.status(200).send("OK");
		}
		const webhookSecret = process.env.DYNO_PAY_WEBHOOK_SECRET;
		const signature = req.headers["x-dynopay-signature"];
		if (webhookSecret && signature) {
			const payloadStr = typeof req.body === "object" && req.body !== null
				? JSON.stringify(req.body)
				: (typeof req.body === "string" ? req.body : JSON.stringify(req.query));
			if (!verifyDynoPaySignature(payloadStr, signature, webhookSecret)) {
				console.warn("[Payment] flow=domain_renewal | invalid signature");
				return res.status(401).send("Invalid signature");
			}
		}
		const source = { ...req.query, ...(req.body && typeof req.body === "object" ? req.body : {}) };
		const eventType = req.headers["x-dynopay-event"] || source.event;
		console.log("[Payment] flow=domain_renewal | webhook hit | method:", req.method, "event:", eventType);
		try {
			let { transaction_id, payment_id, status, base_amount, meta_data, payment_type } = source || {};

			if (typeof meta_data === "string") {
				try {
					meta_data = JSON.parse(meta_data);
				} catch (e) {
					console.error("[Payment] flow=domain_renewal | invalid meta_data parse:", e?.message);
					return res.status(400).json({ success: false, message: "Invalid payment data" });
				}
			}

			const {
				reference,
				userId,
				product,
				domainData = {},
				duration,
			} = meta_data || {};
			const webhookAmount = base_amount != null && base_amount !== "" ? Number(base_amount) : (meta_data?.amount != null ? Number(meta_data.amount) : undefined);
			const lookupId = transaction_id || payment_id;

			const domainName = domainData?.websiteName;

			console.log("[Payment] flow=domain_renewal | event:", eventType, "| payment_id:", payment_id, "| transaction_id:", transaction_id, "| status:", status, "| userId:", userId);

			if (!reference || !userId || !domainName || product !== "domain_renewal") {
				markProcessed(webhookId);
				return res.status(200).json({ success: false, message: "Invalid renewal checkout payload." });
			}

			const existingTransaction = await Transaction.findOne({
				reference,
				userId,
			});

			if (existingTransaction?.status === "completed") {
				markProcessed(webhookId);
				return res.status(200).json({ success: true, message: "Already processed" });
			}

			const user = await User.findById(userId).populate("membershipTier");
			if (!user) {
				console.error('❌ User not found for userId:', userId);
				markProcessed(webhookId);
				return res.status(200).json({ success: false, message: "User not found for renewal checkout." });
			}
			if (!user.walletToken) {
				console.warn('⚠️ Wallet token missing for user (continuing with query params):', userId);
			}

			console.log('Fetching transaction details from DynoPay for id:', lookupId);
			let transactionResponse;
			if (user.walletToken && lookupId) {
				try {
					transactionResponse = await fetchUserTransactionById(
						user.walletToken,
						lookupId
					);
				} catch (fetchError) {
					console.error('❌ Failed to fetch transaction details from DynoPay:', fetchError);
				}
			}

			const responseData = transactionResponse?.data || transactionResponse;
			let verifiedStatus = status;
			if (responseData && responseData.data) {
				console.log('✅ Transaction details received from DynoPay');
				verifiedStatus = responseData.data.status || status;
			} else {
				console.warn('⚠️ Transaction data not found from DynoPay, using query status');
			}

			const isPaymentSuccessful =
				eventType === "payment.confirmed" ||
				status === "processing" ||
				verifiedStatus === "successful" ||
				status === "successful";

			if (!isPaymentSuccessful) {
				console.warn("[Payment] flow=domain_renewal | PAYMENT_NOT_CAPTURED | reason=payment not successful");
				if (existingTransaction) {
					existingTransaction.status = "failed";
					existingTransaction.updatedAt = new Date();
					await existingTransaction.save();
				}
				markProcessed(webhookId);
				return res.status(200).json({ success: false, message: "Payment was not successful." });
			}

			console.log("[Payment] flow=domain_renewal | PAYMENT_CAPTURED | proceeding with domain renewal");

			const context = await resolveDomainProviderContext({
				domainName,
				domainNameId: domainData?.domainNameId,
				provider: domainData?.provider,
			});

			if (!context.websiteName) {
				markProcessed(webhookId);
				return res.status(200).json({ success: false, message: "Domain not found for renewal checkout." });
			}

			const renewDuration =
				Number.parseInt(domainData?.duration ?? duration, 10) || 1;
			const isWhoisProtection = normalizeBoolean(
				domainData?.isWhoisProtection,
				false
			);

			// Payment successful - create initial payment record before processing renewal
			const isCryptoOrWallet = payment_type === "crypto" || payment_type === "CRYPTO";
			let initialPaymentRecord = null;
			
			try {
				// Get renewal price and create payment record before processing
				const { getRenewalPriceWithMarkup } = require("../../utils/api");
				const priceProvider = domainData?.provider === "hostbay" ? "openprovider" : (domainData?.provider || "openprovider");
				const { renewalPrice } = await getRenewalPriceWithMarkup({
					websiteName: context.websiteName,
					duration: renewDuration,
					provider: priceProvider,
				});

				if (renewalPrice) {
					let paymentMethod = "credit_card";
					if (payment_type === "crypto" || payment_type === "CRYPTO") {
						paymentMethod = "crypto";
					}
					const amountToRecord = webhookAmount != null ? webhookAmount : (Number(meta_data?.amount) > 0 ? meta_data.amount : renewalPrice);

					initialPaymentRecord = await createPaymentRecord({
						userId: user._id,
						service: "Domain Renewal",
						title: context.websiteName,
						amount: amountToRecord,
						currency: "USD",
						paymentMethod: paymentMethod,
						status: "completed",
						transactionId: existingTransaction?._id,
						metadata: {
							domainName: context.websiteName,
							duration: renewDuration,
							provider: domainData?.provider || "openprovider",
							transactionId: lookupId || transaction_id,
							paymentId: payment_id,
							reference: reference,
							paymentType: payment_type || "dynocheckout",
							...(meta_data?.vatAmount != null && { vatAmount: meta_data.vatAmount }),
							...(meta_data?.baseAmount != null && { baseAmount: meta_data.baseAmount }),
						},
					});
				}
			} catch (paymentError) {
				console.error(`Failed to create initial payment record for domain renewal ${context.websiteName}:`, paymentError);
			}

			try {
				await this.processRenewalAfterDynoPayment({
					user,
					context,
					duration: renewDuration,
					isWhoisProtection,
				});

				await Transaction.updateOne(
					{ reference },
					{
						$set: {
							status: "completed",
							method: payment_type || "dynocheckout",
							transactionId: lookupId || transaction_id,
							updatedAt: new Date(),
							from: "dynocash_domain_renewal",
						},
					}
				);

				console.log("[Payment] flow=domain_renewal | PAYMENT_CAPTURED | renewal success");
				const overpaymentUsd = source.overpayment?.amount_usd != null ? Number(source.overpayment.amount_usd) : 0;
				if (overpaymentUsd > 0) {
					await creditOverpaymentToWallet({
						userId,
						amountUsd: overpaymentUsd,
						paymentRef: lookupId || transaction_id,
						transactionReference: source.transaction_reference,
						sourceLabel: "domain_renewal",
					});
				}
				markProcessed(webhookId);
				return res.status(200).json({ success: true, message: "Payment processed" });
			} catch (renewError) {
				await Transaction.updateOne(
					{ reference },
					{
						$set: {
							status: "failed",
							method: payment_type || "dynocheckout",
							transactionId: lookupId || transaction_id,
							updatedAt: new Date(),
							from: "dynocash_domain_renewal",
							notes: `Payment received but renewal failed: ${renewError.message}`,
						},
					}
				);

				// If renewal fails and payment was crypto/wallet, process automatic refund
				if (isCryptoOrWallet && initialPaymentRecord) {
					try {
						await processAutomaticRefund({
							userId: userId,
							originalPaymentId: initialPaymentRecord.paymentId,
							originalPayment: initialPaymentRecord,
							amount: initialPaymentRecord.amount,
							currency: initialPaymentRecord.currency,
							reason: renewError.message || "Domain renewal failed",
							service: "Domain Renewal",
							title: domainName,
							metadata: {
								domainName: domainName,
								duration: renewDuration,
								provider: domainData?.provider || "openprovider",
								transactionId: lookupId || transaction_id,
								paymentId: payment_id,
								reference: reference,
								paymentType: payment_type || "dynocheckout",
								errorMessage: renewError?.message || "Domain renewal failed",
							},
						});
						console.log("[DomainController] Automatic refund processed for failed domain renewal via webhook");
					} catch (refundError) {
						console.error("[DomainController] Failed to process automatic refund:", refundError);
					}
				} else {
					try {
						const priceProvider = domainData?.provider === "hostbay" ? "openprovider" : (domainData?.provider || "openprovider");
						const renewDuration = Number.parseInt(domainData?.duration ?? duration, 10) || 1;
						
						try {
							const { renewalPrice } = await getRenewalPriceWithMarkup({
								websiteName: domainName,
								duration: renewDuration,
								provider: priceProvider,
							});

							if (renewalPrice) {
								let paymentMethod = "credit_card";
								if (payment_type === "crypto" || payment_type === "CRYPTO") {
									paymentMethod = "crypto";
								}

								await createPaymentRecord({
									userId: userId,
									service: "Domain Renewal",
									title: domainName,
									amount: renewalPrice,
									currency: "USD",
									paymentMethod: paymentMethod,
									status: "failed",
								metadata: {
									domainName: domainName,
									duration: renewDuration,
									provider: domainData?.provider || "openprovider",
									transactionId: lookupId || transaction_id,
									paymentId: payment_id,
									reference: reference,
									paymentType: payment_type || "dynocheckout",
									errorMessage: renewError?.message || "Payment received but renewal failed",
									...(meta_data?.vatAmount != null && { vatAmount: meta_data.vatAmount }),
									...(meta_data?.baseAmount != null && { baseAmount: meta_data.baseAmount }),
									},
								});
							}
						} catch (priceError) {
							console.error(`Failed to get renewal price for failed payment record:`, priceError);
						}
					} catch (paymentError) {
						console.error(`Failed to create payment record for failed domain renewal:`, paymentError);
					}
				}

				markProcessed(webhookId);
				return res.status(200).json({ success: false, message: renewError?.message || "Failed to renew domain after payment." });
			}
		} catch (error) {
			const errMsg = error?.response?.data?.message ?? error?.data?.message ?? error?.message ?? (typeof error === "string" ? error : "Unknown error");
			console.error("[Payment] flow=domain_renewal | error:", errMsg);
			return res.status(500).json({ success: false, message: errMsg || "Internal server error." });
		}
	}

	async handleDomainPrivacyDynoPaymentWebhook(req, res) {
		const webhookId = req.headers["x-dynopay-webhook-id"];
		if (webhookId && hasProcessed(webhookId)) {
			return res.status(200).send("OK");
		}
		const webhookSecret = process.env.DYNO_PAY_WEBHOOK_SECRET;
		const signature = req.headers["x-dynopay-signature"];
		if (webhookSecret && signature) {
			const payloadStr = typeof req.body === "object" && req.body !== null
				? JSON.stringify(req.body)
				: (typeof req.body === "string" ? req.body : JSON.stringify(req.query));
			if (!verifyDynoPaySignature(payloadStr, signature, webhookSecret)) {
				console.warn("[Payment] flow=domain_privacy | invalid signature");
				return res.status(401).send("Invalid signature");
			}
		}
		const source = { ...req.query, ...(req.body && typeof req.body === "object" ? req.body : {}) };
		const eventType = req.headers["x-dynopay-event"] || source.event;
		console.log("[Payment] flow=domain_privacy | webhook hit | method:", req.method, "event:", eventType);
		try {
			let { transaction_id, payment_id, status, base_amount, meta_data, payment_type } = source;

			if (typeof meta_data === "string") {
				try {
					meta_data = JSON.parse(meta_data);
				} catch (e) {
					console.error("[Payment] flow=domain_privacy | invalid meta_data parse:", e?.message);
					return res.status(400).json({ success: false, message: "Invalid payment data" });
				}
			}

			const {
				reference,
				userId,
				amount,
				planId,
				planLabel,
				domainData = {},
			} = meta_data || {};
			const webhookAmount = base_amount != null && base_amount !== "" ? Number(base_amount) : (meta_data?.amount != null ? Number(meta_data.amount) : undefined);
			const lookupId = transaction_id || payment_id;

			const domainName = domainData?.websiteName;

			console.log("[Payment] flow=domain_privacy | event:", eventType, "| payment_id:", payment_id, "| transaction_id:", transaction_id, "| status:", status, "| userId:", userId, "| domain:", domainName);

			if (!reference || !userId || !domainName) {
				console.warn("[Payment] flow=domain_privacy | PAYMENT_NOT_CAPTURED | reason=invalid payload (missing reference/userId/domainName)");
				markProcessed(webhookId);
				return res.status(200).json({ success: false, message: "Invalid privacy checkout payload." });
			}

			const existingTransaction = await Transaction.findOne({
				reference,
				userId,
			});
			if (existingTransaction?.status === "completed") {
				console.log("[Payment] flow=domain_privacy | already processed");
				markProcessed(webhookId);
				return res.status(200).json({ success: true, message: "Already processed" });
			}

			const isPaymentSuccessful =
				eventType === "payment.confirmed" ||
				status === "processing" ||
				status === "successful";

			if (!isPaymentSuccessful) {
				console.warn("[Payment] flow=domain_privacy | PAYMENT_NOT_CAPTURED | reason=status not successful");
				if (existingTransaction) {
					existingTransaction.status = "failed";
					existingTransaction.updatedAt = new Date();
					await existingTransaction.save();
				}
				markProcessed(webhookId);
				return res.status(200).json({ success: false, message: "Payment was not successful." });
			}
			console.log("[Payment] flow=domain_privacy | PAYMENT_CAPTURED | proceeding with privacy enable");

			const user = await User.findById(userId);
			if (!user) {
				markProcessed(webhookId);
				return res.status(200).json({ success: false, message: "User not found for privacy checkout." });
			}

			const context = await resolveDomainProviderContext({
				domainName,
				domainNameId: domainData?.domainNameId,
				provider: domainData?.provider,
			});

			if (!context.websiteName) {
				markProcessed(webhookId);
				return res.status(200).json({ success: false, message: "Domain not found for privacy checkout." });
			}

			let response;
			let enableSuccess = false;

			try {
				if (context.provider === "hostbay") {
					response = await this.toggleHostbayPrivacy({
						context,
						shouldEnable: true,
						userId,
					});
					enableSuccess =
						response?.responseMsg?.statusCode === 200 ||
						response?.responseMsg?.statusCode === 0;
				} else {
					if (!context.domainNameId) {
						throw new BadRequestError(
							"Domain identifier missing for privacy enablement."
						);
					}
					response = await domainProviderApiClient.request(
						"ManageDomainPrivacyProtection",
						{
							domainNameId: context.domainNameId,
							iswhoisprotected: "true",
						},
						null,
						context.provider
					);
					enableSuccess =
						response?.responseMsg?.statusCode === 200 ||
						response?.responseMsg?.statusCode === 0;

					await this.logDomainPrivacyActivity({
						userId,
						domain: context.websiteName,
						success: enableSuccess,
						shouldEnable: true,
					});
				}
			} catch (toggleError) {
				console.error(
					"Failed to enable privacy after payment:",
					toggleError?.message || toggleError
				);
				enableSuccess = false;
			}

			if (existingTransaction) {
				existingTransaction.status = enableSuccess ? "completed" : "failed";
				existingTransaction.method = payment_type || "dynocheckout";
				existingTransaction.transactionId = lookupId || transaction_id || null;
				existingTransaction.updatedAt = new Date();
				existingTransaction.from = "dynocash";
				await existingTransaction.save();
			}

			if (!enableSuccess) {
				console.warn("[Payment] flow=domain_privacy | PAYMENT_CAPTURED but privacy enable failed");
				markProcessed(webhookId);
				return res.status(200).json({ success: false, message: "Payment received but privacy enable failed." });
			}

			console.log("[Payment] flow=domain_privacy | PAYMENT_CAPTURED");
			const displayAmount = webhookAmount != null ? webhookAmount : (amount || 0);
			const overpaymentUsd = source.overpayment?.amount_usd != null ? Number(source.overpayment.amount_usd) : 0;
			if (overpaymentUsd > 0) {
				await creditOverpaymentToWallet({
					userId,
					amountUsd: overpaymentUsd,
					paymentRef: lookupId || transaction_id,
					transactionReference: source.transaction_reference,
					sourceLabel: "domain_privacy",
				});
			}
			markProcessed(webhookId);
			return res.status(200).json({ success: true, message: `Payment processed. Charged $${Number(displayAmount).toFixed(2)}.` });
		} catch (error) {
			const errMsg = error?.response?.data?.message ?? error?.data?.message ?? error?.message ?? (typeof error === "string" ? error : "Unknown error");
			console.error("[Payment] flow=domain_privacy | error:", errMsg);
			return res.status(500).json({ success: false, message: errMsg || "Failed to process privacy payment." });
		}
	}

	async getDomainTransferDynocheckoutUrl(req, res) {
		try {
			const {
				domain,
				domainNameId,
				provider,
				duration = 1,
				authorizationCode,
			} = req.body || {};

			const userId = req.user.id;

			if (!domain) {
				return res.status(400).json({
					success: false,
					message: "Domain is required to initiate transfer checkout.",
				});
			}

			if (!authorizationCode) {
				return res.status(400).json({
					success: false,
					message: "Authorization code is required to initiate transfer checkout.",
				});
			}

			const user = await User.findById(userId);
			if (!user) {
				return res.status(404).json({
					success: false,
					message: "User not found.",
				});
			}

			const durationValue = Number.parseInt(duration, 10) || 1;
			const context = await resolveDomainProviderContext({
				domainName: domain,
				domainNameId,
				provider,
			});

			if (!context.websiteName) {
				return res.status(404).json({
					success: false,
					message: "Domain not found.",
				});
			}

			try {
				await ensureDynoWallet(user);
			} catch (walletErr) {
				console.warn("DynoPay wallet setup skipped (payment link will still work):", walletErr?.message || walletErr);
			}

			const priceProvider =
				context.provider === "hostbay" ? "openprovider" : context.provider;

			// Get transfer price using checkDomainPrice API
			const priceResponse = await domainProviderApiClient.request(
				"checkDomainPrice",
				{ websiteName: context.websiteName },
				null,
				priceProvider
			);

			if (!priceResponse || priceResponse?.responseMsg?.statusCode !== 200) {
				return res.status(400).json({
					success: false,
					message: "Unable to determine transfer amount.",
				});
			}

			const results = priceResponse?.responseData?.["0"] || [];
			let basePrice = 0;

			// Find the price for the requested duration
			const requestedYear = durationValue;
			const matchingYear = results.find((r) => {
				const match = r.description?.match(/for\s+(\d+)\s+year/i);
				return match && parseInt(match[1]) === requestedYear;
			});

			if (matchingYear) {
				const match = matchingYear.description.match(/is\s+([\d.]+)/i);
				if (match) basePrice = parseFloat(match[1]);
			} else {
				// Fallback: try to find first year and multiply
				const firstYear = results.find((r) => r.description?.includes("1 year"));
				if (firstYear) {
					const match = firstYear.description.match(/is\s+([\d.]+)/i);
					if (match) {
						const yearlyPrice = parseFloat(match[1]);
						basePrice = yearlyPrice * requestedYear;
					}
				}
			}

			// Apply transfer markup
			const baseAmount = basePrice ? basePrice + (basePrice * DEFAULT_RENEWAL_MARKUP_PERCENT) / 100 : 0;
			if (!baseAmount || baseAmount <= 0) {
				return res.status(400).json({
					success: false,
					message: "Unable to determine transfer amount.",
				});
			}

			const vatAmount = Number((baseAmount * VAT_RATE).toFixed(2));
			const amount = Number((baseAmount + vatAmount).toFixed(2));

			const reference = `domain_transfer_dynocheckout_${Date.now()}`;
			const frontendRedirectUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/domains`;
			const webhookUrl = `${process.env.APP_URL}/api/v1/domain/transfer/dynocheckout-webhook`;

			const meta_data = {
				userId,
				reference,
				product: "domain_transfer",
				amount,
				baseAmount,
				vatAmount,
				duration: durationValue,
				domainData: {
					websiteName: context.websiteName,
					domainNameId: context.domainNameId || null,
					provider: context.provider,
					duration: durationValue,
					authorizationCode: authorizationCode,
				},
			};

			const transferDescription = `Domain transfer - ${context.websiteName}`;
			let dynoResponse;
			try {
				dynoResponse = await generatePaymentLink(
					amount,
					frontendRedirectUrl,
					meta_data,
					user,
					transferDescription,
					webhookUrl
				);
			} catch (err) {
				if (err?.message?.includes("Authentication Expired")) {
					await ensureDynoWallet(user);
					dynoResponse = await generatePaymentLink(
						amount,
						frontendRedirectUrl,
						meta_data,
						user,
						transferDescription,
						webhookUrl
					);
				} else {
					throw err;
				}
			}

			// Prefer payment_link (DynoPay checkout page); redirect_url in response is often our post-payment URL (/domains)
			const redirectUrl =
				dynoResponse?.data?.data?.payment_link ||
				dynoResponse?.data?.data?.redirect_url ||
				dynoResponse?.data?.redirect_url ||
				null;

			if (!redirectUrl) {
				return res.status(500).json({
					success: false,
					message: "Failed to generate DynoPay redirect URL.",
				});
			}

			return res.status(200).json({
				success: true,
				message: "DynoPay redirect URL generated successfully.",
				redirect_url: redirectUrl,
				amount,
				vatAmount,
				baseAmount,
			});
		} catch (error) {
			console.error(
				"Error in getDomainTransferDynocheckoutUrl:",
				error?.data || error?.response?.data || error
			);
			return res.status(error?.statusCode || 500).json({
				success: false,
				message: "Failed to generate transfer checkout URL.",
				error:
					typeof error === "string"
						? error
						: error?.message ||
						  error?.data?.message ||
						  error?.response?.data?.message ||
						  "Unknown DynoPay error",
			});
		}
	}

	async handleDomainTransferDynoPaymentWebhook(req, res) {
		const webhookId = req.headers["x-dynopay-webhook-id"];
		if (webhookId && hasProcessed(webhookId)) {
			return res.status(200).send("OK");
		}
		const webhookSecret = process.env.DYNO_PAY_WEBHOOK_SECRET;
		const signature = req.headers["x-dynopay-signature"];
		if (webhookSecret && signature) {
			const payloadStr = typeof req.body === "object" && req.body !== null
				? JSON.stringify(req.body)
				: (typeof req.body === "string" ? req.body : JSON.stringify(req.query));
			if (!verifyDynoPaySignature(payloadStr, signature, webhookSecret)) {
				console.warn("[Payment] flow=domain_transfer | invalid signature");
				return res.status(401).send("Invalid signature");
			}
		}
		const source = { ...req.query, ...(req.body && typeof req.body === "object" ? req.body : {}) };
		const eventType = req.headers["x-dynopay-event"] || source.event;
		console.log("[Payment] flow=domain_transfer | webhook hit | method:", req.method, "event:", eventType);
		try {
			let { transaction_id, payment_id, status, base_amount, meta_data, payment_type } = source || {};

			if (typeof meta_data === "string") {
				try {
					meta_data = JSON.parse(meta_data);
				} catch (e) {
					console.error("[Payment] flow=domain_transfer | invalid meta_data parse:", e?.message);
					return res.status(400).json({ success: false, message: "Invalid payment data" });
				}
			}

			const {
				reference,
				userId,
				product,
				domainData = {},
				duration,
			} = meta_data || {};
			const webhookAmount = base_amount != null && base_amount !== "" ? Number(base_amount) : (meta_data?.amount != null ? Number(meta_data.amount) : undefined);
			const lookupId = transaction_id || payment_id;

			const domainName = domainData?.websiteName;

			console.log("[Payment] flow=domain_transfer | event:", eventType, "| payment_id:", payment_id, "| transaction_id:", transaction_id, "| status:", status, "| userId:", userId, "| domain:", domainName);

			if (!reference || !userId || !domainName || product !== "domain_transfer") {
				console.warn("[Payment] flow=domain_transfer | PAYMENT_NOT_CAPTURED | reason=invalid payload");
				markProcessed(webhookId);
				return res.status(200).json({ success: false, message: "Invalid transfer checkout payload." });
			}

			const existingTransaction = await Transaction.findOne({
				reference,
				userId,
			});

			if (existingTransaction?.status === "completed") {
				console.log("[Payment] flow=domain_transfer | already processed");
				markProcessed(webhookId);
				return res.status(200).json({ success: true, message: "Already processed" });
			}

			const isPaymentSuccessful =
				eventType === "payment.confirmed" ||
				status === "processing" ||
				status === "successful";

			if (!isPaymentSuccessful) {
				console.warn("[Payment] flow=domain_transfer | PAYMENT_NOT_CAPTURED | reason=status not successful");
				if (existingTransaction) {
					existingTransaction.status = "failed";
					existingTransaction.updatedAt = new Date();
					await existingTransaction.save();
				}
				markProcessed(webhookId);
				return res.status(200).json({ success: false, message: "Payment was not successful." });
			}
			console.log("[Payment] flow=domain_transfer | PAYMENT_CAPTURED | proceeding with transfer");

			const user = await User.findById(userId).populate(
				"membershipTier"
			);
			if (!user) {
				markProcessed(webhookId);
				return res.status(200).json({ success: false, message: "User not found for transfer checkout." });
			}

			const context = await resolveDomainProviderContext({
				domainName,
				domainNameId: domainData?.domainNameId,
				provider: domainData?.provider,
			});

			if (!context.websiteName) {
				markProcessed(webhookId);
				return res.status(200).json({ success: false, message: "Domain not found for transfer checkout." });
			}

			const transferDuration =
				Number.parseInt(domainData?.duration ?? duration, 10) || 1;
			const authorizationCode = domainData?.authorizationCode;

			if (!authorizationCode) {
				markProcessed(webhookId);
				return res.status(200).json({ success: false, message: "Authorization code is missing." });
			}

			try {
				// Call transfer API
				let transferResponse;
				if (context.provider === "hostbay") {
					transferResponse = await domainProviderApiClient.request(
						"TransferOrder",
						{
							domain_name: context.websiteName.toLowerCase(),
							auth_code: authorizationCode,
							period: transferDuration,
							auto_renew: false,
						},
						"POST",
						"hostbay"
					);
				} else {
					// For OpenProvider/ConnectReseller transfers
					// For external domains (not in user's account), domainNameId may be null
					// The transfer should still work with just domain name and auth code
					transferResponse = await apiClient.request("TransferOrder", {
						OrderType: 2, // 2 = transfer
						Websitename: context.websiteName,
						IsWhoisProtection: false,
						AuthCode: authorizationCode,
						Id: context.domainNameId || null, // Allow null for external domains
					});
				}

				const success =
					transferResponse?.responseMsg?.statusCode === 200 ||
					transferResponse?.responseMsg?.statusCode === 0 ||
					transferResponse?.success === true;

				if (!success) {
					const message =
						transferResponse?.responseMsg?.message ||
						transferResponse?.message ||
						"Domain transfer failed";
					throw new BadRequestError(message);
				}

				// Update domain document if exists
				let domainDoc = context.domainDoc;
				if (!domainDoc && context.websiteName) {
					domainDoc =
						(await Domain.findOne({
							websiteName: context.websiteName.toLowerCase(),
							deletedAt: { $eq: null }
						})) ||
					(await Domain.findOne({ websiteName: context.websiteName, deletedAt: { $eq: null } }));
				}

				if (domainDoc) {
					// Extract transfer information from response
					const transferId = 
						transferResponse?.responseData?.orderId ||
						transferResponse?.responseData?.transfer_id ||
						transferResponse?.responseData?.id ||
						transferResponse?.data?.order_id ||
						transferResponse?.data?.transfer_id ||
						null;

					const transferStatusFromAPI = 
						transferResponse?.responseData?.status ||
						transferResponse?.responseData?.transfer_status ||
						transferResponse?.data?.status ||
						"Pending";

					// Map API status to our status enum
					let mappedTransferStatus = "Pending";
					if (transferStatusFromAPI?.toLowerCase().includes("accept") || 
						transferStatusFromAPI?.toLowerCase() === "accepted") {
						mappedTransferStatus = "Accepted";
					} else if (transferStatusFromAPI?.toLowerCase().includes("complete") || 
						transferStatusFromAPI?.toLowerCase() === "completed") {
						mappedTransferStatus = "Completed";
					} else if (transferStatusFromAPI?.toLowerCase().includes("fail") || 
						transferStatusFromAPI?.toLowerCase() === "failed") {
						mappedTransferStatus = "Failed";
					}

					// Update domain with comprehensive transfer info
					// Keep original status - don't alter it, only update transferInfo
					domainDoc.duration = transferDuration;
					
					// Store detailed transfer information
					domainDoc.transferInfo = {
						transferId: transferId,
						transferStatus: mappedTransferStatus,
						initiatedAt: new Date(),
						acceptedAt: mappedTransferStatus === "Accepted" || mappedTransferStatus === "Completed" ? new Date() : null,
						completedAt: mappedTransferStatus === "Completed" ? new Date() : null,
						authorizationCode: authorizationCode, // Store for reference
						transferDuration: transferDuration,
						provider: transferProvider,
					};

					// If expiration date is updated in transfer response, update it
					const newExpirationDate = 
						transferResponse?.responseData?.expirationDate ||
						transferResponse?.responseData?.expiration_date ||
						transferResponse?.responseData?.expiryDate ||
						transferResponse?.data?.expiration_date ||
						null;

					if (newExpirationDate) {
						domainDoc.expirationDate = new Date(newExpirationDate);
					} else if (domainDoc.expirationDate) {
						// Calculate new expiration based on transfer duration
						const currentExpiration = new Date(domainDoc.expirationDate);
						currentExpiration.setFullYear(currentExpiration.getFullYear() + transferDuration);
						domainDoc.expirationDate = currentExpiration;
					}

					await domainDoc.save();
					console.log("Domain transfer information saved:", {
						domain: context.websiteName,
						transferId,
						status: mappedTransferStatus,
						domainStatus: domainDoc.status
					});
				} else {
					// If domain doesn't exist, create a new domain entry for the transfer
					// This should not happen for transfers since domain should already exist
					console.warn("Domain document not found for transfer:", context.websiteName);
				}

				// Log activity
				try {
					await saveActivity({
						userId: user._id,
						domain: context.websiteName,
						activityType: "domain",
						activity: "Domain Transfer (DynoPay)",
						status: "Successful",
					});
				} catch (activityError) {
					console.error(
						"Failed to log domain transfer activity:",
						activityError
					);
				}

				await Transaction.updateOne(
					{ reference },
					{
						$set: {
							status: "completed",
							method: payment_type || "dynocheckout",
							transactionId: lookupId || transaction_id,
							updatedAt: new Date(),
							from: "dynocash_domain_transfer",
						},
					}
				);

				console.log("[Payment] flow=domain_transfer | PAYMENT_CAPTURED | transfer success");
				const overpaymentUsd = source.overpayment?.amount_usd != null ? Number(source.overpayment.amount_usd) : 0;
				if (overpaymentUsd > 0) {
					await creditOverpaymentToWallet({
						userId,
						amountUsd: overpaymentUsd,
						paymentRef: lookupId || transaction_id,
						transactionReference: source.transaction_reference,
						sourceLabel: "domain_transfer",
					});
				}
				markProcessed(webhookId);
				return res.status(200).json({ success: true, message: "Payment processed" });
			} catch (transferError) {
				// Update domain document with failed transfer status
				try {
					let domainDoc = context.domainDoc;
					if (!domainDoc && context.websiteName) {
						domainDoc =
							(await Domain.findOne({
								websiteName: context.websiteName.toLowerCase(),
								deletedAt: { $eq: null }
							})) ||
						(await Domain.findOne({ websiteName: context.websiteName, deletedAt: { $eq: null } }));
					}

					if (domainDoc) {
						// Keep original status - don't alter it, only update transferInfo
						if (!domainDoc.transferInfo) {
							domainDoc.transferInfo = {};
						}
						domainDoc.transferInfo.transferStatus = "Failed";
						domainDoc.transferInfo.initiatedAt = new Date();
						domainDoc.transferInfo.authorizationCode = authorizationCode;
						domainDoc.transferInfo.transferDuration = transferDuration;
						domainDoc.transferInfo.provider = transferProvider;
						await domainDoc.save();
					}
				} catch (updateError) {
					console.error("Failed to update domain with transfer failure:", updateError);
				}

				await Transaction.updateOne(
					{ reference },
					{
						$set: {
							status: "completed",
							method: payment_type || "dynocheckout",
							transactionId: lookupId || transaction_id,
							updatedAt: new Date(),
							from: "dynocash_domain_transfer",
							notes: `Payment received but transfer failed: ${transferError.message}`,
						},
					}
				);

				console.warn("[Payment] flow=domain_transfer | PAYMENT_CAPTURED but transfer failed:", transferError?.message);
				markProcessed(webhookId);
				return res.status(200).json({ success: false, message: transferError?.message || "Failed to transfer domain after payment." });
			}
		} catch (error) {
			const errMsg = error?.response?.data?.message ?? error?.data?.message ?? error?.message ?? (typeof error === "string" ? error : "Unknown error");
			console.error("[Payment] flow=domain_transfer | error:", errMsg);
			return res.status(500).json({ success: false, message: errMsg || "Internal server error." });
		}
	}

	async bulkManageAutoRenewal(req, res) {
		const payload = { ...req.query, ...req.body };
		const { domains: domainNames, autorenew, reason, description } = payload;

		if (!Array.isArray(domainNames) || domainNames.length === 0) {
			return res.status(400).json({
				message: "domains array is required and must not be empty",
			});
		}

		if (typeof autorenew === "undefined") {
			return res.status(400).json({
				message: "autorenew (true/false) is required",
			});
		}

		const shouldEnable = normalizeBoolean(autorenew);
		const results = [];
		const errors = [];

		try {
			for (const domainName of domainNames) {
				try {
					const context = await resolveDomainProviderContext({
						domainName,
						provider: payload.provider,
					});

					if (!context.websiteName) {
						errors.push({
							domain: domainName,
							error: "Domain not found",
						});
						continue;
					}

					let domainDoc = context.domainDoc;
					if (!domainDoc) {
						domainDoc =
							(await Domain.findOne({
								websiteName: context.websiteName,
								deletedAt: { $eq: null }
							})) ||
							(await Domain.findOne({
								websiteName: context.websiteName.toLowerCase(),
								deletedAt: { $eq: null }
							}));
					}

					if (!domainDoc) {
						errors.push({
							domain: context.websiteName,
							error: "Domain not found in database",
						});
						continue;
					}

					// Update autorenew in database
					domainDoc.autorenew = shouldEnable;
					// Save reason and description when disabling auto-renewal
					if (shouldEnable === false && reason) {
						domainDoc.autoRenewalTurnOffReason = reason;
						domainDoc.autoRenewalTurnOffDescription = description || null;
					} else if (shouldEnable === true) {
						// Clear reason when enabling auto-renewal
						domainDoc.autoRenewalTurnOffReason = null;
						domainDoc.autoRenewalTurnOffDescription = null;
					}
					await domainDoc.save();

					// Log activity
					if (req.user?.id) {
						const actionLabel = shouldEnable ? "Enabled" : "Disabled";
						await saveActivity({
							userId: req.user.id,
							domain: domainDoc.websiteName,
							activityType: "domain",
							activity: `Auto-renewal ${actionLabel}`,
							status: "Successful",
						});
					}

					results.push({
						domain: context.websiteName,
						success: true,
						autorenew: shouldEnable,
					});
				} catch (domainError) {
					errors.push({
						domain: domainName,
						error: domainError.message || "Failed to update domain",
					});
				}
			}

			return res.status(200).json({
				success: true,
				message: `Auto-renewal ${shouldEnable ? "enabled" : "disabled"} for ${results.length} domain(s)`,
				data: {
					successful: results,
					failed: errors,
					total: domainNames.length,
					successCount: results.length,
					failureCount: errors.length,
				},
			});
		} catch (error) {
			console.error("Error in bulk auto-renewal management:", error);
			return res.status(500).json({
				message: error.message || "Error managing bulk auto-renewal",
				success: false,
			});
		}
	}

	async bulkManageDomainLock(req, res) {
		const payload = { ...req.query, ...req.body };
		const { domains: domainNames, isDomainLocked } = payload;

		if (!Array.isArray(domainNames) || domainNames.length === 0) {
			return res.status(400).json({
				message: "domains array is required and must not be empty",
			});
		}

		if (typeof isDomainLocked === "undefined") {
			return res.status(400).json({
				message: "isDomainLocked (true/false) is required",
			});
		}

		const shouldLock = normalizeBoolean(isDomainLocked);
		const results = [];
		const errors = [];

		try {
			for (const domainName of domainNames) {
				try {
					const context = await resolveDomainProviderContext({
						domainName,
						provider: payload.provider,
					});

					if (!context.websiteName) {
						errors.push({
							domain: domainName,
							error: "Domain not found",
						});
						continue;
					}

					if (context.provider !== "hostbay" && !context.domainNameId) {
						errors.push({
							domain: context.websiteName,
							error: "domainNameId is required for this provider",
						});
						continue;
					}

					const requestParams =
						context.provider === "hostbay"
							? {
									websiteName: context.websiteName,
									isDomainLocked: shouldLock ? "true" : "false",
							  }
							: {
									domainNameId: context.domainNameId,
									websiteName: context.websiteName,
									isDomainLocked: shouldLock ? "true" : "false",
							  };

					const response = await domainProviderApiClient.request(
						"ManageDomainLock",
						requestParams,
						null,
						context.provider
					);

					if (response?.responseMsg?.statusCode === 200) {
						const resolvedLockState = resolveLockStateFromResponse(
							response,
							shouldLock
						);

						const finalLockState =
							typeof resolvedLockState === "boolean"
								? resolvedLockState
								: shouldLock;

						// Update lock status in database
						let domainDoc = context.domainDoc;
						if (!domainDoc) {
							domainDoc =
								(await Domain.findOne({
									websiteName: context.websiteName,
									deletedAt: { $eq: null }
								})) ||
								(await Domain.findOne({
									websiteName: context.websiteName.toLowerCase(),
									deletedAt: { $eq: null }
								}));
						}

						if (domainDoc) {
							domainDoc.lockStatus = {
								isLocked: finalLockState,
								provider: context.provider,
								updatedAt: new Date(),
							};
							domainDoc.markModified("lockStatus");
							await domainDoc.save();

							// Log activity
							if (req.user?.id) {
								const lockLabel = finalLockState ? "Locked" : "Unlocked";
								await saveActivity({
									userId: req.user.id,
									domain: domainDoc.websiteName,
									activityType: "domain",
									activity: `Domain ${lockLabel}`,
									status: "Successful",
								});
							}
						}

						results.push({
							domain: context.websiteName,
							success: true,
							isLocked: finalLockState,
						});
					} else {
						errors.push({
							domain: context.websiteName,
							error: response?.responseMsg?.message || "Failed to update domain lock",
						});
					}
				} catch (domainError) {
					errors.push({
						domain: domainName,
						error: domainError.message || "Failed to update domain",
					});
				}
			}

			return res.status(200).json({
				success: true,
				message: `Domain lock ${shouldLock ? "enabled" : "disabled"} for ${results.length} domain(s)`,
				data: {
					successful: results,
					failed: errors,
					total: domainNames.length,
					successCount: results.length,
					failureCount: errors.length,
				},
			});
		} catch (error) {
			console.error("Error in bulk domain lock management:", error);
			return res.status(500).json({
				message: error.message || "Error managing bulk domain lock",
				success: false,
			});
		}
	}

	async bulkModifyNameserver(req, res) {
		const payload = { ...req.query, ...req.body };
		const { 
			domains: domainNames, 
			nameServer1,
			nameServer2,
			nameServer3,
			nameServer4,
			useNameWordNameservers 
		} = payload;

		if (!Array.isArray(domainNames) || domainNames.length === 0) {
			return res.status(400).json({
				message: "domains array is required and must not be empty",
			});
		}

	
		if (!useNameWordNameservers) {
			if (!nameServer1 || !nameServer2) {
				return res.status(400).json({
					message: "nameServer1 and nameServer2 are required when not using NameWord nameservers",
				});
			}
		}

		const results = [];
		const errors = [];

		try {
			for (const domainName of domainNames) {
				try {
					const context = await resolveDomainProviderContext({
						domainName,
						provider: payload.provider,
					});

					if (!context.websiteName) {
						errors.push({
							domain: domainName,
							error: "Domain not found",
						});
						continue;
					}

					if (context.provider !== "hostbay" && !context.domainNameId) {
						errors.push({
							domain: context.websiteName,
							error: "domainNameId is required for this provider",
						});
						continue;
					}

					
					let nameserversToUse;
					
					// Get domain document for Cloudflare zone check
					const domainDoc = context.domainDoc || await Domain.findOne({ 
						websiteName: context.websiteName ,
						deletedAt: { $eq: null }
					});

					
					if (useNameWordNameservers === "true" || useNameWordNameservers === true) {
						if (!domainDoc?.cloudflare?.zoneId) {
							errors.push({
								domain: context.websiteName,
								error: "Domain does not have a Cloudflare zone. Cannot use NameWord nameservers.",
							});
							continue;
						}

						try {
							const cloudflareZone = await cloudflare.zones.get({
								zone_id: domainDoc.cloudflare.zoneId,
							});

							const cloudflareNameservers = cloudflareZone?.name_servers || [];
							if (cloudflareNameservers.length < 2) {
								errors.push({
									domain: context.websiteName,
									error: "Cloudflare zone does not have sufficient nameservers.",
								});
								continue;
							}

							nameserversToUse = {
								nameServer1: cloudflareNameservers[0] || null,
								nameServer2: cloudflareNameservers[1] || null,
								nameServer3: cloudflareNameservers[2] || null,
								nameServer4: cloudflareNameservers[3] || null,
							};
						} catch (cloudflareError) {
							console.error("Error fetching Cloudflare zone:", cloudflareError);
							errors.push({
								domain: context.websiteName,
								error: "Failed to fetch Cloudflare nameservers: " + cloudflareError.message,
							});
							continue;
						}
					} 
					
					else {
						nameserversToUse = {
							nameServer1: nameServer1?.trim() || null,
							nameServer2: nameServer2?.trim() || null,
							nameServer3: nameServer3?.trim() || null,
							nameServer4: nameServer4?.trim() || null,
						};
					}

					
					const nameservers = [
						nameserversToUse.nameServer1,
						nameserversToUse.nameServer2,
						nameserversToUse.nameServer3,
						nameserversToUse.nameServer4
					].filter(Boolean);
					
					if (nameservers.length === 0) {
						errors.push({
							domain: context.websiteName,
							error: "At least one nameserver is required",
						});
						continue;
					}

					const requestParams = {
						websiteName: context.websiteName,
						nameServer1: nameserversToUse.nameServer1 || null,
						nameServer2: nameserversToUse.nameServer2 || null,
						nameServer3: nameserversToUse.nameServer3 || null,
						nameServer4: nameserversToUse.nameServer4 || null,
					};

					// Add domainNameId for non-HostBay providers
					if (context.provider !== "hostbay" && context.domainNameId) {
						requestParams.domainNameId = context.domainNameId;
					}

					const response = await domainProviderApiClient.request(
						"UpdateNameServer",
						requestParams,
						context.provider === "hostbay" ? "PUT" : null,
						context.provider
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


					try {
						const domainDoc = context.domainDoc || await Domain.findOne({ 
							websiteName: context.websiteName ,
							deletedAt: { $eq: null }
						});
						if (domainDoc && req.user?.id) {
							await saveActivity({
								userId: req.user.id,
								domain: domainDoc.websiteName,
								activityType: "dns", 
								activity: `Updated nameservers for ${domainDoc.websiteName}`, 
								status: isError ? "Rejected" : "Successful", 
							});
						}
					} catch (activityError) {
						console.error(
							"Failed to log nameserver modification activity:",
							activityError
						);
					}

					if (!isError) {
						results.push({
							domain: context.websiteName,
							success: true,
						});
					} else {
						// Use extracted error message (same as single domain)
						if (errorMessage && errorMessage !== response?.responseMsg?.message) {
							errorMessage = errorMessage;
						}
						errors.push({
							domain: context.websiteName,
							error: errorMessage || "Failed to update nameservers",
						});
					}
				} catch (domainError) {
					errors.push({
						domain: domainName,
						error: domainError.message || "Failed to update domain",
					});
				}
			}

			return res.status(200).json({
				success: true,
				message: `Nameservers updated for ${results.length} domain(s)`,
				data: {
					successful: results,
					failed: errors,
					total: domainNames.length,
					successCount: results.length,
					failureCount: errors.length,
				},
			});
		} catch (error) {
			console.error("Error in bulk nameserver modification:", error);
			return res.status(500).json({
				message: error.message || "Error managing bulk nameserver modification",
				success: false,
			});
		}
	}

}

module.exports = new DomainController();
