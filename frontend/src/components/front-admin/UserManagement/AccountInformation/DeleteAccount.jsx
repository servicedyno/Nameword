import { useState } from "react";
import DeleteAccountModal from "../../../modals/delete-account-modal";
import { useLanguage } from "../../../../hooks/useLanguage";

const DeleteAccount = () => {
    const { t } = useLanguage();
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <div className="py-7 px-5 space-y-3">
                <div className="flex items-center gap-2 info-detail w-full">
                    <span className="text-secondary">
                        {t.admin.deleteAccountWarning}
                    </span>
                </div>

                <button
                    className="btn-outline small"
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                >
                    {t.admin.deleteAccount}
                </button>
            </div>

            {isModalOpen && (
                <DeleteAccountModal onClose={() => setIsModalOpen(false)} />
            )}
        </>
    );
};

export default DeleteAccount