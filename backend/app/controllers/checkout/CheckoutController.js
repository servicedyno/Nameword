const { nomadly } = require("../../services/nomadlyReseller");
const Wallet = require("../../models/Wallet");
const Transaction = require("../../models/Transaction");
const Order = require("../../models/Order");
const { createPaymentRecord } = require("../../utils/paymentHelper");

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
const round2 = (n) => Math.round(Number(n) * 100) / 100;
const normDomain = (d) => String(d || "").trim().toLowerCase();
const SENSITIVE_RE = /password|pin|secret|token/i;

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
  const out = [];
  const seen = new Set();
  for (const it of rawItems) {
    const type = it?.type;
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
      out.push({
        type,
        domain,
        ns_choice: it.ns_choice === "registrar" ? "registrar" : "cloudflare",
        registrar: d.registrar || null,
        price_usd: round2(price),
      });
    } else if (type === "hosting") {
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

async function provisionItem(item, mode, email) {
  try {
    const r =
      item.type === "domain"
        ? await nomadly.post("/domains/register", { domain: item.domain, ns_choice: item.ns_choice })
        : await nomadly.post("/hosting", {
            plan_id: item.plan_id,
            domain: item.domain,
            domain_mode: "byo",
            email,
          });
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

const serviceFor = (item) => (item.type === "domain" ? "Domain Registration" : "Premium Web Hosting");
const titleFor = (item) => (item.type === "domain" ? item.domain : `${item.plan_name} — ${item.domain}`);

class CheckoutController {
  // Public: validate + re-price a cart. Includes the buyer's wallet when signed in.
  static async quote(req, res) {
    try {
      const [items, mode] = await Promise.all([priceItems(req.body?.items), getMode()]);
      const subtotal_usd = round2(items.reduce((s, i) => s + i.price_usd, 0));
      const body = { success: true, mode, items, subtotal_usd, currency: "USD" };
      if (req.user?.id) {
        const wallet = await ensureWallet(req.user.id);
        body.wallet_balance_usd = round2(walletUsd(wallet));
        body.shortfall_usd = round2(Math.max(0, subtotal_usd - body.wallet_balance_usd));
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

      const wallet = await debitWallet(userId, subtotal_usd);
      if (!wallet) {
        const current = await Wallet.findOne({ userId });
        const balance = round2(walletUsd(current));
        return res.status(402).json({
          success: false,
          error: "insufficient_wallet_balance",
          message: "Your wallet balance can't cover this order. Top up and try again.",
          total_usd: subtotal_usd,
          wallet_balance_usd: balance,
          shortfall_usd: round2(subtotal_usd - balance),
        });
      }

      const tx = await Transaction.create({
        userId,
        walletId: wallet._id,
        amount: subtotal_usd,
        currency: "USD",
        type: "debit",
        method: "wallet_balance",
        reference: clientOrderId ? `checkout:${clientOrderId}` : `checkout:${Date.now()}`,
        status: "completed",
        from: "nameword",
      });

      const order = new Order({
        userId,
        clientOrderId,
        mode,
        items,
        subtotal_usd,
        charged_usd: subtotal_usd,
        transactionId: tx._id,
      });

      let refunded = 0;
      for (const item of order.items) {
        const result = await provisionItem(item, mode, req.user.email);
        item.status = result.status;
        item.message = result.message;
        item.upstream = result.upstream;
        if (result.status === "failed") {
          await creditWallet(userId, item.price_usd, `refund:${order.orderNumber || tx.transactionId}:${item.domain}`);
          item.refunded_usd = item.price_usd;
          refunded = round2(refunded + item.price_usd);
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
              transactionId: tx._id,
              metadata: { checkout: true, mode, itemType: item.type, domain: item.domain, plan_id: item.plan_id || null },
            });
          } catch (e) {
            console.error("[checkout] payment record failed:", e?.message || e);
          }
        }
      }

      const failedCount = order.items.filter((i) => i.status === "failed").length;
      order.refunded_usd = refunded;
      order.status = failedCount === order.items.length ? "failed" : failedCount > 0 ? "partial" : "paid";
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
