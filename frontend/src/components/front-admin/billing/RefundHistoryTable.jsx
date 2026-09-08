import { TbExternalLink } from "react-icons/tb";
import { useState, useEffect } from "react";
import { walletAPI } from "../../../api/walletApi";
import Loader from "../../common/Loader";
import moment from "moment";
import { useAlert } from "../../../context/AlertContext";
import DataTable from "../../common/DataTable";
import { LuSearchX } from "react-icons/lu";
import { NavLink } from "react-router";
import { useLanguage } from "../../../hooks/useLanguage";

const RefundHistoryTable = () => {
  const [loading, setLoading] = useState(true);
  const [refunds, setRefunds] = useState([]);
  const { showAlert } = useAlert();
  const { t } = useLanguage();

  useEffect(() => {
    fetchRefunds();
  }, []);

  const fetchRefunds = async () => {
    setLoading(true);
    try {
      const response = await walletAPI.getRefundHistory({
        page: 1,
        per_page: 50,
      });
      if (response?.success && response?.data?.transactions) {
        setRefunds(response.data.transactions);
      } else {
        setRefunds([]);
      }
    } catch (error) {
      console.error("Error fetching refund history:", error);
      showAlert(t.admin.failedToFetchRefundHistory, { type: "warning" });
      setRefunds([]);
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
    // Amount is positive for credits/refunds
    return `$${Math.abs(amount).toFixed(2)}`;
  };

  const downloadInvoice = async (transaction) => {
    try {

      if (transaction.status !== "refunded") {
        showAlert(t.admin.invoiceOnlyForRefunded, {
          type: "warning",
          duration: 2500,
        });
        return;
      }

      setLoading(true);
      const transactionId = transaction.paymentId || transaction.id;
      const blob = await walletAPI.downloadInvoice(transactionId);

      // Create download link
      const url = window.URL.createObjectURL(
        new Blob([blob], { type: "application/pdf" })
      );
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

      showAlert(t.admin.invoiceDownloadedSuccess, {
        type: "success",
        duration: 2000,
      });
    } catch (error) {
      console.error("Error downloading invoice:", error);
      showAlert(t.admin.failedToDownloadInvoice, { type: "fail", duration: 2500 });
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      accessorKey: "id",
      header: t.admin.refundId,
      cell: ({ row }) => <p>N_{row.original?.id}</p>,
    },
    {
      accessorFn: (row) => {
        const parsed = parseTransaction(row?.original ?? row);
        return parsed?.invoiceId;
      },
      header: t.admin.invoiceId,
      cell: ({ row }) => {
        const parsed = parseTransaction(row?.original ?? row);
        return <p>{parsed?.invoiceId}</p>;
      },
    },
    {
      accessorFn: (row) => {
        const parsed = parseTransaction(row?.original ?? row);
        return parsed?.service;
      },
      header: t.admin.service,
      cell: ({ row }) => {
        const parsed = parseTransaction(row?.original ?? row);
        return <p>{parsed?.service}</p>;
      },
    },
    {
      accessorFn: (row) => {
        const parsed = parseTransaction(row?.original ?? row);
        return parsed?.title;
      },
      header: t.admin.title,
      cell: ({ row }) => {
        const parsed = parseTransaction(row?.original ?? row);
        return <p>{parsed?.title || t.admin.notAvailable}</p>;
      },
    },
    {
      accessorFn: (row) => {
        const d = row?.original ?? row;
        return formatDate(d?.refunded_at || d?.created_at);
      },
      header: t.admin.refundedAt,
      cell: ({ row }) => (
        <p>
          {formatDate(row.original?.refunded_at || row.original?.created_at)}
        </p>
      ),
    },
    {
      accessorFn: (row) => {
        const d = row?.original ?? row;
        return formatAmount(d?.amount);
      },
      header: t.admin.amount,
      cell: ({ row }) => <p>{formatAmount(row.original?.amount)}</p>,
    },
    {
      id: "actions",
      header: t.admin.actions,
      enableSorting: false,
      cell: ({ row }) => (
        <>
          <button
            className="btn-outline"
            onClick={() => downloadInvoice(row.original)}
          >
            {t.admin.downloadInvoice}
          </button>
        </>
      ),
    },
  ];

  return (
    <>
      {refunds.length > 0 ? (
        <DataTable
          data={refunds}
          columns={columns}
          notFoundMessage={t.admin.noRefundHistoryFound}
        />
      ) : (
        <div className="nodata-available h-72 flex flex-col justify-center items-center text-13 font-medium">
          <div className="rounded-icon-bg">
            <LuSearchX size={24} className="text-darkbtn dark:text-white" />
          </div>

          <p className=" text-primary text-base dark:text-gray-400">
            {t.admin.noRefundsYet}
          </p>
          <p className="text-secondary dark:text-gray-400">
            {t.admin.learnMoreAbout}{" "}
            <NavLink
              // to={"/"}
              className="text-darkbtn dark:text-white inline-flex items-center gap-1"
            >
              {t.admin.refundPolicy} <TbExternalLink size={16} />{" "}
            </NavLink>
          </p>
        </div>
      )}
      {loading && <Loader />}
    </>
  );
};

export default RefundHistoryTable;
