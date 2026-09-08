import Sidebar from '../components/front-admin/admin-common/sidebar'
import Topbar from '../components/front-admin/admin-common/topbar'
import { Outlet } from 'react-router'
import { useState, useEffect, useRef } from 'react';
import { CgMenu } from "react-icons/cg";
import { IoClose } from "react-icons/io5";
import { favicon, Help, USA, ES, FR } from "../components/common/icons";
import { NavLink } from "react-router";
import ThemeToggleButton from "../components/common/ThemeToggleButton";
import useDropdown from '../hooks/useDropdown';
import { IoChevronDown } from "react-icons/io5";
import { useLanguage } from "../hooks/useLanguage";
import CartIconButton from "../components/common/CartIconButton";
import UserDropdownMenu from "../components/common/UserDropdownMenu";
import LiveChat from "../components/LiveChat";
import { useAuth } from "../hooks/useAuth";

const FrontLayout = () => {
	const [isEnlarge, setIsEnlarge] = useState(window.matchMedia('(min-width: 1280px)').matches);

	const { loading } = useAuth();
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
	useEffect(() => {
		const mqLarge = window.matchMedia('(min-width: 1280px)');

		// Set initial values
		setIsEnlarge(mqLarge.matches);

		// Define listeners
		const handleLargeChange = (e) => setIsEnlarge(e.matches);
		mqLarge.addEventListener('change', handleLargeChange);

		// Cleanup listeners on unmount
		return () => {
			mqLarge.removeEventListener('change', handleLargeChange);
		};
	}, []);
	const sidebarRef = useRef(null);
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (
				isEnlarge &&
				sidebarRef.current &&
				sidebarRef.current.contains(event.target) &&
				window.matchMedia('(max-width: 1280px)').matches
			) {
				setIsEnlarge(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [isEnlarge]);

	return (
		<div className='flex bg-bodycolor dark:bg-gray-900'>
			<div className={`${isEnlarge
				? 'min-w-80 w-80 h-screen overflow-auto bg-beige-100 dark:bg-gray-800 px-7 py-8 xl:relative fixed inset-y-0 left-0 z-30 translate-x-0'
				: 'w-0 fixed inset-y-0 left-0 h-full overflow-hidden -translate-x-full '
				}`} >
				<button onClick={() => setIsEnlarge(!isEnlarge)} className={`cursor-pointer xl:hidden text-primary dark:text-white flex`}>
					<IoClose size={22} />
				</button>

				<Sidebar setIsEnlarge={setIsEnlarge} />
			</div>


			<div className={`h-screen overflow-auto ${isEnlarge
				? 'xl:w-[calc(100% - 320px)] w-full'
				: 'w-full'
				}`} ref={sidebarRef}>

				<div className={`sticky top-0 left-0 w-full ${loading ? "z-50" : "z-20"} bg-bodycolor dark:bg-gray-900 lg:px-5 py-6`}>
					<div className="flex items-center justify-end w-full px-4 sm:px-5 xl:px-7">
						<div className="flex xl:justify-end justify-between items-center gap-14 w-full">
							<div className={`cursor-pointer xl:hidden text-primary dark:text-white flex`}>
								<div className='flex items-center gap-4 flex-none'>
									<button><CgMenu size={20} onClick={() => setIsEnlarge(!isEnlarge)} /></button>
									<NavLink to={"/"}><img src={favicon} alt="Hosting" className="w-8 h-8 dark-mode" /></NavLink>
								</div>
							</div>

							<ul className="xl:flex hidden justify-center items-center gap-10">
								<li>
									<NavLink to={"/help-support"} className="auth-navlink">
										<img src={Help} alt={t.nav.helpSupport} title={t.nav.helpSupport} className="dark-mode" /> {t.nav.helpSupport}
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

				<div className='main-content min-h-[calc(100%-150px)]'>
					<Outlet />
				</div>

				<div className="space-y-5 text-13 font-medium xl:hidden flex flex-col gap-5 px-4">
					<p className="text-lightgray-500 mb-0">{new Date().getFullYear()} {t.footer.allRightsReserved}</p>
					<div className="flex gap-4 dark:text-gray-400 hover:dark:text-gray-400">
						<NavLink to="/terms-and-conditions">{t.footer.termsAndConditions}</NavLink>
						<NavLink to="/privacy-policy">{t.footer.privacyPolicy}</NavLink>
					</div>
				</div>
			</div>
			{(import.meta.env.VITE_SHOW_CHAT === "true" || import.meta.env.VITE_SHOW_CHAT === true) && <LiveChat />}
		</div>
	)
}

export default FrontLayout
