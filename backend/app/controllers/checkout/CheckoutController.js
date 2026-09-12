const { nomadly } = require("../../services/nomadlyReseller");
const Wallet = require("../../models/Wallet");
const Transaction = require("../../models/Transaction");
const Order = require("../../models/Order");
const User = require("../../models/User");
const RewardPointLog = require("../../models/RewardPointLog");
const ownership = require("../../services/ownership");
const { createPaymentRecord } = require("../../utils/paymentHelper");

// ---- Reward points config -------------------------------------------------
// USD value of one reward point when redeemed (default $0.02; mirrors frontend
// VITE_REWARD_POINT_VALUE). Points earned per $1 spent on an order.
const pointValueUsd = () => {
  const v = parseFloat(process.env.REWARD_POINT_VALUE);
  return Number.isFinite(v) && v > 0 ? v : 0.02;
};
const purchaseRewardRate = () => {
  const v = parseFloat(process.env.PURCHASE_REWARD_RATE);
  return Number.isFinite(v) && v >= 0 ? v : 1; // points per $1 spent
};

// Hostinger-style checkout: the cart lives in the browser until payment; this
// controller re-prices every item against the Nomadly reseller API, charges the
// user's IN-APP wallet (never the reseller wallet), then provisions upstream.

class HttpError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

const DOMAIN_RE = /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const NS_RE = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
const round2 = (n) => Math.round(Number(n) * 100) / 100;
const normDomain = (d) => String(d || "").trim().toLowerCase();
const SENSITIVE_RE = /password|pin|secret|token/i;

// Server (vps/rdp) helpers.
const VALID_REGIONS = ["EU", "SG"];
const normRegion = (r) => {
  const v = String(r || "").trim().toUpperCase();
  return VALID_REGIONS.includes(v) ? v : "EU";
};
const VPS_OS = ["ubuntu", "debian", "centos", "fedora", "rocky", "almalinux"];
const sanitizeOs = (o) => {
  const v = String(o || "").trim().toLowerCase();
  return VPS_OS.includes(v) ? v : "ubuntu";
};
const sanitizeHostname = (h) => String(h || "").trim().slice(0, 63);

// Validate + normalise a custom nameserver list (2–4 unique valid hostnames).
function normalizeNameservers(raw, domain) {
  const arr = Array.isArray(raw) ? raw : String(raw || "").split(/[\s,]+/);
  const cleaned = arr.map((x) => String(x || "").trim().toLowerCase()).filter(Boolean);
  const uniq = [...new Set(cleaned)];
  for (const ns of uniq) {
    if (!NS_RE.test(ns)) {
      throw new HttpError(400, "invalid_nameservers", `"${ns}" is not a valid nameserver hostname.`, { domain });
    }
  }
  if (uniq.length < 2) {
    throw new HttpError(400, "invalid_nameservers", `Enter at least two custom nameservers for ${domain}.`, { domain });
  }
  return uniq.slice(0, 4);
}

const sanitizeUpstream = (data) => {
  if (!data || typeof data !== "object") return data;
  const walk = (v) => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      return Object.fromEntries(
        Object.entries(v)
          .filter(([k]) => !SENSITIVE_RE.test(k))
          .map(([k, val]) => [k, walk(val)])
      );
    }
    return v;
  };
  return walk(data);
};

async function getMode() {
  try {
    const r = await nomadly.get("/health");
    return r.data?.mode === "live" ? "live" : r.data?.mode === "dry_run" ? "dry_run" : "unknown";
  } catch (_) {
    return "unknown";
  }
}

