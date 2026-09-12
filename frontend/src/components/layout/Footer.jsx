import { etherium, AMEX } from "../common/icons";
import BrandLogo from "../common/BrandLogo";
import { FaXTwitter, FaBitcoin, FaCcVisa } from "react-icons/fa6";
import { LuMail, LuMapPin } from "react-icons/lu";
import { NavLink, useNavigate, useLocation } from "react-router";
import { useLanguage } from "../../hooks/useLanguage";
import { useAuth } from "../../hooks/useAuth";
import { BiLogoMastercard } from "react-icons/bi";
import { SiSepa } from "react-icons/si";

const Footer = () => {
  const { t } = useLanguage();
  const s = t.site;
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleDomainSearch = (e) => {
    e.preventDefault();
    if (location.pathname === "/home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      navigate("/home");
      setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
    }
  };

  // Signed-in destinations: remember where a guest wanted to go, then send them to sign in.
  const protectedTo = (path) => (user ? path : "/sign-in");
  const remember = (path) => () => { if (!user) localStorage.setItem("path", path); };

  const linkCls = "nw-link text-15 mb-3 block";
  const headCls = "mb-4 text-13 font-semibold uppercase tracking-wider text-primary dark:text-white";

  return (
    <footer className="border-t border-line bg-surface-2 dark:border-white/[0.06] dark:bg-gray-950">
      <div className="nw-container py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-2 flex flex-col items-start gap-6">
            <NavLink to="/" aria-label="Nameword home">
              <BrandLogo />
            </NavLink>
            <p className="max-w-sm text-15 text-ink-soft dark:text-gray-400">{s.footer.tagline}</p>
            <div className="flex flex-col gap-2">
              <span className="flex items-center gap-2 text-15 text-ink-soft dark:text-gray-400">
                <LuMapPin className="h-4 w-4 text-brand-600 dark:text-brand-400" /> {s.footer.jurisdictionNote}
              </span>
              <a href="mailto:hello@nameword.com" className="flex items-center gap-2 text-15 text-ink-soft hover:text-brand-700 dark:text-gray-400 dark:hover:text-brand-300">
                <LuMail className="h-4 w-4 text-brand-600 dark:text-brand-400" /> hello@nameword.com
              </a>
            </div>
            <div className="flex items-center gap-2.5">
              <a href="https://x.com/namewordcom" target="_blank" rel="noreferrer" aria-label="X" className="social-link"><FaXTwitter /></a>
            </div>
          </div>

          {/* Products */}
          <div>
            <p className={headCls}>{s.footer.products}</p>
            <a href="/home" onClick={handleDomainSearch} className={linkCls}>{s.footer.links.domains}</a>
            <NavLink to={protectedTo("/dns-management")} onClick={remember("/dns-management")} className={linkCls}>{s.footer.links.dns}</NavLink>
            <NavLink to="/hosting" className={linkCls}>{s.footer.links.hosting}</NavLink>
            <NavLink to="/vps" className={linkCls}>{s.footer.links.vps}</NavLink>
            <NavLink to="/rdp" className={linkCls}>{s.footer.links.rdp}</NavLink>
            <NavLink to="/api" className={linkCls}>{s.footer.links.api}</NavLink>
          </div>

          {/* Company */}
          <div>
            <p className={headCls}>{s.footer.company}</p>
            <NavLink to="/pricing" className={linkCls}>{s.footer.links.pricing}</NavLink>
            <NavLink to={protectedTo("/wallet")} onClick={remember("/wallet")} className={linkCls}>{s.footer.links.rewards}</NavLink>
            <NavLink to={protectedTo("/account-setting?tab=api-key")} onClick={remember("/account-setting?tab=api-key")} className={linkCls}>{s.footer.links.apiKeys}</NavLink>
            <NavLink to={protectedTo("/account-setting")} onClick={remember("/account-setting")} className={linkCls}>{s.footer.links.account}</NavLink>
          </div>

          {/* Support */}
          <div>
            <p className={headCls}>{s.footer.support}</p>
            <NavLink to="/help-support" className={linkCls}>{s.footer.links.help}</NavLink>
            <NavLink to="/help-support#discover-domains" className={linkCls}>{s.footer.links.faq}</NavLink>
            <a href="mailto:hello@nameword.com" className={linkCls}>{s.footer.links.contact}</a>
            <NavLink to="/privacy-policy" className={linkCls}>{s.footer.links.privacy}</NavLink>
            <NavLink to="/terms-and-conditions" className={linkCls}>{s.footer.links.terms}</NavLink>
          </div>
        </div>

        <hr className="my-8 border-line dark:border-white/[0.06]" />

        {/* Bottom bar */}
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <p className="text-13 text-ink-soft dark:text-gray-500">© {new Date().getFullYear()} {s.footer.rights}</p>
          <div className="flex items-center gap-3">
            <span className="text-13 text-ink-soft dark:text-gray-500">{s.footer.payments}</span>
            <div className="flex items-center gap-2.5 text-ink-soft dark:text-gray-400">
              <span aria-label="Bitcoin" title="Bitcoin" className="social-link"><FaBitcoin /></span>
              <span aria-label="Ethereum" title="Ethereum" className="social-link"><img src={etherium} alt="Ethereum" className="dark-mode h-6 w-6" /></span>
              <span aria-label="Mastercard" title="Mastercard" className="social-link"><BiLogoMastercard /></span>
              <span aria-label="Visa" title="Visa" className="social-link"><FaCcVisa /></span>
              <span aria-label="Amex" title="American Express" className="social-link"><img src={AMEX} alt="Amex" className="dark-mode h-6 w-6" /></span>
              <span aria-label="SEPA" title="SEPA" className="social-link"><SiSepa /></span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
