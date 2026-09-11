import { useState } from "react";
import { createPortal } from "react-dom";
import { logo, USA, ES, FR } from "../common/icons";
import useDropdown from "../../hooks/useDropdown";
import { useAuth } from "../../hooks/useAuth";
import { NavLink, useNavigate } from "react-router";
import { IoChevronDown, IoMenu } from "react-icons/io5";
import { RxCross2 } from "react-icons/rx";
import { LuGlobe, LuNetwork, LuServer, LuCloud, LuMonitor, LuMail, LuCode, LuShieldCheck } from "react-icons/lu";
import ThemeToggleButton from "../common/ThemeToggleButton";
import UserDropdownMenu from "../common/UserDropdownMenu";
import CartNavButton from "../checkout/CartNavButton";
import { useLanguage } from "../../hooks/useLanguage";

// Kept product surface: Domains · DNS · cPanel Hosting · VPS · RDP · Private Email · API
const PRODUCT_KEYS = [
  { key: "domains", to: "/domains", icon: LuGlobe },
  { key: "dns", to: "/dns-manager", icon: LuNetwork },
  { key: "hosting", to: "/hosting", icon: LuServer },
  { key: "vps", to: "/vps", icon: LuCloud },
  { key: "rdp", to: "/rdp", icon: LuMonitor },
  { key: "email", to: "/email", icon: LuMail },
  { key: "api", to: "/api", icon: LuCode },
];

