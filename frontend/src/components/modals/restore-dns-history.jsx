import { IoClose } from "react-icons/io5";
import { useState } from "react";
import Loader from "../common/Loader";
import { dnsAPI } from "../../api/domains";
import { useAlert } from "../../context/AlertContext";
import { useLanguage } from "../../hooks/useLanguage";

const RestoreDnsHistory = ({ onClose, historyId, domainName, onSuccess }) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const { showAlert } = useAlert();

  const handleRestore = async () => {
    if (!domainName || !historyId) return;

    setLoading(true);
    try {
      const response = await dnsAPI.restoreDNSHistory({
        domain: domainName,
        historyId: historyId,
      });

      if (
        response?.responseMsg?.statusCode === 200 ||
        response?.responseData?.statusCode === 200
      ) {
        showAlert(
          response?.responseMsg?.message ||
            response?.responseData?.message ||
            t.admin.dnsConfigurationRestoredSuccess,
          { type: "success", duration: 2500 }
        );
        if (onSuccess) {
          await onSuccess();
        }
        onClose();
      } else {
        const errorMsg =
          response?.responseMsg?.message ||
          response?.responseData?.message ||
          t.admin.failedToRestoreDnsConfiguration;
        showAlert(errorMsg, { type: "warning" });
      }
    } catch (error) {
      const errorMsg =
        error?.response?.data?.responseMsg?.message ||
        error?.response?.data?.message ||
        error?.message ||
        t.admin.failedToRestoreDnsConfiguration;
      showAlert(errorMsg, { type: "warning" });
      console.error("Error restoring DNS history:", error);
    } finally {
      setLoading(false);
    }
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
              {t.admin.restoreDnsConfiguration}
              <p className="text-15 font-medium text-secondary mt-1">
                {t.admin.restoreDnsConfigurationDescription}
              </p>
            </h2>
          </div>

          {/* Confirm Button */}
          <div className="mt-5 flex justify-end gap-2 admin-btn">
            <button className="btn-outline border-dark" onClick={onClose}>
              {t.admin.cancel}
            </button>
            <button
              className="add-to-cart !bg-warning hover:!bg-red-600"
              onClick={handleRestore}
              disabled={loading}
            >
              {loading ? t.admin.restoring : t.admin.yesRestore}
            </button>
          </div>
        </div>
      </div>
      {loading && <Loader />}
    </div>
  );
};

export default RestoreDnsHistory;
