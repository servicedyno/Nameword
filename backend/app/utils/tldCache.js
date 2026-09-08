const axios = require("axios");
const config = require("./Domain/config");
const { getOpenproviderToken } = require("./Domain/providers/openprovider/auth");

// In-memory cache for TLD list
let tldCache = {
	data: null,
	timestamp: null,
	ttl: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
};

/**
 * Get cached TLD list or fetch fresh if cache is expired
 */
const getCachedTldList = async () => {
	const now = Date.now();
	
	// Return cached data if still valid
	if (
		tldCache.data &&
		tldCache.timestamp &&
		now - tldCache.timestamp < tldCache.ttl
	) {
		return tldCache.data;
	}

	try {
		// Fetch fresh TLD list directly from OpenProvider API
		const token = await getOpenproviderToken();
		const response = await axios({
			method: "GET",
			url: `${config.openprovider.apiUrl}/tlds`,
			headers: { Authorization: `Bearer ${token}` },
			params: { status: "ACT", limit: 999 },
			timeout: 10000,
		});

		const tldList = response?.data?.data?.results || response?.data?.results || [];
		
		// Update cache
		tldCache = {
			data: tldList,
			timestamp: now,
			ttl: tldCache.ttl,
		};

		console.log(`TLD cache refreshed with ${tldList.length} TLDs`);
		return tldList;
	} catch (error) {
		console.error("Failed to fetch TLD list:", error.message);
		// Return cached data even if expired as fallback
		if (tldCache.data) {
			console.log("Using expired TLD cache as fallback");
			return tldCache.data;
		}
		// Return empty array if no cache and fetch fails
		return [];
	}
};

/**
 * Clear the TLD cache (useful for testing or manual refresh)
 */
const clearTldCache = () => {
	tldCache = {
		data: null,
		timestamp: null,
		ttl: 24 * 60 * 60 * 1000,
	};
};

module.exports = {
	getCachedTldList,
	clearTldCache,
};

