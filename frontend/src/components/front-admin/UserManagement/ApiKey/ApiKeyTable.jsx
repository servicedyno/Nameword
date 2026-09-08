import { useEffect, useState, useMemo, useCallback } from "react";
import DeleteApiKey from "../../../modals/delete-api-key";
import { useApiKeys } from "../../../../hooks/useApiKeys";
import DataTable from "../../../common/DataTable";
import Loader from "../../../common/Loader";
import { separateDateAndTime } from "../../../../utils/formatDate";
import { FiMinus } from "react-icons/fi";
import { authAPI } from "../../../../api/auth";
import { useAlert } from "../../../../context/AlertContext";
import { useNavigate } from "react-router";
import { useLanguage } from "../../../../hooks/useLanguage";

const ApiKeyTable = () => {
    // Modal click
    const [isOpen, setIsOpen] = useState(false);
    const [selectID, setSelectedID] = useState(null);
    const [isLoading, setLoading] = useState(null);


    const { apiKeys, fetchApiKeys, loading } = useApiKeys();
    const { showAlert } = useAlert();
    const navigate = useNavigate();
    const { t, language } = useLanguage();

    const checkAuth = useCallback(async () => {
        try {
            setLoading(true);
            const userData = await authAPI.getCurrentUser();
            localStorage.setItem("user", JSON.stringify(userData.data));
        } catch (error) {
            showAlert(
                error?.response?.data?.message ||
                error?.response?.data?.errors[0]?.message ||
                t.admin.failedToFetchUserData,
                {
                    type: "error"
                }
            );
            console.error("Failed to get current user:", error);
            localStorage.removeItem("user");
            navigate("/sign-in", { replace: true });
        } finally {
            setLoading(false);
        }
    }, [showAlert, navigate, t]);


    const columns = useMemo(() => [
        {
            accessorKey: 'name',
            header: t.admin.keyName,
        },
        {
            accessorFn: row => {
                const dateObj = separateDateAndTime(row.expiresAt);
                return `${dateObj.date} ${dateObj.time}`;
            },
            header: t.admin.expiresOn,
            cell: ({ row }) => {
                const dateObj = separateDateAndTime(row.original.expiresAt);

                return (
                    <div className="flex flex-col">
                        <p>{dateObj.date}</p>
                        <p className="text-secondary">{dateObj.time}</p>
                    </div>
                );
            },
        },
        {
            accessorFn: row => {
                const dateObj = separateDateAndTime(row.createdAt);
                return `${dateObj.date} ${dateObj.time}`;
            },
            header: t.admin.createdOn,
            cell: ({ row }) => {
                const dateObj = separateDateAndTime(row.original.createdAt);

                return (
                    <div className="flex flex-col">
                        <p>{dateObj.date}</p>
                        <p className="text-secondary">{dateObj.time}</p>
                    </div>
                );
            },
        },
        {
            accessorFn: row => {
                const dateObj = separateDateAndTime(row.lastUsedAt);
                return `${dateObj.date} ${dateObj.time}`;
            },
            header: t.admin.lastUsedOn,
            cell: ({ row }) => {
                const dateObj = separateDateAndTime(row.original.lastUsedAt);

                return (
                    <div className="flex flex-col">
                        {dateObj.date ? <>
                            <p>{dateObj.date}</p>
                            <p className="text-secondary">{dateObj.time}</p>
                        </> :
                            <p> <FiMinus /></p>}
                    </div>
                );
            },
        },
        {
            id: 'actions',
            header: t.admin.actions,
            enableSorting: false,
            cell: ({ row }) => (
                <button className='btn-outline' onClick={() => {
                    setSelectedID(row.original?.id);
                    setIsOpen(true)
                }}>{t.admin.delete}</button>
            ),
        },
    ], [t]);

    useEffect(() => {
        fetchApiKeys();
        checkAuth();
    }, [fetchApiKeys, checkAuth])

    return (
        <>
            <DataTable key={language} data={apiKeys} columns={columns} enableSearch={true} searchPlaceholder={t.admin.searchKeys} />
            {(loading || isLoading) && <Loader />}
            {isOpen && <DeleteApiKey onClose={() => {
                checkAuth();
                setIsOpen(false);
                setSelectedID(null);
            }} id={selectID} />}
        </>
    )
}

export default ApiKeyTable