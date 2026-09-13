import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import { FiAlertTriangle, FiArrowRight, FiCheckCircle, FiGlobe, FiServer, FiSettings, FiXCircle, FiGift } from "react-icons/fi";
import checkoutAPI from "../../api/checkout";
import { usePageMeta } from "../../hooks/usePageMeta";
import { money, durationLabel } from "../../utils/checkoutFormat";
import Loader from "../../components/common/Loader";
import { ConfettiBurst } from "../../components/cart/PaymentSuccessCelebration";
import RewardPointsBanner from "../../components/checkout/RewardPointsBanner";

const STATUS = {
  active: { label: "Active", cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  test_mode: { label: "Test mode", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" },
  failed: { label: "Failed · refunded", cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  pending: { label: "Pending", cls: "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200" },
};

export default function OrderSuccess() {
  usePageMeta("Order complete", "Your order receipt.");
  const { id } = useParams();
  const { state } = useLocation();
  const [order, setOrder] = useState(state?.order && state.order._id === id ? state.order : null);
  const [error, setError] = useState(null);
  // One-time confetti "matching moment" when the receipt loads for a successful
  // order — mirrors the crypto paid celebration for buyers who paid from wallet.
  const [showConfetti, setShowConfetti] = useState(false);
  const celebratedRef = useRef(false);

  useEffect(() => {
    if (order && order.status !== "failed" && !celebratedRef.current) {
      celebratedRef.current = true;
      setShowConfetti(true);
      const t = setTimeout(() => setShowConfetti(false), 2800);
      return () => clearTimeout(t);
    }
  }, [order]);

  useEffect(() => {
    let alive = true;
    checkoutAPI
      .getOrder(id)
      .then((r) => alive && setOrder(r.order))
      .catch((e) => alive && setError(e?.response?.data?.message || "Order not found."));
    return () => {
      alive = false;
    };
  }, [id]);

  if (error) {
    return (
      <div className="text-center py-16" data-testid="order-error">
        <FiXCircle className="mx-auto text-red-500 mb-3" size={36} />
        <p className="text-lg font-semibold text-primary dark:text-white">{error}</p>
        <Link to="/dashboard" className="nw-btn-primary mt-6">Go to dashboard</Link>
      </div>
    );
  }
  if (!order) return <Loader />;

  const isTest = order.mode === "dry_run";
  const headline = order.status === "failed" ? "We couldn't complete your order" : order.status === "partial" ? "Order partially completed" : "Order complete";
  const Icon = order.status === "failed" ? FiXCircle : order.status === "partial" ? FiAlertTriangle : FiCheckCircle;
  const iconCls = order.status === "failed" ? "text-red-500" : order.status === "partial" ? "text-amber-500" : "text-green-500";
  const domains = order.items.filter((i) => i.type === "domain" && i.status !== "failed");

  return (
    <div className="mx-auto max-w-3xl" data-testid="order-success-page">
      {showConfetti && <ConfettiBurst pieces={30} className="fixed inset-0 z-[70]" />}
      <div className="text-center">
        <Icon className={`mx-auto mb-4 ${iconCls}`} size={48} />
        <span className="nw-eyebrow mb-3">Order {order.orderNumber}</span>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-primary dark:text-white" data-testid="order-headline">{headline}</h1>
        <p className="mt-3 nw-lead">
          {order.status === "failed"
            ? "Every item failed to provision, so the full amount was refunded to your wallet."
            : `We charged ${money(order.charged_usd)} from your wallet${order.refunded_usd > 0 ? ` and refunded ${money(order.refunded_usd)} for failed items` : ""}.`}
        </p>
      </div>

      {isTest && (
        <div className="mt-8 flex items-start gap-3 rounded-xl border border-amber-400/40 bg-amber-50 dark:bg-amber-500/10 px-4 py-3" data-testid="order-test-mode-banner">
          <FiAlertTriangle className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-300" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <span className="font-semibold">Test mode.</span> Test mode is on, so nothing was provisioned yet. Your order and wallet charge are recorded exactly as they will be once live.
          </p>
        </div>
      )}

      {order.status !== "failed" && <RewardPointsBanner order={order} />}

      <div className="nw-card mt-8 !p-0 overflow-hidden">
        <ul className="divide-y divide-line dark:divide-gray-800">
          {order.items.map((it, i) => {
            const st = STATUS[it.status] || STATUS.pending;
            return (
              <li key={`${it.type}-${it.domain}-${i}`} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between" data-testid={`order-item-${it.type}-${it.domain}`}>
                <div className="flex items-start gap-3 min-w-0">
                  <span className="nw-icon h-10 w-10 shrink-0">{it.type === "domain" ? <FiGlobe size={18} /> : <FiServer size={18} />}</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-primary dark:text-white break-all">{it.type === "domain" ? it.domain : it.plan_name}</p>
                    <p className="text-xs text-ink-soft dark:text-gray-400">
                      {it.type === "domain" ? `Registration · 1 year · ${it.ns_choice === "registrar" ? "Registrar DNS" : it.ns_choice === "custom" ? "Custom nameservers" : "Cloudflare DNS"}` : `Hosting for ${it.domain} · ${durationLabel(it.duration_days)}`}
                    </p>
                    {it.message && <p className="mt-1 text-xs text-ink-soft dark:text-gray-400">{it.message}</p>}
                    {it.ns_choice === "custom" && Array.isArray(it.nameservers) && it.nameservers.length > 0 && (
                      <p className="mt-1 text-xs text-ink-soft dark:text-gray-400 nw-mono">NS: {it.nameservers.join(", ")}</p>
                    )}
                    {Array.isArray(it.upstream?.result?.nameservers) && (
                      <p className="mt-1 text-xs text-ink-soft dark:text-gray-400 nw-mono">NS: {it.upstream.result.nameservers.join(", ")}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.cls}`} data-testid={`order-item-status-${it.domain}`}>{st.label}</span>
                  <span className="font-semibold text-primary dark:text-white nw-mono">{money(it.price_usd)}</span>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="border-t border-line dark:border-gray-800 bg-surface-2/60 dark:bg-gray-900/40 px-5 py-4 space-y-1.5 text-sm">
          {order.points_discount_usd > 0 && (
            <div className="flex justify-between text-brand-700 dark:text-brand-300" data-testid="order-points-discount">
              <span>Paid with reward points{order.points_redeemed ? ` (${order.points_redeemed} pts)` : ""}</span>
              <span className="nw-mono">− {money(order.points_discount_usd)}</span>
            </div>
          )}
          <div className="flex justify-between text-ink-soft dark:text-gray-400"><span>Charged from wallet</span><span className="nw-mono" data-testid="order-charged">{money(order.charged_usd)}</span></div>
          {order.refunded_usd > 0 && <div className="flex justify-between text-ink-soft dark:text-gray-400"><span>Refunded</span><span className="nw-mono">{money(order.refunded_usd)}</span></div>}
          <div className="flex justify-between font-semibold text-primary dark:text-white"><span>Wallet balance now</span><span className="nw-mono" data-testid="order-wallet-after">{money(order.wallet_balance_after_usd)}</span></div>
          {order.points_earned > 0 && (
            <div className="flex justify-between pt-1 text-green-600 dark:text-green-400" data-testid="order-points-earned">
              <span className="inline-flex items-center gap-1.5"><FiGift size={14} /> Reward points earned</span>
              <span className="nw-mono">+ {order.points_earned} pts</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link to="/dashboard" className="nw-btn-primary" data-testid="order-dashboard-link">Go to dashboard <FiArrowRight size={16} /></Link>
        {domains.length > 0 && !isTest && (
          <Link to={`/dns-manager?domain=${encodeURIComponent(domains[0].domain)}`} className="nw-btn-secondary" data-testid="order-dns-link"><FiSettings size={16} /> Manage DNS</Link>
        )}
        <Link to="/domains" className="nw-btn-ghost" data-testid="order-search-more-link">Register another domain</Link>
      </div>
    </div>
  );
}
