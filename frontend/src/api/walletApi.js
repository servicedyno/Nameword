// src/api/walletApi.js
import apiClient from './client';
import { ENDPOINTS } from '../config/api';

export const walletAPI = {
    getWallet: async (params) => {
        const response = await apiClient.get(ENDPOINTS.WALLET.GET, { params });
        return response.data;
    },

    createWallet: async (params) => {
        const response = await apiClient.post(ENDPOINTS.WALLET.CREATE, params);
        return response.data;
    },

    fundWallet: async (params) => {
        const response = await apiClient.post(ENDPOINTS.WALLET.FUND, params);
        return response.data;
    },

    processPayment: async (params) => {
        const response = await apiClient.post(ENDPOINTS.WALLET.PAY, params);
        return response.data;
    },

    getDynoCheckoutUrl: async (params) => {
        const response = await apiClient.post(ENDPOINTS.WALLET.DYNO_CHECKOUT, params);
        return response.data;
    },

    getDynoCheckoutWebhook: async () => {
        const response = await apiClient.get(ENDPOINTS.WALLET.DYNO_WEBHOOK);
        return response.data;
    },

    getHostbayTransactions: async (params = {}) => {
        const response = await apiClient.get(ENDPOINTS.WALLET.TRANSACTIONS, { params });
        return response.data;
    },

    downloadInvoice: async (transactionId) => {
        const response = await apiClient.get(`${ENDPOINTS.WALLET.TRANSACTIONS}/${transactionId}/invoice`, {
            responseType: 'blob', 
        });
        return response.data;
    },

    getRefundHistory: async (params = {}) => {
        const response = await apiClient.get(ENDPOINTS.WALLET.REFUNDS, { params });
        return response.data;
    },
};
