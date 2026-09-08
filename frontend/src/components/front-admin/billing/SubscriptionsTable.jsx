import { TbArrowDown } from "react-icons/tb";
import { useState, useEffect, useMemo } from "react";
import { domainAPI } from "../../../api/domains";
import { hostingAPI } from "../../../api/hosting";
import { useAuth } from "../../../hooks/useAuth";
import Loader from "../../common/Loader";
import moment from "moment";
import { useNavigate } from "react-router";
import DataTable from "../../common/DataTable";
import { useLanguage } from "../../../hooks/useLanguage";

const SubscriptionsTable = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [domains, setDomains] = useState([]);
  const [hostingOrders, setHostingOrders] = useState([]);
  const { t } = useLanguage();

  // Fetch domains
  useEffect(() => {
    const fetchDomains = async () => {
      try {
        const response = await domainAPI.domainList();
        const domainsList = response?.data || response || [];
        setDomains(Array.isArray(domainsList) ? domainsList : []);
      } catch (error) {
        console.error("Error fetching domains:", error);
        setDomains([]);
      }
    };

    if (user) {
      fetchDomains();
    }
  }, [user]);

  // Fetch hosting orders
  useEffect(() => {
    const fetchHostingOrders = async () => {
      try {
        const response = await hostingAPI.getHostingOrders({
          status: "completed",
        });
        const orders =
          response?.responseData?.orders ||
          response?.data?.orders ||
          response?.orders ||
          [];
        setHostingOrders(Array.isArray(orders) ? orders : []);
      } catch (error) {
        console.error("Error fetching hosting orders:", error);
        setHostingOrders([]);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchHostingOrders();
    }
  }, [user]);

  // Combine and format subscriptions
  const subscriptions = useMemo(() => {
    const items = [];

    // Add domains
    domains.forEach((domain) => {
      if (!domain.websiteName) return;

      const tld = domain.websiteName.split(".").pop()?.toUpperCase() || "";
      const expirationDate = domain.expirationDate;
      const autoRenew =
        domain.autorenew === "On" ||
        domain.autorenew === true ||
        domain.autorenew === "true";

      items.push({
        id: domain._id || domain.id || domain.domainNameId,
        type: "domain",
        name: `.${tld} Domain`,
        subtitle: domain.websiteName,
        expirationDate: expirationDate,
        autoRenew: autoRenew,
      });
    });

    // Add hosting orders
    hostingOrders.forEach((order) => {
      if (!order.domainName && !order.planName) return;

      // Calculate expiration date: createdAt + period (months)
      const createdAt = order.createdAt
        ? new Date(order.createdAt)
        : new Date();
      const expirationDate = moment(createdAt)
        .add(order.period || 1, "months")
        .toDate();

      items.push({
        id: order._id || order.id,
        type: "hosting",
        name: order.planName || order.plan || t.admin.webHosting,
        subtitle: order.domainName || "",
        expirationDate: expirationDate,
        autoRenew: order.autoRenew || false,
      });
    });

    // Sort by expiration date (soonest first)
    return items.sort((a, b) => {
      if (!a.expirationDate) return 1;
      if (!b.expirationDate) return -1;
      return new Date(a.expirationDate) - new Date(b.expirationDate);
    });
  }, [domains, hostingOrders]);

  const columns = [
    {
      accessorFn: (row) => `${row.name} ${row.subtitle}`.trim(),
      header: t.admin.subscriptionsTable,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <p>{row.original.name}</p>
          <p className="text-secondary">{row.original.subtitle}</p>
        </div>
      )
    },
    {
      accessorFn: (row) => {
        return formatDate(row?.expirationDate);
      },
      header: t.admin.expirationDate,
      cell: ({ row }) => (
        <p>{formatDate(row.original?.expirationDate)}</p>
      ),
    },
    {
      accessorFn: (row) => {
        return row.autoRenew ? t.admin.on : t.admin.off;
      },
      header: t.admin.autoRenewal,
      cell: ({ row }) => (
        <p>{row.original?.autoRenew ? t.admin.on : t.admin.off}</p>
      )
    },
    {
      id: "actions",
      header: t.admin.actions,
      enableSorting: false,
      cell: ({ row }) => (
        <>
          <button
            className="btn-outline"
            onClick={() => handleRenew(row.original)}
          >
            {t.admin.renew}
          </button>
          <button
            className="btn-outline"
            onClick={() => handleMore(row.original)}
          >
            {t.admin.more}
          </button>
        </>
      )
    },
  ];


  // Format date for display (YYYY-MM-DD format)
  const formatDate = (date) => {
    if (!date) return t.admin.notAvailable;
    try {
      const dateObj = new Date(date);
      return dateObj.toLocaleDateString("en-CA"); // Returns YYYY-MM-DD format
    } catch (error) {
      return t.admin.notAvailable;
    }
  };

  // Handle renew button click
  const handleRenew = (item) => {
    if (item.type === "domain") {
      navigate(`/domain?value=${encodeURIComponent(item.subtitle)}`);
    } else {
      navigate(`/upgrade-plan?domain=${encodeURIComponent(item.subtitle)}`);
    }
  };

  // Handle more button click
  const handleMore = (item) => {
    if (item.type === "domain") {
      navigate(`/domain?value=${encodeURIComponent(item.subtitle)}`);
    } else {
      navigate(
        `/websites-overview?currentDomain=${encodeURIComponent(item.subtitle)}`
      );
    }
  };

  return (
    <>
      <DataTable
        data={subscriptions}
        columns={columns}
        notFoundMessage={t.admin.noActiveSubscriptionsFound}
      />
      {loading && <Loader />}
    </>
  );
};

export default SubscriptionsTable;
