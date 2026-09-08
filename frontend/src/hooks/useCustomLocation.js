import { useLocation } from "react-router";

export const useCustomLocation = () => {
  const location = useLocation();

  return location.state || {};
};
