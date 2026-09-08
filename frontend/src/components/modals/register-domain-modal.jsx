import { IoClose, IoChevronDown } from "react-icons/io5";
import { RiGlobalLine } from "react-icons/ri";
import { TbArrowRight } from "react-icons/tb";
import { FiInfo } from "react-icons/fi";
import { useEffect, useMemo, useState, useCallback } from "react";
import PropTypes from "prop-types";
import { NavLink } from "react-router";
import axios from "axios";
import { domainAPI } from "../../api/domains";
import taxAPI from "../../api/taxApi";
import { validatePromoCode } from "../../utils/promocode";
import { useAuth } from "../../hooks/useAuth";
import { useAlert } from "../../context/AlertContext";
import Loader from "../common/Loader";
import { IoIosArrowDown } from "react-icons/io";
import { MdCheck } from "react-icons/md";
import { useLanguage } from "../../hooks/useLanguage";

const TERMS = [1, 2, 3];
const DEFAULT_TAX_RATE = 0.2;

const formatCurrency = (value) =>
  typeof value === "number" && !Number.isNaN(value)
    ? `$${value.toFixed(2)}`
    : "$0.00";

const addYears = (years) => {
  if (!years) return null;
  const result = new Date();
  result.setUTCFullYear(result.getUTCFullYear() + years);
  return result.toISOString().split("T")[0]; // Format as YYYY-MM-DD
};

const normalizeErrorMessage = (message, fallback) => {
  if (!message) return fallback;
  const trimmed = message.toString().trim();
  if (!trimmed) return fallback;
  if (trimmed.toLowerCase() === "network error") {
    return fallback;
  }
  return trimmed;
};

