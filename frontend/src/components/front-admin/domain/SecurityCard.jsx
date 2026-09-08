import { NavLink, useNavigate } from "react-router";
import PropTypes from "prop-types";
import { cart, brandprotection } from "../../common/icons";
import { FiCheck, FiRefreshCw, FiX } from "react-icons/fi";
import { useMemo, useState, useCallback, useEffect } from "react";
import { PiWarningBold } from "react-icons/pi";
import { GoShieldCheck } from "react-icons/go";
import { BiTransferAlt } from "react-icons/bi";
import ChangePrivacyModal from "../../modals/change-privacy-modal";
import { useAlert } from "../../../context/AlertContext";
import { domainAPI } from "../../../api/domains";
import { useDomainSearch } from "../../../hooks/useDomainSearch";
import { cartAPI } from "../../../api/cartApi";
import Loader from "../../common/Loader";
import { useLanguage } from "../../../hooks/useLanguage";

const SecurityCard = ({
  domainData = {},
  whoisInfo,
  onTogglePrivacy,
  isWhoisLoading = false,
  onRefreshDomain,
}) => {
  const [isPrivacyUpdating, setIsPrivacyUpdating] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isPrivacyCheckoutLoading, setIsPrivacyCheckoutLoading] =
    useState(false);
  const [isLockUpdating, setIsLockUpdating] = useState(false);
  const [isAuthCodeLoading, setIsAuthCodeLoading] = useState(false);
  const [brandProtectionSuggestions, setBrandProtectionSuggestions] = useState(
    []
  );
  const [isBrandProtectionLoading, setIsBrandProtectionLoading] =
    useState(false);
  const [addingToCart, setAddingToCart] = useState({});

  const { showAlert } = useAlert();
  const navigate = useNavigate();
  const {
    getTldSuggestions,
    tldSuggestions,
    loading: tldLoading,
  } = useDomainSearch();
  const { t } = useLanguage();

  const interpretLockValue = useCallback((value) => {
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "number") {
      if (value === 1) return true;
      if (value === 0) return false;
    }
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (
        [
          "true",
          "locked",
          "lock",
          "enabled",
          "on",
          "1",
          "yes",
          "active",
          "locked_on",
        ].includes(normalized)
      ) {
        return true;
      }
      if (
        [
          "false",
          "unlocked",
          "unlock",
          "disabled",
          "off",
          "0",
          "no",
          "inactive",
          "locked_off",
        ].includes(normalized)
      ) {
        return false;
      }
    }
    return undefined;
  }, []);

  const getLockState = useCallback(() => {
    const lockCandidates = [
      domainData?.is_locked,
      domainData?.locked,
      domainData?.isLocked,
      domainData?.transferLock,
      domainData?.transfer_lock,
      domainData?.isDomainLocked,
      domainData?.lock_status,
      domainData?.lockStatus,
      whoisInfo?.is_locked,
      whoisInfo?.lockStatus,
    ];

    for (const candidate of lockCandidates) {
      const parsed = interpretLockValue(candidate);
      if (typeof parsed === "boolean") {
        return parsed;
      }
    }

    return false;
  }, [domainData, interpretLockValue, whoisInfo]);

  const [isLockedState, setIsLockedState] = useState(() => getLockState());

  useEffect(() => {
    setIsLockedState(getLockState());
  }, [getLockState]);

  const initialAuthCode = useMemo(() => {
    const candidates = [
      domainData?.authInfo?.code,
      domainData?.auth_code,
      domainData?.authCode,
      domainData?.authcode,
      domainData?.transferCode,
      domainData?.transfer_code,
      whoisInfo?.auth_code,
      whoisInfo?.authCode,
      whoisInfo?.authcode,
    ];

    const found = candidates.find(
      (value) => typeof value === "string" && value.trim() !== ""
    );
    return found || "";
  }, [domainData, whoisInfo]);

  const [authCode, setAuthCode] = useState(initialAuthCode || null);
  const [showAuthCode, setShowAuthCode] = useState(false);

  useEffect(() => {
    setAuthCode(initialAuthCode || null);
  }, [initialAuthCode]);

  const domainName = domainData?.websiteName || whoisInfo?.domain || "";

  // Extract base domain name for TLD suggestions
  const baseDomainName = useMemo(() => {
    if (!domainName) return "";
    const parts = domainName.split(".");
    return parts.length > 0 ? parts[0] : "";
  }, [domainName]);

  // Fetch TLD suggestions for Brand Protection
  useEffect(() => {
    if (!baseDomainName) {
      setBrandProtectionSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      setIsBrandProtectionLoading(true);
      try {
        await getTldSuggestions(baseDomainName);
      } catch (error) {
        console.error("Failed to fetch brand protection suggestions:", error);
        setBrandProtectionSuggestions([]);
      } finally {
        setIsBrandProtectionLoading(false);
      }
    };

    fetchSuggestions();
  }, [baseDomainName, getTldSuggestions]);

  // Update brand protection suggestions when tldSuggestions change
  useEffect(() => {
    if (tldSuggestions && Array.isArray(tldSuggestions)) {
      // Take first 3 suggestions (same as dashboard)
      const suggestions = tldSuggestions.slice(0, 3);
      setBrandProtectionSuggestions(suggestions);
    } else {
      setBrandProtectionSuggestions([]);
    }
  }, [tldSuggestions]);

  const resolvedProvider = useMemo(() => {
    const raw =
      domainData?.provider ||
      domainData?.defaultProvider ||
      domainData?.default_provider ||
      whoisInfo?.provider ||
      "";
    if (typeof raw === "string" && raw.trim() !== "") {
      return raw.trim().toLowerCase();
    }
    return undefined;
  }, [domainData, whoisInfo]);

  const domainNameId = useMemo(() => {
    if (domainData?.domainNameId) return domainData.domainNameId;
    if (domainData?.domain_id) return domainData.domain_id;
    if (domainData?.id) return domainData.id;
    return undefined;
  }, [domainData]);

  const deriveBoolean = (value) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (normalized === "true") return true;
      if (normalized === "false") return false;
      if (normalized === "not_found") return "not_found";
    }
    return undefined;
  };

  const isProtected = useMemo(() => {
    const whoisCandidates = [
      whoisInfo?.is_private_whois_enabled,
      whoisInfo?.privacy_enabled,
    ];

    for (const candidate of whoisCandidates) {
      const value = deriveBoolean(candidate);
      if (value === "not_found") return "not_found";
      if (value !== undefined) {
        return value;
      }
    }

    const domainCandidates = [
      domainData?.is_private_whois_enabled,
      domainData?.IsWhoisProtection,
      domainData?.whois_protection,
      domainData?.privacy?.enabled,
    ];

    for (const candidate of domainCandidates) {
      const value = deriveBoolean(candidate);
      if (value === "not_found") return "not_found";
      if (value !== undefined) {
        return value;
      }
    }

    return false;
  }, [domainData, whoisInfo]);

  const protectionLevel = isProtected ? t.admin.full : t.admin.none;
  const isLocked = isLockedState;

  const privacyPending = isWhoisLoading || isPrivacyUpdating;

  const privacyStatus = useMemo(() => {
    if (privacyPending) {
      return (
        <p className="flex items-center gap-1 text-secondary">
          <FiRefreshCw className="animate-spin" />{" "}
          {isWhoisLoading ? t.admin.refreshing : t.admin.saving}
        </p>
      );
    }

    // Handle "not_found" case from API
    if (isProtected === "not_found") {
      return (
        <p className="flex items-center gap-1 text-secondary">
          <PiWarningBold /> {t.admin.notFound}
        </p>
      );
    }

    if (isProtected) {
      return (
        <p className="flex items-center gap-1 text-sucess-400">
          <FiCheck /> {t.admin.statusActive}
        </p>
      );
    }

    return (
      <p className="flex items-center gap-1 text-warning">
        <PiWarningBold /> {t.admin.notProtected}
      </p>
    );
  }, [isProtected, isWhoisLoading, privacyPending]);

  const lockStatusDisplay = useMemo(() => {
    if (isLockUpdating) {
      return (
        <p className="flex items-center gap-1 text-secondary">
          <FiRefreshCw className="animate-spin" /> {t.admin.updating}
        </p>
      );
    }

    if (isLocked) {
      return (
        <p className="flex items-center gap-1 text-sucess-400">
          <FiCheck /> {t.admin.locked}
        </p>
      );
    }

    return (
      <p className="flex items-center gap-1 text-red-500">
        <FiX /> {t.admin.unlocked}
      </p>
    );
  }, [isLockUpdating, isLocked, t.admin]);

  const handlePrivacyToggle = async () => {
    if (!onTogglePrivacy || !domainName) return;

    if (isPrivacyUpdating) {
      return;
    }

    // Direct API call - modal not opening for now
    const shouldEnable = !isProtected;
    setIsPrivacyUpdating(true);

    try {
      await onTogglePrivacy({
        domain: domainName,
        domainNameId: domainData?.domainNameId || domainNameId,
        provider: domainData?.provider || resolvedProvider,
        shouldEnable,
      });

      // Refresh domain data after successful toggle
      if (typeof onRefreshDomain === "function") {
        await onRefreshDomain();
      }
    } catch (error) {
      // Error is already handled in onTogglePrivacy
      console.error("Failed to toggle privacy:", error);
    } finally {
      setIsPrivacyUpdating(false);
    }
  };

  const handleClosePrivacyModal = () => {
    setIsPrivacyModalOpen(false);
  };

  const handlePrivacyCheckout = useCallback(
    async ({ planId }) => {
      if (!domainName) return;
      if (isPrivacyCheckoutLoading) return;
      if (!planId) {
        showAlert(t.admin.selectPrivacyPlan, {
          duration: 2500,
          type: "fail",
        });
        return;
      }

      setIsPrivacyCheckoutLoading(true);
      try {
        const response = await domainAPI.initiatePrivacyCheckout({
          domain: domainName,
          domainNameId: domainData?.domainNameId,
          provider: domainData?.provider,
          planId,
        });

        if (response?.success && response?.redirect_url) {
          showAlert(t.admin.redirectingToPayment, {
            duration: 1500,
            type: "success",
          });
          setIsPrivacyModalOpen(false);
          window.location.href = response.redirect_url;
          return;
        }

        const backendMsg =
          response?.message ||
          response?.error?.message ||
          t.admin.failedToStartPrivacyCheckout;
        showAlert(backendMsg, { duration: 3000, type: "fail" });
      } catch (error) {
        const errorMsg =
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          t.admin.failedToStartPrivacyCheckout;
        showAlert(errorMsg, { duration: 3000, type: "fail" });
      } finally {
        setIsPrivacyCheckoutLoading(false);
      }
    },
    [
      domainData?.domainNameId,
      domainData?.provider,
      domainName,
      isPrivacyCheckoutLoading,
      showAlert,
      t,
    ]
  );


  const handleLockToggle = useCallback(async () => {
    if (!domainName) {
      showAlert(t.admin.domainInfoUnavailable, {
        duration: 2500,
        type: "fail",
      });
      return;
    }

    if (isLockUpdating) {
      return;
    }

    const desiredLock = !isLocked;
    setIsLockUpdating(true);
    try {
      const params = {
        websiteName: domainName,
        isDomainLocked: desiredLock ? "true" : "false",
      };

      if (domainNameId) {
        params.domainNameId = domainNameId;
      }

      if (resolvedProvider) {
        params.provider = resolvedProvider;
      }

      const response = await domainAPI.manageLock(params);
      const statusCode = response?.responseMsg?.statusCode;

      if (statusCode === 200) {
        const responseLockValue =
          interpretLockValue(
            response?.responseData?.isLocked ??
            response?.responseData?.locked ??
            response?.responseData?.is_locked
          ) ?? interpretLockValue(response?.lockStatus);
        const nextLockState =
          typeof responseLockValue === "boolean"
            ? responseLockValue
            : desiredLock;
        setIsLockedState(nextLockState);

        const successMessage =
          response?.responseMsg?.message ||
          response?.message ||
          (nextLockState ? t.admin.domainLockedSuccess : t.admin.domainUnlockedSuccess);

        showAlert(successMessage, { duration: 2500, type: "success" });

        if (typeof onRefreshDomain === "function") {
          await onRefreshDomain();
        }
      } else {
        const errorMessage =
          response?.responseMsg?.message ||
          response?.message ||
          "Failed to update domain lock.";
        showAlert(errorMessage, { duration: 3000, type: "fail" });
      }
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.responseMsg?.message ||
        error?.message ||
        "Failed to update domain lock.";
      showAlert(errorMessage, { duration: 3000, type: "fail" });
    } finally {
      setIsLockUpdating(false);
    }
  }, [
    domainName,
    domainNameId,
    interpretLockValue,
    isLockUpdating,
    isLocked,
    onRefreshDomain,
    resolvedProvider,
    showAlert,
    t,
  ]);

  // Handle add to cart for brand protection suggestions
  const handleAddToCart = useCallback(
    async (suggestion) => {
      if (!suggestion?.websiteName || addingToCart[suggestion.websiteName])
        return;

      setAddingToCart((prev) => ({ ...prev, [suggestion.websiteName]: true }));
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
            amount: suggestion.renewalfee || suggestion.registrationFee,
            currency: "USD",
          },
        };

        const result = await cartAPI.addToCart(apiData);

        if (result?.success === true) {
          showAlert(result?.message || t.domain.domainAddedSuccess, {
            duration: 2500,
            type: "success",
          });

          try {
            const refreshed = await cartAPI.getListAddToCart();
            const data = refreshed?.data || refreshed;
            window.dispatchEvent(
              new CustomEvent("cart:updated:payload", { detail: data })
            );
          } catch {
            window.dispatchEvent(new Event("cart:updated"));
          }

          navigate("/add-to-cart", { state: { item: suggestion } });
        } else {
          showAlert(result?.message || t.admin.failedToAddDomainToCart, {
            duration: 2500,
            type: "error",
          });
        }
      } catch {
        showAlert(t.admin.failedToAddDomainToCart, {
          duration: 2500,
          type: "error",
        });
      } finally {
        setAddingToCart((prev) => {
          const newState = { ...prev };
          delete newState[suggestion.websiteName];
          return newState;
        });
      }
    },
    [addingToCart, navigate, showAlert]
  );

  const handleFetchAuthCode = useCallback(async () => {
    if (!domainName) {
      showAlert(t.admin.domainInfoUnavailable, {
        duration: 2500,
        type: "fail",
      });
      return;
    }

    if (isAuthCodeLoading) {
      return;
    }

    setIsAuthCodeLoading(true);
    try {
      const response = await domainAPI.getAuthCode(domainName, {
        provider: resolvedProvider,
        domainNameId,
      });

      const statusCode = response?.responseMsg?.statusCode;

      if (statusCode === 200) {
        const nextCode =
          response?.responseData?.authCode ||
          response?.responseData?.auth_code ||
          response?.responseData?.authcode ||
          response?.responseData?.code ||
          response?.responseData ||
          "";

        setAuthCode(nextCode || null);
        setShowAuthCode(true);

        const successMessage =
          response?.responseMsg?.message ||
          response?.responseData?.message ||
          t.admin.authCodeRetrievedSuccess;

        showAlert(successMessage, { duration: 2500, type: "success" });

        if (typeof onRefreshDomain === "function") {
          await onRefreshDomain();
        }
      } else {
        const errorMessage =
          response?.responseMsg?.message ||
          response?.message ||
          t.admin.failedToFetchAuthCode;
        showAlert(errorMessage, { duration: 3000, type: "fail" });
        if (authCode) {
          setShowAuthCode(true);
        }
      }
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.responseMsg?.message ||
        error?.message ||
        t.admin.failedToFetchAuthCode;
      showAlert(errorMessage, { duration: 3000, type: "fail" });
      if (authCode) {
        setShowAuthCode(true);
      }
    } finally {
      setIsAuthCodeLoading(false);
    }
  }, [
    domainName,
    domainNameId,
    isAuthCodeLoading,
    authCode,
    onRefreshDomain,
    resolvedProvider,
    showAlert,
    t,
  ]);


  return (
    <>
      {/* {(isBrandProtectionLoading || tldLoading) && <Loader />} */}
      <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-5">
        <div className="table-card">
          <div className="flex justify-between items-center gap-2 px-5 py-4">
            <p className="info-card-title">{t.admin.whoisProtection}</p>
          </div>
          <hr className="card-divider" />

          <div className="py-7 px-5 space-y-4 card-essential">
            <div className="flex items-center gap-2.5 text-secondary px-4 py-1 rounded-md border border-disable/50 dark:border-gray-700 bg-mutebg dark:bg-gray-800">
              <GoShieldCheck size={20} />
              <p className="text-xs font-medium flex-1">
                {t.admin.whoisProtectionDescription}
              </p>
            </div>
            <div className="flex items-center gap-2 info-detail">
              <p className="text-secondary">{t.admin.status}</p>
              {privacyStatus}
            </div>
            <div className="flex items-center gap-2 info-detail">
              <p className="text-secondary">{t.admin.whoisProtection}</p>
              <button
                onClick={handlePrivacyToggle}
                className={`w-10 h-5 flex items-center rounded-full border border-active-border p-1 transition-colors duration-300 bg-white ${privacyPending || isPrivacyCheckoutLoading || !onTogglePrivacy
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer"
                  }`}
                disabled={
                  privacyPending || isPrivacyCheckoutLoading || !onTogglePrivacy
                }
                aria-pressed={isProtected}
                aria-label={
                  isProtected
                    ? t.admin.disableWhoisPrivacy
                    : t.admin.enableWhoisPrivacy
                }
              >
                <span
                  className={`w-3.5 h-3.5 rounded-full shadow-md transform transition-transform ${isProtected
                      ? "translate-x-4.5 bg-indigo-800"
                      : "-translate-x-0.5 bg-secondary"
                    }`}
                ></span>
              </button>
            </div>

            {isProtected && (
              <div className="flex items-center gap-2 info-detail">
                <p className="text-secondary">{t.admin.protectionLevel}</p>
                <span className="text-primary dark:text-white">
                  {protectionLevel}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="table-card">
          <div className="flex justify-between items-center gap-2 px-5 py-4">
            <p className="info-card-title">{t.admin.transferProtection}</p>
          </div>
          <hr className="card-divider" />

          <div className="py-7 px-5 space-y-4 card-essential">
            <div className="flex items-center gap-2.5 text-secondary px-4 py-1 rounded-md border border-disable/50 dark:border-gray-700 bg-mutebg dark:bg-gray-800">
              <BiTransferAlt size={30} />
              <p className="text-xs font-medium flex-1">
                {t.admin.transferProtectionDescription}
              </p>
            </div>
            <div className="flex items-center gap-2 info-detail">
              <p className="text-secondary">{t.admin.status}</p>
              {lockStatusDisplay}
            </div>

            <div className="flex items-center gap-2 info-detail">
              <p className="text-secondary">{t.admin.domainLock}</p>
              <button
                onClick={handleLockToggle}
                className="w-10 h-5 flex items-center rounded-full border border-active-border p-1 transition-colors duration-300 bg-white disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={isLockUpdating}
                aria-pressed={isLocked}
                aria-label={
                  isLocked ? t.admin.disableDomainLock : t.admin.enableDomainLock
                }
              >
                <span
                  className={`w-3.5 h-3.5 rounded-full shadow-md transform transition-transform ${isLocked
                      ? "translate-x-4.5 bg-indigo-800"
                      : "-translate-x-0.5 bg-secondary"
                    }`}
                  aria-hidden="true"
                ></span>
              </button>
            </div>
            <div className="flex items-center gap-2 info-detail">
              <p className="text-secondary">{t.admin.authorizationCode}</p>
              {showAuthCode ? (
                <span className="text-sm font-mono">{authCode || "—"}</span>
              ) : (
                <button
                  type="button"
                  className="btn-outline small"
                  onClick={handleFetchAuthCode}
                  disabled={isAuthCodeLoading}
                >
                  {isAuthCodeLoading ? t.common.loading : t.admin.getCode}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="table-card !bg-mutebg dark:!bg-gray-800">
          <div className="flex justify-between items-center gap-2 px-5 py-2.5">
            <p className="info-card-title">{t.admin.brandProtection}</p>
            <NavLink
              to={
                baseDomainName ? `/domain?value=${baseDomainName}` : "/domain"
              }
              className="btn-outline small"
            >
              {t.admin.seeMoreDomains}
            </NavLink>
          </div>
          <hr className="card-divider" />

          <div className="py-7 px-5 space-y-2 card-essential">
            <div className="flex items-center gap-2.5 text-primary dark:text-white px-4 py-1 rounded-md border border-darkbtn-200 dark:border-gray-700 mb-4 bg-white dark:bg-gray-800">
              <img src={brandprotection} alt="package" className="dark-mode" />

              <p className="text-xs font-medium flex-1">
                {t.admin.brandProtectionDescription}
              </p>
            </div>
            {isBrandProtectionLoading || tldLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="border-gray-300 h-6 w-6 animate-spin rounded-full border-4 border-t-darkbtn" />
              </div>
            ) : brandProtectionSuggestions.length > 0 ? (
              brandProtectionSuggestions.map((suggestion, index) => {
                const fullDomainName = suggestion?.websiteName || "";
                const registrationFee = Number(
                  suggestion?.registrationFee || 0
                );
                const isAdding = addingToCart[fullDomainName] || false;

                // Calculate original price (20% markup like dashboard)
                const oldPrice =
                  registrationFee > 0 ? registrationFee * 1.2 : registrationFee;

                // Split domain for display (base and TLD)
                const domainParts = fullDomainName.split(".");
                const baseName =
                  domainParts.length > 1
                    ? domainParts.slice(0, -1).join(".")
                    : fullDomainName;
                const tld =
                  domainParts.length > 1
                    ? domainParts[domainParts.length - 1]
                    : "";

                return (
                  <div
                    key={index}
                    className="flex items-center gap-2 info-detail"
                  >
                    <p className="text-primary dark:text-gray-500 break-all">
                      {baseName}
                      {tld && (
                        <span className="text-darkbtn dark:text-white">
                          .{tld}
                        </span>
                      )}
                    </p>

                    <p className="text-tealdark font-medium flex items-center gap-1">
                      ${registrationFee.toFixed(2)}
                      {oldPrice > registrationFee && (
                        <span className="text-secondary dark:text-gray-400 line-through">
                          ${oldPrice.toFixed(2)}
                        </span>
                      )}
                    </p>
                    <button
                      onClick={() => handleAddToCart(suggestion)}
                      disabled={isAdding}
                      className="rounded flex-none bg-darkbtn hover:bg-darkbtn-hover p-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <img src={cart} alt="add-to-cart" title="" />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-secondary py-4">
                <p className="text-sm">{t.admin.noDomainSuggestionsAvailable}</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal - kept for future use, but not opening currently */}
        {isPrivacyModalOpen && (
          <ChangePrivacyModal
            onClose={handleClosePrivacyModal}
            domainName={domainName}
            planOptions={privacyPlans}
            initialPlanId="full"
            expirationDate={modalExpirationDate}
            onCheckout={handlePrivacyCheckout}
            isCheckoutLoading={isPrivacyCheckoutLoading}
          />
        )}
      </div>
    </>
  );
};

SecurityCard.propTypes = {
  domainData: PropTypes.shape({
    websiteName: PropTypes.string,
    domainNameId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    provider: PropTypes.string,
    is_private_whois_enabled: PropTypes.oneOfType([
      PropTypes.bool,
      PropTypes.string,
    ]),
    IsWhoisProtection: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
    whois_protection: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
    privacy: PropTypes.shape({
      enabled: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
    }),
    is_locked: PropTypes.bool,
    auth_code: PropTypes.string,
    expirationDate: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
      PropTypes.instanceOf(Date),
    ]),
    expiryDate: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
      PropTypes.instanceOf(Date),
    ]),
    renewal_date: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
      PropTypes.instanceOf(Date),
    ]),
  }),
  whoisInfo: PropTypes.shape({
    domain: PropTypes.string,
    is_private_whois_enabled: PropTypes.oneOfType([
      PropTypes.bool,
      PropTypes.string,
    ]),
    privacy_enabled: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
    expiry_date: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
      PropTypes.instanceOf(Date),
    ]),
    expirationDate: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
      PropTypes.instanceOf(Date),
    ]),
  }),
  onTogglePrivacy: PropTypes.func,
  isWhoisLoading: PropTypes.bool,
  onRefreshDomain: PropTypes.func,
};

SecurityCard.defaultProps = {
  domainData: {},
  whoisInfo: {},
  onTogglePrivacy: undefined,
  isWhoisLoading: false,
  onRefreshDomain: undefined,
};

export default SecurityCard;
