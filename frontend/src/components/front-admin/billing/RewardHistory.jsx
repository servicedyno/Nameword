import { useCallback, useEffect, useState } from "react";
import { LuGift, LuArrowUpRight } from "react-icons/lu";
import { walletAPI } from "../../../api/walletApi";
import { useLanguage } from "../../../hooks/useLanguage";

const fmtDate = (d) => {
  try {
    return new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
};

const fmtPts = (n) => {
  const v = Number(n) || 0;
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
};

const RewardHistory = () => {
  const [rows, setRows] = useState(null);
  const { t } = useLanguage();
  const labels = t.admin?.rewardHistory || {};

  const load = useCallback(async () => {
    try {
      const res = await walletAPI.getRewardPointLogs();
      setRows(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setRows([]);
    }
  }, []);

  useEffect(() => {
    load();
    // A top-up or checkout earns/burns points → refresh the ledger.
    const onWallet = () => load();
    window.addEventListener("wallet:updated", onWallet);
    return () => window.removeEventListener("wallet:updated", onWallet);
  }, [load]);

  return (
    <div data-testid="reward-history">
      <p className="card-admin-title">{labels.title || "Reward points history"}</p>
      <div className="action-card overflow-hidden">
        {rows === null ? (
          <div className="px-5 py-6 text-sm text-secondary dark:text-gray-400">{labels.loading || "Loading…"}</div>
        ) : rows.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-secondary dark:text-gray-400" data-testid="reward-history-empty">
            {labels.empty || "No reward activity yet. Earn points every time you top up or spend."}
          </div>
        ) : (
          <ul className="divide-y divide-stokecolor dark:divide-gray-700">
            {rows.map((r) => {
              const credit = r.operationType === "credit";
              return (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-4 px-5 py-4"
                  data-testid={`reward-row-${r.id}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        credit
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                      }`}
                    >
                      {credit ? <LuGift className="h-5 w-5" /> : <LuArrowUpRight className="h-5 w-5" />}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-primary dark:text-white">
                        {credit ? (labels.earned || "Earned") : (labels.redeemed || "Redeemed")}
                      </p>
                      <p className="text-xs text-secondary dark:text-gray-400 truncate">{fmtDate(r.createdAt)}</p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 font-semibold nw-mono ${
                      credit ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                    }`}
                    data-testid={`reward-delta-${r.id}`}
                  >
                    {credit ? "+" : "−"}{fmtPts(r.points)} {labels.pts || "pts"}
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

export default RewardHistory;
