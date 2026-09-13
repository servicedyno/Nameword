import { IoArrowBack, IoCardOutline, IoClose, IoCopyOutline } from "react-icons/io5";
import { PiWarningBold } from "react-icons/pi";
import { FiCheckCircle, FiLoader } from "react-icons/fi";
import { FaBitcoin, FaEthereum } from "react-icons/fa6";
import { SiTether, SiLitecoin, SiDogecoin, SiBitcoincash, SiSolana, SiPolygon, SiRipple } from "react-icons/si";
import { LuCoins } from "react-icons/lu";
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

// Coin icon + brand colour + short ticker for the picker. Keyed by the base
// ticker (before any "-CHAIN" suffix), so USDT-TRC20 / USDT-ERC20 share the USDT icon.
const COIN_ICONS = {
  BTC: { icon: FaBitcoin, color: "#f7931a" },
  ETH: { icon: FaEthereum, color: "#627eea" },
  LTC: { icon: SiLitecoin, color: "#345d9d" },
  DOGE: { icon: SiDogecoin, color: "#c2a633" },
  BCH: { icon: SiBitcoincash, color: "#0ac18e" },
  SOL: { icon: SiSolana, color: "#9945ff" },
  POLYGON: { icon: SiPolygon, color: "#8247e5" },
  MATIC: { icon: SiPolygon, color: "#8247e5" },
  XRP: { icon: SiRipple, color: "#00aae4" },
  TRX: { icon: LuCoins, color: "#eb0029" },
  USDT: { icon: SiTether, color: "#26a17b" },
  USDC: { icon: LuCoins, color: "#2775ca" },
};
const coinMeta = (code) => {
  const c = String(code || "").toUpperCase();
  const base = c.includes("-") ? c.split("-")[0] : c;
  const m = COIN_ICONS[base] || { icon: LuCoins, color: "#6366f1" };
  return { icon: m.icon, color: m.color, label: base };
};

