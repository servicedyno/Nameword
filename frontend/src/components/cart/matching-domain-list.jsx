import { useState, useEffect, useMemo } from "react";
import { cart } from "../common/icons";
import { domainAPI } from "../../api/domains";
import { cartAPI } from "../../api/cartApi";
import { useAlert } from "../../context/AlertContext";
import { useLanguage } from "../../hooks/useLanguage";
import { guestCart } from "../../utils/guestCart";
import { FiCheck } from "react-icons/fi";

const normalizeDomain = (domain) =>
  (domain || "").toString().trim().toLowerCase();

const getBaseLabel = (domainName = "") => {
  const [label] = domainName.split(".");
  return label || "";
};

const formatPrice = (value) => `$${Number(value || 0).toFixed(2)}`;

const MatchingDomainList = ({ domains = [], isGuestCart = false }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState({});
  const [addedToCart, setAddedToCart] = useState(new Set());
  const { showAlert } = useAlert();
  const { t } = useLanguage();

  const existingDomains = useMemo(() => {
    const set = new Set();
    domains.forEach((item) => {
      const domainName =
        item?.domain?.name || item?.websiteName || item?.domainName;
      if (domainName) set.add(normalizeDomain(domainName));
    });
    return set;
  }, [domains]);

  // Sync addedToCart: remove domains that are no longer in cart (e.g. user deleted them)
  useEffect(() => {
    setAddedToCart((prev) => {
      const next = new Set(prev);
      let changed = false;
      prev.forEach((domain) => {
        if (!existingDomains.has(domain)) {
          next.delete(domain);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [existingDomains]);

  const baseLabels = useMemo(() => {
    const labels = [];
    domains.forEach((item) => {
      const domainName =
        item?.domain?.name || item?.websiteName || item?.domainName;
      const label = getBaseLabel(domainName);
      if (label && !labels.includes(label)) {
        labels.push(label);
      }
    });
    return labels;
  }, [domains]);

  useEffect(() => {
    if (!baseLabels.length) {
      setSuggestions([]);
      return;
    }

    let isCancelled = false;

    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        const aggregated = [];
        for (const label of baseLabels.slice(0, 3)) {
          const response = await domainAPI.getTldSuggestions({
            websiteName: label,
          });
          const list = response?.responseData || [];
          aggregated.push(
            ...list
              .filter((item) => item?.available)
              .map((item) => ({
                websiteName: item.websiteName || item.domain,
                registrationFee: Number(item.registrationFee || 0),
                renewalFee: Number(
                  item.renewalfee || item.registrationFee || 0,
                ),
              })),
          );
        }

        if (isCancelled) return;

        const unique = [];
        const seen = new Set();
        const seenTlds = new Set(); // Track TLDs to ensure uniqueness

        for (const item of aggregated) {
          // Stop once we have 3 unique suggestions with different TLDs
          if (unique.length >= 3) break;

          const normalized = normalizeDomain(item.websiteName);
          if (!normalized) continue;
          if (existingDomains.has(normalized)) continue;
          if (seen.has(normalized)) continue;

          // Extract TLD from domain
          const parts = normalized.split(".");
          const tld = parts.length > 1 ? parts.slice(1).join(".") : "";

          // Skip if we already have a domain with this TLD (ensure different TLDs)
          if (tld && seenTlds.has(tld)) continue;

          seen.add(normalized);
          if (tld) seenTlds.add(tld);
          unique.push(item);
        }

        setSuggestions(unique.slice(0, 3));
      } catch (error) {
        if (!isCancelled) {
          console.error("Failed to fetch matching domain suggestions:", error);
          showAlert(t.cart.matchingDomains.loadError, {
            type: "warning",
            duration: 2500,
          });
          setSuggestions([]);
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    fetchSuggestions();

    return () => {
      isCancelled = true;
    };
  }, [baseLabels, existingDomains, showAlert]);

  const handleAddToCart = async (suggestion) => {
    if (!suggestion?.websiteName) return;
    if (adding[suggestion.websiteName]) return;

    setAdding((prev) => ({ ...prev, [suggestion.websiteName]: true }));
    const apiData = {
      itemType: "domain",
      websiteName: suggestion.websiteName,
      action: "register",
      availability: true,
      years: 1,
      provider: "hostbay",
      price: {
        amount: suggestion.registrationFee,
        currency: "USD",
      },
      renew: {
        amount: suggestion.renewalFee || suggestion.registrationFee,
        currency: "USD",
      },
    };

    try {
      if (isGuestCart) {
        guestCart.add(apiData);
        setAddedToCart((prev) => new Set(prev).add(normalizeDomain(suggestion.websiteName)));
        showAlert(t.cart.matchingDomains.addSuccess, {
          duration: 2500,
          type: "success",
        });
        const data = guestCart.list();
        window.dispatchEvent(
          new CustomEvent("cart:updated:payload", { detail: data }),
        );
      } else {
        const result = await cartAPI.addToCart(apiData);
        if (result?.success === true) {
          setAddedToCart((prev) => new Set(prev).add(normalizeDomain(suggestion.websiteName)));
          showAlert(result?.message || t.cart.matchingDomains.addSuccess, {
            duration: 2500,
            type: "success",
          });
          try {
            const refreshed = await cartAPI.getListAddToCart();
            const data = refreshed?.data || refreshed;
            window.dispatchEvent(
              new CustomEvent("cart:updated:payload", { detail: data }),
            );
          } catch {
            window.dispatchEvent(new Event("cart:updated"));
          }
        } else {
          showAlert(t.cart.matchingDomains.addError, {
            type: "warning",
            duration: 2500,
          });
        }
      }
    } catch (error) {
      console.error("Failed to add matching domain:", error);
      showAlert(t.cart.matchingDomains.addError, {
        type: "warning",
        duration: 2500,
      });
    } finally {
      setAdding((prev) => ({ ...prev, [suggestion.websiteName]: false }));
    }
  };

  if (!domains.length) return null;

  return (
    <div>
      <h2 className="flex flex-col flex-wrap items-start justify-start card-title font-medium">
        <p className="text-primary dark:text-gray-500 mb-1.5">
          {t.cart.matchingDomains.title}
        </p>
      </h2>

      {loading && suggestions.length < 1 ? (
        <div className="border border-darkbtn-100 rounded dark:border-gray-800 p-4 mt-3 text-sm text-primary dark:text-gray-300 ">
          {t.cart.matchingDomains.fetching}
        </div>
      ) : suggestions.length === 0 ? (
        <div className="border border-darkbtn-100 rounded dark:border-gray-800 p-4 mt-3 text-sm text-primary dark:text-gray-300">
          {t.cart.matchingDomains.noSuggestions}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {suggestions.map((suggestion) => {
            const parts = suggestion.websiteName.split(".");
            const tld = parts.length > 1 ? `.${parts.slice(1).join(".")}` : "";
            const strikePrice =
              suggestion.renewalFee &&
              suggestion.renewalFee > suggestion.registrationFee
                ? suggestion.renewalFee
                : null;
            const normalized = normalizeDomain(suggestion.websiteName);
            const isInCart = existingDomains.has(normalized) || addedToCart.has(normalized);
            const isAdding = adding[suggestion.websiteName];

            return (
              <div
                className="border border-darkbtn-100 rounded dark:border-gray-800 p-4"
                key={suggestion.websiteName}
              >
                <div className="flex justify-between items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-darkbtn dark:text-gray-500 text-lg font-medium truncate">
                      {tld || suggestion.websiteName}
                    </p>
                  </div>
                  <div className="flex justify-center items-center gap-2 flex-shrink-0">
                    <p className="text-15 font-medium text-tealdark whitespace-nowrap">
                      {formatPrice(suggestion.registrationFee)}
                    </p>
                    {strikePrice && (
                      <p className="text-13 font-medium line-through text-primary dark:text-gray-500 whitespace-nowrap">
                        {formatPrice(strikePrice)}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    className={`rounded bg-darkbtn hover:bg-darkbtn-hover p-1.5 flex-none flex-shrink-0 cursor-pointer ${
                      isInCart || isAdding
                        ? "opacity-60 cursor-not-allowed"
                        : ""
                    }`}
                    onClick={() => handleAddToCart(suggestion)}
                    disabled={isInCart || isAdding}
                  >
                    {isAdding ? (
                      <span className="text-xs">{t.cart.matchingDomains.adding}</span>
                    ) : isInCart ? (
                      <span className="text-xs flex items-center gap-1 text-white">
                        <FiCheck className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <img src={cart} alt="add-to-cart" title="" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MatchingDomainList;
