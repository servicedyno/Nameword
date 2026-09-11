import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "./useAuth";
import { walletAPI } from "../api/walletApi";
import resellerAPI from "../api/reseller";

// Shared buyer context for the public product pages: provider mode, the signed-in
// user's IN-APP wallet balance (never the reseller's), and a login gate for CTAs.
export function useBuyer() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState(null);
  const [balance, setBalance] = useState(null);

  const refresh = useCallback(async () => {
    const [h, w] = await Promise.allSettled([
      resellerAPI.getHealth(),
      isAuthenticated ? walletAPI.getWallet() : Promise.reject(),
    ]);
    if (h.status === "fulfilled") setMode(h.value?.mode || null);
    if (w.status === "fulfilled") {
      const b = w.value?.data?.balance;
      setBalance(Number(b?.USD ?? b?.default ?? 0));
    } else {
      setBalance(null);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Returns true when the caller may proceed; otherwise stores the return path and
  // sends the visitor to sign in.
  const requireLogin = useCallback(
    (returnPath) => {
      if (isAuthenticated) return true;
      localStorage.setItem("path", returnPath || window.location.pathname + window.location.search);
      navigate("/sign-in");
      return false;
    },
    [isAuthenticated, navigate]
  );

  return { isAuthenticated, mode, balance, refresh, requireLogin };
}
