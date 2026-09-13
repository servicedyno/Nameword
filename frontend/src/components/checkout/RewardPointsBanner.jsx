import { useEffect, useState } from "react";
import { Link } from "react-router";
import { FiGift, FiArrowRight } from "react-icons/fi";
import { money } from "../../utils/checkoutFormat";
import { walletAPI } from "../../api/walletApi";
import checkoutAPI from "../../api/checkout";

// USD value of one reward point (mirrors the backend REWARD_POINT_VALUE default
// and the CartPage fallback). Used only for a friendly "worth ~$X" estimate.
const POINT_VALUE = 0.02;

/**
 * RewardPointsBanner
 * A celebratory bonus-points banner for the order-success page. Uses REAL data:
 * the points earned on this order (order.points_earned) and the buyer's current
 * reward balance (GET /wallet/reward-points). Detects a first order to greet new
 * buyers, and nudges them toward their next purchase. Fails silent/graceful.
 */
export default function RewardPointsBanner({ order }) {
  const earned = Number(order?.points_earned) || 0;
  const [balance, setBalance] = useState(null);
  const [isFirst, setIsFirst] = useState(false);

  useEffect(() => {
    let alive = true;
    walletAPI
      .getRewardPointLogs()
      .then((r) => {
        if (alive && r && typeof r.balance === "number") setBalance(r.balance);
      })
      .catch(() => {});
    checkoutAPI
      .listOrders()
      .then((r) => {
        if (alive) setIsFirst(Array.isArray(r?.orders) && r.orders.length <= 1);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const balNum = Number(balance) || 0;

  return (
    <div
      className="mt-8 overflow-hidden rounded-2xl border border-brand-200 dark:border-brand-400/25 bg-gradient-to-r from-brand-50 to-emerald-50 dark:from-brand-500/10 dark:to-emerald-500/10 p-5"
      data-testid="reward-points-banner"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4 min-w-0">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand text-on-brand shadow-md shadow-brand-500/30">
            <FiGift size={22} />
          </span>
          <div className="min-w-0">
            <p className="text-base font-bold text-primary dark:text-white" data-testid="reward-banner-title">
              {isFirst ? "Welcome — your rewards start here" : "You're earning rewards"}
            </p>
            <p className="mt-0.5 text-sm text-ink-soft dark:text-gray-300">
              {earned > 0 && (
                <span data-testid="reward-banner-earned">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">+{earned} points</span> from this order.{" "}
                </span>
              )}
              {balance !== null ? (
                <>
                  You now have{" "}
                  <span className="font-semibold text-primary dark:text-white" data-testid="reward-banner-balance">
                    {balNum} point{balNum === 1 ? "" : "s"}
                  </span>{" "}
                  (~{money(balNum * POINT_VALUE)}) to redeem on your next order.
                </>
              ) : (
                <>Earn 1 point for every $1 you add — then redeem points at checkout to save on future orders.</>
              )}
            </p>
          </div>
        </div>
        <Link to="/domains" className="nw-btn-primary shrink-0" data-testid="reward-banner-cta">
          Register another domain <FiArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
