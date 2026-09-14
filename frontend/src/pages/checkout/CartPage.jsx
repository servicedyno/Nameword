import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { FiAlertTriangle, FiArrowRight, FiGlobe, FiPlus, FiServer, FiTrash2, FiCreditCard, FiRefreshCw, FiGift } from "react-icons/fi";
import { FaBitcoin } from "react-icons/fa";
import { useAuth } from "../../hooks/useAuth";
import { useCart } from "../../hooks/useCart";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useAlert } from "../../context/AlertContext";
import checkoutAPI from "../../api/checkout";
import CartSummary from "../../components/checkout/CartSummary";
import CryptoCheckoutModal from "../../components/cart/CryptoCheckoutModal";
import EmptyCartSuggestions from "../../components/cart/EmptyCartSuggestions";
import { money, durationLabel } from "../../utils/checkoutFormat";
import { regionLabel } from "../../utils/regions";
import Loader from "../../components/common/Loader";

const newClientOrderId = () => `web_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

function DomainLine({ item, hosting, problem, onRemove, onNsChange, onNsListChange }) {
  const nsIncomplete = item.ns_choice === "custom" && (item.nameservers || []).filter(Boolean).length < 2;
  return (
    <div className={`nw-card !p-0 overflow-hidden ${problem ? "border-red-300 dark:border-red-800" : ""}`} data-testid={`cart-item-domain-${item.domain}`}>
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <span className="nw-icon h-10 w-10 shrink-0"><FiGlobe size={18} /></span>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-primary dark:text-white break-all">{item.domain}</p>
            <p className="text-sm text-ink-soft dark:text-gray-400">Domain registration · 1 year · WHOIS privacy included</p>
            <label className="mt-3 block text-xs font-medium text-ink-soft dark:text-gray-400">
              Nameservers
              <select
                value={item.ns_choice || "cloudflare"}
                onChange={(e) => onNsChange(item.id, e.target.value)}
                className="nw-input mt-1 !py-2 !px-3 text-sm max-w-xs"
                data-testid={`cart-ns-select-${item.domain}`}
              >
                <option value="cloudflare">Cloudflare DNS (recommended, free)</option>
                <option value="registrar">Registrar default</option>
                <option value="custom">Custom nameservers</option>
              </select>
            </label>
            {item.ns_choice === "custom" && (
              <div className="mt-2 max-w-xs" data-testid={`cart-ns-custom-${item.domain}`}>
                <textarea
                  rows={2}
                  value={(item.nameservers || []).join(", ")}
                  onChange={(e) => onNsListChange(item.id, e.target.value.split(/[\s,]+/).map((x) => x.trim()).filter(Boolean))}
                  placeholder="ns1.example.com, ns2.example.com"
                  className="nw-input !py-2 !px-3 text-sm w-full"
                  data-testid={`cart-ns-input-${item.domain}`}
                />
                <p className={`mt-1 text-xs ${nsIncomplete ? "text-red-600 dark:text-red-300" : "text-ink-soft dark:text-gray-400"}`}>
                  {nsIncomplete ? "Enter at least two nameservers." : "Enter 2–4 nameserver hostnames, comma or space separated."}
                </p>
              </div>
            )}
            {problem && (
              <p className="mt-3 inline-flex items-center gap-2 text-sm text-red-600 dark:text-red-300" data-testid={`cart-item-problem-${item.domain}`}>
                <FiAlertTriangle /> {problem}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
          <span className="text-lg font-bold text-primary dark:text-white nw-mono">{money(item.price_usd)}<span className="text-xs font-normal text-ink-soft">/yr</span></span>
          <button type="button" onClick={() => onRemove(item.id)} className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-red-600 dark:text-gray-400 dark:hover:text-red-300" data-testid={`cart-remove-${item.domain}`}>
            <FiTrash2 size={15} /> Remove
          </button>
        </div>
      </div>

      <div className="border-t border-line dark:border-gray-800 bg-surface-2/60 dark:bg-gray-900/40 px-5 py-4">
        {hosting ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" data-testid={`cart-item-hosting-${item.domain}`}>
            <div className="flex items-start gap-3 min-w-0">
              <span className="nw-icon h-9 w-9 shrink-0"><FiServer size={16} /></span>
              <div className="min-w-0">
                <p className="font-semibold text-primary dark:text-white">{hosting.plan_name}</p>
                <p className="text-xs text-ink-soft dark:text-gray-400">Hosting · {durationLabel(hosting.duration_days)} · {(hosting.features || []).slice(0, 2).join(" · ")}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-1">
              <span className="font-bold text-primary dark:text-white nw-mono">{money(hosting.price_usd)}</span>
              <div className="flex items-center gap-3 text-sm">
                <Link to={`/checkout/hosting?domain=${encodeURIComponent(item.domain)}`} className="font-medium text-brand-700 dark:text-brand-300 hover:underline" data-testid={`cart-change-hosting-${item.domain}`}>Change</Link>
                <button type="button" onClick={() => onRemove(hosting.id)} className="text-ink-soft hover:text-red-600 dark:text-gray-400 dark:hover:text-red-300" data-testid={`cart-remove-hosting-${item.domain}`}>Remove</button>
              </div>
            </div>
          </div>
        ) : (
          <Link to={`/checkout/hosting?domain=${encodeURIComponent(item.domain)}`} className="inline-flex items-center gap-2 text-sm font-medium text-brand-700 dark:text-brand-300 hover:underline" data-testid={`cart-add-hosting-${item.domain}`}>
            <FiPlus size={15} /> Add hosting for {item.domain}
          </Link>
        )}
      </div>
    </div>
  );
}

function ServerLine({ item, onRemove }) {
  const label = item.type === "rdp" ? "RDP" : "VPS";
  return (
    <div className="nw-card !p-5 flex items-center justify-between gap-4" data-testid={`cart-item-server-${item.id}`}>
      <div className="flex items-start gap-3 min-w-0">
        <span className="nw-icon h-10 w-10 shrink-0"><FiServer size={18} /></span>
        <div className="min-w-0">
          <p className="font-semibold text-primary dark:text-white">{item.plan_name || item.plan_id}</p>
          <p className="text-sm text-ink-soft dark:text-gray-400">
            {label} · {regionLabel(item.region)} · {item.type === "vps" ? (item.os || "ubuntu") : "Windows"} · monthly
          </p>
          {item.hostname && <p className="text-xs text-ink-soft dark:text-gray-400 mt-0.5">Hostname: {item.hostname}</p>}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="font-bold text-primary dark:text-white nw-mono">{money(item.price_usd)}<span className="text-xs font-normal text-ink-soft">/mo</span></span>
        <button type="button" onClick={() => onRemove(item.id)} className="text-sm text-ink-soft hover:text-red-600 dark:text-gray-400" data-testid={`cart-remove-server-${item.id}`}>Remove</button>
      </div>
    </div>
  );
}

export default function CartPage() {
  usePageMeta("Cart", "Review your order and pay from your wallet.");
  const { isAuthenticated, loading } = useAuth();
  const cart = useCart();
  const navigate = useNavigate();
  const { showAlert } = useAlert();

  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [problems, setProblems] = useState({});
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState(null);
  const [showCrypto, setShowCrypto] = useState(false);
  const clientOrderId = useRef(newClientOrderId());

  const orderPayload = useMemo(() => cart.toPayload(), [cart.items]);
  // Quote only needs price-affecting fields — exclude custom nameservers so editing
  // them doesn't trigger a slow live re-price on every keystroke.
  const quotePayload = useMemo(
    () => orderPayload.map((i) => { const { nameservers, ...rest } = i; return rest; }),
    [orderPayload]
  );
  const quoteKey = JSON.stringify(quotePayload);

  const refreshQuote = useCallback(async () => {
    if (!isAuthenticated || quotePayload.length === 0) {
      setQuote(null);
      return;
    }
    setQuoting(true);
    try {
      const q = await checkoutAPI.quote(quotePayload);
      setQuote(q);
      setProblems({});
      // Sync live prices back into the local cart.
      for (const it of q.items || []) {
        const local = cart.items.find((c) =>
          c.type === it.type &&
          (it.type === "domain" || it.type === "hosting"
            ? c.domain === it.domain
            : c.plan_id === it.plan_id && c.region === it.region && Number(c.price_usd) !== Number(it.price_usd))
        );
        if (local && Number(local.price_usd) !== Number(it.price_usd)) cart.update(local.id, { price_usd: it.price_usd });
      }
    } catch (err) {
      const d = err?.response?.data;
      if (d?.error === "domain_unavailable" && d?.domain) setProblems({ [d.domain]: d.message });
      else showAlert(d?.message || "Could not refresh your cart prices.", { type: "fail" });
      setQuote(null);
    } finally {
      setQuoting(false);
    }
  }, [isAuthenticated, quoteKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    clientOrderId.current = newClientOrderId();
    setPayError(null);
    refreshQuote();
  }, [refreshQuote]);

  if (loading) return <Loader />;
  if (!isAuthenticated) return <Navigate to={cart.isEmpty ? "/domains" : "/checkout/account"} replace />;

  const walletBalance = quote?.wallet_balance_usd;
  const subtotal = quote?.subtotal_usd ?? cart.subtotal;
  const pointValue = quote?.point_value_usd ?? 0.02;
  const pointsBalance = Number(quote?.points_balance ?? 0);
  // Points are auto-applied server-side (max redeemable); reflect that here.
  const appliedPoints = Number(quote?.points_applied ?? 0);
  const pointsDiscount = Number(quote?.points_discount_usd ?? 0);
  const payable = Number(quote?.payable_usd ?? Math.round(Math.max(0, subtotal - pointsDiscount) * 100) / 100);
  const shortfall = walletBalance == null ? 0 : Math.max(0, Math.round((payable - walletBalance) * 100) / 100);
  const hasProblems = Object.keys(problems).length > 0;
  const customNsIncomplete = cart.domains.some(
    (d) => d.ns_choice === "custom" && (d.nameservers || []).filter(Boolean).length < 2
  );
  const canPay = !!quote && !quoting && !paying && !hasProblems && !customNsIncomplete && shortfall <= 0 && cart.count > 0;

  const pay = async () => {
    setPaying(true);
    setPayError(null);
    try {
      const res = await checkoutAPI.createOrder(orderPayload, clientOrderId.current, {});
      const order = res?.order;
      cart.clear();
      window.dispatchEvent(new Event("wallet:updated"));
      navigate(`/checkout/success/${order._id}`, { replace: true, state: { order } });
    } catch (err) {
      const d = err?.response?.data;
      if (d?.error === "insufficient_wallet_balance") {
        setPayError(`Your wallet is short by ${money(d.shortfall_usd)}. Top up and try again.`);
        refreshQuote();
      } else if (d?.error === "domain_unavailable" && d?.domain) {
        setProblems({ [d.domain]: d.message });
        setPayError(d.message);
      } else {
        setPayError(d?.message || "Payment failed. Please try again.");
      }
      clientOrderId.current = newClientOrderId();
    } finally {
      setPaying(false);
    }
  };

  // Direct crypto-order payment (bypasses the wallet). On confirmation the order
  // is provisioned and reward points are earned on the crypto paid.
  const payWithCrypto = () => {
    setPayError(null);
    setShowCrypto(true);
  };
  const onCryptoSuccess = (order) => {
    setShowCrypto(false);
    cart.clear();
    window.dispatchEvent(new Event("wallet:updated"));
    navigate(`/checkout/success/${order._id}`, { replace: true, state: { order } });
  };

  const onRemove = (id) => {
    cart.remove(id);
    setProblems({});
  };

  return (
    <div data-testid="cart-page">
      <span className="nw-eyebrow mb-4">Step 4 · Cart & pay</span>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-primary dark:text-white">Your cart</h1>
        <Link to="/domains" className="nw-btn-ghost nw-btn-sm" data-testid="cart-add-domain-link"><FiPlus size={15} /> Add another domain</Link>
      </div>

      {cart.isEmpty ? (
        <div className="mt-10" data-testid="cart-empty-state">
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line dark:border-gray-800 px-6 py-12 text-center">
            <span className="nw-icon h-14 w-14 rounded-2xl"><FiGlobe size={26} /></span>
            <p className="mt-4 text-lg font-semibold text-primary dark:text-white">Your cart is empty</p>
            <p className="mt-1 text-sm text-ink-soft dark:text-gray-400">Pick something below — everything is paid from your prepaid wallet, no card stored.</p>
            <Link to="/domains" className="nw-btn-primary mt-6" data-testid="cart-empty-search-link">Search domains <FiArrowRight size={16} /></Link>
          </div>
          <p className="nw-eyebrow mt-10 mb-4">Popular right now</p>
          <EmptyCartSuggestions />
        </div>
      ) : (
        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
          <section className="space-y-5">
            {quote?.mode === "dry_run" && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-400/40 bg-amber-50 dark:bg-amber-500/10 px-4 py-3" data-testid="cart-test-mode-banner">
                <FiAlertTriangle className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-300" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <span className="font-semibold">Test mode.</span> Test mode is on: your wallet is charged exactly as in live mode and the order is recorded, but nothing is provisioned yet.
                </p>
              </div>
            )}
            {cart.domains.map((d) => (
              <DomainLine key={d.id} item={d} hosting={cart.hostingFor(d.domain)} problem={problems[d.domain]} onRemove={onRemove} onNsChange={(id, ns) => cart.update(id, { ns_choice: ns })} onNsListChange={(id, list) => cart.update(id, { nameservers: list })} />
            ))}
            {cart.hosting.filter((h) => !cart.hasDomain(h.domain)).map((h) => (
              <div key={h.id} className="nw-card !p-5 flex items-center justify-between gap-4" data-testid={`cart-item-hosting-${h.domain}`}>
                <div className="flex items-start gap-3 min-w-0">
                  <span className="nw-icon h-10 w-10 shrink-0"><FiServer size={18} /></span>
                  <div className="min-w-0">
                    <p className="font-semibold text-primary dark:text-white">{h.plan_name}</p>
                    <p className="text-sm text-ink-soft dark:text-gray-400">Hosting for {h.domain} · {durationLabel(h.duration_days)}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-bold text-primary dark:text-white nw-mono">{money(h.price_usd)}</span>
                  <button type="button" onClick={() => onRemove(h.id)} className="text-sm text-ink-soft hover:text-red-600 dark:text-gray-400" data-testid={`cart-remove-hosting-${h.domain}`}>Remove</button>
                </div>
              </div>
            ))}
            {cart.servers.map((s) => (
              <ServerLine key={s.id} item={s} onRemove={onRemove} />
            ))}
          </section>

          <CartSummary
            items={cart.items}
            discount={pointsDiscount}
            discountLabel="Reward points"
            total={payable}
            footer={
              <div className="space-y-3" data-testid="cart-payment-panel">
                {pointsBalance > 0 && (
                  <div className="rounded-xl border border-line dark:border-gray-800 p-4" data-testid="cart-rewards-panel">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 text-sm font-medium text-primary dark:text-white">
                        <FiGift className="text-brand-600 dark:text-brand-400" /> Reward points
                      </span>
                      <span className="text-xs text-ink-soft dark:text-gray-400" data-testid="cart-points-balance">
                        {pointsBalance} pts · {money(pointsBalance * pointValue)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-ink-soft dark:text-gray-400" data-testid="cart-points-applied-note">
                      {appliedPoints > 0 ? (
                        <>Auto-applied <span className="font-semibold text-primary dark:text-white" data-testid="cart-points-applied">{appliedPoints}</span> pts
                        <span className="text-brand-700 dark:text-brand-300"> (− {money(pointsDiscount)})</span> to this order.</>
                      ) : (
                        <>Your points are applied automatically at checkout.</>
                      )}
                    </p>
                  </div>
                )}
                <div className="rounded-xl border border-line dark:border-gray-800 p-4">
                  {pointsDiscount > 0 && (
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="inline-flex items-center gap-1.5 text-brand-700 dark:text-brand-300"><FiGift size={14} /> Points discount</span>
                      <span className="font-semibold text-brand-700 dark:text-brand-300 nw-mono" data-testid="cart-points-discount">− {money(pointsDiscount)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-2 text-ink-soft dark:text-gray-400"><FiCreditCard /> Wallet balance</span>
                    <span className="font-semibold text-primary dark:text-white nw-mono" data-testid="cart-wallet-balance">{quoting && walletBalance == null ? "…" : money(walletBalance)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-ink-soft dark:text-gray-400">After this order</span>
                    <span className={`font-semibold nw-mono ${shortfall > 0 ? "text-red-600 dark:text-red-300" : "text-primary dark:text-white"}`} data-testid="cart-wallet-after">
                      {walletBalance == null ? "…" : shortfall > 0 ? `− ${money(shortfall)} short` : money(Math.round((walletBalance - payable) * 100) / 100)}
                    </span>
                  </div>
                  {shortfall > 0 && (
                    <p className="mt-3 text-xs text-ink-soft dark:text-gray-400" data-testid="cart-shortfall-hint">
                      Not enough wallet balance — use <span className="font-medium text-primary dark:text-white">Pay with crypto</span> below to pay this order directly and earn reward points.
                    </p>
                  )}
                </div>
                {payError && (
                  <p className="rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-300" role="alert" data-testid="cart-pay-error">{payError}</p>
                )}
                <button type="button" onClick={pay} disabled={!canPay} className="nw-btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed" data-testid="cart-pay-button">
                  {paying ? "Processing…" : quoting ? "Updating prices…" : payable <= 0 ? `Pay with ${appliedPoints} points` : `Pay ${money(payable)} from wallet`}
                </button>
                {payable > 0 && (
                  <button
                    type="button"
                    onClick={payWithCrypto}
                    disabled={paying || quoting || hasProblems || customNsIncomplete || cart.count === 0}
                    className="nw-btn-secondary w-full disabled:opacity-60 disabled:cursor-not-allowed"
                    data-testid="cart-pay-crypto-button"
                  >
                    <FaBitcoin size={16} /> Pay {money(payable)} with crypto
                  </button>
                )}
                <button type="button" onClick={refreshQuote} disabled={quoting} className="inline-flex w-full items-center justify-center gap-2 text-xs text-ink-soft hover:text-primary dark:text-gray-400 dark:hover:text-white" data-testid="cart-refresh-quote">
                  <FiRefreshCw size={12} className={quoting ? "animate-spin" : ""} /> Prices are re-checked live at payment
                </button>
              </div>
            }
          />
        </div>
      )}

      {showCrypto && (
        <CryptoCheckoutModal
          orderPayload={orderPayload}
          payable={payable}
          onClose={() => setShowCrypto(false)}
          onSuccess={onCryptoSuccess}
        />
      )}
    </div>
  );
}
