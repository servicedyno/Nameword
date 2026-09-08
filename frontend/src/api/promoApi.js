import apiClient from "./client";
import { ENDPOINTS } from "../config/api";

const promoAPI = {
  /**
   * Validate promocode with backend
   * Checks if user has already used it
   */
  validatePromoCode: async (promoCode, discount) => {
    try {
      const response = await apiClient.post(
        ENDPOINTS.PROMO.VALIDATE,
        { promoCode, discount }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

export default promoAPI;

