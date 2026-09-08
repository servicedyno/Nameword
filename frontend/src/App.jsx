import Router from "./routes/Router";
import { AuthProvider } from "./context/AuthContext";
import { validateEnvironment } from "./config/api";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { useEffect } from "react";
import { useLocation } from "react-router";
import { ApiKeyProvider } from "./context/ApiKeyContext";
import { AlertProvider } from "./context/AlertContext";
import { LanguageProvider } from "./context/LanguageContext";

validateEnvironment();   

function App() {                          
  const { pathname } = useLocation();                                                                                                                      

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname]);

  return (
    <LanguageProvider>
      <ErrorBoundary>
        <AlertProvider>
          <AuthProvider>
            <ApiKeyProvider>
              <Router />
            </ApiKeyProvider>
          </AuthProvider>
        </AlertProvider>
      </ErrorBoundary>
    </LanguageProvider>
  );
}

export default App;
