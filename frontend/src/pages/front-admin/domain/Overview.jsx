import EssentialsCard from "../../../components/front-admin/domain/EssentialsCard";
import SecurityCard from "../../../components/front-admin/domain/SecurityCard";
import DomainForwardingModal from "../../../components/modals/domain-forwarding-modal";
import { sharedhosting } from "../../../components/common/icons";
import { NavLink, useParams } from "react-router";
import { HiArrowSmRight } from "react-icons/hi";
import { PiWarningBold } from "react-icons/pi";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDomain } from "../../../hooks/useDomain";
import Loader from "../../../components/common/Loader";
import { useCustomLocation } from "../../../hooks/useCustomLocation";
import { domainAPI } from "../../../api/domains";
import { useAlert } from "../../../context/AlertContext";
import { useLanguage } from "../../../hooks/useLanguage";

const Overview = () => {
  // Modal click
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isContactLoading, setIsContactLoading] = useState(false);
  const [contactInfo, setContactInfo] = useState(null);
  const [isWhoisLoading, setIsWhoisLoading] = useState(false);
  const [whoisInfo, setWhoisInfo] = useState(null);

  const locationState = useCustomLocation();
  const { domainName: domainNameParam } = useParams();
  const { showAlert } = useAlert();
  const { t } = useLanguage();

  // custom hook
  const { viewDomain, fetchViewDomain, domains } = useDomain();

  const decodedDomainName = useMemo(() => {
    if (!domainNameParam) {
      return undefined;
    }
    try {
      return decodeURIComponent(domainNameParam);
    } catch (error) {
      console.error("Failed to decode domain name parameter:", error);
      return domainNameParam;
    }
  }, [domainNameParam]);

  const activeDomain = useMemo(() => {
    if (locationState?.currentDomain?.websiteName) {
      return locationState.currentDomain;
    }

    if (decodedDomainName && Array.isArray(domains)) {
      const matchedDomain = domains.find(
        (domain) =>
          domain.websiteName?.toLowerCase() === decodedDomainName.toLowerCase()
      );

      if (matchedDomain) {
        return matchedDomain;
      }

      return { websiteName: decodedDomainName };
    }

    if (Array.isArray(domains) && domains.length > 0) {
      return domains[0];
    }

    return {};
  }, [locationState, decodedDomainName, domains]);

  const handleFetchViewDomain = useCallback(
    async (domainName) => {
      if (!domainName) return;
      setIsLoading(true);
      await fetchViewDomain(domainName);
      setIsLoading(false);
    },
    [fetchViewDomain]
  );

  const fetchWhoisInfo = useCallback(
    async (domainName) => {
      if (!domainName) return;
      setIsWhoisLoading(true);
      try {
        const response = await domainAPI.getWhois({ domain: domainName });

        if (response?.responseMsg && response.responseMsg.statusCode !== 200) {
          const errorMessage =
            response.responseMsg.message ||
            response.message ||
            (t.admin.failedToFetchWhoisInformation ??
              "Failed to fetch WHOIS information");
          showAlert(errorMessage, { duration: 3000, type: "fail" });
          setWhoisInfo(null);
          return;
        }

        setWhoisInfo(response?.responseData || null);
      } catch (error) {
        const errorMsg =
          error?.response?.data?.message ||
          error?.response?.data?.responseMsg?.message ||
          error?.message ||
          (t.admin.failedToFetchWhoisInformation ??
            "Failed to fetch WHOIS information");
        showAlert(errorMsg, { duration: 3000, type: "fail" });
        setWhoisInfo(null);
      } finally {
        setIsWhoisLoading(false);
      }
    },
    [showAlert]
  );

  const handleFetchContactInfo = useCallback(
    async (domainName) => {
      if (!domainName) return;
      setIsContactLoading(true);
      try {
        const response = await domainAPI.getDomainContacts(
          domainName,
          "registrant"
        );

        if (response?.responseMsg && response.responseMsg.statusCode !== 200) {
          const errorMessage =
            response.responseMsg.message ||
            response.message ||
            (t.admin.failedToFetchContactInformation ??
              "Failed to fetch contact information");
          showAlert(errorMessage, { duration: 3000, type: "fail" });
          setContactInfo(null);
          return;
        }

        setContactInfo(response?.contacts?.registrant || null);
      } catch (error) {
        let errorMsg =
          t.admin.failedToFetchContactInformation ??
          "Failed to fetch contact information";
        if (error?.response?.data?.responseMsg?.message) {
          errorMsg = error.response.data.responseMsg.message;
        } else if (error?.response?.data?.message) {
          errorMsg = error.response.data.message;
        } else if (error?.response?.data?.error) {
          errorMsg = error.response.data.error;
        } else if (error?.message) {
          errorMsg = error.message;
        }
        showAlert(errorMsg, { duration: 3000, type: "fail" });
        setContactInfo(null);
      } finally {
        setIsContactLoading(false);
      }
    },
    [showAlert]
  );

  const handleRefreshDomainSecurity = useCallback(async () => {
    const targetDomain =
      viewDomain?.websiteName ||
      activeDomain?.websiteName ||
      decodedDomainName ||
      null;

    if (!targetDomain) {
      return;
    }

    await handleFetchViewDomain(targetDomain);
    await fetchWhoisInfo(targetDomain);
  }, [
    activeDomain?.websiteName,
    decodedDomainName,
    fetchWhoisInfo,
    handleFetchViewDomain,
    viewDomain?.websiteName,
  ]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const privacyStatus = params.get("privacyPaymentStatus");
    const renewalStatus = params.get("renewalStatus");

    if (!privacyStatus && !renewalStatus) {
      return;
    }

    const message = params.get("message");
    const planLabel = params.get("planLabel");
    let shouldRefresh = false;

    if (privacyStatus) {
      shouldRefresh = shouldRefresh || privacyStatus === "success";
      if (privacyStatus === "success") {
          const successMessage =
            message ||
            (planLabel
              ? (t.admin.whoisPrivacyEnabledWithPlan
                  ? t.admin.whoisPrivacyEnabledWithPlan.replace(
                      "{planLabel}",
                      planLabel
                    )
                  : `WHOIS privacy (${planLabel}) enabled successfully.`)
              : t.admin.whoisPrivacyEnabledSuccess ??
                "WHOIS privacy enabled successfully.");
        showAlert(successMessage, {
          duration: 3000,
          type: "success",
        });
      } else {
        showAlert(
          message ||
            t.admin.failedToCompletePrivacyPayment ||
            "Failed to complete privacy payment.",
          {
          duration: 3000,
          type: "fail",
          }
        );
      }
    }

    if (renewalStatus) {
      shouldRefresh = shouldRefresh || renewalStatus === "success";
      if (renewalStatus === "success") {
        showAlert(
          message ||
            t.admin.domainRenewedSuccess ||
            "Domain renewed successfully.",
          {
            duration: 3000,
            type: "success",
          }
        );
      } else {
        showAlert(
          message || t.admin.domainRenewalFailed || "Domain renewal failed.",
          {
            duration: 3000,
            type: "fail",
          }
        );
      }
    }

    if (planLabel) {
      const planMessage =
        (t.admin.selectedPrivacyPlan || "Selected privacy plan: {planLabel}").replace(
          "{planLabel}",
          planLabel
        );
      showAlert(planMessage, {
        duration: 3000,
        type: "info",
      });
    }

    params.delete("privacyPaymentStatus");
    params.delete("renewalStatus");
    params.delete("message");
    params.delete("planId");
    params.delete("planLabel");

    const query = params.toString();
    const newUrl = `${window.location.pathname}${query ? `?${query}` : ""}`;
    window.history.replaceState({}, "", newUrl);

    if (shouldRefresh) {
      const domainToRefresh =
        activeDomain?.websiteName || decodedDomainName || null;
      if (domainToRefresh) {
        fetchWhoisInfo(domainToRefresh);
        handleFetchViewDomain(domainToRefresh);
      }
    }
  }, [
    activeDomain?.websiteName,
    decodedDomainName,
    fetchWhoisInfo,
    handleFetchViewDomain,
    showAlert,
  ]);

  const handleToggleWhoisPrivacy = useCallback(
    async ({ domain, domainNameId, provider, shouldEnable }) => {
      if (!domain) return;

      const payload = {
        domain,
        domainNameId:
          domainNameId ??
          viewDomain?.domainNameId ??
          activeDomain?.domainNameId,
        provider: provider ?? viewDomain?.provider ?? activeDomain?.provider,
      };

      try {
        const apiCall = shouldEnable
          ? domainAPI.enablePrivacy
          : domainAPI.disablePrivacy;
        const response = await apiCall(payload);

        if (response?.responseMsg?.statusCode === 200) {
          const msg =
            response?.responseMsg?.message ||
            (response?.responseData?.privacy_enabled
              ? t.admin.whoisPrivacyEnabledSuccess ||
                "WHOIS privacy enabled successfully"
              : t.admin.whoisPrivacyDisabledSuccess ||
                "WHOIS privacy disabled successfully");
          showAlert(msg, {
            duration: 2500,
            type: "success",
          });
        } else if (response?.responseData?.privacy_enabled !== undefined) {
          const toggled = response.responseData.privacy_enabled;
          const msg = toggled
            ? t.admin.whoisPrivacyEnabledSuccess ||
              "WHOIS privacy enabled successfully"
            : t.admin.whoisPrivacyDisabledSuccess ||
              "WHOIS privacy disabled successfully";
          showAlert(msg, {
            duration: 2500,
            type: "success",
          });
        } else {
          const actionLabel = shouldEnable ? t.admin.enable : t.admin.disable;
          const message =
            response?.responseMsg?.message ||
            response?.message ||
            (t.admin.failedToToggleWhoisPrivacy
              ? t.admin.failedToToggleWhoisPrivacy.replace(
                  "{action}",
                  (actionLabel || (shouldEnable ? "enable" : "disable")).toLowerCase()
                )
              : `Failed to ${shouldEnable ? "enable" : "disable"} WHOIS privacy`);
          showAlert(message, { duration: 3000, type: "fail" });
        }
        await fetchWhoisInfo(domain);
      } catch (error) {
        const actionLabel = shouldEnable ? t.admin.enable : t.admin.disable;
        const errorMsg =
          error?.response?.data?.message ||
          error?.response?.data?.responseMsg?.message ||
          error?.message ||
          (t.admin.failedToToggleWhoisPrivacy
            ? t.admin.failedToToggleWhoisPrivacy.replace(
                "{action}",
                (actionLabel || (shouldEnable ? "enable" : "disable")).toLowerCase()
              )
            : `Failed to ${shouldEnable ? "enable" : "disable"} WHOIS privacy`);
        showAlert(errorMsg, { duration: 3000, type: "fail" });
        throw error;
      }
    },
    [activeDomain, fetchWhoisInfo, showAlert, viewDomain]
  );

  useEffect(() => {
    if (activeDomain?.websiteName) {
      handleFetchViewDomain(activeDomain.websiteName);
      handleFetchContactInfo(activeDomain.websiteName);
      fetchWhoisInfo(activeDomain.websiteName);
    }
  }, [
    activeDomain?.websiteName,
    fetchWhoisInfo,
    handleFetchContactInfo,
    handleFetchViewDomain,
  ]);

  // useEffect(() => {
  //   const handleVisibilityChange = () => {
  //     if (!document.hidden && activeDomain?.websiteName) {
  //       handleFetchViewDomain(activeDomain.websiteName);
  //     }
  //   };

  //   document.addEventListener("visibilitychange", handleVisibilityChange);

  //   return () => {
  //     document.removeEventListener("visibilitychange", handleVisibilityChange);
  //   };
  // }, [activeDomain?.websiteName, handleFetchViewDomain]);

  const hasContactInfo = Boolean(
    contactInfo?.email ||
      contactInfo?.name?.first_name ||
      contactInfo?.name?.last_name ||
      contactInfo?.phone?.subscriber_number
  );

  return (
    <>
      <div className="space-y-7">
        {/* title */}
        <div className="flex flex-col gap-2 title-section">
          <h2>{t.admin.overview}</h2>
        </div>

        {/* Pending Setup */}
        {!hasContactInfo && (
          <div className="flex sm:flex-row flex-col items-center justify-between gap-2 px-4 py-2.5 rounded-md border border-stokecolor dark:border-gray-700 bg-mutebg dark:bg-gray-800">
            <div className="flex items-center gap-2.5 text-secondary">
              <PiWarningBold size={20} />
              <span className="text-xs font-medium flex-1">
                {t.admin.domainPendingSetup}
              </span>
            </div>
            <NavLink
              to={"/contact-info"}
              state={{ currentDomain: activeDomain }}
              className="add-to-cart small"
            >
              {t.admin.updateContactInfo}
            </NavLink>
          </div>
        )}

        {/* domain list */}
        <div>
          {/* Essentials Card */}
          <p className="card-admin-title">{t.admin.essentials}</p>
          <EssentialsCard
            viewDomain={viewDomain}
            contactInfo={contactInfo}
            currentDomain={activeDomain}
            onRefreshDomain={() => {
              const domainToRefresh =
                activeDomain?.websiteName || decodedDomainName || null;
              if (domainToRefresh) {
                handleFetchViewDomain(domainToRefresh);
              }
            }}
          />

          {/* Security Card */}
          <p className="card-admin-title mt-8">{t.admin.security}</p>
          <SecurityCard
            domainData={viewDomain}
            whoisInfo={whoisInfo}
            onTogglePrivacy={handleToggleWhoisPrivacy}
            isWhoisLoading={isWhoisLoading}
            onRefreshDomain={handleRefreshDomainSecurity}
          />

          <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-5">
            {/* Hosting Card */}
            <div className="lg:col-span-2 col-span-1">
              {/* Hosting Card */}
              <p className="card-admin-title mt-8">{t.admin.hosting}</p>
              <div className="table-card">
                <div className="flex justify-between items-center gap-2 px-5 py-4">
                  <p className="info-card-title">{t.admin.sharedHosting}</p>
                </div>
                <hr className="card-divider" />

                <div className="py-7 px-5 space-y-4 card-essential">
                  <div className="flex lg:flex-row flex-col lg:items-center items-end justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <img src={sharedhosting} alt="package" />
                      <div>
                        <p className="text-primary dark:text-white text-base font-medium">
                          {t.admin.flexiblePlansForEveryNeed}
                        </p>
                        <span className="text-13 font-medium text-secondary">
                          {t.admin.growAndScaleYourBusiness}
                        </span>
                      </div>
                    </div>
                    <NavLink
                      to={"/hosting"}
                      className="btn-outline small"
                    >
                      {t.admin.seePlans}
                    </NavLink>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Card */}
            <div>
              <p className="card-admin-title mt-8">{t.admin.actions}</p>

              <div className="w-full action-card">
                <button
                  type="button"
                  className="inner-action-card w-full"
                  onClick={() => setIsOpen(true)}
                >
                  <p>{t.admin.manageForwarding}</p>
                  <HiArrowSmRight size={20} />
                </button>
                <NavLink to={"/transfer-domain"} className="inner-action-card">
                  <p>{t.admin.manageTransfers}</p>
                  <HiArrowSmRight size={20} />
                </NavLink>
              </div>
            </div>
          </div>
        </div>

        {/* Modal */}
        {isOpen && (
          <DomainForwardingModal
            onClose={() => setIsOpen(false)}
            domainName={
              activeDomain?.websiteName ||
              viewDomain?.websiteName ||
              decodedDomainName
            }
            domainNameId={
              activeDomain?.domainNameId ||
              viewDomain?.domainNameId ||
              activeDomain?.id ||
              viewDomain?.id
            }
            websiteId={
              activeDomain?.websiteId ||
              viewDomain?.websiteId ||
              activeDomain?.id ||
              viewDomain?.id
            }
          />
        )}
      </div>
      {(isLoading || isContactLoading) && <Loader />}
    </>
  );
};

export default Overview;
