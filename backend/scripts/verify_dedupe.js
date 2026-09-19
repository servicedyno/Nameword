require("dotenv").config();
const mongoose = require("mongoose");
(async () => {
  await mongoose.connect(process.env.DB_URI);
  const User = require("../app/models/User");
  const ownership = require("../app/services/ownership");
  const u = await User.findOne({ email: "moxxcompany@gmail.com" }).lean();
  const list = await ownership.ownedList(u._id, "hosting");
  console.log("HOSTING ACCOUNTS RETURNED:", list.length);
  list.forEach((e) =>
    console.log("  ->", e.ref, "| domain:", e.item.domain, "| status:", e.item.status, "| provider_username:", e.item.provider_username || "-")
  );
  await mongoose.disconnect();
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