// Re-price the client cart from the live catalog. Never trusts client prices.
async function priceItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new HttpError(400, "empty_cart", "Your cart is empty.");
  }
  if (rawItems.length > 20) throw new HttpError(400, "too_many_items", "Too many items in cart.");

  let plans = null;
  const serverPlans = {}; // cache: `${type}:${region}` -> plan[]
  const out = [];
  const seen = new Set();
  for (const it of rawItems) {
    const type = it?.type;

    if (type === "domain" || type === "hosting") {
      const domain = normDomain(it?.domain);
      if (!DOMAIN_RE.test(domain)) {
        throw new HttpError(400, "invalid_domain", `"${it?.domain || ""}" is not a valid domain.`);
      }
      const key = `${type}:${domain}`;
      if (seen.has(key)) throw new HttpError(400, "duplicate_item", `${domain} appears twice in the cart.`);
      seen.add(key);

      if (type === "domain") {
        const r = await nomadly.get("/domains/search", { params: { domain } });
        const d = r.data || {};
        const price = Number(d.price_usd);
        if (!d.available) {
          throw new HttpError(409, "domain_unavailable", `${domain} is no longer available.`, { domain });
        }
        if (!Number.isFinite(price) || price <= 0) {
          throw new HttpError(400, "pricing_failed", `Could not price ${domain}.`, { domain });
        }
        const nsChoice = ["registrar", "custom"].includes(it.ns_choice) ? it.ns_choice : "cloudflare";
        const nameservers = nsChoice === "custom" ? normalizeNameservers(it.nameservers, domain) : [];
        out.push({
          type,
          domain,
          ns_choice: nsChoice,
          nameservers,
          registrar: d.registrar || null,
          price_usd: round2(price),
        });
      } else {
        if (!plans) plans = (await nomadly.get("/hosting/plans")).data?.plans || [];
        const plan = plans.find((p) => p.plan_id === it.plan_id);
        if (!plan) throw new HttpError(400, "invalid_plan", `Unknown hosting plan "${it.plan_id}".`);
        out.push({
          type,
          domain,
          plan_id: plan.plan_id,
          plan_name: plan.name,
          duration_days: plan.duration_days,
          features: Array.isArray(plan.features) ? plan.features : [],
          price_usd: round2(plan.price_usd),
        });
      }
    } else if (type === "vps" || type === "rdp") {
      // Servers have no domain — price against the live vps/rdp catalog for the region.
      const region = normRegion(it?.region);
      const cacheKey = `${type}:${region}`;
      if (!serverPlans[cacheKey]) {
        serverPlans[cacheKey] = (await nomadly.get(`/${type}/plans`, { params: { region } })).data?.plans || [];
      }
      const plan = serverPlans[cacheKey].find((p) => p.plan_id === it.plan_id);
      if (!plan) throw new HttpError(400, "invalid_plan", `Unknown ${type.toUpperCase()} plan "${it.plan_id}".`);
      const price = Number(plan.price_usd);
      if (!Number.isFinite(price) || price <= 0) {
        throw new HttpError(400, "pricing_failed", `Could not price ${type.toUpperCase()} plan "${it.plan_id}".`);
      }
      out.push({
        type,
        plan_id: plan.plan_id,
        plan_name: plan.name || plan.plan_id,
        region,
        os: type === "vps" ? sanitizeOs(it?.os) : "windows",
        hostname: sanitizeHostname(it?.hostname),
        vcpus: plan.vcpus ?? null,
        ram_gb: plan.ram_gb ?? null,
        disk_gb: plan.disk_gb ?? null,
        price_usd: round2(price),
      });
    } else {
      throw new HttpError(400, "invalid_item", "Unsupported cart item type.");
    }
  }
  // Domains first so a bundled hosting account can attach to a registered name.
  out.sort((a, b) => (a.type === b.type ? 0 : a.type === "domain" ? -1 : 1));
  return out;
}

const walletUsd = (wallet) => Number(wallet?.balance?.get ? wallet.balance.get("USD") : wallet?.balance?.USD) || 0;

async function ensureWallet(userId) {
  const existing = await Wallet.findOne({ userId });
  if (existing) return existing;
  return Wallet.create({ userId });
}

// Atomic, overdraft-safe debit. Returns null when the balance can't cover it.
async function debitWallet(userId, amount) {
  await ensureWallet(userId);
  return Wallet.findOneAndUpdate(
    { userId, "balance.USD": { $gte: amount } },
    { $inc: { "balance.USD": -amount }, $set: { lastTransactionAt: new Date() } },
    { new: true }
  );
}

