import Router from "./routes/Router";
import { AuthProvider } from "./context/AuthContext";
import { validateEnvironment } from "./config/api";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { useEffect } from "react";
import { useLocation } from "react-router";
import { ApiKeyProvider } from "./context/ApiKeyContext";
import { AlertProvider } from "./context/AlertContext";
import { LanguageProvider } from "./context/LanguageContext";
import { CartUIProvider } from "./context/CartUIContext";
import MiniCartDrawer from "./components/cart/MiniCartDrawer";
import { captureRefFromUrl } from "./utils/referral";

validateEnvironment();

function App() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    // Remember any inbound referral code (?ref=CODE) for sign-up attribution.
    captureRefFromUrl();
  }, [pathname]);

  return (
    <LanguageProvider>
      <ErrorBoundary>
        <AlertProvider>
          <AuthProvider>
            <ApiKeyProvider>
              <CartUIProvider>
                <Router />
                <MiniCartDrawer />
              </CartUIProvider>
            </ApiKeyProvider>
          </AuthProvider>
        </AlertProvider>
      </ErrorBoundary>
    </LanguageProvider>
  );
}

export default App;
