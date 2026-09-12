import { IoCardOutline, IoClose, IoCopyOutline } from "react-icons/io5";
import { PiWarningBold } from "react-icons/pi";
import { FiCheckCircle, FiLoader } from "react-icons/fi";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { walletAPI } from "../../api/walletApi";
import { useAlert } from "../../context/AlertContext";
import Loader from "../common/Loader";
import { useLanguage } from "../../hooks/useLanguage";

const MIN_TOPUP = 10;
const PREFERRED = ["USDT-TRC20", "USDT-ERC20", "ETH", "BTC"];

// Friendly network hint per coin so users don't send on the wrong chain.
const NETWORK_HINT = {
  "USDT-TRC20": "Tron (TRC-20)",
  "USDT-ERC20": "Ethereum (ERC-20)",
  "USDC-ERC20": "Ethereum (ERC-20)",
  "USDT-POLYGON": "Polygon",
  ETH: "Ethereum (ERC-20)",
  BTC: "Bitcoin",
  LTC: "Litecoin",
  DOGE: "Dogecoin",
  TRX: "Tron",
  SOL: "Solana",
  XRP: "XRP Ledger",
  BCH: "Bitcoin Cash",
  POLYGON: "Polygon",
};

const WalletModal = ({ onClose, onSuccess, presetAmount }) => {
  const { t } = useLanguage();
  const { showAlert } = useAlert();

  const [step, setStep] = useState("amount"); // "amount" | "pay"
  const [currencies, setCurrencies] = useState([]);
  const [currency, setCurrency] = useState("");
  const [amount, setAmount] = useState(
    presetAmount != null && Number(presetAmount) > 0
      ? String(Math.max(MIN_TOPUP, Math.ceil(Number(presetAmount))))
      : ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [pay, setPay] = useState(null); // { paymentId, address, currency, cryptoAmount, amountUsd, qrCode }
  const [status, setStatus] = useState("waiting"); // waiting | confirming | credited | expired | failed
  const [credited, setCredited] = useState(false);
  const [copied, setCopied] = useState("");
  const successRef = useRef(false);
  const pollRef = useRef(null);

  const amountNum = Number(amount);
  const amountValid = !Number.isNaN(amountNum) && amountNum >= MIN_TOPUP;

  // Load supported coins once.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await walletAPI.getSupportedCurrencies();
        const list = res?.data?.currencies || res?.data?.all_supported || res?.data || [];
        const coins = Array.isArray(list) ? list.map(String) : [];
        if (!alive) return;
        setCurrencies(coins);
        const pick = PREFERRED.find((c) => coins.includes(c)) || coins[0] || "";
        setCurrency(pick);
      } catch {
        if (alive) setCurrencies([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const copy = useCallback(async (text, label) => {
    try {
      await navigator.clipboard.writeText(String(text));
      setCopied(label);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      /* clipboard may be blocked; ignore */
    }
  }, []);

  const markCredited = useCallback(() => {
    if (successRef.current) return;
    successRef.current = true;
    setCredited(true);
    setStatus("credited");
    showAlert("Payment received — your wallet has been topped up.", { type: "success", duration: 3000 });
    onSuccess?.();
    setTimeout(() => onClose?.(), 2500);
  }, [onClose, onSuccess, showAlert]);

  const checkStatus = useCallback(async () => {
    if (successRef.current || !pay?.paymentId) return;
    try {
      const res = await walletAPI.getCryptoTopupStatus(pay.paymentId);
      const d = res?.data || {};
      if (d.credited === true || d.status === "credited") {
        markCredited();
      } else if (d.status) {
        setStatus(d.status);
      }
    } catch {
      /* transient error while polling — keep trying */
    }
  }, [pay, markCredited]);

  // Poll while the pay screen is open.
  useEffect(() => {
    if (step !== "pay" || credited) return undefined;
    checkStatus();
    pollRef.current = setInterval(checkStatus, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [step, credited, checkStatus]);

  const startTopup = async () => {
    if (!amountValid) {
      showAlert(`Minimum top-up is $${MIN_TOPUP}.`, { type: "error", duration: 2500 });
      return;
    }
    if (!currency) {
      showAlert("Please choose a cryptocurrency.", { type: "error", duration: 2500 });
      return;
    }
    setSubmitting(true);
    try {
      const res = await walletAPI.createCryptoTopup({
        amount: amountNum,
        currency,
        frontendEndPoint: "wallet",
      });
      const d = res?.data;
      if (d?.address && d?.paymentId) {
        setPay(d);
        setStatus("waiting");
        setStep("pay");
      } else {
        showAlert(res?.message || "Could not generate a payment address. Please try again.", { type: "error", duration: 3000 });
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.[0]?.message ||
        err.message ||
        "Failed to start the crypto top-up.";
      showAlert(msg, { type: "error", duration: 3000 });
    } finally {
      setSubmitting(false);
    }
  };

  const statusLabel = useMemo(() => {
    switch (status) {
      case "confirming":
        return "Payment detected — confirming on-chain…";
      case "expired":
        return "This address has expired. Close and start a new top-up.";
      case "failed":
        return "Payment failed. Close and try again.";
      default:
        return "Waiting for your payment… crypto confirms on-chain, so this can take a few minutes.";
    }
  }, [status]);

  const netHint = pay ? NETWORK_HINT[pay.currency] || pay.currency : "";

  return (
    <div className="fixed inset-0 z-50 bg-white/80 dark:bg-gray-600/80 overflow-auto py-5">
      <div className="flex items-center justify-center w-full min-h-full">
        <div className={`modal-dialog ${step === "pay" ? "!max-w-[520px] w-full" : ""}`}>
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-black z-10" aria-label="Close">
            <IoClose className="text-primary dark:text-gray-500" size={30} />
          </button>

          {step === "amount" && (
            <>
              <div className="flex flex-col gap-2">
                <h2 className="modal-title">
                  {t.admin?.topUpWallet || "Top up wallet"}
                  <p className="text-15 font-medium text-secondary mt-1">Pay with crypto — funds are added to your USD wallet.</p>
                </h2>
              </div>

              <div className="mt-4 space-y-4">
                {/* Amount */}
                <div>
                  <label htmlFor="topup-amount" className="block text-sm font-medium text-primary dark:text-gray-200 mb-1">
                    Amount (USD)
                  </label>
                  <input
                    id="topup-amount"
                    type="number"
                    min={MIN_TOPUP}
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="input-field peer w-full admin-form"
                    placeholder={`e.g. ${MIN_TOPUP}`}
                    data-testid="topup-amount-input"
                  />
                  {!amountValid && amount !== "" && (
                    <p className="text-warning pl-1 text-xs font-medium mt-1">Minimum top-up is ${MIN_TOPUP}.</p>
                  )}
                </div>

                {/* Currency */}
                <div>
                  <label htmlFor="topup-currency" className="block text-sm font-medium text-primary dark:text-gray-200 mb-1">
                    Pay with
                  </label>
                  <select
                    id="topup-currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="input-field w-full admin-form"
                    data-testid="topup-currency-select"
                    disabled={currencies.length === 0}
                  >
                    {currencies.length === 0 && <option value="">Loading coins…</option>}
                    {currencies.map((c) => (
                      <option key={c} value={c}>
                        {c}
                        {NETWORK_HINT[c] ? ` — ${NETWORK_HINT[c]}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-md border border-stokecolor dark:border-gray-700 bg-mutebg dark:bg-gray-800 text-secondary">
                  <PiWarningBold className="shrink-0" />
                  <span className="text-xs font-medium">You&apos;ll get a wallet address &amp; QR. Send the exact amount; your wallet is credited automatically once it confirms.</span>
                </div>
              </div>

              <div className="mt-5 flex justify-end admin-btn">
                <button
                  type="button"
                  onClick={startTopup}
                  className={`${!amountValid || !currency || submitting ? "disable" : ""} add-to-cart`}
                  disabled={!amountValid || !currency || submitting}
                  data-testid="topup-generate-address"
                >
                  <IoCardOutline className="text-white text-base" />
                  <span>{submitting ? "Generating…" : `Get address for $${amountValid ? amountNum : 0}`}</span>
                </button>
              </div>
              {submitting && <Loader />}
            </>
          )}

          {step === "pay" && pay && (
            <div className="flex flex-col">
              <div className="flex flex-col gap-1 pr-8">
                <h2 className="modal-title">
                  {credited ? "Payment received" : "Send crypto to top up"}
                  <p className="text-15 font-medium text-secondary mt-1">Adding ${Number(pay.amountUsd).toFixed(2)} to your wallet</p>
                </h2>
              </div>

              {credited ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center" data-testid="topup-success">
                  <FiCheckCircle className="text-tealdark" size={56} />
                  <p className="text-lg font-semibold text-primary dark:text-white">${Number(pay.amountUsd).toFixed(2)} added to your wallet</p>
                  <p className="text-sm text-secondary">You can close this window.</p>
                </div>
              ) : (
                <>
                  <div className="mt-3 flex flex-col items-center gap-3">
                    {pay.qrCode && (
                      <img src={pay.qrCode} alt="Payment QR code" className="h-44 w-44 rounded-lg border border-stokecolor dark:border-gray-700 bg-white p-2" data-testid="topup-qr" />
                    )}

                    <div className="w-full space-y-2">
                      <div className="rounded-lg border border-stokecolor dark:border-gray-700 p-3">
                        <p className="text-xs text-secondary mb-1">Send exactly</p>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-primary dark:text-white break-all" data-testid="topup-amount-crypto">
                            {pay.cryptoAmount} {pay.currency}
                          </span>
                          <button type="button" onClick={() => copy(pay.cryptoAmount, "amount")} className="btn-outline !py-1 !px-2 text-xs shrink-0" aria-label="Copy amount">
                            <IoCopyOutline size={14} /> {copied === "amount" ? "Copied" : "Copy"}
                          </button>
                        </div>
                        <p className="text-xs text-secondary mt-1">Network: {netHint}</p>
                      </div>

                      <div className="rounded-lg border border-stokecolor dark:border-gray-700 p-3">
                        <p className="text-xs text-secondary mb-1">To this address</p>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-sm text-primary dark:text-white break-all" data-testid="topup-address">{pay.address}</span>
                          <button type="button" onClick={() => copy(pay.address, "address")} className="btn-outline !py-1 !px-2 text-xs shrink-0" aria-label="Copy address">
                            <IoCopyOutline size={14} /> {copied === "address" ? "Copied" : "Copy"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 text-secondary mt-3 text-xs font-medium">
                    <PiWarningBold className="mt-0.5 shrink-0" />
                    <span>Send the exact amount on the {netHint} network only. Addresses are time-limited — please send promptly.</span>
                  </div>

                  <div className={`flex items-center gap-2 mt-3 text-xs font-medium ${status === "confirming" ? "text-tealdark" : "text-secondary"}`} data-testid="topup-status">
                    <FiLoader className="animate-spin" />
                    <span>{statusLabel}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-4">
                    <button type="button" onClick={checkStatus} className="btn-outline max-w-max text-sm" data-testid="topup-check-now">
                      I&apos;ve sent it — check now
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
