import { useSearchParams } from 'react-router';

export const useSearchMessages = (paramKeys = { success: 'success', error: 'error' }) => {
  const [searchParams] = useSearchParams();

  const successMessage = searchParams.get(paramKeys.success);
  const errorMessage = searchParams.get(paramKeys.error);

  return {
    successMessage,
    errorMessage,
    hasSuccess: Boolean(successMessage),
    hasError: Boolean(errorMessage),
    getMessage: (key) => searchParams.get(key),
    getAllParams: () => Object.fromEntries(searchParams.entries())
  };
};