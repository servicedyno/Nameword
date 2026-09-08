import { useState, useMemo } from 'react';
import { IoCheckmarkOutline, IoClose } from "react-icons/io5";
import { IoIosArrowBack } from "react-icons/io";
import { FiInfo } from "react-icons/fi";
import TransferDomainModal from '../../../modals/transfer-domain-modal'
import { useLanguage } from '../../../../hooks/useLanguage';

const StartTransfer = ({ domainData, onBack }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { t } = useLanguage();

    // Parse domain name to show name and extension separately
    const { domainName, domainExtension } = useMemo(() => {
        if (!domainData?.domainName) {
            return { domainName: '', domainExtension: '' };
        }
        const parts = domainData.domainName.split('.');
        if (parts.length < 2) {
            return { domainName: domainData.domainName, domainExtension: '' };
        }
        const extension = parts.slice(-1)[0];
        const name = parts.slice(0, -1).join('.');
        return { domainName: name, domainExtension: extension };
    }, [domainData]);

    // Check transfer requirements
    const requirements = useMemo(() => {
        if (!domainData) {
            return {
                meets60DayRule: false,
                isUnlocked: false,
                allRequirementsMet: false,
            };
        }

        const details = domainData.details;

        // If we cannot fetch details (external registrar), assume user verified requirements
        if (!details) {
            return {
                meets60DayRule: true,
                isUnlocked: true,
                canCheckLockStatus: false,
                allRequirementsMet: true,
            };
        }

        // Check 60 days rule
        let meets60DayRule = false;
        if (details?.orderDate) {
            try {
                const registrationDate = new Date(details.orderDate);
                // Check if date is valid
                if (!isNaN(registrationDate.getTime())) {
                    const daysSinceRegistration = (Date.now() - registrationDate.getTime()) / (1000 * 60 * 60 * 24);
                    meets60DayRule = daysSinceRegistration >= 60;
                }
            } catch (error) {
                console.error('Error parsing orderDate:', error);
                meets60DayRule = false;
            }
        } else {
            // If orderDate is not available, we can't verify the 60-day rule
            meets60DayRule = false;
        }

        // Check domain lock status
        // For transfer, domain should be UNLOCKED
        const isLocked = details?.isLocked || details?.is_locked || details?.lockStatus?.isLocked || false;
        const isUnlocked = !isLocked;

        // Both requirements must be met for transfer
        const allRequirementsMet = meets60DayRule && isUnlocked;

        return {
            meets60DayRule,
            isUnlocked,
            canCheckLockStatus: true,
            allRequirementsMet,
        };
    }, [domainData]);

    // Calculate pricing
    const pricing = useMemo(() => {
        if (!domainData?.pricing) {
            return {
                transferFee: 0,
                renewalFee: 0,
                totalPrice: 0,
                originalPrice: 0,
            };
        }

        const transferFee = parseFloat(domainData.pricing.transferFee) || 0;
        const renewalFee = parseFloat(domainData.pricing.renewalfee) || 0;
        // For transfer, the transferFee already includes the renewal fee and all charges
        // So we use transferFee as the total price (not transferFee + renewalFee)
        const totalPrice = transferFee;
        const originalPrice = totalPrice * 1.2; // Assuming 20% discount or markup

        return {
            transferFee,
            renewalFee,
            totalPrice,
            originalPrice,
        };
    }, [domainData]);

    // Calculate expiration date (1 year from now)
    const expirationDate = useMemo(() => {
        const date = new Date();
        date.setFullYear(date.getFullYear() + 1);
        return date.toISOString().split('T')[0];
    }, []);

    // Format price
    const formatPrice = (price) => {
        return price.toFixed(2);
    };

    if (!domainData) {
        return null;
    }

    return (
        <div className='space-y-7'>
            <div className='table-card p-5 space-y-4'>
                <button
                    onClick={onBack || (() => { })}
                    className={'right-link !text-darkbtn dark:!text-gray-500'}
                >
                    <IoIosArrowBack /> {t.admin.back}
                </button>

                <div className='flex sm:flex-row flex-col sm:gap-10 gap-4'>
                    <div className='flex flex-col gap-2 2xl:w-1/4 xl:w-1/3 lg:w-1/2 w-full'>
                        <p className='w-auto'>
                            <span className={`px-2 py-1 text-13 font-medium text-primary dark:text-gray-400 ${requirements.allRequirementsMet
                                ? 'bg-sucess-50 dark:bg-green-700/30'
                                : 'bg-lightbeige dark:bg-red-500/30'
                                }`}>
                                {requirements.allRequirementsMet ? t.admin.requirementsMet : t.admin.requirementsNotMet}
                            </span>
                        </p>
                        <p className='text-lg font-medium text-primary dark:text-gray-400'>
                            {domainName}. <span className='text-darkbtn dark:text-gray-500'>{domainExtension}</span>
                        </p>
                    </div>
                    <div className='flex flex-col gap-2 2xl:w-1/4 xl:w-1/3 lg:w-1/2 w-full'>
                        <p className={`text-13 font-medium flex items-center gap-2 ${requirements.meets60DayRule
                            ? 'text-secondary'
                            : 'text-primary dark:text-gray-400'
                            }`}>
                            {requirements.meets60DayRule ? (
                                <IoCheckmarkOutline size={18} className='text-sucess-400' />
                            ) : (
                                <IoClose size={18} className='text-warning' />
                            )}
                            {requirements.canCheckLockStatus
                                ? t.admin.sixtyDaysPassed
                                : t.admin.cannotVerify60DayRule}
                        </p>
                        <p className={`text-13 font-medium flex items-center gap-2 ${requirements.isUnlocked
                            ? 'text-secondary'
                            : 'text-primary dark:text-gray-400'
                            }`}>
                            {requirements.isUnlocked ? (
                                <IoCheckmarkOutline size={18} className='text-sucess-400' />
                            ) : (
                                <IoClose size={18} className='text-warning' />
                            )}
                            {requirements.canCheckLockStatus
                                ? (requirements.isUnlocked
                                    ? t.admin.domainUnlocked
                                    : t.admin.domainLocked)
                                : t.admin.cannotVerifyLockStatus}
                        </p>
                    </div>
                </div>

                <hr className='card-divider' />

                <p className='text-lg font-medium text-primary dark:text-gray-400 flex gap-2 items-center'>
                    {t.admin.transferAndRenew} <FiInfo />
                </p>
                <div className='flex flex-col gap-1'>
                    <p className="text-lg font-medium text-tealdark flex gap-2 items-center">
                        ${formatPrice(pricing.totalPrice)}
                        {pricing.originalPrice > pricing.totalPrice && (
                            // <span className="text-secondary line-through text-13">
                            //     ${formatPrice(pricing.originalPrice)}
                            // </span>
                            <span className="text-secondary line-through text-13">$21.99</span>
                        )}
                    </p>
                    <p className="text-secondary text-13 font-medium">
                        {t.admin.priceIncludesRenewal.replace('{date}', expirationDate)}
                    </p>
                </div>
                <div className='flex items-center'>
                    <button
                        className={`add-to-cart ${!requirements.allRequirementsMet ? 'disable' : ''}`}
                        onClick={() => {
                            if (requirements.allRequirementsMet) {
                                setIsOpen(true);
                            }
                        }}
                        disabled={!requirements.allRequirementsMet}
                    >
                        {t.admin.continue}
                    </button>
                </div>
            </div>

            {/* Modal */}
            {isOpen && (
                <TransferDomainModal
                    onClose={() => setIsOpen(false)}
                    domainName={domainData.domainName}
                    domainData={domainData}
                />
            )}
        </div>
    )
}

export default StartTransfer


