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
