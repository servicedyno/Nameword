import { useCallback, useEffect, useRef, useState } from "react";
import { FaBitcoin, FaEthereum } from "react-icons/fa6";
import { SiTether, SiLitecoin, SiDogecoin, SiBitcoincash, SiSolana, SiPolygon, SiRipple } from "react-icons/si";
import { LuCoins } from "react-icons/lu";
import { walletAPI } from "../../../api/walletApi";
import { useLanguage } from "../../../hooks/useLanguage";

const COIN_ICONS = {
  BTC: { Icon: FaBitcoin, color: "#f7931a" },
  ETH: { Icon: FaEthereum, color: "#627eea" },
  LTC: { Icon: SiLitecoin, color: "#345d9d" },
  DOGE: { Icon: SiDogecoin, color: "#c2a633" },
  BCH: { Icon: SiBitcoincash, color: "#0ac18e" },
  SOL: { Icon: SiSolana, color: "#9945ff" },
  POLYGON: { Icon: SiPolygon, color: "#8247e5" },
  MATIC: { Icon: SiPolygon, color: "#8247e5" },
  XRP: { Icon: SiRipple, color: "#00aae4" },
  TRX: { Icon: LuCoins, color: "#eb0029" },
  USDT: { Icon: SiTether, color: "#26a17b" },
  USDC: { Icon: LuCoins, color: "#2775ca" },
};
const coinMeta = (code) => {
  const c = String(code || "").toUpperCase();
  const base = c.includes("-") ? c.split("-")[0] : c;
  const m = COIN_ICONS[base] || { Icon: LuCoins, color: "#6366f1" };
  return { Icon: m.Icon, color: m.color, label: base };
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

// Auto-refresh cadence + a hard cap so we NEVER poll forever if a user opened a
// top-up but never actually sent the crypto.
const POLL_MS = 60000; // re-check pending top-ups once a minute
const MAX_POLLS = 20; // ~20 minutes, then stop (the 5-min backend job still credits late payments)

// A top-up worth re-checking: still pending/confirming and not past its expiry.
const isLivePending = (r) =>
  (r.status === "pending" || r.status === "confirming") &&
  (!r.expireAt || new Date(r.expireAt).getTime() > Date.now());

const TopupHistory = () => {
  const [rows, setRows] = useState(null);
  const { t } = useLanguage();
  const labels = t.admin?.topupHistory || {};
  const statusLabels = labels.status || {};

  const rowsRef = useRef([]);
  const timerRef = useRef(null);
  const pollCountRef = useRef(0);

  const load = useCallback(async ({ probe = false } = {}) => {
    try {
      // On auto-polls, actively query each live pending payment — that hits the
      // provider and credits the wallet if the crypto has landed.
      if (probe) {
        const live = rowsRef.current.filter(isLivePending);
        if (live.length) {
          let credited = false;
          await Promise.all(
            live.map(async (r) => {
              try {
                const s = await walletAPI.getCryptoTopupStatus(r.paymentId);
                const d = s?.data || {};
                if (d.credited === true || d.status === "credited") credited = true;
              } catch { /* transient — ignore */ }
            })
          );
          // A payment just credited → refresh the balance chip + reward points too.
          if (credited) window.dispatchEvent(new Event("wallet:updated"));
        }
      }

      const res = await walletAPI.getCryptoTopups();
      const list = Array.isArray(res?.data) ? res.data : [];
      rowsRef.current = list;
      setRows(list);

      // Schedule the next quiet re-check ONLY while a live pending top-up exists
      // and we're within the polling window.
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      if (list.some(isLivePending) && pollCountRef.current < MAX_POLLS) {
        timerRef.current = setTimeout(() => {
          pollCountRef.current += 1;
          load({ probe: true });
        }, POLL_MS);
      }
    } catch {
      if (!probe) setRows([]);
    }
  }, []);

  useEffect(() => {
    load();
    // A fresh top-up (or a credit elsewhere) resets the polling window.
    const onWallet = () => { pollCountRef.current = 0; load(); };
    window.addEventListener("wallet:updated", onWallet);
    return () => {
      window.removeEventListener("wallet:updated", onWallet);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
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
