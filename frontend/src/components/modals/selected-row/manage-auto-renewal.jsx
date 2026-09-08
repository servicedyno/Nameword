import { IoClose } from "react-icons/io5";
import { useState } from "react";
import { PiWarningBold } from "react-icons/pi";
import TurnOffAutoRenewal from "./turn-off-auto-renewal";
import ConfirmChoice from "./confirm-choice";
import { useLanguage } from "../../../hooks/useLanguage";

const ManageAutoRenewal = ({ onClose, selectedDomains = [] }) => {
    const { t } = useLanguage();
    const [selectedAction, setSelectedAction] = useState(null); // 1 = turn on, 2 = turn off
    const [currentStep, setCurrentStep] = useState(1); // 1 = select action, 2 = reason (if turning off), 3 = confirm
    const [turnOffReason, setTurnOffReason] = useState({ reason: '', description: '' });

    const handleContinue = () => {
        if (selectedAction === 1) {
            // Turn on - go directly to confirm
            setCurrentStep(3);
        } else if (selectedAction === 2) {
            // Turn off - go to reason step
            setCurrentStep(2);
        }
    };

    const handleTurnOffContinue = (reasonData) => {
        setTurnOffReason(reasonData);
        setCurrentStep(3);
    };

    const handleBack = () => {
        if (currentStep === 3) {
            if (selectedAction === 2) {
                setCurrentStep(2);
            } else {
                setCurrentStep(1);
            }
        } else if (currentStep === 2) {
            setCurrentStep(1);
        }
    };

    if (currentStep === 2) {
        return (
            <TurnOffAutoRenewal
                onClose={onClose}
                onBack={handleBack}
                onContinue={handleTurnOffContinue}
            />
        );
    }

    if (currentStep === 3) {
        return (
            <ConfirmChoice
                onClose={onClose}
                onBack={handleBack}
                selectedDomains={selectedDomains}
                action={selectedAction === 1 ? 'enable' : 'disable'}
                turnOffReason={turnOffReason}
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
                            {t.admin.manageAutoRenewal}
                            <p className="text-15 font-medium text-secondary mt-1">
                                {t.admin.chooseAutoRenewalOptions.replace("{count}", selectedDomains.length).replace(/{plural}/g, selectedDomains.length === 1 ? '' : 's')}
                            </p>
                        </h2>
                    </div>

                    <div className='flex flex-col gap-2 w-full mt-4'>
                        <label className={`flex gap-2 cursor-pointer ${selectedAction === 1 ? 'selected' : ''}`} >
                            <div className="mt-1">
                                <input
                                    type="radio"
                                    name="action"
                                    checked={selectedAction === 1}
                                    onChange={() => setSelectedAction(1)}
                                    className="sr-only"
                                />
                                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors duration-200 ${selectedAction === 1 ? 'border-tealdark bg-tealdark' : 'border-gray-400'}`} >
                                    {selectedAction === 1 && (
                                        <div className="w-1.5 h-1.5 bg-white dark:bg-gray-800 rounded-full"></div>
                                    )}
                                </div>
                            </div>
                            <p className="font-medium text-13 text-primary dark:text-gray-300">{t.admin.turnOnAutoRenewal}</p>
                        </label>
                        <label className={`flex gap-2 cursor-pointer ${selectedAction === 2 ? 'selected' : ''}`} >
                            <div className="mt-1">
                                <input
                                    type="radio"
                                    name="action"
                                    checked={selectedAction === 2}
                                    onChange={() => setSelectedAction(2)}
                                    className="sr-only"
                                />
                                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors duration-200 ${selectedAction === 2 ? 'border-tealdark bg-tealdark' : 'border-gray-400'}`} >
                                    {selectedAction === 2 && (
                                        <div className="w-1.5 h-1.5 bg-white dark:bg-gray-800 rounded-full"></div>
                                    )}
                                </div>
                            </div>
                            <p className="font-medium text-13 text-primary dark:text-gray-300">{t.admin.turnOffAutoRenewal}</p>
                        </label>
                    </div>

                    {selectedAction === 2 && (
                        <div className='flex items-center justify-start gap-2 px-4 py-2.5 rounded-md border border-stokecolor dark:border-gray-700 bg-mutebg dark:bg-gray-700 text-secondary mt-2.5'>
                            <PiWarningBold />
                            <span className="text-xs font-medium">
                                {t.admin.turningOffAutoRenewalWarning}
                            </span>
                        </div>
                    )}

                    {/* Continue Button */}
                    <div className="mt-5 flex justify-end gap-2 admin-btn">
                        <button
                            className={`add-to-cart ${!selectedAction ? 'opacity-50 cursor-not-allowed' : ''}`}
                            onClick={handleContinue}
                            disabled={!selectedAction}
                        >
                            {t.admin.continue}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ManageAutoRenewal