import { IoClose, IoChevronDown } from "react-icons/io5";
import { RiGlobalLine } from "react-icons/ri";
import { TbArrowRight } from "react-icons/tb";
import { FiInfo } from "react-icons/fi";
import { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { NavLink } from "react-router";
import { formatDate } from "../../utils/formatDate";
import { IoIosArrowDown } from "react-icons/io";
import { MdCheck } from "react-icons/md";
import { useLanguage } from "../../hooks/useLanguage";

// Note: DEFAULT_PLAN_OPTIONS descriptions should be provided via props with translations
// This is kept as fallback but should be overridden by translated planOptions prop
const DEFAULT_PLAN_OPTIONS = [
  {
    id: "full",
    label: "Full",
    price: 5.99,
    originalPrice: 8.99,
    description: "",
  },
  {
    id: "limited",
    label: "Limited",
    price: 2.99,
    originalPrice: 6.99,
    description: "",
  },
  {
    id: "off",
    label: "Off",
    price: 0,
    originalPrice: 0,
    description: "",
  },
];

const VAT_RATE = 0.2;

const ChangePrivacyModal = ({
  onClose,
  domainName,
  planOptions,
  initialPlanId,
  expirationDate,
  onCheckout,
  isCheckoutLoading,
}) => {
  const { t } = useLanguage();

  const availablePlans = useMemo(() => {
    if (!Array.isArray(planOptions) || planOptions.length === 0) {
      return DEFAULT_PLAN_OPTIONS;
    }
    return planOptions.map((plan) => ({
      ...plan,
      price:
        typeof plan.price === "number" ? plan.price : Number(plan.price) || 0,
      originalPrice:
        typeof plan.originalPrice === "number"
          ? plan.originalPrice
          : Number(plan.originalPrice) || 0,
    }));
  }, [planOptions]);

  const [selectedPlanId, setSelectedPlanId] = useState(() => {
    const planExists = availablePlans.some((plan) => plan.id === initialPlanId);
    if (initialPlanId && planExists) {
      return initialPlanId;
    }
    return availablePlans[0]?.id ?? null;
  });

  const selectedPlan = useMemo(() => {
    if (!selectedPlanId) return availablePlans[0] ?? null;
    return (
      availablePlans.find((plan) => plan.id === selectedPlanId) ??
      availablePlans[0] ??
      null
    );
  }, [availablePlans, selectedPlanId]);

  const subtotal = selectedPlan?.price ?? 0;
  const vatAmount = useMemo(
    () => Number((subtotal * VAT_RATE).toFixed(2)),
    [subtotal],
  );
  const total = useMemo(
    () => Number((subtotal + vatAmount).toFixed(2)),
    [subtotal, vatAmount],
  );

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }),
    [],
  );

  const formattedExpirationDate = useMemo(() => {
    if (expirationDate) {
      const formatted = formatDate(expirationDate);
      if (formatted) {
        return formatted;
      }
    }
    const fallback = new Date();
    fallback.setFullYear(fallback.getFullYear() + 1);
    return formatDate(fallback);
  }, [expirationDate]);

  const [isProcessing, setIsProcessing] = useState(false);

  const handlePlanSelect = (planId) => {
    setSelectedPlanId(planId);
  };

  const handleCheckout = async () => {
    if (!onCheckout || !selectedPlan || isCheckoutLoading) return;
    if (selectedPlan?.price <= 0) {
      return;
    }
    try {
      setIsProcessing(true);
      await onCheckout({
        planId: selectedPlan.id,
        planLabel: selectedPlan.label,
        baseAmount: subtotal,
        vatAmount,
        total,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const [VTXId, setVTXId] = useState("");
  const [VTATax, setVTATax] = useState(false);

  return (
    <div className="fixed inset-0 z-50 bg-white/80 dark:bg-gray-600/80 overflow-auto py-5">
      <div className="flex items-center justify-center w-full">
        <div className="modal-dialog">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-black"
          >
            <IoClose className="text-primary dark:text-gray-500" size={30} />
          </button>

          {/* Modal Title */}
          <div className="flex flex-col gap-2">
            <span className="text-base font-medium text-darkbtn dark:text-white flex items-center gap-1">
              <RiGlobalLine className="text-lg" />{" "}
              {domainName || t.admin.yourDomain || "yourdomain.com"}
            </span>
            <h2 className="modal-title">
              {t.admin.managePrivacyProtection}
              <p className="text-15 font-medium text-secondary mt-1">
                {t.admin.whoisProtectionDescription}
              </p>
            </h2>
          </div>

          <div className="flex gap-2 justify-between items-center w-full">
            <div className="flex flex-col gap-1 w-full">
              <label className="flex items-start justify-between gap-2 text-13 text-secondary dark:text-gray-400 font-medium px-4 mb-1">
                <span>{t.admin.term}</span>
                <span>{t.admin.pricePerYear || "Price/yr."}</span>
              </label>

              {availablePlans.map((plan) => {
                const isSelected = plan.id === selectedPlan?.id;
                return (
                  <label
                    key={plan.id}
                    className={`choose-plan-price flex-col gap-2.5 ${
                      isSelected ? "selected" : ""
                    }`}
                  >
                    <div className="flex justify-between items-start w-full">
                      <div className="flex items-start gap-2">
                        <div className="mt-1">
                          <input
                            type="radio"
                            name="plan"
                            checked={isSelected}
                            onChange={() => handlePlanSelect(plan.id)}
                            className="sr-only"
                          />

                          <div
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors duration-200 ${
                              isSelected
                                ? "border-tealdark bg-tealdark"
                                : "border-gray-400"
                            }`}
                          >
                            {isSelected && (
                              <div className="w-1.5 h-1.5 bg-white dark:bg-gray-800 rounded-full"></div>
                            )}
                          </div>
                        </div>
                        <p className="font-medium text-15 text-primary dark:text-gray-300">
                          {plan.label}
                        </p>
                      </div>
                      <p className="text-tealdark font-medium flex items-center gap-1 text-15">
                        {currencyFormatter.format(plan.price)}
                        {plan.originalPrice > plan.price && (
                          <span className="text-13 text-secondary dark:text-gray-400 line-through">
                            {currencyFormatter.format(plan.originalPrice)}
                          </span>
                        )}
                      </p>
                    </div>
                    <p className="text-13 font-medium text-secondary">
                      {plan.description ||
                        (plan.id === "full"
                          ? t.admin.fullPrivacyDescription
                          : plan.id === "limited"
                            ? t.admin.limitedPrivacyDescription
                            : t.admin.offPrivacyDescription)}
                    </p>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Order Summary */}
          <div className="order-summary w-full mt-5">
            <h3 className="font-medium text-lg mb-5 text-primary dark:text-white">
              {t.admin.orderSummary}
            </h3>
            <hr className="card-divider my-3.5" />

            <div className="flex gap-5 flex-col w-full">
              <div>
                <div className="flex justify-between items-center mb-1.5 text-13 text-primary dark:text-gray-500 font-medium">
                  <p>{t.cart.orderSummary.subtotal}</p>
                  <span>{currencyFormatter.format(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center mb-1.5 text-13 text-primary dark:text-gray-500 font-medium">
                  <p className="flex gap-1 items-center">
                    {t.admin.vat20Percent} <FiInfo />
                  </p>
                  <span>{currencyFormatter.format(vatAmount)}</span>
                </div>
                <div className="flex justify-between items-center mb-1.5 text-13 text-primary dark:text-gray-500 font-medium">
                  <p className="flex gap-1 items-center">
                    {t.admin.expiration} <FiInfo />
                  </p>
                  <span>{formattedExpirationDate}</span>
                </div>

                <hr className="card-divider my-3" />

                <div className="flex flex-col gap-2 mb-2.5">
                  <p className="flex items-center gap-2 text-13 ">
                    <span
                      className="cursor-pointer text-darkbtn hover:text-darkbtn-hover dark:text-gray-500 hover:dark:text-white font-medium"
                      onClick={() => setVTATax(!VTATax)}
                    >
                      {t.admin.wantToAddVatTaxId}{" "}
                      <IoChevronDown
                        size={14}
                        className={VTATax ? "rotate-180 inline" : "inline"}
                      />
                    </span>
                  </p>

                  {VTATax && (
                    <>
                      <div className="w-full sm:w-4/5 flex sm:flex-row flex-col gap-2">
                        <div className="relative w-full sm:w-56">
                          <select
                            className={`input-field admin-form peer`}
                            id="country"
                            name="selectedCountryCode"
                          >
                            <option value="">{t.admin.selectCountry}</option>
                          </select>
                          <IoIosArrowDown
                            size={15}
                            className="absolute top-1/2 transform -translate-y-1/2 right-4 text-primary dark:text-white pointer-events-none"
                          />

                          {/* <label htmlFor="country" className={`absolute left-5 top-2 text-xs font-medium pointer-events-none transition-all dark:text-gray-500 ${values.country ? 'text-gray-600' : 'text-secondary'}`}> */}

                          <label
                            htmlFor="country"
                            className={`absolute left-5 top-2 text-xs font-medium pointer-events-none transition-all dark:text-gray-500 text-secondary`}
                          >
                            {t.admin.country}
                          </label>

                          {/* <ErrorMessage name="country" component="p" className="text-warning pl-5 text-xs font-medium mt-1" /> */}
                        </div>

                        <div className="relative w-full">
                          <input
                            type="text"
                            className="input-field admin-form peer w-full"
                            id="vatTaxId"
                            value={VTXId}
                            onChange={(e) => setVTXId(e.target.value)}
                          />
                          <label
                            htmlFor="vatTaxId"
                            className={`absolute left-5 transition-all font-medium ${
                              VTXId
                                ? "top-2 text-xs text-gray-600"
                                : "top-4 text-13 text-primary dark:text-gray-500 "
                            } peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}
                          >
                            {t.admin.vatTaxIdPlaceholder || "PT87838273"}
                          </label>
                        </div>
                      </div>

                      <div className="w-full py-2 px-3 bg-white dark:bg-gray-900 text-sucess-400 text-xs font-medium rounded-md flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <MdCheck className="w-4 h-4 flex-none" />
                          <p>{t.admin.vatNumberVerified}</p>
                        </div>
                        <IoClose className="cursor-pointer w-4 h-4 text-primary dark:text-white" />
                      </div>
                    </>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <p className="text-primary dark:text-gray-500 text-15 font-medium">
                    {t.admin.total}:
                  </p>
                  <span className="text-tealdark font-semibold text-lg">
                    {currencyFormatter.format(total)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <p className="flex items-center gap-2 text-13 text-darkbtn hover:text-darkbtn-hover dark:text-gray-500 hover:dark:text-white font-medium cursor-pointer">
                  {t.cart.orderSummary.havePromocode}{" "}
                  <IoChevronDown size={14} />
                </p>

                {/* <div className="w-full flex sm:flex-row flex-col justify-center items-center gap-2 promocode">
                                    <div className="relative w-full">
                                        <input
                                            type="text"
                                            className="input-field peer w-full"
                                            id="email"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                        />
                                        <label
                                            htmlFor="email"
                                            className={`absolute left-5 transition-all font-medium ${email ? 'top-2 text-xs text-gray-600' : 'top-4 text-13 text-primary dark:text-gray-500 '} peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}
                                        >
                                            Put Your Promocode Here *
                                        </label>
                                    </div>
                                    <a href='#' className='add-to-cart sm:w-auto w-full'>
                                        Apply
                                    </a>
                                </div> */}

                {/* <div className="w-full flex justify-center items-center gap-2 promocode">
                                    <div className="promocode-added">
                                        <MdCheck className='w-5 h-5 flex-none' /> 
                                        <p>Promocode ‘SAVE15NOW’ was applied</p>
                                    </div>
                                </div> */}

                <div className="flex justify-start my-2">
                  <button
                    type="button"
                    className="add-to-cart px-7 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                    onClick={handleCheckout}
                    disabled={
                      isProcessing ||
                      isCheckoutLoading ||
                      !onCheckout ||
                      !selectedPlan ||
                      selectedPlan.price <= 0
                    }
                  >
                    {isProcessing || isCheckoutLoading
                      ? t.admin.processing
                      : t.admin.goToCheckout}
                    {!(isProcessing || isCheckoutLoading) && (
                      <TbArrowRight size={18} />
                    )}
                  </button>
                </div>

                <p className="text-13 font-medium text-secondary">
                  {t.admin.byCheckingOut}{" "}
                  <NavLink
                    to="/terms-and-conditions"
                    className="text-teallight-500 font-semibold hover:underline"
                  >
                    {t.admin.termsOfService}
                  </NavLink>{" "}
                  {t.admin.andConfirmThat}{" "}
                  <NavLink
                    to="/privacy-policy"
                    className="text-teallight-500 font-semibold hover:underline"
                  >
                    {t.admin.privacyPolicy}
                  </NavLink>
                  . {t.admin.youCanCancel}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

ChangePrivacyModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  domainName: PropTypes.string,
  planOptions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      price: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
        .isRequired,
      originalPrice: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      description: PropTypes.string.isRequired,
    }),
  ),
  initialPlanId: PropTypes.string,
  expirationDate: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.instanceOf(Date),
  ]),
  onCheckout: PropTypes.func,
  isCheckoutLoading: PropTypes.bool,
};

ChangePrivacyModal.defaultProps = {
  domainName: "",
  planOptions: DEFAULT_PLAN_OPTIONS,
  initialPlanId: undefined,
  expirationDate: undefined,
  onCheckout: undefined,
  isCheckoutLoading: false,
};

export default ChangePrivacyModal;
