/* eslint-disable react-hooks/exhaustive-deps */
import { TbArrowRight } from "react-icons/tb";
import { google, telegram } from "../../components/common/icons";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { useAuth } from "../../hooks/useAuth";
import ErrorComponent from "../../components/common/ErrorComponent";
import TelegramButton from "../../components/common/TelegramButton";
import { NavLink } from "react-router";
import Loader from "../../components/common/Loader";
import { useAlert } from "../../context/AlertContext";
import { useLanguage } from "../../hooks/useLanguage";
import { mergeGuestCartIntoServer } from "../../utils/guestCart";
import { cartAPI } from "../../api/cartApi";

const SignIn = () => {
  const { t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [telegramLoading, setTelegramLoading] = useState(false);

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

  const handleSubmit = async (values, { setSubmitting }) => {
    setLoading(true);
    try {
      const data = await login(values);
      showAlert(data?.message, { duration: 2500, type: "success" });
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  const handleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_BASE_URL}/auth/google`;
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
      try {
        await mergeGuestCartIntoServer(cartAPI);
      } catch (e) {
        console.warn("Merge guest cart failed:", e);
      }
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
    const syncAutofill = () => {
      const emailInput = document.getElementById("email");
      const passwordInput = document.getElementById("password");
      if (emailInput?.value && passwordInput?.value && formikRef.current) {
        formikRef.current.setValues({
          email: emailInput.value,
          password: passwordInput.value,
        });
      }
    };
    const t1 = setTimeout(syncAutofill, 100);
    const t2 = setTimeout(syncAutofill, 350);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (successMessage) {
    return <Loader />;
  }

  return (
    <div className="login-section">
      <div className="inner-section">
        <h2 className="heading-title">{t.auth.signIn || "Sign in"}</h2>
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
            isValid,
            dirty,
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
                  onBlur={handleBlur}
                  disabled={loading || telegramLoading}
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
                  onBlur={handleBlur}
                  disabled={loading || telegramLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-5 text-primary dark:text-gray-500 cursor-pointer"
                >
                  {showPassword ? <FiEye size={18} /> : <FiEyeOff size={18} />}
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
                type="submit"
                className={`add-to-cart max-w-full ${
                  !(isValid && dirty) || telegramLoading || loading
                    ? "disable"
                    : ""
                }`}
                disabled={
                  loading ||
                  isSubmitting ||
                  !(isValid && dirty) ||
                  telegramLoading
                }
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
            loading || telegramLoading ? "disable" : ""
          }`}
          onClick={handleLogin}
          disabled={loading || telegramLoading}
        >
          <img src={google} alt="Google" className="w-5 h-5" />
          {t.auth.continueWithGoogle || "Continue with Google"}
        </button>
        <TelegramButton
          loading={loading}
          setLoading={setTelegramLoading}
          telegramLoading={telegramLoading}
        />
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
