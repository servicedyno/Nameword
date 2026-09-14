import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  FiGlobe,
  FiServer,
  FiShoppingBag,
  FiArrowRight,
  FiRefreshCw,
  FiAlertTriangle,
  FiGift,
} from "react-icons/fi";
import checkoutAPI from "../../api/checkout";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useLanguage } from "../../hooks/useLanguage";
import { money, durationLabel } from "../../utils/checkoutFormat";
import { fmtDateTime } from "../../utils/formatDate";
import Loader from "../../components/common/Loader";
import EmptyState from "../../components/common/EmptyState";
import StatusBadge from "../../components/common/StatusBadge";

// "failed" means the item/order was refunded to the wallet.
const failedLabel = (status) => (status === "failed" ? "Failed · refunded" : undefined);

function OrderCard({ order }) {
  const isTest = order.mode === "dry_run";
  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <div className="nw-card nw-stat-glow relative !p-0 overflow-hidden" data-testid={`order-card-${order.orderNumber}`}>
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-line px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-primary dark:text-white nw-mono">{order.orderNumber}</span>
            <StatusBadge status={order.status || "paid"} label={failedLabel(order.status)} testid={`order-status-${order.orderNumber}`} />
            {isTest && <StatusBadge status="test_mode" />}
          </div>
          <p className="mt-1 text-xs text-ink-soft dark:text-gray-400">{fmtDateTime(order.createdAt)}</p>
        </div>
        <div className="flex items-center justify-between gap-4 sm:justify-end">
          <div className="text-right">
            <p className="text-xs text-ink-soft dark:text-gray-400">Charged</p>
            <p className="text-lg font-extrabold nw-grad-text nw-mono">{money(order.charged_usd)}</p>
          </div>
          <Link
            to={`/checkout/success/${order._id}`}
            className="nw-btn-secondary nw-btn-sm shrink-0"
            data-testid={`order-receipt-${order.orderNumber}`}
          >
            Receipt <FiArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Items */}
      <ul className="divide-y divide-line dark:divide-gray-800">
        {items.map((it, i) => {
          return (
            <li
              key={`${it.type}-${it.domain}-${i}`}
              className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3 min-w-0">
                <span className="nw-icon h-9 w-9 shrink-0">
                  {it.type === "domain" ? <FiGlobe size={16} /> : <FiServer size={16} />}
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-primary dark:text-white break-all">
                    {it.type === "domain" ? it.domain : it.plan_name || "Hosting plan"}
                  </p>
                  <p className="text-xs text-ink-soft dark:text-gray-400">
                    {it.type === "domain"
                      ? `Domain registration · 1 year`
                      : `Hosting for ${it.domain} · ${durationLabel(it.duration_days)}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 pl-12 sm:pl-0 sm:flex-col sm:items-end sm:gap-1">
                <StatusBadge status={it.status || "pending"} label={failedLabel(it.status)} />
                <span className="font-semibold text-primary dark:text-white nw-mono">{money(it.price_usd)}</span>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Footer totals */}
      {(order.points_discount_usd > 0 || order.points_earned > 0 || order.refunded_usd > 0) && (
        <div className="border-t border-line bg-surface-2/60 px-5 py-3 text-sm dark:border-gray-800 dark:bg-gray-900/40 space-y-1.5">
          {order.points_discount_usd > 0 && (
            <div className="flex justify-between text-brand-700 dark:text-brand-300">
              <span className="inline-flex items-center gap-1.5">
                <FiGift size={14} /> Paid with points{order.points_redeemed ? ` (${order.points_redeemed} pts)` : ""}
              </span>
              <span className="nw-mono">− {money(order.points_discount_usd)}</span>
            </div>
          )}
          {order.refunded_usd > 0 && (
            <div className="flex justify-between text-ink-soft dark:text-gray-400">
              <span>Refunded for failed items</span>
              <span className="nw-mono">{money(order.refunded_usd)}</span>
            </div>
          )}
          {order.points_earned > 0 && (
            <div className="flex justify-between text-green-600 dark:text-green-400">
              <span className="inline-flex items-center gap-1.5"><FiGift size={14} /> Points earned</span>
              <span className="nw-mono">+ {order.points_earned} pts</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function OrderHistory() {
  const { t } = useLanguage();
  usePageMeta("Orders", "Your domain and hosting order history.");
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setError(null);
    checkoutAPI
      .listOrders()
      .then((r) => setOrders(Array.isArray(r?.orders) ? r.orders : []))
      .catch((e) => setError(e?.response?.data?.message || "Could not load your orders."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-7" data-testid="order-history-page">
      {/* Title */}
      <div className="flex items-center justify-between gap-3 title-section">
        <h2>{t.admin?.orders || "Orders"}</h2>
        <button
          type="button"
          onClick={load}
          className="nw-btn-ghost nw-btn-sm"
          disabled={loading}
          data-testid="orders-refresh"
        >
          <FiRefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {loading && <Loader />}

      {!loading && error && (
        <div className="nw-card flex items-start gap-3 border-red-400/40" data-testid="orders-error">
          <FiAlertTriangle className="mt-0.5 shrink-0 text-red-500" />
          <div>
            <p className="font-medium text-primary dark:text-white">{error}</p>
            <button onClick={load} className="nw-btn-secondary nw-btn-sm mt-3">Try again</button>
          </div>
        </div>
      )}

      {!loading && !error && orders && orders.length === 0 && (
        <div className="nw-card !p-0" data-testid="orders-empty">
          <EmptyState
            icon={FiShoppingBag}
            title="No orders yet"
            description="When you register a domain or buy hosting, your receipts will show up here."
            primaryTo="/domains"
            primaryLabel="Find a domain"
          />
        </div>
      )}

      {!loading && !error && orders && orders.length > 0 && (
        <div className="space-y-5" data-testid="orders-list">
          {orders.map((o) => (
            <OrderCard key={o._id} order={o} />
          ))}
        </div>
      )}
    </div>
  );
}
