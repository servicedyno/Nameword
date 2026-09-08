import { Help, USA, ES, FR } from "../../common/icons";
import { NavLink } from "react-router";
import ThemeToggleButton from "../../common/ThemeToggleButton";
import CartIconButton from "../../common/CartIconButton";
import UserDropdownMenu from "../../common/UserDropdownMenu";
import { useAuth } from "../../../hooks/useAuth";
import { useLanguage } from "../../../hooks/useLanguage";
import useDropdown from '../../../hooks/useDropdown';
import { IoChevronDown } from "react-icons/io5";

const AuthNavbar = () => {
  const languageDropDown = useDropdown();
  const { loading } = useAuth();
  const { language, changeLanguage, t } = useLanguage();

  const getLanguageFlag = (lang) => {
    switch (lang) {
      case 'es': return ES;
      case 'fr': return FR;
      default: return USA;
    }
  };

  const getLanguageCode = (lang) => {
    return lang.toUpperCase();
  };

  const handleLanguageChange = (lang) => {
    changeLanguage(lang);
    languageDropDown.close();
  };

  return (
    <div
      className={`sticky top-0 left-0 w-full ${loading ? "z-50" : "z-20"
        } bg-bodycolor dark:bg-gray-900  px-5 py-8`}
    >
      <div className="flex items-center justify-end w-full px-4 sm:px-5 xl:px-7">
        <div className="flex justify-between items-center gap-14">
          <ul className="xl:flex hidden justify-center items-center gap-10">
            <li>
              <NavLink to={"/help-support"} className="auth-navlink">
                <img
                  src={Help}
                  alt={t.admin.helpSupport}
                  title={t.admin.helpSupport}
                  className="dark-mode"
                />{" "}
                {t.admin.helpSupport}
              </NavLink>
            </li>
          </ul>

          <div className="xl:flex hidden items-center gap-2.5">
            <div ref={languageDropDown.ref} className="relative">
              <button onClick={languageDropDown.toggle} type='button' className="language-menu">
                <img src={getLanguageFlag(language)} alt={getLanguageCode(language)} title={getLanguageCode(language)} className="w-5 h-3 object-cover object-center" />
                <p>{getLanguageCode(language)}</p>
                <IoChevronDown />
              </button>

              {languageDropDown.isOpen && (
                <div className="dropdown">
                  <button onClick={() => handleLanguageChange('en')} className='dropdown-menu w-full text-left'>
                    <img src={USA} alt="USA" title="USA" className="w-5 h-3 object-cover object-center" />
                    <span>EN</span>
                  </button>
                  <button onClick={() => handleLanguageChange('es')} className='dropdown-menu w-full text-left'>
                    <img src={ES} alt="ES" title="ES" className="w-5 h-3 object-cover object-center" />
                    <span>ES</span>
                  </button>
                  <button onClick={() => handleLanguageChange('fr')} className='dropdown-menu w-full text-left'>
                    <img src={FR} alt="FR" title="FR" className="w-5 h-3 object-cover object-center" />
                    <span>FR</span>
                  </button>
                </div>
              )}
            </div>
            <ThemeToggleButton />
          </div>

          <CartIconButton />

          <UserDropdownMenu />
        </div>
      </div>
    </div>
  );
};

export default AuthNavbar;
