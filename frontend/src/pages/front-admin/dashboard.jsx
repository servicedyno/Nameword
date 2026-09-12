import { globeIcon } from "../../components/common/icons";
import { TbSearch } from "react-icons/tb";
import { useAuth } from "../../hooks/useAuth";
import AdminCard from "../../components/front-admin/admin-common/adminCard";
import { useNavigate } from "react-router";
import DomainList from "./domain/DomainList";
import { useDomainSearch } from "../../hooks/useDomainSearch";
import { useDomain } from "../../hooks/useDomain";
import { useEffect, useMemo, useState, useRef } from "react";
import { useLanguage } from "../../hooks/useLanguage";

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
  const [searchTerm, setSearchTerm] = useState("");

  const domainSuggestionRef = useRef(null);

  // Extract base domain name from user's first domain or use dynamic fallback from user name
  useEffect(() => {
    if (domains && domains.length > 0) {
      const firstDomain = domains[0]?.websiteName || "";
      if (firstDomain) {
        // Extract base name (e.g., "apple" from "apple.com")
        const baseName = firstDomain.split(".")[0];
        setBaseDomainName(baseName);
      }
    } else if (user?.name) {
      // Extract base name from user's name dynamically
      // Get first word of name, remove special characters, convert to lowercase
      const nameBase = user.name
        .trim()
        .split(/\s+/)[0]
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      
      // Only use if it's a valid domain name (at least 2 characters)
      if (nameBase.length >= 2) {
        setBaseDomainName(nameBase);
      } else if (user?.email) {
        // Fallback to email username if name doesn't work
        const emailBase = user.email
          .split("@")[0]
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");
        if (emailBase.length >= 2) {
          setBaseDomainName(emailBase);
        } else {
          setBaseDomainName("");
        }
      } else {
        setBaseDomainName("");
      }
    } else if (user?.email) {
      // Use email username as fallback if no name available
      const emailBase = user.email
        .split("@")[0]
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      if (emailBase.length >= 2) {
        setBaseDomainName(emailBase);
      } else {
        setBaseDomainName("");
      }
    } else {
      // No domains, name, or email - don't set base domain
      setBaseDomainName("");
    }
  }, [domains, user]);

  // Fetch TLD suggestions when base domain name is available
  useEffect(() => {
    if (baseDomainName) {
      getTldSuggestions(baseDomainName);
    }
  }, [baseDomainName, getTldSuggestions]);

  // Transform TLD suggestions to card data format
  const cardData = useMemo(() => {
    if (!tldSuggestions || tldSuggestions.length === 0) {
      // Return empty array or default static data for design reference
      return [];
    }

    // Only surface genuinely useful suggestions: available and sensibly priced.
    // Premium registrations can cost thousands — never show those as casual "buy now" cards.
    const MAX_SUGGESTION_USD = Number(import.meta.env.VITE_SUGGESTION_MAX_USD) || 200;

    const affordable = tldSuggestions
      .filter((s) => s?.available && Number(s?.registrationFee) > 0 && Number(s?.registrationFee) <= MAX_SUGGESTION_USD)
      .sort((a, b) => Number(a?.registrationFee) - Number(b?.registrationFee))
      .slice(0, 3);

    return affordable
      .map((suggestion, index) => {
        const price = Number(suggestion?.registrationFee || 0);
        return {
          title: suggestion?.websiteName || "",
          discount: 0,
          price: Number.parseFloat(price.toFixed(2)),
          oldPrice: null,
          moreOptions: index === 1 && affordable.length > 2,
          suggestion: suggestion,
        };
      })
      .filter((card) => !hiddenCards.has(card.title));
  }, [tldSuggestions, hiddenCards]);

  const handleSearch = async (data) => {
    if (!data.trim()) return;
    navigate(`/home?value=${data}`, { replace: true });
  };

  const handleMoreOptions = () => {
    if (baseDomainName) {
      navigate(`/home?value=${baseDomainName}`);
    }
  };

  const handleHideCard = (cardTitle) => {
    setHiddenCards((prev) => new Set([...prev, cardTitle]));
  };

  return (
    <>
      {/* toster */}
      {/* <AlertMessage /> */}

      <div className="space-y-7">
        {/* Dashboard title */}
        <div className="flex flex-col gap-2 title-section">
          <h2>{t.admin.dashboardGreeting.replace("{name}", user?.name || "")}</h2>
          <p>{t.admin.dashboardSubtitle}</p>
        </div>
        {tldLoading && cardData.length < 1 ? <div className="flex items-center justify-center py-4">
          <div className="border-gray-300 h-6 w-6 animate-spin rounded-full border-4 border-t-darkbtn" />
        </div> :
          cardData.length > 0 ?(
            <div className="flex flex-nowrap gap-2.5 overflow-x-auto w-full">
              {cardData.map((card, index) => (
                <AdminCard
                  key={index}
                  {...card}
                  onMoreOptions={handleMoreOptions}
                  onHide={handleHideCard}
                />
              ))}
            </div>
          ): (
            <div className = "text-center text-secondary py-8 w-full">
             {t.admin.noDomainSuggestionsAvailable}
            </div>
          )}

        {/* register domain section */}
        <div className="register-domain-section">
          <img
            src={globeIcon}
            alt={t.admin.globeImageAlt}
            title={t.admin.globeImageTitle}
            className="globe-image dark:opacity-5"
          />
          <div className="flex flex-col lg:w-2/3 w-full justify-start">
            <p className="card-admin-title">{t.domain.registerNewDomain}</p>
            <div className="max-w-2xl relative" ref={domainSuggestionRef}>
              <div className="flex sm:flex-row flex-col items-center justify-center gap-3 w-full">
                <input
                  type="text"
                  placeholder={t.domain.searchPlaceholder}
                  className="input-admin w-full disabled:opacity-50 disabled:!cursor-not-allowed"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button
                  className="btn-blue !h-12 sm:!w-14 !w-full disabled:opacity-50 disabled:!cursor-not-allowed"
                  onClick={() => handleSearch(searchTerm)}
                  disabled={!searchTerm.trim()}
                >
                  <TbSearch size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* domain list */}
        <DomainList />
      </div>
    </>
  );
};

export default Dashboard;
