import { MdCheck } from "react-icons/md";
import { TbArrowRight } from "react-icons/tb";
import { useLanguage } from "../../hooks/useLanguage";

const AnnualPlan = ({ plans = [], onSelectPlan }) => {
  const { t } = useLanguage();

  if (!plans.length) {
    return (
      <div className="py-10">
        <p className="text-gray-500 dark:text-gray-300">
          {t.cart.hosting.annualPlansNotAvailable}
        </p>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
      {plans.map((plan) => {
        // Calculate price and discount
        const price =
          plan.period_price ||
          plan.price ||
          plan.yearly_price ||
          0;
        const originalPrice =
          plan.original_price || plan.price || price;
        const discount =
          originalPrice > price
            ? Math.round(((originalPrice - price) / originalPrice) * 100)
            : 0;

        const priceLabel =
          plan?.display_price ||
          (plan?.yearly_price
            ? `$${plan.yearly_price}${t.cart.hosting.perYear}`
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
            t.cart.hosting.freeSSL,
            t.cart.hosting.dailyBackups,
          ];

        return (
          <div
            className="hosting-plan-card h-full"
            key={`${plan.provider}-${plan.id}`}
          >
            <div className="flex gap-5 flex-col items-start justify-start h-full">
     
              <p className="plan-heading">{plan.plan_name || plan.name}</p>

              <hr className="card-divider w-full" />

              <ul className="flex flex-col w-full gap-2.5">
                {features.slice(0, 10).map((feature, idx) => (
                  <li className="list-price-detail" key={idx}>
                    <MdCheck className="w-5 h-5" />
                    <p>{feature}</p>
                  </li>
                ))}
              </ul>

              <hr className="card-divider w-full" />

              <div className="text-left flex items-start w-full gap-2 flex-col">
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
                {plan?.savings && (
                  <span className="save-lable">{plan.savings}</span>
                )}
                <p className="plan-detail">
                  {plan?.plan_description || t.cart.hosting.annualBillingCycle}
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

export default AnnualPlan;
