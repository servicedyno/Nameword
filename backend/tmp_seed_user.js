require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./app/models/User");

(async () => {
  try {
    await mongoose.connect(process.env.DB_URI);
    const email = "demo@nameword.local";
    const password = "Demo@12345";
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ name: "Demo User", email });
    }
    user.password = password; // pre-save hook hashes it
    user.isProfileVerified = true;
    user.notifyEmail = false;
    user.enabled2FA = false;
    user.banned = false;
    user.deactivated = false;
    user.locked = false;
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    await user.save();
    console.log("Seeded user:", user.email, "id:", user._id.toString());
    process.exit(0);
  } catch (e) {
    console.error("SEED ERROR:", e.message);
    process.exit(1);
  }
})();
