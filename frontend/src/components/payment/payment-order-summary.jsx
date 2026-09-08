import { IoChevronDown } from "react-icons/io5";
import { FiInfo } from "react-icons/fi";
import { MdCheck } from "react-icons/md";
import { useState, useEffect } from "react";
import { NavLink } from "react-router";
import { Formik, Form, Field, ErrorMessage } from "formik";
import { IoIosArrowDown } from "react-icons/io";
import { IoClose } from "react-icons/io5";
import taxAPI from "../../api/taxApi";
import { useAlert } from "../../context/AlertContext";
import axios from "axios";
import { validatePromoCode, calculateDiscount } from "../../utils/promocode";
import { useAuth } from "../../hooks/useAuth";
import { useLanguage } from "../../hooks/useLanguage";

const OrderSummary = ({
    itemsCount = 0,
    subtotal = 0,
    vatAmount = 0,
    walletCharge = 0,
    total = 0,
    rewardDiscount = 0,
    onWalletAmountChange,
    rewardPoints = 0,
    onTaxRateChange, // Callback to update tax rate in parent
    onPromoCodeChange, // Callback to update promocode discount in parent
}) => {
    const { t } = useLanguage();
    const { showAlert } = useAlert();
    const { user } = useAuth();
    const [promoCode, setPromoCode] = useState("");
    const [promoExpanded, setPromoExpanded] = useState(false);
    const [appliedPromoCode, setAppliedPromoCode] = useState(null);
    const [promoDiscount, setPromoDiscount] = useState(0);
    const [validatingPromo, setValidatingPromo] = useState(false);
    const [VTXId, setVTXId] = useState("");

    // Load promocode from localStorage on mount (if applied in cart)
    useEffect(() => {
        const savedPromoCode = localStorage.getItem('appliedPromoCode');
        const savedDiscount = localStorage.getItem('promoDiscount');
        
        if (savedPromoCode && savedDiscount) {
            const discountAmount = parseFloat(savedDiscount);
            if (!isNaN(discountAmount) && discountAmount > 0) {
                setAppliedPromoCode(savedPromoCode);
                setPromoCode(savedPromoCode);
                setPromoDiscount(discountAmount);
                setPromoExpanded(true);
                
                // Notify parent component
                if (onPromoCodeChange) {
                    onPromoCodeChange(discountAmount, savedPromoCode);
                }
            }
        }
    }, [onPromoCodeChange]);
    const [VTATax, setVTATax] = useState(false);
    const [selectedCountry, setSelectedCountry] = useState("");
    const [taxRate, setTaxRate] = useState(0.2); // Default 20%, will be updated based on detected country
    const [taxType, setTaxType] = useState("VAT"); // Default VAT, will be updated based on detected country
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
                        .map((country) => ({
                            code: country.cca2,
                            name: country.name.common || country.name.official,
                        }))
                        .sort((a, b) => a.name.localeCompare(b.name));
                    
                    setCountries([
                        { code: "", name: t.payment.selectCountry },
                        ...countriesList,
                    ]);
                }
            } catch (error) {
                console.error("Error fetching countries:", error);
               
                setCountries([{ code: "", name: t.payment.selectCountry }]);
            } finally {
                setCountriesLoading(false);
            }
        };

        fetchCountries();
    }, []);

    // Auto-detect country from IP on component mount
    useEffect(() => {
        const detectUserCountry = async () => {
            setCountryDetecting(true);
            try {
                const response = await taxAPI.getUserCountry();
                if (response?.success && response?.responseData?.country) {
                    const detectedCountry = response.responseData.country;
                    let detectedTaxRate = response.responseData.taxRate;
                    const detectedTaxType = response.responseData.taxType || "VAT";
                    
                    // If API didn't return tax rate, use country-specific fallback
                    if (!detectedTaxRate || detectedTaxRate === null) {
                        // India GST is 18%
                        if (detectedCountry === "IN") {
                            detectedTaxRate = 0.18;
                        } else {
                            detectedTaxRate = 0.2; // Default 20% for other countries
                        }
                    }
                    
                    console.log("[OrderSummary] Detected country:", detectedCountry, "Tax rate:", detectedTaxRate, "Tax type:", detectedTaxType);
                    
                    // Auto-select detected country
                    setSelectedCountry(detectedCountry);
                    setTaxRate(detectedTaxRate);
                    setTaxType(detectedTaxType);
                    
                    // Update parent component with detected tax rate
                    if (onTaxRateChange) {
                        onTaxRateChange(detectedTaxRate);
                    }
                } else {
                    console.warn("[OrderSummary] Could not detect country, using default 20%");
                    // Keep default 20%
                }
            } catch (error) {
                console.error("Error detecting user country:", error);
                // Keep default 20% on error
            } finally {
                setCountryDetecting(false);
            }
        };

        detectUserCountry();
    }, []); // Run only on mount

    // Fetch tax rate when country changes manually
    useEffect(() => {
        const fetchTaxRate = async () => {
            if (!selectedCountry) {
                // Reset to default if no country selected
                setTaxRate(0.2);
                setTaxType("VAT");
                setVatValidated(false);
                if (onTaxRateChange) {
                    onTaxRateChange(0.2);
                }
                return;
            }

            setTaxRateLoading(true);
            try {
                const response = await taxAPI.getTaxRate(selectedCountry);
                if (response?.success && response?.responseData?.taxRate !== undefined && response.responseData.taxRate !== null) {
                    const newTaxRate = response.responseData.taxRate;
                    const newTaxType = response.responseData.taxType || "VAT";
                    setTaxRate(newTaxRate);
                    setTaxType(newTaxType);
                    // If VAT was validated, keep it at 0, otherwise use country rate
                    const finalRate = vatValidated ? 0 : newTaxRate;
                    if (onTaxRateChange) {
                        onTaxRateChange(finalRate);
                    }
                } else {
                    // Use country-specific fallback
                    let fallbackRate = 0.2;
                    let fallbackType = "VAT";
                    if (selectedCountry === "IN") {
                        fallbackRate = 0.18; // India GST 18%
                        fallbackType = "GST";
                    }
                    setTaxRate(fallbackRate);
                    setTaxType(fallbackType);
                    if (onTaxRateChange) {
                        onTaxRateChange(vatValidated ? 0 : fallbackRate);
                    }
                }
            } catch (error) {
                console.error("Error fetching tax rate:", error);
                // Use country-specific fallback
                let fallbackRate = 0.2;
                let fallbackType = "VAT";
                if (selectedCountry === "IN") {
                    fallbackRate = 0.18;
                    fallbackType = "GST";
                }
                setTaxRate(fallbackRate);
                setTaxType(fallbackType);
                if (onTaxRateChange) {
                    onTaxRateChange(vatValidated ? 0 : fallbackRate);
                }
            } finally {
                setTaxRateLoading(false);
            }
        };

        // Only fetch if country was manually changed (not initial detection)
        if (selectedCountry && !countryDetecting) {
            fetchTaxRate();
        }
    }, [selectedCountry, onTaxRateChange]);

    // Validate VAT ID when entered
    const handleVatIdChange = async (vatId) => {
        setVTXId(vatId);

        // If VAT ID is cleared, reset validation
        if (!vatId) {
            setVatValidated(false);
            // Use country tax rate
            if (onTaxRateChange) {
                onTaxRateChange(taxRate);
            }
            return;
        }

        // Only validate if country is selected
        if (!selectedCountry) {
            showAlert(t.payment.pleaseSelectCountryFirst, {
                duration: 3000,
                type: "fail",
            });
            return;
        }

        // Validate VAT ID when user stops typing (after 6+ characters)
        if (vatId.length >= 6) {
            setVatValidating(true);
            try {
                const response = await taxAPI.validateVatId(selectedCountry, vatId);
                if (response?.success && response?.responseData?.isValid) {
                    setVatValidated(true);
                    // Tax exempt - set rate to 0
                    if (onTaxRateChange) {
                        onTaxRateChange(0);
                    }
                    showAlert(getTaxValidationMessage(), {
                        duration: 3000,
                        type: "success",
                    });
                } else {
                    setVatValidated(false);
                    // Use country tax rate
                    if (onTaxRateChange) {
                        onTaxRateChange(taxRate);
                    }
                    showAlert(t.payment.taxIdValidationFailed, {
                        duration: 3000,
                        type: "fail",
                    });
                }
            } catch (error) {
                console.error("Error validating VAT ID:", error);
                setVatValidated(false);
                if (onTaxRateChange) {
                    onTaxRateChange(taxRate);
                }
                showAlert(t.payment.failedToValidateTaxId, {
                    duration: 3000,
                    type: "fail",
                });
            } finally {
                setVatValidating(false);
            }
        }
    };

    // Calculate tax percentage for display
    const taxPercentage = vatValidated ? 0 : taxRate * 100;
    
    // Get tax label based on tax type
    const getTaxLabel = () => {
        if (vatValidated) return `${taxType} (0%)`;
        return `${taxType} (${taxPercentage.toFixed(1)}%)`;
    };
    
    const getTaxIdLabel = () => {
        // Use translation keys for tax ID labels
        const taxIdLabels = {
            VAT: t.payment.vatTaxId,
            GST: t.payment.gstNumber,
            TIN: t.payment.tinNumber,
            EIN: t.payment.einNumber,
            BN: t.payment.bnNumber,
            UEN: t.payment.uenNumber,
            NPWP: t.payment.npwpNumber,
            CNPJ: t.payment.cnpjNumber,
            CPF: t.payment.cpfNumber,
            CUIT: t.payment.cuitNumber,
            RFC: t.payment.rfcNumber,
            RUT: t.payment.rutNumber,
            RUC: t.payment.rucNumber,
            RCN: t.payment.rcnNumber,
            RIF: t.payment.rifNumber,
            NIT: t.payment.nitNumber,
            BRN: t.payment.brnNumber,
            BIN: t.payment.binNumber,
            BR: t.payment.brNumber,
            CN: t.payment.cnNumber,
            INN: t.payment.innNumber,
            PIN: t.payment.pinNumber,
            STRN: t.payment.strnNumber,
            NIF: t.payment.nifNumber,
            TRN: t.payment.trnNumber,
            NRT: t.payment.nrtNumber,
            IFU: t.payment.ifuNumber,
        };
        
        return taxIdLabels[taxType] || t.payment.taxId;
    };
    
    // Get tax validation message based on tax type
    const getTaxValidationMessage = () => {
        const validationMessages = {
            VAT: t.payment.vatNumberVerified,
            GST: t.payment.gstNumberVerified,
            TIN: t.payment.tinNumberVerified,
            EIN: t.payment.einNumberVerified,
            BN: t.payment.bnNumberVerified,
            UEN: t.payment.uenNumberVerified,
            NPWP: t.payment.npwpNumberVerified,
            CNPJ: t.payment.cnpjNumberVerified,
            CPF: t.payment.cpfNumberVerified,
            CUIT: t.payment.cuitNumberVerified,
            RFC: t.payment.rfcNumberVerified,
            RUT: t.payment.rutNumberVerified,
            RUC: t.payment.rucNumberVerified,
            RCN: t.payment.rcnNumberVerified,
            RIF: t.payment.rifNumberVerified,
            NIT: t.payment.nitNumberVerified,
            BRN: t.payment.brnNumberVerified,
            BIN: t.payment.binNumberVerified,
            BR: t.payment.brNumberVerified,
            CN: t.payment.cnNumberVerified,
            INN: t.payment.innNumberVerified,
            PIN: t.payment.pinNumberVerified,
            STRN: t.payment.strnNumberVerified,
            NIF: t.payment.nifNumberVerified,
            TRN: t.payment.trnNumberVerified,
            NRT: t.payment.nrtNumberVerified,
            IFU: t.payment.ifuNumberVerified,
        };
        
        return validationMessages[taxType] || t.payment.taxIdVerified;
    };

    // Handle promocode application
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
                : await validatePromoCode(promoCode, false); 
            
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
            
            // Save to localStorage so it persists across navigation
            localStorage.setItem('appliedPromoCode', promoCodeNormalized);
            localStorage.setItem('promoDiscount', discountAmount.toString());
            
            // Notify parent component about promocode discount
            if (onPromoCodeChange) {
                onPromoCodeChange(discountAmount, promoCodeNormalized);
            }

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

    // Handle promocode removal
    const handleRemovePromoCode = () => {
        setAppliedPromoCode(null);
        setPromoDiscount(0);
        setPromoCode("");
        
        // Remove from localStorage
        localStorage.removeItem('appliedPromoCode');
        localStorage.removeItem('promoDiscount');
        
        if (onPromoCodeChange) {
            onPromoCodeChange(0, null);
        }
    };

    return (
        <div className="w-full">
            <div className='order-summary w-full'>
                <h3 className='font-medium text-2xl mb-5 text-primary dark:text-white'>
                    {t.cart.orderSummary.title}
                </h3>

                <h4 className='text-primary dark:text-gray-500 text-15 font-medium flex justify-between'>
                    {itemsCount} {itemsCount === 1 ? t.cart.orderSummary.item : t.cart.orderSummary.items}
                    <NavLink to="/cart" className="text-darkbtn dark:text-gray-300">{t.payment.editOrder}</NavLink>
                </h4>

                <hr className="card-divider my-3.5" />

                <div className="flex gap-5 flex-col w-full">
                    <div>
                        <div className='flex justify-between items-center mb-1.5 text-primary dark:text-gray-500 font-medium'>
                            <p className='text-base'>{t.cart.orderSummary.subtotal}</p>
                            <span className='text-15'>${Number(subtotal).toFixed(2)}</span>
                        </div>
                        <div className='flex justify-between items-center mb-1.5 text-primary dark:text-gray-500 font-medium'>
                            <p className='text-base flex gap-1 items-center'>
                                {getTaxLabel()}: <FiInfo />
                                {countryDetecting && (
                                    <span className="text-xs text-gray-400 ml-1">({t.payment.detecting})</span>
                                )}
                            </p>
                            <span className='text-15'>${Number(vatAmount).toFixed(2)}</span>
                        </div>
                        {walletCharge > 0 && (
                            <div className='flex justify-between items-center mb-1.5 text-primary dark:text-gray-500 font-medium'>
                                <p className='text-base flex gap-1 items-center'>{t.payment.walletBalanceCharge} <FiInfo /></p>
                                <span className='text-15'>-${Number(walletCharge).toFixed(2)}</span>
                            </div>
                        )}

                        {rewardDiscount > 0 && (
                            <div className='flex justify-between items-center mb-1.5 text-primary dark:text-gray-500 font-medium'>
                                <p className='text-base flex gap-1 items-center'>{t.payment.rewardPoints} <FiInfo /></p>
                                <span className='text-15'> {rewardPoints} (-${Number(rewardDiscount).toFixed(2)})</span>
                            </div>
                        )}

                        {promoDiscount > 0 && (
                            <div className='flex justify-between items-center mb-1.5 text-primary dark:text-gray-500 font-medium'>
                                <p className='text-base flex gap-1 items-center'>
                                    {t.cart.orderSummary.promocodeLabel.replace('{code}', appliedPromoCode)} <FiInfo />
                                </p>
                                <span className='text-15'>-${Number(promoDiscount).toFixed(2)}</span>
                            </div>
                        )}

                        <hr className='card-divider my-3.5' />

                        <div className="flex flex-col gap-2 mb-2.5">
                            <p className="flex items-center gap-2 text-13 ">
                                <span className="cursor-pointer text-darkbtn hover:text-darkbtn-hover dark:text-gray-500 hover:dark:text-white font-medium" onClick={() => setVTATax(!VTATax)}>{t.payment.wantToAddTaxId.replace("${taxId}", getTaxIdLabel())} <IoChevronDown size={14} className={VTATax ? 'rotate-180 inline' : 'inline'} /></span>
                            </p>

                            {VTATax && (
                                <>
                                    <div className="w-full sm:w-4/5 flex sm:flex-row flex-col gap-2">

                                        <div className="relative w-full sm:w-56">
                                            <select
                                                className={`input-field admin-form peer ${taxRateLoading || countriesLoading ? 'opacity-60' : ''}`}
                                                id="country"
                                                name="selectedCountryCode"
                                                value={selectedCountry}
                                                onChange={(e) => {
                                                    setSelectedCountry(e.target.value);
                                                    setVTXId(""); 
                                                    setVatValidated(false);
                                                    setTaxType("VAT");
                                                }}
                                                disabled={taxRateLoading || countriesLoading}
                                            >
                                                {countriesLoading ? (
                                                    <option value="">{t.payment.loadingCountries}</option>
                                                ) : (
                                                    countries.map((country) => (
                                                        <option key={country.code} value={country.code}>
                                                            {country.name}
                                                        </option>
                                                    ))
                                                )}
                                            </select>
                                            <IoIosArrowDown size={15} className="absolute top-1/2 transform -translate-y-1/2 right-4 text-primary dark:text-white pointer-events-none" />

                                            <label htmlFor="country" className={`absolute left-5 top-2 text-xs font-medium pointer-events-none transition-all dark:text-gray-500 text-secondary`}>
                                                {t.admin.country}
                                            </label>
                                            {taxRateLoading && (
                                                <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-tealdark"></div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="relative w-full">
                                            <input
                                                type="text"
                                                className={`input-field admin-form peer w-full ${vatValidating ? 'opacity-60' : ''} ${vatValidated ? 'border-green-500' : ''}`}
                                                id="vatTaxId"
                                                value={VTXId}
                                                onChange={(e) => handleVatIdChange(e.target.value)}
                                                disabled={vatValidating || !selectedCountry}
                                                placeholder=""
                                            />
                                            <label
                                                htmlFor="vatTaxId"
                                                className={`absolute left-5 transition-all font-medium ${VTXId
                                                    ? "top-2 text-xs text-gray-600"
                                                    : "top-4 text-13 text-primary dark:text-gray-500 "
                                                    } peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}
                                            >
                                                {getTaxIdLabel()}
                                            </label>
                                            {vatValidating && (
                                                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-tealdark"></div>
                                                </div>
                                            )}
                                        </div>
                                    </div>


                                    {vatValidated && VTXId && (
                                        <div className="w-full py-2 px-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs font-medium rounded-md flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-1">
                                                <MdCheck className='w-4 h-4 flex-none' />
                                                <p>{getTaxValidationMessage()}</p>
                                            </div>
                                            <IoClose 
                                                className="cursor-pointer w-4 h-4 text-primary dark:text-white hover:text-red-500" 
                                                onClick={() => {
                                                    setVTXId("");
                                                    setVatValidated(false);
                                                    if (onTaxRateChange) {
                                                        onTaxRateChange(taxRate);
                                                    }
                                                }}
                                            />
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <div className='flex justify-between items-center'>
                            <p className='text-primary dark:text-gray-500 text-base font-medium'>{t.admin.total}</p>
                            <span className='text-tealdark font-semibold text-2xl'>${Number(total).toFixed(2)}</span>
                        </div>
                    </div>

                    {/* <span className='save-lable'>Awesome! You saved $78.50 on your order.</span> */}

                    <div className="flex flex-col gap-2">
                        <p className="flex items-center gap-2 text-13 ">
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
                                                className={`absolute left-5 transition-all font-medium ${promoCode
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
                                            <MdCheck className='w-5 h-5 flex-none' />
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
                </div>
            </div>
        </div>
    )
}

export default OrderSummary;
