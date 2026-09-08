const { default: axios } = require("axios");
const User = require("../models/User");

const { DYNO_PAY_BASE_URL, DYNO_PAY_API_KEY, DYNO_PAY_JWT_TOKEN, DYNO_PAY_COMPANY_ID, DYNO_PAY_USER_API_URL, DYNO_PAY_CREATE_USER_PATH, DYNO_PAY_CREATE_PAYMENT_LINK_PATH } = process.env;
const getUserApiBase = () => {
  const base = (DYNO_PAY_USER_API_URL || DYNO_PAY_BASE_URL || "").trim().replace(/\/$/, "");
  return base.endsWith("/api") ? base.slice(0, -4) : base;
};
/** Path for DynoPay createUser; set to /api/user/createUser if your server uses /api prefix. */
const getCreateUserPath = () => {
  const p = (DYNO_PAY_CREATE_USER_PATH || "/user/createUser").trim();
  return p.startsWith("/") ? p : `/${p}`;
};
/** Path for DynoPay createPaymentLink (doc: POST /api/pay/createPaymentLink). Override via DYNO_PAY_CREATE_PAYMENT_LINK_PATH if needed. */
const getCreatePaymentLinkPath = () => {
  const p = (DYNO_PAY_CREATE_PAYMENT_LINK_PATH || "/api/pay/createPaymentLink").trim();
  return p.startsWith("/") ? p : `/${p}`;
};
// DynoPay: Create Payment Link uses JWT (Bearer); API key is optional. See https://dynobackendconsolidated.up.railway.app/api/docs/#/Payments/post_api_pay_createPaymentLink


const createPaymentLink = async (opts) => {
  const { amount, customer_name, customer_email, description, redirect_url, callback_url, webhook_url, modes, apply_tax, meta_data } = opts;
  if (!DYNO_PAY_JWT_TOKEN || !DYNO_PAY_COMPANY_ID) {
    const err = { status: 500, message: "DYNO_PAY_JWT_TOKEN and DYNO_PAY_COMPANY_ID are required for payment links." };
    throw err;
  }
  const rawBase = process.env.DYNO_PAY_BASE_URL;
  let base = (rawBase || "").trim().replace(/\/$/, "");
  if (base.endsWith("/api")) base = base.slice(0, -4);
  if (!base || !base.startsWith("http")) {
    const err = { status: 500, message: "DYNO_PAY_BASE_URL must be set to a full URL (e.g. https://api.dynopay.com)." };
    throw err;
  }
  const path = getCreatePaymentLinkPath();
  const url = `${base}${path}`;
  console.log("[DynoPay createPaymentLink] URL:", url);

  // Request body per DynoPay doc: amount, company_id required; customer_name, customer_email, description, etc. optional
  const payload = {
    amount: Number(amount),
    company_id: Number(DYNO_PAY_COMPANY_ID),
    customer_name: customer_name || "Customer",
    customer_email: customer_email || "",
    description: description || "Payment",
    currency: "USD",
    modes: Array.isArray(modes) && modes.length > 0 ? modes : ["CRYPTO"],
    apply_tax: apply_tax !== undefined ? !!apply_tax : false,
  };
  if (redirect_url) {
    payload.redirect_url = redirect_url;
    console.log("[Payment] redirect_url sent to DynoPay – after payment (captured or not) user will be sent here:", redirect_url);
  }
  if (callback_url) payload.callback_url = callback_url;
  if (webhook_url) payload.webhook_url = webhook_url;
  if (meta_data != null && typeof meta_data === "object" && Object.keys(meta_data).length > 0) {
    payload.meta_data = meta_data;
  }

  // Auth per doc: JWT Token (Bearer) for Create Payment Link
  const headers = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "Authorization": `Bearer ${DYNO_PAY_JWT_TOKEN}`,
  };
  if (DYNO_PAY_API_KEY) {
    headers["x-api-key"] = DYNO_PAY_API_KEY;
  }

  try {
    const response = await axios.post(url, payload, { headers });
    return response.data;
  } catch (err) {
    const resStatus = err?.response?.status;
    const resData = err?.response?.data;
    console.error("[DynoPay createPaymentLink] failed:", resStatus, typeof resData === "string" ? resData?.slice(0, 300) : JSON.stringify(resData)?.slice(0, 300));
    throw err;
  }
};

