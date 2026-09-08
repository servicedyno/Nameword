import { useState, useCallback } from 'react';
import { domainAPI } from '../api/domains';

export const useDomainSearch = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchResults, setSearchResults] = useState(null);
  // const [provider, setProvider] = useState(null);
  const [tldSuggestions, setTldSuggestions] = useState([]);


  const searchDomain = useCallback(async (domainName, feePercentages = {}) => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        websiteName: domainName,
        renewalFeePerc: feePercentages.renewal || 50,
        transferFeePerc: feePercentages.transfer || 50,
        registrationFeePerc: feePercentages.registration || 50,
      };

      const result = await domainAPI.searchDomain(params);
      setSearchResults(result?.responseData || null);
      // setProvider(result?.provider || null);
      return result;
    } catch (err) {
      setSearchResults(null);
      // setProvider(null);
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
      const params = { websiteName };
      const result = await domainAPI.getTldSuggestions(params);
      setTldSuggestions(result?.responseData?.filter((item) => item?.available) || []);
      setError(null);
      return result;
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