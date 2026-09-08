import { useState } from "react";
import { logo, USA, ES, FR } from "../common/icons";
import useDropdown from "../../hooks/useDropdown";
import { useAuth } from "../../hooks/useAuth";
import { NavLink, useNavigate } from "react-router";
import { IoChevronDown, IoMenu } from "react-icons/io5";
import { RxCross2 } from "react-icons/rx";
import { LuGlobe, LuServer, LuCloud, LuMonitor, LuShieldCheck, LuMail } from "react-icons/lu";
import ThemeToggleButton from "../common/ThemeToggleButton";
import UserDropdownMenu from "../common/UserDropdownMenu";
import { useLanguage } from "../../hooks/useLanguage";

const ICON_WRAP = {
  brand: "bg-brand-50 text-brand-700 dark:bg-brand/15 dark:text-brand-200",
  teal: "bg-success-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300",
  amber: "bg-accent-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
};

const PRODUCTS = [
  { to: "/domain", icon: LuGlobe, title: "Domains", desc: "Search & register the perfect name", color: "brand" },
  { to: "/hosting", icon: LuServer, title: "Web Hosting", desc: "Fast cPanel & Plesk hosting", color: "teal" },
  { to: "/vps", icon: LuCloud, title: "VPS", desc: "Scalable cloud servers", color: "brand" },
  { to: "/rdp", icon: LuMonitor, title: "RDP", desc: "Remote desktop instances", color: "teal" },
  { to: "/ssl", icon: LuShieldCheck, title: "SSL Certificates", desc: "Trusted HTTPS in minutes", color: "amber" },
  { to: "/email", icon: LuMail, title: "Email", desc: "Professional mailboxes", color: "amber" },
];

