import { useEffect, useRef, useState } from "react";
import { IoClose, IoCopyOutline, IoArrowBack } from "react-icons/io5";
import { PiWarningBold } from "react-icons/pi";
import { FaBitcoin } from "react-icons/fa";
import checkoutAPI from "../../api/checkout";
import { walletAPI } from "../../api/walletApi";
import { money } from "../../utils/checkoutFormat";

const newClientOrderId = () => `web_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

// De-dupe coins by network so the picker isn't cluttered (USDT-TRC20/ERC20 → USDT…),
// but keep the exact provider ticker for the API call.
const prettyCoin = (c) => String(c || "").toUpperCase();

export default function CryptoCheckoutModal({ orderPayload, payable, onClose, onSuccess }) {
  const [coins, setCoins] = useState([]);
  const [loadingCoins, setLoadingCoins] = useState(true);
  const [currency, setCurrency] = useState("");
  const [creating, setCreating] = useState(false);
  const [pay, setPay] = useState(null);
  const [status, setStatus] = useState("pending");
  const [confirmations, setConfirmations] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(null);
  const clientOrderId = useRef(newClientOrderId());
  const pollRef = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await walletAPI.getSupportedCurrencies();
        const list = (res?.data?.currencies || res?.data?.all_supported || res?.data || []).map(String);
        if (!alive) return;
        setCoins(list);
        setCurrency(list[0] || "");
      } catch {
        if (alive) setCoins([]);
      } finally {
        if (alive) setLoadingCoins(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const copy = (text, key) => {
    try { navigator.clipboard?.writeText(String(text)); } catch { /* noop */ }
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const generate = async () => {
    if (!currency) return;
    setCreating(true);
    setError(null);
    try {
      const res = await checkoutAPI.createCryptoOrder(orderPayload, clientOrderId.current, currency);
      if (res?.fully_covered && res?.order) { onSuccess(res.order); return; }
      if (!res?.payment?.address) { setError("Could not generate a payment address. Please try another coin."); return; }
      setPay(res.payment);
      setStatus("pending");
    } catch (err) {
      setError(err?.response?.data?.message || "Could not start the crypto payment. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  // Poll for confirmation while the address panel is shown.
  useEffect(() => {
    if (!pay?.orderId) return;
    let alive = true;
    const tick = async () => {
      try {
        const res = await checkoutAPI.cryptoOrderStatus(pay.orderId);
        const data = res?.data || {};
        if (!alive) return;
        if (data.status === "paid") { onSuccess(data.order); return; }
        if (data.status === "expired" || data.status === "failed") {
          setStatus(data.status);
          setError(data.status === "expired" ? "This payment window expired. Please start again." : "Payment failed or was cancelled.");
          return;
        }
        setStatus(data.status || "pending");
        if (data.confirmations != null) setConfirmations({ n: data.confirmations, req: data.requiredConfirmations });
        pollRef.current = setTimeout(tick, 6000);
      } catch {
        if (alive) pollRef.current = setTimeout(tick, 8000);
      }
    };
    pollRef.current = setTimeout(tick, 5000);
    return () => { alive = false; clearTimeout(pollRef.current); };
  }, [pay?.orderId]); // eslint-disable-line react-hooks/exhaustive-deps

  const back = () => { setPay(null); setError(null); setStatus("pending"); setConfirmations(null); clientOrderId.current = newClientOrderId(); };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-label="Pay with crypto" data-testid="crypto-checkout-modal">
      <div className="absolute inset-0 bg-gray-950/60 backdrop-blur-sm" onClick={onClose} data-testid="crypto-modal-overlay" />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-950 dark:border dark:border-white/[0.06]">
        <div className="flex items-center justify-between border-b border-line px-5 py-4 dark:border-white/[0.06]">
          <div className="flex items-center gap-2">
            {pay && (
              <button type="button" onClick={back} aria-label="Change coin" className="header-icon-btn h-8 w-8" data-testid="crypto-modal-back">
                <IoArrowBack size={18} />
              </button>
            )}
            <div className="inline-flex items-center gap-2 text-lg font-bold text-primary dark:text-white">
              <FaBitcoin className="text-[#f7931a]" /> Pay with crypto
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="header-icon-btn h-9 w-9" data-testid="crypto-modal-close">
            <IoClose size={20} />
          </button>
        </div>

        <div className="px-5 py-5">
          {!pay ? (
            <>
              <p className="text-sm text-ink-soft dark:text-gray-400">
                Paying <span className="font-semibold text-primary dark:text-white nw-mono">{money(payable)}</span> directly with crypto — no wallet needed. You'll earn reward points on this payment.
              </p>
              <label className="mt-4 block text-sm font-medium text-primary dark:text-white">
                Choose a coin
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  disabled={loadingCoins}
                  className="nw-input mt-1.5 w-full !py-2.5"
                  data-testid="crypto-modal-coin-select"
                >
                  {loadingCoins ? (
                    <option>Loading coins…</option>
                  ) : coins.length === 0 ? (
                    <option value="">No coins available</option>
                  ) : (
                    coins.map((c) => <option key={c} value={c}>{prettyCoin(c)}</option>)
                  )}
                </select>
              </label>
              {error && (
                <p className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300" role="alert" data-testid="crypto-modal-error">{error}</p>
              )}
              <button
                type="button"
                onClick={generate}
                disabled={creating || loadingCoins || !currency}
                className="nw-btn-primary mt-5 w-full disabled:opacity-60 disabled:cursor-not-allowed"
                data-testid="crypto-modal-generate"
              >
                {creating ? "Generating address…" : `Get payment address`}
              </button>
            </>
          ) : (
            <div className="space-y-4" data-testid="crypto-modal-pay-panel">
              <div className="text-center">
                <p className="text-sm text-ink-soft dark:text-gray-400">Send exactly</p>
                <p className="text-2xl font-bold text-primary dark:text-white nw-mono" data-testid="crypto-modal-amount">
                  {pay.cryptoAmount || ""} {pay.currency}
                </p>
                <p className="text-xs text-ink-soft dark:text-gray-400">≈ {money(pay.amountUsd)} · Network: {pay.currency}</p>
              </div>

              {pay.qrCode && (
                <div className="flex justify-center">
                  <img src={pay.qrCode} alt="Payment QR" className="h-40 w-40 rounded-lg bg-white p-2" data-testid="crypto-modal-qr" />
                </div>
              )}

              <div>
                <p className="mb-1 text-xs font-medium text-ink-soft dark:text-gray-400">To this address</p>
                <div className="flex items-center justify-between gap-2 rounded-lg bg-surface-2 px-3 py-2 dark:bg-white/[0.06]">
                  <span className="break-all font-mono text-sm text-primary dark:text-white" data-testid="crypto-modal-address">{pay.address}</span>
                  <button type="button" onClick={() => copy(pay.address, "address")} className="btn-outline !py-1 !px-2 text-xs shrink-0" aria-label="Copy address" data-testid="crypto-modal-copy-address">
                    <IoCopyOutline size={14} /> {copied === "address" ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>

              {pay.destinationTag && (
                <div className="rounded-lg border-2 border-amber-400 bg-amber-50 p-3 dark:border-amber-500/50 dark:bg-amber-500/10" data-testid="crypto-modal-tag-block">
                  <div className="mb-1 flex items-center gap-1.5">
                    <PiWarningBold className="shrink-0 text-amber-600 dark:text-amber-400" size={14} />
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">Destination tag — required</p>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-bold text-primary dark:text-white break-all" data-testid="crypto-modal-tag">{pay.destinationTag}</span>
                    <button type="button" onClick={() => copy(pay.destinationTag, "tag")} className="btn-outline !py-1 !px-2 text-xs shrink-0" aria-label="Copy destination tag">
                      <IoCopyOutline size={14} /> {copied === "tag" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="mt-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                    You must include this tag in your {pay.currency} transfer, or your payment won&apos;t be credited.
                  </p>
                </div>
              )}

              {error ? (
                <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300" role="alert" data-testid="crypto-modal-error">{error}</p>
              ) : (
                <div className="flex items-center justify-center gap-2 rounded-lg bg-surface-2 px-3 py-2.5 text-sm text-ink-soft dark:bg-white/[0.06] dark:text-gray-400" data-testid="crypto-modal-status">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-500" />
                  {status === "confirming"
                    ? `Confirming on-chain${confirmations?.n != null ? ` (${confirmations.n}/${confirmations.req ?? "?"})` : "…"}`
                    : "Waiting for your payment… this updates automatically"}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
