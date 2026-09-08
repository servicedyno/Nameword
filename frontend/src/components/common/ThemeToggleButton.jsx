import { useTheme } from '../../hooks/useTheme';
import { ImSun } from "react-icons/im";
import { MdOutlineNightlight } from "react-icons/md";
import { useLanguage } from '../../hooks/useLanguage';

const ThemeToggleButton = () => {
  const { mode, darkMode, lightMode } = useTheme();
  const { t } = useLanguage();
  return (
    <>
      <div className="language-menu">
        <button
          type='button'
          onClick={lightMode}
          className={`header-icon p-1 ${mode === 'light' || mode === 'system' ? 'text-white bg-darkbtn dark:bg-gray-700 rounded' : ' text-primary dark:text-white'} cursor-pointer`}
          aria-label={t.common.buttons.lightMode}
        >
          <ImSun />
        </button>

        <button
          type='button'
          onClick={darkMode}
          className={`header-icon p-1 rotate-180 ${mode === 'dark' ? 'text-white bg-darkbtn dark:bg-gray-700 rounded' : ' text-primary dark:text-white'} cursor-pointer`}
          aria-label={t.common.buttons.darkMode}
        >
          <MdOutlineNightlight />
        </button>
      </div>
    </>
  )
}

export default ThemeToggleButton
