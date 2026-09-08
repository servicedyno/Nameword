import apiClient from "./client";
import { ENDPOINTS } from "../config/api";

const taxAPI = {
  // Get user's country from IP and tax rate
  getUserCountry: async () => {
    const response = await apiClient.get(ENDPOINTS.TAX.GET_USER_COUNTRY);
    return response.data;
  },

  // Get tax rate for a country
  getTaxRate: async (country) => {
    const response = await apiClient.get(ENDPOINTS.TAX.GET_TAX_RATE, {
      params: { country },
    });
    return response.data;
  },

  // Validate VAT ID
  validateVatId: async (country_code, vat_number) => {
    const response = await apiClient.post(ENDPOINTS.TAX.VALIDATE_VAT, {
      country_code,
      vat_number,
    });
    return response.data;
  },
};

export default taxAPI;

