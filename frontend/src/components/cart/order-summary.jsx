import { IoChevronDown } from "react-icons/io5";
import { TbArrowRight } from "react-icons/tb";
import { MdCheck } from "react-icons/md";
import { IoClose } from "react-icons/io5";
import { useState } from "react";
import { NavLink, useNavigate } from "react-router";
import { validatePromoCode } from "../../utils/promocode";
import { useAlert } from "../../context/AlertContext";
import { useAuth } from "../../hooks/useAuth";
import { useLanguage } from "../../hooks/useLanguage";

const OrderSummary = ({ itemsCount = 0, subtotal = 0, isGuestCart = false }) => {
  const { showAlert } = useAlert();
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [promoCode, setPromoCode] = useState("");
  const [promoExpanded, setPromoExpanded] = useState(false);
  const [appliedPromoCode, setAppliedPromoCode] = useState(null);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [validatingPromo, setValidatingPromo] = useState(false);

  const handleApplyPromoCode = async () => {
    if (!promoCode.trim()) {
      showAlert(t.cart.orderSummary.pleaseEnterPromocode, {
        duration: 3000,
        type: "fail",
      });
      return;
    }

    setValidatingPromo(true);

    try {
      // Validate with backend if user is logged in
      const validation = user 
        ? await validatePromoCode(promoCode, true) // Backend validation
        : await validatePromoCode(promoCode, false); // Client-side only (also async)
      
      if (!validation.valid) {
        const errorMsg = validation.alreadyUsed 
          ? t.cart.orderSummary.promocodeAlreadyUsed
          : (validation.error || t.cart.orderSummary.invalidPromocode);
        
        showAlert(errorMsg, {
          duration: 3000,
          type: "fail",
        });
        return;
      }

      // Use validation result directly (already has discount and code)
      const discountAmount = validation.discount;
      const promoCodeNormalized = validation.code;

      setAppliedPromoCode(promoCodeNormalized);
      setPromoDiscount(discountAmount);

      // Save to localStorage so it persists on checkout page
      localStorage.setItem('appliedPromoCode', promoCodeNormalized);
      localStorage.setItem('promoDiscount', discountAmount.toString());

      showAlert(t.cart.orderSummary.promocodeAppliedSuccess.replace('{code}', promoCodeNormalized).replace('{amount}', discountAmount.toFixed(2)), {
        duration: 3000,
        type: "success",
      });
    } catch (error) {
      showAlert(error.message || t.cart.orderSummary.failedToValidatePromocode, {
        duration: 3000,
        type: "fail",
      });
    } finally {
      setValidatingPromo(false);
    }
  };

  const handleRemovePromoCode = () => {
    setAppliedPromoCode(null);
    setPromoDiscount(0);
    setPromoCode("");
    
    // Remove from localStorage
    localStorage.removeItem('appliedPromoCode');
    localStorage.removeItem('promoDiscount');
  };

  const finalSubtotal = Math.max(0, subtotal - promoDiscount);

  return (
    <div className="w-full">
      {/* Order Summary */}
      <div className="order-summary w-full">
        <h3 className="font-medium text-2xl mb-5 text-primary dark:text-white">
          {t.cart.orderSummary.title}
        </h3>

        <h4 className="text-primary dark:text-gray-500 text-15 font-medium">
          {itemsCount} {itemsCount === 1 ? t.cart.orderSummary.item : t.cart.orderSummary.items}
        </h4>

        <hr className="card-divider my-3.5" />

        <div className="flex gap-5 flex-col w-full">
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <p className="text-primary dark:text-gray-500 text-base font-medium">
                {t.cart.orderSummary.subtotal}
              </p>
              <span className="text-tealdark font-semibold text-2xl">
                ${Number(finalSubtotal).toFixed(2)}*
              </span>
            </div>
            {promoDiscount > 0 && (
              <div className="flex justify-between items-center mb-1.5">
                <p className="text-primary dark:text-gray-500 text-sm font-medium">
                  {t.cart.orderSummary.promocodeLabel.replace('{code}', appliedPromoCode)}
                </p>
                <span className="text-green-600 dark:text-green-400 text-sm font-medium">
                  -${Number(promoDiscount).toFixed(2)}
                </span>
              </div>
            )}
            <p className="text-13 font-medium text-teallight-400">
              {t.cart.orderSummary.taxNote}
            </p>
          </div>

          {/* <span className="save-lable">
            Awesome! You saved $78.50 on your order.
          </span> */}

          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-2 text-13">
              <span className="cursor-pointer text-darkbtn hover:text-darkbtn-hover dark:text-gray-500 hover:dark:text-white font-medium" onClick={() => setPromoExpanded(!promoExpanded)}>{t.cart.orderSummary.havePromocode} <IoChevronDown size={14} className={promoExpanded ? 'rotate-180 inline' : 'inline'} /></span>
            </p>

            {promoExpanded && (
              <>
                {!appliedPromoCode ? (
                  <div className="w-full flex sm:flex-row flex-col justify-center items-center gap-2 promocode">
                    <div className="relative w-full">
                      <input
                        type="text"
                        className="input-field peer w-full"
                        id="promoCode"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleApplyPromoCode();
                          }
                        }}
                        placeholder=""
                      />
                      <label
                        htmlFor="promoCode"
                        className={`absolute left-5 transition-all font-medium ${
                          promoCode
                            ? "top-2 text-xs text-gray-600"
                            : "top-4 text-13 text-primary dark:text-gray-500 "
                        } peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}
                      >
                        {t.cart.orderSummary.promocodePlaceholder}
                      </label>
                    </div>
                    <button 
                      onClick={handleApplyPromoCode}
                      disabled={validatingPromo}
                      className={`add-to-cart sm:w-auto w-full ${validatingPromo ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      {validatingPromo ? t.cart.orderSummary.validating : t.cart.orderSummary.apply}
                    </button>
                  </div>
                ) : (
                  <div className="w-full flex justify-center items-center gap-2 promocode">
                    <div className="promocode-added">
                      <MdCheck className="w-5 h-5 flex-none" />
                      <p>{t.cart.orderSummary.promocodeApplied.replace('{code}', appliedPromoCode)}</p>
                      <IoClose 
                        className="cursor-pointer w-4 h-4 text-primary dark:text-white hover:text-red-500 ml-2" 
                        onClick={handleRemovePromoCode}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex justify-start">
            {isGuestCart && finalSubtotal > 0 ? (
              <button
                type="button"
                className="add-to-cart px-7"
                onClick={() => {
                  localStorage.setItem("path", "/payment-checkout");
                  navigate("/sign-in", { replace: true });
                }}
              >
                {t.cart.orderSummary.goToCheckout} <TbArrowRight size={18} />
              </button>
            ) : finalSubtotal === 0 ? (
              <button
                type="button"
                disabled
                className="add-to-cart px-7 disable pointer-events-none"
              >
                {t.cart.orderSummary.goToCheckout} <TbArrowRight size={18} />
              </button>
            ) : (
              <NavLink to="/payment-checkout" className="add-to-cart px-7">
                {t.cart.orderSummary.goToCheckout} <TbArrowRight size={18} />
              </NavLink>
            )}
          </div>

          <p className="text-13 font-medium text-teallight-400">
            {t.cart.orderSummary.checkoutAgreement}{" "}
            <NavLink to="/terms-and-conditions" className="text-teallight-500 hover:underline">
              {t.cart.orderSummary.termsOfService}
            </NavLink>{" "}
            {t.cart.orderSummary.andConfirm}{" "}
            <NavLink to="/privacy-policy" className="text-teallight-500 hover:underline">
              {t.cart.orderSummary.privacyPolicy}
            </NavLink>
            {t.cart.orderSummary.cancelRecurring}
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrderSummary;
