import { logo, phone, email, etherium, AMEX } from "../common/icons";
import { FaInstagram, FaFacebookF, FaLinkedinIn, FaXTwitter, FaBitcoin, FaPaypal, FaCcVisa } from "react-icons/fa6";
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
        if (user) {
            window.dispatchEvent(new Event('openLiveChat'));
        } else {
            // Redirect to sign-in if not authenticated
            navigate('/sign-in');
        }
    };

    const handleDomainSearch = (e) => {
        e.preventDefault();
        if (location.pathname === '/home') {
            // Already on home page, just scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            // Navigate to home page (App.jsx will handle scroll on pathname change)
            navigate('/home');
            // Also scroll immediately in case navigation is instant
            setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 100);
        }
    };

    const handleProtectedClick = (path) => {
        if (!user) {
            localStorage.setItem("path", path);
        }
    };


    return (
        <div className="footer">
            {/* top footer menu */}
            <div className="flex md:flex-row flex-col mb-12 w-full gap-10 md:gap-0">
                <div className="md:w-2/5 w-full flex flex-col items-start gap-8">
                    <NavLink to="/" >
                        <img src={logo} alt={t.nav.logoAlt} title={t.nav.logoTitle} className="dark-mode" />
                    </NavLink>
                    <p className="text-lightgray-500 text-15 font-medium w-36" dangerouslySetInnerHTML={{ __html: t.footer.tagline.replace(/\. /g, '. ') }}></p>
                    <div>
                        <a href="tel:+12234123234" className="footer-contact">
                            <img src={phone} alt="phone" title="phone" className="dark-mode" />
                            +12 234123234
                        </a>
                        <a href="mailto:hello@nameword.com" className="footer-contact">
                            <img src={email} alt="email" title="email" className="dark-mode" />
                            hello@nameword.com
                        </a>
                    </div>
                </div>
                <div className="md:w-3/5 w-full grid lg:grid-cols-3 grid-cols-2 gap-7 md:gap-3">
                    <div className="flex flex-col items-start justify-start">
                        <p className="footer-menu">{t.footer.menu}</p>
                        <a href="/home" onClick={handleDomainSearch} className="footer-link mb-3">{t.footer.domainSearch}</a>
                        <NavLink to="/hosting" className="footer-link mb-3">{t.footer.webEmailHosting}</NavLink>

                        {/* {user && ( */}
                            <>
                                <NavLink to={user ? "/setup-websites" : "/sign-in"} onClick={() => handleProtectedClick("/setup-websites")} className="footer-link mb-3">
                                    {t.footer.webDesign}
                                </NavLink>
                                <NavLink to={user ? "/account-setting?tab=api-key" : "/sign-in"} onClick={() => handleProtectedClick("/account-setting?tab=api-key")} className="footer-link mb-3">
                                    {t.footer.developerAPI}
                                </NavLink>
                                <NavLink to={user ? "/account-setting" : "/sign-in"} onClick={() => handleProtectedClick("/account-setting")} className="footer-link mb-3">
                                    {t.footer.myAccount}
                                </NavLink>
                            </>
                        {/* )} */}

                    </div>
                    <div className="flex flex-col items-start justify-start">
                        <p className="footer-menu">{t.footer.support}</p>
                        <NavLink to="/help-support" className="footer-link mb-3">{t.footer.contactUs}</NavLink>
                        {(import.meta.env.VITE_SHOW_CHAT === "true" || import.meta.env.VITE_SHOW_CHAT === true) && (
                            <a href="#" onClick={handleQuickChat} className="footer-link mb-3">{t.footer.quickChat}</a>
                        )}
                        <NavLink to="/help-support" className="footer-link mb-3">{t.footer.helpDesk}</NavLink>
                    </div>
                    <div className="flex flex-col items-start justify-start">
                        <p className="footer-menu">{t.footer.followUs}</p>
                        <div className="flex gap-2.5 items-center">
                            <a href="http://www.instagram.com/namewordcom" target="_blank" className="social-link">
                                <FaInstagram />
                            </a>
                            <a href="https://www.facebook.com/namewordcom" target="_blank" className="social-link">
                                <FaFacebookF size={20} />
                            </a>
                            <a href="https://www.linkedin.com/company/namewordcom/" target="_blank" className="social-link">
                                <FaLinkedinIn />
                            </a>
                            <a href="https://x.com/namewordcom" target="_blank" className="social-link">
                                <FaXTwitter />
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <hr className="w-full border border-lightgray-100 dark:border-gray-800 my-8" />

            {/* Copyright text */}
            <div className="flex justify-between md:flex-row flex-col items-start git gap-3">
                <p className="text-lightgray-500 text-15 font-medium">{new Date().getFullYear()} {t.footer.allRightsReserved}</p>
                <div className="flex items-center justify-end gap-10">
                    <NavLink to="/terms-and-conditions" className="footer-link">{t.footer.termsAndConditions}</NavLink>
                    <NavLink to="/privacy-policy" className="footer-link">{t.footer.privacyPolicy}</NavLink>
                </div>
                <div className="flex gap-2.5 items-center">
                    <a href="https://bitcoin.org/en/" target="_blank" className="social-link">
                        <FaBitcoin className="text-primary dark-mode" />
                    </a>
                    <a href="https://ethereum.org/" target="_blank" className="social-link">
                        <img src={etherium} alt="" title="" className="dark-mode" />
                    </a>
                    <a href="https://www.paypal.com/" target="_blank" className="social-link">
                        <FaPaypal className="text-primary dark-mode" />
                    </a>
                    <a href="https://www.mastercard.co.in/" target="_blank" className="social-link">
                        <BiLogoMastercard className="text-primary dark-mode" />
                    </a>
                    <a href="https://www.visa.com/" target="_blank" className="social-link">
                        <FaCcVisa className="text-primary dark-mode" />
                    </a>
                    <a href="https://www.americanexpress.com" target="_blank" className="social-link">
                        <img src={AMEX} alt="" title="" className="dark-mode" />
                    </a>
                    <a href="https://www.ecb.europa.eu/8445377818" target="_blank" className="social-link">
                        <SiSepa className="text-primary dark-mode" />
                    </a>
                </div>
            </div>
        </div>
    );
}

export default Footer