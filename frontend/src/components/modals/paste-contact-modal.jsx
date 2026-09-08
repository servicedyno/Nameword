import { IoClose } from "react-icons/io5";
import { useLanguage } from "../../hooks/useLanguage";

const PasteContactModal = ({ onClose, onPaste, isPasting = false }) => {
    const { t } = useLanguage();   
    const handlePaste = async () => {
        if (onPaste && !isPasting) {
            await onPaste();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-600/80">
            <div className="modal-dialog">
                {/* Close Button */}
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-black">
                    <IoClose className='text-primary dark:text-gray-500' size={30} />
                </button>

                {/* Modal Title */}
                <h2 className="modal-title">{t.admin.pasteTheContact}</h2>

                {/* Confirm Button */}
                <div className="mt-5 flex items-center admin-btn gap-2 justify-end">
                    <button onClick={onClose} className="btn-outline border-dark" disabled={isPasting}>
                        {t.admin.cancel}
                    </button>
                    <button onClick={handlePaste} className="add-to-cart" disabled={isPasting}>
                        {isPasting ? t.admin.pasting : t.admin.paste}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default PasteContactModal