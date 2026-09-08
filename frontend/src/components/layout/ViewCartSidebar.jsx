import { IoClose, IoChevronDown } from "react-icons/io5";
import { LuTrash2 } from "react-icons/lu";
import { HiOutlineShoppingCart } from "react-icons/hi";
import { FiCheck } from "react-icons/fi";
import { useEffect, useState, useCallback } from "react";
import { TbArrowRight } from "react-icons/tb";
import { NavLink } from "react-router";
import { cartAPI } from "../../api/cartApi";
import { domainAPI } from "../../api/domains";
import { useAuth } from "../../hooks/useAuth";
import { useAlert } from "../../context/AlertContext";
import { useLanguage } from "../../hooks/useLanguage";
import { guestCart } from "../../utils/guestCart";

const ViewCartSidebar = ({ onClose, isModelOpen, setHasUnread, isGuestCart: isGuestCartProp }) => {
  const [selectedTermByItemId, setSelectedTermByItemId] = useState({});
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const { t: tLang } = useLanguage();
  const terms = [
    tLang.cart.domain.years.one,
    tLang.cart.domain.years.three,
    tLang.cart.domain.years.five,
    tLang.cart.domain.years.ten
  ];
  const [cartData, setCartData] = useState(null);
  const [cartLoading, setCartLoading] = useState(false);
  const [cartError, setCartError] = useState(null);
  const [bundles, setBundles] = useState([]);
  const [bundlesLoading, setBundlesLoading] = useState(false);
  const [selectedBundleTerm, setSelectedBundleTerm] = useState({});

  const { user } = useAuth();
  const { showAlert } = useAlert();
  const { t } = useLanguage();
  const isGuestCart = isGuestCartProp ?? !user;

  useEffect(() => {
    let isActive = true;
    const fetchCart = async () => {
      setCartError(null);
      setCartLoading(true);
      try {
        if (user && !isGuestCart) {
          const result = await cartAPI.getListAddToCart({ markRead: true });
          if (!isActive) return;
          const items = result?.data?.items ?? result?.items ?? [];

          const hasUnreadItems = items.some((item) => item?.isRead === false);
          setHasUnread?.(hasUnreadItems);
          setCartData(result?.data || result);

          const initialTerms = {};
          items.forEach((item) => {
            if (item._id) {
              const years = item?.domain?.years || 1;
              initialTerms[item._id] = `${years} ${years === 1 ? tLang.cart.domain.year : tLang.cart.domain.yearsPlural}`;
            }
          });
          setSelectedTermByItemId(initialTerms);
        } else {
          const data = guestCart.list();
          if (!isActive) return;
          setCartData(data);
          const initialTerms = {};
          (data?.items ?? []).forEach((item) => {
            if (item._id) {
              const years = item?.domain?.years || 1;
              initialTerms[item._id] = `${years} ${years === 1 ? tLang.cart.domain.year : tLang.cart.domain.yearsPlural}`;
            }
          });
          setSelectedTermByItemId(initialTerms);
        }
      } catch (error) {
        if (!isActive) return;
        if (user && !isGuestCart) {
          console.error("Failed to fetch cart list:", error);
          setCartError(
            error?.response?.data?.message || t.cart.sidebar.failedToFetchCartList
          );
        }
      } finally {
        if (isActive) {
          setCartLoading(false);
        }
      }
    };
    fetchCart();
    const handleCartUpdated = () => fetchCart();
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
      isActive = false;
      window.removeEventListener("cart:updated", handleCartUpdated);
      window.removeEventListener(
        "cart:updated:payload",
        handleCartUpdatedPayload
      );
    };
  }, [user, isGuestCart, setHasUnread, t.cart.sidebar.failedToFetchCartList, tLang.cart.domain.year, tLang.cart.domain.yearsPlural]);

  const handleRemoveFromCart = async (itemId) => {
    if (!itemId) return;
    try {
      setCartError(null);
      setCartLoading(true);

      if (isGuestCart) {
        guestCart.remove(itemId);
        const data = guestCart.list();
        setCartData(data);
        setCartError(null);
        window.dispatchEvent(new CustomEvent("cart:updated:payload", { detail: data }));
        showAlert(t.cart.sidebar.itemRemoved || "Item removed from cart", { duration: 2500, type: "success" });
      } else {
        const removeFromCart = await cartAPI.removeCartItem({ id: itemId });
        if (removeFromCart?.success == true) {
          showAlert(removeFromCart?.message, { duration: 2500, type: "success" });
        }
        const result = await cartAPI.getListAddToCart();
        setCartData(result?.data || result);
        window.dispatchEvent(new Event("cart:updated"));
      }
    } catch (error) {
      if (!isGuestCart) {
        console.error("Failed to remove item from cart:", error);
        setCartError(
          error?.response?.data?.message || t.cart.sidebar.failedToRemoveItem
        );
      }
    } finally {
      setCartLoading(false);
    }
  };

  const handleTermSelect = useCallback(
    async (itemId, newTerm) => {
      const year = parseInt(newTerm.split(" ")[0]);
      const item = cartData?.items?.find((i) => i._id === itemId);
      const websiteName = item?.domain?.name || item?.websiteName || "";
      if (!websiteName) return;

      setCartLoading(true);

      try {
        const priceResponse = await domainAPI.checkDomainPrice({
          websiteName,
          provider: "openprovider",
          registrationFeePerc: 50,
          renewalFeePerc: 50,
          transferFeePerc: 50,
          duration: year,
        });

        const registrationFee = priceResponse?.responseData?.registrationFee;
        const originalAmount = (registrationFee / 1.5).toFixed(2);

        if (registrationFee) {
          if (isGuestCart) {
            guestCart.update(itemId, {
              price: {
                ...item?.price,
                amount: Number(registrationFee.toFixed(2)),
                originalAmount: Number(originalAmount),
                currency: item?.price?.currency || "USD",
              },
              domain: { ...item?.domain, years: year },
            });
            const data = guestCart.list();
            setCartData(data);
            window.dispatchEvent(new CustomEvent("cart:updated:payload", { detail: data }));
          } else {
            await cartAPI.updateCartItem({
              id: itemId,
              years: year,
              price: {
                amount: registrationFee.toFixed(2),
                originalAmount: originalAmount,
                currency: item?.price?.currency || "USD",
              },
            });
            const result = await cartAPI.getListAddToCart();
            setCartData(result?.data || result);
            window.dispatchEvent(new Event("cart:updated"));
          }

          showAlert(t.cart.sidebar.termUpdatedSuccess.replace("{term}", newTerm), {
            duration: 2500,
            type: "success",
          });
        }
      } catch (error) {
        console.error("Failed to fetch dynamic price:", error);
        showAlert(t.cart.sidebar.failedToUpdatePrice, {
          duration: 2500,
          type: "warning",
        });
      } finally {
        setCartLoading(false);
      }
    },
    [cartData, isGuestCart, showAlert, t.cart.sidebar.failedToUpdatePrice, t.cart.sidebar.termUpdatedSuccess]
  );

  // Calculate discount percentage
  const calculateDiscount = (originalPrice, currentPrice) => {
    if (!originalPrice || originalPrice <= currentPrice) return 0;
    return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
  };

  // Format renewal date
  const formatRenewalDate = (years) => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + years);
    const month = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear();
    return t.cart.sidebar.renewsIn.replace("{month}", month).replace("{year}", year);
  };

  // Fetch bundles when domain items are in cart (skip for guests to avoid 401)
  useEffect(() => {
    const fetchBundles = async () => {
      const domainItems = cartData?.items?.filter(item => item?.itemType === 'domain') || [];
      if (domainItems.length === 0 || isGuestCart) {
        setBundles([]);
        return;
      }

      // Get the first domain's base name to fetch bundles
      const firstDomain = domainItems[0];
      const websiteName = firstDomain?.domain?.name || firstDomain?.websiteName || "";
      if (!websiteName) {
        setBundles([]);
        return;
      }

      setBundlesLoading(true);
      try {
        const response = await domainAPI.getDomainBundles({
          websiteName,
          provider: "openprovider",
          years: 1, // Default to 1 year
        });

        if (response?.success && response?.responseData?.length > 0) {
          // Find the bundle with the lowest price
          const bundlesData = response.responseData.map((bundle, index) => ({
            ...bundle,
            _id: `bundle-${index}`,
            isBundle: true,
          }));

          // Sort by price and get the cheapest one
          const sortedBundles = bundlesData.sort((a, b) => {
            const priceA = a.price?.amount || 0;
            const priceB = b.price?.amount || 0;
            return priceA - priceB;
          });

          // Only show the cheapest bundle
          const cheapestBundle = sortedBundles.length > 0 ? [sortedBundles[0]] : [];
          setBundles(cheapestBundle);

          // Initialize selected terms for bundles (default to 1 year)
          const initialBundleTerms = {};
          cheapestBundle.forEach((bundle) => {
            initialBundleTerms[bundle._id] = tLang.cart.domain.years.one;
          });
          setSelectedBundleTerm(initialBundleTerms);
        } else {
          setBundles([]);
        }
      } catch (error) {
        console.error("Failed to fetch bundles:", error);
        setBundles([]);
      } finally {
        setBundlesLoading(false);
      }
    };

    if (cartData?.items?.length > 0 && !isGuestCart) {
      fetchBundles();
    } else {
      setBundles([]);
    }
  }, [cartData, isGuestCart, tLang.cart.domain.years.one]);

  // Handle adding bundle to cart - adds each domain separately
  const handleAddBundleToCart = async (bundle) => {
    if (!user) {
      showAlert(t.cart.sidebar.pleaseSignInToAddBundles, {
        duration: 2500,
        type: "warning",
      });
      return;
    }

    setCartLoading(true);
    try {
      const selectedTerm = selectedBundleTerm[bundle._id] || tLang.cart.domain.years.one;
      const years = parseInt(selectedTerm.split(" ")[0]) || 1;

      // Get all domains from bundle
      const bundleItems = bundle.items || [];

      if (bundleItems.length === 0) {
        showAlert(t.cart.sidebar.bundleHasNoDomains, {
          duration: 2500,
          type: "warning",
        });
        return;
      }

      // Add each domain separately to cart
      const addPromises = bundleItems.map(async (item) => {
        const domainName = item.name || "";
        if (!domainName) return null;

        try {
          // Fetch price for this domain with selected term
          const priceResponse = await domainAPI.checkDomainPrice({
            websiteName: domainName,
            provider: "openprovider",
            registrationFeePerc: 50,
            renewalFeePerc: 50,
            transferFeePerc: 50,
            duration: years,
          });

          const registrationFee = priceResponse?.responseData?.registrationFee;
          const renewalfee = priceResponse?.responseData?.renewalfee || item?.renew?.amount || 0;

          if (registrationFee) {
            const apiData = {
              itemType: "domain",
              websiteName: domainName,
              action: "register",
              availability: true,
              years: years,
              provider: "openprovider",
              price: {
                amount: registrationFee,
                currency: "USD",
              },
              renew: {
                amount: renewalfee,
                currency: "USD",
              },
            };

            const result = await cartAPI.addToCart(apiData);
            return result;
          }
        } catch (error) {
          console.error(`Failed to add ${domainName} to cart:`, error);
          return null;
        }
      });

      // Wait for all domains to be added
      const results = await Promise.all(addPromises);
      const successCount = results.filter(r => r?.success === true).length;

      if (successCount > 0) {
        const plural = successCount > 1 ? 's' : '';
        showAlert(
          t.cart.sidebar.domainsAddedToCart.replace("{count}", successCount).replace(/{plural}/g, plural),
          {
            duration: 2500,
            type: "success",
          }
        );

        // Refresh cart data
        const refreshed = await cartAPI.getListAddToCart();
        setCartData(refreshed?.data || refreshed);
        window.dispatchEvent(new Event("cart:updated"));
      } else {
        showAlert(t.cart.sidebar.failedToAddDomains, {
          duration: 2500,
          type: "warning",
        });
      }
    } catch (error) {
      console.error("Failed to add bundle to cart:", error);
      showAlert(
        error?.response?.data?.message || t.cart.sidebar.failedToAddBundle,
        {
          duration: 2500,
          type: "warning",
        }
      );
    } finally {
      setCartLoading(false);
    }
  };

  // Handle bundle term selection
  const handleBundleTermSelect = async (bundleId, newTerm) => {
    const year = parseInt(newTerm.split(" ")[0]);

    // Check if bundle is in cart or in suggested bundles
    const bundleInCart = cartData?.items?.find(
      item => item?.itemType === 'bundle' && item?.bundle?._id === bundleId
    );

    const suggestedBundle = bundles.find(b => b._id === bundleId);

    // Set loading state immediately before async operations
    if (bundleInCart) {
      setCartLoading(true);
    } else if (suggestedBundle) {
      setBundlesLoading(true);
    }

    // Update selected term in state
    setSelectedBundleTerm((prev) => ({
      ...prev,
      [bundleId]: newTerm,
    }));

    if (bundleInCart) {
      // Update bundle price if it's already in cart
      try {
        const firstDomain = bundleInCart.bundle?.items?.[0]?.name || "";
        const bundleResponse = await domainAPI.getDomainBundles({
          websiteName: firstDomain,
          provider: "openprovider",
          years: year,
        });

        const updatedBundle = bundleResponse?.responseData?.find(
          b => b.items?.length === bundleInCart.bundle?.items?.length
        );

        if (updatedBundle) {
          await cartAPI.updateCartItem({
            id: bundleInCart._id,
            bundle: {
              ...bundleInCart.bundle,
              termYears: year,
            },
            price: {
              amount: updatedBundle.price?.amount,
              currency: updatedBundle.price?.currency || "USD",
              displayText: updatedBundle.price?.displayText,
            },
          });

          const result = await cartAPI.getListAddToCart();
          setCartData(result?.data || result);
          window.dispatchEvent(new Event("cart:updated"));

          showAlert(t.cart.sidebar.bundleTermUpdatedSuccess.replace("{term}", newTerm), {
            duration: 2500,
            type: "success",
          });
        }
      } catch (error) {
        console.error("Failed to update bundle term:", error);
        showAlert(t.cart.sidebar.failedToUpdateBundleTerm, {
          duration: 2500,
          type: "warning",
        });
      } finally {
        setCartLoading(false);
      }
    } else if (suggestedBundle) {
      // Update suggested bundle price when term changes
      try {
        const firstDomain = suggestedBundle.items?.[0]?.name || "";
        if (!firstDomain) return;

        const bundleResponse = await domainAPI.getDomainBundles({
          websiteName: firstDomain,
          provider: "openprovider",
          years: year,
        });

        if (bundleResponse?.success && bundleResponse?.responseData?.length > 0) {
          // Find the bundle with the lowest price for the new term
          const bundlesData = bundleResponse.responseData.map((bundle, index) => ({
            ...bundle,
            _id: `bundle-${index}`,
            isBundle: true,
          }));

          // Sort by price and get the cheapest one
          const sortedBundles = bundlesData.sort((a, b) => {
            const priceA = a.price?.amount || 0;
            const priceB = b.price?.amount || 0;
            return priceA - priceB;
          });

          // Update with the cheapest bundle for the selected term
          const cheapestBundle = sortedBundles.length > 0 ? [sortedBundles[0]] : [];

          // Keep the same bundle structure but update price and term
          if (cheapestBundle.length > 0) {
            const updatedBundle = {
              ...suggestedBundle,
              price: cheapestBundle[0].price,
              termYears: year,
              items: cheapestBundle[0].items || suggestedBundle.items,
            };
            setBundles([updatedBundle]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch updated bundle price:", error);
        showAlert(t.cart.sidebar.failedToUpdateBundlePrice, {
          duration: 2500,
          type: "warning",
        });
      } finally {
        setBundlesLoading(false);
      }
    }
  };

  return (
    <>
      <div
        className={`view-cart transition-all duration-300 ease-in-out ${isModelOpen ? "translate-x-0" : "translate-x-full "
          }`}
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="heading-title">{t.cart.sidebar.cart}</h2>
          <IoClose
            className="text-primary dark:text-white cursor-pointer"
            size={30}
            onClick={onClose}
          />
        </div>

        {cartLoading ? (
          <div className="loading dark:text-white h-32 flex items-center justify-center">
            <div className="border-gray-300 h-8 w-8 animate-spin rounded-full border-4 border-t-darkbtn" />
          </div>
        ) : (
        <>
          <div className="all-cart-items">
            {cartError && <p className="text-red-500 text-sm">{cartError}</p>}

            {!cartError &&
              (cartData?.items?.length ?? 0) === 0 && !cartLoading && (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                    <HiOutlineShoppingCart className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                  </div>
                  <h3 className="text-lg font-medium text-primary dark:text-white mb-2">
                    {t.cart.sidebar.yourCartIsEmpty}
                  </h3>
                  <p className="text-sm text-secondary dark:text-gray-400 mb-6 max-w-xs">
                    {t.cart.sidebar.startBuildingMessage}
                  </p>
                  <NavLink
                    to="/home"
                    onClick={onClose}
                    className="add-to-cart px-5"
                  >
                    {t.cart.sidebar.browseDomains}
                    <TbArrowRight className="w-4 h-4" />
                  </NavLink>
                </div>
              )}
            {!cartLoading &&
              !cartError &&
              (cartData?.items?.length ?? 0) > 0 &&
              cartData.items.map((item) => {
                const domainName = item?.domain?.name || item?.websiteName || "";
                const firstDotIndex = domainName.indexOf(".");
                const label =
                  firstDotIndex > 0
                    ? domainName.substring(0, firstDotIndex)
                    : domainName;
                const tld =
                  firstDotIndex > -1 ? domainName.substring(firstDotIndex) : "";
                const priceAmount = item?.price?.amount ?? 0;
                const originalAmount = item?.price?.originalAmount ?? null;
                const renewAmount = item?.renew?.amount ?? null;
                const isOpen = openDropdownId === item?._id;
                const years = item?.domain?.years || 1;
                const selected = selectedTermByItemId[item?._id] || `${years} ${years === 1 ? tLang.cart.domain.year : tLang.cart.domain.yearsPlural}`;
                const discount = originalAmount ? calculateDiscount(originalAmount, priceAmount) : 0;
                const renewalDate = formatRenewalDate(years);

                return (
                  <div key={item?._id} className="cart-card mb-3">
                    <div className="flex items-center justify-between gap-7">
                      <h2 className="flex flex-col flex-wrap items-start justify-start card-title font-medium">
                        <p className="text-primary dark:text-gray-500 mb-1.5">
                          {label}
                          <span className="text-darkbtn dark:text-white">
                            {tld}
                          </span>
                        </p>
                        <p className="text-xs font-medium text-primary dark:text-gray-300">
                          {t.cart.domain.brandProtection}
                        </p>
                      </h2>
                      <LuTrash2
                        className="text-primary dark:text-gray-300 min-w-5 cursor-pointer"
                        size={18}
                        onClick={() => handleRemoveFromCart(item._id)}
                      />
                    </div>
                    <hr className="card-divider my-6" />

                    <div className="flex gap-2 justify-between items-center">
                      <div className="flex flex-col gap-3">
                        <p className="cart-title text-15">
                          {t.cart.domain.domainRegistration.replace("{tld}", tld?.toUpperCase())}
                        </p>

                        {/* term select option */}
                        <div className="relative w-48">
                          <div
                            onClick={() =>
                              setOpenDropdownId((prev) =>
                                prev === item?._id ? null : item?._id
                              )
                            }
                            className="term-select"
                          >
                            <p className="text-xs text-secondary font-medium">
                              {t.cart.domain.term}
                            </p>
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-primary dark:text-gray-400">
                                {selected}
                              </span>
                              <IoChevronDown className="absolute top-1/2 transform -translate-y-1/2 right-4 w-4 h-4 text-primary dark:text-gray-400" />
                            </div>
                          </div>

                          {/* Dropdown items */}
                          {isOpen && (
                            <div className="dropdown-select">
                              {terms.map((term) => (
                                <div
                                  key={term}
                                  onClick={() => {
                                    setSelectedTermByItemId((prev) => ({
                                      ...prev,
                                      [item?._id]: term,
                                    }));
                                    setOpenDropdownId(null);
                                    handleTermSelect(item?._id, term);
                                  }}
                                  className={`px-4 py-2 cursor-pointer hover:bg-slatelight dark:hover:bg-gray-800 text-sm font-medium text-primary dark:text-gray-400 ${selected === term
                                    ? "bg-slatelight dark:bg-gray-900 font-medium"
                                    : ""
                                    }`}
                                >
                                  {term}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {renewAmount !== null && (
                          <p className="cart-title text-xs">
                            {renewalDate} {t.cart.sidebar.renewsFor.replace("${price}", Number(renewAmount).toFixed(2))}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 text-primary dark:text-gray-300">
                        <p className="text-base font-medium text-tealdark">
                          ${Number(priceAmount).toFixed(2)}
                        </p>
                        {originalAmount && originalAmount > priceAmount && (
                          <>
                            <p className="text-sm font-medium line-through">
                              ${Number(originalAmount).toFixed(2)}
                            </p>
                            {discount > 0 && (
                              <p className="text-xs font-medium">{t.cart.sidebar.percentOff.replace("{percent}", discount)}</p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

            {/* Display bundles already in cart */}
            {!cartLoading &&
              !cartError &&
              cartData?.items
                ?.filter((item) => item?.itemType === "bundle")
                .map((bundleItem) => {
                  const bundle = bundleItem.bundle || {};
                  const bundleId = bundleItem._id;
                  const isOpen = openDropdownId === bundleId;
                  const selected = selectedBundleTerm[bundleId] || `${bundle.termYears || 3} ${(bundle.termYears || 3) === 1 ? tLang.cart.domain.year : tLang.cart.domain.yearsPlural}`;
                  const priceAmount = bundleItem?.price?.amount ?? 0;
                  const termYears = bundle.termYears || 3;

                  return (
                    <div key={bundleId} className="cart-card mb-3">
                      <div className="flex items-center justify-between gap-7">
                        <h2 className="flex flex-wrap items-center card-title font-medium">
                          <p className="text-primary dark:text-white mb-1.5">
                            {bundle.name || t.cart.sidebar.brandProtectionDomainPackage}
                          </p>
                        </h2>
                        <LuTrash2
                          className="text-primary dark:text-gray-300 min-w-5 cursor-pointer"
                          size={18}
                          onClick={() => handleRemoveFromCart(bundleId)}
                        />
                      </div>
                      <hr className="card-divider my-6" />

                      <div className="flex gap-2 justify-between items-center">
                        <div className="flex flex-col gap-3">
                          <p className="cart-title text-15">
                            {bundle.description || t.cart.sidebar.domainPackage}
                          </p>

                          {/* term select option */}
                          <div className="relative w-48">
                            <div
                              onClick={() =>
                                setOpenDropdownId((prev) =>
                                  prev === bundleId ? null : bundleId
                                )
                              }
                              className="term-select"
                            >
                              <p className="text-xs text-secondary font-medium">Term</p>
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-primary dark:text-gray-400">
                                  {selected}
                                </span>
                                <IoChevronDown className="absolute top-1/2 transform -translate-y-1/2 right-4 w-4 h-4 text-primary dark:text-gray-400" />
                              </div>
                            </div>

                            {/* Dropdown items */}
                            {isOpen && (
                              <div className="dropdown-select">
                                {terms.map((term) => (
                                  <div
                                    key={term}
                                    onClick={() => {
                                      setOpenDropdownId(null);
                                      handleBundleTermSelect(bundleId, term);
                                    }}
                                    className={`px-4 py-2 cursor-pointer hover:bg-slatelight dark:hover:bg-gray-800 text-sm font-medium text-primary dark:text-gray-400 ${selected === term
                                      ? "bg-slatelight dark:bg-gray-900 font-medium"
                                      : ""
                                      }`}
                                  >
                                    {term}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 text-primary dark:text-gray-300">
                          <p className="text-base font-medium text-tealdark">
                            ${Number(priceAmount).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <hr className="card-divider my-6" />

                      {bundle.items?.map((item, index) => {
                        const domainName = item.name || "";
                        const firstDotIndex = domainName.indexOf(".");
                        const label = firstDotIndex > 0 ? domainName.substring(0, firstDotIndex) : domainName;
                        const tld = firstDotIndex > -1 ? domainName.substring(firstDotIndex) : "";
                        const renewAmount = item?.renew?.amount;
                        const renewalDate = formatRenewalDate(termYears);

                        return (
                          <div key={index} className="flex flex-col card-title font-medium mb-3">
                            <p className="text-primary dark:text-white mb-1">
                              {label}
                              <span className="text-darkbtn dark:text-white">{tld}</span>
                            </p>
                            {renewAmount && (
                              <p className="cart-title text-xs">
                                {renewalDate} {t.cart.sidebar.renewsFor.replace("${price}", Number(renewAmount).toFixed(2))}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}

            {/* Display suggested bundles (not in cart yet) - loader for bundle section only */}
            {(() => {
              const hasDomainItems = (cartData?.items?.filter(item => item?.itemType === 'domain') || []).length > 0;
              const shouldFetchBundles = hasDomainItems && !isGuestCart;

              if (shouldFetchBundles && bundlesLoading) {
                return (
                  <div className="cart-card mb-3 border-2 border-dashed border-gray-200 dark:border-gray-600 p-6">
                    <div className="flex flex-col items-center justify-center gap-3 py-4">
                      <div className="border-gray-300 h-6 w-6 animate-spin rounded-full border-2 border-t-darkbtn" />
                      <p className="text-sm text-secondary dark:text-gray-400">
                        {t.cart.sidebar.loadingSuggestedBundles}
                      </p>
                    </div>
                  </div>
                );
              }
              if (!bundlesLoading && bundles.length > 0) {
                return bundles.map((bundle) => {
                const bundleId = bundle._id;
                const isOpen = openDropdownId === bundleId;
                const selected = selectedBundleTerm[bundleId] || tLang.cart.domain.years.one;
                const priceAmount = bundle.price?.amount ?? 0;
                const termYears = parseInt(selected.split(" ")[0]) || 1;

                // Check if this bundle is already in cart (either as bundle item or all domains added separately)
                const bundleAsCartItem = cartData?.items?.some(
                  item => item?.itemType === 'bundle' &&
                    item?.bundle?.items?.length === bundle.items?.length
                );
                const normalizeDomain = (name) => (name || "").toString().trim().toLowerCase();
                const cartDomainNames = new Set(
                  (cartData?.items || [])
                    .filter((item) => item?.itemType === "domain")
                    .map((item) => normalizeDomain(item?.domain?.name || item?.websiteName))
                );
                const allBundleDomainsInCart = (bundle.items || []).every(
                  (bItem) => cartDomainNames.has(normalizeDomain(bItem?.name))
                );
                const isInCart = bundleAsCartItem || allBundleDomainsInCart;

                if (bundleAsCartItem) return null; // Don't show if already in cart as bundle item

                return (
                  <div key={bundleId} className="cart-card mb-3 border-2 border-dashed border-gray-300 dark:border-gray-600">
                    <div className="flex items-center justify-between gap-7">
                      <h2 className="flex flex-wrap items-center card-title font-medium">
                        <p className="text-primary dark:text-white mb-1.5">
                          {bundle.name || t.cart.sidebar.brandProtectionDomainPackage}
                        </p>
                        {/* <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                          Suggested
                        </span> */}
                      </h2>
                    </div>
                    <hr className="card-divider my-6" />

                    <div className="flex gap-2 justify-between items-center">
                      <div className="flex flex-col gap-3">
                        <p className="cart-title text-15">
                          {bundle.description || t.cart.sidebar.domainPackage}
                        </p>

                        {/* term select option */}
                        <div className="relative w-48">
                          <div
                            onClick={() =>
                              setOpenDropdownId((prev) =>
                                prev === bundleId ? null : bundleId
                              )
                            }
                            className="term-select"
                          >
                            <p className="text-xs text-secondary font-medium">Term</p>
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-primary dark:text-gray-400">
                                {selected}
                              </span>
                              <IoChevronDown className="absolute top-1/2 transform -translate-y-1/2 right-4 w-4 h-4 text-primary dark:text-gray-400" />
                            </div>
                          </div>

                          {/* Dropdown items */}
                          {isOpen && (
                            <div className="dropdown-select">
                              {terms.map((term) => (
                                <div
                                  key={term}
                                  onClick={() => {
                                    setOpenDropdownId(null);
                                    handleBundleTermSelect(bundleId, term);
                                  }}
                                  className={`px-4 py-2 cursor-pointer hover:bg-slatelight dark:hover:bg-gray-800 text-sm font-medium text-primary dark:text-gray-400 ${selected === term
                                    ? "bg-slatelight dark:bg-gray-900 font-medium"
                                    : ""
                                    }`}
                                >
                                  {term}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 text-primary dark:text-gray-300">
                        <p className="text-base font-medium text-tealdark">
                          ${Number(priceAmount).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <hr className="card-divider my-6" />

                    {bundle.items?.map((item, index) => {
                      const domainName = item.name || "";
                      const firstDotIndex = domainName.indexOf(".");
                      const label = firstDotIndex > 0 ? domainName.substring(0, firstDotIndex) : domainName;
                      const tld = firstDotIndex > -1 ? domainName.substring(firstDotIndex) : "";
                      const renewAmount = item?.renew?.amount;
                      const renewalDate = formatRenewalDate(termYears);

                      return (
                        <div key={index} className="flex flex-col card-title font-medium mb-3">
                          <p className="text-primary dark:text-white mb-1">
                            {label}
                            <span className="text-darkbtn dark:text-white">{tld}</span>
                          </p>
                          {renewAmount && (
                            <p className="cart-title text-xs">
                              {renewalDate} for ${Number(renewAmount).toFixed(2)}
                            </p>
                          )}
                        </div>
                      );
                    })}

                    <div className="mt-4">
                      <button
                        onClick={() => handleAddBundleToCart(bundle)}
                        className={`add-to-cart w-full ${allBundleDomainsInCart ? "opacity-70 cursor-not-allowed" : ""}`}
                        disabled={cartLoading || allBundleDomainsInCart}
                      >
                        {allBundleDomainsInCart ? (
                          <span className="flex items-center justify-center gap-2">
                            <FiCheck className="w-4 h-4" />
                            {t.cart.sidebar.bundleAdded || "Added"}
                          </span>
                        ) : (
                          <>
                            {t.cart.sidebar.addBundleToCart}
                            <TbArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              });
              }
              return null;
            })()}
          </div>

          <div className="flex items-center justify-end gap-2 py-5">
            <NavLink to="/home" className="btn-text-link">
              {t.cart.sidebar.backToShopping}
            </NavLink>
            {(cartData?.totalItems || cartData?.items?.length || bundles.length > 0) ? (
              <NavLink to="/cart" className="add-to-cart" onClick={onClose}>
                {t.cart.sidebar.continue} <TbArrowRight size={18} />
              </NavLink>
            ) : null}
          </div>
        </>
        )}
      </div>
    </>
  );
};
export default ViewCartSidebar;
