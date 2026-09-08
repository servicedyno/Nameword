import { NavLink } from "react-router";
import { useState, useEffect, useMemo } from "react";
import { FiCheck } from "react-icons/fi";
import { TbExternalLink } from "react-icons/tb";
import { MdCached } from "react-icons/md";
import { useCustomLocation } from "../../../hooks/useCustomLocation";
import { useDomain } from "../../../hooks/useDomain";
import { hostingAPI } from "../../../api/hosting";
import { useAlert } from "../../../context/AlertContext";
import Loader from "../../../components/common/Loader";
import { useAuth } from "../../../hooks/useAuth";
import { useLanguage } from "../../../hooks/useLanguage";

const WebsitesOverview = () => {
  const [isOpen] = useState(false);
  const [hostingOrder, setHostingOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const locationState = useCustomLocation();
  const { domains } = useDomain();
  const { showAlert } = useAlert();
  const { user } = useAuth();
  const { t } = useLanguage();

  const activeDomain = useMemo(() => {
    if (locationState?.currentDomain?.websiteName) {
      return locationState.currentDomain;
    }

    return null;
  }, [locationState?.currentDomain?.websiteName]);

  // Fetch hosting order for the active domain
  useEffect(() => {
    const fetchHostingOrder = async () => {
      if (!user || !activeDomain?.websiteName) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await hostingAPI.getHostingOrders({
          domainName: activeDomain.websiteName,
          status: "completed",
        });

        if (response?.success && response?.responseData?.orders?.length > 0) {
          // Get the most recent completed order
          const orders = response.responseData.orders;
          setHostingOrder(orders[0]);
        } else {
          setHostingOrder(null);
        }
      } catch (error) {
        console.error("Error fetching hosting order:", error);
        const errorMsg =
          error?.response?.data?.responseMsg?.message ||
          error?.response?.data?.message ||
          t.websites.websitesOverview.failedToFetchHostingOrder;
        showAlert(errorMsg, { duration: 3000, type: "warning" });
        setHostingOrder(null);
      } finally {
        setLoading(false);
      }
    };

    fetchHostingOrder();
  }, [user, activeDomain, showAlert]);

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return t.websites.common.notAvailable;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return dateString;
    }
  };

  // Get control panel type based on provider
  const getControlPanel = () => {
    if (!hostingOrder) return t.websites.common.notAvailable;
    const provider = hostingOrder.provider?.toLowerCase();
    if (provider === "hostbay") {
      return "cPanel";
    } else if (provider === "connectreseller") {
      return "Plesk";
    }
    return "cPanel"; // Default
  };

  // Get WordPress status (for now, we'll check if hosting exists)
  const hasWordPress =
    hostingOrder?.hostbayResponse?.status === "provisioning" ||
    hostingOrder?.hostbayResponse?.status === "active" ||
    hostingOrder?.status === "completed";

  if (loading) {
    return <Loader />;
  }

  if (!activeDomain) {
    return (
      <div className="space-y-7">
        <div className="flex flex-col gap-2 title-section">
          <h2>{t.websites.websitesOverview.title}</h2>
        </div>
        <div className="table-card">
          <div className="py-7 px-5">
            <p className="text-secondary">{t.websites.websitesOverview.noDomainSelected}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!hostingOrder) {
    return (
      <div className="space-y-7">
        <div className="flex flex-col gap-2 title-section">
          <h2>{t.websites.websitesOverview.title}</h2>
        </div>
        <div className="table-card">
          <div className="py-7 px-5">
            <p className="text-secondary">{t.websites.websitesOverview.noHostingFound}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* title */}
      <div className="flex flex-col gap-2 title-section">
        <h2>{t.websites.websitesOverview.title}</h2>
      </div>

      <div className="table-card">
        <div className="flex justify-between items-center gap-2 px-5 py-2.5">
          <p className="info-card-title">
            {hostingOrder.planName || hostingOrder.plan || t.websites.websitesOverview.hostingPlan}
          </p>
          <NavLink to="/upgrade-plan" className="btn-outline small">
            {t.websites.websitesOverview.upgradePlan}
          </NavLink>
        </div>
        <hr className="card-divider" />

        <div className="py-7 px-5 space-y-4">
          <div className="flex items-center gap-2 info-detail">
            <p className="text-secondary">{t.websites.websitesOverview.createdOn}</p>
            <span className="text-primary dark:text-white">
              {formatDate(hostingOrder.createdAt)}
            </span>
          </div>
          <div className="flex items-center gap-2 info-detail">
            <p className="text-secondary">{t.websites.websitesOverview.wordpress}</p>
            <span className="text-darkbtn dark:text-white flex items-center gap-1">
              {hasWordPress ? (
                <>
                  <FiCheck size={14} />
                  {t.websites.websitesOverview.installed}
                </>
              ) : (
                t.websites.websitesOverview.notInstalled
              )}
            </span>
          </div>
          <div className="flex items-center gap-2 info-detail">
            <p className="text-secondary">{t.websites.websitesOverview.domain}</p>
            <span className="text-primary dark:text-white">
              {hostingOrder.domainName || activeDomain.websiteName}
            </span>
          </div>
          <div className="flex items-center gap-2 info-detail">
            <p className="text-secondary">{t.websites.websitesOverview.controlPanel}</p>
            <span className="text-primary dark:text-white">
              {getControlPanel()}
            </span>
          </div>
          <div className="flex items-center gap-2 info-detail">
            <p className="text-secondary">{t.websites.websitesOverview.status}</p>
            <span className="text-primary dark:text-white capitalize">
              {hostingOrder.status || t.websites.common.notAvailable}
            </span>
          </div>

          <p className="info-card-title">{t.websites.websitesOverview.quickActions}</p>

          <div className="flex flex-wrap items-center admin-btn gap-2 w-full">
            <NavLink
              to={""}
              className="btn-outline border-dark w-full sm:w-auto"
            >
              <MdCached size={14} /> {t.websites.websitesOverview.clearCache}
            </NavLink>
            <NavLink
              to={""}
              className="btn-outline border-dark w-full sm:w-auto"
            >
              {getControlPanel()} <TbExternalLink size={14} />
            </NavLink>
            {/* <NavLink to={""} className="add-to-cart w-full sm:w-auto">
              WordPress Admin <TbExternalLink size={14} />
            </NavLink> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebsitesOverview;
