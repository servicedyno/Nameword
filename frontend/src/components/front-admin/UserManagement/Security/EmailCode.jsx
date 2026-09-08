import { IoCheckmarkOutline, IoClose } from "react-icons/io5";
import { MdOutlineMail } from "react-icons/md";
import { useAuth } from "../../../../hooks/useAuth";
import { useState } from "react";
import Loader from "../../../common/Loader";
import { useAlert } from "../../../../context/AlertContext";
import { useLanguage } from "../../../../hooks/useLanguage";

const EmailCode = () => {
  const { t } = useLanguage();
  const { user, accountDetailUpdate } = useAuth();
  const [loading, setLoading] = useState(false);
  const { showAlert } = useAlert();

  const handleEmailAuthenticationToggle = async () => {
    setLoading(true);

    const result = await accountDetailUpdate({
      notifyEmail: !user?.notifyEmail,
    });

    if (result?.success) {
      showAlert(
        !user?.notifyEmail
          ? t.admin.emailAuthenticationEnabled
          : t.admin.emailAuthenticationDisabled,
        { duration: 2500, type: "success" }
      );
    } else {
      showAlert(result?.error || t.admin.failedToUpdateEmailAuthentication, {
        duration: 2500,
        type: "warning",
      });
    }
    setLoading(false);
  };

  return (
    <div className="py-7 px-5 space-y-4">
      <div className="flex items-center gap-2 info-detail w-full">
        <span className="text-secondary">
          {t.admin.emailAuthenticationDescription.replace('{email}', user?.email || '')}
        </span>
      </div>

      <div className="flex items-center gap-5 flex-wrap">
        <div className="font-medium text-13 text-secondary min-w-1/6 flex items-center gap-2">
          <MdOutlineMail size={18} className="text-black dark:text-white" />{" "}
          {t.admin.emailLabel}
        </div>
        {user?.notifyEmail ? (
          <>
            <p className="text-13 text-sucess-400 font-medium flex items-center gap-2 min-w-1/12">
              <IoCheckmarkOutline size={14} /> {t.admin.enabled}
            </p>
            <button
              className={`btn-outline unlink-btn small disabled:!cursor-not-allowed`}
              type="button"
              onClick={handleEmailAuthenticationToggle}
              disabled={loading}
            >
              {t.admin.disable}
            </button>
          </>
        ) : (
          <>
            <p className="text-13 text-warning font-medium flex items-center gap-2 min-w-1/12">
              <IoClose size={14} /> {t.admin.disabled}
            </p>
            <button
              className={`btn-outline small disabled:!cursor-not-allowed`}
              type="button"
              onClick={handleEmailAuthenticationToggle}
              disabled={loading}
            >
              {t.admin.enable}
            </button>
          </>
        )}
      </div>
      {loading && <Loader />}
    </div>
  );
};

export default EmailCode;
