import { useLanguage } from "../../hooks/useLanguage";
import { NavLink } from "react-router";

const AuthFooter = () => {
    const { t } = useLanguage();

    // const authpages = useMatch("/create-account");

    return (
        <div className="footer">
            <hr className="w-full border border-lightgray-100 dark:border-gray-800 my-8"/>
            {/* Copyright text */}
            <div className="flex justify-between md:flex-row flex-col md:items-start items-center gap-3">
                <p className="text-lightgray-500 text-15 font-medium">{new Date().getFullYear()} {t.footer.allRightsReserved}</p>
                <div className="flex items-center justify-end gap-10">
                    <NavLink to="/terms-and-conditions" className="footer-link">{t.footer.termsAndConditions}</NavLink>
                    <NavLink to="/privacy-policy" className="footer-link">{t.footer.privacyPolicy}</NavLink>
                </div>
            </div>

        </div>
    );
}

export default AuthFooter