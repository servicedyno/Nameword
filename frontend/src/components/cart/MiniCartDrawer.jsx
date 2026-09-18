import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { FiX, FiTrash2, FiGlobe, FiServer, FiArrowRight, FiExternalLink, FiCreditCard } from "react-icons/fi";
import { FaBitcoin } from "react-icons/fa";
import { useCart } from "../../hooks/useCart";
import { useCartUI } from "../../context/CartUIContext";
import { useAuth } from "../../hooks/useAuth";
import checkoutAPI from "../../api/checkout";
import CryptoCheckoutModal from "./CryptoCheckoutModal";
import AcceptedCoins from "./AcceptedCoins";
import EmptyCartSuggestions from "./EmptyCartSuggestions";
import { money } from "../../utils/checkoutFormat";
import { regionLabel } from "../../utils/regions";

const newClientOrderId = () => `web_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function describe(item) {
  if (item.type === "domain") return { icon: <FiGlobe size={16} />, title: item.domain, sub: "Domain · 1 year" };
  if (item.type === "hosting") return { icon: <FiServer size={16} />, title: item.plan_name || "Hosting", sub: `Hosting · ${item.domain}` };
  if (item.type === "vps") return { icon: <FiServer size={16} />, title: item.plan_name || "VPS", sub: `VPS · ${regionLabel(item.region)} · ${item.os || "ubuntu"}` };
  if (item.type === "rdp") return { icon: <FiServer size={16} />, title: item.plan_name || "RDP", sub: `RDP · ${regionLabel(item.region)} · Windows` };
  return { icon: <FiServer size={16} />, title: item.type, sub: "" };
}

export default function MiniCartDrawer() {
  const { isOpen, close, balance } = useCartUI();
  const cart = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [shown, setShown] = useState(false);
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState(null);
  const [showCrypto, setShowCrypto] = useState(false);
  const clientOrderId = useRef(newClientOrderId());

  const payload = useMemo(
    () => cart.toPayload().map(({ nameservers, ...rest }) => rest),
    [cart.items]
  );
  const payloadKey = JSON.stringify(payload);

  const refreshQuote = useCallback(async () => {
    if (!isAuthenticated || payload.length === 0) {
      setQuote(null);
      return;
    }
    setQuoting(true);
    setQuote(null);
    try {
      const q = await checkoutAPI.quote(payload);
      setQuote(q);
    } catch {
      setQuote(null);
    } finally {
      setQuoting(false);
    }
  }, [isAuthenticated, payloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Entrance animation + (re)quote whenever the drawer opens or items change while open.
  useEffect(() => {
    if (isOpen) {
      const id = requestAnimationFrame(() => setShown(true));
      clientOrderId.current = newClientOrderId();
      setPayError(null);
      refreshQuote();
      return () => cancelAnimationFrame(id);
    }
    setShown(false);
  }, [isOpen, refreshQuote]);

  if (!isOpen) return null;

  const walletBalance = quote?.wallet_balance_usd ?? balance;
  const subtotal = quote?.subtotal_usd ?? cart.subtotal;
  const pointsDiscount = round2(quote?.points_discount_usd ?? 0);
  const payable = round2(quote?.payable_usd ?? subtotal);
  const shortfall = walletBalance == null ? null : Math.max(0, round2(payable - walletBalance));
  const walletCovers = shortfall != null && shortfall <= 0;
  const walletShort = shortfall != null && shortfall > 0;
  const canPayWallet = isAuthenticated && !!quote && !quoting && !paying && cart.count > 0 && walletCovers;
  const walletLabel = payable <= 0 ? "Complete order" : `Pay ${money(payable)} from wallet`;

  const pay = async () => {
    setPaying(true);
    setPayError(null);
    try {
      const res = await checkoutAPI.createOrder(cart.toPayload(), clientOrderId.current, {});
      const order = res?.order;
      cart.clear();
      window.dispatchEvent(new Event("wallet:updated"));
      close();
      navigate(`/checkout/success/${order._id}`, { state: { order } });
    } catch (err) {
      const d = err?.response?.data;
      if (d?.error === "insufficient_wallet_balance") {
        setPayError(`Wallet short by ${money(d.shortfall_usd)} — pay with crypto to top up and finish.`);
        refreshQuote();
      } else if (d?.error === "domain_unavailable") {
        setPayError(d.message || "A domain in your cart is no longer available.");
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
    setPayError(null);
    cart.clear();
    window.dispatchEvent(new Event("wallet:updated"));
    close();
    navigate(`/checkout/success/${order._id}`, { state: { order } });
  };

  const goFullCart = () => {
    close();
    navigate("/cart");
  };

  const goTopUp = () => {
    close();
    navigate("/wallet");
  };

  return (
    <>
      <div className="fixed inset-0 z-50" role="dialog" aria-label="Cart" data-testid="mini-cart-drawer">
        <div
          className={`absolute inset-0 bg-gray-950/50 backdrop-blur-sm transition-opacity duration-300 ${shown ? "opacity-100" : "opacity-0"}`}
          onClick={close}
          data-testid="mini-cart-overlay"
        />
        <aside
          className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 dark:bg-gray-950 dark:border-l dark:border-white/[0.06] ${shown ? "translate-x-0" : "translate-x-full"}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-line px-5 py-4 dark:border-white/[0.06]">
            <div>
              <p className="text-lg font-bold text-primary dark:text-white">Your cart</p>
              <p className="text-xs text-ink-soft dark:text-gray-400">{cart.count} item{cart.count === 1 ? "" : "s"}</p>
            </div>
            <button type="button" onClick={close} aria-label="Close cart" className="header-icon-btn h-10 w-10" data-testid="mini-cart-close">
              <FiX size={20} />
            </button>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {cart.isEmpty ? (
              <div className="py-6" data-testid="mini-cart-empty">
                <div className="flex flex-col items-center justify-center text-center">
                  <span className="nw-icon h-12 w-12 rounded-2xl"><FiGlobe size={22} /></span>
                  <p className="mt-3 font-semibold text-primary dark:text-white">Your cart is empty</p>
                  <p className="mt-1 text-sm text-ink-soft dark:text-gray-400">Add a domain, hosting or a server to get started.</p>
                  <button type="button" onClick={() => { close(); navigate("/domains"); }} className="nw-btn-primary mt-5" data-testid="mini-cart-browse">
                    Search domains <FiArrowRight size={16} />
                  </button>
                </div>
                <p className="nw-eyebrow mt-8 mb-3">Popular right now</p>
                <EmptyCartSuggestions compact onNavigate={close} />
              </div>
            ) : (
              <ul className="space-y-3">
                {cart.items.map((item) => {
                  const d = describe(item);
                  return (
                    <li key={item.id} className="flex items-center gap-3 rounded-xl border border-line p-3 dark:border-white/[0.06]" data-testid={`mini-cart-item-${item.type}-${item.domain || item.id}`}>
                      <span className="nw-icon h-9 w-9 shrink-0">{d.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-primary dark:text-white">{d.title}</p>
                        <p className="truncate text-xs text-ink-soft dark:text-gray-400">{d.sub}</p>
                      </div>
                      <span className="shrink-0 text-sm font-bold text-primary dark:text-white nw-mono">{money(item.price_usd)}</span>
                      <button type="button" onClick={() => cart.remove(item.id)} aria-label="Remove" className="shrink-0 text-ink-soft hover:text-red-600 dark:text-gray-400 dark:hover:text-red-300" data-testid={`mini-cart-remove-${item.domain || item.id}`}>
                        <FiTrash2 size={16} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer / pay */}
          {!cart.isEmpty && (
            <div className="border-t border-line px-5 py-4 dark:border-white/[0.06]" data-testid="mini-cart-footer">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="text-ink-soft dark:text-gray-400">Subtotal</span>
                <span className="text-base font-bold text-primary dark:text-white nw-mono" data-testid="mini-cart-subtotal">{money(subtotal)}</span>
              </div>
              {pointsDiscount > 0 && (
                <div className="mb-3 flex items-center justify-between text-xs text-brand-700 dark:text-brand-300" data-testid="mini-cart-points-applied">
                  <span>Reward points applied</span>
                  <span className="nw-mono">− {money(pointsDiscount)}</span>
                </div>
              )}

              {isAuthenticated ? (
                <>
                  {/* Explicit amount-due line so the number on the buttons is never a surprise */}
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-semibold text-primary dark:text-white">Amount due</span>
                    <span className="text-base font-bold text-primary dark:text-white nw-mono" data-testid="mini-cart-amount-due">{money(payable)}</span>
                  </div>

                  <div className="mb-3 flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-1.5 text-ink-soft dark:text-gray-400"><FiCreditCard size={14} /> Wallet balance</span>
                    <span className={`font-semibold nw-mono ${walletShort ? "text-red-600 dark:text-red-300" : "text-primary dark:text-white"}`} data-testid="mini-cart-wallet-balance">
                      {quoting && walletBalance == null ? "…" : money(walletBalance)}
                    </span>
                  </div>

                  {walletShort && (
                    <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-200" data-testid="mini-cart-shortfall">
                      Your wallet is <span className="font-semibold nw-mono">{money(shortfall)}</span> short of the <span className="font-semibold nw-mono">{money(payable)}</span> due. Pay the full amount in crypto below, or top up your wallet first.
                    </p>
                  )}

                  {payError && (
                    <p className="mb-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300" role="alert" data-testid="mini-cart-error">{payError}</p>
                  )}

                  {walletCovers ? (
                    <>
                      {/* Wallet fully covers the order → wallet is the primary action */}
                      <button type="button" onClick={pay} disabled={!canPayWallet} className="nw-btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed" data-testid="mini-cart-pay-button">
                        {paying ? "Processing…" : quoting ? "Updating prices…" : walletLabel}
                      </button>
                      {payable > 0 && (
                        <button
                          type="button"
                          onClick={payWithCrypto}
                          disabled={paying || quoting || cart.count === 0}
                          className="nw-btn-secondary mt-2 w-full disabled:opacity-60 disabled:cursor-not-allowed"
                          data-testid="mini-cart-pay-crypto-button"
                        >
                          <FaBitcoin size={16} /> Pay {money(payable)} with crypto
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Wallet can't cover it → crypto is the primary action, top-up is the alternative.
                          The misleading disabled "Pay from wallet" button is intentionally not shown. */}
                      <button
                        type="button"
                        onClick={payWithCrypto}
                        disabled={paying || quoting || cart.count === 0}
                        className="nw-btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
                        data-testid="mini-cart-pay-crypto-button"
                      >
                        <FaBitcoin size={16} /> Pay {money(payable)} with crypto
                      </button>
                      <button
                        type="button"
                        onClick={goTopUp}
                        disabled={paying}
                        className="nw-btn-secondary mt-2 w-full disabled:opacity-60 disabled:cursor-not-allowed"
                        data-testid="mini-cart-topup-button"
                      >
                        <FiCreditCard size={16} /> Top up wallet
                      </button>
                    </>
                  )}
                </>
              ) : (
                <button type="button" onClick={goFullCart} className="nw-btn-primary w-full" data-testid="mini-cart-guest-checkout">
                  Sign in to checkout <FiArrowRight size={16} />
                </button>
              )}

              <button type="button" onClick={goFullCart} className="mt-2 inline-flex w-full items-center justify-center gap-2 text-xs text-ink-soft hover:text-primary dark:text-gray-400 dark:hover:text-white" data-testid="mini-cart-full-cart-link">
                <FiExternalLink size={12} /> Open full cart (nameservers &amp; reward points)
              </button>

              <div className="mt-3 border-t border-line pt-3 dark:border-white/[0.06]">
                <AcceptedCoins />
              </div>
            </div>
          )}
        </aside>
      </div>

      {showCrypto && (
        <CryptoCheckoutModal orderPayload={cart.toPayload()} payable={payable} onClose={() => setShowCrypto(false)} onSuccess={onCryptoSuccess} />
      )}
    </>
  );
}
