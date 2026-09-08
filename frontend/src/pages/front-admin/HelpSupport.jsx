import { useState, useMemo, useEffect } from "react";
import { LuUser } from "react-icons/lu";
import NeedHelp from "../../components/front-admin/help-support/NeedHelp";
import QASection from "../../components/front-admin/help-support/QASection";
import MainLayout from '../../layouts/MainLayout';
import { useLanguage } from "../../hooks/useLanguage";
import { IoIosArrowDown } from "react-icons/io";
import { useLocation } from "react-router";

// Helper function to format answer from translation object
const formatAnswer = (answer) => {
  if (typeof answer === 'string') {
    return answer;
  }
  
  if (typeof answer === 'object' && answer !== null) {
    const parts = [];
    const listItems = [];
    
    // Handle intro text (paragraph)
    if (answer.intro) {
      parts.push(<p key="intro">{answer.intro}</p>);
    }
    
    // Collect all list items (excluding intro and conclusion)
    const excludeKeys = new Set(['intro', 'conclusion']);
    Object.keys(answer).forEach((key) => {
      if (!excludeKeys.has(key) && answer[key]) {
        const value = answer[key];
        // Check if value contains a colon (format: "Label: description")
        if (typeof value === 'string' && value.includes(':')) {
          const [label, ...rest] = value.split(':');
          listItems.push(
            <li key={key} className="list-disc list-inside">
              <strong>{label}:</strong> {rest.join(':').trim()}
            </li>
          );
        } else {
          listItems.push(
            <li key={key} className="list-disc list-inside">
              {value}
            </li>
          );
        }
      }
    });
    
    // Add list if there are items
    if (listItems.length > 0) {
      parts.push(<ul key="list">{listItems}</ul>);
    }
    
    // Handle conclusion text (paragraph)
    if (answer.conclusion) {
      parts.push(<p key="conclusion">{answer.conclusion}</p>);
    }
    
    return parts.length > 0 ? <>{parts}</> : null;
  }
  
  return answer;
};

const HelpSupport = () => {
  const [activeTab, setActiveTab] = useState("discover-domain");
  const { t } = useLanguage();
  const location = useLocation();

  useEffect(() => {
    const hash = location.hash?.replace("#", "") || "";
    if (hash === "discover-domains") {
      setActiveTab("discover-domain");
      setTimeout(() => {
        const el = document.getElementById("discover-domains");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else if (hash === "need-help") {
      setTimeout(() => {
        const el = document.getElementById("need-help");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [location.pathname, location.hash]);

  // Sidebar menu items
  const sidebarItems = [
    // { id: "most-popular", label: t.helpSupport.sidebar.mostPopular },
    { id: "discover-domain", label: t.helpSupport.sidebar.discoverDomain },
    { id: "dns", label: t.helpSupport.sidebar.dns },
    { id: "transfer-domains", label: t.helpSupport.sidebar.transferDomains },
    { id: "renew-domains", label: t.helpSupport.sidebar.renewDomains },
    { id: "manage-contact", label: t.helpSupport.sidebar.manageContact },
    { id: "secure-domains", label: t.helpSupport.sidebar.secureDomains },
    { id: "explore-domains", label: t.helpSupport.sidebar.exploreDomains },
    { id: "buy-sell-domains", label: t.helpSupport.sidebar.buySellDomains },
    { id: "organize-domains", label: t.helpSupport.sidebar.organizeDomains },
    { id: "hosting", label: t.helpSupport.sidebar.hosting },
    { id: "billing-payments", label: t.helpSupport.sidebar.billingPayments },
    { id: "account-security", label: t.helpSupport.sidebar.accountSecurity },
    { id: "technical-issues", label: t.helpSupport.sidebar.technicalIssues },
  ];

  // Get Q&A data from translations
  const qaData = useMemo(() => {
    const sectionMap = {
      "discover-domain": "discoverDomain",
      "dns": "dns",
      "transfer-domains": "transferDomains",
      "renew-domains": "renewDomains",
      "manage-contact": "manageContact",
      "secure-domains": "secureDomains",
      "explore-domains": "exploreDomains",
      "buy-sell-domains": "buySellDomains",
      "organize-domains": "organizeDomains",
      "hosting": "hosting",
      "billing-payments": "billingPayments",
      "account-security": "accountSecurity",
      "technical-issues": "technicalIssues",
      "most-popular": null
    };

    const sectionKey = sectionMap[activeTab];
    if (!sectionKey || !t.helpSupport?.sections?.[sectionKey]) {
      return [];
    }

    return t.helpSupport.sections[sectionKey].map((qa) => ({
      question: qa.question,
      answer: formatAnswer(qa.answer)
    }));
  }, [activeTab, t]);

  return (
    <MainLayout >
      <div className="space-y-7">
        <div className="flex items-start flex-col max-sm:gap-10 sm:flex-row">
          {/* Tab menu */}

          {/* for large screen */}
          <div className="sm:flex gap-2.5 mb-6 flex-col max-w-3xs pr-8 shrink-0 sticky top-24 hidden">
            <div className="flex justify-start items-center gap-2 text-lg font-medium text-primary dark:text-white pb-4">
              <LuUser className="text-base" />

              <p>{t.nav.helpSupport}</p>
            </div>

            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`account-tab-button ${
                  activeTab === item.id ? "active" : ""
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* for small screen */}
          <div className="relative w-full sm:hidden block">
            <select
              className="input-field admin-form peer"
              id="activeTab"
              onChange={(e) => setActiveTab(e.target.value)}
              value={activeTab}
            >
              {sidebarItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <IoIosArrowDown
              size={15}
              className="absolute top-1/2 transform -translate-y-1/2 right-4 text-primary dark:text-white"
            />

            <label
              htmlFor="activeTab"
              className={`absolute left-5 transition-all font-medium ${activeTab
                  ? "top-2 text-xs text-gray-600"
                  : "top-4 text-13 text-primary dark:text-gray-500 "
                } peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}
            >
              {t.helpSupport.common.accountSettings}
            </label>
          </div>

          {/* Tab Content */}
          <div className="w-full sm:pl-9 space-y-7 sm:border-l sm:border-stokecolor dark:border-gray-700 overflow-hidden">
            <div className="space-y-7">
              <div id="discover-domains">
                <QASection 
                  title={sidebarItems.find(item => item.id === activeTab)?.label || t.helpSupport.common.helpSupportTitle}
                  qaData={qaData}
                />
              </div>

              <div id="need-help" className="space-y-5">
                <p className="card-admin-title">{t.helpSupport.common.needHelp}</p>

                <div className="table-card">
                  <NeedHelp />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default HelpSupport;
