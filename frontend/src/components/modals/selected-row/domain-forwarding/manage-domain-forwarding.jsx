import { IoClose } from "react-icons/io5";
import { useState } from "react";
import AddDomainForwarding from "./add-domain-forwarding";
import { useLanguage } from "../../../../hooks/useLanguage";

const ManageDomainForwarding = ({ onClose, selectedDomains = [] }) => {
    const { t } = useLanguage();
    const [selectedPlan, setSelectedPlan] = useState(1);
    const [isOpen, setIsOpen] = useState(false);

    const totalSelected = selectedDomains?.length || 0;
    const hasSelection = totalSelected > 0;

    const openFlow = () => {
        if (hasSelection) {
            setIsOpen(true);
        }
    };

    const handleSuccess = () => {
        setIsOpen(false);
        onClose?.();
    };

    return (
        <div className="fixed inset-0 z-50 bg-white/80 dark:bg-gray-600/80 overflow-auto py-5">
            <div className="flex items-center justify-center w-full h-full">
                <div className="modal-dialog">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-black cursor-pointer">
                        <IoClose className="text-primary dark:text-gray-500" size={30} />
                    </button>

                    <div className="flex flex-col gap-2">
                        <h2 className="modal-title">
                            {t.admin.manageDomainForwarding}
                            <p className="text-15 font-medium text-secondary mt-1">
                                {t.admin.chooseForwardingOptions}
                            </p>
                        </h2>
                        <p className="text-13 text-secondary">
                            {hasSelection
                                ? t.admin.domainsSelected.replace("{count}", totalSelected).replace(/{plural}/g, totalSelected === 1 ? '' : 's')
                                : t.admin.selectAtLeastOneDomain}
                        </p>
                    </div>

                    <div className="flex flex-col gap-2 w-full mt-3">
                        <label className={`flex gap-2 ${selectedPlan === 1 ? "selected" : ""}`}>
                            <div className="mt-1">
                                <input
                                    type="radio"
                                    name="plan"
                                    checked={selectedPlan === 1}
                                    onChange={() => setSelectedPlan(1)}
                                    className="sr-only"
                                />
                                <div
                                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors duration-200 ${selectedPlan === 1 ? "border-tealdark bg-tealdark" : "border-gray-400"
                                        }`}
                                >
                                    {selectedPlan === 1 && <div className="w-1.5 h-1.5 bg-white dark:bg-gray-800 rounded-full"></div>}
                                </div>
                            </div>
                            <p className="font-medium text-13 text-primary dark:text-gray-300">{t.admin.addDomainForwarders}</p>
                        </label>
                        <label className={`flex gap-2 ${selectedPlan === 2 ? "selected" : ""}`}>
                            <div className="mt-1">
                                <input
                                    type="radio"
                                    name="plan"
                                    checked={selectedPlan === 2}
                                    onChange={() => setSelectedPlan(2)}
                                    className="sr-only"
                                />
                                <div
                                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors duration-200 ${selectedPlan === 2 ? "border-tealdark bg-tealdark" : "border-gray-400"
                                        }`}
                                >
                                    {selectedPlan === 2 && <div className="w-1.5 h-1.5 bg-white dark:bg-gray-800 rounded-full"></div>}
                                </div>
                            </div>
                            <p className="font-medium text-13 text-primary dark:text-gray-300">{t.admin.removeDomainForwarders}</p>
                        </label>
                    </div>

                    <div className="mt-5 flex justify-end gap-2 admin-btn">
                        <button
                            className="add-to-cart disabled:opacity-60 disabled:cursor-not-allowed"
                            onClick={openFlow}
                            disabled={!hasSelection}
                        >
                            {t.admin.continue}
                        </button>
                    </div>

                    {isOpen && (
                        <AddDomainForwarding
                            onClose={() => setIsOpen(false)}
                            onFinished={handleSuccess}
                            selectedDomains={selectedDomains}
                            mode={selectedPlan === 1 ? "add" : "remove"}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default ManageDomainForwarding;
