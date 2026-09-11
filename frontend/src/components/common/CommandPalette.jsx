import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router";
import { useLanguage } from "../../hooks/useLanguage";
import {
  LuSearch, LuArrowRight, LuLayoutDashboard, LuGlobe, LuNetwork,
  LuServer, LuCloud, LuMonitor, LuMail, LuCode, LuWallet, LuGift, LuRepeat,
  LuReceipt, LuSettings, LuUser, LuLifeBuoy, LuPlus,
} from "react-icons/lu";

// Destinations + quick actions for the kept product surface. Labels come from locales/site.*.js -> app.palette
const ITEMS = [
  { key: "registerDomain", to: "/domains", icon: LuPlus, group: "action", keywords: "buy register search domain new private whois" },
  { key: "addFunds", to: "/wallet", icon: LuWallet, group: "action", keywords: "top up add funds money balance crypto card" },
  { key: "dashboard", to: "/dashboard", icon: LuLayoutDashboard, group: "goto", keywords: "overview home dashboard" },
  { key: "domains", to: "/domains", icon: LuGlobe, group: "goto", keywords: "portfolio domains list" },
  { key: "dns", to: "/dns-manager", icon: LuNetwork, group: "goto", keywords: "dns records nameservers zone" },
  { key: "hosting", to: "/hosting", icon: LuServer, group: "goto", keywords: "hosting cpanel websites" },
  { key: "vps", to: "/vps", icon: LuCloud, group: "goto", keywords: "server vps cloud instance offshore linux root" },
  { key: "rdp", to: "/rdp", icon: LuMonitor, group: "goto", keywords: "remote desktop rdp windows" },
  { key: "email", to: "/email", icon: LuMail, group: "goto", keywords: "email mailbox inbox private" },
  { key: "api", to: "/api", icon: LuCode, group: "goto", keywords: "api developer key automation" },
  { key: "wallet", to: "/wallet", icon: LuWallet, group: "billing", keywords: "wallet balance funds prepaid" },
  { key: "rewards", to: "/wallet#rewards", icon: LuGift, group: "billing", keywords: "rewards points loyalty tier badge" },
  { key: "subscriptions", to: "/subscriptions", icon: LuRepeat, group: "billing", keywords: "subscriptions renew recurring" },
  { key: "payments", to: "/payment-history", icon: LuReceipt, group: "billing", keywords: "invoices payments receipts history" },
  { key: "settings", to: "/account-setting", icon: LuSettings, group: "account", keywords: "settings profile security api key password 2fa" },
  { key: "info", to: "/account-information", icon: LuUser, group: "account", keywords: "profile personal info" },
  { key: "help", to: "/help-support", icon: LuLifeBuoy, group: "account", keywords: "help support contact" },
];

export default function CommandPalette({ open, onClose }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { t } = useLanguage();
  const p = t.site.app.palette;

  const items = useMemo(() => ITEMS.map((i) => ({ ...i, label: p.items[i.key] || i.key, groupLabel: p.groups[i.group] || i.group })), [p]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter((i) => (i.label + " " + (i.keywords || "")).toLowerCase().includes(term));
  }, [q, items]);

  useEffect(() => {
    if (open) { setQ(""); setActive(0); const id = setTimeout(() => inputRef.current?.focus(), 40); return () => clearTimeout(id); }
  }, [open]);
  useEffect(() => { setActive(0); }, [q]);

  const select = (item) => { if (!item) return; onClose(); navigate(item.to); };

  const onKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); select(filtered[active]); }
    else if (e.key === "Escape") { e.preventDefault(); onClose(); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 bg-gray-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-white shadow-2xl dark:border-white/[0.1] dark:bg-gray-900 dark:shadow-black/70" onKeyDown={onKey} data-testid="command-palette">
        <div className="flex items-center gap-3 border-b border-line px-4 dark:border-white/[0.06]">
          <LuSearch className="h-5 w-5 shrink-0 text-slate-400" />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder={p.placeholder} className="h-14 w-full bg-transparent text-primary outline-none placeholder:text-slate-400 dark:text-white" />
          <kbd className="hidden rounded border border-line px-1.5 py-0.5 text-xs text-ink-soft dark:border-gray-700 sm:block">ESC</kbd>
        </div>
        <div className="max-h-[52vh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-3 py-8 text-center text-15 text-ink-soft">{p.noResults} “{q}”</p>
          ) : (
            filtered.map((item, i) => (
              <button
                key={item.key}
                onMouseEnter={() => setActive(i)}
                onClick={() => select(item)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${i === active ? "bg-brand-50 dark:bg-white/[0.06]" : ""}`}
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${i === active ? "bg-brand text-on-brand" : "bg-surface-2 text-ink-soft dark:bg-gray-800 dark:text-gray-400"}`}>
                  <item.icon className="h-4 w-4" />
                </span>
                <span className="flex-1 text-15 font-medium text-primary dark:text-white">{item.label}</span>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">{item.groupLabel}</span>
                {i === active && <LuArrowRight className="h-4 w-4 text-brand-600 dark:text-brand-400" />}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
