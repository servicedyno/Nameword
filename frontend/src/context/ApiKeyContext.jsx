import { createContext, useState, useCallback } from "react";
import apiKeyAPI from "../api/apiKey";
import { useAlert } from "./AlertContext";

const ApiKeyContext = createContext();

const ApiKeyProvider = ({ children }) => {
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [createdToken, setCreatedToken] = useState(null);
  const { showAlert } = useAlert();

  // 📌 Create API Key
  const createApiKey = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiKeyAPI.create(payload);
      setCreatedToken(response?.data?.apiKey);
      setApiKeys((prev) => [...prev, response.data]);
      showAlert(response?.message, { duration: 2500, type: 'success' });
      return { ...response, success: true };
    } catch (err) {
      const errMsg =
        err?.response?.data?.errors?.[0]?.message ||
        err?.response?.data?.message ||
        "Failed to create API key.";
      setError(errMsg);
      return { error: errMsg, success: false };
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  // 📌 Fetch All API Keys
  const fetchApiKeys = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiKeyAPI.list();
      setApiKeys(response.data || []);
      return { ...response, success: true };
    } catch (err) {
      const errMsg =
        err?.response?.data?.errors?.[0]?.message ||
        err?.response?.data?.message || "Failed to fetch API keys.";
      return { error: errMsg, success: false };
    } finally {
      setLoading(false);
    }
  }, []);

  // 📌 Delete API Key
  const deleteApiKey = useCallback(async (id) => {
    try {
      const response = await apiKeyAPI.delete(id);
      setApiKeys((prev) => prev.filter((key) => key.id !== id));
      showAlert(response?.message, { duration: 2500, type: 'success' });
      return { ...response, success: true };
    } catch (err) {
      const errMsg =
        err?.response?.data?.errors?.[0]?.message ||
        err?.response?.data?.message || "Failed to delete API key.";
      return { error: errMsg, success: false };
    } 
  }, [showAlert]);

  const clearError = () => {
    if(error){
      setError(null);
    }
  }

  return (
    <ApiKeyContext.Provider
      value={{
        apiKeys,
        loading,
        error,
        createApiKey,
        fetchApiKeys,
        deleteApiKey,
        clearError,
        createdToken,
        setCreatedToken
      }}
    >
      {children}
    </ApiKeyContext.Provider>
  );
};

export { ApiKeyContext, ApiKeyProvider };
