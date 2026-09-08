import React from 'react';
import { useLocation } from 'react-router';

export const useQueryParams = () => {
  const { search } = useLocation();

  return React.useMemo(() => {
    const params = new URLSearchParams(search);
    const queryObject = {};
    for (const [key, value] of params.entries()) {
      queryObject[key] = value;
    }
    return queryObject;
  }, [search]);
};
