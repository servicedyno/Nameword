import { useEffect, useMemo, useState, useCallback } from "react";
import { TbExternalLink, TbDots } from "react-icons/tb";
import { RiWordpressFill } from "react-icons/ri";
import { NavLink } from "react-router";
import { hostingAPI } from "../../../api/hosting";
import { useDomain } from "../../../hooks/useDomain";
import { useAlert } from "../../../context/AlertContext";
import DataTable from "../../../components/common/DataTable";
import Loader from "../../../components/common/Loader";
import useDropdown from "../../../hooks/useDropdown";
import { useLanguage } from "../../../hooks/useLanguage";

const getPlanLabel = (order) => {
  if (!order) return "No hosting connected";
  return (
    order.planName ||
    order.planSnapshot?.name ||
    order.planSnapshot?.title ||
    order.plan?.replace(/_/g, " ") ||
    "Hosting plan"
  );
};

const getPlanDisplayName = (plan) => {
  if (!plan) return "Hosting";
  // Convert plan names like "pro_7day" to "Pro 7 Days"
  const planName = plan.toLowerCase();
  if (planName.includes("pro_7day") || planName.includes("pro 7 day")) {
    return "Pro 7 Days";
  }
  if (planName.includes("pro_30day") || planName.includes("pro 30 day")) {
    return "Pro 30 Days";
  }
  // Fallback: format the plan name nicely
  return plan.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
};

const getStatusLabel = (order) => {
  if (!order) return "Setup required";
  const status = order.status || order.hostbayResponse?.status;
  return status ? status.replace(/_/g, " ") : "Active";
};

const getControlPanelLabel = (provider) => {
  if (!provider) return "Control panel";
  return provider.toLowerCase() === "connectreseller" ? "Plesk" : "cPanel";
};

const buildDomainState = (domain, domainName) => {
  if (domain) {
    return { currentDomain: domain };
  }
  if (domainName) {
    return { currentDomain: { websiteName: domainName } };
  }
  return undefined;
};