async function creditWallet(userId, amount, reference) {
  const wallet = await Wallet.findOneAndUpdate(
    { userId },
    { $inc: { "balance.USD": amount }, $set: { lastTransactionAt: new Date() } },
    { new: true }
  );
  await Transaction.create({
    userId,
    walletId: wallet._id,
    amount,
    currency: "USD",
    type: "credit",
    method: "wallet_refund",
    reference,
    status: "completed",
    from: "nameword",
  });
  return wallet;
}

// Current (non-expired) reward-point balance for a user.
async function getPointsBalance(userId) {
  const user = await User.findById(userId);
  if (!user) return 0;
  const bal = await user.rewardPoints();
  return Math.max(0, Number(bal) || 0);
}

// Clamp a redemption request to the user's balance and to 100% of the order.
function computeRedemption(requestedPoints, pointsBalance, subtotal) {
  const v = pointValueUsd();
  const req = Math.max(0, Number(requestedPoints) || 0);
  const maxByBalance = Math.max(0, Number(pointsBalance) || 0);
  const maxByOrder = v > 0 ? subtotal / v : 0; // up to 100% of the order
  const applied = round2(Math.min(req, maxByBalance, maxByOrder));
  const discount = round2(applied * v);
  return { applied, discount, point_value_usd: v };
}

async function logPoints(userId, points, operationType) {
  const p = round2(points);
  if (!(p > 0)) return;
  await RewardPointLog.create({ userId, rewardPoints: p, operationType });
}

async function provisionItem(item, mode, email) {
  try {
    let r;
    if (item.type === "domain") {
      const body = { domain: item.domain, ns_choice: item.ns_choice };
      if (item.ns_choice === "custom" && Array.isArray(item.nameservers) && item.nameservers.length) {
        body.nameservers = item.nameservers;
      }
      r = await nomadly.post("/domains/register", body);
      // Best-effort (live only): ensure the custom nameservers are actually applied.
      if (item.ns_choice === "custom" && r.data?.mode === "live" && item.nameservers?.length) {
        try {
          await nomadly.put(`/dns/${encodeURIComponent(item.domain)}/nameservers`, { nameservers: item.nameservers });
        } catch (e) {
          console.error("[checkout] set custom nameservers failed:", e?.message || e);
        }
      }
    } else if (item.type === "vps" || item.type === "rdp") {
      const body = { plan_id: item.plan_id, region: item.region };
      if (item.type === "vps" && item.os) body.os = item.os;
      if (item.hostname) body.hostname = item.hostname;
      r = await nomadly.post(`/${item.type}`, body);
    } else {
      r = await nomadly.post("/hosting", {
        plan_id: item.plan_id,
        domain: item.domain,
        domain_mode: "byo",
        email,
      });
    }
    const data = sanitizeUpstream(r.data || {});
    const live = data.mode === "live";
    return {
      status: live ? "active" : "test_mode",
      upstream: data,
      message: live ? "Provisioned." : "Test mode — validated and priced by the provider, nothing was provisioned.",
    };
  } catch (err) {
    const status = err.response?.status;
    const data = sanitizeUpstream(err.response?.data) || { error: "reseller_unreachable", message: err.message };
    // In the provider sandbox a 402 reflects the RESELLER's sandbox balance, not the buyer.
    if (mode === "dry_run" && status === 402) {
      return {
        status: "test_mode",
        upstream: data,
        message: "Test mode — order recorded; the provider sandbox did not provision.",
      };
    }
    return { status: "failed", upstream: data, message: data.message || "Provisioning failed." };
  }
}

const serviceFor = (item) =>
  item.type === "domain"
    ? "Domain Registration"
    : item.type === "hosting"
    ? "Premium Web Hosting"
    : item.type === "vps"
    ? "VPS Server"
    : item.type === "rdp"
    ? "RDP Server"
    : "Order";
