import { useEffect, useMemo } from 'react';
import DataTable from '../../../common/DataTable';
import { useUserSession } from '../../../../hooks/useUserSession';
import Loader from '../../../common/Loader';
import Concerns from './Concerns';
import { useLanguage } from '../../../../hooks/useLanguage';

const AccountActivity = () => {
    const { t } = useLanguage();
    const { getUserSessions, loading, userSessions, logoutUserSession, logoutAllUserSessions } = useUserSession();

    const columns = useMemo(() => [
        {
            accessorFn: row => {
                const dateObj = new Date(row.currentLogin);
                return `${dateObj.toLocaleDateString('en-CA')} ${dateObj.toLocaleTimeString('en-GB')}`;
            },
            header: t.admin.currentLogin,
            cell: ({ row }) => {
                const dateObj = new Date(row.original?.currentLogin);
                const date = dateObj.toLocaleDateString('en-CA');
                const time = dateObj.toLocaleTimeString('en-GB');

                return (
                    <div className="flex flex-col">
                        <p>{date}</p>
                        <p className="text-secondary">{time}</p>
                    </div>
                );
            },
        },
        {
            accessorKey: 'device',
            header: t.admin.device,
        },
        {
            accessorKey: 'location',
            header: t.admin.location,
        },
        {
            accessorKey: 'ipAddress',
            header: t.admin.ip,
        },
        // {
        //     accessorKey: 'firstLoginDate',
        //     header: 'First Login',
        //     cell: ({ row }) => (
        //         <div className="flex flex-col">
        //             <p>{row.original.firstLoginDate}</p>
        //             <p className="text-secondary">{row.original.firstLoginTime}</p>
        //         </div>
        //     ),
        // },
        {
            accessorKey: 'loginType',
            header: t.admin.loginType,
        },
        {
            id: 'actions',
            header: t.admin.actions,
            enableSorting: false,
            cell: ({ row }) => (
                <button
                    className="btn-outline"
                    onClick={() => logoutUserSession(row.original.id || row.original._id, row.original?.isCurrent)}
                >
                    {t.admin.logout}
                </button>
            ),
        },
    ], [t, logoutUserSession]);

    useEffect(() => {
        getUserSessions();
    }, [getUserSessions])

    return <>
        <div className='space-y-7'>
            {/* title */}
            <div className='flex flex-col gap-2 title-section'>
                <h2>{t.admin.accountActivity}</h2>
            </div>

            <div className='table-card'>
                <DataTable data={userSessions} columns={columns} enableSearch={true} searchPlaceholder={t.admin.searchSessions} />
            </div>

            <div className='table-card mb-8'>
                <div>
                    <p className="info-card-title px-5 py-4">{t.admin.anyConcerns}</p>
                    <hr className='card-divider' />
                    <Concerns data={userSessions} logoutAllUserSessions={logoutAllUserSessions} />
                </div>
            </div>
        </div>
        {loading && <Loader />}
    </>
};

export default AccountActivity;
