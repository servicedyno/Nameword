import PaymentHistoryTable from "../../../components/front-admin/billing/PaymentHistoryTable";
import RefundHistoryTable from "../../../components/front-admin/billing/RefundHistoryTable";
import { useState } from "react";
import { useLanguage } from "../../../hooks/useLanguage";

const PaymentHistory = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("payment-history");
  
  return (
    <div className="space-y-7">
      {/* title */}
      <div className="flex flex-col gap-2 title-section">
        <h2>{t.admin?.paymentHistory || "Payment history"}</h2>
      </div>

      {/* Tab menu */}
      <div className="flex gap-2.5 mb-6">
        <button
          onClick={() => setActiveTab("payment-history")}
          className={`tab-button ${
            activeTab === "payment-history" ? "active" : ""
          }`}                 
        >
          {t.admin?.paymentHistory || "Payment history"}
        </button>
        <button
          onClick={() => setActiveTab("refund-history")}
          className={`tab-button ${
            activeTab === "refund-history" ? "active" : ""
          }`}
        >
          {t.admin?.refundHistory || "Refund history"}
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "payment-history" && (
          <div className="space-y-7">
            <div className="table-card">
              <PaymentHistoryTable />
            </div>
          </div>
        )}
        {activeTab === "refund-history" && (
          <div className="space-y-7">
            <div className="table-card">
              <RefundHistoryTable />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentHistory;
