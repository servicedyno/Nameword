import { IoCardOutline, IoClose } from "react-icons/io5";
import { PiWarningBold } from "react-icons/pi";
import { FiCheckCircle, FiLoader } from "react-icons/fi";
import { ErrorMessage, Field, Formik, Form } from "formik";
import * as Yup from "yup";
import formatAmount from "../../utils/formatAmount";
import { useCallback, useEffect, useRef, useState } from "react";
import { walletAPI } from "../../api/walletApi";
import { useAlert } from "../../context/AlertContext";
import Loader from "../common/Loader";
import { useLanguage } from "../../hooks/useLanguage";

const MIN_TOPUP = 25;

const readBalance = (res) => {
  const b = res?.data?.balance;
  return Number(b?.USD ?? b?.default ?? 0);
};

const WalletModal = ({ onClose, onSuccess, presetAmount }) => {
  const { t } = useLanguage();
  const { showAlert } = useAlert();

  const [step, setStep] = useState("amount"); // "amount" | "pay"
  const [embedUrl, setEmbedUrl] = useState("");
  const [amountUsd, setAmountUsd] = useState(0);
  const [credited, setCredited] = useState(false);
  const startBalanceRef = useRef(0);
  const successRef = useRef(false);

  // When opened with a preset (e.g. the exact cart shortfall), start there but
  // never below the provider minimum.
  const initialAmount =
    presetAmount != null && Number(presetAmount) > 0
      ? String(Math.max(MIN_TOPUP, Math.ceil(Number(presetAmount))))
      : "";

  const walletTopUpSchema = Yup.object().shape({
    amount: Yup.number()
      .typeError(t.admin.amountMustBeNumber || "Amount must be a number")
      .positive(t.admin.amountMustBePositive || "Amount must be greater than 0")
      .min(MIN_TOPUP, `Minimum top-up is $${MIN_TOPUP}.`)
      .required(t.admin.amountRequired || "Amount is required"),
  });

  // Snapshot the starting balance so we can detect a credit.
  const snapshotBalance = useCallback(async () => {
    try {
      const res = await walletAPI.getWallet();
      startBalanceRef.current = readBalance(res);
    } catch {
      startBalanceRef.current = 0;
    }
  }, []);

  const markCredited = useCallback(() => {
    if (successRef.current) return;
    successRef.current = true;
    setCredited(true);
    showAlert("Payment received — your wallet has been topped up.", { type: "success", duration: 3000 });
    onSuccess?.();
    setTimeout(() => onClose?.(), 2500);
  }, [onClose, onSuccess, showAlert]);

  const checkBalanceNow = useCallback(async () => {
    if (successRef.current) return;
    try {
      const res = await walletAPI.getWallet();
      const bal = readBalance(res);
      if (bal > startBalanceRef.current + 0.0001) markCredited();
    } catch {
      /* ignore transient errors while polling */
    }
  }, [markCredited]);

  // Poll the wallet balance while the embedded checkout is open.
  useEffect(() => {
    if (step !== "pay") return undefined;
    const id = setInterval(checkBalanceNow, 5000);
    return () => clearInterval(id);
  }, [step, checkBalanceNow]);

  // Best-effort: react to messages posted by the DynoPay checkout iframe.
  useEffect(() => {
    const onMsg = (e) => {
      if (!e?.origin || !String(e.origin).includes("dynopay.com")) return;
      const raw = typeof e.data === "string" ? e.data : JSON.stringify(e.data || "");
      const s = raw.toLowerCase();
      if (s.includes("success") || s.includes("confirmed") || s.includes("paid") || s.includes("complete")) {
        checkBalanceNow();
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [checkBalanceNow]);

  const addFunds = useCallback(
    async (data) => {
      try {
        const result = await walletAPI.getDynoCheckoutUrl(data);
        return { success: true, data: result };
      } catch (err) {
        const errorMsg =
          err?.response?.data?.message ||
          err?.response?.data?.errors?.[0]?.message ||
          err.message ||
          t.admin.failedToAddFundsToWallet;
        showAlert(errorMsg, { type: "error", duration: 2500 });
        return { success: false, error: errorMsg };
      }
    },
    [showAlert, t.admin.failedToAddFundsToWallet]
  );

  const handleFormSubmit = async (values, { setSubmitting }) => {
    setSubmitting(true);
    await snapshotBalance();
    const response = await addFunds({ ...values, frontendEndPoint: "wallet" });
    if (response?.success) {
      const url = response?.data?.checkoutUrl || response?.data?.redirect_url;
      if (url) {
        setAmountUsd(Number(values.amount) || 0);
        setEmbedUrl(url);
        setStep("pay");
      } else {
        showAlert("Could not start the checkout. Please try again.", { type: "error", duration: 2500 });
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-white/80 dark:bg-gray-600/80 overflow-auto py-5">
      <div className="flex items-center justify-center w-full min-h-full">
        <div
          className={`modal-dialog ${step === "pay" ? "!max-w-[520px] w-full" : ""}`}
        >
          {/* Close Button */}
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-black z-10" aria-label="Close">
            <IoClose className="text-primary dark:text-gray-500" size={30} />
          </button>

          {step === "amount" && (
            <>
              <div className="flex flex-col gap-2">
                <h2 className="modal-title">
                  {t.admin.topUpWallet}
                  <p className="text-15 font-medium text-secondary mt-1">{t.admin.addMoneyToWallet}</p>
                </h2>
              </div>

              <Formik
                enableReinitialize
                initialValues={{ amount: initialAmount }}
                validationSchema={walletTopUpSchema}
                onSubmit={handleFormSubmit}
              >
                {({ values, errors, touched, handleChange, handleBlur, isValid, dirty, isSubmitting }) => (
                  <Form>
                    <div className={`relative w-full ${errors.amount && touched.amount ? "input-error" : ""}`}>
                      <Field
                        type="text"
                        id="amount"
                        name="amount"
                        className={`input-field peer w-full ${errors.amount && touched.amount ? "border-red-500 dark:border-red-400" : "admin-form "} disabled:cursor-not-allowed`}
                        value={values.amount}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                      <label
                        htmlFor="amount"
                        className={`absolute left-5 transition-all font-medium ${
                          values.amount ? "top-2 text-xs text-gray-600" : "top-4 text-13 text-primary dark:text-gray-500"
                        } peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}
                      >
                        {t.admin.amount}
                      </label>
                      <ErrorMessage name="amount" component="p" className="text-warning pl-5 text-xs font-medium mt-1" />
                    </div>
                    <div className="flex items-center justify-between gap-2 px-4 py-2.5 rounded-md border border-stokecolor dark:border-gray-700 mb-3 bg-mutebg dark:bg-gray-800 mt-2.5">
                      <div className="flex items-center gap-2.5 text-secondary">
                        <PiWarningBold />
                        <span className="text-xs font-medium">
                          Pay securely with crypto — checkout opens right here. Minimum ${MIN_TOPUP}.
                        </span>
                      </div>
                    </div>

                    {/* Confirm Button */}
                    <div className="mt-5 flex justify-end admin-btn">
                      <button type="submit" className={`${!(isValid && dirty) ? "disable" : ""} add-to-cart`} disabled={!(isValid && dirty)}>
                        <IoCardOutline className="text-white text-base" />
                        <span>{t.admin.addAmount.replace("${amount}", formatAmount(isValid ? values.amount || 0 : 0))}</span>
                      </button>
                    </div>
                    {isSubmitting && <Loader />}
                  </Form>
                )}
              </Formik>
            </>
          )}

          {step === "pay" && (
            <div className="flex flex-col">
              <div className="flex flex-col gap-1 pr-8">
                <h2 className="modal-title">
                  {credited ? "Payment received" : "Complete your payment"}
                  <p className="text-15 font-medium text-secondary mt-1">
                    Adding ${Number(amountUsd).toFixed(2)} to your wallet
                  </p>
                </h2>
              </div>

              {credited ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                  <FiCheckCircle className="text-tealdark" size={56} />
                  <p className="text-lg font-semibold text-primary dark:text-white">
                    ${Number(amountUsd).toFixed(2)} added to your wallet
                  </p>
                  <p className="text-sm text-secondary">You can close this window.</p>
                </div>
              ) : (
                <>
                  <div className="mt-3 rounded-xl overflow-hidden border border-stokecolor dark:border-gray-700 bg-white">
                    <iframe
                      title="DynoPay Checkout"
                      src={embedUrl}
                      className="w-full h-[560px] max-h-[70vh]"
                      allow="clipboard-read; clipboard-write; payment"
                    />
                  </div>

                  <div className="flex items-center gap-2 text-secondary mt-3 text-xs font-medium">
                    <FiLoader className="animate-spin" />
                    <span>Waiting for payment confirmation… crypto confirms on-chain, so this can take a few minutes.</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-4">
                    <button type="button" onClick={checkBalanceNow} className="btn-outline max-w-max text-sm">
                      I&apos;ve paid — refresh
                    </button>
                    <button type="button" onClick={onClose} className="add-to-cart max-w-max text-sm">
                      Done
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletModal;
