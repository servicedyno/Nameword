import { useState, useEffect } from "react";
import { FiDownload } from "react-icons/fi";
import { LuReceipt } from "react-icons/lu";
import { walletAPI } from "../../../api/walletApi";
import { useAlert } from "../../../context/AlertContext";
import Loader from "../../common/Loader";
import DataTable from "../../common/DataTable";
import StatusBadge from "../../common/StatusBadge";
import { fmtDate } from "../../../utils/formatDate";
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
      const response = await walletAPI.getHostbayTransactions({ page: 1, per_page: 50 });
      setTransactions(response?.success && response?.data?.transactions ? response.data.transactions : []);
    } catch (error) {
      console.error("Error fetching payment history:", error);
      showAlert(t.admin.failedToFetchPaymentHistory, { type: "warning" });
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const invoiceId = (tx) => tx.invoiceId || `INV-${tx.id}`;
  const isCredit = (tx) => tx.type === "credit" || (tx.type !== "debit" && Number(tx.amount) > 0);

  const downloadInvoice = async (transaction) => {
    try {
      if (transaction.status !== "completed" && transaction.status !== "refunded") {
        showAlert(t.admin.invoiceOnlyForCompletedOrRefunded, { type: "warning", duration: 2500 });
        return;
      }
      setLoading(true);
      const transactionId = transaction.paymentId || transaction.id;
      const blob = await walletAPI.downloadInvoice(transactionId);
      const url = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `invoice_${invoiceId(transaction)}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showAlert(t.admin.invoiceDownloadedSuccess, { type: "success", duration: 2000 });
    } catch (error) {
      console.error("Error downloading invoice:", error);
      showAlert(error.response?.data?.message || error.message || t.admin.failedToDownloadInvoice, { type: "fail", duration: 2500 });
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      accessorFn: (r) => `${invoiceId(r)} ${r.paymentId || ""}`,
      header: t.admin.invoiceId,
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="font-semibold text-primary dark:text-white nw-mono !tracking-normal !normal-case text-xs">{invoiceId(row.original)}</p>
          <p className="truncate text-[11px] text-ink-soft dark:text-gray-400">{row.original.paymentId || `N_${row.original.id}`}</p>
        </div>
      ),
    },
    {
      accessorFn: (r) => `${r.title || ""} ${r.service || ""}`,
      header: t.admin.service,
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="text-primary dark:text-white break-all">{row.original.title || t.admin.notAvailable}</p>
          <p className="text-xs text-ink-soft dark:text-gray-400">{row.original.service || t.admin.other}</p>
        </div>
      ),
    },
    {
      accessorFn: (r) => r.paid_at || r.created_at || "",
      header: t.admin.paidAt,
      meta: { className: "w-36" },
      cell: ({ row }) => <span>{fmtDate(row.original.paid_at || row.original.created_at)}</span>,
    },
    {
      accessorFn: (r) => Number(r.amount) || 0,
      header: t.admin.amount,
      meta: { className: "w-32" },
      cell: ({ row }) => {
        const tx = row.original;
        const credit = isCredit(tx);
        return (
          <span className={`nw-mono !tracking-normal text-sm font-semibold ${credit ? "text-emerald-700 dark:text-emerald-300" : "text-primary dark:text-white"}`} data-testid={`payment-amount-${tx.id}`}>
            {credit ? "+" : "−"}${Math.abs(Number(tx.amount) || 0).toFixed(2)}
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: t.admin.status,
      meta: { className: "w-36" },
      cell: ({ row }) => {
        const status = row.original.status || "completed";
        const labels = { completed: t.admin.completed, failed: t.admin.failed, pending: t.admin.pending, refunded: t.admin.refunded };
        return <StatusBadge status={status} label={labels[status]} testid={`payment-status-${row.original.id}`} />;
      },
    },
    {
      id: "actions",
      header: t.admin.actions,
      enableSorting: false,
      meta: { className: "w-24 text-right" },
      cell: ({ row }) => {
        const status = row.original.status || "completed";
        const canDownload = status === "completed" || status === "refunded";
        return (
          <div className="flex w-full justify-end">
            <button
              type="button"
              className="nw-btn-secondary nw-btn-sm"
              onClick={() => downloadInvoice(row.original)}
              disabled={!canDownload}
              title={!canDownload ? t.admin.invoiceOnlyForCompletedOrRefundedTooltip : t.admin.downloadInvoiceTooltip}
              aria-label={t.admin.downloadInvoiceLower}
              data-testid={`payment-invoice-${row.original.id}`}
            >
              <FiDownload size={14} /> <span className="hidden xl:inline">{t.admin.downloadInvoiceLower}</span>
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <DataTable
        data={transactions}
        columns={columns}
        enableSearch={transactions.length > 5}
        emptyIcon={LuReceipt}
        emptyTitle={t.admin.noPaymentsYet}
        emptyDescription="Wallet top-ups, domain and server payments will appear here with downloadable invoices."
        emptyPrimaryTo="/wallet"
        emptyPrimaryLabel={t.admin?.walletTopUp || "Top up wallet"}
      />
      {loading && <Loader />}
    </>
  );
};

export default PaymentHistoryTable;
