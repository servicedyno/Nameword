import StartTransfer from '../../../components/front-admin/domain/Transfer/StartTransfer';
import TransferlistTable from '../../../components/front-admin/domain/Transfer/TransferlistTable';
import { useState } from 'react';
import { PiListChecks } from "react-icons/pi";
import { GoUnlock } from "react-icons/go";
import { MdPassword } from "react-icons/md";
import { domainAPI } from '../../../api/domains';
import { useLanguage } from '../../../hooks/useLanguage';

const TransferDomain = () => {
    const { t } = useLanguage();
    const [domainName, setDomainName] = useState('');
    const [selectedDomain, setSelectedDomain] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleDomainInput = (e) => {
        setDomainName(e.target.value);
        setError(null);
        // Reset selected domain when user types
        if (selectedDomain) {
            setSelectedDomain(null);
        }
    };

    const handleBackToSearch = () => {
        setSelectedDomain(null);
        setError(null);
    };

    const handleTransfer = async () => {
        // Validate domain input
        if (!domainName || !domainName.trim()) {
            setError(t.admin?.transferDomain?.validation?.domainNameRequired || 'Please enter a domain name');
            return;
        }

        // Basic domain validation
        const domainPattern = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
        if (!domainPattern.test(domainName.trim())) {
            setError(t.admin?.transferDomain?.validation?.domainNameInvalid || 'Please enter a valid domain name');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Get pricing information for transfer without requiring the domain to exist in this account
            const priceParams = {
                websiteName: domainName.trim(),
                renewalFeePerc: 50,
                transferFeePerc: 50,
                registrationFeePerc: 50,
                duration: 1, // 1 year for transfer
            };

            const priceResponse = await domainAPI.checkDomainPrice(priceParams);
            
            if (priceResponse?.responseMsg?.statusCode !== 200) {
                // Construct error message from provider error if available
                let errorMessage = priceResponse?.responseMsg?.message;
                
                // If we have providerError with desc and code, format it properly
                if (priceResponse?.providerError?.desc) {
                    errorMessage = `Domain provider request error: { desc: '${priceResponse.providerError.desc}', code: ${priceResponse.providerError.code || priceResponse.responseMsg?.code} }`;
                } else if (!errorMessage) {
                    errorMessage = t.admin?.transferDomain?.errors?.failedToGetPricing || 'Failed to get domain pricing';
                }
                
                throw new Error(errorMessage);
            }

            // Set selected domain with pricing and WHOIS info for external domains
            setSelectedDomain({
                domainName: domainName.trim(),
                pricing: priceResponse.responseData,
                details: null,
                whoisInfo: priceResponse.responseData?.whoisInfo || null,
            });
        } catch (err) {
            console.error('Error checking domain:', err);
            // Check if error response has the formatted provider error message
            const errorMessage = err?.response?.data?.message || err?.message || t.admin?.transferDomain?.errors?.failedToCheckDomain || 'Failed to check domain. Please try again.';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleTransfer();
        }
    };

    return (
            <div className='space-y-7'>
                {/* Dashboard title */}
                <div className='flex flex-col gap-2 title-section'>
                    <h2>{t.admin?.transferDomain?.title || 'Transfer Domain'}</h2>
                </div>

                {/* Start Transfer - Only show when not in requirements view */}
                {!selectedDomain && (
                    <div className='mb-8'>
                        <p className='card-admin-title'>{t.admin?.transferDomain?.startTransfer?.title || 'Start Transfer'}</p>
                        <div className='table-card p-5 flex sm:flex-row flex-col w-full gap-2'>
                            <div className="relative w-full">
                                <input 
                                    type="text" 
                                    className="input-field admin-form peer" 
                                    id="domainInput" 
                                    value={domainName} 
                                    onChange={handleDomainInput}
                                    onKeyDown={handleKeyDown}
                                    disabled={loading}
                                    placeholder=" "
                                />
                                <label 
                                    htmlFor="domainInput" 
                                    className={`absolute left-5 transition-all font-medium ${domainName ? 'top-2 text-xs text-gray-600' : 'top-4 text-13 text-primary dark:text-gray-500 '} peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}
                                >
                                    {t.admin?.transferDomain?.startTransfer?.domainInputLabel || 'Enter a domain for transfer'}
                                </label>
                            </div>
                            <button 
                                className={`add-to-cart ${!domainName.trim() || loading ? 'disable' : ''}`}
                                onClick={handleTransfer}
                                disabled={loading || !domainName.trim()}
                            >
                                {loading ? (t.admin?.transferDomain?.startTransfer?.loading || 'Loading...') : (t.admin?.transferDomain?.startTransfer?.transferButton || 'Transfer')}
                            </button>
                        </div>
                        {error && (
                            <div className="mt-2 text-red-500 text-sm px-5">
                                {error}
                            </div>
                        )}
                    </div>
                )}
                
                {/* transfer Requirements */}
                {selectedDomain && (
                    <StartTransfer 
                        domainData={selectedDomain} 
                        onBack={handleBackToSearch}
                    />
                )}
                
                {/* Transfer list */}
                <TransferlistTable />

                {/* How it works */}
                <div className='mb-8'>
                    <p className='card-admin-title'>{t.admin?.transferDomain?.howItWorks?.title || 'How it works'}</p>
                    <div className='table-card p-8 min-h-64 flex items-center justify-center'>
                        <div className='grid md:grid-cols-3 grid-cols-1 lg:gap-12 md:gap-8 gap-8'>
                            <div className='flex flex-col items-center how-it-works text-center'>
                                <div className="rounded-icon-bg">
                                    <PiListChecks size={25} className='text-darkbtn dark:text-white' />
                                </div>
                                <p>{t.admin?.transferDomain?.howItWorks?.step1?.title || 'Domain meets transfer requirements'}</p>
                                <span>{t.admin?.transferDomain?.howItWorks?.step1?.description || 'Over 60 days have passed since the initial domain registration or last transfer'}</span>
                            </div>
                            <div className='flex flex-col items-center how-it-works text-center'>
                                <div className="rounded-icon-bg">
                                    <GoUnlock size={25} className='text-darkbtn dark:text-white' />
                                </div>
                                <p>{t.admin?.transferDomain?.howItWorks?.step2?.title || 'Domain is unlocked'}</p>
                                <span>{t.admin?.transferDomain?.howItWorks?.step2?.description || 'Your domain must be unlocked from your current registrar before transferring. Learn more on how to unlock a domain.'}</span>
                            </div>
                            <div className='flex flex-col items-center how-it-works text-center'>
                                <div className="rounded-icon-bg">
                                    <MdPassword size={25} className='text-darkbtn dark:text-white   ' />
                                </div>
                                <p>{t.admin?.transferDomain?.howItWorks?.step3?.title || 'You have an authorization code'}</p>
                                <span>{t.admin?.transferDomain?.howItWorks?.step3?.description || 'You must have a valid domain authorization code. You can obtain it from the current registrar.'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
    )
}

export default TransferDomain