const RowActions = ({ hostingOrder, domainState, onDelete }) => {
  const { t } = useLanguage();
  const dropdown = useDropdown();

  if (!hostingOrder) {
    return (
      <NavLink
        to={"/setup-websites"}
        state={domainState}
        className="btn-outline"
      >
        {t.websites.websitesList.startSetup}
      </NavLink>
    );
  }

  const controlPanelUrl =
    hostingOrder.hostbayResponse?.control_panel_url ||
    hostingOrder.hostbayResponse?.cpanel_url ||
    hostingOrder.hostbayResponse?.login_url;
  const wordpressUrl =
    hostingOrder.hostbayResponse?.wordpress_admin_url ||
    hostingOrder.hostbayResponse?.wordpress_url;

  const handleDelete = () => {
    dropdown.close();
    if (onDelete) {
      onDelete(hostingOrder, domainState);
    }
  };

  return (
    <div className="icon-head flex-wrap gap-2">
      {controlPanelUrl && (
        <a
          href={controlPanelUrl}
          target="_blank"
          rel="noreferrer"
          className="btn-outline"
        >
          {(hostingOrder.provider || "").toLowerCase() === "connectreseller"
            ? (t.plesk || "Plesk")
            : (t.cpanel || "cPanel")}{" "}
          <TbExternalLink size={14} />
        </a>
      )}
      {wordpressUrl && (
        <a
          href={wordpressUrl}
          target="_blank"
          rel="noreferrer"
          className="btn-outline"
        >
          {t.websites.websitesList.wpAdmin} <TbExternalLink size={14} />
        </a>
      )}
      <NavLink
        to={"/websites-overview"}
        state={domainState}
        className="btn-outline"
      >
        {t.websites.websitesList.dashboard}
      </NavLink>
      <div ref={dropdown.ref} className="relative">
        <button
          onClick={dropdown.toggle}
          className="btn-outline btn-icon"
          type="button"
        >
          <TbDots />
        </button>
        {dropdown.isOpen && (
          <div
            className={`user-dropdown !border-darkbtn-200 dark:!border-gray-900 ${dropdown.isPositioned ? "show" : ""
              }`}
            style={dropdown.positionStyle}
          >
            <div className="p-3">
              <NavLink
                to={"/manage-plan"}
                state={domainState}
                className="user-menu hover:!bg-hover"
                onClick={dropdown.close}
              >
                {t.websites.websitesList.managePlan}
              </NavLink>
              <button
                type="button"
                onClick={handleDelete}
                className="user-menu red-color hover:!bg-hover"
              >
                {t.websites.websitesList.delete}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Websites = () => {
  const { t } = useLanguage();
  const [hostingOrders, setHostingOrders] = useState([]);
  const [addonDomainsMap, setAddonDomainsMap] = useState({});
  const [loading, setLoading] = useState(true);

  const { domains } = useDomain();
  const { showAlert } = useAlert();

  useEffect(() => {
    let isMounted = true;

    const fetchHostingOrders = async () => {
      try {
        setLoading(true);
        const response = await hostingAPI.getHostingOrders({
          status: "completed",
        });
        const fetchedOrders = response?.responseData?.orders;
        if (!isMounted) return;
        setHostingOrders(Array.isArray(fetchedOrders) ? fetchedOrders : []);

        // Fetch addon domains for each hosting order with subscription_id
        if (Array.isArray(fetchedOrders) && fetchedOrders.length > 0) {
          const addonPromises = fetchedOrders.map(async (order) => {
            const subscriptionId =
              order?.hostbayResponse?.subscription?.id ||
              order?.hostbayResponse?.subscription_id ||
              order?.subscription_id ||
              order?.subscriptionId;

            if (subscriptionId) {
              try {
                const subIdInt = parseInt(subscriptionId, 10);
                if (!isNaN(subIdInt) && subIdInt > 0) {
                  const addonResponse = await hostingAPI.getAddonDomains(subIdInt);
                  if (addonResponse?.success && addonResponse?.responseData) {
                    return {
                      subscriptionId: subIdInt,
                      addonData: addonResponse.responseData
                    };
                  }
                }
              } catch (error) {
                console.error(
                  `Failed to fetch addon domains for subscription ${subscriptionId}:`,
                  error
                );
              }
            }
            return null;
          });

          const addonResults = await Promise.all(addonPromises);
          const addonMap = {};
          addonResults.forEach(result => {
            if (result && result.subscriptionId) {
              addonMap[result.subscriptionId] = result.addonData;
            }
          });

          if (!isMounted) return;
          setAddonDomainsMap(addonMap);
        }
      } catch (error) {
        if (!isMounted) return;
        console.error("Failed to fetch hosting orders:", error);
        const errorMsg =
          error?.response?.data?.responseMsg?.message ||
          error?.response?.data?.message ||
          t.websites.websitesList.failedToFetch ||
          "Failed to fetch websites";
        showAlert(errorMsg, { duration: 3000, type: "warning" });
        setHostingOrders([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchHostingOrders();

    return () => {
      isMounted = false;
    };
  }, [showAlert]);

  const hostingMap = useMemo(() => {
    const map = new Map();
    hostingOrders.forEach((order) => {
      const domainName = (
        order.domainName ||
        order.hostbayResponse?.domain ||
        ""
      )
        .toLowerCase()
        .trim();
      if (domainName && !map.has(domainName)) {
        map.set(domainName, order);
      }
    });
    return map;
  }, [hostingOrders]);

  // Get unique purchased plans
  const purchasedPlans = useMemo(() => {
    const planSet = new Set();
    hostingOrders.forEach((order) => {
      if (order.plan) {
        planSet.add(order.plan);
      }
    });

    // Sort plans: pro_7day first, then pro_30day, then others
    const planArray = Array.from(planSet);
    return planArray.sort((a, b) => {
      if (a.includes("pro_7day")) return -1;
      if (b.includes("pro_7day")) return 1;
      if (a.includes("pro_30day")) return -1;
      if (b.includes("pro_30day")) return 1;
      return a.localeCompare(b);
    });
  }, [hostingOrders]);

  // Group table rows by plan
  const tableRowsByPlan = useMemo(() => {
    const allRows = [];

    // Add domains with hosting orders
    if (Array.isArray(domains)) {
      domains.forEach((domain) => {
        const domainName =
          domain?.websiteName || domain?.domainName || domain?.name || "";
        const normalized = domainName.toLowerCase();
        const hostingOrder = hostingMap.get(normalized);

        if (hostingOrder && hostingOrder.plan) {
          allRows.push({
            id: domain?.id || domain?._id || domainName,
            domain,
            domainName,
            hostingOrder,
            plan: hostingOrder.plan,
            isAddon: false,
          });

          // Add addon domains as separate rows
          const subscriptionId =
            hostingOrder?.hostbayResponse?.subscription?.id ||
            hostingOrder?.hostbayResponse?.subscription_id ||
            hostingOrder?.subscription_id ||
            hostingOrder?.subscriptionId;

          if (subscriptionId) {
            const subIdInt = parseInt(subscriptionId, 10);
            const addonData = addonDomainsMap[subIdInt];

            if (addonData && Array.isArray(addonData.addon_domains) && addonData.addon_domains.length > 0) {
              addonData.addon_domains.forEach((addonDomain) => {
                const addonDomainName = addonDomain.domain;
                if (addonDomainName) {
                  allRows.push({
                    id: `addon-${subIdInt}-${addonDomainName}`,
                    domain: null,
                    domainName: addonDomainName,
                    hostingOrder: hostingOrder,
                    plan: hostingOrder.plan,
                    isAddon: true,
                  });
                }
              });
            }
          }
        }
      });
    }

    // Add hosting orders without domains
    hostingOrders.forEach((order) => {
      const domainName = order.domainName || order.hostbayResponse?.domain;
      if (!domainName || !order.plan) return;

      const normalized = domainName.toLowerCase();
      const exists = allRows.some(
        (row) =>
          row.domainName?.toLowerCase() === normalized &&
          row.plan === order.plan &&
          !row.isAddon
      );

      if (!exists) {
        allRows.push({
          id: order._id || order.id || domainName,
          domain: null,
          domainName,
          hostingOrder: order,
          plan: order.plan,
          isAddon: false,
        });

        // Add addon domains as separate rows
        const subscriptionId =
          order?.hostbayResponse?.subscription?.id ||
          order?.hostbayResponse?.subscription_id ||
          order?.subscription_id ||
          order?.subscriptionId;

        if (subscriptionId) {
          const subIdInt = parseInt(subscriptionId, 10);
          const addonData = addonDomainsMap[subIdInt];

          if (addonData && Array.isArray(addonData.addon_domains) && addonData.addon_domains.length > 0) {
            addonData.addon_domains.forEach((addonDomain) => {
              const addonDomainName = addonDomain.domain;
              if (addonDomainName) {
                allRows.push({
                  id: `addon-${subIdInt}-${addonDomainName}`,
                  domain: null,
                  domainName: addonDomainName,
                  hostingOrder: order,
                  plan: order.plan,
                  isAddon: true,
                });
              }
            });
          }
        }
      }
    });

    // Group by plan
    const grouped = {};
    allRows.forEach((row) => {
      const plan = row.plan;
      if (!grouped[plan]) {
        grouped[plan] = [];
      }
      grouped[plan].push(row);
    });

    return grouped;
  }, [domains, hostingMap, hostingOrders, addonDomainsMap]);

  const handleDeleteWebsite = useCallback(async (hostingOrder, domainState) => {
    const domainName =
      domainState?.currentDomain?.websiteName || hostingOrder?.domainName;
    const orderId = hostingOrder?._id || hostingOrder?.id;

    if (!orderId) {
      showAlert(t.websites.websitesList.unableToDelete || "Unable to delete: Order ID not found", { type: "fail" });
      return;
    }

    if (
      !window.confirm(
        (t.websites.websitesList.deleteConfirmation || `Are you sure you want to delete the website "{domain}"? This action cannot be undone.`).replace("{domain}", domainName)
      )
    ) {
      return;
    }

    try {
      const response = await hostingAPI.deleteHostingOrder(orderId);

      if (response?.success) {
        showAlert(
          response?.responseMsg?.message || t.websites.websitesList.websiteDeletedSuccess || "Website deleted successfully",
          { type: "success" }
        );

        // Refresh the hosting orders list
        const refreshResponse = await hostingAPI.getHostingOrders({
          status: "completed",
        });
        const fetchedOrders = refreshResponse?.responseData?.orders;
        setHostingOrders(Array.isArray(fetchedOrders) ? fetchedOrders : []);
      } else {
        showAlert(
          response?.responseMsg?.message || t.websites.websitesList.failedToDelete || "Failed to delete website",
          { type: "fail" }
        );
      }
    } catch (error) {
      console.error("Error deleting website:", error);
      const errorMsg =
        error?.response?.data?.responseMsg?.message ||
        error?.response?.data?.message ||
        t.websites.websitesList.failedToDeleteRetry || "Failed to delete website. Please try again.";
      showAlert(errorMsg, { type: "fail" });
    }
  }, [showAlert]);

  const columns = useMemo(
    () => [
      {
        accessorKey: "domainName",
        header: t.websites.websitesList.website || "Website",
        cell: ({ row }) => {
          return (
            <div className="icon-head text-left">
              <RiWordpressFill />
              <div className="text-left">
                <p className="font-medium text-primary dark:text-white">
                  {row.original.domainName || t.websites.websitesList.unnamedDomain || "Unnamed domain"}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        id: "actions",
        header: t.websites.websitesList.actions || "Actions",
        enableSorting: false,
        cell: ({ row }) => {
          const domainState = buildDomainState(
            row.original.domain,
            row.original.domainName
          );
          return (
            <RowActions
              hostingOrder={row.original.hostingOrder}
              domainState={domainState}
              onDelete={handleDeleteWebsite}
            />
          );
        },
      },
    ],
    [showAlert, handleDeleteWebsite, addonDomainsMap, t]
  );

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-2 title-section">
        <h2>{t.websites.websitesList.title}</h2>
      </div>

      <div className="flex items-center justify-end">
        <NavLink className="add-to-cart px-7" to="/hosting">
          {t.websites.websitesList.getNewHostingPlan}
        </NavLink>
      </div>

      {loading ? (
        <div className="py-10 text-center">
          <Loader />
        </div>
      ) : purchasedPlans.length === 0 ? (
        <div className="table-card">
          <div className="p-6 text-center">
            <p className="text-secondary">
              {t.websites.websitesList.noHostingPlansFound}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {purchasedPlans.map((plan) => {
            const planRows = tableRowsByPlan[plan] || [];
            const planDisplayName = getPlanDisplayName(plan);
            // Get plan ID for setup - map plan to ID
            const planId = plan?.includes("pro_7day")
              ? 1
              : plan?.includes("pro_30day")
                ? 2
                : null;

            return (
              <div key={plan} className="table-card">
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4 bg-white dark:bg-gray-800">
                  <h3 className="text-primary dark:text-white font-medium">
                    {planDisplayName}
                  </h3>
                  <NavLink
                    to="/setup-websites"
                    className="add-to-cart !h-10"
                    state={planId ? { selectedPlan: planId } : {}}
                  >
                    {t.websites.websitesList.addWebsite}
                  </NavLink>
                </div>
                {planRows.length === 0 ? (
                  <div className="p-6 text-center text-secondary">
                    {t.websites.websitesList.noWebsitesAdded}
                  </div>
                ) : (
                  <DataTable
                    data={planRows}
                    columns={columns}
                    enableSearch={false}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Websites;
