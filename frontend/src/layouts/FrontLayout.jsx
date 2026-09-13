import Sidebar from "../components/front-admin/admin-common/sidebar";
import AppRail from "../components/front-admin/admin-common/AppRail";
import CommandPalette from "../components/common/CommandPalette";
import { Outlet, NavLink, useLocation } from "react-router";
import { useState, useEffect, useCallback } from "react";
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
import useDropdown from "../hooks/useDropdown";
import { useLanguage } from "../hooks/useLanguage";
import { useAuth } from "../hooks/useAuth";
import { walletAPI } from "../api/walletApi";

const BOTTOM_TABS = [
  { key: "home", to: "/dashboard", icon: LuLayoutDashboard },
  { key: "domains", to: "/domains", icon: LuGlobe },
  { key: "hosting", to: "/hosting", icon: LuServer },
  { key: "wallet", to: "/wallet", icon: LuWallet },
  { key: "account", to: "/account-setting", icon: LuUser },
];

const FrontLayout = () => {
  const { user, refreshUser } = useAuth();
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
  const fetchBalance = useCallback(() => {
    if (!user) { setBalance(null); return; }
    walletAPI.getWallet()
      .then((res) => {
        const b = res?.data?.balance;
        setBalance(Number(b?.USD ?? b?.default ?? 0));
      })
      .catch(() => {});
  }, [user]);

  // Refresh on mount, when the user changes, and on every route change (so a
  // top-up credited in the background shows up as soon as the user navigates).
  useEffect(() => { fetchBalance(); }, [fetchBalance, pathname]);

  // When a top-up/payment credits or debits the wallet, refresh the balance chip
  // AND the user (reward points come from the auth user object).
  useEffect(() => {
    const onWallet = () => { fetchBalance(); refreshUser?.(); };
    window.addEventListener("wallet:updated", onWallet);
    return () => window.removeEventListener("wallet:updated", onWallet);
  }, [fetchBalance, refreshUser]);

  const handleLanguageChange = (lang) => { changeLanguage(lang); languageDropDown.close(); };
  const app = t.site.app;

  return (
    <div className="flex h-screen overflow-hidden bg-surface-2 dark:bg-gray-950">
      {/* Desktop icon rail */}
      <div className="hidden lg:flex shrink-0">
        <AppRail collapsed={collapsed} onToggle={toggleCollapsed} />
      </div>

      {/* Desktop contextual panel */}
      {!collapsed && (
        <div className="hidden lg:block w-[280px] shrink-0 overflow-y-auto border-r border-line bg-white px-6 py-7 dark:border-white/[0.06] dark:bg-gray-900">
          <Sidebar setIsEnlarge={setMobileOpen} />
        </div>
      )}

      {/* Main column */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-white/85 px-4 backdrop-blur-md dark:border-white/[0.06] dark:bg-gray-950/85 lg:px-6">
          {/* mobile menu + brand */}
          <button className="lg:hidden text-primary dark:text-white" aria-label="Open menu" onClick={() => setMobileOpen(true)}>
            <CgMenu size={22} />
          </button>
          <NavLink to="/dashboard" className="lg:hidden"><img src={favicon} alt="Nameword" className="h-8 w-8" /></NavLink>

          {/* global search / command palette trigger */}
          <button
            onClick={() => setPaletteOpen(true)}
            className="group hidden sm:flex items-center gap-2.5 rounded-xl border border-line bg-surface-2 px-3.5 py-2 text-ink-soft transition-colors hover:border-brand/40 dark:border-white/[0.08] dark:bg-gray-900 dark:hover:border-brand/40 w-full max-w-sm"
            data-testid="global-search"
          >
            <LuSearch className="h-4 w-4" />
            <span className="text-15">{app.searchPlaceholder}</span>
            <kbd className="ml-auto rounded border border-line bg-white px-1.5 py-0.5 text-[11px] font-semibold text-ink-soft dark:border-gray-700 dark:bg-gray-800">⌘K</kbd>
          </button>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2.5">
            {/* search icon (mobile) */}
            <button onClick={() => setPaletteOpen(true)} className="sm:hidden header-icon-btn" aria-label="Search"><LuSearch className="h-5 w-5" /></button>

            {/* reward points */}
            <NavLink to="/wallet#rewards" title={app.rewards} data-testid="rewards-chip" className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 sm:px-3 py-1.5 text-13 font-semibold text-primary dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-gray-200">
              <LuGift className="h-4 w-4 text-brand-600 dark:text-brand-400" /> {Number(user?.rewardPoints ?? 0)} <span className="hidden sm:inline">{app.pts}</span>
            </NavLink>

            {/* wallet chip */}
            <NavLink to="/wallet" title={app.wallet} data-testid="wallet-chip" className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-13 font-semibold text-brand-700 dark:bg-brand/15 dark:text-brand-300">
              <LuWallet className="h-4 w-4" /> {balance == null ? "—" : `$${balance.toFixed(2)}`}
            </NavLink>

            {/* notifications */}
            <div ref={notifDropDown.ref} className="relative">
              <button onClick={notifDropDown.toggle} className="header-icon-btn" aria-label="Notifications"><LuBell className="h-5 w-5" /></button>
              {notifDropDown.isOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-line bg-white p-4 shadow-xl dark:border-white/[0.08] dark:bg-gray-900">
                  <p className="mb-1 text-sm font-semibold text-primary dark:text-white">{app.notifications}</p>
                  <p className="py-6 text-center text-13 text-ink-soft dark:text-gray-400">{app.allCaughtUp}</p>
                </div>
              )}
            </div>

            {/* help (desktop) */}
            <NavLink to="/help-support" className="hidden lg:inline-flex header-icon-btn" title={t.nav.helpSupport} aria-label="Help">
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
        <main className="flex-1 overflow-y-auto pb-24 lg:pb-8">
          <div className="main-content">
            <Outlet />
          </div>
          <div className="mt-8 flex flex-col gap-3 px-4 pb-6 text-13 font-medium text-ink-soft lg:px-10">
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
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-gray-950/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 flex h-full w-[86%] max-w-xs bg-white shadow-2xl dark:bg-gray-950 dark:border-r dark:border-white/[0.06]">
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
      <nav className="fixed bottom-0 left-0 z-30 flex w-full items-center justify-around border-t border-line bg-white/95 px-2 py-1.5 backdrop-blur lg:hidden dark:border-white/[0.06] dark:bg-gray-950/95" data-testid="bottom-tabs">
        {BOTTOM_TABS.map((tab) => {
          const active = pathname === tab.to || pathname.startsWith(tab.to);
          return (
            <NavLink key={tab.to} to={tab.to} className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[11px] font-medium ${active ? "text-brand-700 dark:text-brand-300" : "text-ink-soft dark:text-gray-400"}`}>
              <tab.icon className="h-5 w-5" />
              {app.tabs[tab.key]}
            </NavLink>
          );
        })}
      </nav>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
};

export default FrontLayout;