const RegisterDomainModal = ({
  onClose,
  domainName,
  pricingProvider = "hostbay",
}) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [selectedTerm, setSelectedTerm] = useState(TERMS[0]);
  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPromocode, setShowPromocode] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const { showAlert } = useAlert();

  const [promoCode, setPromoCode] = useState("");
  const [appliedPromoCode, setAppliedPromoCode] = useState(null);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [validatingPromo, setValidatingPromo] = useState(false);

  const [VTXId, setVTXId] = useState("");
  const [VTATax, setVTATax] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [taxRate, setTaxRate] = useState(DEFAULT_TAX_RATE);
  const [taxType, setTaxType] = useState("VAT");
  const [vatValidated, setVatValidated] = useState(false);
  const [vatValidating, setVatValidating] = useState(false);
  const [taxRateLoading, setTaxRateLoading] = useState(false);
  const [countryDetecting, setCountryDetecting] = useState(true);
  const [countries, setCountries] = useState([{ code: "", name: "" }]);
  const [countriesLoading, setCountriesLoading] = useState(true);

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        setCountriesLoading(true);
        const response = await axios.get("https://restcountries.com/v3.1/all?fields=name,cca2");
        if (response.data && Array.isArray(response.data)) {
          const countriesList = response.data
            .map((c) => ({ code: c.cca2, name: c.name?.common || c.name?.official }))
            .sort((a, b) => a.name.localeCompare(b.name));
          setCountries([{ code: "", name: t.admin.selectCountry || "Select country" }, ...countriesList]);
        }
      } catch (err) {
        setCountries([{ code: "", name: t.admin.selectCountry || "Select country" }]);
      } finally {
        setCountriesLoading(false);
      }
    };
    fetchCountries();
  }, [t.admin.selectCountry]);

  useEffect(() => {
    const detectUserCountry = async () => {
      setCountryDetecting(true);
      try {
        const response = await taxAPI.getUserCountry();
        if (response?.success && response?.responseData?.country) {
          setSelectedCountry(response.responseData.country);
          const rate = response.responseData.taxRate;
          setTaxRate(rate ?? (response.responseData.country === "IN" ? 0.18 : DEFAULT_TAX_RATE));
          setTaxType(response.responseData.taxType || "VAT");
        }
      } catch (err) {
        // Keep default
      } finally {
        setCountryDetecting(false);
      }
    };
    detectUserCountry();
  }, []);

  useEffect(() => {
    if (!selectedCountry || countryDetecting) return;
    const fetchTaxRate = async () => {
      setTaxRateLoading(true);
      try {
        const response = await taxAPI.getTaxRate(selectedCountry);
        const newRate = response?.responseData?.taxRate;
        const newType = response?.responseData?.taxType || "VAT";
        setTaxRate(vatValidated ? 0 : (newRate ?? (selectedCountry === "IN" ? 0.18 : DEFAULT_TAX_RATE)));
        setTaxType(newType);
      } catch (err) {
        setTaxRate(vatValidated ? 0 : (selectedCountry === "IN" ? 0.18 : DEFAULT_TAX_RATE));
      } finally {
        setTaxRateLoading(false);
      }
    };
    fetchTaxRate();
  }, [selectedCountry, countryDetecting, vatValidated]);

  useEffect(() => {
    if (!domainName) {
      setOptions([]);
      return;
    }

    let isMounted = true;

    const fetchPrices = async () => {
      setIsLoading(true);
      setError(null);

      const requests = TERMS.map(async (term) => {
        try {
          const response = await domainAPI.checkDomainPrice({
            websiteName: domainName,
            provider: pricingProvider,
            registrationFeePerc: 50,
            renewalFeePerc: 50,
            transferFeePerc: 50,
            duration: term,
          });

          const registrationFee = response?.responseData?.registrationFee || 0;
          const renewalfee = response?.responseData?.renewalfee || 0;

          // Calculate original price (if registrationFee is discounted by 50%, original is registrationFee * 2)
          const originalPrice = registrationFee * 2;

          return {
            term,
            totalPrice: Number.parseFloat(registrationFee) || 0,
            originalPrice: originalPrice,
            renewalfee: Number.parseFloat(renewalfee) || 0,
          };
        } catch (err) {
          console.error("Failed to fetch registration pricing:", err);
          return {
            term,
            totalPrice: 0,
            originalPrice: 0,
            renewalfee: 0,
            error:
              err?.response?.data?.message ||
              err?.message ||
              t.admin.unableToFetchPricing || "Unable to fetch pricing.",
          };
        }
      });

      const results = await Promise.all(requests);

      if (!isMounted) return;

      const firstError = results.find((result) => result.error);
      if (firstError) {
        const fallbackMessage = t.admin.unableToFetchPricing || "Unable to fetch pricing.";
        const message = normalizeErrorMessage(
          firstError.error,
          fallbackMessage
        );
        setError(message);
        showAlert(message, { duration: 3000, type: "fail" });
      }

      const sanitized = results
        .map(({ term, totalPrice, originalPrice, renewalfee }) => ({
          term,
          totalPrice,
          originalPrice,
          renewalfee,
        }))
        .filter((item) => item.totalPrice > 0)
        .sort((a, b) => a.term - b.term);

      setOptions(sanitized);
      if (sanitized.length > 0) {
        setSelectedTerm((current) =>
          sanitized.some((item) => item.term === current)
            ? current
            : sanitized[0].term
        );
      }
      setIsLoading(false);
    };

    fetchPrices();

    return () => {
      isMounted = false;
    };
  }, [domainName, pricingProvider, showAlert]);

  const selectedOption = useMemo(
    () => options.find((option) => option.term === selectedTerm),
    [options, selectedTerm]
  );

  const subtotal = selectedOption?.totalPrice || 0;
  const subtotalAfterPromo = Math.max(0, subtotal - promoDiscount);
  const effectiveTaxRate = vatValidated ? 0 : taxRate;
  const vatAmount = Number((subtotalAfterPromo * effectiveTaxRate).toFixed(2));
  const total = Number((subtotalAfterPromo + vatAmount).toFixed(2));

  const expirationDate = useMemo(() => {
    const date = addYears(selectedTerm);
    return date || "—";
  }, [selectedTerm]);

  const handleVatIdChange = useCallback(
    async (vatId) => {
      setVTXId(vatId);
      if (!vatId) {
        setVatValidated(false);
        return;
      }
      if (!selectedCountry) {
        showAlert(t.payment?.pleaseSelectCountryFirst || "Please select a country first", { duration: 3000, type: "fail" });
        return;
      }
      if (vatId.length >= 6) {
        setVatValidating(true);
        try {
          const response = await taxAPI.validateVatId(selectedCountry, vatId);
          if (response?.success && response?.responseData?.isValid) {
            setVatValidated(true);
            setTaxRate(0);
            showAlert(t.admin?.vatNumberVerified || "VAT number verified", { duration: 3000, type: "success" });
          } else {
            setVatValidated(false);
            showAlert(t.payment?.taxIdValidationFailed || "Invalid tax ID", { duration: 3000, type: "fail" });
          }
        } catch (err) {
          setVatValidated(false);
          showAlert(t.payment?.failedToValidateTaxId || "Failed to validate tax ID", { duration: 3000, type: "fail" });
        } finally {
          setVatValidating(false);
        }
      } else {
        setVatValidated(false);
      }
    },
    [selectedCountry, showAlert, t]
  );

  const handleApplyPromoCode = useCallback(async () => {
    if (!promoCode.trim()) {
      showAlert(t.cart?.orderSummary?.pleaseEnterPromocode || "Please enter a promocode", { duration: 3000, type: "fail" });
      return;
    }
    setValidatingPromo(true);
    try {
      const validation = user ? await validatePromoCode(promoCode, true) : await validatePromoCode(promoCode, false);
      if (!validation.valid) {
        const msg = validation.alreadyUsed ? (t.cart?.orderSummary?.promocodeAlreadyUsed || "Already used") : (validation.error || "Invalid promocode");
        showAlert(msg, { duration: 3000, type: "fail" });
        return;
      }
      setAppliedPromoCode(validation.code);
      setPromoDiscount(validation.discount);
      showAlert(
        (t.cart?.orderSummary?.promocodeAppliedSuccess || "Promocode applied! -${amount}")
          .replace("{code}", validation.code)
          .replace("{amount}", validation.discount.toFixed(2)),
        { duration: 3000, type: "success" }
      );
    } catch (err) {
      showAlert(err?.message || t.cart?.orderSummary?.failedToValidatePromocode || "Failed to validate promocode", { duration: 3000, type: "fail" });
    } finally {
      setValidatingPromo(false);
    }
  }, [promoCode, user, showAlert, t]);

  const handleRemovePromoCode = useCallback(() => {
    setAppliedPromoCode(null);
    setPromoDiscount(0);
    setPromoCode("");
  }, []);

  const getTaxLabel = () => {
    if (vatValidated) return `${taxType} (0%)`;
    return `${taxType} (${(taxRate * 100).toFixed(1)}%)`;
  };

  const handleCheckout = async () => {
    if (isCheckoutLoading) return;

    if (!domainName) {
      showAlert(t.admin.domainInfoUnavailable, {
        duration: 2500,
        type: "fail",
      });
      return;
    }

    if (!selectedOption) {
      showAlert(t.admin.selectRegistrationTerm || "Please select a registration term to continue.", {
        duration: 2500,
        type: "fail",
      });
      return;
    }

    setIsCheckoutLoading(true);
    try {
      const provider = pricingProvider === "hostbay" ? "openprovider" : pricingProvider;
      let ns1 = "ns1.nameword.com";
      let ns2 = "ns2.dns-parking.com";
      if (provider === "openprovider") {
        ns1 = "ns1.openprovider.nl";
        ns2 = "ns2.openprovider.be";
      } else if (provider === "cloudflare") {
        ns1 = "sara.ns.cloudflare.com";
        ns2 = "jack.ns.cloudflare.com";
      }

      const domainData = {
        productType: 1,
        websiteName: domainName,
        duration: selectedOption.term,
        isWhoisProtection: false,
        ns1,
        ns2,
        ns3: null,
        ns4: null,
        provider,
        handle: "default",
      };

      const response = await domainAPI.getDomainDynoCheckoutUrl({
        amount: total,
        domainData,
        walletAmount: 0,
        rewardPointsUsed: 0,
        rewardDiscount: 0,
      });

      const redirectUrl =
        response?.redirect_url ||
        response?.data?.redirect_url ||
        response?.checkoutUrl ||
        response?.data?.checkoutUrl;

      if (response?.success && redirectUrl) {
        showAlert(t.admin.redirectingToDynoPay || "Redirecting to payment...", {
          duration: 1500,
          type: "success",
        });
        window.location.assign(redirectUrl);
        return;
      }

      const backendMsg = normalizeErrorMessage(
        response?.message || response?.error?.message,
        t.admin.failedToStartDomainCheckout || "Failed to start checkout."
      );
      showAlert(backendMsg, { duration: 3000, type: "fail" });
    } catch (error) {
      const errorMsg = normalizeErrorMessage(
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message,
        t.admin.failedToStartDomainCheckout || "Failed to start checkout."
      );
      showAlert(errorMsg, { duration: 3000, type: "fail" });
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white/80 dark:bg-gray-600/80 overflow-auto py-5">
      <div className="flex items-center justify-center w-full">
        <div className="modal-dialog">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-black"
          >
            <IoClose className="text-primary dark:text-gray-500" size={30} />
          </button>

          <div className="flex flex-col gap-2">
            <span className="text-base font-medium text-darkbtn dark:text-white flex items-center gap-1">
              <RiGlobalLine className="text-lg" /> @{domainName || "—"}
            </span>
            <h2 className="modal-title">
              {t.admin.registerANewDomain}
              <p className="text-15 font-medium text-secondary mt-1">
                {t.admin.reviewInvoiceAndCheckout || "Review your selected invoice and proceed to checkout"}
              </p>
            </h2>
          </div>

          <div className="flex gap-2 justify-between items-center w-full mt-4">
            <div className="flex flex-col gap-1 w-full">
              <label className="flex items-start justify-between gap-2 text-13 text-secondary dark:text-gray-400 font-medium px-4 mb-1">
                <span>{t.admin.term}</span>
                <span>{t.admin.pricePerYear}</span>
              </label>

              {isLoading && (
                <div className="py-7 px-5">
                  <p className="text-secondary text-sm">
                    {t.admin.loadingRegistrationOptions || "Loading registration options..."}
                  </p>
                </div>
              )}

              {!isLoading && options.length === 0 && (
                <div className="py-7 px-5">
                  <p className="text-secondary text-sm">
                    {t.admin.pricingUnavailable || "Pricing unavailable. Please try again later."}
                  </p>
                </div>
              )}

              {!isLoading &&
                options.map((option) => {
                  const isSelected = selectedTerm === option.term;
                  const label = `${option.term} ${option.term === 1 ? t.admin.year : t.admin.years}`;
                  return (
                    <label
                      key={option.term}
                      className={`choose-plan-price ${isSelected ? "selected" : ""
                        }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="mt-1">
                          <input
                            type="radio"
                            name="register-term"
                            checked={isSelected}
                            onChange={() => setSelectedTerm(option.term)}
                            className="sr-only"
                          />

                          <div
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors duration-200 ${isSelected
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
                          {label}
                        </p>
                      </div>
                      <p className="text-tealdark font-medium flex items-center gap-2 text-15">
                        {formatCurrency(option.totalPrice)}
                        {option.originalPrice > option.totalPrice && (
                          <span className="text-13 text-secondary dark:text-gray-400 line-through">
                            {formatCurrency(option.originalPrice)}
                          </span>
                        )}
                      </p>
                    </label>
                  );
                })}

              {error && <p className="text-warning text-xs px-4">{error}</p>}
            </div>
          </div>

          <div className="order-summary w-full mt-5">
            <h3 className="font-medium text-lg mb-5 text-primary dark:text-white">
              {t.admin.orderSummary}
            </h3>
            <hr className="card-divider my-3.5" />

            <div className="flex gap-5 flex-col w-full">
              <div>
                <div className="flex justify-between items-center mb-1.5 text-13 text-primary dark:text-gray-500 font-medium">
                  <p>{t.cart.orderSummary.subtotal}</p>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {promoDiscount > 0 && (
                  <div className="flex justify-between items-center mb-1.5 text-13 text-primary dark:text-gray-500 font-medium">
                    <p className="flex gap-1 items-center">
                      {t.cart?.orderSummary?.promocodeLabel?.replace("{code}", appliedPromoCode) || `Promocode (${appliedPromoCode})`} <FiInfo />
                    </p>
                    <span>-{formatCurrency(promoDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center mb-1.5 text-13 text-primary dark:text-gray-500 font-medium">
                  <p className="flex gap-1 items-center">
                    {getTaxLabel()} <FiInfo />
                    {countryDetecting && (
                      <span className="text-xs text-gray-400 ml-1">({t.payment?.detecting || "Detecting..."})</span>
                    )}
                  </p>
                  <span>{formatCurrency(vatAmount)}</span>
                </div>
                <div className="flex justify-between items-center mb-1.5 text-13 text-primary dark:text-gray-500 font-medium">
                  <p className="flex gap-1 items-center">
                    {t.admin.expiration} <FiInfo />
                  </p>
                  <span>{expirationDate}</span>
                </div>

                <hr className="card-divider my-3" />

                <div className="flex flex-col gap-2 mb-2.5">
                  <p className="flex items-center gap-2 text-13 ">
                    <span className="cursor-pointer text-darkbtn hover:text-darkbtn-hover dark:text-gray-500 hover:dark:text-white font-medium" onClick={() => setVTATax(!VTATax)}>{t.admin.wantToAddVatTaxId} <IoChevronDown size={14} className={VTATax ? 'rotate-180 inline' : 'inline'} /></span>
                  </p>

                  {VTATax && (
                    <>
                      <div className="w-full sm:w-4/5 flex sm:flex-row flex-col gap-2">
                        <div className="relative w-full sm:w-56">
                          <select
                            className={`input-field admin-form peer ${taxRateLoading || countriesLoading ? "opacity-60" : ""}`}
                            id="country"
                            name="selectedCountryCode"
                            value={selectedCountry}
                            onChange={(e) => {
                              setSelectedCountry(e.target.value);
                              setVTXId("");
                              setVatValidated(false);
                            }}
                            disabled={taxRateLoading || countriesLoading}
                          >
                            {countriesLoading ? (
                              <option value="">{t.payment?.loadingCountries || "Loading..."}</option>
                            ) : (
                              countries.map((c) => (
                                <option key={c.code} value={c.code}>
                                  {c.name}
                                </option>
                              ))
                            )}
                          </select>
                          <IoIosArrowDown size={15} className="absolute top-1/2 transform -translate-y-1/2 right-4 text-primary dark:text-white pointer-events-none" />
                          <label htmlFor="country" className="absolute left-5 top-2 text-xs font-medium pointer-events-none transition-all dark:text-gray-500 text-secondary">
                            {t.admin.country}
                          </label>
                        </div>
                        <div className="relative w-full">
                          <input
                            type="text"
                            className={`input-field admin-form peer w-full ${vatValidating ? "opacity-60" : ""} ${vatValidated ? "border-green-500" : ""}`}
                            id="vatTaxId"
                            value={VTXId}
                            onChange={(e) => handleVatIdChange(e.target.value)}
                            disabled={vatValidating || !selectedCountry}
                          />
                          <label
                            htmlFor="vatTaxId"
                            className={`absolute left-5 transition-all font-medium ${VTXId ? "top-2 text-xs text-gray-600" : "top-4 text-13 text-primary dark:text-gray-500 "} peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}
                          >
                            {t.admin.vatTaxIdPlaceholder || "PT87838273"}
                          </label>
                          {vatValidating && (
                            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-tealdark" />
                            </div>
                          )}
                        </div>
                      </div>
                      {vatValidated && VTXId && (
                        <div className="w-full py-2 px-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs font-medium rounded-md flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1">
                            <MdCheck className="w-4 h-4 flex-none" />
                            <p>{t.admin.vatNumberVerified}</p>
                          </div>
                          <IoClose
                            className="cursor-pointer w-4 h-4 text-primary dark:text-white hover:text-red-500"
                            onClick={() => {
                              setVTXId("");
                              setVatValidated(false);
                            }}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <p className="text-primary dark:text-gray-500 text-15 font-medium">
                    {t.admin.total}:
                  </p>
                  <span className="text-tealdark font-semibold text-lg">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  className="flex items-center gap-2 text-13 text-darkbtn hover:text-darkbtn-hover dark:text-gray-500 hover:dark:text-white font-medium cursor-pointer"
                  onClick={() => setShowPromocode((prev) => !prev)}
                >
                  {t.cart.orderSummary.havePromocode}{" "}
                  <IoChevronDown
                    size={14}
                    className={`transition-transform ${showPromocode ? "rotate-180" : ""
                      }`}
                  />
                </button>

                {showPromocode && (
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
                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleApplyPromoCode())}
                          />
                          <label
                            htmlFor="promoCode"
                            className={`absolute left-5 transition-all font-medium ${promoCode ? "top-2 text-xs text-gray-600" : "top-4 text-13 text-primary dark:text-gray-500 "} peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}
                          >
                            {t.cart?.orderSummary?.promocodePlaceholder || "Enter promocode"}
                          </label>
                        </div>
                        <button
                          onClick={handleApplyPromoCode}
                          disabled={validatingPromo}
                          className={`add-to-cart sm:w-auto w-full ${validatingPromo ? "opacity-60 cursor-not-allowed" : ""}`}
                        >
                          {validatingPromo ? (t.cart?.orderSummary?.validating || "Validating...") : (t.cart?.orderSummary?.apply || "Apply")}
                        </button>
                      </div>
                    ) : (
                      <div className="w-full flex justify-center items-center gap-2 promocode">
                        <div className="promocode-added">
                          <MdCheck className="w-5 h-5 flex-none" />
                          <p>{t.cart?.orderSummary?.promocodeApplied?.replace("{code}", appliedPromoCode) || `Promocode ${appliedPromoCode} applied`}</p>
                          <IoClose className="cursor-pointer w-4 h-4 text-primary dark:text-white hover:text-red-500 ml-2" onClick={handleRemovePromoCode} />
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div className="flex justify-start my-2">
                  <button
                    type="button"
                    onClick={handleCheckout}
                    disabled={isCheckoutLoading || !selectedOption || isLoading}
                    className="add-to-cart px-7 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isCheckoutLoading ? t.admin.processing : t.admin.goToCheckout}
                    {!isCheckoutLoading && <TbArrowRight size={18} />}
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
      {isLoading && <Loader />}
    </div>
  );
};

RegisterDomainModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  domainName: PropTypes.string.isRequired,
  pricingProvider: PropTypes.string,
};

RegisterDomainModal.defaultProps = {
  pricingProvider: "hostbay",
};

export default RegisterDomainModal;
