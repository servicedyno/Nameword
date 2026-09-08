import React from "react";
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

  const handleLogout = async () => {
    try {
      const data = await logout();
      userDropDown.close();
      showAlert(data?.message || t.common.userMenu.logoutSuccess, {
        duration: 2500,
        type: "success",
      });
      navigate("/sign-in", { replace: true });
    } catch (error) {
      console.log("error: ", error);
    }
  };

  if (!user) return null;

  console.log(userDropDown, "userDropDown");

  return (
    <>
      <div
        className={`flex items-start lg:items-center gap-2.5 ${
          classAdd ? "max-lg:min-w-3xs" : ""
        } `}
      >
        <div
          ref={userDropDown.ref}
          className={`relative ${classAdd ? "max-lg:min-w-3xs" : ""} `}
        >
          <button
            onClick={userDropDown.toggle}
            type="button"
            className="user-menu cursor-pointer"
          >
            <p>{user?.name}</p>
            <IoChevronDown size={14} />
          </button>

          {userDropDown.isOpen && (
            <div
              className={`user-dropdown show ${
                classAdd ? "max-lg:left-0" : ""
              }`}
              style={{ ...userDropDown.positionStyle, zIndex: 9999 }}
            >
              <div className="user-email">
                <p>{user?.name}</p>
                <span>{user?.email}</span>
              </div>

              <hr className="card-divider my-3.5" />

              <div className="px-4">
                <NavLink
                  to={"/account-setting?tab=account-information"}
                  className="user-menu"
                  onClick={userDropDown.close}
                >
                  {t.common.userMenu.accountInformation}
                </NavLink>
                <NavLink
                  to={"/account-setting?tab=security"}
                  className="user-menu"
                  onClick={userDropDown.close}
                >
                  {t.common.userMenu.security}
                </NavLink>
                <NavLink
                  to={"/account-setting?tab=account-activity"}
                  className="user-menu"
                  onClick={userDropDown.close}
                >
                  {t.common.userMenu.accountActivity}
                </NavLink>
                <NavLink
                  to={"/account-setting?tab=notification"}
                  className="user-menu"
                  onClick={userDropDown.close}
                >
                  {t.common.userMenu.notificationSettings}
                </NavLink>
                <NavLink
                  to={"/account-setting?tab=api-key"}
                  className="user-menu"
                  onClick={userDropDown.close}
                >
                  {t.common.userMenu.apiKeys}
                </NavLink>
              </div>

              <hr className="card-divider my-3.5" />

              <div className="px-4 pb-4">
                <NavLink className="user-menu red-color" onClick={handleLogout}>
                  {t.common.userMenu.logout}
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
