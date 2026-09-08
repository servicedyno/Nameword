import { Routes, Route } from "react-router";
import Home from "../pages/Home";
import Domain from "../pages/Domain";
import NoDomain from "../pages/NoDomain";
import AddtoCart from "../pages/AddToCart";

import CreateAccount from "../pages/auth/CreateAccount";
import SignIn from "../pages/auth/SignIn";
import ResetPassword from "../pages/auth/ResetPassword";
import OtpCode from "../pages/auth/OtpCode";
import ChangeEmail from "../pages/auth/ChangeEmail";

import UpsellCheckout from "../pages/UpsellCheckout";
import Cart from "../pages/Cart";
import AuthLayout from "../layouts/AuthLayout";
import { Navigate } from "react-router";
import ForgotPassword from "../pages/auth/ForgotPassword";

import PaymentCheckout from "../pages/PaymentCheckout";
import Hosting from "../pages/Hosting";
import ProtectedRoute from "../hocs/Protected";
import UnprotectedRoute from "../hocs/UnProtected";

/* front admin section */
import Dashboard from "../pages/front-admin/dashboard";
import DomainPortfolio from "../pages/front-admin/DomainPortfolio";
import AccountInfomation from "../pages/front-admin/AccountInfomation";

import PaymentHistory from "../pages/front-admin/billing/PaymentHistory";
import Subscriptions from "../pages/front-admin/billing/Subscriptions";
import Wallet from "../pages/front-admin/billing/Wallet";

import Overview from "../pages/front-admin/domain/Overview";
import ContactInfo from "../pages/front-admin/domain/ContactInfo";
import DNSManagement from "../pages/front-admin/domain/DNSManagement";
import TransferDomain from "../pages/front-admin/domain/TransferDomain";

import Websites from "../pages/front-admin/websites/Websites";
import WebsitesOverview from "../pages/front-admin/websites/WebsitesOverview";
import ManagePlan from "../pages/front-admin/websites/ManagePlan";
import UpgradePlan from "../pages/front-admin/websites/UpgradePlan";
import RenewPlan from "../pages/front-admin/websites/RenewPlan";
import SetupWebsite from "../pages/front-admin/websites/SetupWebsite";

import AccountSettings from "../pages/front-admin/UserManagement/AccountSettings";
import HelpSupport from "../pages/front-admin/HelpSupport";
import FrontLayout from "../layouts/FrontLayout";
import TwoFactorLogin from "../pages/auth/TwoFactorLogin";
import { DomainProvider } from "../context/DomainContext";
import HomePage from "../pages/HomePage";
import TermsAndConditions from "../pages/TermsAndConditions";
import PrivacyPolicy from "../pages/PrivacyPolicy";

function Router() {
  const IsEmailVerified = ({ children }) => {
    const email = localStorage.getItem("email");
    if (!email) {
      return <Navigate to="/sign-in" replace />;
    }
    return children;
  };

  const IsQrCode = ({ children }) => {
    const qrCode = localStorage.getItem("qrCode");
    if (!qrCode) {
      return <Navigate to="/sign-in" replace />;
    }
    return children;
  };

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route
        element={
          <UnprotectedRoute>
            <AuthLayout />
          </UnprotectedRoute>
        }
      >
        <Route path="/create-account" element={<CreateAccount />} />
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/password-reset/:token" element={<ResetPassword />} />
        <Route
          path="/otp-code"
          element={
            <IsEmailVerified>
              <OtpCode />
            </IsEmailVerified>
          }
        />
        <Route
          path="/2fa/verify"
          element={
            <IsQrCode>
              <TwoFactorLogin />
            </IsQrCode>
          }
        />
        <Route path="/change-email" element={<ChangeEmail />} />
      </Route>

      <Route path="/home" element={<Home />} />
      <Route path="/domain" element={<Domain />} />
      {/* <Route path="/no-domain" element={<NoDomain />} /> */}
      {/* <Route path="/add-to-cart" element={<AddtoCart />} /> */}
      <Route path="/hosting" element={<Hosting />} />

   
      <Route element={<AuthLayout />}>
        <Route path="/cart" element={<Cart />} />
        <Route path="/upsell-checkout" element={<UpsellCheckout />} />
      </Route>

      <Route
        element={
          <ProtectedRoute>
            <AuthLayout />{" "}
          </ProtectedRoute>
        }
      >
        <Route path="/payment-checkout" element={<PaymentCheckout />} />
      </Route>

      <Route
        element={
          <ProtectedRoute>
            <DomainProvider>
              <FrontLayout />
            </DomainProvider>
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/account-setting" element={<AccountSettings />} />
        <Route path="/domain-overview/:domainName" element={<Overview />} />
        <Route path="/domain-portfolio" element={<DomainPortfolio />} />
        <Route path="/account-information" element={<AccountInfomation />} />
        <Route path="/payment-history" element={<PaymentHistory />} />
        <Route path="/subscriptions" element={<Subscriptions />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/contact-info" element={<ContactInfo />} />
        <Route path="/dns-management" element={<DNSManagement />} />
        <Route path="/transfer-domain" element={<TransferDomain />} />
        <Route path="/websites" element={<Websites />} />
        <Route path="/websites-overview" element={<WebsitesOverview />} />
        <Route path="/manage-plan" element={<ManagePlan />} />
        <Route path="/upgrade-plan" element={<UpgradePlan />} />
        <Route path="/renew-plan" element={<RenewPlan />} />
        <Route path="/setup-websites" element={<SetupWebsite />} />
      </Route>
      <Route path="/help-support" element={<HelpSupport />} />
      <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="*" element={<Navigate to={"/"} replace />} />
    </Routes>
  );
}

export default Router;
