import { useAuth } from "../../hooks/useAuth";
import { cartItems } from "./icons";
import { useEffect, useState } from "react";
import ViewCartSidebar from "../layout/ViewCartSidebar";
import { cartAPI } from "../../api/cartApi";
import { useLanguage } from "../../hooks/useLanguage";

const CartIconButton = () => {
  const { user } = useAuth();
  const [isModelOpen, setIsModelOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const { t } = useLanguage();


  // Fetch unread status
  const fetchUnread = async () => {
    try {
      const result = await cartAPI.getListAddToCart();
      const items = result?.data?.items ?? result?.items ?? [];

      // const hasUnreadItems = items.some((item) => item?.isRead === false);
      // setHasUnread(hasUnreadItems);
      items.length > 0 && setHasUnread(true);
    } catch (err) {
      console.error("Unread fetch error:", err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUnread();
    }
    window.addEventListener("cart:updated", fetchUnread);
    return () => {
      window.removeEventListener("cart:updated", fetchUnread);
    };
  }, [user]);

  if (!user) return null;

  const handleModelOpen = () => {
    setIsModelOpen(true);
  };

  const handleModelClose = () => {
    setIsModelOpen(false);
  };

  return (
    <>
      <button
        onClick={handleModelOpen}
        className="relative xl:flex hidden cursor-pointer"
        aria-label={t.common.buttons.openCart}
      >
        <img src={cartItems} alt={t.common.buttons.openCart} title={t.common.buttons.openCart} className="dark-mode" />
        {hasUnread && (
          <span className="bg-tealdark w-2 h-2 rounded-full absolute -top-2 -right-1"></span>
        )}
      </button>

      {/* cart sidebar view */}
      {isModelOpen && (
        <ViewCartSidebar onClose={handleModelClose} isModelOpen={isModelOpen} setHasUnread={setHasUnread} />
      )}
    </>
  );
};

export default CartIconButton;
