import DomainCartCard from "../components/cart/domain-cart-card";
import MatchingDomainList from "../components/cart/matching-domain-list";
import HostingCard from "../components/cart/hosting-card";
import OrderSummary from "../components/cart/order-summary";
import { RiGlobalLine } from "react-icons/ri";
import { useEffect, useState, useCallback, useMemo } from "react";
import { cartAPI } from "../api/cartApi";
import { useAuth } from "../hooks/useAuth";
import Loader from "../components/common/Loader";
import { useLanguage } from "../hooks/useLanguage";
import { guestCart } from "../utils/guestCart";

const Cart = () => {
  const { t } = useLanguage();
  const [cartData, setCartData] = useState(null);
  const [cartLoading, setCartLoading] = useState(false);
  const [cartError, setCartError] = useState(null);
  const { user } = useAuth();
  const [updateLoading, setUpdateLoading] = useState(false);
  const isGuestCart = !user;

  const handleItemUpdate = useCallback((id, updates) => {
    if (isGuestCart) {
      guestCart.update(id, updates);
      const data = guestCart.list();
      setCartData(data);
      setCartError(null);
      window.dispatchEvent(
        new CustomEvent("cart:updated:payload", { detail: data })
      );
      return;
    }
    setCartData((prev) => {
      if (!prev?.items) return prev;
      const newItems = prev.items.map((i) =>
        i._id === id ? { ...i, ...updates } : i
      );
      const newData = { ...prev, items: newItems };
      window.dispatchEvent(
        new CustomEvent("cart:updated:payload", { detail: newData })
      );
      return newData;
    });
  }, [isGuestCart]);

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
          error?.response?.data?.message || t.domain.failedToFetchCart || "Failed to fetch cart list"
        );
      }
    } finally {
      setCartLoading(false);
    }
  }, [user, t.domain.failedToFetchCart]);

  useEffect(() => {
    let isActive = true;
    const load = async () => {
      await fetchCart();
    };
    load();

    const handleCartUpdated = () => {
      if (!isActive) return;
      fetchCart();
    };
    const handleCartUpdatedPayload = (e) => {
      if (!isActive) return;
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
      isActive = false;
      window.removeEventListener("cart:updated", handleCartUpdated);
      window.removeEventListener(
        "cart:updated:payload",
        handleCartUpdatedPayload
      );
    };
  }, [user, fetchCart]);

  const domainItems = useMemo(
    () => (cartData?.items || []).filter((item) => item?.itemType === "domain"),
    [cartData?.items]
  );

  const hostingItems = useMemo(
    () =>
      (cartData?.items || []).filter((item) => item?.itemType === "hosting"),
    [cartData?.items]
  );

  const hasDomainItems = domainItems.length > 0;

  const handleDomainRemove = useCallback(async (id) => {
    if (!id) return;
    try {
      setUpdateLoading(true);
      guestCart.remove(id);
      const data = guestCart.list();
      setCartData(data);
      window.dispatchEvent(
        new CustomEvent("cart:updated:payload", { detail: data })
      );
    } catch (e) {
      console.error("Failed to remove domain item:", e);
    } finally {
      setUpdateLoading(false);
    }
  }, []);

  const handleHostingRemove = useCallback(async (id) => {
    if (!id) return;
    try {
      setUpdateLoading(true);
      if (isGuestCart) {
        guestCart.remove(id);
        const data = guestCart.list();
        setCartData(data);
        window.dispatchEvent(
          new CustomEvent("cart:updated:payload", { detail: data })
        );
      } else {
        await cartAPI.removeCartItem({ id });
        window.dispatchEvent(new Event("cart:updated"));
      }
    } catch (error) {
      console.error("Failed to remove hosting item:", error);
    } finally {
      setUpdateLoading(false);
    }
  }, [isGuestCart]);

  return (
    <div className="checkout-card">
      <h2 className="heading-title lg:mb-12 mb-8">{t.pages.cart || "Cart"}</h2>
      {hasDomainItems && (
        <h3 className="flex flex-wrap items-center font-medium text-2xl lg:mb-10 mb-6 text-primary dark:text-white">
          <RiGlobalLine className="mr-1.5 text-2xl" /> {t.pages.domains || "Domains"}
        </h3>
      )}

      <div className="w-full flex lg:flex-row flex-col gap-10">
        <div className="xl:w-3/5 flex flex-col w-full gap-10">
          {hasDomainItems && (
            <>
              <DomainCartCard
                items={domainItems}
                onItemUpdate={handleItemUpdate}
                setUpdateLoading={setUpdateLoading}
                isGuestCart={isGuestCart}
                onRemove={isGuestCart ? handleDomainRemove : undefined}
              />

              {/* matching domain list */}
              <MatchingDomainList domains={domainItems} isGuestCart={isGuestCart} />
            </>
          )}
          {/* Hosting */}
          <HostingCard
            items={hostingItems}
            onRemove={handleHostingRemove}
            onItemUpdate={handleItemUpdate}
            setUpdateLoading={setUpdateLoading}
            allCartItems={cartData?.items || []}
            isGuestCart={isGuestCart}
          />
        </div>
        <div className="xl:w-2/5 w-full flex">
          <OrderSummary
            itemsCount={cartData?.items?.length || 0}
            subtotal={(cartData?.items || []).reduce(
              (sum, item) => sum + Number(item?.price?.amount || 0),
              0
            )}
            isGuestCart={isGuestCart}
          />
        </div>
      </div>
      {(cartLoading || updateLoading) && <Loader />}
    </div>
  );
};

export default Cart;
