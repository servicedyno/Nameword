import SearchDomainCard from "../components/domain/search-domain-card";
import MainLayout from "../layouts/MainLayout";
import { useNavigate, useSearchParams } from "react-router";
import { useCallback, useEffect, useState } from "react";
import { useDomainSearch } from "../hooks/useDomainSearch";
import SearchDomain from "../components/domain/search-domain";
import FindOptions from "../components/domain/find-more-options";
import ContactInfo from "../components/domain/contact-info";
import Loader from "../components/common/Loader";
import { useAuth } from "../hooks/useAuth";
import BottomCartView from "../components/domain/bottom-cart-view";

const Domain = () => {
  const [searchParams] = useSearchParams();
  const [domainName, setDomainName] = useState("");
  const [loading, setLoading] = useState(true);
  const [domainLoading, setDomainLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    searchDomain,
    searchResults,
    getTldSuggestions,
    tldSuggestions,
  } = useDomainSearch();

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
    const domain = searchParams.get("value") || "";
    if(!domain.trim()){
      navigate("/home", { replace: true});
      return ;
    }
  }, [searchParams, navigate])

  useEffect(() => {
    const domain = searchParams.get("value") || "";
    if (domain !== domainName && domain.trim()) {
      setDomainName(domain);
      handleDomainSearch(domain);
      handleTldSuggestions(domain);
    }
  }, [searchParams, handleDomainSearch, domainName, handleTldSuggestions]);

   useEffect(() => {
      if (user) {
        localStorage.removeItem("path");
      }
    }, [user]);

  return (
    <MainLayout>
      <SearchDomain>
        {(!loading && !domainLoading || tldSuggestions?.length > 0)&&
            <SearchDomainCard
              searchResults={searchResults}
              tldSuggestions={tldSuggestions[0]}
            />
         }
      </SearchDomain>
      <FindOptions tldSuggestions={tldSuggestions} />
      <BottomCartView />
      {/* contact info */}
      <ContactInfo />
      {(loading || domainLoading) && <Loader />}
    </MainLayout>
  );
};

export default Domain;
