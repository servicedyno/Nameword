import Sidebar from "../components/front-admin/admin-common/sidebar";
import AppRail from "../components/front-admin/admin-common/AppRail";
import CommandPalette from "../components/common/CommandPalette";
import { Outlet, NavLink, useLocation } from "react-router";
import { useState, useEffect } from "react";
import { RxCross2 } from "react-icons/rx";
import { CgMenu } from "react-icons/cg";
import {
  LuSearch, LuWallet, LuBell, LuGift, LuLayoutDashboard, LuGlobe, LuServer, LuUser,
} from "react-icons/lu";
import { IoChevronDown } from "react-icons/io5";
import { favicon, Help, USA, ES, FR } from "../components/common/icons";
import ThemeToggleButton from "../components/common/ThemeToggleButton";
import UserDropdownMenu from "../components/common/UserDropdownMenu";
import CartIconButton from "../components/common/CartIconButton";
import LiveChat from "../components/LiveChat";
import useDropdown from "../hooks/useDropdown";
import { useLanguage } from "../hooks/useLanguage";
import { useAuth } from "../hooks/useAuth";
import { walletAPI } from "../api/walletApi";

const BOTTOM_TABS = [
  { label: "Home", to: "/dashboard", icon: LuLayoutDashboard },
  { label: "Domains", to: "/domain-portfolio", icon: LuGlobe },
  { label: "Hosting", to: "/websites", icon: LuServer },
  { label: "Wallet", to: "/wallet", icon: LuWallet },
  { label: "Account", to: "/account-setting", icon: LuUser },
];

