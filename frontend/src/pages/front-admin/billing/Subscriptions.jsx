import { useNavigate } from "react-router";
import SubscriptionsTable from "../../../components/front-admin/billing/SubscriptionsTable";
import { HiArrowSmRight } from "react-icons/hi";
import { useLanguage } from "../../../hooks/useLanguage";

const Subscriptions = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  return (
    <div className="space-y-7">
      {/* title */}
      <div className="flex flex-col gap-2 title-section">
        <h2>{t.admin?.subscriptions || "Subscriptions"}</h2>
      </div>

      {/* table */}
      <div className="table-card">
        <SubscriptionsTable />
      </div>

      {/* Actions */}
      <div>
        <p className="card-admin-title">
          {t.admin?.actions || "Actions"}
        </p>

        <div
          className="md:w-1/2 w-full action-card"
          onClick={() => navigate("/payment-history")}
        >
          <div className="inner-action-card">
            <p>
              {t.admin?.subscriptionsSeePaymentHistory ||
                t.admin?.paymentHistory ||
                "See payment history"}
            </p>
            <HiArrowSmRight size={20} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Subscriptions;
