// Import required modules and configurations
const createAxiosInstance = require("./Domain/axiosInstance");
const provider_config = require("./Domain/config");
const {
	getOpenproviderToken,
} = require("./Domain/providers/openprovider/auth");
const openproviderMappings = require("./Domain/providers/openprovider/mappings");
const connectresellerMappings = require("./Domain/providers/connectreseller/mapping");
const hostbayMappings = require("./Domain/providers/hostbay/mapping");

const normalizeResponse = require("./Domain/providers/normalize");
const ServiceUnavailableError = require("./Domain/ServiceUnavailableError");
const {
	extractTLD,
	getTLDCategory,
	splitDomain,
} = require("./Domain/providers/tldConfig");

// Mapping object for different provider endpoints
const ENDPOINT_MAPPING = {
	openprovider: openproviderMappings,
	connectreseller: connectresellerMappings,
	hostbay: hostbayMappings,
};

// Create axios instance for making HTTP requests
const axiosInstance = createAxiosInstance();

// Helper function to resolve path configuration
const resolvePath = (pathConfig, params) => {
	if (typeof pathConfig === "function") {
		return pathConfig(params);
	}
	return pathConfig;
};

// Main function to make API requests to domain providers
const makeRequest = async (provider, type, params, method) => {
	// Validate provider exists in mapping
	if (!provider || !ENDPOINT_MAPPING[provider]) {
		throw new Error(`Invalid provider: ${provider}. Supported providers: ${Object.keys(ENDPOINT_MAPPING).join(", ")}`);
	}
	
	// Validate type exists in provider mapping
	if (!ENDPOINT_MAPPING[provider][type]) {
		throw new Error(`Invalid operation type '${type}' for provider '${provider}'. Available operations: ${Object.keys(ENDPOINT_MAPPING[provider]).join(", ")}`);
	}
	
	const config = ENDPOINT_MAPPING[provider][type];
	// Set the appropriate API URL based on the provider
	const url =
		provider === "openprovider"
			? provider_config.openprovider.apiUrl
			: provider === "connectreseller"
				? provider_config.connectreseller.apiUrl
				: provider_config.hostbay.apiUrl;
	// Set appropriate headers based on the provider
	const headers =
		provider === "openprovider"
			? { Authorization: `Bearer ${await getOpenproviderToken()}` }
			: provider === "hostbay"
			? {
				"Content-Type": "application/json",
				"Authorization": provider_config.hostbay.apiKey, // Already includes "Bearer " prefix
			}
		: {
			"Content-Type": "application/json",
				"Authorization": `Bearer ${provider_config.hostbay.apiKey}`,
		};

	// Check if Openprovider token is available
	if (provider === "openprovider" && !headers.Authorization) {
		throw new Error("Openprovider token unavailable");
	}

	try {
		if (provider === "openprovider" && config.steps) {
			// Handle multiple API calls for Openprovider
			const responses = await Promise.all(
				config.steps.map((step) => {
					const resolvedPath = resolvePath(step.path, params);
					return axiosInstance({
						method: step.method,
						url: `${url}${resolvedPath}`,
						headers,
						[step.method === "GET" ? "params" : "data"]:
							step.params(params),
					});
				})
			);

			// Check if all responses are successful
			const allSuccessful = responses.every((res) => res.data.code === 0);
			if (!allSuccessful) {
				throw new Error("One or more Openprovider API calls failed");
			}

			// Combine responses from multiple API calls
			const combinedData = await config.combine(
				responses.map((res) => res.data)
			);
			const message =
				(await config?.message(responses.map((res) => res.data))) || "";
			config?.message(responses.map((res) => res.data)) || "";

			return await normalizeResponse(
				provider,
				params,
				{ code: 0, data: { combined: combinedData }, message },
				type
			);
		} else {
			// Handle single API call
			const resolvedPath = resolvePath(config.path, params);
			const requestParams = config.params
				? config.params(params)
				: params;

			if (provider === "hostbay") {
				console.log("HostBay request params before sending:", requestParams);
			}
			
			console.log(
				"Resolved Path:",
				url,
				resolvedPath,
				requestParams,
				provider_config.connectreseller.apiKey
			);
			// const response = await axiosInstance({
			// 	method: config.method,
			// 	url: `${url}${resolvedPath}`,
			// 	headers,
			// 	[config.method === "GET" ? "params" : "data"]: {
			// 		...(provider === "connectreseller"
			// 			? { APIKey: provider_config.connectreseller.apiKey }
			// 			: {}),
			// 		...requestParams,
			// 	},
			// });
			// Clean URL construction - remove trailing slashes from base URL and leading slashes from path
			const baseUrl = url.replace(/\/+$/, "");
			const cleanPath = resolvedPath.toString().trim().replace(/^\/+/, "");
			const cleanUrl = cleanPath ? `${baseUrl}/${cleanPath}` : baseUrl;

			if (provider === "hostbay") {
				console.log("HostBay API Request:", {
					method: config.method,
					url: cleanUrl,
					headers: { ...headers, Authorization: headers.Authorization ? "Bearer ***" : "Not set" },
					params: requestParams,
				});
			}

			const response = await axiosInstance({
				method: config.method,
				url: cleanUrl,
				headers,
				[config.method === "GET" ? "params" : "data"]: {
					...(provider === "connectreseller"
						? { APIKey: provider_config.connectreseller.apiKey }
						: {}),
					...requestParams,
				},
			});
			return await normalizeResponse(
				provider,
				params,
				response.data,
				type
			);
		}
	} catch (error) {
		// Log provider error (keeps original debug intent)
		console.error("Domain provider request error:", error?.response?.data || error?.message || error);

		// Handle network/DNS errors specifically
		if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
			const errorMessage = error.code === "ENOTFOUND" 
				? `DNS resolution failed for ${provider} API endpoint. Please verify the API URL is correct and the server is accessible.`
				: error.code === "ECONNREFUSED"
				? `Connection refused to ${provider} API. The server may be down or the endpoint is incorrect.`
				: `Connection timeout to ${provider} API. Please check network connectivity.`;
			
			console.error(`${provider} API connection error:`, {
				code: error.code,
				message: error.message,
				hostname: error.hostname || error.address,
				url: error.config?.url,
			});

			return {
				responseMsg: {
					id: 0,
					reason: error.code,
					statusCode: 503,
					message: errorMessage,
					code: error.code,
				},
				responseData: null,
				providerError: {
					code: error.code,
					message: error.message,
					hostname: error.hostname || error.address,
				},
			};
		}

		// Try to extract the provider's structured error payload (if any)
		const providerData = error?.response?.data || null;
		const statusCode = error?.response?.status || 500;

		// Prefer provider-specific descriptive fields (desc / message / error)
		let message =
			providerData?.desc ||
			providerData?.message ||
			providerData?.error?.message ||
			providerData?.error?.error?.message ||
			error?.message ||
			"Unknown error occurred";

		if (typeof message === "object") {
			try {
				message = JSON.stringify(message);
			} catch (_) {
				message = "Unknown error occurred";
			}
		}

		const providerErrorCode = providerData?.code ?? null;

		// Minimal, backward-compatible normalized error object:
		// - responseMsg keeps same keys used elsewhere (statusCode, message)
		// - responseData remains null (so existing logic that expects null stays unchanged)
		// - providerError added so callers can inspect the raw provider payload when needed
		const normalized = {
			responseMsg: {
				id: 0,
				reason: null,
				statusCode: statusCode,
				message: message,
				code: providerErrorCode,
			},
			responseData: null,
			providerError: providerData,
		};

		return normalized;
	}

};

