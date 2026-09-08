const CartItem = require("../models/CartItem");

async function addItemToCart(params) {
  const { userId, itemType, domain, bundle, hosting, price, metadata } = params;

  if (!["domain", "bundle", "hosting"].includes(itemType)) {
    throw new Error("Unsupported item type");
  }

  if (itemType === 'domain') {
    const query = {
      userId,
      itemType,
      status: "in_cart",
      "domain.name": domain.name,
      "domain.action": domain.action,
    };

    const update = {
      $set: {
        domain: {
          name: domain.name,
          action: domain.action,
          years: domain.years ?? 1,
          whoisProtection: Boolean(domain.whoisProtection),
          nameservers: Array.isArray(domain.nameservers) ? domain.nameservers : [],
          provider: domain.provider,
          productId: domain.productId,
          renew: domain.renew || undefined,
          availability: domain.availability ?? false,
        },
        price: {
          amount: Number(price.amount),
          currency: price.currency || "USD",
          originalAmount: price.originalAmount,
          discountPercent: price.discountPercent,
          displayText: price.displayText,
        },
        metadata: metadata || {},
      },
      $unset: { bundle: 1 } 
    };

    const options = { upsert: true, new: true, setDefaultsOnInsert: true };
    return await CartItem.findOneAndUpdate(query, update, options);
  }

  if (itemType === "hosting") {
    const query = {
      userId,
      itemType,
      status: "in_cart"
    };

    const update = {
      $set: {
        userId,
        itemType,
        hosting: {
          provider: hosting?.provider,
          planId: hosting?.planId,
          planName: hosting?.planName,
          planCode: hosting?.planCode,
          planType: hosting?.planType,
          billingCycle: hosting?.billingCycle,
          tenureLabel: hosting?.tenureLabel,
          tenureMonths: hosting?.tenureMonths,
          tenureDays: hosting?.tenureDays,
          features: Array.isArray(hosting?.features) ? hosting.features : [],
          planSnapshot: hosting?.planSnapshot,
          domainOption: hosting?.domainOption,
          domainName: hosting?.domainName,
          domainPrice: hosting?.domainPrice,
        },
        price: {
          amount: Number(price.amount),
          currency: price.currency || "USD",
          originalAmount: price.originalAmount,
          discountPercent: price.discountPercent,
          displayText: price.displayText,
        },
        metadata: metadata || {},
      }
    };

    const options = { upsert: true, new: true, setDefaultsOnInsert: true };
    return await CartItem.findOneAndUpdate(query, update, options);
  }

  if (itemType === "bundle") {
    const query = {
      userId,
      itemType,
      status: "in_cart",
      "bundle.name": bundle.name,
      "bundle.termYears": bundle.termYears ?? 1,
    };

    const update = {
      $set: {
        bundle: {
          name: bundle.name,
          description: bundle.description,
          termYears: bundle.termYears ?? 1,
          items: Array.isArray(bundle.items) ? bundle.items : [],
        },
        price: {
          amount: Number(price.amount),
          currency: price.currency || "USD",
          originalAmount: price.originalAmount,
          discountPercent: price.discountPercent,
          displayText: price.displayText,
        },
        metadata: metadata || {},
      },
      $unset: { domain: 1, hosting: 1 }
    };

    const options = { upsert: true, new: true, setDefaultsOnInsert: true };
    return await CartItem.findOneAndUpdate(query, update, options);
  }
}

async function listCart(userId) {
  const items = await CartItem.find({ userId, status: "in_cart" }).sort({ createdAt: -1 });
  const totalsByCurrency = {};
  for (const item of items) {
    const currency = item.price.currency || "USD";
    totalsByCurrency[currency] = (totalsByCurrency[currency] || 0) + Number(item.price.amount || 0);
  }
  return { items, totalsByCurrency };
}

async function removeItemFromCart(userId, cartItemId) {
  const result = await CartItem.deleteOne({ _id: cartItemId, userId, status: "in_cart" });
  return result.deletedCount === 1;
}

module.exports = {
  addItemToCart,
  listCart,
  removeItemFromCart
};
