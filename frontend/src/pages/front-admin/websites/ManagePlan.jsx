import { useState, useEffect, useMemo } from "react";
import { useCustomLocation } from "../../../hooks/useCustomLocation";
import { useDomain } from "../../../hooks/useDomain";
import { hostingAPI } from "../../../api/hosting";
import { useAlert } from "../../../context/AlertContext";
import { useAuth } from "../../../hooks/useAuth";
import { useLanguage } from "../../../hooks/useLanguage";
import Loader from "../../../components/common/Loader";
import { domainAPI } from "../../../api/domains";
import WebsiteDetailsCard from "../../../components/front-admin/websites/WebsiteDetailsCard";
import NameserversCard from "../../../components/front-admin/websites/NameserversCard";
import HostingDetailsCard from "../../../components/front-admin/websites/HostingDetailsCard";
import FTPDetailsCard from "../../../components/front-admin/websites/FTPDetailsCard";
import ServerDetailsCard from "../../../components/front-admin/websites/ServerDetailsCard";

// Match hosting order to a plan from /hosting-plans/plans (by whm_package, id, or plan_name)
const matchOrderToPlan = (hostingOrder, plans = []) => {
  if (!hostingOrder || !Array.isArray(plans) || plans.length === 0) return null;
  const snapshot = hostingOrder?.planSnapshot || {};
  const planDetails = hostingOrder?.hostbayResponse?.plan_details || {};
  const whm = snapshot.whm_package ?? planDetails.whm_package;
  const planId = snapshot.id ?? planDetails.id;
  const planName =
    snapshot.plan_name ??
    snapshot.name ??
    planDetails.plan_name ??
    planDetails.name ??
    hostingOrder?.planName ??
    hostingOrder?.plan;
  const norm = (s) => (s ? String(s).trim().toLowerCase() : "");
  for (const plan of plans) {
    if (whm && plan.whm_package && norm(plan.whm_package) === norm(whm)) return plan;
    if (planId != null && plan.id != null && Number(plan.id) === Number(planId)) return plan;
    if (planName && (plan.plan_name || plan.name) && norm(plan.plan_name || plan.name) === norm(planName)) return plan;
  }
  return null;
};

const ManagePlan = () => {
  const [hostingOrder, setHostingOrder] = useState(null);
  const [domainData, setDomainData] = useState(null);
  const [hostingPlans, setHostingPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const locationState = useCustomLocation();
  const { domains } = useDomain();
  const { showAlert } = useAlert();
  const { user } = useAuth();
  const { t } = useLanguage();

  // Get active domain from location state (set by sidebar dropdown)
  const activeDomain = useMemo(() => {
    if (locationState?.currentDomain?.websiteName) {
      return locationState.currentDomain;
    }
    return null;
  }, [locationState?.currentDomain?.websiteName]);

  // Resolve plan from API (data.plans) so card can show disk_space_gb, bandwidth_gb, etc.
  const resolvedPlan = useMemo(
    () => matchOrderToPlan(hostingOrder, hostingPlans),
    [hostingOrder, hostingPlans]
  );

  // Fetch hosting plans (for plan details) + hosting order + domain data
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !activeDomain?.websiteName) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch plans from API (Pro 7 Days, Pro 30 Days, Pro Annual – has disk_space_gb, bandwidth_gb, etc.)
        try {
          const plansRes = await hostingAPI.getHostingPlans();
          const plans = plansRes?.data?.plans ?? plansRes?.responseData?.plans ?? [];
          if (Array.isArray(plans) && plans.length > 0) {
            setHostingPlans(plans);
          }
        } catch (e) {
          console.error("Error fetching hosting plans:", e);
        }

        // Fetch hosting order for selected domain
        const hostingResponse = await hostingAPI.getHostingOrders({
          domainName: activeDomain.websiteName,
          status: "completed",
        });

        if (
          hostingResponse?.success &&
          hostingResponse?.responseData?.orders?.length > 0
        ) {
          setHostingOrder(hostingResponse.responseData.orders[0]);
        } else {
          setHostingOrder(null);
        }

        // Fetch domain details for nameservers
        try {
          const domainResponse = await domainAPI.viewDomain({
            domain: activeDomain.websiteName,
          });
          if (domainResponse?.responseData) {
            setDomainData(domainResponse.responseData);
          }
        } catch (domainError) {
          console.error("Error fetching domain data:", domainError);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        const errorMsg =
          error?.response?.data?.responseMsg?.message ||
          error?.response?.data?.message ||
          "Failed to fetch data";
        showAlert(errorMsg, { duration: 3000, type: "warning" });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, activeDomain, showAlert]);

  if (loading) {
    return <Loader />;
  }

  if (!activeDomain) {
    return (
      <div className="space-y-7">
        <div className="flex flex-col gap-2 title-section">
          <h2>{t.websites.managePlan.title}</h2>
        </div>
        <div className="table-card">
          <div className="py-7 px-5">
            <p className="text-secondary">
              {t.websites.managePlan.noDomainSelected}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* title */}
      <div className="flex flex-col gap-2 title-section">
        <h2>{t.websites.managePlan.title}</h2>
      </div>

      <div className="grid lg:grid-cols-2 grid-cols-1 gap-5">
        {/* Website Details */}
        <WebsiteDetailsCard domain={activeDomain} hostingOrder={hostingOrder} />

        {/* Nameservers */}
        <NameserversCard
          domain={activeDomain}
          domainData={domainData}
          hostingOrder={hostingOrder}
        />

        {/* Hosting Details Card – resolvedPlan has disk_space_gb, bandwidth_gb from API */}
        <HostingDetailsCard hostingOrder={hostingOrder} resolvedPlan={resolvedPlan} />

        <div className="flex flex-col gap-5 w-full">
          {/* FTP Details Card */}
          <FTPDetailsCard domain={activeDomain} hostingOrder={hostingOrder} />

          {/* Server Details Card */}
          <ServerDetailsCard hostingOrder={hostingOrder} />
        </div>
      </div>
    </div>
  );
};

export default ManagePlan;
