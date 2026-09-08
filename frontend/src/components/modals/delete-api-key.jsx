import { IoClose } from "react-icons/io5";
import { useApiKeys } from "../../hooks/useApiKeys";
import { useState } from "react";
import Loader from "../common/Loader";
import { useLanguage } from "../../hooks/useLanguage";

const DeleteApiKey = ({ onClose, id }) => {
    const { t } = useLanguage();
    const [loading, setLoading] = useState(false);

    const { deleteApiKey } = useApiKeys();

    const handleDeleteApiKey =async () => {
        setLoading(true);
        const result = await deleteApiKey(id);

        if(result.success){
            onClose();
        }
        setLoading(false);
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
                            {t.admin.deleteApiKey}
                            <p className="text-15 font-medium text-secondary mt-1">
                                {t.admin.deleteApiKeyDescription}
                            </p>
                        </h2>
                    </div>

                    {/* Confirm Button */}
                    <div className="mt-5 flex justify-end gap-2 admin-btn">
                        <button className="btn-outline border-dark" onClick={onClose} >
                            {t.admin.cancel}
                        </button><button className="add-to-cart !bg-warning hover:!bg-red-600" onClick={handleDeleteApiKey}>
                            {t.admin.yesDelete}
                        </button>
                    </div>
                </div>
            </div>
            {loading && <Loader />}
        </div>
    )
}

export default DeleteApiKey