import { useState, useMemo, useEffect } from "react";
import { LuUser, LuSearch, LuX } from "react-icons/lu";
import NeedHelp from "../../components/front-admin/help-support/NeedHelp";
import QASection from "../../components/front-admin/help-support/QASection";
import MainLayout from '../../layouts/MainLayout';
import { useLanguage } from "../../hooks/useLanguage";
import { IoIosArrowDown } from "react-icons/io";
import { useLocation } from "react-router";

// Sidebar id -> translation key (same key used for both the label and the Q&A section).
const SECTION_MAP = {
  "discover-domain": "discoverDomain",
  "dns": "dns",
  "renew-domains": "renewDomains",
  "manage-contact": "manageContact",
  "secure-domains": "secureDomains",
  "explore-domains": "exploreDomains",
  "organize-domains": "organizeDomains",
  "hosting": "hosting",
  "billing-payments": "billingPayments",
  "crypto-checkout": "cryptoCheckout",
  "account-security": "accountSecurity",
  "technical-issues": "technicalIssues",
};

const SIDEBAR_IDS = Object.keys(SECTION_MAP);

// Convert a translation answer (string or object) into a React node for display.
const formatAnswer = (answer) => {
  if (typeof answer === 'string') {
    return answer;
  }

  if (typeof answer === 'object' && answer !== null) {
    const parts = [];
    const listItems = [];

    if (answer.intro) {
      parts.push(<p key="intro">{answer.intro}</p>);
    }

    const excludeKeys = new Set(['intro', 'conclusion']);
    Object.keys(answer).forEach((key) => {
      if (!excludeKeys.has(key) && answer[key]) {
        const value = answer[key];
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

    if (listItems.length > 0) {
      parts.push(<ul key="list">{listItems}</ul>);
    }

    if (answer.conclusion) {
      parts.push(<p key="conclusion">{answer.conclusion}</p>);
    }

    return parts.length > 0 ? <>{parts}</> : null;
  }

  return answer;
};

// Flatten an answer (string or object) into plain text for search matching.
const answerToText = (answer) => {
  if (typeof answer === 'string') return answer;
  if (answer && typeof answer === 'object') {
    return Object.values(answer).filter((v) => typeof v === 'string').join(' ');
  }
  return '';
};

const HelpSupport = () => {
  const [activeTab, setActiveTab] = useState("discover-domain");
  const [query, setQuery] = useState("");
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

  // Sidebar menu items (label key == section key).
  const sidebarItems = SIDEBAR_IDS.map((id) => ({
    id,
    label: t.helpSupport.sidebar[SECTION_MAP[id]],
  }));

  // Q&A data for the active tab.
  const qaData = useMemo(() => {
    const sectionKey = SECTION_MAP[activeTab];
    const list = sectionKey && t.helpSupport?.sections?.[sectionKey];
    if (!Array.isArray(list)) return [];
    return list.map((qa) => ({
      question: qa.question,
      answer: formatAnswer(qa.answer),
    }));
  }, [activeTab, t]);

  const isSearching = query.trim().length > 0;

  // Search across every section's questions and answers.
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const results = [];
    SIDEBAR_IDS.forEach((id) => {
      const list = t.helpSupport?.sections?.[SECTION_MAP[id]];
      if (!Array.isArray(list)) return;
      list.forEach((qa) => {
        const haystack = `${qa.question} ${answerToText(qa.answer)}`.toLowerCase();
        if (haystack.includes(q)) {
          results.push({ question: qa.question, answer: formatAnswer(qa.answer) });
        }
      });
    });
    return results;
  }, [query, t]);

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Marketing hero + search */}
        <section
          className="relative overflow-hidden rounded-3xl border border-line bg-surface-2 px-6 py-12 text-center dark:border-white/[0.07] dark:bg-gray-900 sm:py-16"
          data-testid="help-hero"
        >
          <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-brand/15 blur-3xl" />
          <div className="relative mx-auto max-w-2xl">
            <span className="nw-eyebrow mb-4">{t.helpSupport.common.heroEyebrow}</span>
            <h1 className="text-4xl font-bold tracking-tight text-primary dark:text-white sm:text-5xl">
              {t.helpSupport.common.heroTitle}
            </h1>
            <p className="nw-lead mx-auto mt-4 max-w-xl">{t.helpSupport.common.heroSubtitle}</p>
            <div className="relative mx-auto mt-8 max-w-xl">
              <LuSearch className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft dark:text-gray-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.helpSupport.common.searchPlaceholder}
                aria-label={t.helpSupport.common.searchPlaceholder}
                data-testid="help-search-input"
                className="w-full rounded-full border border-line bg-white py-3.5 pl-12 pr-12 text-15 text-primary shadow-sm outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:border-white/10 dark:bg-gray-950 dark:text-white dark:placeholder:text-gray-500 dark:focus:ring-brand-500/20"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  aria-label={t.helpSupport.common.clearSearch}
                  data-testid="help-search-clear"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-soft transition hover:text-primary dark:text-gray-400 dark:hover:text-white"
                >
                  <LuX className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </section>

        {isSearching ? (
          /* Search results */
          <div className="space-y-7" data-testid="help-search-results">
            {searchResults.length > 0 ? (
              <QASection
                title={`${t.helpSupport.common.searchResultsTitle} (${searchResults.length})`}
                qaData={searchResults}
              />
            ) : (
              <div className="w-full action-card overflow-hidden">
                <div className="px-5 py-10 text-center text-secondary dark:text-gray-400" data-testid="help-search-empty">
                  <p>{t.helpSupport.common.noResults}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Browse by topic */
          <div className="flex items-start flex-col max-sm:gap-10 sm:flex-row" data-testid="help-browse">
            {/* Tab menu — large screen */}
            <div className="sm:flex gap-2.5 mb-6 flex-col max-w-3xs pr-8 shrink-0 sticky top-24 hidden">
              <div className="flex justify-start items-center gap-2 text-lg font-medium text-primary dark:text-white pb-4">
                <LuUser className="text-base" />
                <p>{t.nav.helpSupport}</p>
              </div>

              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  data-testid={`help-tab-${item.id}`}
                  className={`account-tab-button ${activeTab === item.id ? "active" : ""}`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Tab menu — small screen */}
            <div className="relative w-full sm:hidden block">
              <select
                className="input-field admin-form peer"
                id="activeTab"
                onChange={(e) => setActiveTab(e.target.value)}
                value={activeTab}
                data-testid="help-tab-select"
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

            {/* Tab content */}
            <div className="w-full sm:pl-9 space-y-7 sm:border-l sm:border-stokecolor dark:border-gray-700 overflow-hidden">
              <div id="discover-domains">
                <QASection
                  title={sidebarItems.find((item) => item.id === activeTab)?.label || t.helpSupport.common.helpSupportTitle}
                  qaData={qaData}
                />
              </div>
            </div>
          </div>
        )}

        {/* Need help — always visible */}
        <div id="need-help" className="space-y-5">
          <p className="card-admin-title">{t.helpSupport.common.needHelp}</p>
          <div className="table-card">
            <NeedHelp />
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default HelpSupport;
