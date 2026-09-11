import { useMemo, useSyncExternalStore } from "react";
import { cartStore, cartSubtotal } from "../utils/cartStore";

export function useCart() {
  const items = useSyncExternalStore(cartStore.subscribe, cartStore.getItems, cartStore.getItems);
  return useMemo(() => {
    const domains = items.filter((i) => i.type === "domain");
    const hosting = items.filter((i) => i.type === "hosting");
    return {
      items,
      domains,
      hosting,
      count: items.length,
      subtotal: cartSubtotal(items),
      isEmpty: items.length === 0,
      // First domain that hasn't been offered hosting yet (drives the upsell step).
      nextDomainForHosting: domains.find((d) => !hosting.some((h) => h.domain === d.domain))?.domain || null,
      ...cartStore,
    };
  }, [items]);
}
