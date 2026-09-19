// Idempotent cleanup: mark abandoned/unpaid hosting checkouts that were
// SUPERSEDED by a real, provisioned account for the SAME website.
//
// Symptom this fixes: "Your hosting accounts" showed a website twice — the
// genuinely provisioned account plus a leftover crypto attempt that was never
// paid (order.status = awaiting_payment, item.status = pending, no cPanel user).
// The display list is already corrected by ownership.ownedList (it now ignores
// unpaid orders), but we also settle the dead order so the data is unambiguous.
//
// Safe to run repeatedly. Only touches an awaiting_payment order when the same
// domain is ACTIVE on another paid order for the same user.
require("dotenv").config();
const mongoose = require("mongoose");

const norm = (s) => String(s || "").trim().toLowerCase();

(async () => {
  await mongoose.connect(process.env.DB_URI);
  const Order = require("../app/models/Order");

  // Build the set of {userId|domain} that have a real, active hosting account.
  const activeHosting = new Set();
  const paid = await Order.find({ status: { $in: ["paid", "partial", "failed"] } })
    .select("userId items")
    .lean();
  for (const o of paid) {
    for (const it of o.items || []) {
      if (it.type === "hosting" && it.status === "active" && (it.domain || it.provider_username)) {
        activeHosting.add(`${o.userId}|${norm(it.domain)}`);
      }
    }
  }

  const abandoned = await Order.find({ status: "awaiting_payment" });
  let changed = 0;
  for (const o of abandoned) {
    let touched = false;
    for (const it of o.items || []) {
      if (it.type !== "hosting") continue;
      if (it.status !== "pending" && it.status !== "test_mode") continue;
      const key = `${o.userId}|${norm(it.domain)}`;
      if (!activeHosting.has(key)) continue; // not superseded — leave it alone
      it.status = "failed";
      it.message = "Abandoned unpaid checkout — superseded by an active hosting account for the same domain.";
      touched = true;
    }
    if (touched) {
      // Only flip the order to failed if it has no still-live items left.
      const stillLive = (o.items || []).some((it) =>
        ["active", "test_mode", "pending"].includes(it.status)
      );
      if (!stillLive) o.status = "failed";
      await o.save();
      changed++;
      console.log(`Settled abandoned order ${o.orderNumber || o._id} (user ${o.userId})`);
    }
  }

  console.log(`Done. Orders settled: ${changed}`);
  await mongoose.disconnect();
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
