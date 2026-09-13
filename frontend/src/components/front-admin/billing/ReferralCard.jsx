import { useCallback, useEffect, useState } from "react";
import { LuGift, LuCopy, LuCheck, LuUsers } from "react-icons/lu";
import { walletAPI } from "../../../api/walletApi";

// "Refer a friend" card for the Wallet / Rewards area. Shows the user's unique
// share link + how many friends they've brought and how many have converted.
const ReferralCard = () => {
  const [info, setInfo] = useState(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await walletAPI.getReferralInfo();
      setInfo(res?.data || null);
    } catch {
      setInfo(null);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const copy = async () => {
    if (!info?.link) return;
    try {
      await navigator.clipboard.writeText(info.link);
    } catch {
      // Fallback for browsers without the async clipboard API.
      const el = document.createElement("textarea");
      el.value = info.link;
      document.body.appendChild(el);
      el.select();
      try { document.execCommand("copy"); } catch { /* ignore */ }
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const pts = Number(info?.points_per_referral) || 250;

  return (
    <div data-testid="referral-card">
      <p className="card-admin-title">Refer a friend</p>
      <div className="action-card p-6">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
            <LuGift className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold text-primary dark:text-white">
              Give {pts} points, get {pts} points
            </p>
            <p className="mt-1 text-sm text-secondary dark:text-gray-400">
              Share your link. When a friend signs up and completes their first paid order,
              you <span className="font-medium">both</span> earn {pts} points (about ${(pts * 0.02).toFixed(0)}).
            </p>

            {/* Share link + copy */}
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                readOnly
                data-testid="referral-link-input"
                value={info?.link || "Loading…"}
                onFocus={(e) => e.target.select()}
                className="w-full flex-1 rounded-lg border border-stokecolor bg-white px-3 py-2 text-sm text-primary outline-none nw-mono dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              />
              <button
                type="button"
                onClick={copy}
                disabled={!info?.link}
                data-testid="referral-copy-btn"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-darkbtn px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50 dark:bg-indigo-600"
              >
                {copied ? <LuCheck className="h-4 w-4" /> : <LuCopy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy link"}
              </button>
            </div>

            {/* Stats */}
            <div className="mt-4 flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-gray-800/60" data-testid="referral-invited">
                <LuUsers className="h-4 w-4 text-secondary dark:text-gray-400" />
                <span className="font-semibold text-primary dark:text-white">{info?.referred_count ?? 0}</span>
                <span className="text-secondary dark:text-gray-400">invited</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm dark:bg-emerald-500/10" data-testid="referral-rewarded">
                <LuCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-semibold text-emerald-700 dark:text-emerald-300">{info?.rewarded_count ?? 0}</span>
                <span className="text-emerald-700/80 dark:text-emerald-300/80">earned you points</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralCard;
