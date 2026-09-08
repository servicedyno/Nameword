const axios = require("axios");
const { createPaymentLink } = require("../helpers/dynoPayHelper");

const { DYNO_PAY_API_KEY, DYNO_PAY_BASE_URL, DYNO_PAY_USER_API_URL, DYNO_PAY_CREATE_USER_PATH } = process.env;

/** Base URL for user-related DynoPay APIs (createUser, etc.); may differ from payment-link host. */
const getUserApiBase = () => {
  const base = (DYNO_PAY_USER_API_URL || DYNO_PAY_BASE_URL || "").trim().replace(/\/$/, "");
  return base.endsWith("/api") ? base.slice(0, -4) : base;
};
/** Path for DynoPay createUser; set to /api/user/createUser if your server uses /api prefix. */
const getCreateUserPath = () => {
  const p = (DYNO_PAY_CREATE_USER_PATH || "/user/createUser").trim();
  return p.startsWith("/") ? p : `/${p}`;
};

/**
 * Build standard DynoPay headers
 */
const buildHeaders = () => ({
  "Content-Type": "application/json",
  "x-api-key": DYNO_PAY_API_KEY,
});

function cleanError(error) {
  if (!error) return { message: "Unknown DynoPay error", statusCode: 500 };
  if (typeof error === "string") return { message: error, statusCode: 500 };
  if (error?.response?.data) return error.response.data;
  if (error?.data) return error.data;
  if (error?.message?.includes("<!DOCTYPE html")) {
    return { message: "Invalid DynoPay endpoint (check URL or route)", statusCode: 404 };
  }
  return { message: error.message || "DynoPay request failed", statusCode: error.status || 500 };
}


/**
 * Register a new user on DynoPay
 * (Bozzmail uses this on signup / first payment)
 */
const registerUserForPayment = async (email, fullName, phoneNumber) => {
  try {
    const base = getUserApiBase();
    if (!base || !base.startsWith("http")) {
      throw cleanError({ message: "DYNO_PAY_USER_API_URL or DYNO_PAY_BASE_URL must be set for customer registration." });
    }
    const createUserPath = getCreateUserPath();
    const url = `${base}${createUserPath}`;
    console.log("[DynoPay registerUserForPayment] URL:", url);
    const payload = {
      email,
      name: fullName || email,
      phone_number: phoneNumber || "",
    };

    const response = await axios.post(url, payload, { headers: buildHeaders() });
    return response;
  } catch (error) {
    console.error("❌ DynoPay registerUserForPayment error:", error?.response?.data || error);
    // throw error.response || error;
    throw cleanError(error);

  }
};


const generatePaymentLink = async (amount, redirect_url, meta_data, user, description, webhook_url) => {
  try {
    const res = await createPaymentLink({
      amount,
      customer_name: user?.name || user?.email || "Customer",
      customer_email: user?.email || "",
      description: description || "Payment",
      redirect_url,
      webhook_url,
      meta_data: meta_data && typeof meta_data === "object" ? meta_data : undefined,
    });
    return { data: res };
  } catch (error) {
    console.error("❌ DynoPay generatePaymentLink error:", error?.response?.data || error);
    throw cleanError(error);
  }                                                                                           
};

const ensureDynoWallet = async (user) => {
  try {
    const response = await registerUserForPayment(user.email, user.name, user.mobile);

    console.log("✅ DynoPay ensureDynoWallet response:", response?.data || response);

    // If registration succeeds and returns a token
    if (response?.data?.data?.token) {
      user.walletToken = response.data.data.token;
      user.walletId = response.data.data.customer_id;
      await user.save();
      return user;
    }

    return user;
  } catch (err) {
    // ✅ Handle "Account Already Exists!!!" gracefully
    const msg = err?.message || err?.data?.message || "";
    if (msg.includes("Account Already Exists")) {
      console.log("⚠️ DynoPay: Account already exists, skipping registration.");
      return user; // don't throw
    }

    console.error("❌ DynoPay ensureDynoWallet error:", msg);
    throw {
      message: msg || "DynoPay wallet setup failed",
      statusCode: err?.statusCode || 500,
    };
  }
};


module.exports = {
  registerUserForPayment,
  generatePaymentLink,
  ensureDynoWallet,
};
