const domainProviderApiClient = require("../utils/domainProviderApiClient");

/**
 * Create a client on domain provider services
 * @param {Object} clientData - Client information
 * @param {string} provider - Provider to use ('openprovider', 'connectreseller', or 'both')
 * @returns {Object} Response from the provider
 */
const createDomainProviderClient = async (clientData, provider = "both") => {
	const {
		FirstName,
		UserName,
		Password,
		CompanyName,
		Address1,
		City,
		StateName,
		CountryName,
		Zip,
		PhoneNo_cc,
		PhoneNo,
		Faxno_cc,
		FaxNo,
		Alternate_Phone_cc,
		Alternate_Phone,
		Id,
		email,
		LastName,
	} = clientData;

	// Validation rules for required fields
	const validationRules = [
		{ name: "FirstName", value: FirstName, required: true, type: "string" },
		{ name: "UserName", value: UserName, required: true, type: "string" },
		{ name: "Password", value: Password, required: true, type: "string" },
		{
			name: "CompanyName",
			value: CompanyName,
			required: true,
			type: "string",
		},
		{ name: "Address1", value: Address1, required: true, type: "string" },
		{ name: "City", value: City, required: true, type: "string" },
		{ name: "StateName", value: StateName, required: true, type: "string" },
		{
			name: "CountryName",
			value: CountryName,
			required: true,
			type: "string",
		},
		{ name: "Zip", value: Zip, required: true, type: "string" },
		{
			name: "PhoneNo_cc",
			value: PhoneNo_cc,
			required: true,
			type: "string",
		},
		{ name: "PhoneNo", value: PhoneNo, required: true, type: "string" },
		{ name: "Id", value: Id, required: true, type: "string" },
		{ name: "email", value: email, required: true, type: "string" },
	];

	// Validate the parameters
	for (let rule of validationRules) {
		if (
			rule.required &&
			(rule.value === undefined ||
				rule.value === null ||
				rule.value === "")
		) {
			throw new Error(`${rule.name} is required`);
		}
		if (
			rule.value !== undefined &&
			rule.value !== null &&
			rule.value !== "" &&
			typeof rule.value !== rule.type
		) {
			throw new Error(`${rule.name} must be a ${rule.type}`);
		}
	}

	try {
		// Prepare parameters for both providers
		const params = {
			FirstName,
			UserName,
			Password,
			CompanyName,
			Address1,
			City,
			StateName,
			CountryName,
			Zip,
			PhoneNo_cc,
			PhoneNo,
			Faxno_cc: Faxno_cc || "",
			FaxNo: FaxNo || "",
			Alternate_Phone_cc: Alternate_Phone_cc || "",
			Alternate_Phone: Alternate_Phone || "",
			Id,
			email,
			LastName: LastName || "",
		};

		console.log(`Creating client on ${provider} provider...`);

		// Use the domain provider API client to create the client
		const response = await domainProviderApiClient.request(
			"AddClient",
			params,
			"POST",
			provider
		);

		return response;
	} catch (error) {
		console.error("Error creating domain provider client:", error);

		if (error.response) {
			throw new Error(
				`API request failed with status ${error.response.status}: ${
					error.response.data.message || "Unknown error"
				}`
			);
		} else if (error.request) {
			throw new Error("API request failed: No response received");
		} else {
			throw new Error(`API request failed: ${error.message}`);
		}
	}
};

/**
 * Create client on both providers and return the best result
 * @param {Object} clientData - Client information
 * @returns {Object} Response from the successful provider
 */
const createClientOnBothProviders = async (clientData) => {
	try {
		// Try OpenProvider first
		const clientProviderData = Array(2);
		const openProviderResponse = await createDomainProviderClient(
			clientData,
			"openprovider"
		);

		if (openProviderResponse?.responseMsg?.statusCode === 200) {
			clientProviderData[0] = {
				...openProviderResponse,
				provider: "openprovider",
			};
		}

		// If OpenProvider fails, try ConnectReseller
		const connectResellerResponse = await createDomainProviderClient(
			clientData,
			"connectreseller"
		);

		if (connectResellerResponse?.responseMsg?.statusCode === 200) {
			clientProviderData[1] = {
				...connectResellerResponse,
				provider: "connectreseller",
			};
		}

		// If both fail, throw an error
		return clientProviderData;
	} catch (error) {
		console.error("Error creating client on both providers:", error);
		throw error;
	}
};

module.exports = {
	createDomainProviderClient,
	createClientOnBothProviders,
};
