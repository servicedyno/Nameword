import { useState } from "react";
import { IoClose } from "react-icons/io5";
import { IoIosArrowBack } from "react-icons/io";
import { LuRefreshCw } from "react-icons/lu";
import { NavLink } from "react-router";
import { domainAPI } from "../../../../api/domains";
import { useAlert } from "../../../../context/AlertContext";
import { useLanguage } from "../../../../hooks/useLanguage";

const DomainForwardingConfirmChoice = ({
  onClose,
  onSuccess,
  selectedDomains = [],
  mode = "add",
  destination = "",
  redirectType = 2,
}) => {
  const domainCount = selectedDomains.length;
  const { t } = useLanguage();
  const actionLabel =
    mode === "remove" ? t.admin.disableDomainForwarding : t.admin.applyDomainForwarding;
  const actionDescription =
    mode === "remove"
      ? t.admin.forwardingWillBeRemoved
      : t.admin.domainsWillBeginForwarding;

  const visibleDomains = selectedDomains.slice(0, 4);
  const extraCount = Math.max(domainCount - visibleDomains.length, 0);

  const { showAlert } = useAlert();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [failedDomains, setFailedDomains] = useState([]);

  const pickFirst = (...values) =>
    values.find(
      (value) =>
        value !== undefined &&
        value !== null &&
        value !== "" &&
        value !== "null" &&
        value !== "undefined"
    );

  const resolveIdentifiers = async (domainName, initial = {}) => {
    const hasValidWebsiteId =
      initial.websiteId &&
      initial.websiteId !== "" &&
      initial.websiteId !== "null" &&
      initial.websiteId !== "undefined" &&
      initial.websiteId !== null &&
      initial.websiteId !== undefined;

    const hasValidDomainNameId =
      initial.domainNameId &&
      initial.domainNameId !== "" &&
      initial.domainNameId !== "null" &&
      initial.domainNameId !== "undefined" &&
      initial.domainNameId !== null &&
      initial.domainNameId !== undefined;

    if (hasValidDomainNameId && hasValidWebsiteId) {
      return initial;
    }

    try {
      const response = await domainAPI.viewDomain({ domain: domainName });
      const data = response?.responseData || response?.data || response;

      const resolved = {
        domainNameId: pickFirst(
          initial.domainNameId,
          data?.domainNameId,
          data?.domainNameID,
          data?.id,
          data?.domain?.domainNameId,
          data?.domain?.domainNameID,
          data?.domain?.id
        ),
        websiteId: pickFirst(
          initial.websiteId,
          data?.websiteId,
          data?.websiteID,
          data?.website?.id,
          data?.domain?.websiteId,
          data?.domain?.websiteID,
          data?.domain?.website?.id
        ),
      };

      if (hasValidWebsiteId && !resolved.websiteId) {
        resolved.websiteId = initial.websiteId;
      }

      return resolved;
    } catch (err) {
      if (hasValidWebsiteId) {
        return {
          domainNameId: initial.domainNameId,
          websiteId: initial.websiteId,
        };
      }

      const message =
        err?.response?.data?.responseMsg?.message ||
        err?.response?.data?.errors?.[0]?.message ||
        err?.response?.data?.message ||
        err?.message ||
        t.admin.failedToLoadDomainIdentifiers;
      throw new Error(message);
    }
  };

  const handleConfirm = async () => {
    if (!domainCount) {
      showAlert(t.admin.selectAtLeastOneDomainToContinue, { type: "warning" });
      return;
    }

    if (mode !== "remove" && !destination?.trim()) {
      showAlert(t.admin.pleaseEnterDestinationUrl, { type: "warning" });
      return;
    }

    setIsSubmitting(true);
    setError("");
    setFailedDomains([]);

    const failures = [];
    let successCount = 0;

    for (const domain of selectedDomains) {
      const domainName = domain?.websiteName || domain?.domainName || domain;
      if (!domainName) {
        failures.push({
          domain: t.admin.unknownDomain,
          message: t.admin.missingDomainName,
        });
        continue;
      }

      const params = { domainName };

      let identifiers = {
        domainNameId: pickFirst(
          domain?.domainNameId,
          domain?.domainNameID,
          domain?.id,
          domain?.domainId,
          domain?.domain?.domainNameId,
          domain?.domain?.domainNameID,
          domain?.domain?.id
        ),
        websiteId: pickFirst(
          domain?.websiteId,
          domain?.websiteID,
          domain?.website?.id,
          domain?.website?.websiteId,
          domain?.website?.websiteID
        ),
      };

      try {
        identifiers = await resolveIdentifiers(domainName, identifiers);
      } catch (lookupError) {
        failures.push({ domain: domainName, message: lookupError.message });
        continue;
      }

      if (identifiers.domainNameId) {
        params.domainNameId = identifiers.domainNameId;
      }
      if (identifiers.websiteId) {
        params.websiteId = identifiers.websiteId;
      }

      if (!params.websiteId) {
        if (params.domainNameId) {
          params.websiteId = String(params.domainNameId);
        } else {
          failures.push({
            domain: domainName,
            message: t.admin.unableToFindIdentifiers,
          });
          continue;
        }
      }

      if (mode !== "remove") {
        params.isMasking = 0;
        params.rewrite = destination.trim();
      }

      try {
        if (mode === "remove") {
          await domainAPI.deleteDomainForwarding(params);
        } else {
          await domainAPI.setDomainForwarding(params);
        }
        successCount++;
      } catch (apiError) {
        const message =
          apiError?.response?.data?.responseMsg?.message ||
          apiError?.response?.data?.errors?.[0]?.message ||
          apiError?.response?.data?.message ||
          apiError?.message ||
          t.admin.failedToUpdateDomainForwarding;
        failures.push({ domain: domainName, message });
      }
    }

    setIsSubmitting(false);

    if (failures.length > 0) {
      const plural = failures.length === 1 ? '' : 's';
      const failedMessage = t.admin.domainsFailedToUpdateForwarding
        .replace("{failed}", failures.length)
        .replace("{total}", domainCount)
        .replace(/{plural}/g, plural);
      setError(failedMessage);
      setFailedDomains(failures);
      showAlert(failedMessage, { type: "warning" });
      if (successCount > 0) {
        const successPlural = successCount === 1 ? '' : 's';
        showAlert(
          t.admin.domainsUpdatedSuccessForwarding
            .replace("{count}", successCount)
            .replace(/{plural}/g, successPlural),
          { type: "success" }
        );
      }
      return;
    }

    const plural = domainCount === 1 ? '' : 's';
    showAlert(
      mode === "remove"
        ? t.admin.domainForwardingRemoved
          .replace("{count}", domainCount)
          .replace(/{plural}/g, plural)
        : t.admin.domainForwardingApplied
          .replace("{count}", domainCount)
          .replace(/{plural}/g, plural),
      { type: "success", duration: 2500 }
    );

    onSuccess?.();
  };

  return (
    <div className="fixed inset-0 z-50 bg-white/80 dark:bg-gray-600/80 overflow-auto py-5">
      <div className="flex items-center justify-center w-full h-full">
        <div className="modal-dialog">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-black cursor-pointer"
          >
            <IoClose className="text-primary dark:text-gray-500" size={30} />
          </button>

          {/* Modal Title */}
          <div className="flex flex-col gap-2">
            <h2 className="modal-title">
              <NavLink
                to="#"
                onClick={(e) => {
                  e.preventDefault();
                  onClose();
                }}
                className="right-link !text-darkbtn dark:!text-gray-500 mb-2"
              >
                <IoIosArrowBack /> {t.admin.back}
              </NavLink>
              {t.admin.confirmYourChoice}
            </h2>
            <p className="text-13 text-secondary">{actionDescription}</p>
            {mode !== "remove" && destination && (
              <p className="text-13 text-primary dark:text-gray-300 mt-1">
                {t.admin.destination}{" "}
                <span className="font-semibold">{destination}</span>
              </p>
            )}
          </div>

          <div className="space-y-3 mt-4">
            <p className="text-13 text-primary dark:text-gray-400 font-semibold flex items-center gap-2">
              <LuRefreshCw size={14} className="text-darkbtn" />
              {t.admin.domainsWillBeAffectedForwarding.replace("{count}", domainCount).replace(/{plural}/g, domainCount === 1 ? '' : 's')}
            </p>

            {domainCount > 0 && (
              <div className="border border-stokecolor dark:border-gray-700 rounded-md p-3 bg-white dark:bg-gray-800">
                <ul className="text-13 text-primary dark:text-gray-300 list-disc list-inside space-y-1 max-h-32 overflow-y-auto">
                  {visibleDomains.map((domain) => (
                    <li key={domain?.websiteName || domain?.id || domain}>
                      {domain?.websiteName || domain}
                    </li>
                  ))}
                </ul>
                {extraCount > 0 && (
                  <p className="text-12 text-secondary mt-2">
                    {t.admin.moreSelected.replace("{count}", extraCount).replace(/{plural}/g, extraCount === 1 ? '' : 's')}
                  </p>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-2">
                {error}
              </p>
              {failedDomains.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-medium text-red-700 dark:text-red-300 mb-1">
                    {t.admin.failedDomains}
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    {failedDomains.map((failure, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-red-600 dark:text-red-400"
                      >
                        <span className="font-medium">{failure.domain}:</span>{" "}
                        {failure.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Confirm Button */}
          <div className="mt-5 flex justify-end gap-2 admin-btn">
            <button
              className="add-to-cart disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={isSubmitting}
              onClick={handleConfirm}
            >
              {isSubmitting ? t.admin.processing : actionLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DomainForwardingConfirmChoice;
