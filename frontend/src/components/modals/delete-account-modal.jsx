import { IoClose } from "react-icons/io5";
import { useState } from "react";
import Loader from "../common/Loader";
import { useAuth } from "../../hooks/useAuth";
import { useAlert } from "../../context/AlertContext";
import ErrorComponent from "../common/ErrorComponent";
import { useLanguage } from "../../hooks/useLanguage";

const DeleteAccountModal = ({ onClose }) => {
    const { t } = useLanguage();
    const { deleteAccount, clearstorage } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { showAlert } = useAlert();

    const handleDeleteAccount = async () => {
        setError(null);
        setLoading(true);
        try {
            const result = await deleteAccount();
            if (result?.success) {
                showAlert(result?.message, { duration: 2500, type: 'success' });
                clearstorage();
                onClose();
            } else {
                setError(result?.error);
            }
        } catch (err) {
            setError(err?.message || t.admin.failedToDeleteAccount);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-white/80 dark:bg-gray-600/80 overflow-auto py-5">
            <div className="flex items-center justify-center w-full h-full">
                <div className="modal-dialog">
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-500 hover:text-black cursor-pointer"
                        disabled={loading}
                    >
                        <IoClose className='text-primary dark:text-gray-500' size={30} />
                    </button>

                    {/* Modal Title */}
                    <div className="flex flex-col gap-2">
                        <h2 className="modal-title">
                            {t.admin.deleteAccountQuestion}
                            <p className="text-15 font-medium text-secondary mt-1">
                                {t.admin.deleteAccountWarningFull}
                            </p>
                        </h2>
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="mt-4">
                            <ErrorComponent error={error} />
                        </div>
                    )}

                    {/* Confirm Button */}
                    <div className="mt-5 flex justify-end gap-2 admin-btn">
                        <button
                            className="btn-outline border-dark"
                            onClick={onClose}
                            disabled={loading}
                        >
                            {t.admin.cancel}
                        </button>
                        <button
                            className="add-to-cart !bg-warning hover:!bg-red-600"
                            onClick={handleDeleteAccount}
                            disabled={loading}
                        >
                            {loading ? t.admin.deleting : t.admin.yesDeleteAccount}
                        </button>
                    </div>
                </div>
            </div>
            {loading && <Loader />}
        </div>
    );
};

export default DeleteAccountModal;

