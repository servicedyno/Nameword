import AccountInformation from "../../../components/front-admin/UserManagement/AccountInformation/AccountInformation";
import AccountSettingTab from "../../../components/front-admin/UserManagement/AccountInformation/AccountSettingTab";

import MobileApp from "../../../components/front-admin/UserManagement/Security/MobileApp";
import EmailCode from "../../../components/front-admin/UserManagement/Security/EmailCode";

import ApiKeyTable from "../../../components/front-admin/UserManagement/ApiKey/ApiKeyTable";
import WhyUseApi from "../../../components/front-admin/UserManagement/ApiKey/WhyUseApi";

import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router";
import { LuUser } from "react-icons/lu";
import { FiExternalLink } from "react-icons/fi";
import CreateApiKey from "../../../components/modals/create-api-key";
import { useSearchMessages } from "../../../hooks/useSearchMessages";
import { useApiKeys } from "../../../hooks/useApiKeys";
import GenerateApiKey from "../../../components/modals/generate-api-key";
import { IoIosArrowDown } from "react-icons/io";
import { useLanguage } from "../../../hooks/useLanguage";

// Trimmed Account Settings: only Account Information (incl. password), Security
// (2FA), and API Keys — with an in-app link to the API documentation. Other
// sections (activity, notifications, social logins, delete account) were removed.
const TABS = ["account-information", "security", "api-key"];

const AccountSettings = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("account-information");
  const [accountActiveTab, setActiveAccountTab] = useState("mobile-app");

  const navigate = useNavigate();
  const params = useSearchMessages();
  const tab = params.getMessage("tab");

  const { createdToken, setCreatedToken } = useApiKeys();

  // Modal click
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerateKeyModalOpen, setIsGenerateKeyModalOpen] = useState(false);

  useEffect(() => {
    if (tab && TABS.includes(tab) && activeTab !== tab) {
      setActiveTab(tab);
    }
    if (tab) navigate("/account-setting", { replace: true });
  }, [tab]);

  const handleOpenModal = () => {
    setIsGenerateKeyModalOpen(true);
    setIsOpen(false);
  };

  const handleCloseModal = () => {
    setIsGenerateKeyModalOpen(false);
    setCreatedToken(null);
  };

  return (
    <div className="space-y-7">
      <div className="flex items-start flex-col max-sm:gap-10 sm:flex-row">
        {/* Tab menu — large screen */}
        <div className="sm:flex gap-2.5 mb-6 flex-col max-w-3xs pr-8 shrink-0 sticky top-24 hidden">
          <div className="flex justify-start items-center gap-2 text-lg font-medium text-primary dark:text-white pb-4">
            <LuUser className="text-base" />
            <p>{t.admin.accountSettings}</p>
          </div>

          <button
            onClick={() => setActiveTab("account-information")}
            className={`account-tab-button ${activeTab === "account-information" ? "active" : ""}`}
          >
            {t.admin.accountInformation}
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`account-tab-button ${activeTab === "security" ? "active" : ""}`}
          >
            {t.admin.security}
          </button>
          <button
            onClick={() => setActiveTab("api-key")}
            className={`account-tab-button ${activeTab === "api-key" ? "active" : ""}`}
          >
            {t.admin.apiKeys}
          </button>
        </div>

        {/* Tab menu — small screen */}
        <div className="relative w-full sm:hidden block">
          <select
            className="input-field admin-form peer"
            id="activeTab"
            onChange={(e) => setActiveTab(e.target.value)}
            value={activeTab}
          >
            <option value="account-information">{t.admin.accountInformation}</option>
            <option value="security">{t.admin.security}</option>
            <option value="api-key">{t.admin.apiKeys}</option>
          </select>
          <IoIosArrowDown
            size={15}
            className="absolute top-1/2 transform -translate-y-1/2 right-4 text-primary dark:text-white"
          />
          <label
            htmlFor="activeTab"
            className="absolute left-5 transition-all font-medium top-2 text-xs text-gray-600 peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary"
          >
            {t.admin.accountSettings} *
          </label>
        </div>

        {/* Tab Content */}
        <div className="w-full sm:pl-9 space-y-7 sm:border-l sm:border-stokecolor dark:border-gray-700 overflow-hidden">
          {activeTab === "account-information" && (
            <div className="space-y-7">
              <div className="flex flex-col gap-2 title-section">
                <h2>{t.admin.accountInformation}</h2>
              </div>

              <div className="table-card mb-8">
                <div>
                  <p className="info-card-title px-5 py-4">{t.admin.personalInformation}</p>
                  <hr className="card-divider" />
                  <AccountInformation />
                </div>
              </div>
              <div className="table-card mb-8">
                <div>
                  <p className="info-card-title px-5 py-4">{t.admin.accountSettingsSection}</p>
                  <hr className="card-divider" />
                  <AccountSettingTab />
                </div>
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-7">
              <div className="flex flex-col gap-2 title-section">
                <h2>{t.admin.security}</h2>
              </div>

              {/* Sub-tabs */}
              <div className="flex gap-2.5 mb-6">
                <button
                  onClick={() => setActiveAccountTab("mobile-app")}
                  className={`tab-button ${accountActiveTab === "mobile-app" ? "active" : ""}`}
                >
                  {t.admin.mobileApp}
                </button>
                <button
                  onClick={() => setActiveAccountTab("email-code")}
                  className={`tab-button ${accountActiveTab === "email-code" ? "active" : ""}`}
                >
                  {t.admin.emailCode}
                </button>
              </div>

              {accountActiveTab === "mobile-app" && (
                <div className="table-card">
                  <p className="info-card-title px-5 py-4">{t.admin.twoFactorAuthenticationSetup}</p>
                  <hr className="card-divider" />
                  <MobileApp />
                </div>
              )}
              {accountActiveTab === "email-code" && (
                <div className="table-card">
                  <p className="info-card-title px-5 py-4">{t.admin.emailAuthenticationSetup}</p>
                  <hr className="card-divider" />
                  <EmailCode />
                </div>
              )}
            </div>
          )}

          {activeTab === "api-key" && (
            <div className="space-y-7">
              <div className="flex flex-col gap-2 title-section">
                <h2>{t.admin.apiKeys}</h2>
              </div>

              <div className="space-y-5">
                <div className="flex justify-end items-center admin-btn gap-2">
                  <NavLink to="/api-docs" className="btn-outline" data-testid="api-docs-link">
                    {t.admin.apiDocumentation} <FiExternalLink size={14} />
                  </NavLink>
                  <NavLink className="add-to-cart" onClick={() => setIsOpen(true)}>
                    {t.admin.createNewKey}
                  </NavLink>
                </div>

                <div className="table-card">
                  <ApiKeyTable />
                </div>
              </div>

              {/* Modals */}
              {isOpen && (
                <CreateApiKey onClose={() => setIsOpen(false)} handleOpenModal={handleOpenModal} />
              )}
              {isGenerateKeyModalOpen && (
                <GenerateApiKey onClose={handleCloseModal} createdToken={createdToken} />
              )}

              <div className="space-y-5">
                <p className="card-admin-title">{t.admin.whyUseApi}</p>
                <div className="table-card">
                  <WhyUseApi />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;
