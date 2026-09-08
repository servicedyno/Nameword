import { IoClose, IoCheckmarkOutline } from "react-icons/io5";
import { useState } from "react";
import { IoIosArrowBack } from "react-icons/io";
import { LuRefreshCw } from "react-icons/lu";
import { domainAPI } from "../../../../api/domains";
import { useDomain } from "../../../../hooks/useDomain";
import { useAlert } from "../../../../context/AlertContext";
import { useLanguage } from "../../../../hooks/useLanguage";

const LockConfirmChoice = ({ onClose, onBack, selectedDomains = [], action = 'lock', turnOffReason = {} }) => {
    const { t } = useLanguage();
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const { fetchDomains } = useDomain();
    const { showAlert } = useAlert();

    // Analyze domains to show which ones already have the action completed
    const analyzeDomains = () => {
        if (!selectedDomains || selectedDomains.length === 0) {
            return { alreadyCompleted: 0, willBeAffected: 0 };
        }

        const targetValue = action === 'lock';
        let alreadyCompleted = 0;
        let willBeAffected = 0;

        selectedDomains.forEach((domain) => {
            const normalizeLockStatus = (domain) => {
                const lockStatus = domain?.lockStatus?.isLocked ?? 
                                  domain?.isLocked ?? 
                                  domain?.is_locked ?? 
                                  domain?.locked ?? 
                                  false;
                return Boolean(lockStatus);
            };

            const currentValue = normalizeLockStatus(domain);
            if (currentValue === targetValue) {
                alreadyCompleted++;
            } else {
                willBeAffected++;
            }
        });

        return { alreadyCompleted, willBeAffected };
    };

    const { alreadyCompleted, willBeAffected } = analyzeDomains();

    const handleApply = async () => {
        if (!selectedDomains || selectedDomains.length === 0) {
            showAlert(t.admin.noDomainsSelected, { type: 'warning' });
            return;
        }

        setLoading(true);
        try {
            const domainNames = selectedDomains.map((domain) => domain.websiteName || domain.domain || domain);
            const response = await domainAPI.bulkManageDomainLock({
                domains: domainNames,
                isDomainLocked: action === 'lock',
            });

            if (response.success) {
                setResults(response.data);
                showAlert(response.message || t.admin.domainLockUpdatedSuccess, { type: 'success' });
                
                // Refresh domain list
                if (fetchDomains) {
                    await fetchDomains();
                }

                // Auto close after 2 seconds
                setTimeout(() => {
                    onClose();
                }, 2000);
            } else {
                showAlert(response.message || t.admin.failedToUpdateDomainLock, { type: 'error' });
            }
        } catch (error) {
            const errorMsg = error?.response?.data?.message || error.message || t.admin.failedToUpdateDomainLock;
            showAlert(errorMsg, { type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    if (results) {
        return (
            <div className="fixed inset-0 z-50 bg-white/80 dark:bg-gray-600/80 overflow-auto py-5">
                <div className="flex items-center justify-center w-full h-full">
                    <div className="modal-dialog">
                        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-black cursor-pointer">
                            <IoClose className='text-primary dark:text-gray-500' size={30} />
                        </button>

                        <div className="flex flex-col gap-2">
                            <h2 className="modal-title">
                                {action === 'lock' ? t.admin.domainLockEnabled : t.admin.domainLockDisabled}
                            </h2>
                        </div>

                        <div className="space-y-2 mt-4">
                            <p className="text-13 text-primary dark:text-gray-400 font-medium flex items-center gap-2">
                                <IoCheckmarkOutline size={14} className="text-tealdark"/> 
                                {t.admin.domainsUpdatedSuccess.replace("{count}", results.successCount).replace(/{plural}/g, results.successCount === 1 ? '' : 's')}
                            </p>
                            {results.failureCount > 0 && (
                                <p className="text-13 text-red-500 font-medium flex items-center gap-2">
                                    <LuRefreshCw size={14} className="text-red-500"/> 
                                    {t.admin.domainsFailedToUpdate.replace("{count}", results.failureCount).replace(/{plural}/g, results.failureCount === 1 ? '' : 's')}
                                </p>
                            )}
                        </div>

                        {results.failed && results.failed.length > 0 && (
                            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
                                <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-2">{t.admin.failedDomains}</p>
                                <ul className="text-xs text-red-600 dark:text-red-400 space-y-1">
                                    {results.failed.map((fail, idx) => (
                                        <li key={idx}>{fail.domain}: {fail.error}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-white/80 dark:bg-gray-600/80 overflow-auto py-5">
            <div className="flex items-center justify-center w-full h-full">
                <div className="modal-dialog">
                    {/* Close Button */}
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-black cursor-pointer">
                        <IoClose className='text-primary dark:text-gray-500' size={30} />
                    </button>

                    {/* Modal Title */}
                    <div className="flex flex-col gap-2">
                        <h2 className="modal-title">
                            <button 
                                onClick={onBack || onClose} 
                                className={'right-link !text-darkbtn dark:!text-gray-500 mb-2 flex items-center gap-1'} 
                            >
                                <IoIosArrowBack /> {t.admin.back}
                            </button>
                            {t.admin.confirmYourChoice}
                        </h2>
                    </div>

                    <div className="space-y-2 mt-4">
                        {alreadyCompleted > 0 && (
                            <p className="text-13 text-primary dark:text-gray-400 font-medium flex items-center gap-2">
                                <IoCheckmarkOutline size={14} className="text-tealdark"/> 
                                {action === 'lock' 
                                    ? t.admin.domainsAlreadyHaveLockEnabled.replace("{count}", alreadyCompleted).replace(/{plural}/g, alreadyCompleted === 1 ? '' : 's')
                                    : t.admin.domainsAlreadyHaveLockDisabled.replace("{count}", alreadyCompleted).replace(/{plural}/g, alreadyCompleted === 1 ? '' : 's')
                                }
                            </p>
                        )}

                        {willBeAffected > 0 && (
                            <p className="text-13 text-primary dark:text-gray-400 font-semibold flex items-center gap-2">
                                <LuRefreshCw size={14} className="text-darkbtn"/> 
                                {t.admin.domainsWillBeAffected.replace("{count}", willBeAffected).replace(/{plural}/g, willBeAffected === 1 ? '' : 's')}
                            </p>
                        )}

                        {willBeAffected === 0 && alreadyCompleted > 0 && (
                            <p className="text-13 text-secondary font-medium">
                                {t.admin.allDomainsAlreadyHaveLockSetting}
                            </p>
                        )}
                    </div>

                    {/* Confirm Button */}
                    <div className="mt-5 flex justify-end gap-2 admin-btn">
                        <button 
                            className={`add-to-cart ${loading || willBeAffected === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                            onClick={handleApply}
                            disabled={loading || willBeAffected === 0}
                        >
                            {loading ? t.admin.processing : action === 'lock' ? t.admin.enableDomainLockButton : t.admin.disableDomainLockButton}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default LockConfirmChoice

