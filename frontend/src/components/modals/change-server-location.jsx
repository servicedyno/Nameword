import { IoClose, IoChevronDown } from "react-icons/io5";
import { PiWarningBold } from "react-icons/pi";
import { useState } from "react";
import AboutTransferModal from './about-transfer-modal';
import { useLanguage } from "../../hooks/useLanguage";

const ChangeServerLocation = ({ onClose }) => {
    const { t } = useLanguage();
    const [selected, setSelected] = useState(t.admin.northAmericaRecommended);
    const [open, setOpen] = useState(false);
    const terms = [
        t.admin.northAmericaRecommended
    ];
    // Modal click
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-600/80">
            <div className="modal-dialog">
                {/* Close Button */}
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-black">
                    <IoClose className='text-primary dark:text-gray-500' size={30} />
                </button>

                {/* Modal Title */}
                <h2 className="modal-title">
                    {t.admin.changeYourServerLocation}
                    <p className="text-13 font-medium text-secondary dark:text-white mt-1">{t.admin.chooseServerLocationToTransfer}</p>
                </h2>

                <div className="relative w-full mb-2.5">
                    <div onClick={() => setOpen(!open)} className="term-select" >
                        <p className="text-xs text-secondary font-medium">{t.admin.serverLocation}</p>
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-primary dark:text-gray-400">{selected}</span>
                            <IoChevronDown className="absolute top-1/2 transform -translate-y-1/2 right-4 w-4 h-4 text-primary dark:text-gray-400" />
                        </div>
                    </div>

                    {/* Dropdown items */}
                    {open && (
                        <div className="dropdown-select">
                            {terms.map((term) => (
                                <div
                                    key={term}
                                    onClick={() => {
                                        setSelected(term);
                                        setOpen(false);
                                    }}
                                    className={`px-4 py-2 cursor-pointer hover:bg-slatelight dark:hover:bg-gray-800 text-sm font-medium text-primary dark:text-gray-400 ${selected === term ? "bg-slatelight dark:bg-gray-900 font-medium" : ""
                                        }`}
                                >
                                    {term}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className='flex items-center justify-between gap-2 px-4 py-2.5 rounded-md border border-stokecolor dark:border-gray-700 mb-3 bg-mutebg dark:bg-gray-800'>
                    <div className='flex items-center gap-2.5 text-secondary'>
                        <PiWarningBold />
                        <span className="text-xs font-medium">
                            {t.admin.oneServerTransferIn30Days || "You can initiate one server transfer in 30 days."}
                        </span>
                    </div>
                </div>

                {/* Confirm Button */}
                <div className="mt-5 flex items-center admin-btn gap-2 justify-end">
                    <button onClick={() => setIsOpen(true)} className="add-to-cart" >
                        {t.admin.next || "Next"}
                    </button>
                </div>
            </div>

            {/* Modal */}
            {isOpen && (
                <AboutTransferModal onClose={() => setIsOpen(false)} />
            )}
        </div>
    )
}

export default ChangeServerLocation