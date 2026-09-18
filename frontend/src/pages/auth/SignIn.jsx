/* eslint-disable react-hooks/exhaustive-deps */
import { TbArrowRight } from "react-icons/tb";
import { google } from "../../components/common/icons";
import { LuLock } from "react-icons/lu";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { useAuth } from "../../hooks/useAuth";
import ErrorComponent from "../../components/common/ErrorComponent";
import { NavLink } from "react-router";
import Loader from "../../components/common/Loader";
import { useAlert } from "../../context/AlertContext";
import { useLanguage } from "../../hooks/useLanguage";
import { getStoredRef } from "../../utils/referral";

const SignIn = () => {
  const { t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const firstRender = useRef(false);
  const resetPasswordSuccessMessage = useRef(false);
  const formikRef = useRef(null);
  const {
    login,
    error,
    clearError,
    resetPasswordSuccess,
    setResetPasswordSuccess,
    checkAuth,
    setError,
  } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const successMessage = searchParams.get("success");
  const errorMessage = searchParams.get("error");
  const { showAlert } = useAlert();

  // Autofill-proof submit: browser autofill (and some IME/paste paths) do not
  // reliably fire React/Formik onChange, which previously left Formik "empty",
  // kept the Login button disabled, and made clicking it do nothing. We resolve
  // email/password from the live DOM first, fall back to Formik state, keep
  // Formik in sync for inline UI, then authenticate directly.
  const attemptLogin = async () => {
    if (loading) return;
    const emailEl = document.getElementById("email");
    const passwordEl = document.getElementById("password");
    const values = formikRef.current?.values || {};
    const email = String(emailEl?.value || values.email || "").trim();
    const password = String(passwordEl?.value || values.password || "");

    formikRef.current?.setValues({ email, password });
    formikRef.current?.setTouched({ email: true, password: true }, false);

    if (!email || !password) return;

    setLoading(true);
    try {
      const data = await login({ email, password });
      showAlert(data?.message, { duration: 2500, type: "success" });
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (_values, { setSubmitting }) => {
    setSubmitting(false);
    attemptLogin();
  };

  const onFieldKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      attemptLogin();
    }
  };

  const handleLogin = () => {
    const ref = getStoredRef();
    const base = `${import.meta.env.VITE_API_BASE_URL}/auth/google`;
    window.location.href = ref ? `${base}?ref=${encodeURIComponent(ref)}` : base;
  };

  useEffect(() => {
    localStorage.removeItem("email");
    localStorage.removeItem("otpExpireAt");
    localStorage.removeItem("qrCode");
    if (error) {
      resetPasswordSuccessMessage.current = false;
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [error]);

  useEffect(() => {
    if (!firstRender.current) {
      resetPasswordSuccessMessage.current = resetPasswordSuccess;
      firstRender.current = true;
      setResetPasswordSuccess(false);
    }
  }, [resetPasswordSuccess, setResetPasswordSuccess]);

  const handleManageLogin = useCallback(async () => {
    if (successMessage && !loading) {
      showAlert(successMessage, { duration: 2500, type: "success" });
      await checkAuth();
      const path = localStorage.getItem("path");
      navigate(path || "/", { replace: true });
    } else if (errorMessage) {
      setError(errorMessage);
      navigate("/sign-in", { replace: true });
    }
  }, [successMessage, errorMessage]);

  useEffect(() => {
    handleManageLogin();
  }, [successMessage, errorMessage, handleManageLogin]);


  useEffect(() => {
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const syncAutofill = () => {
      if (!formikRef.current) return;
      const e = emailInput?.value || "";
      const p = passwordInput?.value || "";
      const cur = formikRef.current.values || {};
      if ((e && e !== cur.email) || (p && p !== cur.password)) {
        formikRef.current.setValues({
          email: e || cur.email || "",
          password: p || cur.password || "",
        });
      }
    };
    emailInput?.addEventListener("input", syncAutofill);
    passwordInput?.addEventListener("input", syncAutofill);
    emailInput?.addEventListener("change", syncAutofill);
    passwordInput?.addEventListener("change", syncAutofill);
    // Browsers can autofill at various times; poll briefly after mount too.
    const timers = [100, 350, 700, 1200, 2000].map((d) => setTimeout(syncAutofill, d));
    return () => {
      emailInput?.removeEventListener("input", syncAutofill);
      passwordInput?.removeEventListener("input", syncAutofill);
      emailInput?.removeEventListener("change", syncAutofill);
      passwordInput?.removeEventListener("change", syncAutofill);
      timers.forEach(clearTimeout);
    };
  }, []);

  if (successMessage) {
    return <Loader />;
  }

  return (
    <div className="login-section">
      <div className="inner-section">
        <h2 className="heading-title">{t.site.auth.signInTitle}</h2>
        <p className="text-15 text-ink-soft dark:text-gray-400">{t.site.auth.signInSub}</p>
        <hr className="card-divider my-3" />

        {/* --- success msg --- */}
        {resetPasswordSuccessMessage.current && (
          <div className="sucess-card flex flex-col">
            <p className="text-base text-primary dark:text-gray-500 font-medium">
              {t.auth.youSetNewPassword || "You set the new Password!"}
            </p>
            <p className="text-13 text-primary dark:text-gray-500 font-medium">
              {t.auth.pleaseLoginWithNewPassword || "Please login with your new password."}
            </p>
          </div>
        )}

        {/* Error message */}
        {error && <ErrorComponent error={error} />}

        <Formik
          innerRef={formikRef}
          initialValues={{ email: "", password: "" }}
          validationSchema={Yup.object().shape({
            email: Yup.string()
              .email(t.auth.invalidEmailAddress || 'Please enter a valid email address')
              .required(t.auth.emailRequired || 'Email is required'),
            password: Yup.string()
              .required(t.auth.passwordRequired || 'Password is required'),
          })}
          onSubmit={handleSubmit}
        >
          {({
            values,
            errors,
            touched,
            handleChange,
            handleBlur,
            isSubmitting,
          }) => (
            <Form className="gap-2.5 flex flex-col w-full">
              {/* Email */}
              <div
                className={`relative ${
                  errors.email && touched.email ? "input-error" : ""
                }`}
              >
                <Field
                  type="email"
                  name="email"
                  className={`input-field peer ${
                    errors.email && touched.email
                      ? "border-red-500 dark:border-red-400"
                      : ""
                  }`}
                  id="email"
                  value={values.email}
                  onChange={(e) => {
                    handleChange(e);
                    if (error) clearError();
                  }}
                  onKeyDown={onFieldKeyDown}
                  onBlur={handleBlur}
                  disabled={loading}
                />
                <label
                  htmlFor="email"
                  className={`absolute left-5 transition-all font-medium ${
                    values.email
                      ? "top-2 text-xs text-gray-600"
                      : "top-4 text-13 text-primary dark:text-gray-500 "
                  } peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}
                >
                  {t.auth.emailAddress || "Email Address *"}
                </label>
                <ErrorMessage
                  name="email"
                  component="p"
                  className="text-warning pl-5 text-xs font-medium mt-1"
                />
              </div>

              {/* Password */}
              <div
                className={`relative ${
                  errors.password && touched.password ? "input-error" : ""
                }`}
              >
                <Field
                  type={showPassword ? "text" : "password"}
                  name="password"
                  className={`input-field peer ${
                    errors.password && touched.password
                      ? "border-red-500 dark:border-red-400"
                      : ""
                  }`}
                  id="password"
                  value={values.password}
                  onChange={(e) => {
                    handleChange(e);
                    if (error) clearError();
                  }}
                  onKeyDown={onFieldKeyDown}
                  onBlur={handleBlur}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  data-testid="signin-password-toggle"
                  className="absolute right-5 top-5 text-primary dark:text-gray-500 cursor-pointer"
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
                <label
                  htmlFor="password"
                  className={`absolute left-5 transition-all font-medium ${
                    values.password
                      ? "top-2 text-xs text-gray-600"
                      : "top-4 text-13 text-primary dark:text-gray-500"
                  } peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}
                >
                  {t.auth.password || "Password *"}
                </label>
                <ErrorMessage
                  name="password"
                  component="p"
                  className="text-warning pl-5 text-xs font-medium mt-1"
                />
              </div>

              <div className="text-right">
                <Link
                  to="/forgot-password"
                  className="text-darkbtn dark:text-gray-200 hover:underline text-13 font-medium"
                >
                  {t.auth.forgotPassword || "Forgot Password?"}
                </Link>
              </div>

              {/* Terms */}
              <div>
                <p className="text-13 text-primary dark:text-gray-500 font-medium mb-0">
                  {t.auth.byClickingButtonBelow || "By clicking button below you agree with our"}
                </p>
                <p className="text-13 text-primary dark:text-gray-500 font-medium">
                  <NavLink
                    to={"/terms-and-conditions"}
                    className="text-darkbtn dark:text-gray-200 hover:underline"
                  >
                    {t.terms.title || "Terms of Service"}
                  </NavLink>
                  <span className="mx-1">{t.auth.and || "and"}</span>
                  <NavLink
                    to={"/privacy-policy"}
                    className="text-darkbtn dark:text-gray-200 hover:underline"
                  >
                    {t.privacy.title || "Privacy Policy"}
                  </NavLink>
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                onClick={attemptLogin}
                className={`add-to-cart max-w-full ${loading ? "disable" : ""}`}
                disabled={loading || isSubmitting}
              >
                {t.auth.login || "Login"} <TbArrowRight size={18} />
              </button>
            </Form>
          )}
        </Formik>

        {/* Divider */}
        <div className="flex items-center my-2">
          <span className="mx-auto text-sm text-secondary">{t.auth.or || "or"}</span>
        </div>

        {/* Social Buttons */}
        <button
          className={`btn-outline max-w-full ${
            loading ? "disable" : ""
          }`}
          onClick={handleLogin}
          disabled={loading}
        >
          <img src={google} alt="Google" className="w-5 h-5" />
          {t.auth.continueWithGoogle || "Continue with Google"}
        </button>
        <p className="mt-2 flex items-start gap-2 rounded-xl border border-brand/15 bg-brand-50/60 px-3 py-2.5 text-xs text-brand-800 dark:border-brand/20 dark:bg-brand/10 dark:text-brand-200" data-testid="auth-privacy-line">
          <LuLock className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {t.site.auth.privacyLine}
        </p>
        {/* Login */}
        <p className="text-13 text-primary dark:text-gray-500 font-medium text-center mt-3">
          {t.auth.dontHaveAccount || "Don't have an account?"}{" "}
          <Link
            to="/create-account"
            className="text-darkbtn dark:text-gray-200 hover:underline font-medium"
          >
            {t.auth.create || "Create"}
          </Link>
        </p>
      </div>
      {loading && <Loader />}
    </div>
  );
};

export default SignIn;