module.exports = {
	// GET request handler with provider fallback
	get: async (type, params, provider = "hostbay") => {
		try {
			if (provider === "both") {
				try {
					return await makeRequest(
						"openprovider",
						type,
						params,
						"GET"
					);
				} catch (openError) {
					console.warn(
						`Openprovider failed for ${type}: ${openError.message}. Falling back to ConnectReseller.`
					);
					return await makeRequest(
						"connectreseller",
						type,
						params,
						"GET"
					);
				}
			} else {
				return await makeRequest(provider, type, params, "GET");
			}
		} catch (error) {
			if (error.response) {
				throw new Error(
					`API request failed with status ${error.response.status}: ${
						error.response.data.message || error.message
					}`,
					{ cause: error }
				);
			} else if (error.request) {
				throw new Error("API request failed: No response received");
			} else {
				throw new Error(`API request failed: ${error.message}`);
			}
		}
	},

	// Generic request handler with provider selection logic
	request: async (
		type,
		params,
		method = "get",
		provider = "hostbay"
	) => {
		try {
			if (provider !== "both") {
				return {
					...(await makeRequest(provider, type, params, method)),
					provider,
				};
			}

			try {
				const tld = extractTLD(params.websiteName);
				const TLDCategory = getTLDCategory(tld);

				// Use Openprovider for default and country TLDs
				if (TLDCategory === "default" || TLDCategory === "country") {
					const response = await makeRequest(
						"openprovider",
						type,
						params,
						method
					);
					return { ...response, provider: "openprovider" };
				}

				try {
					// Compare prices from both providers
					const [openProviderResponse, connectResellerResponse] =
						await Promise.all([
							makeRequest("openprovider", type, params, method),
							makeRequest(
								"connectreseller",
								type,
								params,
								method
							),
						]);
                                                                                                          
					const openProviderPrice =
						openProviderResponse?.responseData?.registrationFee;
					const connectResellerPrice =
						connectResellerResponse?.responseData?.registrationFee;

					console.log(
						`Openprovider Price: ${openProviderPrice}, ConnectReseller Price: ${connectResellerPrice}`
					);                    
          
					// Choose provider based on price comparison
					return connectResellerPrice +
						provider_config.price_diffrence_threshold <=
						openProviderPrice
						? {
								...connectResellerResponse,
								provider: "connectreseller",
						  }
						: { ...openProviderResponse, provider: "openprovider" };
				} catch {
					// Fallback logic when both providers fail
					console.log(
						"Both Openprovider and ConnectReseller failed. Falling back to Openprovider."
					);
					try {
						const response = await makeRequest(
							"openprovider",
							type,
							params,
							method
						);
						return { ...response, provider: "openprovider" };
					} catch {
						const response = await makeRequest(
							"connectreseller",
							type,
							params,
							method
						);
						return { ...response, provider: "connectreseller" };
					}
				}
			} catch (openError) {
				// Fallback to ConnectReseller if Openprovider fails
				console.warn(
					`Openprovider failed for ${type}: ${openError.message}. Falling back to ConnectReseller.`
				);
				const response = await makeRequest(
					"connectreseller",
					type,
					params,
					method
				);
				return { ...response, provider: "connectreseller" };
			}
		} catch (error) {
			// Error handling for API requests
			console.error(
				`Error fetching data from third-party API for ${type}:`,
				error
			);
			if (error.response) {
				throw new Error(
					error.response.data.statusText ||
						error.response.statusText ||
						"An error occurred"
				);
			} else if (error.request) {
				throw new ServiceUnavailableError();
			} else {
				throw new Error(error.message || "Internal Server Error");
			}
		}
	},
};
