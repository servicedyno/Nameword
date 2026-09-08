import { RiGlobalLine } from "react-icons/ri";
import { TbArrowRight } from "react-icons/tb";
import ViewCartSidebar from "../layout/ViewCartSidebar";
import { useCallback, useEffect, useState } from "react";
import { NavLink } from "react-router";
import { useAuth } from "../../hooks/useAuth";
import { cartAPI } from "../../api/cartApi";
import Loader from "../common/Loader";
import { useLanguage } from "../../hooks/useLanguage";
import { guestCart } from "../../utils/guestCart";

const BottomCartView = () => {
  const [isModelOpen, setIsModelOpen] = useState(false);
  const [cartData, setCartData] = useState(null);
  const [cartLoading, setCartLoading] = useState(false);
  const [cartError, setCartError] = useState(null);
  const { user } = useAuth();
  const { t } = useLanguage();
  const isGuestCart = !user;

  const handleModelOpen = () => {
    setIsModelOpen(true);
  };

  const handleModelClose = () => {
    setIsModelOpen(false);
  };

  const fetchCart = useCallback(async () => {
    setCartError(null);
    setCartLoading(true);
    try {
      if (user) {
        const result = await cartAPI.getListAddToCart();
        setCartData(result?.data || result);
      } else {
        const data = guestCart.list();
        setCartData(data);
      }
    } catch (error) {
      if (user) {
        console.error("Failed to fetch cart list:", error);
        setCartError(
          error?.response?.data?.message || t.domain.failedToFetchCart
        );
      }
    } finally {
      setCartLoading(false);
    }
  }, [user, t.domain.failedToFetchCart]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart, user]);

  useEffect(() => {
    const handleCartUpdated = () => {
      fetchCart();
    };
    const handleCartUpdatedPayload = (e) => {
      const incoming = e?.detail;
      if (incoming) {
        setCartData(incoming);
        setCartError(null);
      } else {
        fetchCart();
      }
    };
    window.addEventListener("cart:updated", handleCartUpdated);
    window.addEventListener("cart:updated:payload", handleCartUpdatedPayload);
    return () => {
      window.removeEventListener("cart:updated", handleCartUpdated);
      window.removeEventListener(
        "cart:updated:payload",
        handleCartUpdatedPayload
      );
    };
  }, [fetchCart]);

  const itemsCount = cartData?.totalItems ?? cartData?.items?.length ?? 0;
  const subtotal = cartData?.totalsByCurrency?.USD ?? 0;

  return (
    <div className="py-6 bg-slatelight dark:bg-gray-800">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1 font-medium">
            <h2 className="flex flex-wrap items-center card-title">
              <RiGlobalLine className="mr-1.5 text-lg text-primary dark:text-white" />
              <span className="text-primary dark:text-gray-500">
                {cartLoading
                  ? <Loader />
                  : `${itemsCount} ${t.domain.domains}`}
              </span>
            </h2>
            <p className="text-primary dark:text-gray-500">
              {t.domain.subtotal}{" "}
              <span className="text-tealdark">
                $
                {cartLoading
                  ? "--"
                  : Number(subtotal).toFixed(2)}
              </span>
            </p>

            {cartError && <p className="text-red-500 text-sm">{cartError}</p>}
          </div>
          <div className="flex items-center justify-center gap-2">
            <button className="btn-text-link" onClick={handleModelOpen}>
              {t.domain.viewCart}
            </button>
            <NavLink to="/upsell-checkout" className="add-to-cart">
              {t.domain.continue} <TbArrowRight size={18} />
            </NavLink>
          </div>
        </div>
      </div>

      {/* cart sidebar view */}
      {isModelOpen && (
        <ViewCartSidebar
          onClose={handleModelClose}
          isModelOpen={isModelOpen}
          isGuestCart={isGuestCart}
        />
      )}
    </div>
  );
};
export default BottomCartView;
