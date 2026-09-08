import { NavLink, useLocation } from "react-router";
import { favicon } from "../../common/icons";
import {
  LuLayoutDashboard, LuGlobe, LuServer, LuCloud, LuMonitor,
  LuWallet, LuSettings, LuLifeBuoy, LuChevronsLeft, LuChevronsRight,
} from "react-icons/lu";

const RAIL = [
  { label: "Overview", to: "/dashboard", icon: LuLayoutDashboard, match: ["/dashboard"] },
  { label: "Domains", to: "/domain-portfolio", icon: LuGlobe, match: ["/domain-portfolio", "/domain-overview", "/dns-management", "/contact-info", "/transfer-domain"] },
  { label: "Hosting", to: "/websites", icon: LuServer, match: ["/websites", "/setup-websites", "/websites-overview", "/manage-plan", "/upgrade-plan", "/renew-plan"] },
  { label: "VPS", to: "/vps", icon: LuCloud, match: ["/vps"] },
  { label: "RDP", to: "/rdp", icon: LuMonitor, match: ["/rdp"] },
  { label: "Billing", to: "/wallet", icon: LuWallet, match: ["/wallet", "/subscriptions", "/payment-history"] },
  { label: "Settings", to: "/account-setting", icon: LuSettings, match: ["/account-setting", "/account-information", "/change-email"] },
];

function Tip({ children }) {
  return (
    <span className="pointer-events-none absolute left-[54px] z-50 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-gray-700">
      {children}
    </span>
  );
}

export default function AppRail({ collapsed, onToggle }) {
  const { pathname } = useLocation();
  const isActive = (m) => m.some((p) => pathname === p || pathname.startsWith(p));
  return (
    <div className="flex h-full w-[76px] flex-col items-center border-r border-line bg-white py-5 dark:border-gray-800 dark:bg-gray-950">
      <NavLink to="/" className="mb-6" title="Home">
        <img src={favicon} alt="Nameword" className="h-8 w-8 dark-mode" />
      </NavLink>
      <nav className="flex flex-1 flex-col items-center gap-1.5">
        {RAIL.map((it) => (
          <NavLink key={it.label} to={it.to} title={it.label} className={`group app-rail-item ${isActive(it.match) ? "app-rail-item-active" : ""}`}>
            <it.icon className="h-5 w-5" />
            <Tip>{it.label}</Tip>
          </NavLink>
        ))}
      </nav>
      <NavLink to="/help-support" title="Help & Support" className="group app-rail-item mb-2">
        <LuLifeBuoy className="h-5 w-5" />
        <Tip>Help & Support</Tip>
      </NavLink>
      {onToggle && (
        <button onClick={onToggle} title={collapsed ? "Expand" : "Collapse"} className="app-rail-item hidden xl:flex">
          {collapsed ? <LuChevronsRight className="h-5 w-5" /> : <LuChevronsLeft className="h-5 w-5" />}
        </button>
      )}
    </div>
  );
}
