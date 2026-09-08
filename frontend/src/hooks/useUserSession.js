import { useState, useCallback } from 'react';
import { userSessionsAPI } from '../api/userSession';
import { useAlert } from '../context/AlertContext';
import { useAuth } from './useAuth';

export const useUserSession = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userSessions, setUserSessions] = useState([]);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const { showAlert: showAlertFunc } = useAlert()
  const { clearstorage } =  useAuth();

  const getUserSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await userSessionsAPI.getUserSessions();
      setUserSessions(result?.sessions);
      return result;
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to get account activity.';
      setError(errorMessage);
      setUserSessions([]);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logoutUserSession = useCallback(async (sessionId, isCurrent) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await userSessionsAPI.singleLogout(sessionId);
      setAlertMessage(result?.message);
      setShowAlert(true);
      setUserSessions((prev) => prev.filter((p) => (p.id || p._id) !== sessionId));
      if (isCurrent){
        clearstorage();
      }
      showAlertFunc(result.message, {
        type: "success",
      })
      return result;
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to logout user session.';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logoutAllUserSessions = useCallback(async (onClose) => {
    setLoading(true);
    setError(null);

    try {
      const result = await userSessionsAPI.logoutAll();
      setAlertMessage(result?.message);
      setShowAlert(true);
      setUserSessions((prev) => prev.filter((p) => (p._id || p.id) === result.sessionId));
      showAlertFunc(result.message, {
        type: "success",
      });
      if (onClose){
        onClose();
      }
      return result;
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to logout all user sessions.';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);


  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    getUserSessions,
    userSessions,
    loading,
    error,
    clearError,
    logoutUserSession,
    logoutAllUserSessions,
    showAlert,
    setShowAlert,
    alertMessage,
    setAlertMessage
  };
}; 