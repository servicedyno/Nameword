// One-off manual wallet top-up for the live end-to-end provisioning test.
// Usage: node scripts/manual_topup.js <userId> <usdAmount>
require("dotenv").config();
const mongoose = require("mongoose");
const Wallet = require("../app/models/Wallet");

(async () => {
  const userId = process.argv[2];
  const amount = Number(process.argv[3] || 30);
  if (!userId) throw new Error("userId required");
  await mongoose.connect(process.env.DB_URI);
  const before = await Wallet.findOne({ userId });
  console.log("BEFORE:", before ? Object.fromEntries(before.balance) : "(no wallet)");
  const res = await Wallet.updateOne(
    { userId },
    { $inc: { "balance.USD": amount }, $set: { lastTransactionAt: new Date() } }
  );
  console.log("matched:", res.matchedCount, "modified:", res.modifiedCount);
  const after = await Wallet.findOne({ userId });
  console.log("AFTER:", after ? Object.fromEntries(after.balance) : "(no wallet)");
  await mongoose.disconnect();
})().catch((e) => {
  console.error("ERR:", e.message);
  process.exit(1);
});
