import { IoArrowBack, IoCardOutline, IoClose, IoCopyOutline } from "react-icons/io5";
import { PiWarningBold } from "react-icons/pi";
import { FiLoader } from "react-icons/fi";
import { LuWallet, LuCoins } from "react-icons/lu";
import { FaBitcoin, FaEthereum } from "react-icons/fa6";
import { SiTether, SiLitecoin, SiDogecoin, SiBitcoincash, SiSolana, SiPolygon, SiRipple } from "react-icons/si";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { walletAPI } from "../../api/walletApi";
import { useAlert } from "../../context/AlertContext";
import Loader from "../common/Loader";
import CryptoStatusTimeline from "../cart/CryptoStatusTimeline";
import PaymentSuccessCelebration from "../cart/PaymentSuccessCelebration";
import { useLanguage } from "../../hooks/useLanguage";

const MIN_TOPUP = 10;
const PRESETS = [20, 50, 100, 250];
const POPULAR_PRESET = 50;
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

const usd = (n) => `$${Number(n || 0).toFixed(2)}`;

const WalletModal = ({ onClose, onSuccess, presetAmount, resumePayment, currentBalance = 0 }) => {
  const { t } = useLanguage();
  const { showAlert } = useAlert();

  // Localised string helper: reads t.admin.topup.<key>, falls back to English,
  // then substitutes {var} placeholders.
  const tt = useMemo(() => t.admin?.topup || {}, [t]);
  const tr = useCallback((key, fb, vars) => {
    let s = tt[key] != null ? tt[key] : fb;
    if (vars) for (const k of Object.keys(vars)) s = String(s).split(`{${k}}`).join(String(vars[k]));
    return s;
  }, [tt]);

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
  const [status, setStatus] = useState(resumePayment?.status === "confirming" ? "confirming" : "waiting"); // waiting | detected | confirming | credited | expired | failed
  const [credited, setCredited] = useState(false);
  const [copied, setCopied] = useState("");
  // Whether the buyer tapped "I've sent it" (reveals the live status timeline).
  // Resumed payments jump straight to the timeline since they were mid-flow.
  const [sentClicked, setSentClicked] = useState(!!resumePayment);
  const [confirmations, setConfirmations] = useState(null);
  const [requiredConfirmations, setRequiredConfirmations] = useState(null);
  const successRef = useRef(false);
  const pollRef = useRef(null);

  const amountNum = Number(amount);
  const amountValid = !Number.isNaN(amountNum) && amountNum >= MIN_TOPUP;
  const previewTopup = amountValid ? amountNum : 0;
  const balanceNum = Number(currentBalance || 0);

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
    showAlert(tr("alertCredited", "Payment received — your wallet has been topped up."), { type: "success", duration: 3000 });
    onSuccess?.();
    setTimeout(() => onClose?.(), 2500);
  }, [onClose, onSuccess, showAlert, tr]);

  const checkStatus = useCallback(async (manual = false) => {
    if (successRef.current || !pay?.paymentId) return;
    try {
      const res = await walletAPI.getCryptoTopupStatus(pay.paymentId);
      const d = res?.data || {};
      if (d.credited === true || d.status === "credited") {
        markCredited();
      } else {
        if (d.status) setStatus(d.status);
        if (d.confirmations != null) setConfirmations(Number(d.confirmations));
        if (d.requiredConfirmations != null) setRequiredConfirmations(Number(d.requiredConfirmations));
        if (manual) {
          showAlert(tr("alertNoPayment", "No payment detected yet — crypto can take a few minutes to confirm. We'll credit your wallet automatically once it lands."), { type: "warning", duration: 4000 });
        }
      }
    } catch {
      if (manual) showAlert(tr("alertCheckError", "Couldn't check the status right now. Please try again in a moment."), { type: "error", duration: 3000 });
    }
  }, [pay, markCredited, showAlert, tr]);

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
      showAlert(tr("alertMinTopup", "Minimum top-up is ${min}.", { min: MIN_TOPUP }), { type: "error", duration: 2500 });
      return;
    }
    if (!currency) {
      showAlert(tr("alertChooseCoin", "Please choose a cryptocurrency."), { type: "error", duration: 2500 });
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
        const m = res?.message || tr("alertNoAddress", "Could not generate a payment address. Please try again.");
        setTopupError(m);
        showAlert(m, { type: "error", duration: 3500 });
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.[0]?.message ||
        err.message ||
        tr("alertFailStart", "Failed to start the crypto top-up.");
      setTopupError(msg);
      showAlert(msg, { type: "error", duration: 3500 });
    } finally {
      setSubmitting(false);
    }
  };

  const statusLabel = useMemo(() => {
    switch (status) {
      case "confirming":
        return tr("statusConfirming", "Payment detected — confirming on-chain…");
      case "expired":
        return tr("statusExpired", "This address has expired. Close and start a new top-up.");
      case "failed":
        return tr("statusFailed", "Payment failed. Close and try again.");
      default:
        return tr("statusWaiting", "Waiting for your payment… crypto confirms on-chain, so this can take a few minutes.");
    }
  }, [status, tr]);

  const netHint = pay ? NETWORK_HINT[pay.currency] || pay.currency : "";
  // Map the top-up status onto the shared payment timeline.
  const timelineStatus = credited
    ? "paid"
    : status === "confirming"
    ? "confirming"
    : status === "detected"
    ? "detected"
    : "awaiting_payment";
  const showTimeline = credited || sentClicked || ["detected", "confirming"].includes(status);

  return (
    <div className="fixed inset-0 z-50 bg-gray-950/50 backdrop-blur-sm overflow-auto py-5">
      <div className="flex items-center justify-center w-full min-h-full">
        <div className={`modal-dialog ${step === "pay" ? "!max-w-[520px] w-full" : ""}`} data-testid="wallet-topup-modal">
          <button onClick={onClose} className="header-icon-btn absolute top-4 right-4 z-10" aria-label={tr("close", "Close")} data-testid="topup-close">
            <IoClose size={26} />
          </button>

          {step === "amount" && (
            <>
              <div className="flex flex-col gap-2">
                <h2 className="modal-title">
                  {tr("title", "Top up wallet")}
                  <p className="text-15 font-medium text-secondary mt-1">{tr("subtitle", "Pay with crypto — funds are added to your USD wallet.")}</p>
                </h2>
              </div>

              <div className="mt-4 space-y-4">
                {/* Presets */}
                <div>
                  <label className="block text-sm font-medium text-primary dark:text-gray-200 mb-2">{tr("chooseAmount", "Choose an amount")}</label>
                  <div className="grid grid-cols-4 gap-2 pt-2" data-testid="topup-presets">
                    {PRESETS.map((p) => {
                      const selected = Number(amount) === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => { setAmount(String(p)); setTopupError(""); }}
                          aria-pressed={selected}
                          data-testid={`topup-preset-${p}`}
                          className={`relative rounded-xl border px-2 py-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 ${
                            selected
                              ? "border-brand bg-brand-50 text-brand-700 ring-2 ring-brand/30 dark:bg-brand/15 dark:text-brand-200"
                              : "border-line text-primary hover:border-brand/50 dark:border-gray-700 dark:text-white"
                          }`}
                        >
                          ${p}
                          {p === POPULAR_PRESET && (
                            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white shadow-sm">
                              {tr("mostPopular", "Most popular")}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label htmlFor="topup-amount" className="block text-sm font-medium text-primary dark:text-gray-200 mb-1">
                    {tr("customAmount", "Or enter a custom amount (USD)")}
                  </label>
                  <input
                    id="topup-amount"
                    type="number"
                    min={MIN_TOPUP}
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); setTopupError(""); }}
                    className="nw-input"
                    placeholder={tr("minPlaceholder", "Minimum ${min}", { min: MIN_TOPUP })}
                    data-testid="topup-amount-input"
                  />
                  {!amountValid && amount !== "" && (
                    <p className="text-warning pl-1 text-xs font-medium mt-1">{tr("minWarning", "Minimum top-up is ${min}.", { min: MIN_TOPUP })}</p>
                  )}
                </div>

                {/* Currency */}
                <div>
                  <label className="block text-sm font-medium text-primary dark:text-gray-200 mb-1">
                    {tr("payWith", "Pay with")}
                  </label>
                  {currencies.length === 0 ? (
                    <p className="text-sm text-secondary py-2" data-testid="topup-coins-loading">{tr("loadingCoins", "Loading coins…")}</p>
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
                            className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 ${
                              selected
                                ? "border-brand ring-2 ring-brand/30 bg-brand-50 dark:bg-brand/15"
                                : "border-line dark:border-gray-700 hover:border-brand/50"
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

                {/* Top-up preview — order-summary-style balance preview */}
                <div className="rounded-xl border border-line bg-surface-2/60 p-4 dark:border-gray-700 dark:bg-white/[0.04]" data-testid="topup-preview">
                  <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-secondary dark:text-gray-400">
                    <LuWallet className="h-3.5 w-3.5" /> {tr("summaryTitle", "Top-up summary")}
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-secondary dark:text-gray-400">{tr("topupAmount", "Top-up amount")}</span>
                      <span className="font-mono font-medium text-primary dark:text-white" data-testid="topup-preview-amount">{usd(previewTopup)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-secondary dark:text-gray-400">{tr("currentBalance", "Your wallet balance")}</span>
                      <span className="font-mono font-medium text-primary dark:text-white" data-testid="topup-preview-current">{usd(balanceNum)}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-line pt-2 dark:border-gray-700">
                      <span className="font-semibold text-primary dark:text-white">{tr("newBalance", "Balance after top-up")}</span>
                      <span className="font-mono text-base font-bold text-brand-700 dark:text-brand-300" data-testid="topup-preview-new">{usd(balanceNum + previewTopup)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-md border border-stokecolor dark:border-gray-700 bg-mutebg dark:bg-gray-800 text-secondary">
                  <PiWarningBold className="shrink-0" />
                  <span className="text-xs font-medium">{tr("addressHint", "You'll get a wallet address & QR. Send the exact amount; your wallet is credited automatically once it confirms.")}</span>
                </div>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={startTopup}
                  className="nw-btn-primary"
                  disabled={!amountValid || !currency || submitting}
                  data-testid="topup-generate-address"
                >
                  <IoCardOutline className="text-base" />
                  <span>{submitting ? tr("generating", "Generating…") : tr("getAddress", "Get address for ${amount}", { amount: amountValid ? amountNum : 0 })}</span>
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
                  {credited ? tr("receivedTitle", "Payment received") : tr("payTitle", "Send crypto to top up")}
                  <p className="text-15 font-medium text-secondary mt-1">{tr("addingToWallet", "Adding ${amount} to your wallet", { amount: Number(pay.amountUsd).toFixed(2) })}</p>
                </h2>
              </div>

              {credited ? (
                <div data-testid="topup-success">
                  <PaymentSuccessCelebration
                    title={tr("celebrateTitle", "Payment received!")}
                    amountLabel={`$${Number(pay.amountUsd).toFixed(2)}`}
                    subtitle={tr("celebrateSubtitle", "Added to your wallet. This window will close automatically.")}
                  />
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={goBack}
                    className="mt-3 inline-flex items-center gap-1.5 self-start text-sm font-medium text-secondary hover:text-primary dark:hover:text-white"
                    data-testid="topup-change-coin"
                  >
                    <IoArrowBack size={16} /> {tr("changeCoin", "Change coin or amount")}
                  </button>
                  <div className="mt-3 flex flex-col items-center gap-3">
                    {pay.qrCode && (
                      <img src={pay.qrCode} alt="Payment QR code" className="h-44 w-44 rounded-lg border border-stokecolor dark:border-gray-700 bg-white p-2" data-testid="topup-qr" />
                    )}

                    <div className="w-full space-y-2">
                      <div className="rounded-lg border border-stokecolor dark:border-gray-700 p-3">
                        <p className="text-xs text-secondary mb-1">{tr("sendExactly", "Send exactly")}</p>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-primary dark:text-white break-all" data-testid="topup-amount-crypto">
                            {pay.cryptoAmount} {pay.currency}
                          </span>
                          <button type="button" onClick={() => copy(pay.cryptoAmount, "amount")} className="nw-btn-secondary nw-btn-sm !px-2 !py-1 shrink-0" aria-label={tr("copy", "Copy")}>
                            <IoCopyOutline size={14} /> {copied === "amount" ? tr("copied", "Copied") : tr("copy", "Copy")}
                          </button>
                        </div>
                        <p className="text-xs text-secondary mt-1">{tr("network", "Network")}: {netHint}</p>
                      </div>

                      <div className="rounded-lg border border-stokecolor dark:border-gray-700 p-3">
                        <p className="text-xs text-secondary mb-1">{tr("toThisAddress", "To this address")}</p>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-sm text-primary dark:text-white break-all" data-testid="topup-address">{pay.address}</span>
                          <button type="button" onClick={() => copy(pay.address, "address")} className="nw-btn-secondary nw-btn-sm !px-2 !py-1 shrink-0" aria-label={tr("copy", "Copy")}>
                            <IoCopyOutline size={14} /> {copied === "address" ? tr("copied", "Copied") : tr("copy", "Copy")}
                          </button>
                        </div>
                      </div>

                      {pay.destinationTag && (
                        <div className="rounded-lg border-2 border-amber-400 bg-amber-50 p-3 dark:border-amber-500/50 dark:bg-amber-500/10" data-testid="topup-tag-block">
                          <div className="mb-1 flex items-center gap-1.5">
                            <PiWarningBold className="shrink-0 text-amber-600 dark:text-amber-400" size={14} />
                            <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">{tr("destinationTag", "Destination tag — required")}</p>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-sm font-bold text-primary dark:text-white break-all" data-testid="topup-tag">{pay.destinationTag}</span>
                            <button type="button" onClick={() => copy(pay.destinationTag, "tag")} className="nw-btn-secondary nw-btn-sm !px-2 !py-1 shrink-0" aria-label={tr("copy", "Copy")}>
                              <IoCopyOutline size={14} /> {copied === "tag" ? tr("copied", "Copied") : tr("copy", "Copy")}
                            </button>
                          </div>
                          <p className="mt-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                            {tr("destinationTagNote", "You must include this tag in your {coin} transfer, or your payment won't be credited.", { coin: pay.currency })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-2 text-secondary mt-3 text-xs font-medium">
                    <PiWarningBold className="mt-0.5 shrink-0" />
                    <span>{tr("networkWarning", "Send the exact amount on the {network} network only. Addresses are time-limited — please send promptly.", { network: netHint })}</span>
                  </div>

                  {showTimeline ? (
                    <div className="mt-4 rounded-xl border border-stokecolor bg-surface-2 p-4 dark:border-gray-700 dark:bg-white/[0.04]" data-testid="topup-status-timeline">
                      <p className="mb-3 text-sm font-semibold text-primary dark:text-white">{tr("paymentStatus", "Payment status")}</p>
                      <CryptoStatusTimeline status={timelineStatus} confirmations={confirmations} requiredConfirmations={requiredConfirmations} />
                      <p className="mt-3 text-[12px] text-secondary dark:text-gray-400">
                        {tr("autoUpdate", "This updates automatically — keep this open until it's confirmed. Crypto can take a few minutes.")}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 text-secondary mt-3 text-xs font-medium" data-testid="topup-status">
                      <FiLoader className="animate-spin mt-0.5" />
                      <span>{statusLabel}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => { setSentClicked(true); checkStatus(true); }}
                      className="nw-btn-primary"
                      data-testid="topup-ive-paid"
                    >
                      {showTimeline ? tr("checkNow", "Check now") : tr("ivePaid", "I've sent it")}
                    </button>
                    <button type="button" onClick={onClose} className="nw-btn-secondary">
                      {tr("close", "Close")}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Powered by Dynopay */}
        <a
          href="https://dynopay.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 border-t border-stokecolor px-5 py-3 text-[11px] text-secondary transition-colors hover:text-primary dark:border-gray-700 dark:hover:text-white"
          data-testid="powered-by-dynopay"
          title="Crypto payments powered by Dynopay"
        >
          <span>{tr("poweredBy", "Powered by")}</span>
          <img src="/dynopay-icon.svg" alt="Dynopay" className="h-3.5 w-3.5" />
          <span className="font-semibold">Dynopay</span>
        </a>
      </div>
    </div>
  );
};

export default WalletModal;
