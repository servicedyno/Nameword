import { createContext, useState, useCallback, useEffect } from "react";
import { domainAPI } from "../api/domains";
import { useAuth } from "../hooks/useAuth";
import Loader from "../components/common/Loader";
import { useAlert } from "./AlertContext";

const DomainContext = createContext();

const DomainProvider = ({ children }) => {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewDomain, setViewDomain] = useState(null);
  const { showAlert } = useAlert();

  const {user} = useAuth();

  // 📌 Fetch All Domains
  const fetchDomains = useCallback(async () => {
    setLoading(true);
    try {
      const response = await domainAPI.domainList();
      setDomains(response.data || []);
      return { ...response, success: true };
    } catch (err) {
      const errMsg =
        err?.response?.data?.errors?.[0]?.message ||
        err?.response?.data?.message || "Failed to fetch domains.";
      showAlert(errMsg, { duration: 2500, type: 'warning' });
      return { error: errMsg, success: false };
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  // 📌 Fetch View Domain
  const fetchViewDomain = useCallback(async (domain) => {
    try {
      const params = { domain }
      const response = await domainAPI.viewDomain(params);
      setViewDomain(response?.responseData || null);
      return { ...response, success: true };
    } catch (err) {
      const errMsg =
        err?.response?.data?.errors?.[0]?.message ||
        err?.response?.data?.message || "Failed to fetch view domain.";
      showAlert(errMsg, { duration: 2500, type: 'warning' });
      return { error: errMsg, success: false };
    }
  }, [showAlert]);

  // 📌 remove Domain
  const removeDomain = useCallback(async (id) => {
    try {
      setLoading(true);
      const response = await domainAPI.removeDomain(id);
      fetchDomains();
      showAlert(response?.message, { duration: 2500, type: 'success' });
      return { ...response, success: true };
    } catch (err) {
      setLoading(false);
      const errMsg =
        err?.response?.data?.errors?.[0]?.message ||
        err?.response?.data?.message || "Failed to delete domain.";
      showAlert(errMsg, { duration: 2500, type: 'warning' });
      return { error: errMsg, success: false };
    }
  }, [showAlert, fetchDomains]);


  const clearError = () => {
    if (error) {
      setError(null);
    }
  };

  useEffect(() => {
    if(user){
      fetchDomains();
    }
  },[user, fetchDomains])

  return (
    <DomainContext.Provider
      value={{
        loading,
        error,
        clearError,
        domains,
        viewDomain,
        fetchDomains,
        removeDomain,
        fetchViewDomain,
      }}
    >
      {children}
      {loading && <Loader />}
    </DomainContext.Provider>
  );
};

export { DomainContext, DomainProvider };
