import { IoClose } from "react-icons/io5";
import { useState } from "react";
import { IoIosArrowDown, IoIosArrowBack } from "react-icons/io";
import { useLanguage } from "../../../hooks/useLanguage";

const TurnOffAutoRenewal = ({ onClose, onBack, onContinue }) => {
    const { t } = useLanguage();

    const reasonOptions = [
        t.admin.autoRenewalReasonManual,
        t.admin.autoRenewalReasonNoLongerNeed,
        t.admin.autoRenewalReasonPriceTooHigh,
        t.admin.autoRenewalReasonBetterAlternative,
        t.admin.autoRenewalReasonOther
    ];

    const [reason, setReason] = useState(reasonOptions[0]);
    const [description, setDescription] = useState('');

    const handleContinue = () => {
        if (onContinue) {
            onContinue({ reason, description });
        }
    };

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
                            {t.admin.turnOffAutoRenewalTitle}
                            <p className="text-15 font-medium text-secondary mt-1">
                                {t.admin.turnOffAutoRenewalDescription}
                            </p>
                        </h2>
                    </div>

                    <div className="relative mt-2.5">
                        <select
                            className="input-field admin-form peer"
                            id="reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        >
                            {reasonOptions.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                        <IoIosArrowDown size={15} className="absolute top-1/2 transform -translate-y-1/2 right-4 text-primary dark:text-white pointer-events-none" />

                        <label htmlFor="reason" className={`absolute left-5 transition-all font-medium ${reason ? 'top-2 text-xs text-gray-600' : 'top-4 text-13 text-primary dark:text-gray-500 '} peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}>
                            {t.admin.selectReason}
                        </label>
                    </div>

                    <div className="mt-2.5 relative">
                        <textarea
                            name="desc"
                            id="desc"
                            className="input-field admin-form peer resize-none"
                            rows={4}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        ></textarea>
                        <label htmlFor="desc" className={`absolute left-5 transition-all font-medium ${description ? 'top-2 text-xs text-gray-600' : 'top-4 text-13 text-primary dark:text-gray-500 '} peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}>
                            {t.admin.tellUsMore}
                        </label>
                    </div>

                    {/* Continue Button */}
                    <div className="mt-5 flex justify-end gap-2 admin-btn">
                        <button
                            className={`add-to-cart ${!reason ? 'opacity-50 cursor-not-allowed' : ''}`}
                            onClick={handleContinue}
                            disabled={!reason}
                        >
                            {t.admin.continue}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default TurnOffAutoRenewal