import apiClient from './client';
import { ENDPOINTS } from '../config/api';

export const authAPI = {
  // User login
  login: async (credentials) => {
    const response = await apiClient.post(ENDPOINTS.AUTH.LOGIN, credentials);
    return response.data;
  },

  // User registration
  register: async (userData) => {
    const response = await apiClient.post(ENDPOINTS.AUTH.REGISTER, userData);
    return response.data;
  },
  changeEmail: async (userData) => {
    const response = await apiClient.post(ENDPOINTS.AUTH.CHANGE_EMAIL, userData);
    return response.data;
  },

  // User logout
  logout: async () => {
    const response = await apiClient.post(ENDPOINTS.AUTH.LOGOUT);
    return response.data;
  },

  // Get current user
  getCurrentUser: async () => {
    const response = await apiClient.get(ENDPOINTS.AUTH.CURRENT_USER);
    return response.data;
  },

  // Forgot password
  forgotPassword: async (email) => {
    const response = await apiClient.post(ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });
    return response.data;
  },

  // Reset password
  resetPassword: async (resetData) => {
    const response = await apiClient.post(ENDPOINTS.AUTH.RESET_PASSWORD, resetData);
    return response.data;
  },

  // Send email verification code
  sendEmailCode: async (email) => {
    const response = await apiClient.post(ENDPOINTS.AUTH.SEND_EMAIL_CODE, { email });
    return response.data;
  },

  // Verify email code
  verifyEmailCode: async (verificationData) => {
    const response = await apiClient.post(ENDPOINTS.AUTH.VERIFY_EMAIL, verificationData);
    return response.data;
  },
  // telegram login
  telegramLogin: async (data) => {
    const response = await apiClient.post(ENDPOINTS.AUTH.TELEGRAM_LOGIN, data);
    return response.data;
  },
  linkTelegramAccount: async (data) => {
    const response = await apiClient.post(ENDPOINTS.AUTH.TELEGRAM_LINK, data);
    return response.data;
  },
  unlinkTelegramAccount: async () => {
    const response = await apiClient.get(ENDPOINTS.AUTH.TELEGRAM_UNLINK);
    return response.data;
  },
  accountDetailUpdate: async (userData) => {
    const response = await apiClient.post(ENDPOINTS.AUTH.ACCOUNT_DETAIL, userData);
    return response.data;
  },
  changePassword: async (userData) => {
    const response = await apiClient.post(ENDPOINTS.AUTH.CHANGE_PASSWORD, userData);
    return response.data;
  },
  deleteAccount: async () => {
    const response = await apiClient.delete(ENDPOINTS.AUTH.DELETE_ACCOUNT);
    return response.data;
  },
  unlinkGoogleAccount: async () => {
    const response = await apiClient.get(ENDPOINTS.AUTH.UNLINK_GOOGLE_ACCOUNT);
    return response.data;
  },
  verify2FA: async (verificationData) => {
    const response = await apiClient.post(ENDPOINTS.AUTH.VERIFY_2FA, verificationData);
    return response.data;
  },
  getNotificationPreferences: async () => {
    const response = await apiClient.get(ENDPOINTS.AUTH.GET_NOTIFICATION_PREFERENCES);
    return response.data;
  },
  updateNotificationPreferences: async (preferences) => {
    const response = await apiClient.post(ENDPOINTS.AUTH.UPDATE_NOTIFICATION_PREFERENCES, { notificationPreferences: preferences });
    return response.data;
  },
}; 