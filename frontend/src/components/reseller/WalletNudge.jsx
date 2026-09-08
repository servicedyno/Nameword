import React from "react";
import { FiAlertCircle } from "react-icons/fi";

const money = (n) =>
  n === null || n === undefined || isNaN(Number(n)) ? "—" : `$${Number(n).toFixed(2)}`;

// Proactive "top up to go live" nudge. Renders only when the wallet can't yet
// cover the given price. Used across the VPS/RDP/Hosting/Domain buy flows.
export default function WalletNudge({ balance, price, className = "" }) {
  const b = Number(balance);
  const p = Number(price);
  if (isNaN(b) || isNaN(p) || p <= 0 || b >= p) return null;
  const short = p - b;
  return (
    <div
      data-testid="wallet-nudge"
      className={`flex items-start gap-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3 py-2.5 text-sm ${className}`}
    >
      <FiAlertCircle className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-300" />
      <p className="text-amber-800 dark:text-amber-200">
        Your wallet ({money(b)}) is below {money(p)}. Top up{" "}
        <span className="font-semibold">{money(short)}</span> to go live.
      </p>
    </div>
  );
}