const WalletModal = ({ onClose, onSuccess, presetAmount, resumePayment }) => {
  const { t } = useLanguage();
  const { showAlert } = useAlert();

  const [step, setStep] = useState(resumePayment ? "pay" : "amount"); // "amount" | "pay"
  const [currencies, setCurrencies] = useState([]);
  const [currency, setCurrency] = useState("");
  const [amount, setAmount] = useState(
    presetAmount != null && Number(presetAmount) > 0
      ? String(Math.max(MIN_TOPUP, Math.ceil(Number(presetAmount))))
      : ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [topupError, setTopupError] = useState("");
  const [pay, setPay] = useState(resumePayment || null); // { paymentId, address, currency, cryptoAmount, amountUsd, qrCode }
  const [status, setStatus] = useState(resumePayment?.status === "confirming" ? "confirming" : "waiting"); // waiting | confirming | credited | expired | failed
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
    // Tell the rest of the app (top-bar wallet chip + reward points) to refresh.
    window.dispatchEvent(new Event("wallet:updated"));
    showAlert("Payment received — your wallet has been topped up.", { type: "success", duration: 3000 });
    onSuccess?.();
    setTimeout(() => onClose?.(), 2500);
  }, [onClose, onSuccess, showAlert]);

  const checkStatus = useCallback(async (manual = false) => {
    if (successRef.current || !pay?.paymentId) return;
    try {
      const res = await walletAPI.getCryptoTopupStatus(pay.paymentId);
      const d = res?.data || {};
      if (d.credited === true || d.status === "credited") {
        markCredited();
      } else {
        if (d.status) setStatus(d.status);
        if (manual) {
          showAlert("No payment detected yet — crypto can take a few minutes to confirm. We'll credit your wallet automatically once it lands.", { type: "warning", duration: 4000 });
        }
      }
    } catch {
      if (manual) showAlert("Couldn't check the status right now. Please try again in a moment.", { type: "error", duration: 3000 });
    }
  }, [pay, markCredited, showAlert]);

  // Poll while the pay screen is open.
  useEffect(() => {
    if (step !== "pay" || credited) return undefined;
    checkStatus();
    pollRef.current = setInterval(checkStatus, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [step, credited, checkStatus]);

  // Return to the amount/coin picker so the user can choose a different
  // cryptocurrency or amount. The previously entered amount + coin are kept.
  const goBack = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    successRef.current = false;
    setCredited(false);
    setStatus("waiting");
    setPay(null);
    setStep("amount");
  }, []);

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
    setTopupError("");
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
        const m = res?.message || "Could not generate a payment address. Please try again.";
        setTopupError(m);
        showAlert(m, { type: "error", duration: 3500 });
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.[0]?.message ||
        err.message ||
        "Failed to start the crypto top-up.";
      setTopupError(msg);
      showAlert(msg, { type: "error", duration: 3500 });
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
                    onChange={(e) => { setAmount(e.target.value); setTopupError(""); }}
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
                  <label className="block text-sm font-medium text-primary dark:text-gray-200 mb-1">
                    Pay with
                  </label>
                  {currencies.length === 0 ? (
                    <p className="text-sm text-secondary py-2" data-testid="topup-coins-loading">Loading coins…</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" data-testid="topup-currency-group">
                      {currencies.map((c) => {
                        const meta = coinMeta(c);
                        const Icon = meta.icon;
                        const selected = currency === c;
                        return (
                          <button
                            key={c}
                            type="button"
                            onClick={() => { setCurrency(c); setTopupError(""); }}
                            aria-pressed={selected}
                            data-testid={`topup-coin-${c}`}
                            className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 transition-colors ${
                              selected
                                ? "border-darkbtn ring-2 ring-darkbtn/30 bg-darkbtn/5 dark:bg-darkbtn/10"
                                : "border-stokecolor dark:border-gray-700 hover:border-darkbtn/50"
                            }`}
                          >
                            <Icon className="h-6 w-6" style={{ color: meta.color }} />
                            <span className="text-sm font-semibold text-primary dark:text-white">{meta.label}</span>
                            {NETWORK_HINT[c] && (
                              <span className="text-[11px] leading-tight text-secondary text-center">{NETWORK_HINT[c]}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
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
              {topupError && (
                <p
                  className="mt-3 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-300"
                  role="alert"
                  data-testid="topup-error"
                >
                  {topupError}
                </p>
              )}
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
                  <button
                    type="button"
                    onClick={goBack}
                    className="mt-3 inline-flex items-center gap-1.5 self-start text-sm font-medium text-secondary hover:text-primary dark:hover:text-white"
                    data-testid="topup-change-coin"
                  >
                    <IoArrowBack size={16} /> Change coin or amount
                  </button>
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

                      {pay.destinationTag && (
                        <div className="rounded-lg border-2 border-amber-400 bg-amber-50 p-3 dark:border-amber-500/50 dark:bg-amber-500/10" data-testid="topup-tag-block">
                          <div className="mb-1 flex items-center gap-1.5">
                            <PiWarningBold className="shrink-0 text-amber-600 dark:text-amber-400" size={14} />
                            <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">Destination tag — required</p>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-sm font-bold text-primary dark:text-white break-all" data-testid="topup-tag">{pay.destinationTag}</span>
                            <button type="button" onClick={() => copy(pay.destinationTag, "tag")} className="btn-outline !py-1 !px-2 text-xs shrink-0" aria-label="Copy destination tag">
                              <IoCopyOutline size={14} /> {copied === "tag" ? "Copied" : "Copy"}
                            </button>
                          </div>
                          <p className="mt-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                            You must include this tag in your {pay.currency} transfer, or your payment won&apos;t be credited.
                          </p>
                        </div>
                      )}
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
                    <button type="button" onClick={() => checkStatus(true)} className="btn-outline max-w-max text-sm" data-testid="topup-check-now">
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
