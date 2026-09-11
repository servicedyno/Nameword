import { TbArrowRight } from "react-icons/tb";
import { google } from "../../components/common/icons";
import { LuLock } from "react-icons/lu";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { useEffect, useState } from "react";
import { useNavigate, Link, NavLink } from "react-router";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { useAuth } from "../../hooks/useAuth";
import ErrorComponent from "../../components/common/ErrorComponent";
import Loader from "../../components/common/Loader";
import { useAlert } from "../../context/AlertContext";
import { useLanguage } from "../../hooks/useLanguage";

// Short sign-up: email + password + Google only (matches the checkout AccountGate
// experience and the product design decision). Backend `registerSimpleRules`
// requires only email + password; username/mobile are optional.
const CreateAccount = () => {
  const { t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, error, clearError } = useAuth();
  const navigate = useNavigate();
  const { showAlert } = useAlert();

  const handleSubmit = async (values, { setSubmitting }) => {
    setLoading(true);
    try {
      const userData = {
        email: values.email.trim(),
        password: values.password,
        passwordConfirmation: values.passwordConfirmation,
      };

      const data = await register(userData);
      showAlert(data?.message, { duration: 2500, type: "success" });
      // Sign-up signs the user in; fall back to OTP only when no session was issued.
      if (data?.token) {
        const path = localStorage.getItem("path");
        navigate(path || "/dashboard", { replace: true });
      } else {
        navigate("/otp-code", { replace: true });
      }
    } catch (error) {
      console.error("Registration failed:", error);
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  useEffect(() => {
    localStorage.removeItem("registerId");
    localStorage.removeItem("email");
    localStorage.removeItem("otpExpireAt");
    if (error) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [error]);

  const handleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_BASE_URL}/auth/google`;
  };

  return (
    <div className="login-section">
      <div className="inner-section">
        <h2 className="heading-title">{t.site.auth.createTitle}</h2>
        <p className="text-15 text-ink-soft dark:text-gray-400">{t.site.auth.createSub}</p>
        <hr className="card-divider my-3" />

        {/* Error message */}
        {error && <ErrorComponent error={error} />}

        <Formik
          initialValues={{ email: "", password: "", passwordConfirmation: "" }}
          validationSchema={Yup.object().shape({
            email: Yup.string()
              .email(t.auth.invalidEmailAddress || "Please enter a valid email address")
              .required(t.auth.emailRequired || "Email is required"),
            password: Yup.string()
              .min(8, t.auth.passwordMinLength || "Password should be at least 8 characters long.")
              .max(64, t.auth.passwordMaxLength || "Password exceeds the maximum length of 64 characters.")
              .required(t.auth.passwordRequired || "Password is required"),
            passwordConfirmation: Yup.string()
              .oneOf([Yup.ref("password")], t.auth.passwordsDoNotMatch || "Passwords do not match.")
              .required(t.auth.confirmPasswordRequired || "Please confirm your password."),
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
              <div className={`relative ${errors.email && touched.email ? "input-error" : ""}`}>
                <Field
                  type="email"
                  name="email"
                  className={`input-field peer ${
                    errors.email && touched.email ? "border-red-500 dark:border-red-400" : ""
                  }`}
                  id="email"
                  value={values.email}
                  onChange={(e) => {
                    handleChange(e);
                    if (error) clearError();
                  }}
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
              <div className={`relative ${errors.password && touched.password ? "input-error" : ""}`}>
                <Field
                  type={showPassword ? "text" : "password"}
                  name="password"
                  className={`input-field peer ${
                    errors.password && touched.password ? "border-red-500 dark:border-red-400" : ""
                  }`}
                  id="password"
                  value={values.password}
                  onChange={(e) => {
                    handleChange(e);
                    if (error) clearError();
                  }}
                  onBlur={handleBlur}
                  disabled={loading}
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

              {/* Confirm Password */}
              <div
                className={`relative ${
                  errors.passwordConfirmation && touched.passwordConfirmation ? "input-error" : ""
                }`}
              >
                <Field
                  type={showConfirmPassword ? "text" : "password"}
                  name="passwordConfirmation"
                  className={`input-field peer ${
                    errors.passwordConfirmation && touched.passwordConfirmation
                      ? "border-red-500 dark:border-red-400"
                      : ""
                  }`}
                  id="passwordConfirmation"
                  value={values.passwordConfirmation}
                  onChange={(e) => {
                    handleChange(e);
                    if (error) clearError();
                  }}
                  onBlur={handleBlur}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-5 top-5 text-primary dark:text-gray-500 cursor-pointer"
                >
                  {showConfirmPassword ? <FiEye size={18} /> : <FiEyeOff size={18} />}
                </button>
                <label
                  htmlFor="passwordConfirmation"
                  className={`absolute left-5 transition-all font-medium ${
                    values.passwordConfirmation
                      ? "top-2 text-xs text-gray-600"
                      : "top-4 text-13 text-primary dark:text-gray-500"
                  } peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}
                >
                  {t.auth.confirmPassword || "Confirm Password *"}
                </label>
                <ErrorMessage
                  name="passwordConfirmation"
                  component="p"
                  className="text-warning pl-5 text-xs font-medium mt-1"
                />
              </div>

              {/* Terms */}
              <div>
                <p className="text-13 text-primary dark:text-gray-500 font-medium mb-0">
                  {t.auth.byClickingButtonBelow || "By clicking button below you agree with our"}
                </p>
                <p className="text-13 text-primary dark:text-gray-500 font-medium">
                  <NavLink
                    to="/terms-and-conditions"
                    className="text-darkbtn dark:text-gray-200 hover:underline"
                  >
                    {t.terms.title || "Terms of Service"}
                  </NavLink>
                  <span className="mx-1">{t.auth.and || "and"}</span>
                  <NavLink
                    to="/privacy-policy"
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
                  !(isValid && dirty) ? "disable cursor-not-allowed" : ""
                }`}
                disabled={loading || isSubmitting || !(isValid && dirty)}
              >
                {t.auth.createAccount || "Create Account"} <TbArrowRight size={18} />
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
          className={`btn-outline max-w-full ${loading ? "disable" : ""}`}
          onClick={handleLogin}
          disabled={loading}
        >
          <img src={google} alt="Google" className="w-5 h-5" />
          {t.auth.continueWithGoogle || "Continue with Google"}
        </button>
        <p
          className="mt-2 flex items-start gap-2 rounded-xl border border-brand/15 bg-brand-50/60 px-3 py-2.5 text-xs text-brand-800 dark:border-brand/20 dark:bg-brand/10 dark:text-brand-200"
          data-testid="auth-privacy-line"
        >
          <LuLock className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {t.site.auth.privacyLine}
        </p>

        {/* Login */}
        <p className="text-13 text-primary dark:text-gray-500 font-medium text-center mt-3">
          {t.auth.alreadyHaveAccount || "Already have an account?"}{" "}
          <Link
            to="/sign-in"
            className="text-darkbtn dark:text-gray-200 hover:underline font-medium"
          >
            {t.auth.signIn || "Sign In"}
          </Link>
        </p>
      </div>
      {loading && <Loader />}
    </div>
  );
};

export default CreateAccount;
