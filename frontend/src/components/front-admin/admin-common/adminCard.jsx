// components/AdminCard.jsx
import { IoFlashOutline, IoClose } from "react-icons/io5";
import { useNavigate } from "react-router";
import { cartAPI } from "../../../api/cartApi";
import { useAlert } from "../../../context/AlertContext";
import { useState } from "react";
import { useLanguage } from "../../../hooks/useLanguage";

const AdminCard = ({
  title,
  discount,
  price,
  oldPrice,
  moreOptions,
  onMoreOptions,
  onHide,
  suggestion,
}) => {
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const [isAdding, setIsAdding] = useState(false);
  const { t } = useLanguage();

  const handleBuyNow = async (e) => {
    e.preventDefault();
    if (!suggestion || isAdding) return;

    setIsAdding(true);
    try {
      const apiData = {
        itemType: "domain",
        websiteName: suggestion.websiteName,
        action: "register",
        availability: suggestion.available,
        years: 1,
        provider: "openprovider",
        price: {
          amount: suggestion.registrationFee,
          currency: "USD",
        },
        renew: {
          amount: suggestion.renewalfee,
          currency: "USD",
        },
      };

      const result = await cartAPI.addToCart(apiData);

      if (result?.success === true) {
        showAlert(result?.message || t.domain.domainAddedSuccess, {
          duration: 2500,
          type: "success",
        });

        // Dispatch cart update event
        try {
          const refreshed = await cartAPI.getListAddToCart();
          const data = refreshed?.data || refreshed;
          window.dispatchEvent(new Event("cart:updated"));
          window.dispatchEvent(
            new CustomEvent("cart:updated:payload", { detail: data })
          );
        } catch {
          window.dispatchEvent(new Event("cart:updated"));
        }

        // navigate(`/domain?value=${suggestion.websiteName}`, { replace: true });
      } else {
        showAlert(result?.message || t.admin.failedToAddDomainToCart, {
          duration: 2500,
          type: "error",
        });
      }
    } catch (error) {
      showAlert(t.admin.failedToAddDomainToCart, {
        duration: 2500,
        type: "error",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleMoreOptionsClick = (e) => {
    e.preventDefault();
    if (onMoreOptions) {
      onMoreOptions();
    }
  };

  const handleHide = (e) => {
    e.preventDefault();
    if (onHide && title) {
      onHide(title);
    }
  };

  return (
    <div className="admin-card">
      <div className="flex items-center justify-between w-full">
        <p className="text-13 text-secondary font-medium flex items-center gap-1">
          <IoFlashOutline /> {t.admin.smartSuggestion}
        </p>
        <p
          className="text-xs text-secondary font-medium flex items-center gap-1 cursor-pointer"
          onClick={handleHide}
        >
          <IoClose /> {t.admin.hide}
        </p>
      </div>

      <p className="text-lg font-medium text-primary dark:text-gray-400">
        {t.admin.protectBrand.replace('{title}', title || '')}
      </p>

      <div className="flex items-center gap-5">
        {discount > 0 && <span className="save-lable">{t.admin.save} {discount}%</span>}
        <span className="text-2xl font-medium text-tealdark flex gap-3 items-center">
          ${price}
          {oldPrice > price && (
            <span className="text-secondary line-through text-base">
              ${oldPrice}
            </span>
          )}
        </span>
      </div>

      <div
        className={`flex items-center admin-btn ${moreOptions ? "gap-2" : ""}`}
      >
        <a href="#" className="add-to-cart" onClick={handleBuyNow}>
          {isAdding ? t.admin.adding : t.admin.buyNow}
        </a>
        {moreOptions && (
          <a href="#" className="btn-outline" onClick={handleMoreOptionsClick}>
            {t.admin.moreOptions}
          </a>
        )}
      </div>
    </div>
  );
};

export default AdminCard;
