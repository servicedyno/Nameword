import { useState, useEffect } from "react";
import { walletAPI } from "../../../api/walletApi";
import { useAlert } from "../../../context/AlertContext";
import Loader from "../../common/Loader";
import moment from "moment";
import DataTable from "../../common/DataTable";
import { LuSearchX } from "react-icons/lu";
import { useLanguage } from "../../../hooks/useLanguage";

const PaymentHistoryTable = () => {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const { showAlert } = useAlert();
  const { t } = useLanguage();

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await walletAPI.getHostbayTransactions({
        page: 1,
        per_page: 50,
      });
      if (response?.success && response?.data?.transactions) {
   
        setTransactions(response.data.transactions);
      } else {
        setTransactions([]);
      }
    } catch (error) {
      console.error("Error fetching payment history:", error);
      showAlert(t.admin.failedToFetchPaymentHistory, { type: "warning" });
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  // Parse transaction 
  const parseTransaction = (transaction) => {
    return {
      service: transaction.service || t.admin.other,
      title: transaction.title || t.admin.notAvailable,
      invoiceId: transaction.invoiceId || `INV-${transaction.id}`,
    };
  };

  const formatDate = (dateString) => {
    return moment(dateString).format("YYYY-MM-DD");
  };

  const formatAmount = (amount) => {
    // Amount is negative for debits, so use absolute value
    return `$${Math.abs(amount).toFixed(2)}`;
  };

  const downloadInvoice = async (transaction) => {
    try {
      
      if (transaction.status !== "completed" && transaction.status !== "refunded") {
        showAlert(t.admin.invoiceOnlyForCompletedOrRefunded, { type: "warning", duration: 2500 });
        return;
      }

      setLoading(true);
      const transactionId = transaction.paymentId || transaction.id;
      const blob = await walletAPI.downloadInvoice(transactionId);

      // Create download link
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement("a");
      link.href = url;
      const parsed = parseTransaction(transaction);
      link.setAttribute(
        "download",
        `invoice_${parsed.invoiceId || transactionId}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showAlert(t.admin.invoiceDownloadedSuccess, { type: "success", duration: 2000 });
    } catch (error) {
      console.error("Error downloading invoice:", error);
      

      let errorMessage = t.admin.failedToDownloadInvoice;
      
      // Keep backend errors as-is
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showAlert(errorMessage, { type: "fail", duration: 2500 });
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      accessorKey: "paymentId",
      header: t.admin.paymentId,
      cell: ({ row }) => (
          <p>{row.original?.paymentId || `N_${row.original?.id}`}</p>
      )
    },
    {
      accessorFn: (row) => {
        const parsed = parseTransaction(row?.original ?? row);
        return parsed?.invoiceId;
      },
      header: t.admin.invoiceId,
      cell: ({ row }) => {
        const parsed = parseTransaction(row?.original ?? row);
        return (
          <p>{parsed?.invoiceId}</p>
        );
      }
    },
    {
      accessorFn: (row) => {
        const parsed = parseTransaction(row?.original ?? row);
        return parsed?.service;
      },
      header: t.admin.service,
      cell: ({ row }) => {
        const parsed = parseTransaction(row?.original ?? row);
        return (
          <p>{parsed?.service}</p>
        );
      }
    },
    {
      accessorFn: (row) => {
        const parsed = parseTransaction(row?.original ?? row);
        return parsed?.title;
      },
      header: t.admin.title,
      cell: ({ row }) => {
        const parsed = parseTransaction(row?.original ?? row);
        return (
          <p>{parsed?.title || t.admin.notAvailable}</p>
        );
      }
    },
    {
      accessorFn: (row) => {
        const d = row?.original ?? row;
        return formatDate(d?.paid_at || d?.created_at);
      },
      header: t.admin.paidAt,
      cell: ({ row }) => (
        <p>{formatDate(row.original?.paid_at || row.original?.created_at)}</p>
      ),
    },
    {
      accessorFn: (row) => {
        const d = row?.original ?? row;
        return formatAmount(d?.amount);
      },
      header: t.admin.amount,
      cell: ({ row }) => (
        <p>{formatAmount(row.original?.amount)}</p>
      )
    },
    {
      accessorKey: "status",
      header: t.admin.status,
      cell: ({ row }) => {
        const status = row.original?.status || "completed";
        const statusColors = {
          completed: "text-green-600 dark:text-green-400",
          failed: "text-red-600 dark:text-red-400",
          pending: "text-yellow-600 dark:text-yellow-400",
          refunded: "text-blue-600 dark:text-blue-400",
        };
        const statusTranslations = {
          completed: t.admin.completed,
          failed: t.admin.failed,
          pending: t.admin.pending,
          refunded: t.admin.refunded,
        };
        return (
          <p className={statusColors[status] || ""}>
            {statusTranslations[status] || status.charAt(0).toUpperCase() + status.slice(1)}
          </p>
        );
      }
    },
    {
      id: "actions",
      header: t.admin.actions,
      enableSorting: false,
      cell: ({ row }) => {
        const status = row.original?.status || "completed";
        const canDownload = status === "completed" || status === "refunded";
        return (
          <>
            <button
              className={`btn-outline ${!canDownload ? "opacity-50 cursor-not-allowed" : ""}`}
              onClick={() => downloadInvoice(row.original)}
              disabled={!canDownload}
              title={!canDownload ? t.admin.invoiceOnlyForCompletedOrRefundedTooltip : t.admin.downloadInvoiceTooltip}
            >
              {t.admin.downloadInvoiceLower}
            </button>
          </>
        );
      }
    },
  ];


  return (
    <>
      {transactions.length  > 0 ? <>
        <DataTable
          data={transactions}
          columns={columns}
          notFoundMessage={t.admin.noPaymentHistoryFound}
        />
      </> :<>
          <div className="nodata-available h-72 flex flex-col justify-center items-center text-13 font-medium">
            <div className="rounded-icon-bg">
              <LuSearchX
                size={24}
                className="text-darkbtn dark:text-white"
              />
            </div>

            <p className=" text-primary text-base dark:text-gray-400">
              {t.admin.noPaymentsYet}
            </p>
        </div>
      </>}
        {loading && <Loader />}
    </>
  );
};

export default PaymentHistoryTable;
