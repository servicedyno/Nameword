import EditDNSrecordModal from "../../../modals/edit-dns-record-modal";
import DeleteDNSRecord from "../../../modals/delete-dns-record";
import { useState, useEffect, useCallback } from "react";
import { dnsAPI } from "../../../../api/domains";
import { useAlert } from "../../../../context/AlertContext";
import { useDomain } from "../../../../hooks/useDomain";
import DataTable from "../../../common/DataTable";
import Loader from "../../../common/Loader";
import { useLanguage } from "../../../../hooks/useLanguage";

const DNSrecordsTables = ({ domainName }) => {    
    const [isOpen, setIsOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [dnsRecords, setDnsRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const { showAlert } = useAlert();
    const { t } = useLanguage();
    const { viewDomain } = useDomain();
    const [rowSelection, setRowSelection] = useState({});

    // Fetch DNS records
    const fetchDNSRecords = useCallback(async () => {
        if (!domainName) return;

        setIsLoading(true);
        try {
            const response = await dnsAPI.viewDNSRecords({
                domain: domainName,
            });

            if (response?.responseData?.records) {
                setDnsRecords(response.responseData.records);
            } else {
                setDnsRecords([]);
            }
        } catch (error) {
            console.error("Error fetching DNS records:", error);
            const errorMessage = 
                error?.response?.data?.responseMsg?.message ||
                error?.response?.data?.message ||
                t.admin.failedToFetchDnsRecords;
            showAlert(errorMessage, { type: "warning" });
            setDnsRecords([]);
        } finally {
            setIsLoading(false);
        }
    }, [domainName, showAlert]);

    useEffect(() => {
        fetchDNSRecords();
    }, [fetchDNSRecords]);

    useEffect(() => {
        const handleDNSRecordChanged = () => {
            fetchDNSRecords();
        };

        window.addEventListener('dnsRecordAdded', handleDNSRecordChanged);
        window.addEventListener('dnsRecordUpdated', handleDNSRecordChanged);
        window.addEventListener('dnsRecordDeleted', handleDNSRecordChanged);
        return () => {
            window.removeEventListener('dnsRecordAdded', handleDNSRecordChanged);
            window.removeEventListener('dnsRecordUpdated', handleDNSRecordChanged);
            window.removeEventListener('dnsRecordDeleted', handleDNSRecordChanged);
        };
    }, [fetchDNSRecords]);

    // Handle edit record
    const handleEditRecord = (record) => {
        setSelectedRecord(record);
        setIsOpen(true);
    };

    // Handle delete record
    const handleDeleteRecord = (record) => {
        setSelectedRecord(record);
        setIsDeleteOpen(true);
    };

    // Execute delete after confirmation
    const executeDelete = async (record) => {
        if (!domainName) {
            showAlert(t.admin.domainRequired, { type: "warning" });
            return;
        }

        try {
            const params = {
                recordId: record.id,
                domain: domainName,
                recordName: record.name,
                recordType: record.type,
                recordValue: record.value,
            };

            const response = await dnsAPI.deleteDNSRecord(params);

            if (response?.responseMsg?.statusCode === 200 || response?.responseData?.statusCode === 200) {
                showAlert(t.admin.dnsRecordDeletedSuccess, {
                    type: "success",
                    duration: 2500,
                });
                window.dispatchEvent(new CustomEvent("dnsRecordDeleted"));
            } else {
                const errorMessage = 
                    response?.responseMsg?.message ||
                    response?.responseData?.message ||
                    t.admin.failedToDeleteDnsRecord;
                showAlert(errorMessage, { type: "warning" });
                throw new Error(errorMessage);
            }
        } catch (error) {
            const errorMessage = 
                error?.response?.data?.responseMsg?.message ||
                error?.response?.data?.message ||
                error?.message ||
                t.admin.failedToDeleteDnsRecord;
            showAlert(errorMessage, { type: "warning" });
            console.error("Error deleting DNS record:", error);
            throw error;
        }
    };

    const formatRecordName = (name) => {
        if (!name || !domainName) return name || "@";
        // If name is the full domain, show "@"
        if (name === domainName) {
            return "@";
        }
        // If name ends with .domainName, extract the subdomain
        if (name.endsWith(`.${domainName}`)) {
            const subdomain = name.replace(`.${domainName}`, "");
            return subdomain || "@";
        }
        // If name is just "@", return it
        if (name === "@") {
            return "@";
        }
        return name;
    };

    const columns = [
        {
            id: "select",
            meta: { className: "w-14" },
            header: ({ table }) => (
                <div className="text-center w-14">
                    <input
                        type="checkbox"
                        checked={table.getIsAllPageRowsSelected()}
                        onChange={table.getToggleAllPageRowsSelectedHandler()}
                        className="cursor-pointer"
                    />
                </div>
            ),
            cell: ({ row }) => (
                <div className="text-center w-14">
                    <input
                        type="checkbox"
                        checked={row.getIsSelected()}
                        disabled={!row.getCanSelect()}
                        onChange={row.getToggleSelectedHandler()}
                        className="cursor-pointer"
                    />
                </div>
            ),
            enableSorting: false,
        },
        {
            accessorKey: "type",
            header: t.admin.type,
            cell: ({ row }) => (
                <p>{row.original.type}</p>
            ),
        },
        {
            accessorFn: (row) => formatRecordName(row.name),
            header: t.admin.name,
            cell: ({ row }) => formatRecordName(row.original.name),
        },
        {
            accessorKey: "priority",
            header: t.admin.priority,
            cell: ({ row }) => row.original.priority ?? 0,
        },
        {
            accessorKey: "value",
            header: t.admin.content
        },
        {
            accessorKey: "ttl",
            header: t.admin.ttl,
        },
        {
            id: "actions",
            header: t.admin.actions,
            enableSorting: false,
            meta: { className: "lg:w-40" },
            cell: ({ row }) => (
                <div className="flex gap-2 justify-center">
                    <button
                        className='btn-outline'
                        onClick={() => handleEditRecord(row.original)}
                    >
                        {t.admin.edit}
                    </button>
                    <button
                        className='btn-outline'
                        onClick={() => handleDeleteRecord(row.original)}
                    >
                        {t.admin.delete}
                    </button>
                </div>
            ),
        },
    ]
    return (
        <>
            <DataTable
                data={dnsRecords}
                columns={columns}
                rowSelection={rowSelection}
                setRowSelection={setRowSelection}
                notFoundMessage={t.admin.noDnsRecordsFound}
                enableSearch={true}
                searchPlaceholder={t.admin.searchDnsRecords}
            />
            {/* Edit Modal */}
            {isOpen && (
                <EditDNSrecordModal 
                    onClose={() => {
                        setIsOpen(false);
                        setSelectedRecord(null);
                    }}
                    record={selectedRecord}
                    domainName={domainName}
                    viewDomain={viewDomain}
                    onSuccess={() => {
                        fetchDNSRecords();
                        setIsOpen(false);
                        setSelectedRecord(null);
                    }}
                />
            )}
            {/* Delete Confirmation Modal */}
            {isDeleteOpen && selectedRecord && (
                <DeleteDNSRecord
                    onClose={() => {
                        setIsDeleteOpen(false);
                        setSelectedRecord(null);
                    }}
                    record={selectedRecord}
                    onDelete={executeDelete}
                />
            )}
            {isLoading && <Loader />}
        </>
    )
}

export default DNSrecordsTables