import { IoClose } from "react-icons/io5";
import { PiWarningBold } from "react-icons/pi";
import { useState, useEffect } from "react";
import {
  IoIosArrowDown,
  IoIosArrowUp,
  IoIosArrowForward,
  IoIosArrowBack,
} from "react-icons/io";
import { domainAPI } from "../../api/domains";
import { useAlert } from "../../context/AlertContext";
import LoadingSpinner from "../common/LoadingSpinner";
import { useLanguage } from "../../hooks/useLanguage";

const DomainForwardingModal = ({
  onClose,
  domainName,
  domainNameId,
  websiteId,
}) => {
  const { t } = useLanguage();
  const [redirectType, setRedirectType] = useState(1); // 1 = 302 (Temporary), 2 = 301 (Permanent)
  const [protocol, setProtocol] = useState("https://");
  const [website, setWebsite] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [existingForwarding, setExistingForwarding] = useState(null);
  const { showAlert } = useAlert();

  // Debug: Log props when modal opens
  useEffect(() => {
    console.log("DomainForwardingModal props:", {
      domainName,
      domainNameId,
      websiteId,
    });
  }, [domainName, domainNameId, websiteId]);

  // Fetch existing forwarding on mount
  useEffect(() => {
    if (domainName) {
      fetchExistingForwarding();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domainName]);

  const applyDestination = (destination = "") => {
    if (!destination) {
      setWebsite("");
      setProtocol("https://");
      return;
    }

    if (destination.startsWith("https://")) {
      setProtocol("https://");
      setWebsite(destination.replace("https://", ""));
    } else if (destination.startsWith("http://")) {
      setProtocol("http://");
      setWebsite(destination.replace("http://", ""));
    } else {
      setWebsite(destination);
    }
  };

  const extractDestination = (forwarding = {}) =>
    forwarding.destination ||
    forwarding.proxyPass ||
    forwarding.rewrite ||
    forwarding.content ||
    "";

  const fetchExistingForwarding = async () => {
    if (!domainName) return;

    setIsLoading(true);
    try {
      const params = { domain: domainName };
      if (websiteId) {
        params.websiteId = websiteId;
      }
      const response = await domainAPI.getAllDomainForwarding(params);
      const responseData = response?.responseData;

      if (responseData?.root) {
        const rootForwarding = responseData.root;
        const destination = extractDestination(rootForwarding);
        applyDestination(destination);
        setRedirectType(2); // Root redirects are permanent (301)
        setExistingForwarding({ ...rootForwarding, destination });
        return;
      }

      if (responseData?.domainForwarding) {
        const forwardings = responseData.domainForwarding;
        const rootForwarding = forwardings.find(
          (f) =>
            f.websiteName === domainName ||
            f.websiteName === "@" ||
            f.name === domainName ||
            f.name === "@"
        );

        if (rootForwarding) {
          const destination = extractDestination(rootForwarding);
          applyDestination(destination);
          setExistingForwarding({ ...rootForwarding, destination });
          return;
        }
      }

      // No forwarding found
      setExistingForwarding(null);
      setWebsite("");
    } catch (error) {
      console.error("Error fetching domain forwarding:", error);
      setExistingForwarding(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!website.trim()) {
      showAlert(t.admin.pleaseEnterDestinationUrl, { type: "warning" });
      return;
    }

    if (!domainName) {
      showAlert(t.admin.domainRequired, { type: "warning" });
      return;
    }

    console.log("Submitting domain forwarding with params:", {
      domainName,
      domainNameId,
      websiteId,
      rewrite: `${protocol}${website.trim()}`,
    });

    setIsSaving(true);
    try {
      const fullUrl = `${protocol}${website.trim()}`;
      const isMasking = 0; // Domain forwarding typically doesn't use masking for CNAME

      // Build params - make websiteId and domainNameId optional
      const baseParams = {
        domainName: domainName,
        isMasking: isMasking,
        rewrite: fullUrl,
      };

      if (domainNameId) {
        baseParams.domainNameId = domainNameId;
      }
      if (websiteId) {
        baseParams.websiteId = websiteId;
      }

      console.log("API call params:", baseParams);

      let response;
      response = existingForwarding
        ? await domainAPI.updateDomainForwarding(baseParams)
        : await domainAPI.setDomainForwarding(baseParams);

      if (
        response?.responseMsg?.statusCode === 200 ||
        response?.responseData?.statusCode === 200
      ) {
        showAlert(
          existingForwarding
            ? t.admin.domainForwardingUpdatedSuccess || "Domain forwarding updated successfully"
            : t.admin.domainForwardingCreatedSuccess || "Domain forwarding created successfully",
          { type: "success", duration: 2500 }
        );
        // Refresh forwarding data
        await fetchExistingForwarding();
        // Close modal after a short delay
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        const errorMessage =
          response?.responseMsg?.message ||
          response?.responseData?.message ||
          t.admin.failedToUpdateDomainForwarding;
        showAlert(errorMessage, { type: "warning" });
      }
    } catch (error) {
      const errorMessage =
        error?.response?.data?.responseMsg?.message ||
        error?.response?.data?.message ||
        error?.message ||
        t.admin.failedToUpdateDomainForwarding;
      showAlert(errorMessage, { type: "warning" });
      console.error("Error saving domain forwarding:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existingForwarding || !domainName) return;

    if (
      !window.confirm(t.admin.confirmDeleteDomainForwarding || "Are you sure you want to delete this domain forwarding?")
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      const deleteParams = {
        domainName: domainName,
      };

      if (domainNameId) {
        deleteParams.domainNameId = domainNameId;
      }
      if (websiteId) {
        deleteParams.websiteId = websiteId;
      }
      const response = await domainAPI.deleteDomainForwarding(deleteParams);

      if (
        response?.responseMsg?.statusCode === 200 ||
        response?.responseData?.statusCode === 200
      ) {
        showAlert(t.admin.domainForwardingDeletedSuccess || "Domain forwarding deleted successfully", {
          type: "success",
          duration: 2500,
        });
        setExistingForwarding(null);
        setWebsite("");
        // Close modal after a short delay
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        const errorMessage =
          response?.responseMsg?.message ||
          response?.responseData?.message ||
          t.admin.failedToDeleteDomainForwarding || "Failed to delete domain forwarding";
        showAlert(errorMessage, { type: "warning" });
      }
    } catch (error) {
      const errorMessage =
        error?.response?.data?.responseMsg?.message ||
        error?.response?.data?.message ||
        error?.message ||
        t.admin.failedToDeleteDomainForwarding || "Failed to delete domain forwarding";
      showAlert(errorMessage, { type: "warning" });
      console.error("Error deleting domain forwarding:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white/80 dark:bg-gray-600/80 overflow-auto py-5">
      <div className="flex items-center justify-center w-full h-screen">
        <div className="modal-dialog">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-black"
          >
            <IoClose className="text-primary dark:text-gray-500" size={30} />
          </button>

          {/* Modal Title */}
          <h2 className="modal-title">{t.admin.manageDomainForwarding}</h2>

          {isLoading ? (
            <LoadingSpinner
              text={t.admin.loadingDomainForwarding || "Loading domain forwarding..."}
              className="py-10"
            />
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="flex gap-2 items-center w-full mb-3">
                <div className="relative min-w-28">
                  <select
                    className="input-field admin-form !pt-3 !pb-4"
                    value={protocol}
                    onChange={(e) => setProtocol(e.target.value)}
                    disabled={isSaving || isDeleting}
                  >
                    <option value="https://">https://</option>
                    <option value="http://">http://</option>
                  </select>
                  <IoIosArrowDown
                    size={15}
                    className="absolute top-1/2 transform -translate-y-1/2 right-4 text-primary dark:text-white pointer-events-none"
                  />
                </div>
                <div className="relative w-full">
                  <input
                    type="text"
                    className="input-field admin-form peer w-full"
                    id="website"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    disabled={isSaving || isDeleting}
                  />
                  <label
                    htmlFor="website"
                    className={`absolute left-5 transition-all font-medium ${
                      website
                        ? "top-2 text-xs text-gray-600"
                        : "top-4 text-13 text-primary dark:text-gray-500 "
                    } peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}
                  >
                    {t.admin.websiteUrl} *
                  </label>
                </div>
              </div>

              {/* Pending Setup */}
              <div className="flex items-center justify-between gap-2 px-4 py-2.5 rounded-md border border-stokecolor dark:border-gray-700 mb-3">
                <div className="flex items-center gap-2.5 text-secondary">
                  <PiWarningBold />
                  <span className="text-xs font-medium">
                    {t.admin.connectingToHostingRemovesForwarder}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 justify-between items-center w-full">
                <div className="flex flex-col gap-1 w-full">
                  <p className="font-medium text-base text-primary dark:text-gray-300">
                    {t.admin.redirectType}
                  </p>
                  <label
                    className={`flex gap-2 cursor-pointer ${
                      redirectType === 1 ? "selected" : ""
                    }`}
                  >
                    <div className="mt-1">
                      <input
                        type="radio"
                        name="redirectType"
                        checked={redirectType === 1}
                        onChange={() => setRedirectType(1)}
                        disabled={isSaving || isDeleting}
                        className="sr-only"
                      />

                      <div
                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors duration-200 ${
                          redirectType === 1
                            ? "border-tealdark bg-tealdark"
                            : "border-gray-400"
                        }`}
                      >
                        {redirectType === 1 && (
                          <div className="w-1.5 h-1.5 bg-white dark:bg-gray-800 rounded-full"></div>
                        )}
                      </div>
                    </div>
                    <p className="font-medium text-13 text-primary dark:text-gray-300">
                      {t.admin.temporary302}
                    </p>
                  </label>
                  <label
                    className={`flex gap-2 cursor-pointer ${
                      redirectType === 2 ? "selected" : ""
                    }`}
                  >
                    <div className="mt-1">
                      <input
                        type="radio"
                        name="redirectType"
                        checked={redirectType === 2}
                        onChange={() => setRedirectType(2)}
                        disabled={isSaving || isDeleting}
                        className="sr-only"
                      />

                      <div
                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors duration-200 ${
                          redirectType === 2
                            ? "border-tealdark bg-tealdark"
                            : "border-gray-400"
                        }`}
                      >
                        {redirectType === 2 && (
                          <div className="w-1.5 h-1.5 bg-white dark:bg-gray-800 rounded-full"></div>
                        )}
                      </div>
                    </div>
                    <p className="font-medium text-13 text-primary dark:text-gray-300">
                      {t.admin.permanent301}
                    </p>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 my-2 w-full admin-btn">
                {existingForwarding && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isSaving || isDeleting}
                    className="add-to-cart px-7 bg-red-600 hover:bg-red-700"
                  >
                    {isDeleting ? t.admin.deleting : t.admin.removeDomainForwarding}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSaving || isDeleting}
                  className="add-to-cart px-7"
                >
                  {isSaving
                    ? t.admin.saving
                    : existingForwarding
                    ? t.admin.updateForwarding || "Update Forwarding"
                    : t.admin.applyDomainForwarding}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default DomainForwardingModal;
