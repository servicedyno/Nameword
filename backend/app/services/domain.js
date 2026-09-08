const apiClient = require('../utils/apiclient');

module.exports.viewDomain = async (domain) => {
    if (!domain) {
        throw new Error('Domain is required');
    }

    try {
        const response = await apiClient.get('ViewDomain', { websiteName: domain });
        return response;
    } catch (error) {
        console.error(`Error fetching domain data:`, error);
        if (error.response) {
            throw new Error(`API request failed with status ${error.response.status}: ${error.response.data.message || 'Unknown error'}`);
        } else if (error.request) {
            throw new Error('API request failed: No response received');
        } else {
            throw new Error(`API request failed: ${error.message}`);
        }
    }
};

module.exports.validateAndApplyFee = (fee, percentage, feeName) => {
    if (typeof fee === 'number') {
        return fee * (1 + percentage / 100);
    } else {
        console.warn(`${feeName} is not available or not a number`);
        return fee;
    }
};


