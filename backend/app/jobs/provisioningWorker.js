// C3 — Async provisioning safety net.
//
// Checkout returns 201 immediately and kicks provisioning off-request via
// setImmediate(). If the pod restarts mid-provision, a kick-off is missed, or a
// worker crashes and leaves its lock behind, this cron reclaims any order still
// in a non-terminal provisioning state and finishes it. CheckoutController
// .processOrder is idempotent and lock-guarded, so this can run safely alongside
// the in-request kick-off without double-provisioning an item.

const schedule = require("node-schedule");
const Order = require("../models/Order");
const CheckoutController = require("../controllers/checkout/CheckoutController");

const STALE_LOCK_MS = 5 * 60 * 1000; // reclaim locks older than 5 minutes

async function sweep() {
  try {
    const cutoff = new Date(Date.now() - STALE_LOCK_MS);
    const stuck = await Order.find({
      provisioning: { $in: ["pending", "processing"] },
      $or: [{ provisioningLockedAt: null }, { provisioningLockedAt: { $lte: cutoff } }],
    })
      .select("_id")
      .sort({ createdAt: 1 })
      .limit(20)
      .lean();

    for (const o of stuck) {
      await CheckoutController.processOrder(o._id).catch((e) =>
        console.error("[provisioningWorker] processOrder failed:", e?.message || e)
      );
    }
  } catch (e) {
    console.error("[provisioningWorker] sweep failed:", e?.message || e);
  }
}

// Every minute.
schedule.scheduleJob("*/1 * * * *", sweep);
console.log("Provisioning worker (C3) scheduled: every 1 minute.");

module.exports = { sweep };
