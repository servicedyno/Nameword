import { useTheme } from '../../hooks/useTheme';
import { ImSun } from "react-icons/im";
import { MdOutlineNightlight } from "react-icons/md";
import { useLanguage } from '../../hooks/useLanguage';

const ThemeToggleButton = () => {
  const { mode, darkMode, lightMode } = useTheme();
  const { t } = useLanguage();
  const isDark =
    mode === 'dark' ||
    (mode === 'system' && typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));

  const base = "header-icon rounded-md p-1 cursor-pointer transition-colors";
  const on = "bg-brand text-on-brand";
  const off = "text-ink-soft hover:text-primary dark:text-gray-400 dark:hover:text-white";

  return (
    <div className="language-menu !gap-1" role="group" aria-label="Theme">
      <button
        type='button'
        onClick={lightMode}
        className={`${base} ${!isDark ? on : off}`}
        aria-label={t.common.buttons.lightMode}
        aria-pressed={!isDark}
      >
        <ImSun />
      </button>
      <button
        type='button'
        onClick={darkMode}
        className={`${base} rotate-180 ${isDark ? on : off}`}
        aria-label={t.common.buttons.darkMode}
        aria-pressed={isDark}
      >
        <MdOutlineNightlight />
      </button>
    </div>
  )
}

export default ThemeToggleButton
