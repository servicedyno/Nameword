import { IoClose } from "react-icons/io5";
import { useState } from "react";
import { IoIosArrowBack } from "react-icons/io";
import { NavLink } from "react-router";
import TransferCompleteModal from './transfer-complete-modal';
import { useLanguage } from "../../hooks/useLanguage";

const AboutTransferModal = ({ onClose }) => {
    const { t } = useLanguage();
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
                    <NavLink to={'/dashboard'} className={'right-link !text-darkbtn dark:!text-gray-500 mb-2'} >
                        <IoIosArrowBack /> {t.admin.back}
                    </NavLink>
                    {t.admin.importantInformationAboutTransfer}
                </h2>

                <div className="text-13 font-medium text-primary dark:text-white">
                    <ul className="list-disc pl-5">
                        <li>{t.admin.transferCompletelyFree}</li>
                        <li>{t.admin.websitesMovedToUSDataCenter}</li>
                        <li>{t.admin.hostingPlanIpAddressWillChange}</li>
                        <li>{t.admin.changesDuringTransferNotSaved}</li>
                        <li>{t.admin.transferMayTakeUpTo12Hours}</li>
                        <li>{t.admin.hostingAccountTemporarilyLocked}</li>
                    </ul>
                </div>

                {/* Confirm Button */}
                <div className="mt-5 flex items-center admin-btn gap-2 justify-end">
                    <button onClick={() => setIsOpen(true)} className="add-to-cart" >
                        {t.admin.start}
                    </button>
                </div>
            </div>

            {/* Modal */}
            {isOpen && (
                <TransferCompleteModal onClose={() => setIsOpen(false)} />
            )}
        </div>
    )
}

export default AboutTransferModal