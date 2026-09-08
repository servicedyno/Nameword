import { NavLink, useLocation } from "react-router";
import { favicon } from "../../common/icons";
import { useLanguage } from "../../../hooks/useLanguage";
import {
  LuLayoutDashboard, LuGlobe, LuNetwork, LuServer, LuCloud, LuMonitor,
  LuWallet, LuGift, LuSettings, LuLifeBuoy, LuChevronsLeft, LuChevronsRight,
} from "react-icons/lu";

// Signed-in navigation: Overview · Domains · DNS · Hosting · VPS · RDP · Wallet · Rewards · Settings & API · Help
const RAIL = [
  { key: "overview", to: "/dashboard", icon: LuLayoutDashboard, match: ["/dashboard"] },
  { key: "domains", to: "/domain-portfolio", icon: LuGlobe, match: ["/domain-portfolio", "/domain-overview", "/contact-info", "/transfer-domain"] },
  { key: "dns", to: "/dns-management", icon: LuNetwork, match: ["/dns-management"] },
  { key: "hosting", to: "/websites", icon: LuServer, match: ["/websites", "/setup-websites", "/websites-overview", "/manage-plan", "/upgrade-plan", "/renew-plan"] },
  { key: "vps", to: "/vps", icon: LuCloud, match: ["/vps"] },
  { key: "rdp", to: "/rdp", icon: LuMonitor, match: ["/rdp"] },
  { key: "wallet", to: "/wallet", icon: LuWallet, match: ["/wallet", "/subscriptions", "/payment-history"] },
  { key: "rewards", to: "/wallet#rewards", icon: LuGift, match: [] },
  { key: "settings", to: "/account-setting", icon: LuSettings, match: ["/account-setting", "/account-information", "/change-email"] },
];

function Tip({ children }) {
  return (
    <span className="pointer-events-none absolute left-[54px] z-50 whitespace-nowrap rounded-md border border-white/10 bg-gray-950 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
      {children}
    </span>
  );
}

export default function AppRail({ collapsed, onToggle }) {
  const { pathname, hash } = useLocation();
  const { t } = useLanguage();
  const labels = t.site.app.rail;
  const isActive = (it) => {
    if (it.key === "rewards") return pathname === "/wallet" && hash === "#rewards";
    if (it.key === "wallet" && hash === "#rewards") return false;
    return it.match.some((p) => pathname === p || pathname.startsWith(p));
  };
  return (
    <div className="flex h-full w-[76px] flex-col items-center border-r border-line bg-white py-5 dark:border-white/[0.06] dark:bg-gray-950">
      <NavLink to="/" className="mb-6" title="Nameword">
        <img src={favicon} alt="Nameword" className="h-8 w-8 dark-mode" />
      </NavLink>
      <nav className="flex flex-1 flex-col items-center gap-1.5" aria-label="Primary">
        {RAIL.map((it) => (
          <NavLink key={it.key} to={it.to} title={labels[it.key]} data-testid={`rail-${it.key}`} className={`group app-rail-item ${isActive(it) ? "app-rail-item-active" : ""}`}>
            <it.icon className="h-5 w-5" />
            <Tip>{labels[it.key]}</Tip>
          </NavLink>
        ))}
      </nav>
      <NavLink to="/help-support" title={labels.help} className="group app-rail-item mb-2">
        <LuLifeBuoy className="h-5 w-5" />
        <Tip>{labels.help}</Tip>
      </NavLink>
      {onToggle && (
        <button onClick={onToggle} title={collapsed ? labels.expand : labels.collapse} className="app-rail-item hidden xl:flex">
          {collapsed ? <LuChevronsRight className="h-5 w-5" /> : <LuChevronsLeft className="h-5 w-5" />}
        </button>
      )}
    </div>
  );
}
