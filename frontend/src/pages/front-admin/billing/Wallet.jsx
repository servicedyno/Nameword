import { useCallback, useEffect, useState } from 'react';
import { HiArrowSmRight } from "react-icons/hi";
import { LuPlus, LuWallet, LuGift } from "react-icons/lu";
import { walletAPI } from "../../../api/walletApi";
import { NavLink, useLocation, useNavigate } from 'react-router';
import WalletModal from '../../../components/modals/wallet-modal';
import { useAlert } from '../../../context/AlertContext';
import Loader from '../../../components/common/Loader';
import TopupHistory from '../../../components/front-admin/billing/TopupHistory';
import RewardHistory from '../../../components/front-admin/billing/RewardHistory';
import ReferralCard from '../../../components/front-admin/billing/ReferralCard';
import { useQueryParams } from '../../../hooks/useQueryParams';
import { useAuth } from '../../../hooks/useAuth';
import { useLanguage } from '../../../hooks/useLanguage';

const POINT_VALUE_USD = 0.02;

const Wallet = () => {
    const [walletBalance, setWalletBalance] = useState(0);
    const [walletLoading, setWalletLoading] = useState(false);
    const [isModal, setIsModal] = useState(false);
    const [resumePayment, setResumePayment] = useState(null);

    const { showAlert } = useAlert();
    const { user } = useAuth();
    const { t } = useLanguage();
    const query = useQueryParams();
    const navigate = useNavigate();
    const { pathname, hash } = useLocation();

    useEffect(() => {
        if (hash === "#rewards") {
            const el = document.getElementById("rewards");
            if (el) {
                const timer = setTimeout(() => {
                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                    el.classList.add("nw-flash");
                    setTimeout(() => el.classList.remove("nw-flash"), 1600);
                }, 250);
                return () => clearTimeout(timer);
            }
        }
    }, [hash, walletLoading]);

    const fetchWalletBalance = useCallback(async () => {
        setWalletLoading(true);
        try {
            const response = await walletAPI.getWallet();
            const balanceObj = response?.data?.balance;
            setWalletBalance(Number(balanceObj?.USD ?? balanceObj?.default ?? 0));
        } catch (error) {
            showAlert(error?.response?.data?.message || error?.response?.data?.errors?.[0]?.message || "Failed to fetch wallet balance", { type: "error", duration: 2500 });
        } finally {
            setWalletLoading(false);
        }
    }, [showAlert]);

    useEffect(() => { fetchWalletBalance(); }, [fetchWalletBalance]);

    const handleModalOpen = () => { setResumePayment(null); setIsModal(true); };

    const handleResumeTopup = (row) => {
        setResumePayment({
            paymentId: row.paymentId,
            address: row.address,
            currency: row.currency,
            cryptoAmount: row.cryptoAmount,
            amountUsd: row.amountUsd,
            qrCode: row.qrCode || null,
            destinationTag: row.destinationTag || null,
            status: row.status,
        });
        setIsModal(true);
    };

    const handleModalClose = () => {
        setIsModal(false);
        setResumePayment(null);
        fetchWalletBalance();
        window.dispatchEvent(new Event("wallet:updated"));
    };

    useEffect(() => {
        if (query.dynoPayment === 'successful' && query.message) {
            showAlert(query.message, { type: 'success', description: query.subText, duration: 2500 });
            navigate(pathname, { replace: true });
        }
        if (query.dynoPayment === 'failed' && query.message) {
            showAlert(query.message, { type: 'error', duration: 2500 });
            navigate(pathname, { replace: true });
        }
    }, [query?.dynoPayment]);

    const points = Number(user?.rewardPoints || 0);

    const actions = [
        { to: "/payment-history", label: t.admin?.walletSeePaymentHistory || t.admin?.paymentHistory || "See payment history", testid: "wallet-action-payments" },
        { to: "/services", label: t.admin?.myServices || "My services & renewals", testid: "wallet-action-services" },
        { to: "/orders", label: t.admin?.orders || "Orders", testid: "wallet-action-orders" },
    ];

    return (
        <>
            <div className='space-y-7' data-testid="wallet-page">
                <div className='flex flex-col gap-2 title-section'>
                    <h2>{t.admin?.wallet || "Wallet"}</h2>
                </div>

                <div className='grid gap-5 lg:grid-cols-2'>
                    <div className='nw-stat nw-stat-glow flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between' data-testid="wallet-balance-card">
                        <div className="min-w-0">
                            <p className='nw-mono flex items-center gap-2'><span className="nw-stat-chip nw-grad-brand !h-8 !w-8 !rounded-lg"><LuWallet className="h-4 w-4" /></span> {t.admin?.walletBalance || "Wallet balance"}</p>
                            <p className="mt-3 font-display text-5xl font-extrabold tracking-tight nw-grad-text" data-testid="wallet-balance">
                                ${Number(walletBalance || 0).toFixed(2)}
                            </p>
                            <p className="mt-1 text-13 text-ink-soft dark:text-gray-400">Prepaid USD · funded with crypto · no card stored</p>
                        </div>
                        <button type='button' className='nw-btn-primary shrink-0' onClick={handleModalOpen} data-testid="wallet-topup-button">
                            <LuPlus className="h-4 w-4" /> {t.admin?.walletTopUp || "Top up"}
                        </button>
                        {isModal && <WalletModal onClose={handleModalClose} onSuccess={fetchWalletBalance} resumePayment={resumePayment} currentBalance={walletBalance} />}
                    </div>

                    <div className='nw-stat nw-stat-glow nw-stat-glow-warm flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between' id="rewards" data-testid="wallet-rewards-card">
                        <div className="min-w-0">
                            <p className='nw-mono flex items-center gap-2'><span className="nw-stat-chip nw-grad-warm !h-8 !w-8 !rounded-lg"><LuGift className="h-4 w-4" /></span> {t.admin?.rewardPoints || "Reward points"}</p>
                            <p className="mt-3 font-display text-5xl font-extrabold tracking-tight nw-grad-text-warm" data-testid="wallet-points">
                                {points.toFixed(2)}
                            </p>
                            <p className="mt-1 text-13 text-ink-soft dark:text-gray-400">≈ ${(points * POINT_VALUE_USD).toFixed(2)} · auto-applied at checkout</p>
                        </div>
                        <a href="#reward-history" className='nw-btn-secondary shrink-0' data-testid="wallet-points-history-link">
                            History <HiArrowSmRight size={18} />
                        </a>
                    </div>
                </div>

                <TopupHistory onResume={handleResumeTopup} />

                <div>
                    <p className='card-admin-title'>{t.admin?.actions || "Actions"}</p>
                    <div className='nw-card !p-0 overflow-hidden md:w-1/2 divide-y divide-line dark:divide-white/[0.06]'>
                        {actions.map((a) => (
                            <NavLink key={a.to} to={a.to} className="flex items-center justify-between px-5 py-4 text-sm font-medium text-primary transition-colors hover:bg-surface-2 dark:text-gray-200 dark:hover:bg-white/[0.04]" data-testid={a.testid}>
                                <span>{a.label}</span>
                                <HiArrowSmRight size={20} className="text-ink-soft" />
                            </NavLink>
                        ))}
                    </div>
                </div>

                <ReferralCard />

                <div id="reward-history">
                    <RewardHistory />
                </div>
            </div>
            {walletLoading && <Loader />}
        </>
    );
};

export default Wallet;
