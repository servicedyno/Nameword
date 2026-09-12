import { useCallback, useEffect, useState } from "react";
import { FiArrowRight, FiX, FiLoader } from "react-icons/fi";
import { FaBitcoin } from "react-icons/fa";
import { walletAPI } from "../../api/walletApi";
import WalletModal from "../modals/wallet-modal";
import { useAlert } from "../../context/AlertContext";

// "in ~2h 45m" / "in ~40m" until the address window closes; null if unknown/past.
function expiresIn(iso) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const mins = Math.round(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `~${h}h ${m}m` : `~${m}m`;
}

// "Awaiting crypto" strip: surfaces unfinished crypto top-ups so a user can
// reopen the address/QR and finish paying (or dismiss it).
export default function PendingCryptoStrip() {
  const { showAlert } = useAlert();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resume, setResume] = useState(null);
  const [dismissing, setDismissing] = useState({});

  const load = useCallback(async () => {
    try {
      const res = await walletAPI.listPendingCryptoTopups();
      setPending(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setPending([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onResumeSuccess = () => {
    setResume(null);
    window.dispatchEvent(new Event("wallet:updated"));
    load();
  };

  const dismiss = async (paymentId) => {
    setDismissing((d) => ({ ...d, [paymentId]: true }));
    try {
      await walletAPI.cancelCryptoTopup(paymentId);
      setPending((p) => p.filter((x) => x.paymentId !== paymentId));
    } catch {
      showAlert("Couldn't dismiss that payment. Please try again.", { type: "fail", duration: 2500 });
    } finally {
      setDismissing((d) => {
        const n = { ...d };
        delete n[paymentId];
        return n;
      });
    }
  };

  if (loading || pending.length === 0) return null;

  return (
    <div className="space-y-3" data-testid="pending-crypto-strip">
      {pending.map((p) => (
        <div
          key={p.paymentId}
          className="flex flex-col gap-3 rounded-xl border border-amber-400/50 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10 sm:flex-row sm:items-center sm:justify-between"
          data-testid={`pending-crypto-${p.paymentId}`}
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
              <FaBitcoin size={18} />
            </span>
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                Awaiting crypto payment — ${Number(p.amountUsd).toFixed(2)}
              </p>
              <p className="text-xs text-amber-800/80 dark:text-amber-200/70">
                {p.cryptoAmount ? `Send ${p.cryptoAmount} ${p.currency} to finish topping up your wallet. ` : `Finish topping up your wallet in ${p.currency}. `}
                {p.status === "confirming" ? "Payment detected — confirming on-chain…" : "We haven't seen your payment yet."}
                {expiresIn(p.expireAt) && (
                  <span className="text-amber-700/70 dark:text-amber-200/60"> · expires in {expiresIn(p.expireAt)}</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setResume(p)}
              className="nw-btn-primary nw-btn-sm"
              data-testid={`pending-crypto-resume-${p.paymentId}`}
            >
              Resume payment <FiArrowRight size={14} />
            </button>
            <button
              type="button"
              onClick={() => dismiss(p.paymentId)}
              disabled={!!dismissing[p.paymentId]}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-amber-800/80 hover:text-amber-900 disabled:opacity-50 dark:text-amber-200/70 dark:hover:text-amber-100"
              data-testid={`pending-crypto-dismiss-${p.paymentId}`}
            >
              {dismissing[p.paymentId] ? <FiLoader className="animate-spin" size={14} /> : <FiX size={14} />} Dismiss
            </button>
          </div>
        </div>
      ))}

      {resume && (
        <WalletModal resumePayment={resume} onClose={() => setResume(null)} onSuccess={onResumeSuccess} />
      )}
    </div>
  );
}