const registerUserForPayment = async (email, name, mobile) => {
  try {
    if (!DYNO_PAY_JWT_TOKEN) {
      const err = { status: 500, message: "DYNO_PAY_JWT_TOKEN is required for customer registration." };
      throw err;
    }
    const payload = {
      email: email,
      name: name
    };
    if (mobile) {
      payload.mobile = mobile;
    }
    const userApiBase = getUserApiBase();
    if (!userApiBase || !userApiBase.startsWith("http")) {
      const err = { status: 500, message: "DYNO_PAY_USER_API_URL or DYNO_PAY_BASE_URL must be set for customer registration." };
      throw err;
    }
    const createUserPath = getCreateUserPath();
    const createUserUrl = `${userApiBase}${createUserPath}`;
    console.log("[DynoPay registerUserForPayment] URL:", createUserUrl);
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${DYNO_PAY_JWT_TOKEN}`,
    };
    if (DYNO_PAY_API_KEY) {
      headers["x-api-key"] = DYNO_PAY_API_KEY;
    }
    const response = await axios.post(createUserUrl, payload, { headers });
    return response.data;
  } catch (error) {
    throw error;
  }
};

const generatePaymentLink = async ({
  amount,
  redirect_uri,
  meta_data,
  walletToken,
  customer_name,
  customer_email,
  description,
  webhook_url,
  modes,
  apply_tax,
}) => {
  try {
    const res = await createPaymentLink({
      amount,
      customer_name: customer_name || "Customer",
      customer_email: customer_email || "",
      description: description || "Payment",
      redirect_url: redirect_uri,
      webhook_url,
      modes,
      apply_tax,
      meta_data,
    });
    return res;
  } catch (error) {
    throw error;
  }
};

/**
 * @param {number} amount
 * @param {string} redirect_url - Frontend URL where the user's browser is sent after payment
 * @param {string} webhook_url - Backend URL where DynoPay sends payment info (callback)
 */
const generateAddFundsLink = async (amount, redirect_url, webhook_url, meta_data, customer_name, customer_email, description) => {
  try {
    const res = await createPaymentLink({
      amount,
      customer_name: customer_name || "Customer",
      customer_email: customer_email || "",
      description: description || `$${amount} Wallet Top-up`,
      redirect_url,
      webhook_url,
      meta_data: meta_data && typeof meta_data === "object" ? meta_data : undefined,
    });
    return { data: res };
  } catch (error) {
    throw error;
  }
};

const fetchDynoWalletBalance = async (walletToken) => {
  try {
    if (!walletToken) {
      const err = { status: 400, message: "Wallet token is required." };
      throw err;
    }
    const userApiBase = getUserApiBase();
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${walletToken}`,
    };
    if (DYNO_PAY_API_KEY) {
      headers["x-api-key"] = DYNO_PAY_API_KEY;
    }
    const response = await axios.get(`${userApiBase}/user/getBalance`, { headers });
    return response;
  } catch (error) {
    throw error;
  }
};

const fetchUserTransactionById = async (walletToken, transactionId) => {
  try {
    if (!walletToken) {
      const err = { status: 400, message: "Wallet token is required." };
      throw err;
    }
    const base = getUserApiBase();
    const url = `${base}/user/getSingleTransaction/${transactionId}`;
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${walletToken}`,
    };
    if (DYNO_PAY_API_KEY) {
      headers["x-api-key"] = DYNO_PAY_API_KEY;
    }
    const response = await axios.get(url, { headers });
    return response;
  } catch (error) {
    throw error.response || error;
  }
};

const ensureWallet = async(userID) => {
  let user = await User.findById({_id: userID});

  if(!user){
    const err = { status: 400,  message: "user not found." }

    throw err;
  }

  if(!user.walletToken){
    const result = await registerUserForPayment(user.email, user.name, user.mobile);

    if(result.data.token){
        user.walletToken = result.data.token;
        user.walletId = result.data.customer_id;

        await user.save();
      }else{
        const err = { status: 400, message: "Failed register user for dyno pay." }

      throw err;
    }
  }
  return user.walletToken
  
}


module.exports = {
  registerUserForPayment,
  createPaymentLink,
  generatePaymentLink,
  generateAddFundsLink,
  fetchDynoWalletBalance,
  fetchUserTransactionById,
  ensureWallet
};
