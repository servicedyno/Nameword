import { Routes, Route } from "react-router";
import Home from "../pages/Home";

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
import Hosting from "../pages/HostingNomadly";
import VPS from "../pages/VPS";
import RDP from "../pages/RDP";
import Email from "../pages/Email";
import Api from "../pages/Api";
import Pricing from "../pages/Pricing";
import DomainsNomadly from "../pages/DomainsNomadly";
import DnsManagerNomadly from "../pages/DnsManagerNomadly";
import ProtectedRoute from "../hocs/Protected";
import UnprotectedRoute from "../hocs/UnProtected";

/* front admin section */
import Dashboard from "../pages/front-admin/dashboard";
import AccountInfomation from "../pages/front-admin/AccountInfomation";

import PaymentHistory from "../pages/front-admin/billing/PaymentHistory";
import Subscriptions from "../pages/front-admin/billing/Subscriptions";
import Wallet from "../pages/front-admin/billing/Wallet";

import AccountSettings from "../pages/front-admin/UserManagement/AccountSettings";
import HelpSupport from "../pages/front-admin/HelpSupport";
import FrontLayout from "../layouts/FrontLayout";
import TwoFactorLogin from "../pages/auth/TwoFactorLogin";
import { DomainProvider } from "../context/DomainContext";
import HomePage from "../pages/HomePage";
import TermsAndConditions from "../pages/TermsAndConditions";
import PrivacyPolicy from "../pages/PrivacyPolicy";

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

function Router() {
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
      <Route path="/hosting" element={<Hosting />} />
      <Route path="/domains" element={<DomainsNomadly />} />
      <Route path="/dns-manager" element={<DnsManagerNomadly />} />
      <Route path="/vps" element={<VPS />} />
      <Route path="/rdp" element={<RDP />} />
      <Route path="/email" element={<Email />} />
      <Route path="/api" element={<Api />} />
      <Route path="/pricing" element={<Pricing />} />

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
        <Route path="/account-information" element={<AccountInfomation />} />
        <Route path="/payment-history" element={<PaymentHistory />} />
        <Route path="/subscriptions" element={<Subscriptions />} />
        <Route path="/wallet" element={<Wallet />} />
      </Route>
      <Route path="/help-support" element={<HelpSupport />} />
      <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="*" element={<Navigate to={"/"} replace />} />
    </Routes>
  );
}

export default Router;
