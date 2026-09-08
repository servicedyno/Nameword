const axios = require("axios");
const config = require("../../config");

// Store the current token and its expiry time
let openproviderToken = null;
let tokenExpiry = null;

/**
 * Authenticates with Openprovider API and retrieves an access token
 * Caches the token for 24 hours to avoid unnecessary API calls
 * @returns {Promise<string|null>} The access token if successful, null otherwise
 */
const getOpenproviderToken = async () => {
	// Check if we have a valid cached token
	if (openproviderToken && tokenExpiry && Date.now() < tokenExpiry) {
		return openproviderToken; // Reuse valid token
	}

	// Get credentials from config
	const { username, password, apiUrl } = config.openprovider;

	// Validate credentials exist
	if (!username || !password) {
		console.warn(
			"Openprovider credentials missing. Skipping Openprovider."
		);
		return null;
	}

	try {
		// Make authentication request to Openprovider API
		const response = await axios.post(
			`${apiUrl}/auth/login`,
			{ username, password },
			{ headers: { "Content-Type": "application/json" } }
		);

		// Verify the response contains a valid token
		if (response.data.code !== 0 || !response.data.data.token) {
			throw new Error(
				"Openprovider authentication failed: " + response.data.desc
			);
		}

		// Store the token and set expiry time
		openproviderToken = response.data.data.token;
		tokenExpiry = Date.now() + 24 * 60 * 60 * 1000; // Assume 24-hour expiry
		return openproviderToken;
	} catch (error) {
		// Handle authentication errors
		console.warn(
			`Failed to authenticate with Openprovider: ${error.message}. Falling back to ConnectReseller.`
		);
		return null;
	}
};

module.exports = { getOpenproviderToken };
