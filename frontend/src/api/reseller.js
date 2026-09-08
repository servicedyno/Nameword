import apiClient from './client';

// Client for the Nomadly Reseller API, proxied through our backend at /reseller.
// The reseller secret key lives on the server — never in the browser.
const R = '/reseller';

export const resellerAPI = {
  getHealth: async () => (await apiClient.get(`${R}/health`)).data,
  getAccount: async () => (await apiClient.get(`${R}/account`)).data,

  // VPS (Linux)
  getVpsPlans: async (region = 'EU') =>
    (await apiClient.get(`${R}/vps/plans`, { params: { region } })).data,
  createVps: async (payload) => (await apiClient.post(`${R}/vps`, payload)).data,
  listVps: async () => (await apiClient.get(`${R}/vps`)).data,
  getVps: async (id) => (await apiClient.get(`${R}/vps/${id}`)).data,
  vpsAction: async (id, action) =>
    (await apiClient.post(`${R}/vps/${id}/action`, { action })).data,
  deleteVps: async (id) => (await apiClient.delete(`${R}/vps/${id}`)).data,
  getVpsCredentials: async (id) =>
    (await apiClient.get(`${R}/vps/${id}/credentials`)).data,

  // RDP (Windows)
  getRdpPlans: async (region = 'EU') =>
    (await apiClient.get(`${R}/rdp/plans`, { params: { region } })).data,
  createRdp: async (payload) => (await apiClient.post(`${R}/rdp`, payload)).data,
  listRdp: async () => (await apiClient.get(`${R}/rdp`)).data,
  getRdp: async (id) => (await apiClient.get(`${R}/rdp/${id}`)).data,
  rdpAction: async (id, action) =>
    (await apiClient.post(`${R}/rdp/${id}/action`, { action })).data,
  deleteRdp: async (id) => (await apiClient.delete(`${R}/rdp/${id}`)).data,
  getRdpCredentials: async (id) =>
    (await apiClient.get(`${R}/rdp/${id}/credentials`)).data,

  // Domains
  searchDomain: async (domain) =>
    (await apiClient.get(`${R}/domains/search`, { params: { domain } })).data,
  listDomains: async () => (await apiClient.get(`${R}/domains`)).data,
  registerDomain: async (payload) =>
    (await apiClient.post(`${R}/domains/register`, payload)).data,

  // DNS (free)
  listDns: async (domain) =>
    (await apiClient.get(`${R}/dns/${encodeURIComponent(domain)}/records`)).data,
  addDns: async (domain, record) =>
    (await apiClient.post(`${R}/dns/${encodeURIComponent(domain)}/records`, record)).data,
  updateDns: async (domain, record) =>
    (await apiClient.put(`${R}/dns/${encodeURIComponent(domain)}/records`, { record })).data,
  deleteDns: async (domain, record) =>
    (await apiClient.delete(`${R}/dns/${encodeURIComponent(domain)}/records`, { data: { record } })).data,
  setNameservers: async (domain, nameservers) =>
    (await apiClient.put(`${R}/dns/${encodeURIComponent(domain)}/nameservers`, { nameservers })).data,

  // cPanel Hosting
  getHostingPlans: async () => (await apiClient.get(`${R}/hosting/plans`)).data,
  createHosting: async (payload) => (await apiClient.post(`${R}/hosting`, payload)).data,
  listHosting: async () => (await apiClient.get(`${R}/hosting`)).data,
};

// Product-scoped facade so a single component can drive both VPS and RDP.
export const resellerProduct = (product) => {
  const isRdp = product === 'rdp';
  return {
    getPlans: (region) =>
      isRdp ? resellerAPI.getRdpPlans(region) : resellerAPI.getVpsPlans(region),
    create: (payload) =>
      isRdp ? resellerAPI.createRdp(payload) : resellerAPI.createVps(payload),
    list: () => (isRdp ? resellerAPI.listRdp() : resellerAPI.listVps()),
    get: (id) => (isRdp ? resellerAPI.getRdp(id) : resellerAPI.getVps(id)),
    action: (id, action) =>
      isRdp ? resellerAPI.rdpAction(id, action) : resellerAPI.vpsAction(id, action),
    remove: (id) => (isRdp ? resellerAPI.deleteRdp(id) : resellerAPI.deleteVps(id)),
    credentials: (id) =>
      isRdp ? resellerAPI.getRdpCredentials(id) : resellerAPI.getVpsCredentials(id),
  };
};

export default resellerAPI;
