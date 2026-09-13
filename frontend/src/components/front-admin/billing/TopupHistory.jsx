import { useCallback, useEffect, useState } from "react";
import { FaBitcoin, FaEthereum } from "react-icons/fa6";
import { SiTether } from "react-icons/si";
import { LuCoins } from "react-icons/lu";
import { walletAPI } from "../../../api/walletApi";
import { useLanguage } from "../../../hooks/useLanguage";

const coinMeta = (code) => {
  const c = String(code || "").toUpperCase();
  if (c === "BTC") return { Icon: FaBitcoin, color: "#f7931a", label: "BTC" };
  if (c === "ETH") return { Icon: FaEthereum, color: "#627eea", label: "ETH" };
  if (c.startsWith("USDT")) return { Icon: SiTether, color: "#26a17b", label: "USDT" };
  return { Icon: LuCoins, color: "#6366f1", label: c };
};

const STATUS = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  confirming: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  credited: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  expired: "bg-gray-100 text-gray-600 dark:bg-gray-700/40 dark:text-gray-300",
  failed: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
};

const fmtDate = (d) => {
  try {
    return new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
};

const TopupHistory = () => {
  const [rows, setRows] = useState(null);
  const { t } = useLanguage();
  const labels = t.admin?.topupHistory || {};
  const statusLabels = labels.status || {};

  const load = useCallback(async () => {
    try {
      const res = await walletAPI.getCryptoTopups();
      setRows(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setRows([]);
    }
  }, []);

  useEffect(() => {
    load();
    const onWallet = () => load();
    window.addEventListener("wallet:updated", onWallet);
    return () => window.removeEventListener("wallet:updated", onWallet);
  }, [load]);

  return (
    <div data-testid="topup-history">
      <p className="card-admin-title">{labels.title || "Recent top-ups"}</p>
      <div className="action-card overflow-hidden">
        {rows === null ? (
          <div className="px-5 py-6 text-sm text-secondary dark:text-gray-400">{labels.loading || "Loading…"}</div>
        ) : rows.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-secondary dark:text-gray-400" data-testid="topup-history-empty">
            {labels.empty || "No crypto top-ups yet. Use “Top Up” above to add funds."}
          </div>
        ) : (
          <ul className="divide-y divide-stokecolor dark:divide-gray-700">
            {rows.map((r) => {
              const { Icon, color, label } = coinMeta(r.currency);
              return (
                <li
                  key={r.paymentId}
                  className="flex items-center justify-between gap-4 px-5 py-4"
                  data-testid={`topup-row-${r.paymentId}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 dark:bg-gray-800">
                      <Icon className="h-5 w-5" style={{ color }} />
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-primary dark:text-white">
                        ${Number(r.amountUsd || 0).toFixed(2)}
                        <span className="text-secondary dark:text-gray-400 font-normal"> · {label}</span>
                      </p>
                      <p className="text-xs text-secondary dark:text-gray-400 truncate">
                        {r.cryptoAmount ? `${r.cryptoAmount} ${label} · ` : ""}
                        {fmtDate(r.createdAt)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS[r.status] || STATUS.pending}`}
                    data-testid={`topup-status-${r.paymentId}`}
                  >
                    {statusLabels[r.status] || r.status}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default TopupHistory;
