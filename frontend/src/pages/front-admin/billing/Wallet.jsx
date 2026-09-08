import { useCallback, useEffect, useState } from 'react';
import { HiArrowSmRight } from "react-icons/hi";
import { FiInfo } from "react-icons/fi";
import { walletAPI } from "../../../api/walletApi";
import { NavLink, useLocation, useNavigate } from 'react-router';
import WalletModal from '../../../components/modals/wallet-modal';
import { useAlert } from '../../../context/AlertContext';
import Loader from '../../../components/common/Loader';
import { useQueryParams } from '../../../hooks/useQueryParams';
import { useAuth } from '../../../hooks/useAuth';
import { useLanguage } from '../../../hooks/useLanguage';

const Wallet = () => {
    const [walletBalance, setWalletBalance] = useState(0);
    const [walletLoading, setWalletLoading] = useState(false);

    const [isModal, setIsModal] = useState(false);

    const { showAlert } = useAlert();
    const { user } = useAuth();
    const { t } = useLanguage();
    const query = useQueryParams();
    const navigate = useNavigate();
    const { pathname } = useLocation();

    const fetchWalletBalance = useCallback(async () => {
        setWalletLoading(true);

        try {
            const response = await walletAPI.getWallet();

            const balanceObj = response?.data?.balance;
            const balance = Number(balanceObj?.USD ?? balanceObj?.default ?? 0);

            setWalletBalance(balance);
        } catch (error) {
            showAlert(error?.response?.data?.message ||
                error?.response?.data?.errors[0]?.message ||
                "Failed to fetch wallet balance",
                {
                    type: "error",
                    duration: 2500
                })
        } finally {
            setWalletLoading(false);
        }
    }, [showAlert]);

    //  Fetch wallet balance
    useEffect(() => {
        fetchWalletBalance();
    }, [fetchWalletBalance]);

    const handleModalOpen = () => {
        setIsModal(true);
    }

    const handleModalClose = () => {
        setIsModal(false);
    }

    useEffect(() => {
        if (query.dynoPayment === 'successful' && query.message) {
            showAlert(query.message,{
                type: 'success',
                description: query.subText,
                duration: 2500
            });
            navigate(pathname, { replace: true });
        }
        if (query.dynoPayment === 'failed' && query.message) {
            showAlert(query.message, {
                type: 'error',
                duration: 2500
            });
            navigate(pathname, { replace: true });
        }
    }, [query?.dynoPayment])

    return (
        <>
            <div className='space-y-7'>
                {/* title */}
                <div className='flex flex-col gap-2 title-section'>
                    <h2>{t.admin?.wallet || "Wallet"}</h2>
                </div>

                {/* table */}
                <div className='grid lg:grid-cols-2 gap-5'>
                    <div className='action-card p-7 min-h-36 flex w-full items-center'>
                        <div className='flex sm:items-center justify-between w-full flex-col sm:flex-row gap-2'>
                            <div>
                                <p className='text-lg font-medium text-primary dark:text-gray-400 flex gap-2 items-center'>
                                    {t.admin?.walletBalance || "Wallet Balance"} <FiInfo />
                                </p>
                                <p className="text-2xl font-medium text-tealdark flex gap-3 items-center">
                                    ${Number(walletBalance || 0).toFixed(2)}
                                </p>
                            </div>
                            <button type='button' className='add-to-cart' onClick={handleModalOpen} >
                                {t.admin?.walletTopUp || "Top Up"}
                            </button>
                            {isModal && <WalletModal onClose={handleModalClose}  />}
                        </div>
                    </div>
                    <div className='action-card p-7 min-h-36 flex w-full items-center'>
                        <div className='flex items-center justify-between w-full'>
                            <div>
                                <p className='text-lg font-medium text-primary dark:text-gray-400 flex gap-2 items-center'>
                                    {t.admin?.rewardPoints || "Reward Points"} <FiInfo />
                                </p>
                                <p className="text-2xl font-medium text-darkbtn dark:text-white flex gap-3 items-center">
                                    {user?.rewardPoints || 0.00}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div>
                    <p className='card-admin-title'>
                        {t.admin?.actions || "Actions"}
                    </p>

                    <div className='md:w-1/2 w-full action-card'>
                        <NavLink
                            to="/payment-history"
                            className="inner-action-card flex items-center justify-between"
                        >
                            <p>
                                {t.admin?.walletSeePaymentHistory ||
                                    t.admin?.subscriptionsSeePaymentHistory ||
                                    t.admin?.paymentHistory ||
                                    "See payment history"}
                            </p>
                            <HiArrowSmRight size={20} />
                        </NavLink>
                        <NavLink
                            to="/subscriptions"
                            className="inner-action-card flex items-center justify-between"
                        >
                            <p>
                                {t.admin?.walletManageSubscriptions ||
                                    t.admin?.subscriptions ||
                                    "Manage subscriptions"}
                            </p>
                            <HiArrowSmRight size={20} />
                        </NavLink>
                    </div>
                </div>
            </div>
            {walletLoading && <Loader />}
        </>
    )
}

export default Wallet