import apiClient from './client';
import { ENDPOINTS } from '../config/api';

export const domainAPI = {
  // Search domain availability
  searchDomain: async (params) => {
    const response = await apiClient.get(ENDPOINTS.DOMAIN.SEARCH, { params });
    return response.data;
  },

  // Get domain suggestions
  getSuggestions: async (params) => {
    const response = await apiClient.get(ENDPOINTS.DOMAIN.SUGGESTIONS, { params });
    return response.data;
  },

  // Get TLD suggestions
  getTldSuggestions: async (params) => {
    const response = await apiClient.get(ENDPOINTS.DOMAIN.TLD_SUGGESTIONS, { params });
    return response.data;
  },

  domainList: async () => {
    const response = await apiClient.get(ENDPOINTS.DOMAIN.LIST);
    return response.data;
  },

  viewDomain: async (params) => {
    const response = await apiClient.get(ENDPOINTS.DOMAIN.VIEW_DOMAIN, { params });
    return response.data;
  },

  // Get domain bundles
  getDomainBundles: async (params) => {
    const response = await apiClient.get(ENDPOINTS.DOMAIN.BUNDLES, { params });
    return response.data;
  },

  getDomainDynoCheckoutUrl: async (params) => {
    const response = await apiClient.post(ENDPOINTS.DOMAIN.DOMAIN_DYNO_CHECKOUT, params);
    return response.data;
  },

  getDomainRenewDynoCheckoutUrl: async (params) => {
    const response = await apiClient.post(ENDPOINTS.DOMAIN.RENEW_DYNO_CHECKOUT, params);
    return response.data;
  },

  getDomainTransferDynoCheckoutUrl: async (params) => {
    const response = await apiClient.post(ENDPOINTS.DOMAIN.TRANSFER_DYNO_CHECKOUT, params);
    return response.data;
  },

  getDomainDynoCheckoutWebhook: async (params) => {
    const response = await apiClient.get(ENDPOINTS.DOMAIN.DOMAIN_DYNO_CHECKOUT_WEBHOOK, { params });
    return response.data;
  },

  placeDomainOrder: async (params) => {
    const response = await apiClient.get(ENDPOINTS.DOMAIN.ORDER, { params });
    return response.data;
  },

  renewDomain: async (params) => {
    const response = await apiClient.get(ENDPOINTS.DOMAIN.RENEW, { params });
    return response.data;
  },
  removeDomain: async (id) => {
    const response = await apiClient.delete(ENDPOINTS.DOMAIN.REMOVE_DOMAIN(id));
    return response.data;
  },

  transferDomain: async (payload = {}) => {
    const { provider, ...rest } = payload || {};
    if (provider && provider.toLowerCase() === 'hostbay') {
      const response = await apiClient.post(ENDPOINTS.DOMAIN.TRANSFER, {
        provider,
        ...rest,
      });
      return response.data;
    }
    const response = await apiClient.get(ENDPOINTS.DOMAIN.TRANSFER, { params: payload });
    return response.data;
  },

  getTransferStatus: async (domainName) => {
    const response = await apiClient.get(ENDPOINTS.DOMAIN.TRANSFER_STATUS, {
      params: { domainName },
    });
    return response.data;
  },

  getTransferList: async () => {
    const response = await apiClient.get(ENDPOINTS.DOMAIN.TRANSFER_LIST);
    return response.data;
  },

  validateTransfer: async (payload = {}) => {
    const { provider, ...rest } = payload || {};
    if (provider && provider.toLowerCase() === 'hostbay') {
      const response = await apiClient.post(ENDPOINTS.DOMAIN.VALIDATE_TRANSFER, {
        provider,
        ...rest,
      });
      return response.data;
    }
    const response = await apiClient.get(ENDPOINTS.DOMAIN.VALIDATE_TRANSFER, { params: payload });
    return response.data;
  },

  cancelTransfer: async (payload = {}) => {
    const { provider, ...rest } = payload || {};
    if (provider && provider.toLowerCase() === 'hostbay') {
      const response = await apiClient.post(ENDPOINTS.DOMAIN.CANCEL_TRANSFER, {
        provider,
        ...rest,
      });
      return response.data;
    }
    const response = await apiClient.get(ENDPOINTS.DOMAIN.CANCEL_TRANSFER, { params: payload });
    return response.data;
  },

  modifyNameserver: async (params) => {
    const response = await apiClient.get(ENDPOINTS.DOMAIN.MODIFY_NAMESERVER, { params });
    return response.data;
  },

  modifyAuthcode: async (params) => {
    const response = await apiClient.get(ENDPOINTS.DOMAIN.MODIFY_AUTHCODE, { params });
    return response.data;
  },

  manageLock: async (params) => {
    const response = await apiClient.get(ENDPOINTS.DOMAIN.MANAGE_LOCK, { params });
    return response.data;
  },

  managePrivacy: async (params) => {
    const response = await apiClient.get(ENDPOINTS.DOMAIN.MANAGE_PRIVACY, { params });
    return response.data;
  },

  bulkManageAutoRenewal: async (data) => {
    const response = await apiClient.post(ENDPOINTS.DOMAIN.BULK_MANAGE_AUTORENEW, data);
    return response.data;
  },

  bulkManageDomainLock: async (data) => {
    const response = await apiClient.post(ENDPOINTS.DOMAIN.BULK_MANAGE_LOCK, data);
    return response.data;
  },

  bulkModifyNameserver: async (data) => {
    const response = await apiClient.post(ENDPOINTS.DOMAIN.BULK_MODIFY_NAMESERVER, data);
    return response.data;
  },

  getWhois: async (params) => {
    const response = await apiClient.get(ENDPOINTS.DOMAIN.WHOIS, { params });
    return response.data;
  },

  enablePrivacy: async (data) => {
    const response = await apiClient.post(ENDPOINTS.DOMAIN.PRIVACY_ENABLE, data);
    return response.data;
  },

  disablePrivacy: async (data) => {
    const response = await apiClient.post(ENDPOINTS.DOMAIN.PRIVACY_DISABLE, data);
    return response.data;
  },

  initiatePrivacyCheckout: async (data) => {
    const response = await apiClient.post(ENDPOINTS.DOMAIN.PRIVACY_DYNO_CHECKOUT, data);
    return response.data;
  },

  viewSecretKey: async (params) => {
    const response = await apiClient.get(ENDPOINTS.DOMAIN.VIEW_SECRET_KEY, { params });
    return response.data;
  },

  manageDnsRecords: async (params) => {
    const response = await apiClient.get(ENDPOINTS.DOMAIN.MANAGE_DNS, { params });
    return response.data;
  },

  checkDomainPrice: async (params) => {
    const response = await apiClient.get(ENDPOINTS.DOMAIN.PRICE, { params });
    return response.data;
  },

  getDomainContacts: async (domainName, contactType = 'all') => {
    const response = await apiClient.get(ENDPOINTS.DOMAIN.CONTACTS(domainName), {
      params: { contactType }
    });
    return response.data;
  },

  addDomainContact: async (domainName, contactType, contactData) => {
    const response = await apiClient.post(ENDPOINTS.DOMAIN.CONTACTS(domainName), contactData, {
      params: { contactType }
    });
    return response.data;
  },

  updateDomainContact: async (domainName, contactId, contactType, contactData) => {
    const response = await apiClient.put(ENDPOINTS.DOMAIN.CONTACT(domainName, contactId), contactData, {
      params: { contactType }
    });
    return response.data;
  },

  deleteDomainContact: async (domainName, contactId, contactType) => {
    const response = await apiClient.delete(ENDPOINTS.DOMAIN.CONTACT(domainName, contactId), {
      params: { contactType }
    });
    return response.data;
  },

  getAuthCode: async (domainName, params = {}) => {
    const response = await apiClient.get(ENDPOINTS.DOMAIN.AUTH_CODE(domainName), {
      params,
    });
    return response.data;
  },

  // Get DNS records by domain name
  getDNSRecords: async (domainName) => {
    const response = await apiClient.get(ENDPOINTS.DOMAIN.DNS_RECORDS(domainName));
    return response.data;
  },

  // Create DNS record by domain name
  createDNSRecord: async (domainName, recordData) => {
    const response = await apiClient.post(ENDPOINTS.DOMAIN.DNS_RECORDS(domainName), recordData);
    return response.data;
  },

  // Domain Forwarding
  setDomainForwarding: async (params) => {
    const response = await apiClient.get(ENDPOINTS.DOMAIN_FORWARD.SET, { params });
    return response.data;
  },

  getDomainForwarding: async (params) => {
    const response = await apiClient.get(ENDPOINTS.DOMAIN_FORWARD.GET, { params });
    return response.data;
  },

  getAllDomainForwarding: async (params) => {
    const response = await apiClient.get(ENDPOINTS.DOMAIN_FORWARD.ALL, { params });
    return response.data;
  },

  updateDomainForwarding: async (params) => {
    const response = await apiClient.get(ENDPOINTS.DOMAIN_FORWARD.UPDATE, { params });
    return response.data;
  },

  deleteDomainForwarding: async (params) => {
    const response = await apiClient.get(ENDPOINTS.DOMAIN_FORWARD.DELETE, { params });
    return response.data;
  },
};

