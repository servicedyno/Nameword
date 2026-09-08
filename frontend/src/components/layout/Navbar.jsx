import { useState } from "react";
import { logo, USA, ES, FR } from "../common/icons";
import useDropdown from '../../hooks/useDropdown';
import { useAuth } from "../../hooks/useAuth";
import { IoChevronDown } from "react-icons/io5";
import { NavLink } from "react-router";
import ThemeToggleButton from "../common/ThemeToggleButton";
import UserDropdownMenu from "../common/UserDropdownMenu";
import { IoMenu } from "react-icons/io5";
import { RxCross2 } from "react-icons/rx";
import { useLanguage } from "../../hooks/useLanguage";

const Navbar = ({ isLoader = false}) => {
	const languageDropDown = useDropdown();
	const { user, loading } = useAuth();
	const [isOpen, setIsOpen] = useState(false);
	const { language, changeLanguage, t } = useLanguage();

	const getLanguageFlag = (lang) => {
		switch(lang) {
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
		<>
			<div className={` ${isOpen ? "fixed bg-white/95 dark:bg-gray-900/95" : "sticky bg-white dark:bg-gray-900"} lg:sticky top-0 left-0 w-full ${loading ? "z-50" : isLoader ? "z-0" :"z-20"}  lg:bg-white dark:bg-gray-900 lg:p-5 max-lg:inset-0`}>
				<nav className={`${isOpen ? 'max-lg:h-screen max-lg:overflow-y-auto' : ''} flex items-start lg:items-center justify-start lg:justify-between gap-0 lg:gap-5 w-full lg:px-5 xl:px-7 flex-col lg:flex-row`}>
					<NavLink to={"/"} className="flex items-center space-x-4 max-lg:justify-between max-lg:w-full sticky top-0 left-0 bg-white dark:bg-gray-900 p-5 lg:p-0 max-lg:z-10">
						<img src={logo} alt={t.nav.logoAlt} title={t.nav.logoTitle} className="dark-mode" />
						{isOpen ?
							<RxCross2 size={28} className="block lg:hidden flex-none text-primary dark:text-white" onClick={() => setIsOpen(!isOpen)} />
							:
							<IoMenu size={28} className="block lg:hidden flex-none text-primary dark:text-white" onClick={() => setIsOpen(!isOpen)} />
						}
					</NavLink>

					<div className={`lg:flex justify-between items-end lg:items-center max-lg:w-full flex-col lg:flex-row pt-5 lg:pt-0 gap-12 lg:gap-0 p-5 lg:p-0 ${isOpen ? "flex flex-col-reverse" : "hidden"}`}>
						<ul className="flex justify-center items-start lg:items-center gap-10 flex-col lg:flex-row">
							<li>
								<NavLink to="/home" className="navlink" onClick={() => setIsOpen(false)}>{t.nav.home}</NavLink>
							</li>
							<li>
								<NavLink to="/#services"
									onClick={(e) => {
										setIsOpen(false);
										if (window.location.pathname === "/" ) {
										e.preventDefault();
										const element = document.querySelector("#services");
										console.log(element)
										if (element) {
											element.scrollIntoView({ behavior: "smooth" });
										}
										}
									}} className="navlink">{t.nav.services}
								</NavLink>
							</li>
							<li>
								<NavLink
									to="/#pricing"
									onClick={(e) => {
										setIsOpen(false);
										if (window.location.pathname === "/" ) {
										e.preventDefault();
										const element = document.querySelector("#pricing");
										console.log(element)
										if (element) {
											element.scrollIntoView({ behavior: "smooth" });
										}
										}
									}}
									className="navlink"
									>
									{t.nav.pricing}
								</NavLink>
							</li>
							<li>
								<NavLink to="/help-support#need-help" className="navlink" onClick={() => setIsOpen(false)}>{t.nav.contact}</NavLink>
							</li>
							<li>
								<NavLink to="/help-support#discover-domains" className="navlink" onClick={() => setIsOpen(false)}>{t.nav.faq}</NavLink>
							</li>
						</ul>

						<div className="flex items-center gap-2.5 2xl:ml-24 xl:ml-16 lg:ml-10">
							<div ref={languageDropDown.ref} className="relative">
								<button onClick={languageDropDown.toggle} type='button' className="language-menu">
									<img src={getLanguageFlag(language)} alt={getLanguageCode(language)} title={getLanguageCode(language)} className="w-5 h-3 object-cover object-center" />
									<p>{getLanguageCode(language)}</p>
									<IoChevronDown />
								</button>

								{/* Dropdown */}
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
					</div>

					{user ? <>
						<div className={`${isOpen ? "flex items-start justify-start" : "hidden"} lg:block pt-12 lg:pt-0 max-lg:w-full p-5 lg:p-0`}>
							<UserDropdownMenu classAdd={true} />
						</div>
					</>
						:
						<ul className={`${isOpen ? "flex" : "hidden"} lg:flex justify-center items-end lg:w-auto w-full lg:items-center 2xl:gap-10 gap-8 flex-col lg:flex-row p-5 lg:p-0`}>
							<li>
								<NavLink to="/sign-in" className="navlink" onClick={() => setIsOpen(false)}>{t.nav.signIn}</NavLink>
							</li>
							<li>
								<NavLink to="/create-account" className="navlink" onClick={() => setIsOpen(false)}>{t.nav.createAccount}</NavLink>
							</li>
						</ul>}
				</nav>
			</div>
		</>
	);
}

export default Navbar