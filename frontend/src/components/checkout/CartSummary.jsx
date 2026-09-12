import { Link } from "react-router";
import { FiGlobe, FiServer } from "react-icons/fi";

import { money, durationLabel } from "../../utils/checkoutFormat";
import { regionLabel } from "../../utils/regions";

const itemTitle = (it) => (it.type === "domain" ? it.domain : it.plan_name);
const itemSubtitle = (it) => {
  if (it.type === "domain") return "Registration · 1 year";
  if (it.type === "hosting") return `Hosting for ${it.domain} · ${durationLabel(it.duration_days)}`;
  if (it.type === "vps") return `VPS · ${regionLabel(it.region)} · monthly`;
  if (it.type === "rdp") return `RDP · ${regionLabel(it.region)} · monthly`;
  return "";
};

// Sticky right-hand order summary shared by the hosting, account and cart steps.
export default function CartSummary({ items, title = "Order summary", footer, children, editHref = "/domains", discount = 0, discountLabel = "Discount", total }) {
  const subtotal = Math.round(items.reduce((s, i) => s + (Number(i.price_usd) || 0), 0) * 100) / 100;
  const grandTotal = total != null ? total : subtotal;
  return (
    <aside className="nw-card lg:sticky lg:top-28 !p-0 overflow-hidden" data-testid="cart-summary">
      <div className="flex items-center justify-between px-5 py-4 border-b border-line dark:border-gray-800">
        <h3 className="font-semibold text-primary dark:text-white">{title}</h3>
        <Link to={editHref} className="text-sm font-medium text-brand-700 dark:text-brand-300 hover:underline" data-testid="cart-summary-edit-link">
          Edit
        </Link>
      </div>
      <ul className="divide-y divide-line dark:divide-gray-800">
        {items.length === 0 && <li className="px-5 py-6 text-sm text-ink-soft dark:text-gray-400">Your cart is empty.</li>}
        {items.map((it) => (
          <li key={it.id || `${it.type}-${it.domain}`} className="flex items-start justify-between gap-3 px-5 py-3.5" data-testid={`summary-item-${it.type}-${it.domain || it.plan_id}`}>
            <div className="flex items-start gap-3 min-w-0">
              <span className="nw-icon h-8 w-8 shrink-0">{it.type === "domain" ? <FiGlobe size={15} /> : <FiServer size={15} />}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary dark:text-white truncate">{itemTitle(it)}</p>
                <p className="text-xs text-ink-soft dark:text-gray-400 truncate">
                  {itemSubtitle(it)}
                </p>
              </div>
            </div>
            <span className="text-sm font-semibold text-primary dark:text-white shrink-0 nw-mono">{money(it.price_usd)}</span>
          </li>
        ))}
      </ul>
      <div className="px-5 py-4 border-t border-line dark:border-gray-800 space-y-2">
        <div className="flex items-center justify-between text-sm text-ink-soft dark:text-gray-400">
          <span>Subtotal</span>
          <span className="nw-mono">{money(subtotal)}</span>
        </div>
        <div className="flex items-center justify-between text-sm text-ink-soft dark:text-gray-400">
          <span>Taxes</span>
          <span className="nw-mono">$0.00</span>
        </div>
        {discount > 0 && (
          <div className="flex items-center justify-between text-sm text-brand-700 dark:text-brand-300" data-testid="summary-discount">
            <span>{discountLabel}</span>
            <span className="nw-mono">− {money(discount)}</span>
          </div>
        )}
        <div className="flex items-center justify-between pt-2 border-t border-dashed border-line dark:border-gray-800">
          <span className="font-semibold text-primary dark:text-white">Total</span>
          <span className="text-xl font-bold text-primary dark:text-white nw-mono" data-testid="cart-summary-total">{money(grandTotal)}</span>
        </div>
        {children}
      </div>
      {footer && <div className="px-5 pb-5">{footer}</div>}
    </aside>
  );
}
