import { createContext, useState, useEffect, useRef } from "react";
import { authAPI } from "../api/auth";
import { useLocation, useNavigate } from "react-router";
import { toast } from "react-toastify";
import { setupAxiosInterceptors } from "../api/client";
import { useAlert } from "./AlertContext";
import { mergeGuestCartIntoServer } from "../utils/guestCart";
import { cartAPI } from "../api/cartApi";

// Create context with default values to prevent errors if used outside provider
const defaultAuthValue = {
  isAuthenticated: false,
  user: null,
  loading: true,
  error: null,
  login: async () => ({ error: "AuthProvider not initialized" }),
  register: async () => ({ error: "AuthProvider not initialized" }),
  logout: () => {},
  updateUser: () => {},
  clearError: () => {},
  sendEmailCode: async () => ({ error: "AuthProvider not initialized" }),
  verifyEmailCode: async () => ({ error: "AuthProvider not initialized" }),
  resendLoading: false,
  forgotPassword: async () => ({ error: "AuthProvider not initialized" }),
  resetPassword: async () => ({ error: "AuthProvider not initialized" }),
  setResetPasswordSuccess: () => {},
  resetPasswordSuccess: false,
  checkAuth: async () => {},
  setError: () => {},
  onTelegramLogin: async () => ({ error: "AuthProvider not initialized" }),
  linkTelegramAccount: async () => ({ error: "AuthProvider not initialized" }),
  accountDetailUpdate: async () => ({ error: "AuthProvider not initialized" }),
  changePassword: async () => ({ error: "AuthProvider not initialized" }),
  deleteAccount: async () => ({ error: "AuthProvider not initialized" }),
  clearstorage: () => {},
  unlinkGoogleAccount: async () => ({ error: "AuthProvider not initialized" }),
  unlinkTelegramAccount: async () => ({ error: "AuthProvider not initialized" }),
  verify2FA: async () => ({ error: "AuthProvider not initialized" }),
  changeEmail: async () => ({ error: "AuthProvider not initialized" }),
};

const AuthContext = createContext(defaultAuthValue);

