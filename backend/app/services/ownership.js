// Ownership service (C1 — release-blocking security fix).
//
// Every "my X" list and every management action must be derived from the
// SIGNED-IN buyer's own order/ownership records — never from the provider's
// account-wide list (which mixes every customer's resources together).
//
// A resource is "owned" when it appears as an item on one of the user's orders
// with a provisioned/paid status. In LIVE mode the item also carries the real
// upstream identifier (provider_id / provider_username), captured at checkout;
// in TEST (dry_run) mode nothing is provisioned upstream, so we fall back to a
// stable synthetic ref (`<orderId>:<index>`) so the UI still has a handle and
// actions resolve to a friendly "test mode" response instead of touching the
// provider.

const Order = require("../models/Order");

// Items in these statuses represent something the buyer paid for and owns.
const OWNED_STATUSES = ["active", "test_mode", "pending"];

// Order-level statuses that represent a real, paid purchase. An order still
// "awaiting_payment" (e.g. a crypto checkout whose coins never arrived) has NOT
// been paid for, so none of its items are owned yet — they must never surface as
// live accounts/domains/servers. Everything else (paid / partial / failed) may
// still carry provisioned items, which the per-item status filter handles.
const PAID_ORDER_STATUSES = ["paid", "partial", "failed"];

// How "real" an owned record is, used to pick a single winner when several
// records collapse onto the same resource (e.g. an abandoned unpaid attempt plus
// the account that actually got provisioned). Active + a real provider handle
// beats a still-pending / test-mode placeholder.
function ownScore(item) {
  const base = { active: 100, test_mode: 50, pending: 10 }[item.status] || 0;
  const hasHandle = item.provider_username || item.provider_id;
  return base + (hasHandle ? 5 : 0);
}

const norm = (s) => String(s || "").trim().toLowerCase();

// Stable identifier used as the list `id` the frontend sends back on actions.
function refFor(order, item, idx) {
  if (item.type === "domain") return norm(item.domain);
  if (item.type === "hosting") return item.provider_username || `${order._id}:${idx}`;
  // vps / rdp
  return item.provider_id || `${order._id}:${idx}`;
}

// Dedupe key so the same domain/account/server bought or re-recorded twice is
// listed once. For hosting we key by the WEBSITE (domain) so that an abandoned
// unpaid attempt and the account that actually got provisioned for the same
// domain collapse into a single entry (the provisioned one wins on ownScore).
function dedupeKey(item, ref) {
  if (item.type === "domain") return `domain:${norm(item.domain)}`;
  if (item.type === "hosting") return `hosting:${norm(item.domain) || item.provider_username || ref}`;
  return `${item.type}:${ref}`;
}

// Flat, newest-first, de-duplicated list of a user's owned items of one type.
// Each entry: { ref, order_id, idx, item, mode, createdAt }.
async function ownedList(userId, type) {
  const orders = await Order.find({ userId }).sort({ createdAt: -1 }).lean();
  const byKey = new Map(); // dedupeKey -> winning entry
  for (const order of orders) {
    // An unpaid checkout owns nothing yet.
    if (order.status && !PAID_ORDER_STATUSES.includes(order.status)) continue;
    const items = Array.isArray(order.items) ? order.items : [];
    items.forEach((item, idx) => {
      if (item.type !== type) return;
      if (!OWNED_STATUSES.includes(item.status)) return;
      // A refunded item that is no longer active was reversed — not owned.
      if ((item.refunded_usd || 0) > 0 && item.status !== "active") return;
      const ref = refFor(order, item, idx);
      const key = dedupeKey(item, ref);
      const entry = {
        ref,
        order_id: String(order._id),
        idx,
        item,
        mode: order.mode,
        createdAt: order.createdAt,
      };
      const existing = byKey.get(key);
      // Keep the "more real" record. Iterating newest-first means an equal-score
      // tie keeps the newer entry already stored.
      if (!existing || ownScore(item) > ownScore(existing.item)) {
        byKey.set(key, entry);
      }
    });
  }
  return Array.from(byKey.values()).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
}

// Resolve a requested server id to the buyer's owned entry (or null).
// Matches the synthetic ref, the stored provider_id, or the hostname.
async function findOwnedServer(userId, type, id) {
  const wanted = String(id || "");
  const list = await ownedList(userId, type);
  return (
    list.find(
      (e) =>
        e.ref === wanted ||
        (e.item.provider_id && e.item.provider_id === wanted) ||
        (e.item.hostname && e.item.hostname === wanted)
    ) || null
  );
}

// Resolve a requested cPanel username to the buyer's owned hosting entry.
async function findOwnedHosting(userId, user) {
  const wanted = String(user || "");
  const list = await ownedList(userId, "hosting");
  return (
    list.find(
      (e) =>
        e.ref === wanted ||
        (e.item.provider_username && e.item.provider_username === wanted)
    ) || null
  );
}

// Resolve a requested domain name to the buyer's owned domain entry.
async function findOwnedDomain(userId, domain) {
  const wanted = norm(domain);
  const list = await ownedList(userId, "domain");
  return list.find((e) => norm(e.item.domain) === wanted) || null;
}

// Defensive extraction of upstream identifiers from a provider create response.
// Provider payload shapes vary, so we probe the common paths. Returns only the
// keys we could find; safe to spread onto the order item.
function extractProviderIds(type, upstream) {
  const u = upstream && typeof upstream === "object" ? upstream : {};
  const pick = (...cands) => {
    for (const c of cands) {
      if (c !== undefined && c !== null && c !== "") return String(c);
    }
    return undefined;
  };
  const nested = u.would_provision || u.provisioned || u.data || u.result || {};
  const out = {};

  if (type === "vps" || type === "rdp") {
    const box = u[type] || u.server || u.instance || nested[type] || nested.server || nested.instance || {};
    const id = pick(u.id, u.instance_id, u.uuid, u.server_id, box.id, box.instance_id, box.uuid, nested.id, nested.instance_id);
    if (id) out.provider_id = id;
    const ip = pick(u.ip, u.ip_address, u.ipv4, box.ip, box.ip_address, nested.ip, nested.ip_address);
    if (ip) out.server_ip = ip;
  } else if (type === "hosting") {
    const box = u.account || u.hosting || nested.account || nested.hosting || {};
    const username = pick(u.username, u.cpanel_username, u.user, box.username, box.cpanel_username, nested.username, nested.cpanel_username, nested.user);
    if (username) out.provider_username = username;
    const panel = pick(u.panel_url, u.cpanel_url, box.panel_url, box.cpanel_url, nested.panel_url);
    if (panel) out.panel_url = panel;
    const ip = pick(u.server_ip, u.ip, box.server_ip, box.ip, nested.server_ip);
    if (ip) out.server_ip = ip;
  }
  return out;
}

module.exports = {
  ownedList,
  findOwnedServer,
  findOwnedHosting,
  findOwnedDomain,
  extractProviderIds,
  refFor,
  OWNED_STATUSES,
};
