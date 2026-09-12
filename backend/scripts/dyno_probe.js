// Temporary DynoPay discovery probe — real calls with the real API key.
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const axios = require("axios");

const BASE = (process.env.DYNO_PAY_BASE_URL || "https://dynopay.com/api").trim().replace(/\/+$/, "");
const KEY = process.env.DYNO_PAY_API_KEY;
const H = { "Content-Type": "application/json", Accept: "application/json", "x-api-key": KEY };
const APP_URL = process.env.APP_URL;

const show = (label, data) => {
  console.log(`\n===== ${label} =====`);
  console.log(typeof data === "string" ? data.slice(0, 800) : JSON.stringify(data, null, 2).slice(0, 1800));
};

(async () => {
  console.log("BASE:", BASE, "| API key present:", !!KEY, "| key len:", (KEY || "").length);

  // 1) Embedded checkout session for $10
  try {
    const r = await axios.post(`${BASE}/user/embed/session`, {
      amount: 10,
      customer_name: "Nameword Test",
      customer_email: "buyer@nameword.local",
      description: "$10 Wallet Top-up (live test)",
      redirect_uri: `${APP_URL}/wallet`,
      webhook_url: `${APP_URL}/api/v1/wallet/dynocheckout-webhook`,
    }, { headers: H, timeout: 30000 });
    show("embed/session (amount=10) OK", r.data);
  } catch (e) { show("embed/session ERROR", e?.response?.data || e.message); }

  // 2) Hosted checkout (createPayment) for $10 — alternative
  try {
    const r = await axios.post(`${BASE}/user/createPayment`, {
      amount: 10,
      customer_email: "buyer@nameword.local",
      description: "$10 Wallet Top-up (live test)",
      redirect_uri: `${APP_URL}/wallet`,
      webhook_url: `${APP_URL}/api/v1/wallet/dynocheckout-webhook`,
    }, { headers: H, timeout: 30000 });
    show("createPayment (amount=10) OK", r.data);
  } catch (e) { show("createPayment ERROR", e?.response?.data || e.message); }

  // 3) Supported currencies (x-api-key only)
  for (const path of ["/getSupportedCurrency", "/user/getSupportedCurrency"]) {
    try {
      const r = await axios.get(`${BASE}${path}`, { headers: H, timeout: 30000 });
      show(`GET ${path} OK`, r.data);
    } catch (e) { show(`GET ${path} ERROR`, e?.response?.data || e.message); }
  }

  // 4) createUser -> walletToken?
  let walletToken = null;
  try {
    const r = await axios.post(`${BASE}/user/createUser`, {
      email: "buyer@nameword.local", name: "Nameword Buyer", phone_number: "",
    }, { headers: H, timeout: 30000 });
    show("createUser OK", r.data);
    walletToken = r?.data?.data?.token || r?.data?.token || null;
  } catch (e) { show("createUser ERROR", e?.response?.data || e.message); }

  // 5) Direct crypto payment (ETH address) — try with x-api-key (+ walletToken bearer if we got one)
  const cryptoHeaders = { ...H };
  if (walletToken) cryptoHeaders["Authorization"] = `Bearer ${walletToken}`;
  const cryptoBodies = [
    { amount: 10, currency: "ETH", redirect_uri: `${APP_URL}/wallet` },
    { amount: 10, currency: "eth", redirect_url: `${APP_URL}/wallet` },
  ];
  for (const body of cryptoBodies) {
    try {
      const r = await axios.post(`${BASE}/user/cryptoPayment`, body, { headers: cryptoHeaders, timeout: 30000 });
      show(`cryptoPayment ${JSON.stringify(body)} OK`, r.data);
      break;
    } catch (e) { show(`cryptoPayment ${JSON.stringify(body)} ERROR`, e?.response?.data || e.message); }
  }

  console.log("\nwalletToken obtained:", walletToken ? "YES" : "NO");
  process.exit(0);
})();
