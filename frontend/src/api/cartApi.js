import apiClient from './client';
import { ENDPOINTS } from '../config/api';

export const cartAPI = {
    // Add to Cart

  addToCart: async (params) => {
    const response = await apiClient.post(ENDPOINTS.CART.ADD, params);
    return response.data;
  },

  // Get List Add to Cart
  getListAddToCart: async (params) => {
    const response = await apiClient.get(ENDPOINTS.CART.LIST, { params });
    return response.data;
  },

 // Remove Cart Item 
  removeCartItem: async (params) => {
    const response = await apiClient.delete(ENDPOINTS.CART.REMOVE, { params });
    return response.data;
  },

  // Checkout
  checkout: async (payload) => {
    const response = await apiClient.post(ENDPOINTS.CART.CHECKOUT, payload);
    return response.data;
  },

  clearCart: async () => {
    const response = await apiClient.delete(ENDPOINTS.CART.CLEAR);
    return response.data;
  },

  updateCartItem: async (params) => {
    const response = await apiClient.put(ENDPOINTS.CART.UPDATE, params);
    return response.data;
  },
}; 