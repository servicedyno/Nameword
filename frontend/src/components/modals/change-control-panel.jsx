import { IoClose } from "react-icons/io5";
import { useLanguage } from "../../hooks/useLanguage";

const ChangeControlPanel = ({ onClose }) => {
    const { t } = useLanguage();
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-600/80">
            <div className="modal-dialog">
                {/* Close Button */}
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-black">
                    <IoClose className='text-primary dark:text-gray-500' size={30} />
                </button>

                {/* Modal Title */}
                <h2 className="modal-title">{t.admin.confirmChangingControlPanel}</h2>

                <p className="text-13 font-medium text-primary dark:text-white">{t.admin.switchControlPanelToPlesk}</p>

                {/* Confirm Button */}
                <div className="mt-5 flex items-center admin-btn gap-2 justify-end">
                    <button onClick={onClose} className="btn-outline border-dark" >
                        {t.admin.cancel}
                    </button>
                    <button className="add-to-cart" >
                        {t.admin.yes}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ChangeControlPanel