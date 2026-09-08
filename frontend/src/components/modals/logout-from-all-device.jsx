import { IoClose } from "react-icons/io5";
import { useLanguage } from "../../hooks/useLanguage";

const LogoutFromAllDevice = ({ onClose, handleLogoutALL }) => {
    const { t } = useLanguage();

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
                            {t.admin.timeToProtectAccount}
                            <p className="text-15 font-medium text-secondary mt-1">
                                {t.admin.logoutFromAllDevicesDescription}
                            </p>
                        </h2>
                    </div>

                    {/* Confirm Button */}
                    <div className="mt-5 flex justify-end admin-btn">
                        <button className="add-to-cart" type="button" onClick={() => handleLogoutALL(onClose)} >
                            {t.admin.logoutFromAllDevices}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default LogoutFromAllDevice