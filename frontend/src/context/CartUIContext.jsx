import { createContext, useContext, useCallback, useEffect, useRef, useState } from "react";
import { cartStore } from "../utils/cartStore";
import { useAuth } from "../hooks/useAuth";
import { walletAPI } from "../api/walletApi";

// Global cart UI state: controls the slide-in mini-cart and keeps a fresh copy of
// the signed-in wallet balance. It also AUTO-OPENS the drawer whenever an item is
// added anywhere in the app, so every "add to cart" becomes an inline quick order
// without each page having to navigate to the full cart.
const CartUIContext = createContext(null);

export const useCartUI = () => useContext(CartUIContext) || { isOpen: false, open: () => {}, close: () => {}, balance: null, refreshWallet: () => {} };

export function CartUIProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [balance, setBalance] = useState(null);
  const prevCount = useRef(cartStore.getItems().length);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const refreshWallet = useCallback(async () => {
    if (!isAuthenticated) {
      setBalance(null);
      return;
    }
    try {
      const res = await walletAPI.getWallet();
      const b = res?.data?.balance;
      setBalance(Number(b?.USD ?? b?.default ?? 0));
    } catch {
      /* leave last known balance */
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshWallet();
  }, [refreshWallet]);

  // Keep the balance current when a payment/top-up credits or debits the wallet.
  useEffect(() => {
    const onWallet = () => refreshWallet();
    window.addEventListener("wallet:updated", onWallet);
    return () => window.removeEventListener("wallet:updated", onWallet);
  }, [refreshWallet]);

  // Auto-open the drawer on any add (count increase) — except while the user is
  // already on the full cart / checkout screens.
  useEffect(() => {
    const onChange = () => {
      const count = cartStore.getItems().length;
      if (count > prevCount.current) {
        const p = window.location.pathname;
        if (!p.startsWith("/cart") && !p.startsWith("/checkout")) setIsOpen(true);
      }
      prevCount.current = count;
    };
    return cartStore.subscribe(onChange);
  }, []);

  return (
    <CartUIContext.Provider value={{ isOpen, open, close, balance, refreshWallet }}>
      {children}
    </CartUIContext.Provider>
  );
}
