// One-off inspection: dump hosting order items for moxxcompany@gmail.com
require("dotenv").config();
const mongoose = require("mongoose");

(async () => {
  await mongoose.connect(process.env.DB_URI);
  const User = require("../app/models/User");
  const Order = require("../app/models/Order");
  const user = await User.findOne({ email: "moxxcompany@gmail.com" }).lean();
  if (!user) {
    console.log("NO USER");
    process.exit(0);
  }
  console.log("USER _id:", String(user._id), "email:", user.email);
  const orders = await Order.find({ userId: user._id }).sort({ createdAt: -1 }).lean();
  console.log("TOTAL ORDERS:", orders.length);
  for (const o of orders) {
    const hostingItems = (o.items || []).filter((it) => it.type === "hosting");
    if (!hostingItems.length) continue;
    console.log("\n==== ORDER", String(o._id), "orderNumber:", o.orderNumber, "mode:", o.mode, "order.status:", o.status, "createdAt:", o.createdAt);
    hostingItems.forEach((it, i) => {
      const globalIdx = o.items.indexOf(it);
      console.log(`  [item idx=${globalIdx}] status=${it.status} domain=${it.domain} plan=${it.plan_name || it.plan_id} provider_username=${it.provider_username || "-"} panel_url=${it.panel_url || "-"} server_ip=${it.server_ip || "-"} refunded_usd=${it.refunded_usd || 0} price_usd=${it.price_usd} expires_at=${it.expires_at || "-"} attempts=${it.attempts || 0} live_status=${it.live_status || "-"}`);
    });
  }
  await mongoose.disconnect();
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