const Navbar = () => {
  const languageDropDown = useDropdown();
  const productsDropDown = useDropdown();
  const { user } = useAuth();
  const { language, changeLanguage, t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const s = t.site;

  const flag = (lang) => (lang === "es" ? ES : lang === "fr" ? FR : USA);
  const handleLanguageChange = (lang) => {
    changeLanguage(lang);
    languageDropDown.close();
  };

  const goPricing = (e) => {
    e.preventDefault();
    setMobileOpen(false);
    navigate("/pricing");
  };

  // Product links go straight to their storefront/manager pages.
  const productTo = (p) => p.to;
  const rememberPath = () => {};

  const deskLink =
    "rounded-lg px-3 py-2 text-15 font-medium text-primary hover:bg-surface-2 dark:text-gray-200 dark:hover:bg-white/[0.06] dark:hover:text-white transition-colors";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-line/80 bg-white/85 backdrop-blur-md dark:border-white/[0.06] dark:bg-gray-950/80">
      <div className="nw-container flex h-16 lg:h-[4.5rem] items-center justify-between gap-4">
        {/* Brand */}
        <NavLink to="/" className="flex items-center gap-2 shrink-0" aria-label="Nameword home">
          <img src={logo} alt={t.nav.logoAlt} title={t.nav.logoTitle} className="dark-mode h-8 w-auto" />
        </NavLink>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1">
          <div ref={productsDropDown.ref} className="relative">
            <button
              type="button"
              onClick={productsDropDown.toggle}
              aria-haspopup="true"
              aria-expanded={productsDropDown.isOpen}
              className={`flex items-center gap-1.5 ${deskLink}`}
            >
              {s.nav.products}
              <IoChevronDown className={`transition-transform ${productsDropDown.isOpen ? "rotate-180" : ""}`} />
            </button>
            {productsDropDown.isOpen && (
              <div className="absolute left-0 mt-2 w-[36rem] rounded-2xl border border-line bg-white p-3 shadow-2xl dark:border-white/[0.08] dark:bg-gray-900 dark:shadow-black/60">
                <div className="grid grid-cols-2 gap-1">
                  {PRODUCT_KEYS.map((p) => (
                    <NavLink
                      key={p.key}
                      to={productTo(p)}
                      onClick={() => { rememberPath(p); productsDropDown.close(); }}
                      className="flex items-start gap-3 rounded-xl p-3 hover:bg-surface-2 dark:hover:bg-white/[0.05] transition-colors"
                    >
                      <span className="nw-icon h-10 w-10">
                        <p.icon className="h-5 w-5" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-primary dark:text-white">{s.nav.items[p.key].title}</span>
                        <span className="block text-13 text-ink-soft dark:text-gray-400">{s.nav.items[p.key].desc}</span>
                      </span>
                    </NavLink>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-brand/15 bg-brand-50/70 px-3 py-2 text-13 text-brand-800 dark:border-brand/20 dark:bg-brand/10 dark:text-brand-200">
                  <LuShieldCheck className="h-4 w-4 shrink-0" />
                  {s.home.heroChips.join(" · ")}
                </div>
              </div>
            )}
          </div>
          <a href="/pricing" onClick={goPricing} className={deskLink}>{s.nav.pricing}</a>
          <NavLink to="/api" className={deskLink}>{s.nav.api}</NavLink>
          <NavLink to="/help-support" className={deskLink}>{s.nav.support}</NavLink>
        </nav>

        {/* Desktop right */}
        <div className="hidden lg:flex items-center gap-2">
          <div ref={languageDropDown.ref} className="relative">
            <button onClick={languageDropDown.toggle} type="button" className="language-menu">
              <img src={flag(language)} alt={language.toUpperCase()} title={language.toUpperCase()} className="w-5 h-3 object-cover object-center" />
              <p>{language.toUpperCase()}</p>
              <IoChevronDown />
            </button>
            {languageDropDown.isOpen && (
              <div className="dropdown">
                {["en", "es", "fr"].map((lng) => (
                  <button key={lng} onClick={() => handleLanguageChange(lng)} className="dropdown-menu w-full text-left">
                    <img src={flag(lng)} alt={lng.toUpperCase()} title={lng.toUpperCase()} className="w-5 h-3 object-cover object-center" />
                    <span>{lng.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <ThemeToggleButton />
          <CartNavButton />
          {user ? (
            <UserDropdownMenu classAdd={true} />
          ) : (
            <>
              <NavLink to="/sign-in" className="nw-btn-ghost nw-btn-sm">{s.nav.signIn}</NavLink>
              <NavLink to="/create-account" className="nw-btn-primary nw-btn-sm">{s.nav.createAccount}</NavLink>
            </>
          )}
        </div>

        {/* Mobile controls */}
        <div className="flex items-center gap-1 lg:hidden">
          <ThemeToggleButton />
          <CartNavButton />
          <button type="button" onClick={() => setMobileOpen(true)} aria-label={s.nav.openMenu} className="p-2 text-primary dark:text-white">
            <IoMenu size={26} />
          </button>
        </div>
      </div>

      {/* Mobile drawer — portaled to document.body so the header's
          backdrop-blur (which becomes a containing block for fixed children)
          can't clip/cover the full-screen overlay. */}
      {mobileOpen && createPortal(
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute right-0 top-0 flex h-full w-[86%] max-w-sm flex-col overflow-y-auto bg-white p-5 shadow-2xl dark:bg-gray-950 dark:border-l dark:border-white/[0.06]">
            <div className="mb-6 flex items-center justify-between">
              <img src={logo} alt={t.nav.logoAlt} className="dark-mode h-8 w-auto" />
              <button type="button" onClick={() => setMobileOpen(false)} aria-label={s.nav.closeMenu} className="p-2 text-primary dark:text-white">
                <RxCross2 size={24} />
              </button>
            </div>

            <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-wider text-ink-soft dark:text-gray-500">{s.nav.products}</p>
            <div className="flex flex-col gap-1">
              {PRODUCT_KEYS.map((p) => (
                <NavLink key={p.key} to={productTo(p)} onClick={() => { rememberPath(p); setMobileOpen(false); }} className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-surface-2 dark:hover:bg-white/[0.05]">
                  <span className="nw-icon h-9 w-9">
                    <p.icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-primary dark:text-white">{s.nav.items[p.key].title}</span>
                    <span className="block text-xs text-ink-soft dark:text-gray-400">{s.nav.items[p.key].desc}</span>
                  </span>
                </NavLink>
              ))}
            </div>

            <div className="my-4 border-t border-line dark:border-white/[0.06]" />
            <div className="flex flex-col gap-1">
              <a href="/pricing" onClick={goPricing} className="rounded-xl p-2.5 text-15 font-medium text-primary hover:bg-surface-2 dark:text-white dark:hover:bg-white/[0.05]">{s.nav.pricing}</a>
              <NavLink to="/api" onClick={() => setMobileOpen(false)} className="rounded-xl p-2.5 text-15 font-medium text-primary hover:bg-surface-2 dark:text-white dark:hover:bg-white/[0.05]">{s.nav.api}</NavLink>
              <NavLink to="/help-support" onClick={() => setMobileOpen(false)} className="rounded-xl p-2.5 text-15 font-medium text-primary hover:bg-surface-2 dark:text-white dark:hover:bg-white/[0.05]">{s.nav.support}</NavLink>
            </div>

            <div className="my-4 border-t border-line dark:border-white/[0.06]" />
            <div className="mb-4 flex items-center gap-2">
              {["en", "es", "fr"].map((lng) => (
                <button key={lng} onClick={() => handleLanguageChange(lng)} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-13 font-medium uppercase ${language === lng ? "border-brand text-brand-700 dark:text-brand-300" : "border-line text-ink-soft dark:border-gray-700 dark:text-gray-300"}`}>
                  <img src={flag(lng)} alt={lng} className="w-5 h-3 object-cover" />{lng}
                </button>
              ))}
            </div>

            <div className="mt-auto">
              {user ? (
                <UserDropdownMenu classAdd={true} />
              ) : (
                <div className="flex flex-col gap-2">
                  <NavLink to="/sign-in" onClick={() => setMobileOpen(false)} className="nw-btn-secondary w-full">{s.nav.signIn}</NavLink>
                  <NavLink to="/create-account" onClick={() => setMobileOpen(false)} className="nw-btn-primary w-full">{s.nav.createAccount}</NavLink>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
};

export default Navbar;
