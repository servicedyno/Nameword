import { useState } from "react";
import LogoutFromAllDevice from "../../../modals/logout-from-all-device";
import ChangePassword from "../../../modals/change-password";
import { useAuth } from "../../../../hooks/useAuth";
import { useLanguage } from "../../../../hooks/useLanguage";

const Concerns = ({ logoutAllUserSessions, data }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isPasswordOpen, setIsPasswordOpen] = useState(false);
    const { user } = useAuth();
    const { t } = useLanguage();

    return (
        <div className="py-7 px-5 space-y-3">
            <div className="flex items-center gap-2 info-detail w-full">
                <span className="text-secondary">
                    {t.admin.signOutFromAnyDevice}
                </span>
            </div>

            <div className="flex gap-2 justify-start flex-wrap">
                {data?.length > 1 && <button className="btn-outline small" onClick={() => setIsOpen(true)}>{t.admin.logoutFromAllDevices}</button>}
                {user?.hasPassword && <button type="button" className="btn-outline small" onClick={() => setIsPasswordOpen(true)}>{t.admin.changePassword}</button>}
            </div>

            {/* Modal */}
            {isOpen && (
                <LogoutFromAllDevice onClose={() => setIsOpen(false)} handleLogoutALL={logoutAllUserSessions} />
            )}
            {isPasswordOpen && (
                <ChangePassword onClose={() => setIsPasswordOpen(false)} />
            )}

        </div>
    )
}

export default Concerns