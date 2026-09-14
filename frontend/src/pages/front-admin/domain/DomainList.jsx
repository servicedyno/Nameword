import { useMemo } from "react";
import { Link } from "react-router";
import { FiRefreshCw, FiSettings, FiFileText } from "react-icons/fi";
import { LuGlobe } from "react-icons/lu";
import { useDomain } from "../../../hooks/useDomain";
import { useLanguage } from "../../../hooks/useLanguage";
import DataTable from "../../../components/common/DataTable";
import StatusBadge from "../../../components/common/StatusBadge";
import { fmtDate } from "../../../utils/formatDate";

const NS_LABEL_FALLBACK = {
  cloudflare: "Cloudflare DNS",
  registrar: "Registrar default",
  custom: "Custom nameservers",
};

// Owned-domain portfolio (domain / status / mode / ns_choice / created_at / order_id).
const DomainList = () => {
  const { t } = useLanguage();
  const { domains, fetchDomains, loading } = useDomain();
  const rows = useMemo(() => (Array.isArray(domains) ? domains : []), [domains]);
  const labels = t.admin?.domainList || {};
  const NS_LABEL = { ...NS_LABEL_FALLBACK, ...(labels.nsLabels || {}) };

  const columns = [
    {
      accessorFn: (r) => r.domain || r.websiteName || "",
      header: labels.columns?.domainName || "Domain",
      cell: ({ row }) => {
        const d = row.original;
        return (
          <div className="min-w-0">
            <p className="font-semibold text-primary dark:text-white break-all" data-testid={`domain-name-${d.domain}`}>{d.domain || d.websiteName || "—"}</p>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: labels.columns?.status || "Status",
      meta: { className: "w-40" },
      cell: ({ row }) => <StatusBadge status={row.original.status} testid={`domain-status-${row.original.domain}`} />,
    },
    {
      accessorFn: (r) => NS_LABEL[r.ns_choice] || r.nameserver_type || "",
      header: labels.columns?.nameservers || "Nameservers",
      meta: { className: "hidden md:table-cell" },
      cell: ({ row }) => {
        const d = row.original;
        const list = Array.isArray(d.nameservers) ? d.nameservers.filter(Boolean) : [];
        return (
          <div className="hidden md:block">
            <p className="text-primary dark:text-gray-200">{NS_LABEL[d.ns_choice] || d.nameserver_type || "—"}</p>
            {list.length > 0 && <p className="text-xs text-ink-soft dark:text-gray-400 truncate max-w-[220px]">{list.join(", ")}</p>}
          </div>
        );
      },
    },
    {
      accessorFn: (r) => r.created_at || r.registered_at || "",
      header: labels.columns?.registered || "Registered",
      meta: { className: "w-36" },
      cell: ({ row }) => <span className="text-primary dark:text-gray-200">{fmtDate(row.original.created_at || row.original.registered_at)}</span>,
    },
    {
      id: "actions",
      header: labels.columns?.actions || "Actions",
      enableSorting: false,
      meta: { className: "w-56 text-right" },
      cell: ({ row }) => {
        const d = row.original;
        return (
          <div className="flex w-full items-center justify-end gap-2">
            <Link to={`/dns-manager?domain=${encodeURIComponent(d.domain || "")}`} className="nw-btn-secondary nw-btn-sm" data-testid={`domain-manage-dns-${d.domain}`}>
              <FiSettings size={14} /> {labels.manageDns || "Manage DNS"}
            </Link>
            {d.order_id && (
              <Link to={`/checkout/success/${d.order_id}`} className="nw-btn-ghost nw-btn-sm" title={labels.viewReceipt || "View receipt"} data-testid={`domain-receipt-${d.domain}`}>
                <FiFileText size={14} />
              </Link>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div data-testid="domain-list">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="card-admin-title !mb-0 flex items-center gap-2">
          {labels.heading || labels.title || "Your domains"}
          {rows.length > 0 && <span className="nw-badge-brand" data-testid="domain-count">{rows.length}</span>}
        </p>
        <button type="button" onClick={() => fetchDomains?.()} className="nw-btn-ghost nw-btn-sm" disabled={loading} data-testid="domain-list-refresh">
          <FiRefreshCw size={14} className={loading ? "animate-spin" : ""} /> {labels.refresh || "Refresh"}
        </button>
      </div>
      <div className="table-card overflow-hidden">
        <DataTable
          data={rows}
          columns={columns}
          enableSearch={rows.length > 5}
          searchPlaceholder={labels.searchPlaceholder || "Search domains"}
          emptyIcon={LuGlobe}
          emptyTitle={labels.emptyTitle || "No domains yet"}
          emptyDescription={labels.emptyDescription || "Register your first private domain — WHOIS privacy is included on every eligible name."}
          emptyPrimaryTo="/domains"
          emptyPrimaryLabel={labels.emptyPrimaryLabel || "Search a domain"}
        />
      </div>
    </div>
  );
};

export default DomainList;
