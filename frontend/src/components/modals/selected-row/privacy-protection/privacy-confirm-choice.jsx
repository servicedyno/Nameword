import { IoClose } from "react-icons/io5";
import { RiGlobalLine } from "react-icons/ri";
import { useState } from "react";
import { PiWarningBold } from "react-icons/pi";
import { NavLink } from "react-router";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { TbExternalLink, TbCopy } from "react-icons/tb";
import { IoIosArrowBack } from "react-icons/io";
import { IoCheckmarkOutline } from "react-icons/io5";
import { LuRefreshCw } from "react-icons/lu";
import { useLanguage } from "../../../../hooks/useLanguage";

const PrivacyConfirmChoice = ({ onClose }) => {
    const { t } = useLanguage();
    const [reason, setReason] = useState('');

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
                            <NavLink to={'/dashboard'} className={'right-link !text-darkbtn dark:!text-gray-500 mb-2'} >
                                <IoIosArrowBack /> {t.admin.back}
                            </NavLink>
                            {t.admin.confirmYourChoice}
                        </h2>
                    </div>

                    <div className="space-y-2">
                        <p className="text-13 text-primary dark:text-gray-400 font-medium flex items-center gap-2">
                            <IoCheckmarkOutline size={14} className="text-tealdark" /> {t.admin.domainAlreadyHasPrivacyActionCompleted.replace("{count}", "1").replace(/{plural}/g, "")}
                        </p>

                        <p className="text-13 text-primary dark:text-gray-400 font-semibold flex items-center gap-2">
                            <LuRefreshCw size={14} className="text-darkbtn" /> {t.admin.domainWillBeAffectedPrivacy.replace("{count}", "1").replace(/{plural}/g, "")}
                        </p>
                    </div>

                    {/* Confirm Button */}
                    <div className="mt-5 flex justify-end gap-2 admin-btn">
                        <button className="add-to-cart" onClick={() => setIsOpen(true)}>
                            {t.admin.applyPrivacyProtection}
                        </button>
                    </div>

                    {/* this button show when using ManagePrivacyProtection model continue button click  */}
                    {/* <div className="mt-5 flex justify-end gap-2 admin-btn">
                        <button className="add-to-cart" onClick={() => setIsOpen(true)}>
                            {t.admin.turnOffPrivacyProtectionButton}
                        </button>
                    </div> */}
                </div>
            </div>
        </div>
    )
}

export default PrivacyConfirmChoice