const Navbar = () => {
  const languageDropDown = useDropdown();
  const productsDropDown = useDropdown();
  const { user } = useAuth();
  const { language, changeLanguage, t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

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

  const deskLink = "rounded-lg px-3 py-2 text-15 font-medium text-primary hover:bg-surface-2 dark:text-white dark:hover:bg-gray-800 transition-colors";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-line/80 bg-white/85 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/85">
      <div className="nw-container flex h-16 lg:h-[4.5rem] items-center justify-between gap-4">
        {/* Brand */}
        <NavLink to="/" className="flex items-center shrink-0">
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
              Products
              <IoChevronDown className={`transition-transform ${productsDropDown.isOpen ? "rotate-180" : ""}`} />
            </button>
            {productsDropDown.isOpen && (
              <div className="absolute left-0 mt-2 w-[34rem] rounded-2xl border border-line bg-white p-3 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                <div className="grid grid-cols-2 gap-1">
                  {PRODUCTS.map((p) => (
                    <NavLink
                      key={p.title}
                      to={p.to}
                      onClick={productsDropDown.close}
                      className="flex items-start gap-3 rounded-xl p-3 hover:bg-surface-2 dark:hover:bg-gray-800 transition-colors"
                    >
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${ICON_WRAP[p.color]}`}>
                        <p.icon className="h-5 w-5" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-primary dark:text-white">{p.title}</span>
                        <span className="block text-13 text-ink-soft dark:text-gray-400">{p.desc}</span>
                      </span>
                    </NavLink>
                  ))}
                </div>
              </div>
            )}
          </div>
          <a href="/#pricing" onClick={goPricing} className={deskLink}>{t.nav.pricing}</a>
          <NavLink to="/help-support" className={deskLink}>{t.nav.contact}</NavLink>
          <NavLink to="/help-support#discover-domains" className={deskLink}>{t.nav.faq}</NavLink>
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
                <button onClick={() => handleLanguageChange("en")} className="dropdown-menu w-full text-left">
                  <img src={USA} alt="USA" title="USA" className="w-5 h-3 object-cover object-center" />
                  <span>EN</span>
                </button>
                <button onClick={() => handleLanguageChange("es")} className="dropdown-menu w-full text-left">
                  <img src={ES} alt="ES" title="ES" className="w-5 h-3 object-cover object-center" />
                  <span>ES</span>
                </button>
                <button onClick={() => handleLanguageChange("fr")} className="dropdown-menu w-full text-left">
                  <img src={FR} alt="FR" title="FR" className="w-5 h-3 object-cover object-center" />
                  <span>FR</span>
                </button>
              </div>
            )}
          </div>
          <ThemeToggleButton />
          {user ? (
            <UserDropdownMenu classAdd={true} />
          ) : (
            <>
              <NavLink to="/sign-in" className="nw-btn-ghost nw-btn-sm">{t.nav.signIn}</NavLink>
              <NavLink to="/create-account" className="nw-btn-primary nw-btn-sm">{t.nav.createAccount}</NavLink>
            </>
          )}
        </div>

        {/* Mobile controls */}
        <div className="flex items-center gap-1 lg:hidden">
          <ThemeToggleButton />
          <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open menu" className="p-2 text-primary dark:text-white">
            <IoMenu size={26} />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute right-0 top-0 flex h-full w-[86%] max-w-sm flex-col overflow-y-auto bg-white p-5 shadow-2xl dark:bg-gray-950">
            <div className="mb-6 flex items-center justify-between">
              <img src={logo} alt={t.nav.logoAlt} className="dark-mode h-8 w-auto" />
              <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close menu" className="p-2 text-primary dark:text-white">
                <RxCross2 size={24} />
              </button>
            </div>

            <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-wider text-ink-soft dark:text-gray-500">Products</p>
            <div className="flex flex-col gap-1">
              {PRODUCTS.map((p) => (
                <NavLink key={p.title} to={p.to} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-surface-2 dark:hover:bg-gray-800">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${ICON_WRAP[p.color]}`}>
                    <p.icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-semibold text-primary dark:text-white">{p.title}</span>
                </NavLink>
              ))}
            </div>

            <div className="my-4 border-t border-line dark:border-gray-800" />
            <div className="flex flex-col gap-1">
              <a href="/#pricing" onClick={goPricing} className="rounded-xl p-2.5 text-15 font-medium text-primary hover:bg-surface-2 dark:text-white dark:hover:bg-gray-800">{t.nav.pricing}</a>
              <NavLink to="/help-support" onClick={() => setMobileOpen(false)} className="rounded-xl p-2.5 text-15 font-medium text-primary hover:bg-surface-2 dark:text-white dark:hover:bg-gray-800">{t.nav.contact}</NavLink>
              <NavLink to="/help-support#discover-domains" onClick={() => setMobileOpen(false)} className="rounded-xl p-2.5 text-15 font-medium text-primary hover:bg-surface-2 dark:text-white dark:hover:bg-gray-800">{t.nav.faq}</NavLink>
            </div>

            <div className="my-4 border-t border-line dark:border-gray-800" />
            <div className="mb-4 flex items-center gap-2">
              {["en", "es", "fr"].map((lng) => (
                <button key={lng} onClick={() => handleLanguageChange(lng)} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-13 font-medium uppercase ${language === lng ? "border-brand text-brand" : "border-line text-ink-soft dark:border-gray-700 dark:text-gray-300"}`}>
                  <img src={flag(lng)} alt={lng} className="w-5 h-3 object-cover" />{lng}
                </button>
              ))}
            </div>

            <div className="mt-auto">
              {user ? (
                <UserDropdownMenu classAdd={true} />
              ) : (
                <div className="flex flex-col gap-2">
                  <NavLink to="/sign-in" onClick={() => setMobileOpen(false)} className="nw-btn-secondary w-full">{t.nav.signIn}</NavLink>
                  <NavLink to="/create-account" onClick={() => setMobileOpen(false)} className="nw-btn-primary w-full">{t.nav.createAccount}</NavLink>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
