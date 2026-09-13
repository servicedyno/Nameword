import { useAuth } from "../../hooks/useAuth";
import Navbar from "./Navbar";
import Footer from "./Footer";
import FrontLayout from "../../layouts/FrontLayout";
import { DomainProvider } from "../../context/DomainContext";

// Marketing/product pages (Domains, DNS, Hosting, VPS, RDP, Pricing, API) render
// in the storefront frame when signed OUT, and inside the app shell (persistent
// left sidebar + app top bar) when signed IN — so the sidebar never disappears
// for logged-in users. Signed-out visitors see the unchanged marketing layout.
const ProductShell = ({ children }) => {
  const { user } = useAuth();

  if (user) {
    return (
      <DomainProvider>
        <FrontLayout fluid>{children}</FrontLayout>
      </DomainProvider>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-950 min-h-screen flex flex-col text-primary dark:text-gray-100">
      <Navbar />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
};

export default ProductShell;
