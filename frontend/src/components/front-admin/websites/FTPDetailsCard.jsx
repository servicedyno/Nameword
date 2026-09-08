import { useState, useEffect } from "react";
import { TbExternalLink, TbCopy } from "react-icons/tb";
import { hostingAPI } from "../../../api/hosting";
import { useLanguage } from "../../../hooks/useLanguage";
import { useAlert } from "../../../context/AlertContext";

const FTPDetailsCard = ({ domain, hostingOrder }) => {
  const { t } = useLanguage();
  const { showAlert } = useAlert();
  const domainName = domain?.websiteName || "N/A";
  const [credentials, setCredentials] = useState(null);
  const [loading, setLoading] = useState(false);

  // Get subscription ID from hosting order
  const subscriptionId = hostingOrder?.hostbayResponse?.subscription?.id;

  // Fetch credentials from API
  useEffect(() => {
    const fetchCredentials = async () => {
      if (!subscriptionId) {
        return;
      }

      try {
        setLoading(true);
        const response = await hostingAPI.getHostingCredentials(subscriptionId);
        if (response?.success && response?.responseData) {
          setCredentials(response.responseData);
        }
      } catch (error) {
        console.error("Failed to fetch hosting credentials:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCredentials();
  }, [subscriptionId]);


  const ftpHost =
    credentials?.ftp_host ||
    hostingOrder?.hostbayResponse?.ftp_ip ||
    hostingOrder?.hostbayResponse?.server_ip ||
    hostingOrder?.hostbayResponse?.ip_address ||
    "N/A";
  const ftpPort = credentials?.ftp_port || 21;
  const ftpIP = ftpHost !== "N/A" ? `${ftpHost}:${ftpPort}` : "N/A";
  const ftpHostname = domainName !== "N/A" ? `ftp://${domainName}` : "N/A";
  const ftpUsername =
    credentials?.cpanel_username ||
    hostingOrder?.hostbayResponse?.ftp_username ||
    hostingOrder?.hostbayResponse?.username ||
    hostingOrder?.hostbayResponse?.subscription?.cpanel_username ||
    "N/A";
  const cpanelUrl = credentials?.cpanel_url || "N/A";
  const fileUploadPath =
    hostingOrder?.hostbayResponse?.file_upload_path ||
    hostingOrder?.hostbayResponse?.document_root ||
    "N/A";

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      showAlert(t.admin?.copiedToClipboard || "Copied to clipboard", { type: "success", duration: 2000 });
    } catch {
      showAlert(t.admin?.copyFailed || "Failed to copy", { type: "fail", duration: 2000 });
    }
  };

  return (
    <div className="table-card">
      <div className="flex justify-between items-center gap-2 px-5 py-2.5">
        <p className="info-card-title">{t.admin.ftpDetails}</p>
      </div>
      <hr className="card-divider" />

      <div className="py-7 px-5 space-y-4 card-essential">
        {loading ? (
          <p className="text-secondary">{t.admin.loadingCredentials}</p>
        ) : (
          <>
            <div className="flex items-center gap-2 info-detail">
              <p className="text-secondary">{t.admin.ftpIp}</p>
              <span className="text-darkbtn dark:text-white flex items-center gap-1 flex-wrap">
                {ftpHost !== "N/A" ? `${ftpHost}:${ftpPort}` : "N/A"}
                {ftpHost !== "N/A" && (
                  <>
                    <a
                      href={`ftp://${ftpHost}:${ftpPort}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-darkbtn dark:text-white inline-flex items-center justify-center p-1.5 rounded hover:opacity-80 cursor-pointer"
                      aria-label={t.admin?.openLink || "Open link"}
                    >
                      <TbExternalLink size={16} />
                    </a>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(`${ftpHost}:${ftpPort}`)}
                      className="text-darkbtn dark:text-white inline-flex items-center justify-center p-1.5 rounded hover:opacity-80 cursor-pointer"
                      aria-label={t.admin?.copyToClipboard || "Copy"}
                    >
                      <TbCopy size={16} />
                    </button>
                  </>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 info-detail">
              <p className="text-secondary">{t.admin.ftpHostname}</p>
              <span className="text-darkbtn dark:text-white flex items-center gap-1 flex-wrap">
                {ftpHostname}
                {ftpHostname !== "N/A" && (
                  <>
                    <a
                      href={ftpHostname}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-darkbtn dark:text-white inline-flex items-center justify-center p-1.5 rounded hover:opacity-80 cursor-pointer"
                      aria-label={t.admin?.openLink || "Open link"}
                    >
                      <TbExternalLink size={16} />
                    </a>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(ftpHostname)}
                      className="text-darkbtn dark:text-white inline-flex items-center justify-center p-1.5 rounded hover:opacity-80 cursor-pointer"
                      aria-label={t.admin?.copyToClipboard || "Copy"}
                    >
                      <TbCopy size={16} />
                    </button>
                  </>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 info-detail">
              <p className="text-secondary">{t.admin.ftpUsername}</p>
              <span className="text-primary dark:text-white flex items-center gap-1">
                {ftpUsername}
                {ftpUsername !== "N/A" && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(ftpUsername)}
                    className="text-darkbtn dark:text-white inline-flex items-center justify-center p-1.5 rounded hover:opacity-80 cursor-pointer"
                    aria-label={t.admin?.copyToClipboard || "Copy"}
                  >
                    <TbCopy size={16} />
                  </button>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2 info-detail">
              <p className="text-secondary">{t.admin.fileUploadPath}</p>
              <span className="text-primary dark:text-white">
                {fileUploadPath}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FTPDetailsCard;
