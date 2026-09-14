import { useEffect, useState } from "react";
import { Link } from "react-router";
import { FiGlobe, FiServer, FiCloud, FiArrowRight } from "react-icons/fi";
import { resellerProduct } from "../../api/reseller";
import { money } from "../../utils/checkoutFormat";

// Quick-add cards shown when the cart is empty so the page is never a dead end.
export default function EmptyCartSuggestions({ compact = false, onNavigate }) {
  const [vpsFrom, setVpsFrom] = useState(null);

  useEffect(() => {
    let alive = true;
    resellerProduct("vps")
      .getPlans("EU")
      .then((d) => {
        const prices = (d?.plans || []).map((p) => Number(p.price_usd)).filter((n) => n > 0);
        if (alive && prices.length) setVpsFrom(Math.min(...prices));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const items = [
    { to: "/domains", icon: FiGlobe, title: "Register a domain", sub: "Private WHOIS included · live pricing", testid: "empty-cart-domains" },
    { to: "/hosting", icon: FiServer, title: "Offshore cPanel hosting", sub: "7 days or monthly · paid from wallet", testid: "empty-cart-hosting" },
    { to: "/vps", icon: FiCloud, title: "Offshore VPS", sub: vpsFrom ? `From ${money(vpsFrom)}/mo · full root access` : "Full root access · EU or Singapore", testid: "empty-cart-vps" },
  ];

  return (
    <div className={`grid gap-3 ${compact ? "" : "sm:grid-cols-3"}`} data-testid="empty-cart-suggestions">
      {items.map((it) => (
        <Link
          key={it.to}
          to={it.to}
          onClick={onNavigate}
          className={`nw-card nw-card-hover group flex items-center gap-3 !p-4 text-left ${compact ? "" : "sm:flex-col sm:items-start sm:gap-4 sm:!p-5"}`}
          data-testid={it.testid}
        >
          <span className="nw-icon h-10 w-10 shrink-0"><it.icon size={18} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-primary dark:text-white">{it.title}</span>
            <span className="block text-xs text-ink-soft dark:text-gray-400">{it.sub}</span>
          </span>
          <FiArrowRight className="shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600" size={16} />
        </Link>
      ))}
    </div>
  );
}
