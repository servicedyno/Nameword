import { useState } from "react";
import { LuX, LuShieldCheck } from "react-icons/lu";
import { useLanguage } from "../../../hooks/useLanguage";

const KEY = "nw_announce_dismissed_v1";

// Thin, dismissible privacy/crypto strip at the very top of the landing.
export default function AnnouncementBar() {
  const { t } = useLanguage();
  const p = t.site.home.promo;
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(KEY) === "1";
    } catch {
      return false;
    }
  });
  if (hidden) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setHidden(true);
  };

  return (
    <div className="relative z-30 bg-gradient-to-r from-brand-700 via-brand-600 to-indigo-500 text-white" data-testid="announcement-bar">
      <div className="nw-container flex items-center justify-center gap-2.5 py-2.5 pr-8 text-center">
        <LuShieldCheck className="hidden h-4 w-4 shrink-0 text-white/90 sm:block" />
        <p className="text-[13px] font-medium tracking-tight text-white/95">{p.announce}</p>
      </div>
      <button
        onClick={dismiss}
        aria-label={p.announceDismiss}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
        data-testid="announcement-dismiss"
      >
        <LuX className="h-4 w-4" />
      </button>
    </div>
  );
}