const titleFor = (item) =>
  item.type === "domain"
    ? item.domain
    : item.type === "hosting"
    ? `${item.plan_name} — ${item.domain}`
    : `${item.plan_name} (${item.region})`;

class CheckoutController {
  // Public: validate + re-price a cart. Includes the buyer's wallet when signed in.
  static async quote(req, res) {
    try {
      const [items, mode] = await Promise.all([priceItems(req.body?.items), getMode()]);
      const subtotal_usd = round2(items.reduce((s, i) => s + i.price_usd, 0));
      const body = { success: true, mode, items, subtotal_usd, currency: "USD" };
      body.point_value_usd = pointValueUsd();
      if (req.user?.id) {
        const [wallet, pointsBalance] = await Promise.all([
          ensureWallet(req.user.id),
          getPointsBalance(req.user.id),
        ]);
        body.wallet_balance_usd = round2(walletUsd(wallet));

        // Reward points: what the buyer holds, and how much can be applied here.
        const { applied, discount, point_value_usd } = computeRedemption(
          req.body?.redeem_points,
          pointsBalance,
          subtotal_usd
        );
        body.points_balance = round2(pointsBalance);
        body.point_value_usd = point_value_usd;
        body.max_redeemable_points = round2(
          Math.min(pointsBalance, point_value_usd > 0 ? subtotal_usd / point_value_usd : 0)
        );
        body.points_applied = applied;
        body.points_discount_usd = discount;

        const payable_usd = round2(Math.max(0, subtotal_usd - discount));
        body.payable_usd = payable_usd;
        body.shortfall_usd = round2(Math.max(0, payable_usd - body.wallet_balance_usd));
      }
      return res.json(body);
    } catch (err) {
      return CheckoutController.fail(res, err);
    }
  }

