import { useContext } from "react";
import { DomainContext } from "../context/DomainContext";

export const useDomain = () => {
  const context = useContext(DomainContext);

  if (!context) {
    throw new Error("useDomain must be used within an DomainProvider");
  }

  return context;
};
