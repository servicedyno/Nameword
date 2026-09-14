import { globeIcon } from "../../components/common/icons";
import { useAuth } from "../../hooks/useAuth";
import AdminCard from "../../components/front-admin/admin-common/adminCard";
import { useNavigate } from "react-router";
import DomainList from "./domain/DomainList";
import { useDomainSearch } from "../../hooks/useDomainSearch";
import { useDomain } from "../../hooks/useDomain";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../hooks/useLanguage";
import PendingCryptoStrip from "../../components/front-admin/PendingCryptoStrip";
import InlineDomainSearch from "../../components/cart/InlineDomainSearch";

const Dashboard = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { domains } = useDomain();
  const {
    getTldSuggestions,
    tldSuggestions,
    loading: tldLoading,
  } = useDomainSearch();
  const [baseDomainName, setBaseDomainName] = useState("");
  const [hiddenCards, setHiddenCards] = useState(new Set());

  // Brand-protection suggestions are based ONLY on a domain the customer actually owns
  // (their real SLD across other TLDs). We do NOT guess from the account name/email.
  useEffect(() => {
    const owned = (domains || [])
      .map((d) => (d?.domain || d?.websiteName || "").trim())
      .find((n) => n && n.includes("."));
    if (owned) {
      setBaseDomainName(owned.split(".")[0].toLowerCase().replace(/[^a-z0-9-]/g, ""));
    } else {
      setBaseDomainName("");
    }
  }, [domains]);

  useEffect(() => {
    if (baseDomainName) {
      getTldSuggestions(baseDomainName);
    }
  }, [baseDomainName, getTldSuggestions]);

  // Only surface genuinely useful suggestions: available and sensibly priced.
  const cardData = useMemo(() => {
    if (!tldSuggestions || tldSuggestions.length === 0) return [];
    const MAX_SUGGESTION_USD = Number(import.meta.env.VITE_SUGGESTION_MAX_USD) || 200;
    const affordable = tldSuggestions
      .filter((s) => s?.available && Number(s?.registrationFee) > 0 && Number(s?.registrationFee) <= MAX_SUGGESTION_USD)
      .sort((a, b) => Number(a?.registrationFee) - Number(b?.registrationFee))
      .slice(0, 3);

    return affordable
      .map((suggestion, index) => ({
        title: suggestion?.websiteName || "",
        discount: 0,
        price: Number.parseFloat((Number(suggestion?.registrationFee) || 0).toFixed(2)),
        oldPrice: null,
        moreOptions: index === 1 && affordable.length > 2,
        suggestion,
      }))
      .filter((card) => !hiddenCards.has(card.title));
  }, [tldSuggestions, hiddenCards]);

  const handleMoreOptions = () => {
    if (baseDomainName) navigate(`/domains?value=${baseDomainName}`);
  };

  const handleHideCard = (cardTitle) => {
    setHiddenCards((prev) => new Set([...prev, cardTitle]));
  };

  return (
    <div className="space-y-7">
      {/* Pending crypto top-ups the user can resume */}
      <PendingCryptoStrip />

      {/* Dashboard title */}
      <div className="flex flex-col gap-2 title-section nw-rise">
        {(() => {
          const greeting = t.admin.dashboardGreeting || "Welcome back, {name}.";
          const [before, after = ""] = greeting.split("{name}");
          return (
            <h2>
              {before}
              <span className="nw-grad-text">{user?.name || ""}</span>
              {after}
            </h2>
          );
        })()}
        <p>{t.admin.dashboardSubtitle}</p>
      </div>

      {tldLoading && cardData.length < 1 ? (
        <div className="flex items-center justify-center py-4">
          <div className="border-gray-300 h-6 w-6 animate-spin rounded-full border-4 border-t-darkbtn" />
        </div>
      ) : cardData.length > 0 ? (
        <div className="flex flex-nowrap gap-2.5 overflow-x-auto w-full nw-rise nw-rise-2">
          {cardData.map((card, index) => (
            <AdminCard key={index} {...card} onMoreOptions={handleMoreOptions} onHide={handleHideCard} />
          ))}
        </div>
      ) : null}

      {/* Inline domain search — search, see prices, add to cart without leaving */}
      <div className="nw-card nw-stat-glow nw-rise nw-rise-3 relative overflow-hidden" data-testid="dashboard-register-card">
        <img
          src={globeIcon}
          alt={t.admin.globeImageAlt}
          title={t.admin.globeImageTitle}
          className="pointer-events-none absolute -right-6 -top-6 w-72 opacity-70 dark:opacity-10"
        />
        <div className="relative flex w-full flex-col justify-start lg:w-2/3">
          <p className="card-admin-title">{t.domain.registerNewDomain}</p>
          <InlineDomainSearch />
        </div>
      </div>

      {/* domain list */}
      <DomainList />
    </div>
  );
};

export default Dashboard;
