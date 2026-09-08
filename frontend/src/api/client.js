import axios from 'axios';
import { API_CONFIG } from '../config/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true, // IMPORTANT: sends cookies with request
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {

    const localUser = localStorage.getItem("user")
      ? JSON.parse(localStorage.getItem("user"))
      : null;
    
    // Add API key if available
    if (localUser?.latestApiKey) {
      config.headers['x-api-key'] = localUser?.latestApiKey?.apiKey;
    }
    
    // Add Authorization header with token for iOS compatibility (fallback if cookies fail)
    const token = localStorage.getItem("token");
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
export const setupAxiosInterceptors = (logout, redirectAPIKey) => {
  apiClient.interceptors.response.use(
    (response) => {
      // Log response in development
      if (import.meta.env.DEV) {
        console.log('✅ API Response:', response.status, response.config.url);
      }
      return response;
    },
    (error) => {
      // Handle unauthorized access (only logout when it's our auth, not third-party e.g. DynoPay)
      if (error.response && error.response.status === 401) {
        const data = error.response?.data;
        const msg = typeof data?.message === 'string' ? data.message : '';
        const nestedMsg = data?.error?.message || '';
        const isPaymentProviderError =
          data?.error?.statusCode === 401 ||
          /token has expired|please login again/i.test(msg + ' ' + nestedMsg);
        if (!isPaymentProviderError) {
          logout();
        }
      } else if (error.response && error.response.status === 400 && error?.response?.data?.redirect) {
        redirectAPIKey(error?.response?.data?.message);
      }
      console.error('❌ Response Error:', error);
      return Promise.reject(error);
    }
  );
}



export default apiClient; 