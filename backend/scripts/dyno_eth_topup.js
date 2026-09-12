// Generate a REAL $10 ETH crypto payment via DynoPay and print the address details.
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const axios = require("axios");
const mongoose = require("mongoose");

const BASE = (process.env.DYNO_PAY_BASE_URL || "https://dynopay.com/api").trim().replace(/\/+$/, "");
const KEY = process.env.DYNO_PAY_API_KEY;
const APP_URL = process.env.APP_URL;
const H = { "Content-Type": "application/json", Accept: "application/json", "x-api-key": KEY };

(async () => {
  await mongoose.connect(process.env.DB_URI);
  const users = mongoose.connection.collection("users");
  const buyer = await users.findOne({ email: "buyer@nameword.local" });
  const buyerId = buyer ? String(buyer._id) : null;
  console.log("buyerId:", buyerId, "| walletToken on file:", !!buyer?.walletToken);

  // 1) Ensure DynoPay customer token
  let walletToken = buyer?.walletToken || null;
  try {
    const r = await axios.post(`${BASE}/user/createUser`,
      { email: "buyer@nameword.local", name: buyer?.name || "Nameword Buyer", phone_number: "" },
      { headers: H, timeout: 30000 });
    walletToken = r?.data?.data?.token || walletToken;
    if (buyerId && r?.data?.data?.token && buyer?.walletToken !== r.data.data.token) {
      await users.updateOne({ _id: buyer._id }, { $set: { walletToken: r.data.data.token, walletId: r.data.data.customer_id } });
      console.log("stored fresh walletToken for buyer");
    }
  } catch (e) { console.log("createUser:", e?.response?.data?.message || e.message); }

  // 2) Create the ETH crypto payment for $10, tied to buyer via meta_data
  const cryptoHeaders = { ...H, Authorization: `Bearer ${walletToken}` };
  const meta_data = { user_id: buyerId, userId: buyerId, amount: 10, product: "wallet_topup", frontendEndPoint: "wallet" };
  try {
    const r = await axios.post(`${BASE}/user/cryptoPayment`, {
      amount: 10,
      currency: "ETH",
      redirect_uri: `${APP_URL}/wallet`,
      meta_data,
    }, { headers: cryptoHeaders, timeout: 30000 });
    const d = r?.data?.data || {};
    const { qr_code, ...rest } = d;
    console.log("\n===== cryptoPayment ($10 ETH) SUCCESS =====");
    console.log("all data keys:", Object.keys(d));
    console.log(JSON.stringify(rest, null, 2));
    if (qr_code) {
      const fs = require("fs");
      const b64 = String(qr_code).replace(/^data:image\/\w+;base64,/, "");
      fs.writeFileSync("/tmp/eth_qr.png", Buffer.from(b64, "base64"));
      console.log("QR saved to /tmp/eth_qr.png");
    }
  } catch (e) { console.log("cryptoPayment ERROR:", e?.response?.status, JSON.stringify(e?.response?.data) || e.message); }

  await mongoose.disconnect();
  process.exit(0);
})();
