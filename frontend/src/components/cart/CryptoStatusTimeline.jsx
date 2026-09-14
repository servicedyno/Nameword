import { IoCheckmarkCircle } from "react-icons/io5";
import { useLanguage } from "../../hooks/useLanguage";

// Shared crypto payment status timeline used by both the cart crypto modal and
// the wallet top-up modal so the "I've sent it" experience is identical.
export const CRYPTO_STEPS = [
  { key: "awaiting_payment", label: "Awaiting payment" },
  { key: "detected", label: "Payment detected" },
  { key: "confirming", label: "Confirming on-chain" },
  { key: "paid", label: "Confirmed" },
];

export const CRYPTO_STEP_INDEX = {
  awaiting_payment: 0,
  detected: 1,
  underpaid: 1,
  confirming: 2,
  paid: 3,
  credited: 3,
};

export default function CryptoStatusTimeline({ status, confirmations, requiredConfirmations }) {
  const { t } = useLanguage();
  const tl = t.admin?.crypto?.timeline || {};
  const TL = { awaiting_payment: tl.awaiting, detected: tl.detected, confirming: tl.confirming, paid: tl.paid };
  const done = status === "paid" || status === "credited";
  const active = CRYPTO_STEP_INDEX[status] ?? 0;
  return (
    <ol className="space-y-3" data-testid="crypto-timeline">
      {CRYPTO_STEPS.map((s, i) => {
        const isDone = i < active || done;
        const isCurrent = i === active && !done;
        return (
          <li key={s.key} className="flex items-center gap-3" data-testid={`crypto-step-${s.key}`}>
            <span className="relative flex h-6 w-6 shrink-0 items-center justify-center">
              {isDone ? (
                <IoCheckmarkCircle className="h-6 w-6 text-emerald-500" />
              ) : isCurrent ? (
                <>
                  <span className="absolute h-6 w-6 animate-ping rounded-full bg-amber-400/40" />
                  <span className="h-3 w-3 rounded-full bg-amber-500" />
                </>
              ) : (
                <span className="h-3 w-3 rounded-full border-2 border-line dark:border-white/20" />
              )}
            </span>
            <span
              className={`text-sm ${
                isDone
                  ? "font-medium text-primary dark:text-white"
                  : isCurrent
                  ? "font-semibold text-primary dark:text-white"
                  : "text-ink-soft dark:text-gray-500"
              }`}
            >
              {TL[s.key] || s.label}
              {isCurrent && s.key === "confirming" && confirmations != null && (
                <span className="ml-1 text-ink-soft dark:text-gray-400">
                  ({confirmations}/{requiredConfirmations ?? "?"})
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
