import { FiInfo } from "react-icons/fi";
import { TbExternalLink, TbCopy } from "react-icons/tb";
import { useState } from 'react';
import ChangeControlPanel from '../../../components/modals/change-control-panel';
import { Tooltip } from 'react-tooltip';
import { useLanguage } from '../../../hooks/useLanguage';
import { useAlert } from '../../../context/AlertContext';

const WebsiteDetailsCard = ({ domain, hostingOrder }) => {
    const { t } = useLanguage();
    const { showAlert } = useAlert();
    const [controlpanel, setcontrolpanel] = useState();
    // Modal click
    const [isOpen, setIsOpen] = useState(false);

    const domainName = domain?.websiteName || "N/A";
    const websiteUrl = domainName !== "N/A" ? `https://${domainName}` : "N/A";
    const wwwUrl = domainName !== "N/A" ? `https://www.${domainName}` : "N/A";

    // Get IP address from hosting order or domain data
    const ipAddress = hostingOrder?.hostbayResponse?.ip_address ||
        hostingOrder?.hostbayResponse?.server_ip ||
        domain?.ipAddress ||
        "N/A";

    // Get control panel type from hosting order provider
    const getControlPanelType = () => {
        if (!hostingOrder) return null;
        const provider = hostingOrder.provider?.toLowerCase();
        if (provider === "hostbay") {
            return 2; // cPanel
        } else if (provider === "connectreseller") {
            return 1; // Plesk
        }
        return null;
    };

    const defaultControlPanel = getControlPanelType();
    const currentPanel = controlpanel || defaultControlPanel || 2;

    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            showAlert(t.admin?.copiedToClipboard || "Copied to clipboard", { type: "success", duration: 2000 });
        } catch {
            showAlert(t.admin?.copyFailed || "Failed to copy", { type: "fail", duration: 2000 });
        }
    };

    return (
        <div className='table-card'>
            <div className='flex justify-between items-center gap-2 px-5 py-2.5'>
                <p className="info-card-title">{t.admin.websiteDetails}</p>
            </div>
            <hr className='card-divider' />

            <div className="py-7 px-5 space-y-4 card-essential">
                <div className="flex sm:items-center items-start gap-2 info-detail sm:flex-row flex-col">
                    <p className="text-secondary">{t.admin.websiteUrl}</p>
                    <span className="text-darkbtn dark:text-white flex items-center gap-1 flex-wrap">
                        {websiteUrl}
                        {websiteUrl !== "N/A" && (
                            <>
                                <a
                                    href={websiteUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-darkbtn dark:text-white inline-flex items-center justify-center p-1.5 rounded hover:opacity-80 cursor-pointer"
                                    aria-label={t.admin?.openLink || "Open link"}
                                >
                                    <TbExternalLink size={16} />
                                </a>
                                <button
                                    type="button"
                                    onClick={() => copyToClipboard(websiteUrl)}
                                    className="text-darkbtn dark:text-white inline-flex items-center justify-center p-1.5 rounded hover:opacity-80 cursor-pointer"
                                    aria-label={t.admin?.copyToClipboard || "Copy"}
                                >
                                    <TbCopy size={16} />
                                </button>
                            </>
                        )}
                    </span>
                </div>
                <div className="flex sm:items-center items-start gap-2 info-detail sm:flex-row flex-col">
                    <p className="text-secondary">{t.admin.wwwWebsiteUrl}</p>
                    <span className="text-darkbtn dark:text-white flex items-center gap-1 flex-wrap">
                        {wwwUrl}
                        {wwwUrl !== "N/A" && (
                            <>
                                <a
                                    href={wwwUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-darkbtn dark:text-white inline-flex items-center justify-center p-1.5 rounded hover:opacity-80 cursor-pointer"
                                    aria-label={t.admin?.openLink || "Open link"}
                                >
                                    <TbExternalLink size={16} />
                                </a>
                                <button
                                    type="button"
                                    onClick={() => copyToClipboard(wwwUrl)}
                                    className="text-darkbtn dark:text-white inline-flex items-center justify-center p-1.5 rounded hover:opacity-80 cursor-pointer"
                                    aria-label={t.admin?.copyToClipboard || "Copy"}
                                >
                                    <TbCopy size={16} />
                                </button>
                            </>
                        )}
                    </span>
                </div>
                <div className="flex sm:items-center items-start gap-2 info-detail sm:flex-row flex-col">
                    <p className="text-secondary sm:w-auto w-full">{t.admin.websiteIpAddress}</p>
                    <span className="text-primary dark:text-white">{ipAddress}</span>
                </div>
                <div className="flex sm:items-center items-start gap-2 info-detail sm:flex-row flex-col">
                    <p className="text-secondary flex items-center gap-1 tooltip-container">{t.admin.controlPanel} <FiInfo data-tooltip-id="control-panel" data-tooltip-place="bottom" />
                        <Tooltip id="control-panel" clickable className="tooltip">
                            <div>
                                <div className="flex flex-col gap-2.5 text-left">
                                    <span>{t.admin.cpanelDescription}</span>
                                    <span>{t.admin.pleskDescription}</span>
                                </div>
                            </div>
                        </Tooltip>
                    </p>
                    <div className="flex items-center gap-5">
                        <label onClick={() => setIsOpen(true)} className={`flex items-start gap-2 ${currentPanel === 1 ? 'selected' : ''}`} >
                            <div className="mt-0.5">
                                <input type="radio" name="plan" checked={currentPanel === 1} onChange={() => setcontrolpanel(1)} className="sr-only" />

                                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors duration-200 ${currentPanel === 1 ? 'border-tealdark bg-tealdark' : 'border-gray-400'}`} >
                                    {currentPanel === 1 && (
                                        <div className="w-1.5 h-1.5 bg-white dark:bg-gray-800 rounded-full"></div>
                                    )}
                                </div>
                            </div>
                            <p className="font-medium text-13 text-primary dark:text-gray-300">{t.admin.plesk}</p>
                        </label>
                        <label onClick={() => setIsOpen(true)} className={`flex items-start gap-2 ${currentPanel === 2 ? 'selected' : ''}`} >
                            <div className="mt-0.5">
                                <input type="radio" name="plan" checked={currentPanel === 2} onChange={() => setcontrolpanel(2)} className="sr-only" />

                                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors duration-200 ${currentPanel === 2 ? 'border-tealdark bg-tealdark' : 'border-gray-400'}`} >
                                    {currentPanel === 2 && (
                                        <div className="w-1.5 h-1.5 bg-white dark:bg-gray-800 rounded-full"></div>
                                    )}
                                </div>
                            </div>
                            <p className="font-medium text-13 text-primary dark:text-gray-300">{t.admin.cpanel}</p>
                        </label>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isOpen && (
                <ChangeControlPanel onClose={() => setIsOpen(false)} />
            )}
        </div>
    )
}

export default WebsiteDetailsCard