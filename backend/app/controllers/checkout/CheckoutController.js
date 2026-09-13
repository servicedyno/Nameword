const { nomadly } = require("../../services/nomadlyReseller");
const Wallet = require("../../models/Wallet");
const Transaction = require("../../models/Transaction");
const Order = require("../../models/Order");
const User = require("../../models/User");
const RewardPointLog = require("../../models/RewardPointLog");
const ownership = require("../../services/ownership");
const { createPaymentRecord } = require("../../utils/paymentHelper");
const { createCryptoPayment, getPaymentStatus, getSupportedCurrencies, getConfiguredCoins, ensureWallet: ensureDynoWallet } = require("../../helpers/dynoPayHelper");

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

// --- C3: reconcile an order's display aggregates + reward-points ledger -------
// Wallet debits/credits already happen inline during provisioning/refund/retry;
// this only recomputes the order's stored aggregates from its items and applies
// an idempotent delta to the points a buyer earned (never double-grants).
async function recomputeOrderFinancials(order) {
  const userId = order.userId;
  const items = order.items || [];
  const netCash = round2(items.reduce((s, i) => s + (Number(i.cash_charged_usd) || 0), 0));
  const refundedCash = round2(items.reduce((s, i) => s + (Number(i.refunded_usd) || 0), 0));
  const committedPointsUsd = round2(items.reduce((s, i) => s + (Number(i.points_charged_usd) || 0), 0));

  order.charged_usd = netCash;
  order.refunded_usd = refundedCash;
  const pv = pointValueUsd();
  order.points_restored = pv > 0 ? round2(Math.max(0, order.points_discount_usd - committedPointsUsd) / pv) : 0;

  // Reward points are earned ONLY when funding with crypto (wallet top-up, or a
  // direct crypto order). An order paid from wallet balance earns nothing here.
  // (points_earned is set elsewhere for crypto orders; left untouched for wallet.)

  const failed = items.filter((i) => i.status === "failed").length;
  order.status = items.length && failed === items.length ? "failed" : failed > 0 ? "partial" : "paid";

  const after = await Wallet.findOne({ userId });
  order.wallet_balance_after_usd = round2(walletUsd(after));
}

// --- C3: best-effort live provider status for one item (status poll) ---------
async function syncItemLive(item) {
  try {
    if (item.type === "domain") {
      if (item.status === "active") item.live_status = "active";
      return;
    }
    if (item.type === "vps" || item.type === "rdp") {
      if (!item.provider_id || item.status !== "active") return;
      const r = await nomadly.get(`/${item.type}/${encodeURIComponent(item.provider_id)}`, { timeout: 10000 });
      const d = r.data || {};
      const live = String(d.live?.status || d.status || "").toLowerCase();
      if (live) item.live_status = live;
    } else if (item.type === "hosting") {
      if (!item.provider_username || item.status !== "active") return;
      const r = await nomadly.get(`/hosting/${encodeURIComponent(item.provider_username)}`, { timeout: 10000 });
      const d = r.data || {};
      item.live_status = d.suspended ? "suspended" : "active";
    }
  } catch (_) {
    /* best-effort — a slow/failed provider read must never break the poll */
  }
}

// --- C2: renewal helpers ------------------------------------------------------
// Term length for a fresh term. Hosting uses its plan duration; everything else
// uses a sane default (domain = 1yr, vps/rdp = 30d).
function computeTermDays(item) {
  if (item.type === "hosting") return Number(item.duration_days) || 30;
  if (item.type === "domain") return 365;
  return 30; // vps / rdp
}

// Which renewals the PROVIDER can actually fulfil. In dry_run everything is
// simulated (in-app charge, no upstream). In LIVE only hosting renews upstream
// (POST /hosting/:user/renew); domain renew returns 501 provider-side and
// vps/rdp have no renew endpoint yet, so we refuse those cleanly (no charge).
function providerRenewSupported(type, mode) {
  if (type === "hosting") return true;
  return mode === "dry_run";
}

