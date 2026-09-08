import { useContext } from "react";
import { ApiKeyContext } from "../context/ApiKeyContext";

export const useApiKeys = () => {
  const context = useContext(ApiKeyContext);

  if (!context) {
    throw new Error("useApiKeys must be used within an ApiKeyProvider");
  }

  return context;
};
