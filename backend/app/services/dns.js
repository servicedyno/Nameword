// const apiClient = require('../utils/apiclient');
const domainProviderApiClient = require('../utils/domainProviderApiClient');

const viewRecord = async (id, domain, provider = 'hostbay') => {
    try {
        // For HostBay and other providers, use domainProviderApiClient
        const params = {
            WebsiteName: domain,
            WebsiteId: id,
        };
        const response = await domainProviderApiClient.get(
            'ViewDNSRecord',
            params,
            provider
        );
        return response;
    } catch (error) {
        throw error;
    }
};

// Legacy method - kept for backward compatibility
// const viewRecordLegacy = async (id) => {
//     try {
//         const response = await apiClient.request('ViewDNSRecord', { WebsiteId: id });
//         return response;
//     } catch (error) {
//         throw error
//     }
// };

module.exports = {
    viewRecord
    // viewRecordLegacy // Commented out but kept for reference
}
