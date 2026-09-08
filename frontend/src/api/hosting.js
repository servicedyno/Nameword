import apiClient from './client';
import { ENDPOINTS } from '../config/api';

export const hostingAPI = {
  // Get hosting plans
  getHostingPlans: async (params = {}) => {
    const response = await apiClient.get(ENDPOINTS.HOSTING_PLANS.GET, { params });
    return response.data;
  },

  // Calculate hosting price
  calculatePrice: async (params = {}) => {
    const response = await apiClient.get(ENDPOINTS.HOSTING_PLANS.CALCULATE_PRICE, { params });
    return response.data;
  },

  // Generate DynoPay checkout URL for hosting
  getDynoCheckoutUrl: async (payload) => {
    const response = await apiClient.post(ENDPOINTS.HOSTING_PLANS.DYNO_CHECKOUT, payload);
    return response.data;
  },

  // Generate DynoPay checkout URL for bundle (domain + hosting)
  getBundleDynoCheckoutUrl: async (payload) => {
    const response = await apiClient.post(ENDPOINTS.HOSTING_PLANS.BUNDLE_DYNO_CHECKOUT, payload);
    return response.data;
  },

  // Process hosting payment using wallet
  processWalletPayment: async (payload) => {
    const response = await apiClient.post(ENDPOINTS.HOSTING_PLANS.WALLET_PAYMENT, payload);
    return response.data;
  },

  // Process bundle (domain + hosting) payment using wallet
  processBundleWalletPayment: async (payload) => {
    const response = await apiClient.post(ENDPOINTS.HOSTING_PLANS.BUNDLE_WALLET_PAYMENT, payload);
    return response.data;
  },

  // Create hosting for existing domain (setup flow)
  createHostingForExistingDomain: async (payload) => {
    const response = await apiClient.post(ENDPOINTS.HOSTING_PLANS.CREATE_FOR_EXISTING_DOMAIN, payload);
    return response.data;
  },

  // Get user's hosting orders
  getHostingOrders: async (params = {}) => {
    const response = await apiClient.get(ENDPOINTS.HOSTING_PLANS.GET_ORDERS, { params });
    return response.data;
  },

  // Delete/Cancel hosting order
  deleteHostingOrder: async (orderId) => {
    const response = await apiClient.delete(ENDPOINTS.HOSTING_PLANS.DELETE_ORDER(orderId));
    return response.data;
  },

  // Link domain to hosting
  linkDomainToHosting: async (domainName, payload) => {
    const response = await apiClient.post(`${ENDPOINTS.HOSTING_PLANS.LINK_DOMAIN}/${domainName}/link`, payload);
    return response.data;
  },

  // Get hosting credentials
  getHostingCredentials: async (subscriptionId) => {
    const response = await apiClient.get(`/hosting-plans/hosting/${subscriptionId}/credentials`);
    return response.data;
  },

  // Install SSL certificate
  installSSL: async (domainName) => {
    const response = await apiClient.post(ENDPOINTS.HOSTING_PLANS.INSTALL_SSL, { domainName });
    return response.data;
  },

  // Get SSL certificate status
  getSSLStatus: async (domainName) => {
    const response = await apiClient.get(ENDPOINTS.HOSTING_PLANS.GET_SSL_STATUS, { params: { domainName } });
    return response.data;
  },

  // Get external domain DNS info (Cloudflare nameservers and server IP)
  getExternalDomainDNSInfo: async (params) => {
    const response = await apiClient.get(ENDPOINTS.HOSTING_PLANS.GET_EXTERNAL_DOMAIN_DNS_INFO, { params });
    return response.data;
  },

  // Get server info (location, control panel, nameservers, IP)
  // Optional domain_name parameter for domain-specific DNS instructions
  getServerInfo: async (domainName = null) => {
    const params = domainName ? { domain_name: domainName } : {};
    const response = await apiClient.get(ENDPOINTS.HOSTING_PLANS.GET_SERVER_INFO, { params });
    return response.data;
  },

  // Get domain linking status
  getLinkingStatus: async (domainName) => {
    const response = await apiClient.get(`${ENDPOINTS.HOSTING_PLANS.LINK_DOMAIN}/${domainName}/link/status`);
    return response.data;
  },

  // Retry domain linking
  retryLinking: async (domainName) => {
    const response = await apiClient.post(`${ENDPOINTS.HOSTING_PLANS.LINK_DOMAIN}/${domainName}/link/retry`, {});
    return response.data;
  },

  // Get hosting renewal price
  getRenewalPrice: async (subscriptionId, period = 1) => {
    const response = await apiClient.get(ENDPOINTS.HOSTING_PLANS.GET_RENEWAL_PRICE(subscriptionId), { 
      params: { period } 
    });
    return response.data;
  },

  // Get hosting renewal options (all plans with periods)
  getRenewalOptions: async (subscriptionId) => {
    const response = await apiClient.get(ENDPOINTS.HOSTING_PLANS.GET_RENEWAL_OPTIONS(subscriptionId));
    return response.data;
  },

  // Renew hosting subscription (direct API call)
  renewHosting: async (subscriptionId, payload) => {
    const response = await apiClient.post(ENDPOINTS.HOSTING_PLANS.RENEW_HOSTING(subscriptionId), payload);
    return response.data;
  },

  // Process hosting renewal via wallet payment
  processRenewalWalletPayment: async (payload) => {
    const response = await apiClient.post(ENDPOINTS.HOSTING_PLANS.RENEWAL_WALLET_PAYMENT, payload);
    return response.data;
  },

  // Get DynoPay checkout URL for hosting renewal
  getRenewalDynoCheckoutUrl: async (payload) => {
    const response = await apiClient.post(ENDPOINTS.HOSTING_PLANS.RENEWAL_DYNO_CHECKOUT, payload);
    return response.data;
  },

  // Add addon domain to HostBay subscription
  // Optional parameters: register_new, period, auto_renew_domain, subdomain, document_root, dns_only
  addAddonDomain: async (subscriptionId, domain, options = {}) => {
    const payload = {
      domain: domain,
      register_new: options.register_new || false,
      period: options.period || 1,
      auto_renew_domain: options.auto_renew_domain !== false, // default true
      dns_only: options.dns_only || false,
    };

    // Add optional parameters only if provided
    if (options.subdomain !== undefined) {
      payload.subdomain = options.subdomain;
    }
    if (options.document_root !== undefined) {
      payload.document_root = options.document_root;
    }

    const response = await apiClient.post(  
      ENDPOINTS.HOSTING_PLANS.ADD_ADDON_DOMAIN(subscriptionId),
      payload
    );
    return response.data;
  },

  // Get addon domains for HostBay subscription
  getAddonDomains: async (subscriptionId) => {
    const response = await apiClient.get(
      ENDPOINTS.HOSTING_PLANS.GET_ADDON_DOMAINS(subscriptionId)
    );
    return response.data;
  },
};