import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDomainSuggestions } from "../../hooks/useDomainSuggestions";
import { TbSearch } from "react-icons/tb";
import {
  NavLink,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router";
import { globeIcon } from "../common/icons";
import { useLanguage } from "../../hooks/useLanguage";

const SearchDomain = ({ children, basePath = "/domain" }) => {
  const [searchParams] = useSearchParams();
  const searchResult = searchParams.get("value") || "";
  const [dropdown, setDropDown] = useState(false);
  const [searchTerm, setSearchTerm] = useState(searchResult || "");
  const location = useLocation();
  const selectedItem = location.state?.item || null;
  const { t } = useLanguage();

  const {
    getSuggestions,
    loading: suggestionsLoading,
    clearSuggestions,
    suggestions,
  } = useDomainSuggestions();

  const limitRef = useRef(5);
  const countRef = useRef(1);
  const domainSuggestionRef = useRef(null);
  const navigate = useNavigate();

  const getDomainSuggestions = useCallback(
    async (extraLimit = 0) => {
      if (searchTerm.length > 2) {
        try {
          setDropDown(true);
          limitRef.current = limitRef.current + extraLimit;
          if (extraLimit) {
            countRef.current += 1;
          }
          await getSuggestions(searchTerm, limitRef.current);
          setDropDown(true);
        } catch (error) {
          console.error("Failed to get suggestions:", error);
        }
      } else {
        clearSuggestions();
        setDropDown(false);
      }
    },
    [searchTerm, getSuggestions, clearSuggestions]
  );

  // Handle suggestions when typing
  useEffect(() => {
    limitRef.current = 5;
    countRef.current = 1;
    clearSuggestions();
    if (!searchTerm.trim() || searchTerm === searchResult) {
      setDropDown(false);
      return;
    }
    let timeoutId;
    if (!selectedItem) {
      timeoutId = setTimeout(getDomainSuggestions, 2000);
    }
    return () => clearTimeout(timeoutId);
  }, [
    searchTerm,
    getSuggestions,
    clearSuggestions,
    getDomainSuggestions,
    searchResult,
    selectedItem,
  ]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        domainSuggestionRef.current &&
        !domainSuggestionRef.current.contains(e.target)
      ) {
        setDropDown(false);
      }
    };

    if (dropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdown]);

  const handleSearch = async (data) => {
    if (
      !data.trim() ||
      data ===
        (searchResult ||
          selectedItem?.websiteName ||
          selectedItem?.domainName ||
          selectedItem?.query ||
          "")
    )
      return;
    navigate(`${basePath}?value=${data}`, { replace: true });
  };

  useEffect(() => {
    if (location.pathname === "/home") {
      searchResult && setSearchTerm(searchResult || "");
      navigate("/home", { replace: true });
    } else {
      setSearchTerm(
        searchResult ||
          selectedItem?.websiteName ||
          selectedItem?.domainName ||
          selectedItem?.query ||
          ""
      );
    }
  }, [searchResult, selectedItem]);

  return (
    <div className="search-section w-full">
      <img
        src={globeIcon}
        alt="globe"
        title="globe"
        className="globe-image dark:opacity-5"
      />

      {/* domain search */}
      <div className="searcharea w-full text-center">
        <h2 className="mb-8">{t.domain.registerNewDomain}</h2>
        <div className="max-w-2xl mx-auto relative">
          <div ref={domainSuggestionRef}>
            <div className="flex sm:flex-row flex-col items-center justify-center gap-3 w-full">
              <input
                type="text"
                placeholder={t.domain.searchPlaceholder}
                className="search-input w-full disabled:opacity-50 disabled:!cursor-not-allowed"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setDropDown(true)}
                disabled={suggestionsLoading}
              />
              <button
                className="btn-blue disabled:opacity-50 disabled:!cursor-not-allowed sm:!w-48 !w-full"
                onClick={() => handleSearch(searchTerm)}
                disabled={!searchTerm?.trim() || suggestionsLoading}
              >
                <TbSearch size={14} />
              </button>
            </div>
            {/* Error message */}
            {/* {suggestionsError && (
              <div className="mt-2 text-red-500 text-sm text-left">
                {suggestionsError}
              </div>
            )} */}
            {(dropdown || suggestionsLoading) &&
              (suggestionsLoading || suggestions.length > 0) && (
                <div className="search-list">
                  <ul className="max-h-72 overflow-y-auto">
                    {suggestions.length > 0 &&
                      suggestions.map((suggestion, index) => (
                        <li key={index}>
                          <NavLink
                            to={`${basePath}?value=${suggestion.domainName}`}
                          >
                            {suggestion.domainName}
                          </NavLink>
                        </li>
                      ))}
                    {suggestionsLoading && (
                      <li className="loading dark:text-white h-12 flex items-center justify-center">
                        <div className="border-gray-300 h-8 w-8 animate-spin rounded-full border-4 border-t-darkbtn" />
                      </li>
                    )}
                  </ul>
                  {suggestions.length >= 5 && !suggestionsLoading && (
                    <div className="flex items-center gap-2.5 px-4 text-sm font-medium mt-2">
                      <p className="text-lightgray-500">
                        {suggestions.length} {t.domain.suggestions}
                      </p>
                      <NavLink
                        to=""
                        className="text-darkbtn hover:text-darkbtn-hover"
                        onClick={() => getDomainSuggestions(5)}
                      >
                        {t.domain.seeMore}
                      </NavLink>
                    </div>
                  )}
                </div>
              )}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
};

export default SearchDomain;
