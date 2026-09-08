import { useState, useEffect, useCallback } from "react";
import { useAlert } from "../../../../context/AlertContext";
import { useDomain } from "../../../../hooks/useDomain";
import { useCustomLocation } from "../../../../hooks/useCustomLocation";
import { dnsAPI } from "../../../../api/domains";
import Loader from "../../../common/Loader";
import DataTable from "../../../common/DataTable";
import RestoreDnsHistory from "../../../modals/restore-dns-history";
import { useLanguage } from "../../../../hooks/useLanguage";

const DNShistory = ({ domainName }) => {
  const { showAlert } = useAlert();
  const { t } = useLanguage();
  const { viewDomain } = useDomain();
  const locationState = useCustomLocation();

  const activeDomainName =
    domainName ||
    locationState?.currentDomain?.websiteName ||
    viewDomain?.websiteName ||
    "";

  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState(null);

  // Fetch DNS history
  const fetchDNSHistory = useCallback(async () => {
    if (!activeDomainName) return;

    setIsLoading(true);
    try {
      const params = {
        domain: activeDomainName,
      };

      const response = await dnsAPI.viewDNSHistory(params);

      // Handle different response structures
      const historyData =
        response?.data?.history ||
        response?.responseData?.history ||
        response?.history ||
        [];

      if (Array.isArray(historyData) && historyData.length > 0) {
        setHistory(historyData);
      } else {
        setHistory([]);
      }
    } catch (error) {
      console.error("Error fetching DNS history:", error);
      const errorMsg =
        error?.response?.data?.responseMsg?.message ||
        error?.response?.data?.message ||
        error?.message ||
        t.admin.failedToFetchDnsHistory;
      showAlert(errorMsg, { type: "warning" });
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeDomainName, showAlert]);

  useEffect(() => {
    fetchDNSHistory();
  }, [fetchDNSHistory]);

  // Open restore modal
  const handleRestoreClick = useCallback((historyId) => {
    if (!activeDomainName || !historyId) return;
    setSelectedHistoryId(historyId);
    setIsModalOpen(true);
  }, [activeDomainName]);

  // Handle modal close
  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setSelectedHistoryId(null);
  }, []);

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return t.admin.notAvailable;
    try {
      const date = new Date(dateString);
      return date.toISOString().split("T")[0];
    } catch {
      return dateString;
    }
  };

  const capitalizeFirst = (str) => {
    if (str == null || typeof str !== "string") return str;
    return str
      .split(" - ")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" - ");
  };

  const columns = [
    {
      accessorFn: (row) => formatDate(row?.date || row?.created_at),
      header: t.admin.date,
      cell: ({ row }) => (
        <p>{formatDate(row?.original?.date || row?.original?.created_at)}</p>
      )
    },
    {
      accessorFn: (row) => {
        const raw = row?.record_type
          ? `${row?.record_type} - ${row?.action || t.admin.update}`
          : row?.type || row?.action_type || row?.action || row?.description || t.admin.unknown;
        return typeof raw === "string" ? capitalizeFirst(raw) : raw;
      },
      header: t.admin.type,
      cell: ({ row }) => {
        const raw = row?.original?.record_type
          ? `${row?.original?.record_type} - ${row?.original?.action || t.admin.update}`
          : row?.original?.type || row?.original?.action_type || row?.original?.action || row?.original?.description || t.admin.unknown;
        const display = typeof raw === "string" ? capitalizeFirst(raw) : raw;
        return <p>{display}</p>;
      }
    },
    {
      id: "actions",
      header: t.admin.actions,
      enableSorting: false,
      meta: {
        className: "lg:w-xs"
      },
      cell: ({ row }) => (
        <>
          <button
            className="btn-outline"
            onClick={() =>
              handleRestoreClick(row?.original?.id || row?.original?.history_id)
            }
            disabled={isRestoring}
          >
            {t.admin.restore}
          </button>
        </>
      )
    },
  ];


  return (
    <>
      <div className="py-7 px-5">
        <DataTable
          data={history}
          columns={columns}
          notFoundMessage={t.admin.noDnsHistoryAvailable}
        />
      </div>
      {isLoading && <Loader />}
      {isModalOpen && (
        <RestoreDnsHistory
          onClose={handleModalClose}
          historyId={selectedHistoryId}
          domainName={activeDomainName}
          onSuccess={fetchDNSHistory}
        />
      )}
    </>
  );
};

export default DNShistory;
