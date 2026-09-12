import apiClient from "./client";

const C = "/checkout";

export const checkoutAPI = {
  quote: async (items, opts = {}) => (await apiClient.post(`${C}/quote`, { items, ...opts })).data,
  createOrder: async (items, clientOrderId, opts = {}) =>
    (await apiClient.post(`${C}/orders`, { items, client_order_id: clientOrderId, ...opts })).data,
  listOrders: async () => (await apiClient.get(`${C}/orders`)).data,
  getOrder: async (id) => (await apiClient.get(`${C}/orders/${encodeURIComponent(id)}`)).data,
  // C3: async provisioning — live status poll + failed-item retry.
  getStatus: async (id) => (await apiClient.get(`${C}/orders/${encodeURIComponent(id)}/status`)).data,
  retryItem: async (id, idx) =>
    (await apiClient.post(`${C}/orders/${encodeURIComponent(id)}/items/${idx}/retry`)).data,
  // C2: renewals — unified list, per-item renew, auto-renew toggle.
  renewals: async (days = 30) => (await apiClient.get(`${C}/renewals`, { params: { days } })).data,
  renewItem: async (id, idx) =>
    (await apiClient.post(`${C}/orders/${encodeURIComponent(id)}/items/${idx}/renew`)).data,
  setAutoRenew: async (id, idx, enabled) =>
    (await apiClient.put(`${C}/orders/${encodeURIComponent(id)}/items/${idx}/auto-renew`, { enabled })).data,
};

export default checkoutAPI;
