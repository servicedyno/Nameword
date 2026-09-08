import apiClient from './client';
import { ENDPOINTS } from '../config/api';

export const userSessionsAPI = {

// Get all sessions
  getUserSessions: async () => {
    const response = await apiClient.get(ENDPOINTS.USER_SESSION.GET_LIST);
    return response.data;
  },

  // Single logout (pass sessionId in path)
  singleLogout: async (sessionId) => {
    const response = await apiClient.get(`${ENDPOINTS.USER_SESSION.SINGLE_LOGOUT}/${sessionId}`);
    return response.data;
  },

  // Logout all sessions
  logoutAll: async () => {
    const response = await apiClient.get(ENDPOINTS.USER_SESSION.LOGOUT_ALL);
    return response.data;
  }
}; 