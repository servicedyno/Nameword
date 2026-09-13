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

    // Native crypto top-up: generate a raw address + QR (no webhook needed; status is polled)
    createCryptoTopup: async (payload) => {
        const response = await apiClient.post(ENDPOINTS.WALLET.CRYPTO_TOPUP, payload);
        return response.data;
    },

    getCryptoTopupStatus: async (paymentId) => {
        const response = await apiClient.get(ENDPOINTS.WALLET.CRYPTO_TOPUP_STATUS(paymentId));
        return response.data;
    },

    listPendingCryptoTopups: async () => {
        const response = await apiClient.get(ENDPOINTS.WALLET.CRYPTO_TOPUPS_PENDING);
        return response.data;
    },

    getCryptoTopups: async () => {
        const response = await apiClient.get(ENDPOINTS.WALLET.CRYPTO_TOPUPS);
        return response.data;
    },

    cancelCryptoTopup: async (paymentId) => {
        const response = await apiClient.post(ENDPOINTS.WALLET.CRYPTO_TOPUP_CANCEL(paymentId));
        return response.data;
    },

    getSupportedCurrencies: async () => {
        const response = await apiClient.get(ENDPOINTS.WALLET.SUPPORTED_CURRENCY);
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
