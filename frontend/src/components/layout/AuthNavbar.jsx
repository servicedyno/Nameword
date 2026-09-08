import { logo, Help, USA, ES, FR } from "../common/icons";
import { NavLink } from "react-router";
import ThemeToggleButton from "../common/ThemeToggleButton";
import CartIconButton from "../common/CartIconButton";
import UserDropdownMenu from "../common/UserDropdownMenu";
import useDropdown from '../../hooks/useDropdown';
import { IoChevronDown } from "react-icons/io5";
import { useLanguage } from "../../hooks/useLanguage";

const AuthNavbar = () => {
  const languageDropDown = useDropdown();
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
    <div className="sticky top-0 left-0 w-full z-20 bg-white dark:bg-gray-900 p-5">
      <nav className="flex items-center justify-between w-full px-0 sm:px-5 xl:px-7">
        <NavLink to={"/"} className="flex items-center space-x-4">
          <img
            src={logo}
            alt={t.nav.logoAlt}
            title={t.nav.logoTitle}
            className="dark-mode"
          />
        </NavLink>

        <div className="lg:flex hidden justify-between items-center gap-14">
          <ul className="lg:flex hidden justify-center items-center gap-10">
            <li>
              <NavLink to="/help-support" className="auth-navlink">
                <img
                  src={Help}
                  alt={t.nav.helpSupport}
                  title={t.nav.helpSupport}
                  className="dark-mode"
                />{" "}
                {t.nav.helpSupport}
              </NavLink>
            </li>
          </ul>

          <div className="flex items-center gap-2.5">
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
      </nav>
    </div>
  );
};

export default AuthNavbar;
