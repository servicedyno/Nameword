import { FiCheck, FiInfo } from "react-icons/fi";
import { BsCheck2All } from "react-icons/bs";
import { Tooltip } from 'react-tooltip'
import { useState, useEffect, useMemo } from "react";
import { domainAPI } from "../../../../api/domains";
import DataTable from "../../../common/DataTable";
import Loader from "../../../common/Loader";
import { useLanguage } from "../../../../hooks/useLanguage";

const TransferlistTable = () => {
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(true);
    const { t } = useLanguage();

    const messages = useMemo(() => ({
        pending: t.admin.pendingTransferMessage,
        accepted: t.admin.acceptedTransferMessage,
        completed: t.admin.completedTransferMessage,
        failed: t.admin.failedTransferMessage,
    }), [t]);

    useEffect(() => {
        const fetchTransfers = async () => {
            try {
                setLoading(true);
                // Use the new transfer list API endpoint that fetches status from HostBay
                const response = await domainAPI.getTransferList();
                const transfers = response?.responseData || response?.data || [];

                setTransfers(transfers);
            } catch (error) {
                console.error("Error fetching transfers:", error);
                setTransfers([]);
            } finally {
                setLoading(false);
            }
        };

        fetchTransfers();
    }, []);

    // Render status badge based on transferStatus
    const renderStatus = (transferStatus) => {
        if (!transferStatus) return null;

        const statusLower = transferStatus.toLowerCase();

        if (statusLower === "pending") {
            return (
                <p className='flex items-center gap-1 text-indigo-400'>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <g clipPath="url(#clip0_963_4783)">
                            <path d="M7 0.875C5.78859 0.875 4.60439 1.23423 3.59713 1.90725C2.58988 2.58027 1.80483 3.53687 1.34124 4.65606C0.877654 5.77526 0.756358 7.00679 0.992693 8.19493C1.22903 9.38306 1.81238 10.4744 2.66897 11.331C3.52557 12.1876 4.61694 12.771 5.80507 13.0073C6.99321 13.2436 8.22474 13.1223 9.34394 12.6588C10.4631 12.1952 11.4197 11.4101 12.0928 10.4029C12.7658 9.39562 13.125 8.21141 13.125 7C13.1231 5.37612 12.4772 3.81928 11.329 2.67102C10.1807 1.52276 8.62389 0.876853 7 0.875ZM7 12.25C5.60762 12.25 4.27226 11.6969 3.28769 10.7123C2.30313 9.72774 1.75 8.39239 1.75 7C1.75 5.60761 2.30313 4.27226 3.28769 3.28769C4.27226 2.30312 5.60762 1.75 7 1.75V7L10.7104 10.7104C10.2239 11.1988 9.64561 11.5863 9.00885 11.8505C8.37209 12.1147 7.6894 12.2505 7 12.25Z" fill="#6C83F2" />
                        </g>
                        <defs>
                            <clipPath id="clip0_963_4783">
                                <rect width="14" height="14" fill="white" />
                            </clipPath>
                        </defs>
                    </svg>
                    {t.admin.pending} <FiInfo id={statusLower} className="text-primary dark:text-gray-300 desc" data-tooltip-place="bottom" />
                </p>
            );
        } else if (statusLower === "accepted") {
            return (
                <p className='flex items-center gap-1 text-tealdark'>
                    <FiCheck size={14} /> {t.admin.accepted} <FiInfo id={statusLower} className="text-primary dark:text-gray-300 desc" data-tooltip-place="bottom" />
                </p>
            );
        } else if (statusLower === "completed") {
            return (
                <p className='flex items-center gap-1 text-sucess-400'>
                    <BsCheck2All size={14} /> {t.admin.completed} <FiInfo id={statusLower} className="text-primary dark:text-gray-300 desc" data-tooltip-place="bottom" />
                </p>
            );
        } else if (statusLower === "failed") {
            return (
                <p className='flex items-center gap-1 text-red-500'>
                    <FiCheck size={14} /> {t.admin.failed} <FiInfo id={statusLower} className="text-primary dark:text-gray-300 desc" data-tooltip-place="bottom" />
                </p>
            );
        }
        return null;
    };

    const columns = useMemo(() => [
        {
            accessorKey: "websiteName",
            header: t.admin.domainName,
        },
        {
            accessorFn: (row) => row.transferInfo?.transferStatus?.toLowerCase(),
            header: t.admin.status,
            cell: ({ row }) => (
                <>
                    {renderStatus(row.original?.transferInfo?.transferStatus)}
                </>
            ),
        },
        {
            id: "actions",
            header: t.admin.actions,
            enableSorting: false,
            cell: ({ row }) => (
                <>
                    <button className='btn-outline'>{t.admin.iHaveAQuestion}</button>
                </>
            )
        },
    ], [t]);

    return (
        <>
            <div className='mb-8'>
                <p className='card-admin-title'>{t.admin.transferList}</p>
                <div className='table-card'>
                    <DataTable
                        data={transfers}
                        columns={columns}
                        notFoundMessage={t.admin.noDomainTransfersFound}
                    />
                    {Object.keys(messages).map((s, i) => (
                        <Tooltip key={i} clickable className="tooltip" anchorSelect={`#${s}`}>
                            <div>
                                <div className="flex flex-col gap-2.5 text-left">
                                    <span>{messages[s]}</span>
                                </div>
                            </div>
                        </Tooltip>
                    ))}
                </div>
            </div>
            {loading && <Loader />}
        </>
    )
}

export default TransferlistTable