// Live renewal price. Falls back to the price originally paid for the item.
async function priceRenewal(item) {
  try {
    if (item.type === "hosting") {
      const plans = (await nomadly.get("/hosting/plans")).data?.plans || [];
      const p = plans.find((x) => x.plan_id === item.plan_id);
      if (Number(p?.price_usd) > 0) return round2(p.price_usd);
    } else if (item.type === "domain") {
      const d = (await nomadly.get("/domains/search", { params: { domain: item.domain } })).data || {};
      if (Number(d.price_usd) > 0) return round2(d.price_usd);
    } else if (item.type === "vps" || item.type === "rdp") {
      const plans =
        (await nomadly.get(`/${item.type}/plans`, { params: { region: item.region || "EU" } })).data?.plans || [];
      const p = plans.find((x) => x.plan_id === item.plan_id);
      if (Number(p?.price_usd) > 0) return round2(p.price_usd);
    }
  } catch (_) {
    /* fall through to the original price */
  }
  return round2(Number(item.price_usd) || 0);
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
        // Reward points are ALWAYS auto-applied (max redeemable) so the buyer
        // only pays the remaining balance via crypto or wallet.
        const { applied, discount, point_value_usd } = computeRedemption(
          pointsBalance,
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

  // Auth: charge the in-app wallet, record the order as PENDING, return 201
  // immediately, then provision every item in the BACKGROUND (C3). The heavy
  // per-item provider calls no longer block the checkout response — the receipt
  // page polls GET /orders/:id/status until each item reaches a terminal state.
  static async createOrder(req, res) {
    const userId = req.user.id;
    const clientOrderId = req.body?.client_order_id ? String(req.body.client_order_id).slice(0, 80) : null;
    try {
      if (clientOrderId) {
        const existing = await Order.findOne({ userId, clientOrderId });
        if (existing) {
          return res
            .status(existing.provisioning === "complete" ? 200 : 202)
            .json({ success: true, idempotent: true, order: existing });
        }
      }

      const [items, mode] = await Promise.all([priceItems(req.body?.items), getMode()]);
      const subtotal_usd = round2(items.reduce((s, i) => s + i.price_usd, 0));

      // Reward points redemption — clamp to the buyer's balance and 100% of the order.
      const pointsBalance = await getPointsBalance(userId);
      // Reward points are ALWAYS auto-applied (max redeemable); the remaining
      // balance is paid from wallet. The frontend no longer opts in.
      const { applied: points_redeemed, discount: points_discount_usd } = computeRedemption(
        pointsBalance,
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

      // Split the committed cash + points across items so each can be refunded /
      // retried independently later (C3). Reconcile rounding on the last item.
      let cashAcc = 0;
      let ptsAcc = 0;
      items.forEach((it, i) => {
        it.status = "pending";
        it.attempts = 0;
        if (i < items.length - 1 && subtotal_usd > 0) {
          it.cash_charged_usd = round2(it.price_usd * (charged_usd / subtotal_usd));
          it.points_charged_usd = round2(it.price_usd - it.cash_charged_usd);
        } else {
          it.cash_charged_usd = round2(charged_usd - cashAcc);
          it.points_charged_usd = round2(points_discount_usd - ptsAcc);
        }
        cashAcc = round2(cashAcc + it.cash_charged_usd);
        ptsAcc = round2(ptsAcc + it.points_charged_usd);
      });

      const order = new Order({
        userId,
        clientOrderId,
        mode,
        items,
        subtotal_usd,
        points_redeemed,
        points_discount_usd,
        charged_usd,
        points_earned: 0,
        transactionId: tx ? tx._id : undefined,
        provisioning: "pending",
        provisioningLockedAt: null,
      });
      await order.save();

      // Provision off-request; a safety-net cron re-picks any order left stuck.
      setImmediate(() => {
        CheckoutController.processOrder(order._id).catch((e) =>
          console.error("[checkout] background processOrder failed:", e?.message || e)
        );
      });

      return res.status(201).json({ success: true, order });
    } catch (err) {
      return CheckoutController.fail(res, err);
    }
  }

  // C3: background provisioner. Idempotent + lock-guarded so the in-request
  // kick-off and the safety-net cron never double-provision the same item.
  static async processOrder(orderId) {
    const cutoff = new Date(Date.now() - 5 * 60 * 1000);
    const order = await Order.findOneAndUpdate(
      {
        _id: orderId,
        provisioning: { $in: ["pending", "processing"] },
        $or: [{ provisioningLockedAt: null }, { provisioningLockedAt: { $lte: cutoff } }],
      },
      { $set: { provisioning: "processing", provisioningLockedAt: new Date() } },
      { new: true }
    );
    if (!order) return; // already complete, or claimed by another worker

    try {
      const user = await User.findById(order.userId);
      const email = user?.email;
      const tx = order.transactionId;

      for (const item of order.items) {
        if (item.status !== "pending") continue;
        item.attempts = (Number(item.attempts) || 0) + 1;
        const result = await provisionItem(item, order.mode, email);
        item.status = result.status;
        item.message = result.message;
        item.upstream = result.upstream;
        item.provisionedAt = new Date();
        Object.assign(item, ownership.extractProviderIds(item.type, result.upstream));

        if (result.status === "failed") {
          // Refund the cash + points currently committed to THIS item.
          const cash = round2(Number(item.cash_charged_usd) || 0);
          const ptsUsd = round2(Number(item.points_charged_usd) || 0);
          if (cash > 0) {
            await creditWallet(
              order.userId,
              cash,
              `refund:${order.orderNumber}:${item.domain || item.plan_id || item.type}`
            );
          }
          if (ptsUsd > 0 && pointValueUsd() > 0) {
            await logPoints(order.userId, round2(ptsUsd / pointValueUsd()), "credit");
          }
          item.refunded_usd = round2(cash + ptsUsd);
          item.cash_charged_usd = 0;
          item.points_charged_usd = 0;
        } else {
          try {
            await createPaymentRecord({
              userId: order.userId,
              service: serviceFor(item),
              title: titleFor(item),
              amount: item.price_usd,
              currency: "USD",
              paymentMethod: "wallet_balance",
              status: "completed",
              transactionId: tx || null,
              metadata: {
                checkout: true,
                mode: order.mode,
                itemType: item.type,
                domain: item.domain,
                plan_id: item.plan_id || null,
                orderNumber: order.orderNumber,
              },
            });
          } catch (e) {
            console.error("[checkout] payment record failed:", e?.message || e);
          }
          // C2: start the renewal clock for a successfully-provisioned item.
          const term = computeTermDays(item);
          item.term_days = term;
          if (!item.expires_at) {
            item.expires_at = new Date(Date.now() + term * 86400000);
          }
        }
        order.markModified("items");
        await order.save(); // persist per-item progress so the status poll sees it
      }

      await recomputeOrderFinancials(order);
      order.provisioning = "complete";
      order.provisioningLockedAt = null;
      order.markModified("items");
      await order.save();

      // C4: order confirmation / receipt email (best-effort, non-blocking).
      try {
        const { sendOrderConfirmation } = require("../../services/orderEmail");
        await sendOrderConfirmation({
          to: email,
          order,
          name: user?.name || user?.firstName || null,
        });
      } catch (e) {
        console.error("[checkout] order email failed (non-blocking):", e?.message || e);
      }
    } catch (err) {
      console.error("[checkout] processOrder error:", err?.message || err);
      // Leave the lock to expire; the safety-net cron reclaims and finishes it.
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

  // C3: lightweight poll for the receipt page. Best-effort live provider sync;
  // in dry_run there are no provider ids so this returns the stored statuses.
  static async getOrderStatus(req, res) {
    try {
      const id = String(req.params.id || "");
      if (!/^[a-f0-9]{24}$/i.test(id)) throw new HttpError(404, "not_found", "Order not found.");
      const order = await Order.findOne({ _id: id, userId: req.user.id });
      if (!order) throw new HttpError(404, "not_found", "Order not found.");

      // Best-effort live provider sync — LIVE mode only (dry_run has no provider
      // ids). We do NOT persist here: saving a second copy of the order would
      // race the background worker's save and trigger a version conflict. The
      // cached live_status is a convenience that the worker owns; the poll just
      // computes+returns the freshest value.
      if (order.mode === "live") {
        await Promise.allSettled((order.items || []).map((it) => syncItemLive(it)));
      }

      const items = (order.items || []).map((it, idx) => ({
        idx,
        type: it.type,
        title: titleFor(it),
        status: it.status,
        live_status: it.live_status || null,
        message: it.message || null,
        provider_id: it.provider_id || null,
        provider_username: it.provider_username || null,
        panel_url: it.panel_url || null,
        server_ip: it.server_ip || null,
        refunded_usd: round2(Number(it.refunded_usd) || 0),
        attempts: Number(it.attempts) || 0,
        price_usd: round2(Number(it.price_usd) || 0),
      }));
      const anyPending = items.some((i) => i.status === "pending");
      const wallet = await Wallet.findOne({ userId: req.user.id });
      return res.json({
        success: true,
        order_id: String(order._id),
        order_number: order.orderNumber,
        mode: order.mode,
        provisioning: order.provisioning,
        settled: order.provisioning === "complete" && !anyPending,
        status: order.status,
        items,
        charged_usd: round2(Number(order.charged_usd) || 0),
        refunded_usd: round2(Number(order.refunded_usd) || 0),
        points_earned: round2(Number(order.points_earned) || 0),
        points_restored: round2(Number(order.points_restored) || 0),
        wallet_balance_usd: round2(walletUsd(wallet)),
      });
    } catch (err) {
      return CheckoutController.fail(res, err);
    }
  }

  // C3: retry a single FAILED item. Re-charges its price in cash (the original
  // cash + points were already refunded on failure), then re-provisions it.
  static async retryItem(req, res) {
    const userId = req.user.id;
    try {
      const id = String(req.params.id || "");
      const idx = parseInt(req.params.idx, 10);
      if (!/^[a-f0-9]{24}$/i.test(id)) throw new HttpError(404, "not_found", "Order not found.");
      const order = await Order.findOne({ _id: id, userId });
      if (!order) throw new HttpError(404, "not_found", "Order not found.");
      if (!Number.isInteger(idx) || idx < 0 || idx >= order.items.length) {
        throw new HttpError(404, "not_found", "Order item not found.");
      }
      const item = order.items[idx];
      if (item.status !== "failed") {
        throw new HttpError(409, "not_retryable", "Only a failed item can be retried.");
      }

      const price = round2(Number(item.price_usd) || 0);
      const wallet = await debitWallet(userId, price);
      if (!wallet) {
        const current = await Wallet.findOne({ userId });
        const balance = round2(walletUsd(current));
        return res.status(402).json({
          success: false,
          error: "insufficient_wallet_balance",
          message: "Top up your wallet to retry this item.",
          payable_usd: price,
          wallet_balance_usd: balance,
          shortfall_usd: round2(price - balance),
        });
      }
      await Transaction.create({
        userId,
        walletId: wallet._id,
        amount: price,
        currency: "USD",
        type: "debit",
        method: "wallet_balance",
        reference: `retry:${order.orderNumber}:${idx}`,
        status: "completed",
        from: "nameword",
      });

      // Reset the item to pending with fresh committed cash (no points on retry).
      item.status = "pending";
      item.message = "Retrying…";
      item.refunded_usd = 0;
      item.cash_charged_usd = price;
      item.points_charged_usd = 0;
      item.upstream = undefined;
      item.provider_id = undefined;
      item.provider_username = undefined;
      item.panel_url = undefined;
      item.server_ip = undefined;
      item.live_status = undefined;
      order.provisioning = "pending";
      order.provisioningLockedAt = null;
      order.markModified("items");
      await order.save();

      setImmediate(() => {
        CheckoutController.processOrder(order._id).catch((e) =>
          console.error("[checkout] retry processOrder failed:", e?.message || e)
        );
      });
      return res.status(202).json({ success: true, order });
    } catch (err) {
      return CheckoutController.fail(res, err);
    }
  }

  // C2: shared renewal core — used by the renew endpoint AND the auto-renew job.
  // Charges the buyer's in-app wallet, renews upstream where the provider
  // supports it (live hosting), extends expires_at, awards points. Returns a
  // structured result ({ ok, ... }) instead of touching res.
  static async performRenewal(order, idx) {
    const item = order.items[idx];
    if (!item) return { ok: false, status: 404, code: "not_found", message: "Order item not found." };
    if (item.status === "failed") {
      return { ok: false, status: 409, code: "not_renewable", message: "This item hasn't been provisioned." };
    }
    const mode = order.mode;
    if (mode === "live" && !providerRenewSupported(item.type, mode)) {
      return {
        ok: false,
        status: 409,
        code: "renewal_not_supported",
        message:
          item.type === "domain"
            ? "Domain renewal isn't available from the provider yet."
            : `Renewal for ${item.type.toUpperCase()} isn't supported by the provider yet.`,
      };
    }

    const price = await priceRenewal(item);
    const wallet = await debitWallet(order.userId, price);
    if (!wallet) {
      const cur = await Wallet.findOne({ userId: order.userId });
      const bal = round2(walletUsd(cur));
      return {
        ok: false,
        status: 402,
        code: "insufficient_wallet_balance",
        message: "Top up your wallet to renew.",
        price_usd: price,
        wallet_balance_usd: bal,
        shortfall_usd: round2(price - bal),
      };
    }

    // Renew upstream (live hosting only). Refund + fail cleanly if the provider errors.
    if (mode === "live" && item.type === "hosting" && item.provider_username) {
      try {
        await nomadly.post(`/hosting/${encodeURIComponent(item.provider_username)}/renew`);
      } catch (e) {
        await creditWallet(order.userId, price, `renew-refund:${order.orderNumber}:${idx}`);
        return {
          ok: false,
          status: 502,
          code: "provisioning_failed",
          message: e.response?.data?.message || "Renewal failed at the provider; you were refunded.",
        };
      }
    }

    const tx = await Transaction.create({
      userId: order.userId,
      walletId: wallet._id,
      amount: price,
      currency: "USD",
      type: "debit",
      method: "wallet_balance",
      reference: `renew:${order.orderNumber}:${idx}`,
      status: "completed",
      from: "nameword",
    });

    const term = computeTermDays(item);
    const now = new Date();
    const base = item.expires_at && new Date(item.expires_at) > now ? new Date(item.expires_at) : now;
    item.expires_at = new Date(base.getTime() + term * 86400000);
    item.term_days = term;
    item.renewed_at = now;

    try {
      await createPaymentRecord({
        userId: order.userId,
        service: `${serviceFor(item)} Renewal`,
        title: titleFor(item),
        amount: price,
        currency: "USD",
        paymentMethod: "wallet_balance",
        status: "completed",
        transactionId: tx._id,
        metadata: { renewal: true, mode, itemType: item.type, orderNumber: order.orderNumber },
      });
    } catch (e) {
      console.error("[checkout] renewal payment record failed:", e?.message || e);
    }

    order.markModified("items");
    await order.save();
    const after = await Wallet.findOne({ userId: order.userId });
    return {
      ok: true,
      charged_usd: price,
      wallet_balance_usd: round2(walletUsd(after)),
      expires_at: item.expires_at,
      item,
    };
  }

  // C2: renew a single owned item (ownership-gated), buyer-wallet-billed.
  static async renewItem(req, res) {
    try {
      const id = String(req.params.id || "");
      const idx = parseInt(req.params.idx, 10);
      if (!/^[a-f0-9]{24}$/i.test(id)) throw new HttpError(404, "not_found", "Order not found.");
      const order = await Order.findOne({ _id: id, userId: req.user.id });
      if (!order) throw new HttpError(404, "not_found", "Order not found.");
      if (!Number.isInteger(idx) || idx < 0 || idx >= order.items.length) {
        throw new HttpError(404, "not_found", "Order item not found.");
      }
      const result = await CheckoutController.performRenewal(order, idx);
      if (!result.ok) {
        return res.status(result.status).json({
          success: false,
          error: result.code,
          message: result.message,
          ...(result.price_usd != null ? { price_usd: result.price_usd } : {}),
          ...(result.wallet_balance_usd != null ? { wallet_balance_usd: result.wallet_balance_usd } : {}),
          ...(result.shortfall_usd != null ? { shortfall_usd: result.shortfall_usd } : {}),
        });
      }
      return res.json({
        success: true,
        idx,
        charged_usd: result.charged_usd,
        wallet_balance_usd: result.wallet_balance_usd,
        expires_at: result.expires_at,
        status: result.item.status,
        auto_renew: !!result.item.auto_renew,
      });
    } catch (err) {
      return CheckoutController.fail(res, err);
    }
  }

  // C2: toggle auto-renew on an owned item (ownership-gated).
  static async setAutoRenew(req, res) {
    try {
      const id = String(req.params.id || "");
      const idx = parseInt(req.params.idx, 10);
      if (!/^[a-f0-9]{24}$/i.test(id)) throw new HttpError(404, "not_found", "Order not found.");
      const order = await Order.findOne({ _id: id, userId: req.user.id });
      if (!order) throw new HttpError(404, "not_found", "Order not found.");
      if (!Number.isInteger(idx) || idx < 0 || idx >= order.items.length) {
        throw new HttpError(404, "not_found", "Order item not found.");
      }
      const enabled = req.body?.enabled === true || req.body?.enabled === "true";
      order.items[idx].auto_renew = enabled;
      order.markModified("items");
      await order.save();
      return res.json({ success: true, idx, auto_renew: enabled });
    } catch (err) {
      return CheckoutController.fail(res, err);
    }
  }

  // C2: unified per-buyer "expiring soon" list across domains/hosting/vps/rdp.
  static async listRenewals(req, res) {
    try {
      const userId = req.user.id;
      const daysParam = parseInt(req.query.days, 10);
      const withinDays = Number.isFinite(daysParam) ? daysParam : 30;
      const now = Date.now();
      const out = [];
      for (const t of ["domain", "hosting", "vps", "rdp"]) {
        const list = await ownership.ownedList(userId, t);
        for (const e of list) {
          const it = e.item;
          const exp = it.expires_at ? new Date(it.expires_at) : null;
          const days = exp ? Math.ceil((exp.getTime() - now) / 86400000) : null;
          const bucket = days == null ? "unknown" : days < 0 ? "expired" : days <= 7 ? "expiring_soon" : "upcoming";
          if (days != null && bucket !== "expired" && days > withinDays) continue;
          out.push({
            order_id: e.order_id,
            idx: e.idx,
            type: t,
            ref: e.ref,
            title: titleFor(it),
            domain: it.domain || null,
            plan: it.plan_name || null,
            status: it.status,
            expires_at: exp,
            days_until_expiry: days,
            bucket,
            auto_renew: !!it.auto_renew,
            renewable: providerRenewSupported(t, e.mode),
            price_hint_usd: round2(Number(it.price_usd) || 0),
          });
        }
      }
      out.sort((a, b) => (a.days_until_expiry ?? 1e9) - (b.days_until_expiry ?? 1e9));
      return res.json({
        success: true,
        within_days: withinDays,
        count: out.length,
        summary: {
          expired: out.filter((x) => x.bucket === "expired").length,
          expiring_soon: out.filter((x) => x.bucket === "expiring_soon").length,
          upcoming: out.filter((x) => x.bucket === "upcoming").length,
        },
        renewals: out,
      });
    } catch (err) {
      return CheckoutController.fail(res, err);
    }
  }

  // POST /checkout/orders/crypto — pay for an order DIRECTLY with crypto (bypasses
  // the wallet). Auto-redeems points, bills the remaining balance in crypto, and
  // earns reward points on the crypto paid (like a top-up) once it confirms.
  static async createCryptoOrder(req, res) {
    const userId = req.user.id;
    const clientOrderId = req.body?.client_order_id ? String(req.body.client_order_id).slice(0, 80) : null;
    try {
      if (clientOrderId) {
        const existing = await Order.findOne({ userId, clientOrderId });
        if (existing) {
          const p = existing.crypto || null;
          return res.status(200).json({
            success: true,
            idempotent: true,
            order: existing,
            payment: p ? { orderId: String(existing._id), paymentId: p.paymentId, address: p.address, destinationTag: p.destinationTag, currency: p.currency, cryptoAmount: p.cryptoAmount, amountUsd: p.amountUsd, qrCode: p.qrCode, expireAt: p.expireAt } : null,
          });
        }
      }
      const cur = String(req.body?.currency || "").toUpperCase().trim();
      if (!cur) return res.status(400).json({ success: false, message: "Please choose a cryptocurrency." });

      const [items, mode] = await Promise.all([priceItems(req.body?.items), getMode()]);
      const subtotal_usd = round2(items.reduce((s, i) => s + i.price_usd, 0));

      // Points are ALWAYS auto-applied (max redeemable).
      const pointsBalance = await getPointsBalance(userId);
      const { applied: points_redeemed, discount: points_discount_usd } = computeRedemption(pointsBalance, pointsBalance, subtotal_usd);
      const charged_usd = round2(Math.max(0, subtotal_usd - points_discount_usd));

      // Split committed cash + points across items (reconcile rounding on the last).
      let cashAcc = 0, ptsAcc = 0;
      items.forEach((it, i) => {
        it.status = "pending";
        it.attempts = 0;
        if (i < items.length - 1 && subtotal_usd > 0) {
          it.cash_charged_usd = round2(it.price_usd * (charged_usd / subtotal_usd));
          it.points_charged_usd = round2(it.price_usd - it.cash_charged_usd);
        } else {
          it.cash_charged_usd = round2(charged_usd - cashAcc);
          it.points_charged_usd = round2(points_discount_usd - ptsAcc);
        }
        cashAcc = round2(cashAcc + it.cash_charged_usd);
        ptsAcc = round2(ptsAcc + it.points_charged_usd);
      });

      // Fully covered by points → no crypto needed. Provision immediately.
      if (charged_usd <= 0) {
        if (points_redeemed > 0) await logPoints(userId, points_redeemed, "debit");
        const order0 = new Order({
          userId, clientOrderId, mode, items,
          subtotal_usd, points_redeemed, points_discount_usd, points_earned: 0,
          charged_usd: 0, payment_method: "crypto", payment_status: "paid",
          status: "paid", provisioning: "pending",
        });
        await order0.save();
        setImmediate(() => CheckoutController.processOrder(order0._id).catch((e) => console.error("[checkout] crypto(points-only) processOrder:", e?.message || e)));
        return res.status(201).json({ success: true, fully_covered: true, order: order0 });
      }

      // Validate the coin against the merchant's live configured coins.
      try {
        const supported = await getSupportedCurrencies();
        const live = (supported?.data?.currencies || supported?.data?.all_supported || []).map((c) => String(c).toUpperCase());
        const allow = getConfiguredCoins();
        const effective = allow.length ? live.filter((c) => allow.includes(c)) : live;
        if (effective.length && !effective.includes(cur)) {
          return res.status(400).json({ success: false, message: `${cur} is not available. Please choose one of: ${effective.join(", ")}.`, supported: effective });
        }
      } catch (e) { /* non-fatal */ }

      let walletToken = null;
      try { walletToken = await ensureDynoWallet(userId); } catch (e) { /* optional */ }

      const frontendBase = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
      const meta_data = { user_id: String(userId), userId: String(userId), amount: charged_usd, product: "order_payment", frontendEndPoint: "cart" };
      const resp = await createCryptoPayment({ amount: charged_usd, currency: cur, redirect_uri: `${frontendBase}/cart`, meta_data, walletToken });
      const d = resp?.data || {};
      if (!d.address || !d.transaction_id) {
        return res.status(502).json({ success: false, message: "Could not generate a crypto payment address. Please try again.", providerPayload: d });
      }
      const destinationTag = (d.destination_tag ?? d.payment?.crypto?.destination_tag ?? d.memo ?? null);
      const tagStr = destinationTag == null ? null : String(destinationTag);
      const expireAt = new Date(Date.now() + Math.max(1, Number(process.env.CRYPTO_TOPUP_EXPIRE_HOURS) || 3) * 3600 * 1000);

      // Burn the redeemed points now (held); refunded if the payment window expires.
      if (points_redeemed > 0) await logPoints(userId, points_redeemed, "debit");

      const order = new Order({
        userId, clientOrderId, mode, items,
        subtotal_usd, points_redeemed, points_discount_usd, points_earned: 0,
        charged_usd, payment_method: "crypto", payment_status: "awaiting_payment",
        status: "awaiting_payment", provisioning: "awaiting_payment",
        crypto: {
          paymentId: d.transaction_id, address: d.address, destinationTag: tagStr,
          currency: d.currency || cur, cryptoAmount: Number(d.amount) || null,
          amountUsd: Number(d.base_amount) || charged_usd, qrCode: d.qr_code || null,
          status: "pending", expireAt,
        },
      });
      await order.save();

      return res.status(201).json({
        success: true,
        order: { _id: order._id, orderNumber: order.orderNumber, subtotal_usd, points_discount_usd, charged_usd },
        payment: {
          orderId: String(order._id), paymentId: d.transaction_id, address: d.address, destinationTag: tagStr,
          currency: d.currency || cur, cryptoAmount: Number(d.amount) || null,
          amountUsd: Number(d.base_amount) || charged_usd, qrCode: d.qr_code || null, expireAt,
        },
      });
    } catch (err) {
      return CheckoutController.fail(res, err);
    }
  }

  // GET /checkout/orders/:id/crypto-status — poll DynoPay; on confirmation, earn
  // points on the crypto paid then provision. Refund held points if it expires.
  static async getCryptoOrderStatus(req, res) {
    try {
      const userId = req.user.id;
      const order = await Order.findOne({ _id: req.params.id, userId });
      if (!order) return res.status(404).json({ success: false, message: "Order not found." });
      if (order.payment_method !== "crypto" || order.payment_status === "paid") {
        return res.status(200).json({ success: true, data: { status: "paid", order } });
      }

      const pay = order.crypto || {};
      const expired = pay.expireAt && new Date(pay.expireAt) <= new Date();

      let statusData = null;
      try { const ps = await getPaymentStatus(pay.paymentId); statusData = ps?.data || null; } catch (e) { statusData = null; }
      const rawStatus = String(statusData?.payment_status || statusData?.status || "").toLowerCase();
      const isPaid = statusData?.is_paid === true || ["paid", "confirmed", "settled", "successful", "success", "completed"].includes(rawStatus);
      const txHash = statusData?.incoming_tx_hash || null;

      if (isPaid) {
        order.payment_status = "paid";
        if (order.crypto) { order.crypto.status = "paid"; order.crypto.txHash = txHash; }
        const { getWalletTopupRewardRate, addWalletTopupRewardPoints } = require("../wallet/WalletController");
        const earned = round2((Number(order.charged_usd) || 0) * getWalletTopupRewardRate());
        order.points_earned = earned;
        order.provisioning = "pending";
        order.markModified("crypto");
        await order.save();
        if (Number(order.charged_usd) > 0) await addWalletTopupRewardPoints(userId, Number(order.charged_usd));
        await CheckoutController.processOrder(order._id);
        const fresh = await Order.findById(order._id);
        return res.status(200).json({ success: true, data: { status: "paid", order: fresh } });
      }

      if (expired) {
        if (order.payment_status !== "expired") {
          order.payment_status = "expired";
          order.status = "failed";
          if (order.crypto) order.crypto.status = "expired";
          if (Number(order.points_redeemed) > 0) await logPoints(userId, Number(order.points_redeemed), "credit");
          order.markModified("crypto");
          await order.save();
        }
        return res.status(200).json({ success: true, data: { status: "expired", order } });
      }

      let friendly = "pending";
      if (["confirming", "processing", "detected"].includes(rawStatus)) friendly = "confirming";
      else if (["failed", "cancelled", "canceled"].includes(rawStatus)) friendly = "failed";
      if (friendly === "failed" && order.payment_status !== "failed") {
        order.payment_status = "failed";
        if (order.crypto) order.crypto.status = "failed";
        if (Number(order.points_redeemed) > 0) await logPoints(userId, Number(order.points_redeemed), "credit");
        order.markModified("crypto");
        await order.save();
      }
      return res.status(200).json({ success: true, data: { status: friendly, orderId: String(order._id), confirmations: statusData?.confirmations, requiredConfirmations: statusData?.required_confirmations } });
    } catch (error) {
      return res.status(500).json({ success: false, message: error?.message || "Failed to check payment status." });
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
