import { IoClose, IoChevronDown } from "react-icons/io5";
import { RiGlobalLine } from "react-icons/ri";
import { TbArrowRight } from "react-icons/tb";
import { FiInfo } from "react-icons/fi";
import { useState, useEffect, useMemo } from "react";
import { NavLink } from "react-router";
import { domainAPI } from "../../api/domains";
import { useAlert } from "../../context/AlertContext";
import Loader from "../common/Loader";
import { Formik, Form, Field, ErrorMessage } from "formik";
import { IoIosArrowDown } from "react-icons/io";
import { MdCheck } from "react-icons/md";
import { useLanguage } from "../../hooks/useLanguage";

const TransferChooseDomainModal = ({
  onClose,
  domainData,
  authorizationCode,
}) => {
  const { t } = useLanguage();
  const { showAlert } = useAlert();
  const [selected, setSelected] = useState(t.admin.oneYearTransfer || t.admin.oneYear || "1 Year");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pricing, setPricing] = useState(null);
  const [error, setError] = useState(null);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const terms = [
    t.admin.oneYearTransfer || t.admin.oneYear || "1 Year",
    t.admin.threeYearsTransfer || "3 Years",
    t.admin.fiveYearsTransfer || "5 Years",
    t.admin.tenYearsTransfer || "10 Years"
  ];

  const [VTXId, setVTXId] = useState("");
  const [VTATax, setVTATax] = useState(false);

  // Extract years from selected term
  const selectedYears = useMemo(() => {
    const match = selected.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 1;
  }, [selected]);

  // Fetch pricing when years change
  useEffect(() => {
    const fetchPricing = async () => {
      if (!domainData?.domainName) return;

      setLoading(true);
      setError(null);
      try {
        const priceParams = {
          websiteName: domainData.domainName,
          renewalFeePerc: 50,
          transferFeePerc: 50,
          registrationFeePerc: 50,
          duration: selectedYears,
        };

        const priceResponse = await domainAPI.checkDomainPrice(priceParams);

        if (priceResponse?.responseMsg?.statusCode === 200) {
          setPricing(priceResponse.responseData);
        } else {
          throw new Error(
            priceResponse?.responseMsg?.message ||
            t.admin.failedToGetDomainPricing
          );
        }
      } catch (err) {
        console.error("Error fetching pricing:", err);
        setError(
          err?.response?.data?.message ||
          err?.message ||
          t.admin.failedToFetchPricing
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPricing();
  }, [domainData?.domainName, selectedYears]);

  // Calculate order summary
  const orderSummary = useMemo(() => {
    if (!pricing) {
      return {
        transferFee: 0,
        vat: 0,
        total: 0,
        expirationDate: null,
      };
    }

    const transferFee = parseFloat(pricing.transferFee) || 0;
    const vat = transferFee * 0; // 20% VAT
    const total = transferFee + vat;

    // Calculate expiration date: current expiration + selected years
    let expirationDate = null;
    if (domainData?.details?.expirationDate) {
      const currentExpiration = new Date(domainData.details.expirationDate);
      const newExpiration = new Date(currentExpiration);
      newExpiration.setFullYear(newExpiration.getFullYear() + selectedYears);
      expirationDate = newExpiration.toISOString().split("T")[0]; // Format as YYYY-MM-DD
    }

    return {
      transferFee,
      vat,
      total,
      expirationDate,
    };
  }, [pricing, domainData?.details?.expirationDate, selectedYears]);

  const handleCheckout = async () => {
    if (!domainData?.domainName || !authorizationCode) {
      showAlert(t.admin.missingRequiredInformation, {
        duration: 3000,
        type: "fail",
      });
      return;
    }

    setIsCheckoutLoading(true);
    try {
      const response = await domainAPI.getDomainTransferDynoCheckoutUrl({
        domain: domainData.domainName,
        domainNameId:
          domainData.details?.domainNameId || domainData.details?.id,
        provider: domainData.details?.provider,
        duration: selectedYears,
        authorizationCode: authorizationCode,
      });

      if (response?.success && response?.redirect_url) {
        showAlert(t.admin.redirectingToDynoPay, {
          duration: 1500,
          type: "success",
        });
        window.location.href = response.redirect_url;
        return;
      }

      const backendMsg =
        response?.message ||
        response?.error?.message ||
        t.admin.failedToStartTransferCheckout;
      showAlert(backendMsg, { duration: 3000, type: "fail" });
    } catch (error) {
      const errorMsg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        t.admin.failedToStartTransferCheckout;
      showAlert(errorMsg, { duration: 3000, type: "fail" });
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white/80 dark:bg-gray-600/80 overflow-auto py-5">
      <div className="flex items-center justify-center w-full h-full">
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
              {domainData?.domainName || t.admin.domainPlaceholder || "domain.com"}
            </span>
            <h2 className="modal-title">
              {typeof t.admin.transferDomain === 'string'
                ? t.admin.transferDomain
                : t.admin.transferDomain?.title}
              <p className="text-15 font-medium text-secondary mt-1">
                {t.admin.chooseDomainRenewalPeriod}
              </p>
            </h2>
          </div>

          <div className="flex gap-2 justify-between items-center w-full">
            <div className="relative w-full">
              <div onClick={() => setOpen(!open)} className="term-select">
                <p className="text-xs text-secondary font-medium">{t.admin.term}</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-primary dark:text-gray-400">
                    {selected}
                  </span>
                  <IoChevronDown className="absolute top-1/2 transform -translate-y-1/2 right-4 w-4 h-4 text-primary dark:text-gray-400" />
                </div>
              </div>

              {/* Dropdown items */}
              {open && (
                <div className="dropdown-select">
                  {terms.map((term) => (
                    <div
                      key={term}
                      onClick={() => {
                        setSelected(term);
                        setOpen(false);
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

          {/* Order Summary */}
          <div className="order-summary w-full mt-5">
            <h3 className="font-medium text-lg text-primary dark:text-white">
              {t.admin.orderSummary}
            </h3>
            <hr className="card-divider my-3.5" />

            <div className="flex gap-5 flex-col w-full">
              <div>
                {loading ? (
                  <div className="text-center py-4">
                    <p className="text-13 text-secondary">{t.admin.loadingPricing}</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-4">
                    <p className="text-13 text-red-500">{error}</p>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-1.5 text-13 text-primary dark:text-gray-500 font-medium">
                      <p>
                        {t.admin.domainTransferAndRenewal.replace("{years}", selectedYears.toString()).replace("{plural}", selectedYears === 1 ? t.admin.year : t.admin.years)}
                      </p>
                      <span>${orderSummary.transferFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center mb-1.5 text-13 text-primary dark:text-gray-500 font-medium">
                      <p className="flex gap-1 items-center">
                        {t.admin.vat20Percent} <FiInfo />
                      </p>
                      <span>${orderSummary.vat.toFixed(2)}</span>
                    </div>
                    {orderSummary.expirationDate && (
                      <div className="flex justify-between items-center mb-1.5 text-13 text-primary dark:text-gray-500 font-medium">
                        <p className="flex gap-1 items-center">
                          {t.admin.expiration} <FiInfo />
                        </p>
                        <span>{orderSummary.expirationDate}</span>
                      </div>
                    )}

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
                                as="select"
                                // className={`input-field admin-form peer ${errors.country && touched.country ? 'border-red-500 dark:border-red-400' : ''}`}
                                className={`input-field admin-form peer`}
                                id="country"
                                name="selectedCountryCode"
                              >
                                <option value="">{t.admin.selectCountry}</option>
                              </select>
                              <IoIosArrowDown size={15} className="absolute top-1/2 transform -translate-y-1/2 right-4 text-primary dark:text-white pointer-events-none" />

                              {/* <label htmlFor="country" className={`absolute left-5 top-2 text-xs font-medium pointer-events-none transition-all dark:text-gray-500 ${values.country ? 'text-gray-600' : 'text-secondary'}`}> */}

                              <label htmlFor="country" className={`absolute left-5 top-2 text-xs font-medium pointer-events-none transition-all dark:text-gray-500 text-secondary`}>
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
                                className={`absolute left-5 transition-all font-medium ${VTXId
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
                              <MdCheck className='w-4 h-4 flex-none' />
                              <p>{t.admin.vatNumberVerified}</p>
                            </div>
                            <IoClose className="cursor-pointer w-4 h-4 text-primary dark:text-white" />
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex justify-between items-center">
                      <p className="text-primary dark:text-gray-500 text-15 font-medium">
                        {t.admin.total}
                      </p>
                      <span className="text-tealdark font-semibold text-lg">
                        ${orderSummary.total.toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <p className="flex items-center gap-2 text-13 text-darkbtn hover:text-darkbtn-hover dark:text-gray-500 hover:dark:text-white font-medium cursor-pointer">
                  {t.admin.havePromocode} <IoChevronDown size={14} />
                </p>

                {/* <div className="w-full flex justify-center items-center gap-2 promocode">
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
                    onClick={handleCheckout}
                    disabled={isCheckoutLoading || loading || error || !pricing}
                    className={`add-to-cart px-7 ${isCheckoutLoading || loading || error || !pricing
                      ? "disable"
                      : ""
                      }`}
                  >
                    {isCheckoutLoading ? t.admin.processing : t.admin.goToCheckout}{" "}
                    <TbArrowRight size={18} />
                  </button>
                </div>

                <p className="text-13 font-medium text-secondary">
                  {t.admin.byCheckingOut}{" "}
                  <NavLink to="/terms-and-conditions" className="text-teallight-500 font-semibold hover:underline">
                    {t.admin.termsOfService}
                  </NavLink>{" "}
                  {t.admin.andConfirmThat}{" "}
                  <NavLink to="/privacy-policy" className="text-teallight-500 font-semibold hover:underline">
                    {t.admin.privacyPolicy}
                  </NavLink>
                  {t.admin.youCanCancel}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {loading && <Loader />}
    </div>
  );
};

export default TransferChooseDomainModal;
