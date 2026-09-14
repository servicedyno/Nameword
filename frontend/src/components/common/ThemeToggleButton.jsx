import { useTheme } from '../../hooks/useTheme';
import { ImSun } from "react-icons/im";
import { MdOutlineNightlight } from "react-icons/md";
import { useLanguage } from '../../hooks/useLanguage';

// Single toggle (sun ⇄ moon) with a finger-sized hit area on mobile.
const ThemeToggleButton = () => {
  const { mode, darkMode, lightMode } = useTheme();
  const { t } = useLanguage();
  const isDark =
    mode === 'dark' ||
    (mode === 'system' && typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));

  return (
    <button
      type="button"
      onClick={isDark ? lightMode : darkMode}
      aria-label={isDark ? t.common.buttons.lightMode : t.common.buttons.darkMode}
      aria-pressed={isDark}
      title={isDark ? t.common.buttons.lightMode : t.common.buttons.darkMode}
      className="header-icon-btn"
      data-testid="theme-toggle"
    >
      {isDark ? <ImSun className="h-[17px] w-[17px]" /> : <MdOutlineNightlight className="h-[19px] w-[19px] rotate-180" />}
    </button>
  );
};

export default ThemeToggleButton;
