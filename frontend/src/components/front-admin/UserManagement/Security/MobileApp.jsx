import { useState } from "react";
import { IoCheckmarkOutline, IoClose } from "react-icons/io5";
import { googleAuthenticator } from "../../../common/icons";
import { useAuth } from "../../../../hooks/useAuth";
import Loader from "../../../common/Loader";
import { useAlert } from "../../../../context/AlertContext";
import { useLanguage } from "../../../../hooks/useLanguage";

const MobileApp = () => {
    const { t } = useLanguage();
    const { user, accountDetailUpdate } = useAuth();
    const [loading, setLoading] = useState(false);
    const { showAlert } = useAlert();

    const handle2FAAuthenticationToggle = async () => {
        setLoading(true);

        const result = await accountDetailUpdate({ enabled2FA: !user?.enabled2FA });

        if (result?.success) {
            showAlert(!user?.enabled2FA ? t.admin.twoFactorAuthenticationEnabled : t.admin.twoFactorAuthenticationDisabled, { duration: 2500, type: 'success' });
        } else {
            showAlert(result?.error || t.admin.failedToUpdate2FA, { duration: 2500, type: 'warning' });
        }
        setLoading(false);
    }

    return (
        <div className="py-7 px-5 space-y-4">
            <div className="flex items-center gap-2 info-detail w-full">
                <span className="text-secondary">
                    {t.admin.mobileAppDescription}
                </span>
            </div>

            <div className="flex items-center gap-5 flex-wrap">
                <div className="font-medium text-13 text-secondary min-w-1/6 flex items-center gap-2">
                    <img src={googleAuthenticator} alt="Google Authenticator" title="Google Authenticator" /> {t.admin.googleAuthenticator}
                </div>
                {user?.enabled2FA ? <>
                    <p className='text-13 text-sucess-400 font-medium flex items-center gap-2 min-w-1/12'><IoCheckmarkOutline size={14} /> {t.admin.enabled}</p>
                    <button className={`btn-outline unlink-btn small disabled:!cursor-not-allowed`} type="button" onClick={handle2FAAuthenticationToggle} disabled={loading}>{t.admin.disable}</button>
                </> :
                    <>
                        <p className='text-13 text-warning font-medium flex items-center gap-2 min-w-1/12'>
                            <IoClose size={14} /> {t.admin.disabled}</p>
                        <button className={`btn-outline small disabled:!cursor-not-allowed`} type="button" onClick={handle2FAAuthenticationToggle} disabled={loading} >{t.admin.enable}</button>
                    </>}
            </div>

            {loading && <Loader />}

        </div>
    )
}

export default MobileApp