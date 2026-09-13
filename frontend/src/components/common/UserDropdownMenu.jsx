import { useAuth } from "../../hooks/useAuth";
import useDropdown from "../../hooks/useDropdown";
import Loader from "./Loader";
import { IoChevronDown } from "react-icons/io5";
import { useAlert } from "../../context/AlertContext";
import { NavLink, useNavigate } from "react-router";
import { useLanguage } from "../../hooks/useLanguage";

const UserDropdownMenu = ({ classAdd = false }) => {
  const { user, logout, loading } = useAuth();
  const userDropDown = useDropdown();
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const { t } = useLanguage();
  const menu = t.common.userMenu;
  const admin = t.admin || {};

  const handleLogout = async () => {
    try {
      const data = await logout();
      userDropDown.close();
      showAlert(data?.message || menu.logoutSuccess, { duration: 2500, type: "success" });
      navigate("/sign-in", { replace: true });
    } catch {
      /* ignore */
    }
  };

  if (!user) return null;

  // Full "manage your account" links so a signed-in user can reach every part of
  // the app from anywhere (storefront navbar or in-app top bar).
  const quickLinks = [
    { to: "/dashboard", label: admin.dashboard || "Dashboard", testid: "dashboard" },
    { to: "/domains", label: admin.domains || "Domains", testid: "domains" },
    { to: "/wallet", label: admin.wallet || "Wallet", testid: "wallet" },
    { to: "/wallet#rewards", label: t.site?.app?.rail?.rewards || "Rewards", testid: "rewards" },
    { to: "/orders", label: admin.orders || "Orders", testid: "orders" },
    { to: "/services", label: admin.myServices || "My services", testid: "services" },
    { to: "/subscriptions", label: admin.subscriptions || "Subscriptions", testid: "subscriptions" },
    { to: "/payment-history", label: admin.paymentHistory || "Payment history", testid: "payment-history" },
    { to: "/help-support", label: admin.helpSupport || "Help & Support", testid: "help" },
  ];

  const settingsLinks = [
    { to: "/account-setting?tab=account-information", label: menu.accountInformation },
    { to: "/account-setting?tab=security", label: menu.security },
    { to: "/account-setting?tab=account-activity", label: menu.accountActivity },
    { to: "/account-setting?tab=notification", label: menu.notificationSettings },
    { to: "/account-setting?tab=api-key", label: menu.apiKeys },
  ];

  return (
    <>
      <div className={`flex items-start lg:items-center gap-2.5 ${classAdd ? "max-lg:min-w-3xs" : ""} `}>
        <div ref={userDropDown.ref} className={`relative ${classAdd ? "max-lg:min-w-3xs" : ""} `}>
          <button
            onClick={userDropDown.toggle}
            type="button"
            className="user-menu cursor-pointer"
            data-testid="user-menu-button"
          >
            <p>{user?.name}</p>
            <IoChevronDown size={14} />
          </button>

          {userDropDown.isOpen && (
            <div
              className={`user-dropdown show max-h-[75vh] overflow-y-auto ${classAdd ? "max-lg:left-0" : ""}`}
              style={{ ...userDropDown.positionStyle, zIndex: 9999 }}
              data-testid="user-menu-dropdown"
            >
              <div className="user-email">
                <p>{user?.name}</p>
                <span>{user?.email}</span>
              </div>

              <hr className="card-divider my-3.5" />

              <div className="px-4">
                <p className="mb-1 px-1 text-xs font-semibold uppercase tracking-wider text-ink-soft dark:text-gray-500">
                  {menu.manageAccount}
                </p>
                {quickLinks.map((l) => (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    className="user-menu"
                    onClick={userDropDown.close}
                    data-testid={`user-menu-${l.testid}`}
                  >
                    {l.label}
                  </NavLink>
                ))}
              </div>

              <hr className="card-divider my-3.5" />

              <div className="px-4">
                {settingsLinks.map((l) => (
                  <NavLink key={l.to} to={l.to} className="user-menu" onClick={userDropDown.close}>
                    {l.label}
                  </NavLink>
                ))}
              </div>

              <hr className="card-divider my-3.5" />

              <div className="px-4 pb-4">
                <NavLink
                  to="/"
                  className="user-menu"
                  onClick={userDropDown.close}
                  data-testid="user-menu-public-site"
                >
                  {menu.viewPublicSite}
                </NavLink>
                <NavLink className="user-menu red-color" onClick={handleLogout} data-testid="user-menu-logout">
                  {menu.logout}
                </NavLink>
              </div>
            </div>
          )}
        </div>
      </div>
      {loading && <Loader />}
    </>
  );
};

export default UserDropdownMenu;
