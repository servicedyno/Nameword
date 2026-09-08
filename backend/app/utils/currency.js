const axios = require('axios');

/**
 * Fetch exchange rate from one currency to another using FastForex API
 * @param {string} from - Base currency (e.g., 'EUR')
 * @param {string} to - Target currency (e.g., 'USD')
 * @returns {Promise<number>} - Returns conversion rate (e.g., 1 EUR = 1.10 USD)
 */
const getExchangeRate = async (from = 'EUR', to = 'USD') => {
  // If same currency, return 1 without API call
  if (from && to && from.toUpperCase() === to.toUpperCase()) {
    return 1;
  }

  // Check if API key is configured
  if (!process.env.FAST_FOREX_KEY) {
    console.warn(`⚠️ FAST_FOREX_KEY not configured. Returning 1 for ${from} → ${to}`);
    return 1; // Return 1 as fallback if API key is missing
  }

  try {
    const response = await axios.get('https://api.fastforex.io/fetch-one', {
      params: {
        from: from.toUpperCase(),
        to: to.toUpperCase(),
        api_key: process.env.FAST_FOREX_KEY,
      },
      timeout: 10000, // 10 second timeout
    });

    const rate = response.data?.result?.[to.toUpperCase()];
    if (!rate) {
      console.warn(`⚠️ Exchange rate not found in response for ${from} → ${to}. Returning 1.`);
      return 1; // Return 1 as fallback
    }

    return parseFloat(rate);
  } catch (error) {
    // Handle 403 (Forbidden) - likely API key issue
    if (error.response?.status === 403) {
      console.error(`❌ FastForex API returned 403 (Forbidden) for ${from} → ${to}. Check API key configuration.`);
    } else if (error.response?.status === 429) {
      console.error(`❌ FastForex API rate limit exceeded for ${from} → ${to}`);
    } else {
      console.error(`❌ Failed to fetch exchange rate ${from} → ${to}:`, error.message);
    }
    
    // Return 1 as fallback instead of throwing error
    // This prevents the entire operation from failing
    return 1;
  }
};

module.exports = getExchangeRate;
