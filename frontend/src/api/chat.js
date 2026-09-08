import apiClient from './client';
import { ENDPOINTS } from '../config/api';

export const chatAPI = {
  // Send a chat message
  sendMessage: (data) => {
    return apiClient.post(ENDPOINTS.CHAT.SEND_MESSAGE, data);
  },

  // Get chat messages
  getMessages: (params) => {
    return apiClient.get(ENDPOINTS.CHAT.GET_MESSAGES, { params });
  },

  // Get chat sessions
  getSessions: (params) => {
    return apiClient.get(ENDPOINTS.CHAT.GET_SESSIONS, { params });
  },

  // Mark messages as read
  markAsRead: (data) => {
    return apiClient.post(ENDPOINTS.CHAT.MARK_AS_READ, data);
  },
};

