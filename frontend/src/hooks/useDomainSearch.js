import { useState, useCallback } from 'react';
import resellerAPI from '../api/reseller';

// Live domain search powered by the Nomadly reseller API (real availability +
// pricing). Responses are mapped to the shape the domain UI already expects:
//   searchResults: { query, available, registrationFee, renewalfee, registrar }
//   tldSuggestions: [{ websiteName, available, registrationFee, renewalfee, registrar }]
export const useDomainSearch = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchResults, setSearchResults] = useState(null);
  const [tldSuggestions, setTldSuggestions] = useState([]);

  const searchDomain = useCallback(async (domainName) => {
    setLoading(true);
    setError(null);

    try {
      const data = await resellerAPI.searchDomain(domainName);
      // Only surface the "exact match" card when the domain is actually available.
      if (data?.available) {
        const price = Number(data.price_usd) || 0;
        setSearchResults({
          query: data.domain || domainName,
          available: true,
          registrationFee: price,
          renewalfee: price,
          registrar: data.registrar || null,
        });
      } else {
        setSearchResults(null);
      }
      return data;
    } catch (err) {
      setSearchResults(null);
      const errorMessage = err.response?.data?.message || 'Domain search failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getTldSuggestions = useCallback(async (websiteName) => {
    setLoading(true);
    setError(null);

    try {
      const data = await resellerAPI.suggestDomains(websiteName);
      const exact = String(websiteName || '').trim().toLowerCase();
      const list = (data?.suggestions || [])
        .filter((s) => s?.available)
        // Exclude the exact searched domain (already shown as the main result card).
        .filter((s) => String(s.domain || '').toLowerCase() !== exact)
        .map((s) => {
          const price = Number(s.price_usd) || 0;
          return {
            websiteName: s.domain,
            available: true,
            registrationFee: price,
            renewalfee: price,
            registrar: s.registrar || null,
          };
        });
      setTldSuggestions(list);
      setError(null);
      return list;
    } catch (err) {
      setTldSuggestions([]);
      const errorMessage = err.response?.data?.message || 'Domain search failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setSearchResults(null);
    setError(null);
  }, []);

  return {
    searchDomain,
    searchResults,
    loading,
    error,
    clearResults,
    getTldSuggestions,
    tldSuggestions
  };
}; 