export { AuthContext };

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resendLoading, setResendLoading] = useState(false); // Added missing state
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState(false); // Added missing state
  const firstRender = useRef(true);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { showAlert } = useAlert();

  const pathData = [
    "/sign-in",
    "/create-account",
    "/forgot-password",
    "/reset-password",
    "/otp-code",
  ];

  // Check if user is authenticated on app load
  const checkAuth = async () => {
    try {
      setLoading(true);
      const userData = await authAPI.getCurrentUser();
      localStorage.setItem("user", JSON.stringify(userData.data));
      setUser(userData.data);
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.errors[0]?.message ||
          "Failed to fetch user data"
      );
      console.error("Failed to get current user:", error);
      localStorage.removeItem("user");
      navigate("/sign-in", { replace: true });
      setUser(null);
    } finally {
      firstRender.current = false;
      setLoading(false);
    }
  };

  const clearstorage = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    localStorage.removeItem("otpExpireAt");
    localStorage.removeItem("path");
    localStorage.removeItem("qrCode");
    setUser(null);
    setLoading(false);
    setError(null);
    navigate("/sign-in", { replace: true });
  };

  const redirectAPIKey = (errorMessage) => {
    showAlert(errorMessage, { type: "error" });
    navigate("/account-setting?tab=api-key", { replace: true });
  };

  useEffect(() => {
    setupAxiosInterceptors(clearstorage, redirectAPIKey);
    const localUser = localStorage.getItem("user")
      ? JSON.parse(localStorage.getItem("user"))
      : null;
    setUser(localUser);
    if (localUser && firstRender.current && !pathData.includes(pathname)) {
      checkAuth();
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setError(null);
  }, [pathname]);

  // Login function
  const login = async (credentials) => {
    try {
      setError(null);
      const response = await authAPI.login(credentials);

      if (!response?.data?.isProfileVerified || response?.data?.notifyEmail) {
        localStorage.setItem("email", response.data?.email);
        localStorage.setItem("otpExpireAt", response.expiresAt);
        navigate("/otp-code", { replace: true });
      } else if (response?.data?.enabled2FA) {
        localStorage.setItem("qrCode", response?.qrCode);
        localStorage.setItem("email", response.data?.email);
        navigate("/2fa/verify", { replace: true });
      } else {
        // Store user data
        localStorage.setItem("user", JSON.stringify(response.data));
        // Store token for iOS compatibility (fallback if cookies fail)
        if (response.token) {
          localStorage.setItem("token", response.token);
        }
        setUser((prev) => ({
          ...(prev || {}),
          ...response.data,
        }));
        try {
          await mergeGuestCartIntoServer(cartAPI);
        } catch (e) {
          console.warn("Merge guest cart failed:", e);
        }
        const path = localStorage.getItem("path");
        navigate(path || "/", { replace: true });
      }

      return response;
    } catch (error) {
      if (error?.response?.data?.errors) {
        setError(error?.response?.data?.errors[0]?.message);
      } else {
        const errorMessage = error?.response?.data?.message || "Login failed";
        setError(errorMessage);
      }
      throw error;
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      setError(null);
      const response = await authAPI.register(userData);

      localStorage.setItem("email", response.data.email);
      localStorage.setItem("registerId", response.data.id);
      localStorage.setItem("otpExpireAt", response.expiresAt);
      return response;
    } catch (error) {
      if (error?.response?.data?.errors) {
        setError(error?.response?.data?.errors[0]?.message);
      } else {
        const errorMessage =
          error?.response?.data?.message || "Registration failed";
        setError(errorMessage);
      }
      throw error;
    }
  };

  // Register function
  const changeEmail = async (userData) => {
    try {
      setError(null);
      const response = await authAPI.changeEmail(userData);

      localStorage.setItem("email", response.data.email);
      localStorage.setItem("otpExpireAt", response.data.expiresAt);
      return { ...response, success: true };
    } catch (error) {
      if (error?.response?.data?.errors) {
        return {
          error: error?.response?.data?.errors[0]?.message,
          success: false,
        };
      } else {
        const errorMessage =
          error?.response?.data?.message || "Failed to Change email.";
        return { error: errorMessage, success: false };
      }
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setLoading(true);
      const response = await authAPI.logout();
      localStorage.removeItem("user");
      localStorage.removeItem("path");
      setUser(null);
      return response;
    } catch (error) {
      console.error("Logout error:", error);
      localStorage.removeItem("user");
      localStorage.removeItem("path");
      navigate("/sign-in", { replace: true });
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.errors[0]?.message ||
          "logout failed"
      );
      setUser(null);
      throw Error(error);
    } finally {
      setLoading(false);
      setError(null);
    }
  };

  // Update user profile
  const updateUser = (userData) => {
    setUser(userData);
  };

  // Clear error
  const clearError = () => {
    setError(null);
  };

  // Send email verification code
  const sendEmailCode = async (email) => {
    try {
      setError(null);
      setResendLoading(true);
      const response = await authAPI.sendEmailCode(email);
      localStorage.setItem("otpExpireAt", response?.expiresAt);
      setResendLoading(false);
      return response;
    } catch (error) {
      setResendLoading(false);
      if (error?.response?.data?.errors) {
        setError(error?.response?.data?.errors[0]?.message);
      } else {
        const errorMessage =
          error?.response?.data?.message || "Failed to send verification code";
        setError(errorMessage);
      }
      throw error;
    }
  };

  // Verify email code
  const verifyEmailCode = async (verificationData) => {
    try {
      setError(null);
      const response = await authAPI.verifyEmailCode(verificationData);

      if (!response?.data?.enabled2FA) {
        localStorage.setItem("user", JSON.stringify(response.data));
        // Store token for iOS compatibility
        if (response.token) {
          localStorage.setItem("token", response.token);
        }
      }
      return response;
    } catch (error) {
      if (error?.response?.data?.errors) {
        setError(error?.response?.data?.errors[0]?.message);
      } else {
        const errorMessage =
          error?.response?.data?.message || "Email verification failed";
        setError(errorMessage);
      }
      throw error;
    }
  };

  const verify2FA = async (verificationData) => {
    try {
      setError(null);
      const response = await authAPI.verify2FA(verificationData);
      localStorage.setItem("user", JSON.stringify(response.data));
      // Store token for iOS compatibility
      if (response.token) {
        localStorage.setItem("token", response.token);
      }
      localStorage.removeItem("qrCode");
      localStorage.removeItem("email");
      localStorage.removeItem("otpExpireAt");

      updateUser(response?.data);
      return response;
    } catch (error) {
      if (error?.response?.data?.errors) {
        setError(error?.response?.data?.errors[0]?.message);
      } else {
        const errorMessage =
          error?.response?.data?.message || "2FA verification failed";
        setError(errorMessage);
      }
      throw error;
    }
  };

  const forgotPassword = async (email) => {
    try {
      setError(null);
      const response = await authAPI.forgotPassword(email);
      return response;
    } catch (error) {
      if (error?.response?.data?.errors) {
        setError(error?.response?.data?.errors[0]?.message);
      } else {
        const errorMessage =
          error?.response?.data?.message || "Forgot password failed";
        setError(errorMessage);
      }
      throw error;
    }
  };

  const resetPassword = async (resetData) => {
    try {
      setError(null);
      const response = await authAPI.resetPassword(resetData);
      setResetPasswordSuccess(true);
      return response;
    } catch (error) {
      if (error?.response?.data?.errors) {
        setError(error?.response?.data?.errors[0]?.message);
      } else {
        const errorMessage =
          error?.response?.data?.message || "Reset password failed";
        setError(errorMessage);
      }
      throw error;
    }
  };

  const onTelegramLogin = async (data) => {
    try {
      setError(null);
      const response = await authAPI.telegramLogin(data);
      localStorage.setItem("user", JSON.stringify(response.data));
      // Store token for iOS compatibility
      if (response.token) {
        localStorage.setItem("token", response.token);
      }
      setUser((prev) => ({
        ...(prev || {}),
        ...response.data,
      }));
      return response;
    } catch (error) {
      if (error?.response?.data?.errors) {
        setError(error?.response?.data?.errors[0]?.message);
      } else {
        const errorMessage =
          error?.response?.data?.error ||
          error?.response?.data?.message ||
          "Telegram login failed";
        setError(errorMessage);
      }
      throw error;
    }
  };

  const linkTelegramAccount = async (data) => {
    try {
      setError(null);
      const response = await authAPI.linkTelegramAccount(data);
      if (response?.data) {
        localStorage.setItem("user", JSON.stringify(response.data));
        setUser((prev) => ({
          ...(prev || {}),
          ...response.data,
        }));
      }
      return response;
    } catch (error) {
      if (error?.response?.data?.errors) {
        setError(error?.response?.data?.errors[0]?.message);
      } else {
        const errorMessage =
          error?.response?.data?.error ||
          error?.response?.data?.message ||
          "Telegram linking failed";
        setError(errorMessage);
      }
      throw error;
    }
  };

  const accountDetailUpdate = async (userData) => {
    try {
      const response = await authAPI.accountDetailUpdate(userData);
      localStorage.setItem("user", JSON.stringify(response.data));
      updateUser(response?.data);
      return { ...response, success: true };
    } catch (error) {
      if (error?.response?.data?.errors) {
        return {
          error: error?.response?.data?.errors[0]?.message,
          success: false,
        };
      } else {
        const errorMessage =
          error?.response?.data?.message || "Failed to update account details.";
        return { error: errorMessage, success: false };
      }
    }
  };

  const changePassword = async (data) => {
    try {
      const response = await authAPI.changePassword(data);
      return { ...response, success: true };
    } catch (error) {
      if (error?.response?.data?.errors) {
        return {
          error: error?.response?.data?.errors[0]?.message,
          success: false,
        };
      } else {
        const errorMessage =
          error?.response?.data?.message || "Failed to Change password.";
        return { error: errorMessage, success: false };
      }
    }
  };

  const unlinkGoogleAccount = async () => {
    try {
      const response = await authAPI.unlinkGoogleAccount();
      localStorage.setItem("user", JSON.stringify(response.user));
      updateUser(response.user);
      return { ...response, success: true };
    } catch (error) {
      if (error?.response?.data?.errors) {
        return {
          error: error?.response?.data?.errors[0]?.message,
          success: false,
        };
      } else {
        const errorMessage =
          error?.response?.data?.message || "Failed to delete account.";
        return { error: errorMessage, success: false };
      }
    }
  };

  const unlinkTelegramAccount = async () => {
    try {
      const response = await authAPI.unlinkTelegramAccount();
      localStorage.setItem("user", JSON.stringify(response.user));
      updateUser(response.user);
      return { ...response, success: true };
    } catch (error) {
      if (error?.response?.data?.errors) {
        return {
          error: error?.response?.data?.errors[0]?.message,
          success: false,
        };
      } else {
        const errorMessage =
          error?.response?.data?.message || "Failed to unlink Telegram account.";
        return { error: errorMessage, success: false };
      }
    }
  };

  const deleteAccount = async () => {
    try {
      const response = await authAPI.deleteAccount();
      return { ...response, success: true };
    } catch (error) {
      if (error?.response?.data?.errors) {
        return {
          error: error?.response?.data?.errors[0]?.message,
          success: false,
        };
      } else {
        const errorMessage =
          error?.response?.data?.message || "Failed to delete account.";
        return { error: errorMessage, success: false };
      }
    }
  };

  const value = {
    isAuthenticated: !!user,
    user,
    loading,
    error,
    login,
    register,
    logout,
    updateUser,
    clearError,
    sendEmailCode,
    verifyEmailCode,
    resendLoading,
    forgotPassword,
    resetPassword,
    setResetPasswordSuccess,
    resetPasswordSuccess,
    checkAuth,
    setError,
    onTelegramLogin,
    linkTelegramAccount,
    accountDetailUpdate,
    changePassword,
    deleteAccount,
    clearstorage,
    unlinkGoogleAccount,
    unlinkTelegramAccount,
    verify2FA,
    changeEmail,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
