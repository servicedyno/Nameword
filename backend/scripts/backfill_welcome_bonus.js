// One-time backfill: grant the $5 welcome credit (250 pts) to every existing
// user that hasn't received it, and ensure everyone has a referral code.
// Idempotent — safe to run multiple times.
// Usage: cd /app/backend && node scripts/backfill_welcome_bonus.js
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../app/models/User");
const rewards = require("../app/services/rewards");

(async () => {
  let granted = 0;
  let codes = 0;
  let scanned = 0;
  try {
    await mongoose.connect(process.env.DB_URI);
    const cursor = User.find({}).cursor();
    for (let user = await cursor.next(); user != null; user = await cursor.next()) {
      scanned++;
      try {
        if (!user.referralCode) {
          await rewards.ensureReferralCode(user);
          codes++;
        }
        if (!user.welcomeBonusGranted) {
          const ok = await rewards.grantWelcomeBonus(user);
          if (ok) granted++;
        }
      } catch (e) {
        console.error(`  ! user ${user._id}: ${e?.message || e}`);
      }
    }
    console.log(`Backfill complete. scanned=${scanned}, welcome_granted=${granted}, referral_codes_created=${codes}`);
    process.exit(0);
  } catch (e) {
    console.error("BACKFILL ERROR:", e.message);
    process.exit(1);
  }
})();
