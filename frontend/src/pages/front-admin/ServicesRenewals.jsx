import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  FiGlobe,
  FiServer,
  FiMonitor,
  FiRefreshCw,
  FiAlertTriangle,
  FiClock,
  FiExternalLink,
  FiCalendar,
} from "react-icons/fi";
import checkoutAPI from "../../api/checkout";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useAlert } from "../../context/AlertContext";
import { money } from "../../utils/checkoutFormat";
import Loader from "../../components/common/Loader";

const TYPE_META = {
  domain: { icon: FiGlobe, label: "Domain", manage: (r) => `/dns-manager?domain=${encodeURIComponent(r.domain || "")}`, manageLabel: "DNS" },
  hosting: { icon: FiServer, label: "Hosting", manage: () => "/hosting", manageLabel: "Manage" },
  vps: { icon: FiServer, label: "VPS", manage: () => "/vps", manageLabel: "Manage" },
  rdp: { icon: FiMonitor, label: "RDP", manage: () => "/rdp", manageLabel: "Manage" },
};

const BUCKET_META = {
  expired: { label: "Expired", cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  expiring_soon: { label: "Expiring soon", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" },
  upcoming: { label: "Active", cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  unknown: { label: "—", cls: "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200" },
};

const fmtDate = (d) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return String(d);
  }
};

const expiryPhrase = (days) => {
  if (days == null) return "No expiry tracked";
  if (days < 0) return `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`;
  if (days === 0) return "Expires today";
  return `Renews / expires in ${days} day${days === 1 ? "" : "s"}`;
};

function AutoRenewToggle({ on, busy, onToggle, testid }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={busy}
      onClick={onToggle}
      data-testid={testid}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
        on ? "bg-brand-600 dark:bg-brand-500" : "bg-gray-300 dark:bg-gray-600"
      }`}
      title={on ? "Auto-renew is on" : "Auto-renew is off"}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

function RenewalRow({ row, onRenew, onToggle, busyRenew, busyToggle }) {
  const meta = TYPE_META[row.type] || TYPE_META.domain;
  const Icon = meta.icon;
  const bucket = BUCKET_META[row.bucket] || BUCKET_META.unknown;
  const isTest = row.status === "test_mode";
  const key = `${row.order_id}:${row.idx}`;
  return (
    <div className="nw-card !p-0 overflow-hidden" data-testid={`renewal-row-${key}`}>
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <span className="nw-icon h-10 w-10 shrink-0"><Icon size={18} /></span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-primary dark:text-white break-all">{row.title || row.domain || row.plan || meta.label}</p>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${bucket.cls}`}>{bucket.label}</span>
              {isTest && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">Test mode</span>}
            </div>
            <p className="mt-1 text-xs text-ink-soft dark:text-gray-400">{meta.label}{row.plan ? ` · ${row.plan}` : ""}</p>
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-ink-soft dark:text-gray-400">
              <FiClock size={13} /> {expiryPhrase(row.days_until_expiry)}
              <span className="text-ink-muted">·</span>
              <FiCalendar size={13} /> {fmtDate(row.expires_at)}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start gap-3 sm:items-end">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-ink-soft dark:text-gray-400">Auto-renew</span>
            <AutoRenewToggle on={!!row.auto_renew} busy={busyToggle} onToggle={() => onToggle(row)} testid={`renewal-autorenew-${key}`} />
          </div>
          <div className="flex items-center gap-2">
            <Link to={meta.manage(row)} className="nw-btn-ghost nw-btn-sm" data-testid={`renewal-manage-${key}`}>
              {meta.manageLabel} <FiExternalLink size={13} />
            </Link>
            {row.renewable ? (
              <button
                type="button"
                onClick={() => onRenew(row)}
                disabled={busyRenew}
                className="nw-btn-primary nw-btn-sm disabled:opacity-60"
                data-testid={`renewal-renew-${key}`}
              >
                {busyRenew ? "Renewing…" : `Renew${row.price_hint_usd ? ` · ${money(row.price_hint_usd)}` : ""}`}
              </button>
            ) : (
              <span className="text-xs text-ink-soft dark:text-gray-400" title="The provider doesn't support renewal for this product yet">
                Renewal N/A
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ServicesRenewals() {
  usePageMeta("My services", "Track expiry, renew, and manage auto-renew for everything you own.");
  const { showAlert } = useAlert();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState({}); // key -> 'renew' | 'toggle'

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    checkoutAPI
      .renewals(400)
      .then((r) => setData(r))
      .catch((e) => setError(e?.response?.data?.message || "Could not load your services."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => (Array.isArray(data?.renewals) ? data.renewals : []), [data]);
  const summary = data?.summary || { expired: 0, expiring_soon: 0, upcoming: 0 };

  const setRowBusy = (key, val) => setBusy((b) => ({ ...b, [key]: val }));

  const onRenew = async (row) => {
    const key = `${row.order_id}:${row.idx}`;
    setRowBusy(key, "renew");
    try {
      const res = await checkoutAPI.renewItem(row.order_id, row.idx);
      showAlert(`Renewed — charged ${money(res.charged_usd)}. New expiry ${fmtDate(res.expires_at)}.`, { type: "success" });
      window.dispatchEvent(new Event("wallet:updated"));
      load();
    } catch (e) {
      const d = e?.response?.data;
      if (d?.error === "insufficient_wallet_balance") {
        showAlert(`Wallet short by ${money(d.shortfall_usd)} to renew (needs ${money(d.price_usd)}). Top up your wallet.`, { type: "fail" });
      } else {
        showAlert(d?.message || "Renewal failed. Please try again.", { type: "fail" });
      }
    } finally {
      setRowBusy(key, null);
    }
  };

  const onToggle = async (row) => {
    const key = `${row.order_id}:${row.idx}`;
    const next = !row.auto_renew;
    setRowBusy(key, "toggle");
    // optimistic
    setData((prev) => prev && {
      ...prev,
      renewals: prev.renewals.map((r) => (r.order_id === row.order_id && r.idx === row.idx ? { ...r, auto_renew: next } : r)),
    });
    try {
      await checkoutAPI.setAutoRenew(row.order_id, row.idx, next);
      showAlert(next ? "Auto-renew turned on." : "Auto-renew turned off.", { type: "success" });
    } catch (e) {
      // revert
      setData((prev) => prev && {
        ...prev,
        renewals: prev.renewals.map((r) => (r.order_id === row.order_id && r.idx === row.idx ? { ...r, auto_renew: row.auto_renew } : r)),
      });
      showAlert(e?.response?.data?.message || "Could not update auto-renew.", { type: "fail" });
    } finally {
      setRowBusy(key, null);
    }
  };

  return (
    <div className="space-y-7" data-testid="services-renewals-page">
      <div className="flex items-center justify-between gap-3 title-section">
        <h2>My services</h2>
        <button type="button" onClick={load} className="nw-btn-ghost nw-btn-sm" disabled={loading} data-testid="renewals-refresh">
          <FiRefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {!loading && !error && rows.length > 0 && (
        <div className="flex flex-wrap gap-3" data-testid="renewals-summary">
          <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">{summary.expired} expired</span>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">{summary.expiring_soon} expiring soon</span>
          <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300">{summary.upcoming} active</span>
        </div>
      )}

      {loading && <Loader />}

      {!loading && error && (
        <div className="nw-card flex items-start gap-3 border-red-400/40" data-testid="renewals-error">
          <FiAlertTriangle className="mt-0.5 shrink-0 text-red-500" />
          <div>
            <p className="font-medium text-primary dark:text-white">{error}</p>
            <button onClick={load} className="nw-btn-secondary nw-btn-sm mt-3">Try again</button>
          </div>
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div className="nw-card flex flex-col items-center py-14 text-center" data-testid="renewals-empty">
          <span className="nw-icon h-12 w-12"><FiClock size={22} /></span>
          <p className="mt-4 text-lg font-semibold text-primary dark:text-white">Nothing to renew yet</p>
          <p className="mt-1 nw-lead max-w-sm">Domains, hosting and servers you buy will appear here with their expiry, a one-click renew, and an auto-renew switch.</p>
          <Link to="/domains" className="nw-btn-primary mt-6" data-testid="renewals-empty-cta">Find a domain</Link>
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="space-y-4" data-testid="renewals-list">
          {rows.map((row) => {
            const key = `${row.order_id}:${row.idx}`;
            return (
              <RenewalRow
                key={key}
                row={row}
                onRenew={onRenew}
                onToggle={onToggle}
                busyRenew={busy[key] === "renew"}
                busyToggle={busy[key] === "toggle"}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
