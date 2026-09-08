

const STORAGE_KEY = "nameword_guest_cart";

function generateId() {
  return `guest-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function getStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { items: [], totalsByCurrency: {} };
    const parsed = JSON.parse(raw);
    return {
      items: Array.isArray(parsed?.items) ? parsed.items : [],
      totalsByCurrency:
        parsed?.totalsByCurrency && typeof parsed.totalsByCurrency === "object"
          ? parsed.totalsByCurrency
          : {},
    };
  } catch {
    return { items: [], totalsByCurrency: {} };
  }
}

function persist(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("guestCart persist failed", e);
  }
}

function recomputeTotals(items) {
  const totalsByCurrency = {};
  for (const item of items) {
    const c = item?.price?.currency || "USD";
    totalsByCurrency[c] = (totalsByCurrency[c] || 0) + Number(item?.price?.amount || 0);
  }
  return totalsByCurrency;
}


function toStoredItem(payload) {
  const id = generateId();
  const itemType = payload.itemType;

  if (itemType === "domain") {
    const name =
      payload.websiteName ||
      payload.domain?.name ||
      "";
    return {
      _id: id,
      itemType: "domain",
      domain: {
        name,
        action: payload.action || "register",
        years: payload.years ?? 1,
        whoisProtection: Boolean(payload.whoisProtection),
        nameservers: Array.isArray(payload.nameservers) ? payload.nameservers : [],
        provider: payload.provider || "hostbay",
        productId: payload.productId,
        renew: payload.renew || undefined,
        availability: payload.availability ?? false,
      },
      price: {
        amount: Number(payload.price?.amount) || 0,
        currency: payload.price?.currency || "USD",
        originalAmount: payload.price?.originalAmount,
        discountPercent: payload.price?.discountPercent,
        displayText: payload.price?.displayText,
      },
      metadata: payload.metadata || {},
    };
  }

  if (itemType === "hosting") {
    const h = payload.hosting || {};
    return {
      _id: id,
      itemType: "hosting",
      hosting: {
        provider: h.provider,
        planId: h.planId,
        planName: h.planName,
        planCode: h.planCode,
        planType: h.planType,
        billingCycle: h.billingCycle,
        tenureLabel: h.tenureLabel,
        tenureMonths: h.tenureMonths,
        tenureDays: h.tenureDays,
        features: Array.isArray(h.features) ? h.features : [],
        planSnapshot: h.planSnapshot,
        domainOption: h.domainOption,
        domainName: h.domainName,
        domainPrice: h.domainPrice,
      },
      price: {
        amount: Number(payload.price?.amount) || 0,
        currency: payload.price?.currency || "USD",
        originalAmount: payload.price?.originalAmount,
        discountPercent: payload.price?.discountPercent,
        discount: payload.price?.discount,
        displayText: payload.price?.displayText,
      },
      metadata: payload.metadata || {},
    };
  }

  if (itemType === "bundle") {
    const b = payload.bundle || {};
    return {
      _id: id,
      itemType: "bundle",
      bundle: {
        name: b.name,
        description: b.description,
        termYears: b.termYears ?? 1,
        items: Array.isArray(b.items) ? b.items : [],
      },
      price: {
        amount: Number(payload.price?.amount) || 0,
        currency: payload.price?.currency || "USD",
        originalAmount: payload.price?.originalAmount,
        discountPercent: payload.price?.discountPercent,
        displayText: payload.price?.displayText,
      },
      metadata: payload.metadata || {},
    };
  }

  throw new Error("Unsupported itemType for guest cart");
}

export const guestCart = {
  list() {
    const data = getStored();
    const totals = recomputeTotals(data.items);
    return { items: data.items, totalsByCurrency: totals };
  },

  add(payload) {
    const data = getStored();
    const item = toStoredItem(payload);
    data.items.push(item);
    data.totalsByCurrency = recomputeTotals(data.items);
    persist(data);
    return item;
  },

  remove(id) {
    const data = getStored();
    const prev = data.items.length;
    data.items = data.items.filter((i) => i._id !== id);
    if (data.items.length === prev) return false;
    data.totalsByCurrency = recomputeTotals(data.items);
    persist(data);
    return true;
  },

  update(id, updates) {
    const data = getStored();
    const idx = data.items.findIndex((i) => i._id === id);
    if (idx < 0) return false;
    data.items[idx] = { ...data.items[idx], ...updates };
    data.totalsByCurrency = recomputeTotals(data.items);
    persist(data);
    return true;
  },

  clear() {
    persist({ items: [], totalsByCurrency: {} });
  },

  isEmpty() {
    return getStored().items.length === 0;
  },
};


function storedItemToAddPayload(item) {
  if (item.itemType === "domain") {
    const d = item.domain || {};
    return {
      itemType: "domain",
      websiteName: d.name,
      action: d.action || "register",
      years: d.years ?? 1,
      whoisProtection: d.whoisProtection,
      nameservers: d.nameservers,
      provider: d.provider,
      productId: d.productId,
      renew: d.renew,
      availability: d.availability,
      price: item.price,
      metadata: item.metadata,
    };
  }
  if (item.itemType === "hosting") {
    return {
      itemType: "hosting",
      hosting: item.hosting,
      price: item.price,
      metadata: item.metadata,
    };
  }
  if (item.itemType === "bundle") {
    return {
      itemType: "bundle",
      bundle: item.bundle,
      price: item.price,
      metadata: item.metadata,
    };
  }
  return null;
}


export async function mergeGuestCartIntoServer(cartAPI) {
  const data = getStored();
  if (!data.items.length) return;

  for (const item of data.items) {
    const payload = storedItemToAddPayload(item);
    if (!payload) continue;
    try {
      await cartAPI.addToCart(payload);
    } catch (e) {
      console.warn("mergeGuestCart: add item failed", item, e);
      // Continue with rest; partial merge is acceptable
    }
  }

  guestCart.clear();
}
