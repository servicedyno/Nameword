import { IoClose } from "react-icons/io5";
import { useState } from "react";
import PropTypes from "prop-types";
import NameserverConfirmChoice from "./nameserver-confirm-choice";
import { useLanguage } from "../../../../hooks/useLanguage";

const ChangeNameServer = ({ onClose, selectedDomains = [] }) => {
    const { t } = useLanguage();
    const [selectedPlan, setSelectedPlan] = useState(1);
    const [nameServer1, setNameServer1] = useState('');
    const [nameServer2, setNameServer2] = useState('');
    const [nameServer3, setNameServer3] = useState('');
    const [nameServer4, setNameServer4] = useState('');
    const [currentStep, setCurrentStep] = useState(1); // 1 = select nameservers, 2 = confirm

    const handleContinue = () => {
        // Validate required fields
        if (selectedPlan === 2) {
            if (!nameServer1 || !nameServer2) {
                return; // Don't proceed if required fields are missing
            }
        }
        setCurrentStep(2);
    };

    const handleBack = () => {
        if (currentStep === 2) {
            setCurrentStep(1);
        }
    };

    if (currentStep === 2) {
        return (
            <NameserverConfirmChoice
                onClose={onClose}
                onBack={handleBack}
                selectedDomains={selectedDomains}
                selectedPlan={selectedPlan}
                nameServer1={nameServer1}
                nameServer2={nameServer2}
                nameServer3={nameServer3}
                nameServer4={nameServer4}
            />
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
                            {t.admin.changeNameserversTitle}
                            <p className="text-15 font-medium text-secondary mt-1">
                                {t.admin.chooseNameserversDescription}
                            </p>
                        </h2>
                    </div>

                    <div className='flex flex-col gap-2 w-full'>
                        <label className={`flex gap-2 ${selectedPlan === 1 ? 'selected' : ''}`} >
                            <div className="mt-1">
                                <input type="radio" name="plan" checked={selectedPlan === 1} onChange={() => setSelectedPlan(1)} className="sr-only" />

                                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors duration-200 ${selectedPlan === 1 ? 'border-tealdark bg-tealdark' : 'border-gray-400'}`} >
                                    {selectedPlan === 1 && (
                                        <div className="w-1.5 h-1.5 bg-white dark:bg-gray-800 rounded-full"></div>
                                    )}
                                </div>
                            </div>
                            <p className="font-medium text-13 text-primary dark:text-gray-300">{t.admin.useNameWordNameservers}</p>
                        </label>
                        <label className={`flex gap-2 ${selectedPlan === 2 ? 'selected' : ''}`} >
                            <div className="mt-1">
                                <input type="radio" name="plan" checked={selectedPlan === 2} onChange={() => setSelectedPlan(2)} className="sr-only" />

                                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors duration-200 ${selectedPlan === 2 ? 'border-tealdark bg-tealdark' : 'border-gray-400'}`} >
                                    {selectedPlan === 2 && (
                                        <div className="w-1.5 h-1.5 bg-white dark:bg-gray-800 rounded-full"></div>
                                    )}
                                </div>
                            </div>
                            <p className="font-medium text-13 text-primary dark:text-gray-300">{t.admin.useDifferentNameservers}</p>
                        </label>
                    </div>

                    {selectedPlan === 2 && (
                        <div className="mt-2.5 flex flex-col gap-2.5">
                            <div className="relative w-full">
                                <input type="text" className="input-field admin-form peer w-full" id="nameServer1" value={nameServer1} onChange={e => setNameServer1(e.target.value)} />
                                <label htmlFor="nameServer1" className={`absolute left-5 transition-all font-medium ${nameServer1 ? 'top-2 text-xs text-gray-600' : 'top-4 text-13 text-primary dark:text-gray-500 '} peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}>
                                    {t.admin.nameserver1}
                                </label>
                            </div>

                            <div className="relative w-full">
                                <input type="text" className="input-field admin-form peer w-full" id="nameServer2" value={nameServer2} onChange={e => setNameServer2(e.target.value)} />
                                <label htmlFor="nameServer2" className={`absolute left-5 transition-all font-medium ${nameServer2 ? 'top-2 text-xs text-gray-600' : 'top-4 text-13 text-primary dark:text-gray-500 '} peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}>
                                    {t.admin.nameserver2}
                                </label>
                            </div>

                            <div className="relative w-full">
                                <input type="text" className="input-field admin-form peer w-full" id="nameServer3" value={nameServer3} onChange={e => setNameServer3(e.target.value)} />
                                <label htmlFor="nameServer3" className={`absolute left-5 transition-all font-medium ${nameServer3 ? 'top-2 text-xs text-gray-600' : 'top-4 text-13 text-primary dark:text-gray-500 '} peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}>
                                    {t.admin.nameserver3}
                                </label>
                            </div>

                            <div className="relative w-full">
                                <input type="text" className="input-field admin-form peer w-full" id="nameServer4" value={nameServer4} onChange={e => setNameServer4(e.target.value)} />
                                <label htmlFor="nameServer4" className={`absolute left-5 transition-all font-medium ${nameServer4 ? 'top-2 text-xs text-gray-600' : 'top-4 text-13 text-primary dark:text-gray-500 '} peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}>
                                    {t.admin.nameserver4}
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Confirm Button */}
                    <div className="mt-5 flex justify-end gap-2 admin-btn">
                        <button
                            className={`add-to-cart ${selectedPlan === 2 && (!nameServer1 || !nameServer2) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            onClick={handleContinue}
                            disabled={selectedPlan === 2 && (!nameServer1 || !nameServer2)}
                        >
                            {t.admin.continue}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

ChangeNameServer.propTypes = {
    onClose: PropTypes.func.isRequired,
    selectedDomains: PropTypes.array,
};

export default ChangeNameServer