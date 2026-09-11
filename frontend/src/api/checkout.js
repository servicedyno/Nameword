import apiClient from "./client";

const C = "/checkout";

export const checkoutAPI = {
  quote: async (items, opts = {}) => (await apiClient.post(`${C}/quote`, { items, ...opts })).data,
  createOrder: async (items, clientOrderId, opts = {}) =>
    (await apiClient.post(`${C}/orders`, { items, client_order_id: clientOrderId, ...opts })).data,
  listOrders: async () => (await apiClient.get(`${C}/orders`)).data,
  getOrder: async (id) => (await apiClient.get(`${C}/orders/${encodeURIComponent(id)}`)).data,
};

export default checkoutAPI;
