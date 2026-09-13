import { useState } from "react";
import { useNavigate } from "react-router";
import { LuMail, LuX } from "react-icons/lu";
import { useAuth } from "../../hooks/useAuth";
import { useAlert } from "../../context/AlertContext";
import { useLanguage } from "../../hooks/useLanguage";

// App-wide "confirm your email" reminder for the SOFT-GATE onboarding.
// Sign-up logs the user in immediately; this slim bar keeps nudging them to
// verify until `user.isProfileVerified` flips true. Dismissible per tab session.
const DISMISS_KEY = "nw_verify_banner_dismissed";

const VerifyEmailBanner = () => {
  const { user, sendEmailCode, resendLoading } = useAuth();
  const { showAlert } = useAlert();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(DISMISS_KEY) === "1"
  );

  // Only show for a signed-in, still-unverified user.
  if (!user || user.isProfileVerified || dismissed) return null;

  const a = t?.auth || {};

  const handleResend = async () => {
    try {
      const data = await sendEmailCode(user.email);
      showAlert(
        data?.message || a.verifyEmailSent || "Verification email sent. Check your inbox.",
        { type: "success", duration: 2800 }
      );
    } catch {
      showAlert(
        a.verifyEmailFailed || "Could not send the email right now. Please try again.",
        { type: "error", duration: 3000 }
      );
    }
  };

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <div
      data-testid="verify-email-banner"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200 lg:px-6"
    >
      <LuMail className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="min-w-0 flex-1">
        <span className="text-13 font-semibold">
          {a.verifyBannerTitle || "Confirm your email address"}
        </span>
        <span className="ml-1.5 hidden text-13 text-amber-800/90 dark:text-amber-200/80 sm:inline">
          {a.verifyBannerText ||
            "Verify your email to secure your account and unlock everything."}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate("/otp-code")}
          data-testid="verify-banner-enter-code"
          className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-700"
        >
          {a.verifyEnterCode || "Enter code"}
        </button>
        <button
          type="button"
          onClick={handleResend}
          disabled={resendLoading}
          data-testid="verify-banner-resend"
          className="rounded-lg border border-amber-300 bg-white/70 px-3 py-1.5 text-xs font-semibold text-amber-800 transition-colors hover:bg-white disabled:opacity-60 dark:border-amber-400/30 dark:bg-transparent dark:text-amber-200"
        >
          {resendLoading ? "…" : a.verifyResend || "Resend email"}
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          data-testid="verify-banner-dismiss"
          className="rounded-lg p-1.5 text-amber-700 transition-colors hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-400/10"
        >
          <LuX className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default VerifyEmailBanner;
