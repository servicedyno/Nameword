import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import SearchDomainCard from "../components/domain/search-domain-card";
import FindMoreOptions from "../components/domain/find-more-options";
import BottomCartView from "../components/domain/bottom-cart-view";
import { useLocation } from "react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { useDomainSearch } from "../hooks/useDomainSearch";
import Loader from "../components/common/Loader";
import SearchDomain from "../components/domain/search-domain";

const AddtoCart = () => {
  const location = useLocation();
  const selectedItem = location.state?.item || null;

  const [searchParams] = useSearchParams();
  const fallbackQuery = searchParams.get("value") || "";
  const domainToSearch = useMemo(() => {
    return (
      selectedItem?.websiteName ||
      selectedItem?.domainName ||
      selectedItem?.query ||
      fallbackQuery ||
      ""
    );
  }, [selectedItem, fallbackQuery]);

  const { searchDomain, getTldSuggestions, searchResults, tldSuggestions } =
    useDomainSearch();
  const [loading, setLoading] = useState(false);
  const [domainLoading, setDomainLoading] = useState(false);

  const handleDomainSearch = useCallback(
    async (domain) => {
      if (!domain) return;
      setLoading(true);
      try {
        await searchDomain(domain);
      } catch (error) {
        console.error("Domain search failed:", error);
      } finally {
        setLoading(false);
      }
    },
    [searchDomain]
  );

  const handleTldSuggestions = useCallback(
    async (domain) => {
      if (!domain) return;
      try {
        setDomainLoading(true);
        await getTldSuggestions(domain);
      } catch (error) {
        console.error("TLD suggestions failed:", error);
      } finally {
        setDomainLoading(false);
      }
    },
    [getTldSuggestions]
  );

  useEffect(() => {
    if (!fallbackQuery?.trim()) {
      handleTldSuggestions(domainToSearch);
      return;
    };
    handleDomainSearch(domainToSearch);
    handleTldSuggestions(domainToSearch);
  }, [domainToSearch, fallbackQuery, handleDomainSearch, handleTldSuggestions]);

  return (
    <div>
      <Navbar />
      <div className="px-5 mb-10">
        <SearchDomain basePath="/add-to-cart">
          {!loading && !domainLoading && (
            <SearchDomainCard
              searchResults={
                searchResults
                  ? { ...searchResults, query: domainToSearch }
                  : { ...selectedItem || {}, query: domainToSearch }
              }
              tldSuggestions={
                tldSuggestions && tldSuggestions.length > 0
                  ? tldSuggestions?.find((t) => t.websiteName !== domainToSearch)
                  : null
              }
            />
          )}
        </SearchDomain>

        {/* Find more options */}
        <FindMoreOptions tldSuggestions={tldSuggestions.filter((t) => t.websiteName !== domainToSearch)} />

        <BottomCartView />
        {(loading || domainLoading) && <Loader />}
      </div>
      <Footer />
    </div>
  );
};

export default AddtoCart;
