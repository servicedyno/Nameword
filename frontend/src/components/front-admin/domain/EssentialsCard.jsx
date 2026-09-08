import { NavLink, useParams } from "react-router";
import PropTypes from "prop-types";
import { FiCheck } from "react-icons/fi";
import { PiWarningBold } from "react-icons/pi";
import { TbExternalLink, TbCopy } from "react-icons/tb";
import RenewDomainModal from "../../modals/renew-domain-modal";
import { useState, useEffect, useCallback, useMemo } from "react";
import { formatDate } from "../../../utils/formatDate";
import { copyToClipboard } from "../../../utils/copyToClipboard";
import { useAlert } from "../../../context/AlertContext";
import { dnsAPI, domainAPI } from "../../../api/domains";
import { useLanguage } from "../../../hooks/useLanguage";

const EssentialsCard = ({ viewDomain, contactInfo, currentDomain, onRefreshDomain }) => {
  const { domainName: domainNameParam } = useParams();
  const [isOpen, setIsOpen] = useState(false);
  const { showAlert } = useAlert();
  const { t } = useLanguage();

  const resolvedDomain = useMemo(() => {
    const d = viewDomain?.websiteName || currentDomain?.websiteName || domainNameParam || "";
    try {
      return typeof d === "string" ? decodeURIComponent(d) : d;
    } catch {
      return d;
    }
  }, [viewDomain?.websiteName, currentDomain?.websiteName, domainNameParam]);

  const [dnsRecords, setDnsRecords] = useState([]);
  const [isLoadingDns, setIsLoadingDns] = useState(false);
  const [isUpdatingAutoRenew, setIsUpdatingAutoRenew] = useState(false);
  const [localAutoRenew, setLocalAutoRenew] = useState(null);

  const normalizedAutoRenew = useMemo(() => {

    if (localAutoRenew !== null) {
      return localAutoRenew;
    }               

    const value =
      viewDomain?.autorenew ??
      viewDomain?.autoRenew ??
      viewDomain?.auto_renew ??
      currentDomain?.autorenew;

    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      return (
        normalized === "enabled" ||
        normalized === "true" ||
        normalized === "yes" ||
        normalized === "active"
      );
    }
    return false;
  }, [
    localAutoRenew,
    viewDomain?.autorenew,
    viewDomain?.autoRenew,
    viewDomain?.auto_renew,
    currentDomain?.autorenew,
  ]);


  // Sync localAutoRenew with viewDomain/currentDomain when they change
  // This ensures that if auto-renew is changed from dashboard, it updates here too
  useEffect(() => {
    if (viewDomain?.autorenew !== undefined || viewDomain?.autoRenew !== undefined || viewDomain?.auto_renew !== undefined) {
      const value =
        viewDomain?.autorenew ??
        viewDomain?.autoRenew ??
        viewDomain?.auto_renew;

      if (typeof value === "boolean") {
        setLocalAutoRenew(value);
      } else if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        setLocalAutoRenew(
          normalized === "enabled" ||
          normalized === "true" ||
          normalized === "yes" ||
          normalized === "active"
        );
      } else {
        setLocalAutoRenew(false);
      }
    } else if (currentDomain?.autorenew !== undefined) {
      const value = currentDomain.autorenew;
      if (typeof value === "boolean") {
        setLocalAutoRenew(value);
      } else if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        setLocalAutoRenew(
          normalized === "enabled" ||
          normalized === "true" ||
          normalized === "yes" ||
          normalized === "active"
        );
      } else {
        setLocalAutoRenew(false);
      }
    } else {
      setLocalAutoRenew(null);
    }
  }, [viewDomain?.autorenew, viewDomain?.autoRenew, viewDomain?.auto_renew, currentDomain?.autorenew]);

  const renewalDateRaw = useMemo(() => {
    const candidates = [
      viewDomain?.renewal_date,
      viewDomain?.renewalDate,
      viewDomain?.renewDate,
      viewDomain?.renew_on,
      viewDomain?.expirationDate,
      viewDomain?.expiration_date,
      viewDomain?.expiryDate,
      viewDomain?.expiry_date,
      viewDomain?.expiry,
      currentDomain?.expirationDate,
      currentDomain?.expiration_date,
      currentDomain?.expiryDate,
      currentDomain?.expiry_date,
    ];

    return candidates.find((value) => Boolean(value));
  }, [
    viewDomain?.renewal_date,
    viewDomain?.renewalDate,
    viewDomain?.renewDate,
    viewDomain?.renew_on,
    viewDomain?.expirationDate,
    viewDomain?.expiration_date,
    viewDomain?.expiryDate,
    viewDomain?.expiry_date,
    viewDomain?.expiry,
    currentDomain?.expirationDate,
    currentDomain?.expiration_date,
    currentDomain?.expiryDate,
    currentDomain?.expiry_date,
  ]);

  const statusLabel = useMemo(() => {
    const labelCandidates = [
      viewDomain?.statusLabel,
      viewDomain?.status_label,
      viewDomain?.statusDescription,
      viewDomain?.status_description,
    ];

    const fallbackLabel = labelCandidates.find((value) => Boolean(value));
    const rawStatus =
      viewDomain?.status ??
      viewDomain?.statusCode ??
      viewDomain?.status_code ??
      currentDomain?.status;

    if (fallbackLabel) return fallbackLabel;
    if (!rawStatus) return "—";

    const normalizedKey =
      typeof rawStatus === "string"
        ? rawStatus.trim().toUpperCase()
        : String(rawStatus).toUpperCase();

    const statusDictionary = {
      ACT: t.admin.statusActive,
      ACTIVE: t.admin.statusActive,
      SUC: t.admin.statusSuccessful,
      SUCCESS: t.admin.statusSuccess,
      EXP: t.admin.statusExpired,
      EXPIRED: t.admin.statusExpired,
      EXPIRING: t.admin.statusExpiringSoon,
      PENDING: t.admin.statusPending,
      PEN: t.admin.statusPending,
      HOLD: t.admin.statusOnHold,
      RENEWAL_DUE: t.admin.statusRenewalDue,
      REQUESTED: t.admin.statusRequested,
      REQ: t.admin.statusRequested,
      INACTIVE: t.admin.statusInactive,
    };

    return statusDictionary[normalizedKey] || (typeof rawStatus === "string" ? rawStatus : "—");
  }, [
    viewDomain?.status,
    viewDomain?.statusCode,
    viewDomain?.status_code,
    viewDomain?.statusLabel,
    viewDomain?.status_label,
    viewDomain?.statusDescription,
    viewDomain?.status_description,
    currentDomain?.status,
    t,
  ]);

  const showSuccessIcon = useMemo(() => {
    const normalizedLabel = statusLabel?.toString().trim().toLowerCase();
    const successCandidates = new Set([
      "active",
      "success",
      "successful",
      (t?.admin?.statusActive || "").toString().trim().toLowerCase(),
      (t?.admin?.statusSuccess || "").toString().trim().toLowerCase(),
      (t?.admin?.statusSuccessful || "").toString().trim().toLowerCase(),
    ]);
    return normalizedLabel ? successCandidates.has(normalizedLabel) : false;
  }, [statusLabel, t]);

  const openInNewTab = useCallback((url) => {
    if (!url) {
      console.error("URL is required");
      return;
    }

    window.open(`https://${url}`, "_blank", "noopener,noreferrer");
  }, []);

  const handleCopy = useCallback(
    (text) => {
      copyToClipboard(text, (message) => {
        showAlert(message, { duration: 2500, type: "success" });
      });
    },
    [showAlert]
  );

  const fetchDNSRecords = useCallback(async () => {
    if (!viewDomain?.websiteName) return;

    setIsLoadingDns(true);
    try {
      const response = await dnsAPI.viewDNSRecords({
        domain: viewDomain.websiteName,
      });

      if (response?.responseData?.records) {
        setDnsRecords(response.responseData.records);
      } else {
        setDnsRecords([]);
      }
    } catch (error) {
      console.error("Error fetching DNS records:", error);
      const errorMsg =
        error?.response?.data?.message || t.admin.failedToFetchDnsRecords;
      showAlert(errorMsg, { duration: 3000, type: "error" });
      setDnsRecords([]);
    } finally {
      setIsLoadingDns(false);
    }
  }, [viewDomain?.websiteName, showAlert, t]);

  useEffect(() => {
    fetchDNSRecords();
  }, [fetchDNSRecords]);

  const formattedPhone = useMemo(() => {
    if (!contactInfo?.phone) {
      return "-";
    }

    const parts = [
      contactInfo.phone?.country_code,
      contactInfo.phone?.subscriber_number,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    return parts || "-";
  }, [contactInfo?.phone]);

  const viewDomainProvider = useMemo(
    () => (viewDomain?.provider || "").toLowerCase() || null,
    [viewDomain?.provider]
  );

  const currentDomainProvider = useMemo(
    () => (currentDomain?.provider || "").toLowerCase() || null,
    [currentDomain?.provider]
  );

  const currentDomainDefaultProvider = useMemo(
    () => (currentDomain?.defaultProvider || "").toLowerCase() || null,
    [currentDomain?.defaultProvider]
  );

  const resolvedProvider = useMemo(() => {
    const candidate =
      viewDomainProvider ||
      currentDomainProvider ||
      currentDomainDefaultProvider;
    return candidate || "hostbay";
  }, [viewDomainProvider, currentDomainProvider, currentDomainDefaultProvider]);

  const pricingProvider = useMemo(() => {
    if (resolvedProvider === "hostbay") {
      return "openprovider";
    }
    return resolvedProvider;
  }, [resolvedProvider]);

  const domainNameForRenew = useMemo(() => {
    return viewDomain?.websiteName || currentDomain?.websiteName || "";
  }, [viewDomain?.websiteName, currentDomain?.websiteName]);

  const domainNameIdForRenew = useMemo(() => {
    return (
      viewDomain?.domainNameId ||
      currentDomain?.domainNameId ||
      currentDomain?.id ||
      null
    );
  }, [viewDomain?.domainNameId, currentDomain?.domainNameId, currentDomain?.id]);

  const handleOpenRenew = useCallback(() => {
    if (!domainNameForRenew) {
      showAlert(t.admin.domainInfoUnavailable, {
        duration: 2500,
        type: "warning",
      });
      return;
    }
    setIsOpen(true);
  }, [domainNameForRenew, showAlert, t.admin.domainInfoUnavailable]);

  const handleToggleAutoRenew = useCallback(async () => {
    const domainName = viewDomain?.websiteName || currentDomain?.websiteName;

    if (!domainName) {
      showAlert(t.admin.domainInfoUnavailable, {
        duration: 2500,
        type: "warning",
      });
      return;
    }

    if (isUpdatingAutoRenew) {
      return;
    }

    const newAutoRenewValue = !normalizedAutoRenew;

    setLocalAutoRenew(newAutoRenewValue);
    setIsUpdatingAutoRenew(true);

    try {
      const response = await domainAPI.bulkManageAutoRenewal({
        domains: [domainName],
        autorenew: newAutoRenewValue,
      });

      if (response?.responseMsg?.statusCode === 200 || response?.success) {
        showAlert(
          newAutoRenewValue
            ? t.admin.autoRenewalEnabled
            : t.admin.autoRenewalDisabled,
          {
            duration: 3000,
            type: "success",
          }
        );

        if (onRefreshDomain && typeof onRefreshDomain === "function") {
          await onRefreshDomain();
        }
      } else {
        setLocalAutoRenew(!newAutoRenewValue);
        const errorMessage =
          response?.responseMsg?.message ||
          response?.message ||
          t.admin.failedToUpdateAutoRenewal;
        showAlert(errorMessage, {
          duration: 3000,
          type: "error",
        });
      }
    } catch (error) {
      setLocalAutoRenew(!newAutoRenewValue);
      const errorMessage =
        error?.response?.data?.responseMsg?.message ||
        error?.response?.data?.message ||
        error?.message ||
        t.admin.failedToUpdateAutoRenewal;
      showAlert(errorMessage, {
        duration: 3000,
        type: "error",
      });
    } finally {
      setIsUpdatingAutoRenew(false);
    }
  }, [
    viewDomain?.websiteName,
    currentDomain?.websiteName,
    normalizedAutoRenew,
    isUpdatingAutoRenew,
    showAlert,
    t,
  ]);

  return (
    <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-5">
      <div className="table-card">
        <div className="flex justify-between items-center gap-2 px-5 py-2.5">
          <p className="info-card-title">{t.admin.renew}</p>
          <button className="btn-outline small" onClick={handleOpenRenew}>
            {t.admin.renewNow}
          </button>
        </div>
        <hr className="card-divider" />

        <div className="py-7 px-5 space-y-4 card-essential">
          <div className="flex items-center gap-2 info-detail">
            <p className="text-secondary">{t.admin.domain}</p>
            <span className="text-darkbtn dark:text-white flex items-center gap-1">
              {viewDomain?.websiteName}
              {viewDomain?.websiteName && (
                <>
                  <NavLink
                    className="text-darkbtn dark:text-white inline-flex items-center gap-1"
                    onClick={() => openInNewTab(viewDomain?.websiteName)}
                  >
                    <TbExternalLink size={14} />
                  </NavLink>
                  <NavLink
                    className="text-darkbtn dark:text-white inline-flex items-center gap-1"
                    onClick={() => handleCopy(viewDomain?.websiteName)}
                  >
                    <TbCopy size={14} />
                  </NavLink>
                </>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2 info-detail">
            <p className="text-secondary">{t.admin.status}</p>
            <p
              className={`flex items-center gap-1 ${showSuccessIcon ? "text-sucess-400" : "text-warning"
                }`}
            >
              {showSuccessIcon ? <FiCheck /> : <PiWarningBold size={15} />}
              {statusLabel}
            </p>
          </div>
          <div className="flex items-center gap-2 info-detail">
            <p className="text-secondary">{t.admin.renewsOn}</p>
            <span className="text-primary dark:text-white">
              {renewalDateRaw ? formatDate(renewalDateRaw) : "—"}
            </span>
          </div>
          <div className="flex items-center gap-2 info-detail">
            <p className="text-secondary">{t.admin.autoRenew}</p>
            <button
              onClick={handleToggleAutoRenew}
              disabled={isUpdatingAutoRenew}
              className={`w-10 h-5 flex items-center rounded-full border border-active-border p-1 transition-colors duration-300 bg-white ${isUpdatingAutoRenew ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                }`}
            >
              <span
                className={`w-3.5 h-3.5 rounded-full shadow-md transform transition-transform ${normalizedAutoRenew
                  ? "translate-x-4.5 bg-indigo-800"
                  : "-translate-x-0.5 bg-secondary"
                  }`}
              ></span>
            </button>
          </div>
        </div>
      </div>

      <div className="table-card">
        <div className="flex justify-between items-center gap-2 px-5 py-2.5">
          <p className="info-card-title">{t.admin.dns}</p>

          <NavLink
            to={`/dns-management`}
            state={{ currentDomain }}
            className="btn-outline small"
          >
            {t.admin.edit}
          </NavLink>
        </div>
        <hr className="card-divider" />

        {isLoadingDns ? (
          <div className="py-7 px-5">
            <p className="text-secondary text-sm">{t.admin.loadingDnsRecords}</p>
          </div>
        ) : dnsRecords.length > 0 ? (
          <div className="py-7 px-5 space-y-4 card-essential">
            {dnsRecords.map((record, idx) => {
              const recordType = record?.type || "—";
              const recordName = record?.name ?? "";
              const recordValue = record?.value ?? record?.content ?? record?.target ?? "";
              const priority = record?.type === "MX" && record?.priority != null ? ` (pri ${record.priority})` : "";
              const valueDisplay = recordValue ? (String(recordValue).length > 35 ? `${String(recordValue).slice(0, 32)}…` : recordValue) : "";
              const domain = resolvedDomain?.toLowerCase?.() || "";
              const rn = String(recordName).toLowerCase();
              const isRootRecord = !recordName || rn === domain || rn === `@.${domain}` || recordName === "@" || rn.endsWith(`.${domain}`);
              const displayName = isRootRecord ? "@" : recordName;
              const text = valueDisplay ? `${recordType} · ${displayName} · ${valueDisplay}${priority}` : `${recordType} · ${displayName}${priority}`;
              return (
                <div
                  className="flex items-center gap-2 info-detail"
                  key={record?.id || record?.seq_nr || `${recordType}-${idx}`}
                >
                  <span className="text-primary dark:text-white">
                    {text}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-7 px-5">
            <p className="text-secondary text-sm">{t.admin.noDnsRecordsFound}</p>
          </div>
        )}
      </div>

      <div className="table-card">
        <div className="flex justify-between items-center gap-2 px-5 py-2.5">
          <p className="info-card-title">{t.admin.contactInfo}</p>
          <NavLink
            to={"/contact-info"}
            state={{ currentDomain }}
            className="btn-outline small"
          >
            {t.admin.edit}
          </NavLink>
        </div>
        <hr className="card-divider" />

        <div className="py-7 px-5 space-y-4 card-essential">
          <div className="flex items-center gap-2 info-detail">
            <p className="text-secondary">{t.admin.email}</p>
            <span className="text-primary dark:text-white">
              {contactInfo?.email || "-"}
            </span>
          </div>
          <div className="flex items-center gap-2 info-detail">
            <p className="text-secondary">{t.admin.firstName}</p>
            <span className="text-primary dark:text-white">
              {contactInfo?.name?.first_name || "-"}
            </span>
          </div>
          <div className="flex items-center gap-2 info-detail">
            <p className="text-secondary">{t.admin.lastName}</p>
            <span className="text-primary dark:text-white">
              {contactInfo?.name?.last_name || "-"}
            </span>
          </div>
          <div className="flex items-center gap-2 info-detail">
            <p className="text-secondary">{t.admin.phoneNumber}</p>
            <span className="text-primary dark:text-white">
              {formattedPhone}
            </span>
          </div>
        </div>
      </div>

      {isOpen && (
        <RenewDomainModal
          onClose={() => setIsOpen(false)}
          domainName={domainNameForRenew}
          pricingProvider={pricingProvider}
          currentExpiration={renewalDateRaw}
          domainNameId={domainNameIdForRenew}
        />
      )}
    </div>
  );
};

EssentialsCard.propTypes = {
  viewDomain: PropTypes.shape({
    websiteName: PropTypes.string,
    status: PropTypes.string,
    statusCode: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    status_code: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    statusLabel: PropTypes.string,
    status_label: PropTypes.string,
    statusDescription: PropTypes.string,
    status_description: PropTypes.string,
    renewal_date: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    renewalDate: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    renewDate: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    renew_on: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    expirationDate: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
      PropTypes.instanceOf(Date),
    ]),
    expiration_date: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
      PropTypes.instanceOf(Date),
    ]),
    expiryDate: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
      PropTypes.instanceOf(Date),
    ]),
    expiry_date: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
      PropTypes.instanceOf(Date),
    ]),
    expiry: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
      PropTypes.instanceOf(Date),
    ]),
    autorenew: PropTypes.string,
    autoRenew: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
    auto_renew: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
    nameServers: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        seq_nr: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        name: PropTypes.string,
      })
    ),
  }),
  contactInfo: PropTypes.shape({
    email: PropTypes.string,
    name: PropTypes.shape({
      first_name: PropTypes.string,
      last_name: PropTypes.string,
    }),
    phone: PropTypes.shape({
      country_code: PropTypes.string,
      subscriber_number: PropTypes.string,
    }),
  }),
  currentDomain: PropTypes.oneOfType([
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      websiteName: PropTypes.string,
    }),
    PropTypes.string,
  ]),
  onRefreshDomain: PropTypes.func,
};

EssentialsCard.defaultProps = {
  viewDomain: null,
  contactInfo: null,
  currentDomain: null,
  onRefreshDomain: null,
};

export default EssentialsCard;
