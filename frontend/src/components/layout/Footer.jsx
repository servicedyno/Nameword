import { logo, etherium, AMEX } from "../common/icons";
import {
  FaInstagram,
  FaFacebookF,
  FaLinkedinIn,
  FaXTwitter,
  FaBitcoin,
  FaPaypal,
  FaCcVisa,
} from "react-icons/fa6";
import { LuPhone, LuMail } from "react-icons/lu";
import { NavLink, useNavigate, useLocation } from "react-router";
import { useLanguage } from "../../hooks/useLanguage";
import { useAuth } from "../../hooks/useAuth";
import { BiLogoMastercard } from "react-icons/bi";
import { SiSepa } from "react-icons/si";

const Footer = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleQuickChat = (e) => {
    e.preventDefault();
    if (user) window.dispatchEvent(new Event("openLiveChat"));
    else navigate("/sign-in");
  };

  const handleDomainSearch = (e) => {
    e.preventDefault();
    if (location.pathname === "/home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      navigate("/home");
      setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
    }
  };

  const handleProtectedClick = (path) => {
    if (!user) localStorage.setItem("path", path);
  };

  const linkCls = "nw-link text-15 mb-3 block";

  return (
    <footer className="border-t border-line bg-surface-2 dark:border-gray-800 dark:bg-gray-950">
      <div className="nw-container py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-2 flex flex-col items-start gap-6">
            <NavLink to="/">
              <img src={logo} alt={t.nav.logoAlt} title={t.nav.logoTitle} className="dark-mode h-8 w-auto" />
            </NavLink>
            <p
              className="max-w-xs text-15 text-ink-soft dark:text-gray-400"
              dangerouslySetInnerHTML={{ __html: t.footer.tagline.replace(/\. /g, ". ") }}
            />
            <div className="flex flex-col gap-2">
              <a href="tel:+12234123234" className="flex items-center gap-2 text-15 text-ink-soft hover:text-brand dark:text-gray-400 dark:hover:text-white">
                <LuPhone className="h-4 w-4" /> +12 234123234
              </a>
              <a href="mailto:hello@nameword.com" className="flex items-center gap-2 text-15 text-ink-soft hover:text-brand dark:text-gray-400 dark:hover:text-white">
                <LuMail className="h-4 w-4" /> hello@nameword.com
              </a>
            </div>
            <div className="flex items-center gap-2.5">
              <a href="http://www.instagram.com/namewordcom" target="_blank" rel="noreferrer" aria-label="Instagram" className="social-link"><FaInstagram /></a>
              <a href="https://www.facebook.com/namewordcom" target="_blank" rel="noreferrer" aria-label="Facebook" className="social-link"><FaFacebookF /></a>
              <a href="https://www.linkedin.com/company/namewordcom/" target="_blank" rel="noreferrer" aria-label="LinkedIn" className="social-link"><FaLinkedinIn /></a>
              <a href="https://x.com/namewordcom" target="_blank" rel="noreferrer" aria-label="X" className="social-link"><FaXTwitter /></a>
            </div>
          </div>

          {/* Products */}
          <div>
            <p className="mb-4 text-13 font-semibold uppercase tracking-wider text-primary dark:text-white">Products</p>
            <a href="/home" onClick={handleDomainSearch} className={linkCls}>{t.footer.domainSearch}</a>
            <NavLink to="/hosting" className={linkCls}>Web Hosting</NavLink>
            <NavLink to="/vps" className={linkCls}>VPS</NavLink>
            <NavLink to="/rdp" className={linkCls}>RDP</NavLink>
            <NavLink to="/ssl" className={linkCls}>SSL Certificates</NavLink>
            <NavLink to="/email" className={linkCls}>Email</NavLink>
          </div>

          {/* Company */}
          <div>
            <p className="mb-4 text-13 font-semibold uppercase tracking-wider text-primary dark:text-white">{t.footer.menu}</p>
            <NavLink to={user ? "/setup-websites" : "/sign-in"} onClick={() => handleProtectedClick("/setup-websites")} className={linkCls}>{t.footer.webDesign}</NavLink>
            <NavLink to={user ? "/account-setting?tab=api-key" : "/sign-in"} onClick={() => handleProtectedClick("/account-setting?tab=api-key")} className={linkCls}>{t.footer.developerAPI}</NavLink>
            <NavLink to={user ? "/account-setting" : "/sign-in"} onClick={() => handleProtectedClick("/account-setting")} className={linkCls}>{t.footer.myAccount}</NavLink>
            <a href="/#pricing" className={linkCls}>{t.nav.pricing}</a>
          </div>

          {/* Support */}
          <div>
            <p className="mb-4 text-13 font-semibold uppercase tracking-wider text-primary dark:text-white">{t.footer.support}</p>
            <NavLink to="/help-support" className={linkCls}>{t.footer.contactUs}</NavLink>
            <NavLink to="/help-support" className={linkCls}>{t.footer.helpDesk}</NavLink>
            {(import.meta.env.VITE_SHOW_CHAT === "true" || import.meta.env.VITE_SHOW_CHAT === true) && (
              <a href="#" onClick={handleQuickChat} className={linkCls}>{t.footer.quickChat}</a>
            )}
            <NavLink to="/help-support#discover-domains" className={linkCls}>{t.nav.faq}</NavLink>
          </div>
        </div>

        <hr className="my-8 border-line dark:border-gray-800" />

        {/* Bottom bar */}
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <p className="text-15 text-ink-soft dark:text-gray-400">{new Date().getFullYear()} {t.footer.allRightsReserved}</p>
          <div className="flex items-center gap-6">
            <NavLink to="/terms-and-conditions" className="nw-link text-15">{t.footer.termsAndConditions}</NavLink>
            <NavLink to="/privacy-policy" className="nw-link text-15">{t.footer.privacyPolicy}</NavLink>
          </div>
          <div className="flex items-center gap-2.5">
            <a href="https://bitcoin.org/en/" target="_blank" rel="noreferrer" aria-label="Bitcoin" className="social-link"><FaBitcoin className="text-primary dark-mode" /></a>
            <a href="https://ethereum.org/" target="_blank" rel="noreferrer" aria-label="Ethereum" className="social-link"><img src={etherium} alt="Ethereum" className="dark-mode" /></a>
            <a href="https://www.paypal.com/" target="_blank" rel="noreferrer" aria-label="PayPal" className="social-link"><FaPaypal className="text-primary dark-mode" /></a>
            <a href="https://www.mastercard.co.in/" target="_blank" rel="noreferrer" aria-label="Mastercard" className="social-link"><BiLogoMastercard className="text-primary dark-mode" /></a>
            <a href="https://www.visa.com/" target="_blank" rel="noreferrer" aria-label="Visa" className="social-link"><FaCcVisa className="text-primary dark-mode" /></a>
            <a href="https://www.americanexpress.com" target="_blank" rel="noreferrer" aria-label="Amex" className="social-link"><img src={AMEX} alt="Amex" className="dark-mode" /></a>
            <a href="https://www.ecb.europa.eu/" target="_blank" rel="noreferrer" aria-label="SEPA" className="social-link"><SiSepa className="text-primary dark-mode" /></a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
