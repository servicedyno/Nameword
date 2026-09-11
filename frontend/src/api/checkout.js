import apiClient from "./client";

const C = "/checkout";

export const checkoutAPI = {
  quote: async (items) => (await apiClient.post(`${C}/quote`, { items })).data,
  createOrder: async (items, clientOrderId) =>
    (await apiClient.post(`${C}/orders`, { items, client_order_id: clientOrderId })).data,
  listOrders: async () => (await apiClient.get(`${C}/orders`)).data,
  getOrder: async (id) => (await apiClient.get(`${C}/orders/${encodeURIComponent(id)}`)).data,
};

export default checkoutAPI;
