// Browser-side cart (Hostinger-style): guests build it before the account gate,
// the server re-prices everything at payment time. Items: {id,type,domain,...}.
const KEY = "nw_cart_v2";
const EVT = "nw-cart-change";

let cachedRaw = null;
let cachedItems = [];

function read() {
  let raw = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    raw = null;
  }
  if (raw === cachedRaw) return cachedItems;
  cachedRaw = raw;
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    cachedItems = Array.isArray(parsed) ? parsed : [];
  } catch {
    cachedItems = [];
  }
  return cachedItems;
}

function write(items) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new Event(EVT));
}

const uid = () => `ci_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const norm = (d) => String(d || "").trim().toLowerCase();

export const cartStore = {
  getItems: read,

  subscribe(fn) {
    window.addEventListener(EVT, fn);
    window.addEventListener("storage", fn);
    return () => {
      window.removeEventListener(EVT, fn);
      window.removeEventListener("storage", fn);
    };
  },

  addDomain({ domain, price_usd, registrar }) {
    const d = norm(domain);
    const items = read().filter((i) => !(i.type === "domain" && i.domain === d));
    items.push({ id: uid(), type: "domain", domain: d, price_usd: Number(price_usd) || 0, registrar: registrar || null, ns_choice: "cloudflare" });
    write(items);
  },

  // One hosting plan per domain — selecting another replaces it.
  addHosting({ domain, plan }) {
    const d = norm(domain);
    const items = read().filter((i) => !(i.type === "hosting" && i.domain === d));
    items.push({
      id: uid(),
      type: "hosting",
      domain: d,
      plan_id: plan.plan_id,
      plan_name: plan.name,
      duration_days: plan.duration_days,
      features: Array.isArray(plan.features) ? plan.features : [],
      price_usd: Number(plan.price_usd) || 0,
    });
    write(items);
  },

  removeHostingFor(domain) {
    const d = norm(domain);
    write(read().filter((i) => !(i.type === "hosting" && i.domain === d)));
  },

  // Removing a domain also drops the hosting attached to it.
  remove(id) {
    const items = read();
    const target = items.find((i) => i.id === id);
    let next = items.filter((i) => i.id !== id);
    if (target?.type === "domain") next = next.filter((i) => !(i.type === "hosting" && i.domain === target.domain));
    write(next);
  },

  update(id, patch) {
    write(read().map((i) => (i.id === id ? { ...i, ...patch } : i)));
  },

  clear() {
    write([]);
  },

  hasDomain(domain) {
    const d = norm(domain);
    return read().some((i) => i.type === "domain" && i.domain === d);
  },

  hostingFor(domain) {
    const d = norm(domain);
    return read().find((i) => i.type === "hosting" && i.domain === d) || null;
  },

  // Server payload shape (prices are re-validated server-side).
  toPayload() {
    return read().map((i) =>
      i.type === "domain"
        ? { type: "domain", domain: i.domain, ns_choice: i.ns_choice || "cloudflare" }
        : { type: "hosting", domain: i.domain, plan_id: i.plan_id }
    );
  },
};

export const cartSubtotal = (items) => Math.round(items.reduce((s, i) => s + (Number(i.price_usd) || 0), 0) * 100) / 100;
