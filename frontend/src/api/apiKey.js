import { ENDPOINTS } from "../config/api";
import apiClient from "./client";


const apiKeyAPI = {
  // Create API key
  create: async (payload) => {
    const response = await apiClient.post(ENDPOINTS.API_KEY.CREATE, payload);
    return response.data;
  },

  // Get all API keys
  list: async () => {
    const response = await apiClient.get(ENDPOINTS.API_KEY.LIST);
    return response.data;
  },

  // Get single API key
  getSingle: async (id) => {
    const response = await apiClient.get(`${ENDPOINTS.API_KEY.SINGLE_API_KEY}/${id}`);
    return response.data;
  },

  // Delete API key
  delete: async (id) => {
    const response = await apiClient.delete(`${ENDPOINTS.API_KEY.SINGLE_API_KEY}/${id}`);
    return response.data;
  }
};

export default apiKeyAPI;