  // Auth: charge the in-app wallet, then provision every item upstream.
  static async createOrder(req, res) {
    const userId = req.user.id;
    const clientOrderId = req.body?.client_order_id ? String(req.body.client_order_id).slice(0, 80) : null;
    try {
      if (clientOrderId) {
        const existing = await Order.findOne({ userId, clientOrderId });
        if (existing) return res.json({ success: true, idempotent: true, order: existing });
      }

      const [items, mode] = await Promise.all([priceItems(req.body?.items), getMode()]);
      const subtotal_usd = round2(items.reduce((s, i) => s + i.price_usd, 0));

      // Reward points redemption — clamp to the buyer's balance and 100% of the order.
      const pointsBalance = await getPointsBalance(userId);
      const { applied: points_redeemed, discount: points_discount_usd } = computeRedemption(
        req.body?.redeem_points,
        pointsBalance,
        subtotal_usd
      );
      const charged_usd = round2(Math.max(0, subtotal_usd - points_discount_usd));

      // Atomic, overdraft-safe debit of the CASH portion (points cover the rest).
      const wallet = await debitWallet(userId, charged_usd);
      if (!wallet) {
        const current = await Wallet.findOne({ userId });
        const balance = round2(walletUsd(current));
        return res.status(402).json({
          success: false,
          error: "insufficient_wallet_balance",
          message: "Your wallet balance can't cover this order. Top up and try again.",
          total_usd: subtotal_usd,
          points_discount_usd,
          payable_usd: charged_usd,
          wallet_balance_usd: balance,
          shortfall_usd: round2(charged_usd - balance),
        });
      }

      // Cash is committed → burn the redeemed points.
      if (points_redeemed > 0) {
        await logPoints(userId, points_redeemed, "debit");
      }

      let tx = null;
      if (charged_usd > 0) {
        tx = await Transaction.create({
          userId,
          walletId: wallet._id,
          amount: charged_usd,
          currency: "USD",
          type: "debit",
          method: "wallet_balance",
          reference: clientOrderId ? `checkout:${clientOrderId}` : `checkout:${Date.now()}`,
          status: "completed",
          from: "nameword",
        });
      }

      const order = new Order({
        userId,
        clientOrderId,
        mode,
        items,
        subtotal_usd,
        points_redeemed,
        points_discount_usd,
        charged_usd,
        transactionId: tx ? tx._id : undefined,
      });

      let refunded = 0; // cash refunded to wallet
      let pointsRestored = 0; // reward points restored on failed items
      for (const item of order.items) {
        const result = await provisionItem(item, mode, req.user.email);
        item.status = result.status;
        item.message = result.message;
        item.upstream = result.upstream;
        // Capture upstream identifiers so every "my X" view + management action
        // can be ownership-scoped to this buyer (C1). In dry_run these stay empty
        // and a stable synthetic ref (`<orderId>:<index>`) is used instead.
        Object.assign(item, ownership.extractProviderIds(item.type, result.upstream));
        if (result.status === "failed") {
          // Refund a failed item proportionally across the cash + points it was paid with.
          const cashShare =
            subtotal_usd > 0 ? round2(item.price_usd * (charged_usd / subtotal_usd)) : round2(item.price_usd);
          const pointsShareUsd = round2(item.price_usd - cashShare);
          if (cashShare > 0) {
            await creditWallet(userId, cashShare, `refund:${order.orderNumber || (tx && tx._id) || "order"}:${item.domain || item.plan_id || item.type}`);
          }
          if (pointsShareUsd > 0 && pointValueUsd() > 0) {
            const restore = round2(pointsShareUsd / pointValueUsd());
            await logPoints(userId, restore, "credit");
            pointsRestored = round2(pointsRestored + restore);
          }
          item.refunded_usd = round2(item.price_usd);
          refunded = round2(refunded + cashShare);
        } else {
          try {
            await createPaymentRecord({
              userId,
              service: serviceFor(item),
              title: titleFor(item),
              amount: item.price_usd,
              currency: "USD",
              paymentMethod: "wallet_balance",
              status: "completed",
              transactionId: tx ? tx._id : null,
              metadata: { checkout: true, mode, itemType: item.type, domain: item.domain, plan_id: item.plan_id || null },
            });
          } catch (e) {
            console.error("[checkout] payment record failed:", e?.message || e);
          }
        }
      }

      const failedCount = order.items.filter((i) => i.status === "failed").length;
      order.refunded_usd = refunded;
      order.points_restored = pointsRestored;
      order.status = failedCount === order.items.length ? "failed" : failedCount > 0 ? "partial" : "paid";

      // Earn reward points on the NET cash actually kept by the business.
      const netCash = round2(Math.max(0, charged_usd - refunded));
      const points_earned = round2(netCash * purchaseRewardRate());
      if (points_earned > 0) {
        await logPoints(userId, points_earned, "credit");
      }
      order.points_earned = points_earned;

      const after = await Wallet.findOne({ userId });
      order.wallet_balance_after_usd = round2(walletUsd(after));
      await order.save();

      return res.status(201).json({ success: true, order });
    } catch (err) {
      return CheckoutController.fail(res, err);
    }
  }

  static async listOrders(req, res) {
    try {
      const orders = await Order.find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .limit(50)
        .select("-items.upstream");
      return res.json({ success: true, orders });
    } catch (err) {
      return CheckoutController.fail(res, err);
    }
  }

  static async getOrder(req, res) {
    try {
      const id = String(req.params.id || "");
      if (!/^[a-f0-9]{24}$/i.test(id)) throw new HttpError(404, "not_found", "Order not found.");
      const order = await Order.findOne({ _id: id, userId: req.user.id });
      if (!order) throw new HttpError(404, "not_found", "Order not found.");
      return res.json({ success: true, order });
    } catch (err) {
      return CheckoutController.fail(res, err);
    }
  }

  static fail(res, err) {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ success: false, error: err.code, message: err.message, ...err.extra });
    }
    if (err.response) {
      const d = err.response.data || {};
      return res.status(err.response.status).json({
        success: false,
        error: d.error || "reseller_error",
        message: d.message || "The provider rejected the request.",
      });
    }
    console.error("[checkout] error:", err);
    return res.status(500).json({ success: false, error: "internal_error", message: err.message || "Checkout failed." });
  }
}

module.exports = CheckoutController;
