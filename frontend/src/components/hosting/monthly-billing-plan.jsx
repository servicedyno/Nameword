import { MdCheck } from "react-icons/md";
import { TbArrowRight } from "react-icons/tb";
import { NavLink } from "react-router";
import { useLanguage } from "../../hooks/useLanguage";

const MonthlyPlan = ({ plans = [], onSelectPlan }) => {
  const { t } = useLanguage();

  if (!plans.length) {
    return (
      <div className="py-10">
        <p className="text-gray-500 dark:text-gray-300">
          {t.cart.hosting.monthlyPlansNotAvailable}
        </p>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
      {plans.map((plan) => {
        // Calculate price and discount
        const price =
          plan.period_price || plan.price || plan.monthly_price || 0;
        const originalPrice = plan.original_price || plan.price || price;
        const discount =
          originalPrice > price
            ? Math.round(((originalPrice - price) / originalPrice) * 100)
            : 0;

        const priceLabel =
          plan?.display_price ||
          (plan?.monthly_price
            ? `$${plan.monthly_price}/month`
            : plan?.period_price
              ? `$${plan.period_price}`
              : t.cart.hosting.contactUs);

        const features = Array.isArray(plan?.features)
          ? plan.features
          : [
            `${plan?.disk_space_gb ?? 0} ${t.cart.hosting.gbSSDStorage}`,
            `${plan?.bandwidth_gb ?? 0} ${t.cart.hosting.gbBandwidth}`,
            `${plan?.email_accounts ?? 0} ${t.cart.hosting.emailAccounts}`,
            `${plan?.databases ?? 0} ${t.cart.hosting.databases}`,
          ];

        return (
          <div
            className="hosting-plan-card h-full"
            key={`${plan.provider}-${plan.id}`}
          >
            <div className="flex gap-5 flex-col items-start justify-start h-full">
              <div className="flex justify-between items-center gap-2 w-full">
                <p className="plan-title capitalize">
                  {plan.provider || t.cart.hosting.hostingFallback}
                </p>
                <span className="badge dark:text-gray-200">{plan.billing_cycle}</span>
              </div>
              <p className="plan-heading">{plan.plan_name || plan.name}</p>

              <hr className="card-divider w-full" />

              <ul className="flex flex-col w-full gap-2.5">
                {features.slice(0, 8).map((feature, idx) => (
                  <li className="list-price-detail" key={idx}>
                    <MdCheck className="w-5 h-5" />
                    <p>{feature}</p>
                  </li>
                ))}
              </ul>

              <hr className="card-divider w-full" />

              <div className="text-left">
                <div className="flex flex-col items-start gap-1 mb-2">
                  <div className="text-lg font-medium text-tealdark">
                    ${price.toFixed(2)}
                  </div>
                  {originalPrice > price && (
                    <>
                      <div className="text-13 font-medium line-through text-secondary">
                        ${originalPrice.toFixed(2)}
                      </div>
                      <div className="text-xs font-medium text-secondary">
                        {t.cart.hosting.percentOff.replace("{percent}", discount)}
                      </div>
                    </>
                  )}
                </div>
                <p className="plan-detail">
                  {plan?.plan_description || t.cart.hosting.monthlyBillingCycle}
                </p>
              </div>

              <button
                className="add-to-cart px-8 mt-auto"
                onClick={() => onSelectPlan?.(plan)}
              >
                {t.cart.hosting.choosePlan.replace("{planName}", plan.plan_name || plan.name)} <TbArrowRight size={18} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MonthlyPlan;
