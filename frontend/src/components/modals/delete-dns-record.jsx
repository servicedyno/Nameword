import { IoClose } from "react-icons/io5";
import { useState } from "react";
import Loader from "../common/Loader";
import { useLanguage } from "../../hooks/useLanguage";

const DeleteDNSRecord = ({ onClose, record, onDelete }) => {
    const { t } = useLanguage();
    const [loading, setLoading] = useState(false);

    const handleDelete = async () => {
        setLoading(true);
        try {
            await onDelete(record);
            onClose();
        } catch (error) {
            console.error("Error deleting DNS record:", error);
        } finally {
            setLoading(false);
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
                            {t.admin.deleteDnsRecord}
                            <p className="text-15 font-medium text-secondary mt-1">
                                {t.admin.deleteDnsRecordDescription.replace("{type}", record?.type || "")}
                            </p>
                        </h2>
                    </div>

                    {/* Confirm Button */}
                    <div className="mt-5 flex justify-end gap-2 admin-btn">
                        <button className="btn-outline border-dark" onClick={onClose}>
                            {t.admin.cancel}
                        </button>
                        <button className="add-to-cart !bg-warning hover:!bg-red-600" onClick={handleDelete}>
                            {t.admin.yesDelete}
                        </button>
                    </div>
                </div>
            </div>
            {loading && <Loader />}
        </div>
    )
}

export default DeleteDNSRecord

