import { useNavigate } from "react-router";
import { LuShoppingCart } from "react-icons/lu";
import { useCart } from "../../hooks/useCart";

// Header cart button with live item count. /cart itself gates guests to the
// account step, so this is safe to show to everyone.
export default function CartNavButton({ className = "" }) {
  const { count } = useCart();
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate("/cart")}
      aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
      className={`relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-primary hover:bg-surface-2 dark:text-gray-200 dark:hover:bg-white/[0.06] transition-colors ${className}`}
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
