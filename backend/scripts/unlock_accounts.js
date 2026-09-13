// Unlock any accounts locked by the failed-login protection (LoginController).
// Usage: cd /app/backend && set -a && source .env && set +a && node scripts/unlock_accounts.js [email]
const mongoose = require("mongoose");

(async () => {
  const uri = process.env.DB_URI;
  if (!uri) {
    console.error("DB_URI missing in env");
    process.exit(1);
  }
  await mongoose.connect(uri);
  const users = mongoose.connection.collection("users");

  const targetEmail = process.argv[2];
  const q = targetEmail
    ? { email: targetEmail }
    : { $or: [{ locked: true }, { failedLoginAttempts: { $gt: 0 } }, { lockedUntil: { $ne: null } }] };

  const found = await users
    .find(q, { projection: { email: 1, locked: 1, failedLoginAttempts: 1, lockedUntil: 1 } })
    .toArray();
  console.log(
    "AFFECTED:",
    JSON.stringify(
      found.map((u) => ({
        email: u.email,
        locked: u.locked,
        attempts: u.failedLoginAttempts,
        until: u.lockedUntil,
      }))
    )
  );

  const r = await users.updateMany(q, {
    $set: { locked: false, failedLoginAttempts: 0, lockedUntil: null },
  });
  console.log("UNLOCKED_MODIFIED:", r.modifiedCount);

  await mongoose.disconnect();
  process.exit(0);
})().catch((e) => {
  console.error("UNLOCK_ERROR:", e.message);
  process.exit(1);
});