export const dnsAPI = {
  // View DNS records
  viewDNSRecords: async (params) => {
    const response = await apiClient.get(ENDPOINTS.DNS.VIEW, { params });
    return response.data;
  },

  // Add DNS record
  addDNSRecord: async (params) => {
    const response = await apiClient.get(ENDPOINTS.DNS.ADD, { params });
    return response.data;
  },

  // Modify DNS record
  modifyDNSRecord: async (params) => {
    const response = await apiClient.get(ENDPOINTS.DNS.MODIFY, { params });
    return response.data;
  },

  // Delete DNS record
  deleteDNSRecord: async (params) => {
    const response = await apiClient.get(ENDPOINTS.DNS.DELETE, { params });
    return response.data;
  },

  // Manage DNS (enable DNS management)
  manageDNS: async (params) => {
    const response = await apiClient.get(ENDPOINTS.DNS.MANAGE, { params });
    return response.data;
  },

  // View nameservers
  viewNameservers: async (params) => {
    const response = await apiClient.get(ENDPOINTS.DNS.NAMESERVERS_VIEW, { params });
    return response.data;
  },

  // Update nameservers
  updateNameservers: async (params) => {
    const response = await apiClient.get(ENDPOINTS.DNS.NAMESERVERS_UPDATE, { params });
    return response.data;
  },

  // View DNSSEC records
  viewDNSSEC: async (params) => {
    const response = await apiClient.get(ENDPOINTS.DNS.DNSSEC_VIEW, { params });
    return response.data;
  },

  // Add DNSSEC record
  addDNSSEC: async (data) => {
    const response = await apiClient.post(ENDPOINTS.DNS.DNSSEC_ADD, data);
    return response.data;
  },

  // Modify DNSSEC record
  modifyDNSSEC: async (data) => {
    const response = await apiClient.put(ENDPOINTS.DNS.DNSSEC_MODIFY, data);
    return response.data;
  },

  // Delete DNSSEC record
  deleteDNSSEC: async (data) => {
    const response = await apiClient.delete(ENDPOINTS.DNS.DNSSEC_DELETE, { data });
    return response.data;
  },

  // View child nameservers
  viewChildNameservers: async (params) => {
    const response = await apiClient.get(ENDPOINTS.DNS.CHILD_NAMESERVER_VIEW, { params });
    return response.data;
  },

  // Add child nameserver
  addChildNameserver: async (params) => {
    const response = await apiClient.get(ENDPOINTS.DNS.CHILD_NAMESERVER_ADD, { params });
    return response.data;
  },

  // Modify child nameserver IP
  modifyChildNameserverIP: async (params) => {
    const response = await apiClient.get(ENDPOINTS.DNS.CHILD_NAMESERVER_MODIFY_IP, { params });
    return response.data;
  },

  // Modify child nameserver hostname
  modifyChildNameserverHost: async (params) => {
    const response = await apiClient.get(ENDPOINTS.DNS.CHILD_NAMESERVER_MODIFY_HOST, { params });
    return response.data;
  },

  // Delete child nameserver
  deleteChildNameserver: async (params) => {
    const response = await apiClient.get(ENDPOINTS.DNS.CHILD_NAMESERVER_DELETE, { params });
    return response.data;
  },

  // View DNS history
  viewDNSHistory: async (params) => {
    const response = await apiClient.get(ENDPOINTS.DNS.HISTORY, { params });
    return response.data;
  },

  // Restore DNS from history
  restoreDNSHistory: async (data) => {
    const response = await apiClient.post(ENDPOINTS.DNS.HISTORY_RESTORE, data);
    return response.data;
  },
}; 