const FrontLayout = () => {
  const { user } = useAuth();
  const { language, changeLanguage, t } = useLanguage();
  const languageDropDown = useDropdown();
  const notifDropDown = useDropdown();
  const { pathname } = useLocation();

  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("nw_sidebar_collapsed") === "1");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [balance, setBalance] = useState(null);

  const flag = (lang) => (lang === "es" ? ES : lang === "fr" ? FR : USA);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      localStorage.setItem("nw_sidebar_collapsed", !c ? "1" : "0");
      return !c;
    });
  };

  // Cmd/Ctrl + K command palette
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // close mobile drawer on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // fetch wallet balance for the top-bar chip
  useEffect(() => {
    let alive = true;
    if (!user) return;
    walletAPI.getWallet()
      .then((res) => {
        if (!alive) return;
        const b = res?.data?.balance;
        setBalance(Number(b?.USD ?? b?.default ?? 0));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [user]);

  const handleLanguageChange = (lang) => { changeLanguage(lang); languageDropDown.close(); };

  return (
    <div className="flex h-screen overflow-hidden bg-surface-2 dark:bg-gray-950">
      {/* Desktop icon rail */}
      <div className="hidden xl:flex shrink-0">
        <AppRail collapsed={collapsed} onToggle={toggleCollapsed} />
      </div>

      {/* Desktop contextual panel */}
      {!collapsed && (
        <div className="hidden xl:block w-[280px] shrink-0 overflow-y-auto border-r border-line bg-white px-6 py-7 dark:border-gray-800 dark:bg-gray-900">
          <Sidebar setIsEnlarge={setMobileOpen} />
        </div>
      )}

      {/* Main column */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-white/85 px-4 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/85 lg:px-6">
          {/* mobile menu + brand */}
          <button className="xl:hidden text-primary dark:text-white" aria-label="Open menu" onClick={() => setMobileOpen(true)}>
            <CgMenu size={22} />
          </button>
          <NavLink to="/" className="xl:hidden"><img src={favicon} alt="Nameword" className="h-8 w-8 dark-mode" /></NavLink>

          {/* global search / command palette trigger */}
          <button
            onClick={() => setPaletteOpen(true)}
            className="group hidden sm:flex items-center gap-2.5 rounded-xl border border-line bg-surface-2 px-3.5 py-2 text-ink-soft transition-colors hover:border-brand-200 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700 w-full max-w-sm"
          >
            <LuSearch className="h-4 w-4" />
            <span className="text-15">Search domains, services…</span>
            <kbd className="ml-auto rounded border border-line bg-white px-1.5 py-0.5 text-[11px] font-semibold text-ink-soft dark:border-gray-700 dark:bg-gray-800">⌘K</kbd>
          </button>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2.5">
            {/* search icon (mobile) */}
            <button onClick={() => setPaletteOpen(true)} className="sm:hidden header-icon-btn" aria-label="Search"><LuSearch className="h-5 w-5" /></button>

            {/* reward points */}
            <NavLink to="/account-setting" title="Reward points" className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-accent-50 px-3 py-1.5 text-13 font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              <LuGift className="h-4 w-4" /> {Number(user?.rewardPoints ?? 0)} pts
            </NavLink>

            {/* wallet chip */}
            <NavLink to="/wallet" title="Wallet" className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-13 font-semibold text-brand-700 dark:bg-brand/15 dark:text-brand-200">
              <LuWallet className="h-4 w-4" /> {balance == null ? "—" : `$${balance.toFixed(2)}`}
            </NavLink>

            {/* notifications */}
            <div ref={notifDropDown.ref} className="relative">
              <button onClick={notifDropDown.toggle} className="header-icon-btn" aria-label="Notifications"><LuBell className="h-5 w-5" /></button>
              {notifDropDown.isOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-line bg-white p-4 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                  <p className="mb-1 text-sm font-semibold text-primary dark:text-white">Notifications</p>
                  <p className="py-6 text-center text-13 text-ink-soft">You're all caught up.</p>
                </div>
              )}
            </div>

            {/* help (desktop) */}
            <NavLink to="/help-support" className="hidden xl:inline-flex header-icon-btn" title={t.nav.helpSupport} aria-label="Help">
              <img src={Help} alt="" className="h-5 w-5 dark-mode" />
            </NavLink>

            {/* language */}
            <div ref={languageDropDown.ref} className="relative hidden sm:block">
              <button onClick={languageDropDown.toggle} type="button" className="language-menu">
                <img src={flag(language)} alt={language.toUpperCase()} className="w-5 h-3 object-cover object-center" />
                <p>{language.toUpperCase()}</p>
                <IoChevronDown />
              </button>
              {languageDropDown.isOpen && (
                <div className="dropdown">
                  {["en", "es", "fr"].map((lng) => (
                    <button key={lng} onClick={() => handleLanguageChange(lng)} className="dropdown-menu w-full text-left">
                      <img src={flag(lng)} alt={lng} className="w-5 h-3 object-cover object-center" />
                      <span>{lng.toUpperCase()}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <ThemeToggleButton />
            <CartIconButton />
            <UserDropdownMenu />
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto pb-24 xl:pb-8">
          <div className="main-content">
            <Outlet />
          </div>
          <div className="mt-8 flex flex-col gap-3 px-4 pb-6 text-13 font-medium text-ink-soft xl:px-10">
            <div className="flex gap-4">
              <NavLink to="/terms-and-conditions" className="nw-link">{t.footer.termsAndConditions}</NavLink>
              <NavLink to="/privacy-policy" className="nw-link">{t.footer.privacyPolicy}</NavLink>
            </div>
            <p>{new Date().getFullYear()} {t.footer.allRightsReserved}</p>
          </div>
        </main>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 xl:hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 flex h-full w-[86%] max-w-xs bg-white shadow-2xl dark:bg-gray-950">
            <AppRail collapsed={false} onToggle={null} />
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className="mb-4 flex items-center justify-end">
                <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="header-icon-btn"><RxCross2 size={20} /></button>
              </div>
              <Sidebar setIsEnlarge={setMobileOpen} />
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 z-30 flex w-full items-center justify-around border-t border-line bg-white/95 px-2 py-1.5 backdrop-blur xl:hidden dark:border-gray-800 dark:bg-gray-950/95">
        {BOTTOM_TABS.map((tab) => {
          const active = pathname === tab.to || pathname.startsWith(tab.to);
          return (
            <NavLink key={tab.to} to={tab.to} className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[11px] font-medium ${active ? "text-brand dark:text-brand-200" : "text-ink-soft dark:text-gray-400"}`}>
              <tab.icon className="h-5 w-5" />
              {tab.label}
            </NavLink>
          );
        })}
      </nav>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      {(import.meta.env.VITE_SHOW_CHAT === "true" || import.meta.env.VITE_SHOW_CHAT === true) && <LiveChat />}
    </div>
  );
};

export default FrontLayout;
