import { IoCheckmarkOutline, IoClose } from "react-icons/io5";
import { google, telegram } from "../../../common/icons";
import { useAuth } from "../../../../hooks/useAuth";
import { useSearchMessages } from "../../../../hooks/useSearchMessages";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import Loader from "../../../common/Loader";
import { useAlert } from "../../../../context/AlertContext";
import { useLanguage } from "../../../../hooks/useLanguage";
import LinkTelegramButton from "../../../common/LinkTelegramButton";


const SocialLogins = () => {
    const { t } = useLanguage();
    const { user, unlinkGoogleAccount, unlinkTelegramAccount } = useAuth();
    const params = useSearchMessages();
    const navigate = useNavigate();
    const { showAlert } = useAlert();

    const [loading,setLoading] = useState(false);

    const handleGoogleLink = () => {
        window.location.href = `${import.meta.env.VITE_API_BASE_URL}/auth/google/link`
    };

    useEffect(() => {
        if (params.hasSuccess) {
            showAlert(params.successMessage, { duration: 2500, type: 'success' });
            navigate("/account-setting", { replace: true });
        } else if (params.hasError) {
            showAlert(params.errorMessage, { duration: 2500, type: 'warning' });
            navigate("/account-setting", { replace: true });
        }
    }, [params.hasSuccess, params.hasError, params.successMessage, params.errorMessage, navigate])

    const handleUnlinkGoogleAccount = async() => {
        setLoading(true);
        const result = await unlinkGoogleAccount();
        if(result?.success){
            showAlert(result?.message, { duration: 2500, type: 'success' });
        }else{
            showAlert(result?.error || t.admin.failedToUnlinkGoogle, { duration: 2500, type: 'warning' });
        }
        setLoading(false);
    }

    const handleUnlinkTelegramAccount = async() => {
        setLoading(true);
        const result = await unlinkTelegramAccount();
        if(result?.success){
            showAlert(result?.message, { duration: 2500, type: 'success' });
        }else{
            showAlert(result?.error || t.admin.failedToUnlinkTelegram, { duration: 2500, type: 'warning' });
        }
        setLoading(false);
    }

    return (
        <div className="py-7 px-5 space-y-4">

            <div className="flex items-center gap-8 flex-wrap">
                <div className="font-medium text-13 text-primary dark:text-gray-300 min-w-1/6 flex items-center gap-2">
                    <img src={google} alt="Google" title="Google" /> {t.admin.google}
                </div>
                <div className="flex items-center gap-5 flex-wrap">
                    {user?.googleId ?
                        <>
                            <p className='text-13 text-sucess-400 font-medium flex items-center gap-2 min-w-1/12'>
                                <IoCheckmarkOutline size={14} /> {t.admin.enabled}
                            </p>
                            <button className="btn-outline unlink-btn small" type="button" onClick={handleUnlinkGoogleAccount} >{t.admin.unlinkGoogle}</button>
                        </> : <>
                            <p className='text-13 text-warning font-medium flex items-center gap-2 min-w-1/12'>
                                <IoClose size={14} /> {t.admin.disabled}</p>
                            <button className="btn-outline small" type="button" onClick={handleGoogleLink} >{t.admin.linkGoogle}</button>
                        </>
                    }
                </div>
            </div>
            <div className="flex items-center gap-8 flex-wrap">
                <div className="font-medium text-13 text-secondary min-w-1/6 flex items-center gap-2">
                    <img src={telegram} alt="Telegram" title="Telegram" /> {t.admin.telegram}
                </div>
                <div className="flex items-center gap-5 flex-wrap">
                    {user?.telegramId ? (
                        <>
                            <p className='text-13 text-sucess-400 font-medium flex items-center gap-2 min-w-1/12'>
                                <IoCheckmarkOutline size={14} /> {t.admin.enabled}
                            </p>
                            <button className="btn-outline unlink-btn small" type="button" onClick={handleUnlinkTelegramAccount} disabled={loading}>{t.admin.unlinkTelegram}</button>
                        </>
                    ) : (
                        <>
                            <p className='text-13 text-warning font-medium flex items-center gap-2 min-w-1/12'>
                                <IoClose size={14} /> {t.admin.disabled}</p>
                            <LinkTelegramButton loading={loading} setLoading={setLoading} />
                        </>
                    )}
                </div>
            </div>
            {loading && <Loader />}
        </div>
    )
}

export default SocialLogins