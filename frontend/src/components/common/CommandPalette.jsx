import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  LuSearch, LuArrowRight, LuLayoutDashboard, LuGlobe, LuSend, LuNetwork,
  LuServer, LuCloud, LuMonitor, LuShieldCheck, LuMail, LuWallet, LuRepeat,
  LuReceipt, LuSettings, LuUser, LuLifeBuoy, LuPlus,
} from "react-icons/lu";

const ITEMS = [
  { label: "Register a new domain", to: "/home", icon: LuPlus, group: "Action", keywords: "buy register search domain new" },
  { label: "Add funds to wallet", to: "/wallet", icon: LuWallet, group: "Action", keywords: "top up add funds money balance" },
  { label: "Dashboard", to: "/dashboard", icon: LuLayoutDashboard, group: "Go to", keywords: "overview home" },
  { label: "My Domains", to: "/domain-portfolio", icon: LuGlobe, group: "Go to", keywords: "portfolio domains list" },
  { label: "DNS Management", to: "/dns-management", icon: LuNetwork, group: "Go to", keywords: "dns records nameservers" },
  { label: "Transfer a Domain", to: "/transfer-domain", icon: LuSend, group: "Go to", keywords: "transfer in out epp" },
  { label: "Websites & Hosting", to: "/websites", icon: LuServer, group: "Go to", keywords: "hosting cpanel websites plesk" },
  { label: "VPS", to: "/vps", icon: LuCloud, group: "Go to", keywords: "server vps cloud instance" },
  { label: "RDP", to: "/rdp", icon: LuMonitor, group: "Go to", keywords: "remote desktop rdp" },
  { label: "SSL Certificates", to: "/ssl", icon: LuShieldCheck, group: "Go to", keywords: "ssl https secure certificate" },
  { label: "Email", to: "/email", icon: LuMail, group: "Go to", keywords: "email mailbox inbox" },
  { label: "Wallet", to: "/wallet", icon: LuWallet, group: "Billing", keywords: "wallet balance funds" },
  { label: "Subscriptions", to: "/subscriptions", icon: LuRepeat, group: "Billing", keywords: "subscriptions renew recurring" },
  { label: "Payment History", to: "/payment-history", icon: LuReceipt, group: "Billing", keywords: "invoices payments receipts" },
  { label: "Account Settings", to: "/account-setting", icon: LuSettings, group: "Account", keywords: "settings profile security api key password" },
  { label: "Account Information", to: "/account-information", icon: LuUser, group: "Account", keywords: "profile personal info" },
  { label: "Help & Support", to: "/help-support", icon: LuLifeBuoy, group: "Account", keywords: "help support contact chat" },
];

export default function CommandPalette({ open, onClose }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return ITEMS;
    return ITEMS.filter((i) => (i.label + " " + (i.keywords || "")).toLowerCase().includes(term));
  }, [q]);

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
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900" onKeyDown={onKey}>
        <div className="flex items-center gap-3 border-b border-line px-4 dark:border-gray-800">
          <LuSearch className="h-5 w-5 shrink-0 text-slate-400" />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search or jump to…" className="h-14 w-full bg-transparent text-primary outline-none placeholder:text-slate-400 dark:text-white" />
          <kbd className="hidden rounded border border-line px-1.5 py-0.5 text-xs text-ink-soft dark:border-gray-700 sm:block">ESC</kbd>
        </div>
        <div className="max-h-[52vh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-3 py-8 text-center text-15 text-ink-soft">No results for “{q}”</p>
          ) : (
            filtered.map((item, i) => (
              <button
                key={item.label}
                onMouseEnter={() => setActive(i)}
                onClick={() => select(item)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${i === active ? "bg-brand-50 dark:bg-gray-800" : ""}`}
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${i === active ? "bg-brand text-white" : "bg-surface-2 text-ink-soft dark:bg-gray-800 dark:text-gray-400"}`}>
                  <item.icon className="h-4 w-4" />
                </span>
                <span className="flex-1 text-15 font-medium text-primary dark:text-white">{item.label}</span>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">{item.group}</span>
                {i === active && <LuArrowRight className="h-4 w-4 text-brand" />}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
