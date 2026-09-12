// Crypto top-up lifecycle. Every few minutes this:
//  1) reconciles unfinished top-ups with DynoPay and credits the wallet if the user
//     paid but never polled (covers people who closed the tab / have no webhook),
//  2) sends a ONE-TIME "finish your top-up" reminder once it's been unpaid a while,
//  3) expires a stale address after its window so the dashboard stops offering resume.
const schedule = require("node-schedule");
const CryptoTopup = require("../models/CryptoTopup");
const User = require("../models/User");
const { reconcileCryptoTopup } = require("../controllers/wallet/WalletController");
const { sendCryptoTopupReminder } = require("../services/cryptoTopupEmail");

const REMIND_AFTER_MIN = Math.max(5, Number(process.env.CRYPTO_TOPUP_REMIND_AFTER_MINUTES) || 30);
const HARD_EXPIRE_MS = 24 * 60 * 60 * 1000; // fallback for legacy records without expireAt

async function sweep() {
  try {
    const now = new Date();
    const pending = await CryptoTopup.find({ status: { $in: ["pending", "confirming"] } })
      .sort({ createdAt: 1 })
      .limit(50);

    for (const rec of pending) {
      // 1) Reconcile with the provider — credit if paid (even if the user closed the tab).
      try {
        await reconcileCryptoTopup(rec);
      } catch (e) {
        /* keep going — a provider hiccup must not stop the sweep */
      }
      if (rec.status === "credited") continue;

      // 2) Expire past the window (or a 24h fallback when expireAt was never set).
      const expired = rec.expireAt
        ? new Date(rec.expireAt) <= now
        : now - new Date(rec.createdAt) >= HARD_EXPIRE_MS;
      if (expired) {
        if (["pending", "confirming"].includes(rec.status)) {
          rec.status = "expired";
          await rec.save();
        }
        continue;
      }

      // 3) One-time gentle reminder once it's been unpaid for a while.
      const ageMin = (now - new Date(rec.createdAt)) / 60000;
      if (rec.status === "pending" && !rec.reminderSentAt && ageMin >= REMIND_AFTER_MIN) {
        try {
          const user = await User.findById(rec.userId);
          if (user?.email) {
            let allowed = true;
            try {
              const { shouldSendEmail } = require("../utils/notificationHelper");
              allowed = await shouldSendEmail(user, "subscriptionsAndPayments");
            } catch (_) {
              /* if prefs are unavailable, default to sending this transactional nudge */
            }
            if (allowed) {
              await sendCryptoTopupReminder({ to: user.email, name: user.name || null, record: rec });
              console.log(`[cryptoTopupLifecycle] reminder sent to ${user.email} for ${rec.paymentId}`);
            }
          }
          // Mark as reminded regardless so we don't re-check every cycle.
          rec.reminderSentAt = new Date();
          await rec.save();
        } catch (e) {
          console.error("[cryptoTopupLifecycle] reminder failed:", e?.message || e);
        }
      }
    }
  } catch (e) {
    console.error("[cryptoTopupLifecycle] sweep failed:", e?.message || e);
  }
}

schedule.scheduleJob("*/5 * * * *", sweep);
console.log("Crypto top-up lifecycle scheduled: every 5 minutes.");

module.exports = { sweep };
