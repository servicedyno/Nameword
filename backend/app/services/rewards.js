// Loyalty / rewards service — welcome credit, referral program, and shared
// reward-point crediting. Points are a ledger (RewardPointLog); a user's live
// balance is computed by User.rewardPoints(). All grants here are idempotent
// where it matters (welcome + referral) so they can be called safely on every
// signup / order without ever double-granting.
const crypto = require("crypto");
const User = require("../models/User");
const RewardPointLog = require("../models/RewardPointLog");

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// $5 welcome credit = 250 pts (at $0.02/pt). Configurable via env.
const welcomePoints = () => {
  const v = parseInt(process.env.WELCOME_BONUS_POINTS, 10);
  return Number.isFinite(v) && v > 0 ? v : 250;
};
// $5 referral reward to EACH side. Configurable via env.
const referralPoints = () => {
  const v = parseInt(process.env.REFERRAL_BONUS_POINTS, 10);
  return Number.isFinite(v) && v > 0 ? v : 250;
};
// Per-order loyalty bonus: points per $1 actually paid (default 0.5 => 1% back).
const purchaseBonusRate = () => {
  const v = parseFloat(process.env.PURCHASE_BONUS_REWARD_RATE);
  return Number.isFinite(v) && v >= 0 ? v : 0.5;
};

// Credit a ledger entry (best-effort helper; skips non-positive amounts).
async function credit(userId, points, reason) {
  const p = round2(points);
  if (!(p > 0)) return null;
  return RewardPointLog.create({
    userId,
    rewardPoints: p,
    operationType: "credit",
    reason: reason || null,
  });
}

function genCode() {
  // 8-char uppercase hex — short, unambiguous, URL-safe.
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

// Ensure the user has a unique referral code (lazily generated).
async function ensureReferralCode(user) {
  if (!user) return null;
  if (user.referralCode) return user.referralCode;
  for (let i = 0; i < 6; i++) {
    const code = genCode();
    const exists = await User.findOne({ referralCode: code });
    if (!exists) {
      user.referralCode = code;
      await user.save();
      return code;
    }
  }
  user.referralCode = genCode() + Date.now().toString(36).toUpperCase().slice(-4);
  await user.save();
  return user.referralCode;
}

// One-time $5 welcome credit. Idempotent via user.welcomeBonusGranted.
async function grantWelcomeBonus(user) {
  if (!user || user.welcomeBonusGranted) return false;
  await credit(user._id, welcomePoints(), "welcome");
  user.welcomeBonusGranted = true;
  await user.save();
  return true;
}

// Attribute a signup to a referrer by their code. Sets referredBy only (payout
// happens later on the referred user's first paid order). No-op if already
// attributed, self-referral, or code invalid.
async function attachReferral(user, code) {
  if (!user || !code) return false;
  if (user.referredBy) return false;
  const clean = String(code).trim().toUpperCase();
  if (!clean) return false;
  if (user.referralCode && clean === user.referralCode) return false; // no self-referral
  const referrer = await User.findOne({ referralCode: clean });
  if (!referrer) return false;
  if (String(referrer._id) === String(user._id)) return false;
  user.referredBy = referrer._id;
  await user.save();
  return true;
}

// Convenience: run all signup-time reward steps for a freshly created user.
async function onSignup(user, referralCode) {
  try {
    await ensureReferralCode(user);
    await grantWelcomeBonus(user);
    if (referralCode) await attachReferral(user, referralCode);
  } catch (e) {
    console.error("[rewards] onSignup failed (non-fatal):", e?.message || e);
  }
}

// Called when an order first reaches a paid/partial (non-failed) state. Marks
// the user's first paid order and, if they were referred, pays out the referral
// reward to BOTH sides — exactly once (referralRewarded guard).
async function awardReferralOnFirstPaidOrder(userId) {
  const user = await User.findById(userId);
  if (!user) return;
  if (user.hasCompletedPaidOrder) return; // already had a paid order — nothing to do
  user.hasCompletedPaidOrder = true;

  if (user.referredBy && !user.referralRewarded) {
    const referrer = await User.findById(user.referredBy);
    if (referrer) {
      const pts = referralPoints();
      await credit(referrer._id, pts, "referral");        // reward the referrer
      await credit(user._id, pts, "referral_friend");     // reward the referred friend
      user.referralRewarded = true;
      console.log(`[rewards] referral payout: ${pts} pts each to referrer ${referrer._id} and friend ${user._id}`);
    }
  }
  await user.save();
}

module.exports = {
  round2,
  credit,
  welcomePoints,
  referralPoints,
  purchaseBonusRate,
  genCode,
  ensureReferralCode,
  grantWelcomeBonus,
  attachReferral,
  onSignup,
  awardReferralOnFirstPaidOrder,
};
