import { IoClose } from "react-icons/io5";
import { RiGlobalLine } from "react-icons/ri";
import { useState } from "react";
import { PiWarningBold } from "react-icons/pi";
import { NavLink } from "react-router";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { TbExternalLink, TbCopy } from "react-icons/tb";
import PrivacyConfirmChoice from "./privacy-confirm-choice";
import { useLanguage } from "../../../../hooks/useLanguage";

const ManagePrivacyProtection = ({ onClose }) => {
    const { t } = useLanguage();
    const [selectedPlan, setSelectedPlan] = useState('basic1');

    // Modal click
    const [isOpen, setIsOpen] = useState(false);

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
                            {t.admin.managePrivacyProtection}
                            <p className="text-15 font-medium text-secondary mt-1">
                                {t.admin.choosePrivacyProtectionOptions}
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
                            <p className="font-medium text-13 text-primary dark:text-gray-300">{t.admin.turnOnPrivacyProtection}</p>
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
                            <p className="font-medium text-13 text-primary dark:text-gray-300">{t.admin.turnOffPrivacyProtection}</p>
                        </label>
                    </div>

                    {selectedPlan === 2 && (
                        <div className='flex items-center justify-start gap-2 px-4 py-2.5 rounded-md border border-stokecolor dark:border-gray-700 bg-mutebg dark:bg-gray-700 text-secondary mt-2.5'>
                            <PiWarningBold />
                            <span className="text-xs font-medium">
                                {t.admin.turningOffPrivacyWarning}
                            </span>
                        </div>
                    )}

                    {/* Confirm Button */}
                    <div className="mt-5 flex justify-end gap-2 admin-btn">
                        <button className="add-to-cart" onClick={() => setIsOpen(true)}>
                            {t.admin.continue}
                        </button>
                    </div>

                    {/* Auto-renew Modal */}
                    {isOpen && (
                        <PrivacyConfirmChoice onClose={() => setIsOpen(false)} />
                    )}
                </div>
            </div>
        </div>
    )
}

export default ManagePrivacyProtection