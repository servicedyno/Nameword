import { useMemo, useSyncExternalStore } from "react";
import { cartStore, cartSubtotal } from "../utils/cartStore";

export function useCart() {
  const items = useSyncExternalStore(cartStore.subscribe, cartStore.getItems, cartStore.getItems);
  return useMemo(() => {
    const domains = items.filter((i) => i.type === "domain");
    const hosting = items.filter((i) => i.type === "hosting");
    const vps = items.filter((i) => i.type === "vps");
    const rdp = items.filter((i) => i.type === "rdp");
    const servers = items.filter((i) => i.type === "vps" || i.type === "rdp");
    return {
      items,
      domains,
      hosting,
      vps,
      rdp,
      servers,
      count: items.length,
      subtotal: cartSubtotal(items),
      isEmpty: items.length === 0,
      // First domain that hasn't been offered hosting yet (drives the upsell step).
      nextDomainForHosting: domains.find((d) => !hosting.some((h) => h.domain === d.domain))?.domain || null,
      ...cartStore,
    };
  }, [items]);
}
