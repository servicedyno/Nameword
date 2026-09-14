import { useEffect, useRef, useState } from "react";
import { LuShoppingCart } from "react-icons/lu";
import { useCart } from "../../hooks/useCart";
import { useCartUI } from "../../context/CartUIContext";

// Header cart button with a live item count. Opens the slide-in mini-cart from
// anywhere in the app (public or signed-in). The very first time a buyer adds
// something to an empty cart we give the icon a gentle one-time pulse so new
// buyers notice where the cart lives (gated by localStorage — once per browser).
export default function CartNavButton({ className = "" }) {
  const { count } = useCart();
  const { open } = useCartUI();
  const [pulse, setPulse] = useState(false);
  const prevCount = useRef(count);

  useEffect(() => {
    const prev = prevCount.current;
    prevCount.current = count;
    if (prev === 0 && count > 0) {
      let already = false;
      try { already = localStorage.getItem("nw_cart_pulsed") === "1"; } catch { /* ignore */ }
      if (!already) {
        try { localStorage.setItem("nw_cart_pulsed", "1"); } catch { /* ignore */ }
        setPulse(true);
        const t = setTimeout(() => setPulse(false), 3200);
        return () => clearTimeout(t);
      }
    }
  }, [count]);

  return (
    <button
      type="button"
      onClick={open}
      aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
      className={`relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-primary hover:bg-surface-2 dark:text-gray-200 dark:hover:bg-white/[0.06] transition-colors lg:h-9 lg:w-9 ${pulse ? "nw-cart-pulse" : ""} ${className}`}
      data-testid="nav-cart-button"
    >
      <LuShoppingCart size={20} />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-brand text-white text-[11px] font-bold leading-[18px] text-center" data-testid="nav-cart-count">
          {count}
        </span>
      )}
    </button>
  );
}
