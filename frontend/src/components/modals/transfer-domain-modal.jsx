import { IoClose } from "react-icons/io5";
import { RiGlobalLine } from "react-icons/ri";
import { useState } from "react";
import TransferChooseDomainModal from './transfer-choose-domain-modal'
import { useAlert } from "../../context/AlertContext";
import { useLanguage } from "../../hooks/useLanguage";

const TransferDomainModal = ({ onClose, domainName, domainData }) => {
    const { t } = useLanguage();
    const { showAlert } = useAlert();
    const [authorizationCode, setAuthorizationCode] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
       
    // Modal click
    const [isOpen, setIsOpen] = useState(false);

    const handleContinue = async () => {
        // Validate authorization code
        if (!authorizationCode || !authorizationCode.trim()) {
            showAlert(t.admin.pleaseEnterAuthorizationCode, {
                duration: 3000,
                type: 'fail',
            });
            return;
        }

        setIsVerifying(true);
        // We cannot verify auth code for external registrars; proceed after user entry
        showAlert(t.admin.authorizationCodeAdded, {
            duration: 2000,
            type: 'success',
        });
        setIsOpen(true);
        setIsVerifying(false);
    };
    return (
        <div className="fixed inset-0 z-50 bg-white/80 dark:bg-gray-600/80 overflow-auto py-5">
            <div className="flex items-center justify-center w-full h-full">
                <div className="modal-dialog">
                    {/* Close Button */}
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-black">
                        <IoClose className='text-primary dark:text-gray-500' size={30} />
                    </button>

                    {/* Modal Title */}
                    <div className="flex flex-col gap-2">
                        <span className="text-base font-medium text-darkbtn dark:text-white flex items-center gap-1">
                            <RiGlobalLine className='text-lg' /> {domainName}
                        </span>
                        <h2 className="modal-title">
                            {typeof t.admin.transferDomain === 'string'
                                ? t.admin.transferDomain
                                : t.admin.transferDomain?.title}
                            <p className="text-15 font-medium text-secondary mt-1">
                                {t.admin.transferDomainDescription}
                            </p>
                        </h2>
                    </div>

                    <div className="relative w-full">
                        <input 
                            type="text" 
                            className="input-field admin-form peer" 
                            id="authorizationCode" 
                            value={authorizationCode} 
                            onChange={(e) => {
                                setAuthorizationCode(e.target.value);
                            }}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter' && !isVerifying) {
                                    handleContinue();
                                }
                            }}
                            disabled={isVerifying}
                        />
                        <label htmlFor="authorizationCode" className={`absolute left-5 transition-all font-medium ${authorizationCode ? 'top-2 text-xs text-gray-600' : 'top-4 text-13 text-primary dark:text-gray-500 '} peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}>
                            {t.admin.authorizationCode}
                        </label>
                    </div>

                    {/* Confirm Button */}
                    <div className="mt-5 flex justify-end admin-btn">
                        <button 
                            onClick={handleContinue} 
                            className={`add-to-cart ${!authorizationCode || !authorizationCode.trim() || isVerifying ? 'disable' : ''}`}
                            disabled={!authorizationCode || !authorizationCode.trim() || isVerifying}
                        >
                            {isVerifying ? t.admin.verifying : t.admin.continue}
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isOpen && (
                <TransferChooseDomainModal 
                    onClose={() => setIsOpen(false)}
                    domainData={domainData}
                    authorizationCode={authorizationCode}
                />
            )}
        </div>
    )
}

export default TransferDomainModal