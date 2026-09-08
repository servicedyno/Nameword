import { TbArrowRight } from "react-icons/tb";
import { google, telegram } from "../../components/common/icons";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { parsePhoneNumberFromString } from 'libphonenumber-js';

import PasswordStrengthMeter from "../../components/common/PasswordStrengthMeter";
import ErrorComponent from "../../components/common/ErrorComponent";
import { useAuth } from "../../hooks/useAuth";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import TelegramButton from "../../components/common/TelegramButton";
import { NavLink } from "react-router";
import Loader from "../../components/common/Loader";
import { useAlert } from "../../context/AlertContext";
import { useLanguage } from "../../hooks/useLanguage";

const CreateAccount = () => {
  const { t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isMobileFocused, setIsMobileFocused] = useState(true);
  const [telegramLoading, setTelegramLoading] = useState(false);

  const { register, error, clearError } = useAuth();
  const navigate = useNavigate();
  const { showAlert } = useAlert();

  const handleSubmit = async (values, { setSubmitting }) => {
    setLoading(true);
    try {
      const userData = {
        name: values.name,
        username: values.username,
        email: values.email,
        mobile: "+" + values.mobile,
        password: values.password,
        passwordConfirmation: values.passwordConfirmation,
      };

      const data = await register(userData);
      // Redirect to home page after successful registration
      showAlert(data?.message, { duration: 2500, type: "success" });
      navigate("/otp-code", { replace: true });
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
        <h2 className="heading-title">{t.auth.createAccount || "Create Account"}</h2>
        <hr className="card-divider my-3" />

        {/* Error message */}
        {error && <ErrorComponent error={error} />}

        <Formik
          initialValues={{
            name: "",
            username: "",
            email: "",
            mobile: "91",
            password: "",
            passwordConfirmation: "",
            phoneCountryCode: "",
          }}
          validationSchema={Yup.object().shape({
            name: Yup.string().trim().required(t.auth.nameRequired || 'Name is required'),
            username: Yup.string().trim().required(t.auth.usernameRequired || 'Username is required'),
            mobile: Yup.string()
              .trim()
              .required(t.auth.mobileFieldRequired || 'Mobile field is required.').test('is-valid', t.auth.enterValidPhoneNumber || 'Enter a valid phone number', function (value) {
                const { phoneCountryCode } = this.parent;
                const phoneNumber = parsePhoneNumberFromString(`+${value || ''}`, phoneCountryCode?.toUpperCase() || 'US');
                return phoneNumber?.isValid() || false;
              }),
            email: Yup.string().email(t.auth.invalidEmailAddress || 'Please enter a valid email address').required(t.auth.emailRequired || 'Email is required'),
            password: Yup.string()
              .min(8, t.auth.passwordMinLength || 'Password must contain at least 8 characters')
              .matches(/[!@#$%^&*(),.?":{}|<>]/, t.auth.passwordSpecialChar || 'Password must include at least one special symbol')
              .matches(/[a-z]/, t.auth.passwordLowercase || 'Password must include a lowercase letter')
              .matches(/[A-Z]/, t.auth.passwordUppercase || 'Password must include an uppercase letter')
              .matches(/[0-9]/, t.auth.passwordNumber || 'Password must include at least one number')
              .required(t.auth.passwordRequired || 'Password is required'),
            passwordConfirmation: Yup.string()
              .oneOf([Yup.ref('password'), null], t.auth.passwordsMustMatch || 'Passwords must match')
              .required(t.auth.confirmPasswordRequired || 'Please confirm your password'),
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
            setFieldValue,
            setFieldTouched,
            validateField,
          }) => (
            <Form className="gap-2.5 flex flex-col w-full">
              {/* Name */}
              <div
                className={`relative ${
                  errors.name && touched.name ? "input-error" : ""
                }`}
              >
                <Field
                  type="text"
                  name="name"
                  className={`input-field peer ${
                    errors.name && touched.name
                      ? "border-red-500 dark:border-red-400"
                      : ""
                  }`}
                  id="name"
                  value={values.name}
                  onChange={(e) => {
                    // handleChange(e);
                    if (error) clearError();
                    const filteredValue = e.target.value.replace(/[^A-Za-z\s]/g, '');
                    setFieldValue('name', filteredValue);
                  }}
                  onBlur={handleBlur}
                  disabled={loading || telegramLoading}
                />
                <label
                  htmlFor="name"
                  className={`absolute left-5 transition-all font-medium ${
                    values.name
                      ? "top-2 text-xs text-gray-600"
                      : "top-4 text-13 text-primary dark:text-gray-500 "
                  } peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}
                >
                  {t.auth.name || "Name *"}
                </label>
                <ErrorMessage
                  name="name"
                  component="p"
                  className="text-warning pl-5 text-xs font-medium mt-1"
                />
              </div>
              {/* username */}
              <div
                className={`relative ${
                  errors.username && touched.username ? "input-error" : ""
                }`}
              >
                <Field
                  type="text"
                  name="username"
                  className={`input-field peer ${
                    errors.username && touched.username
                      ? "border-red-500 dark:border-red-400"
                      : ""
                  }`}
                  id="username"
                  value={values.username}
                  onChange={(e) => {
                    handleChange(e);
                    if (error) clearError();
                  }}
                  onBlur={handleBlur}
                  disabled={loading || telegramLoading}
                />
                <label
                  htmlFor="username"
                  className={`absolute left-5 transition-all font-medium ${
                    values.username
                      ? "top-2 text-xs text-gray-600"
                      : "top-4 text-13 text-primary dark:text-gray-500 "
                  } peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}
                >
                  {t.auth.username || "Username *"}
                </label>
                <ErrorMessage
                  name="username"
                  component="p"
                  className="text-warning pl-5 text-xs font-medium mt-1"
                />
              </div>

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

              {/* mobile */}
              <div
                className={`relative react-tel-flag ${
                  errors.mobile && touched.mobile ? "input-error" : ""
                }`}
              >
                <PhoneInput
                  country={"in"}
                  // containerClass={`input-field peer ${errors.mobile && touched.mobile ? 'border-red-500 dark:border-red-400' : ''}`}
                  value={values.mobile}
                  onChange={(value, data) => {
                    setFieldValue("mobile", value);
                    setFieldValue("phoneCountryCode", data.countryCode);
                    if (error) clearError();
                    setTimeout(() => {
                      setFieldTouched("mobile", true);
                      validateField("mobile");
                    }, 0);
                  }}
                  specialLabel=""
                  placeholder=""
                  inputProps={{
                    name: "mobile",
                    className: `input-field mobile-number peer ${
                      errors.mobile && touched.mobile
                        ? "border-red-500 dark:border-red-400"
                        : ""
                    }`,
                    onFocus: () => setIsMobileFocused(true),
                    onBlur: () => {
                      setIsMobileFocused(false);
                      setFieldTouched("mobile", true); // ✅ manually mark as touched
                    },
                  }}
                  enableSearch={true}
                  searchPlaceholder={t.auth.searchCountries || "Search countries..."}
                  searchNotFound={t.auth.noCountryFound || "No country found"}                     
                />
                <label
                  htmlFor="mobile"
                  className={`absolute left-12 transition-all font-medium ${
                    values.mobile || isMobileFocused
                      ? "top-2 text-xs text-gray-600"
                      : "top-4 text-13 text-primary dark:text-gray-500 "
                  } peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}
                  onClick={() => setIsMobileFocused(true)}
                >
                  {t.auth.mobileNumber || "Mobile number *"}
                </label>
                {errors.mobile && touched.mobile && (
                  <p className="text-warning pl-5 text-xs font-medium mt-1">
                    {errors.mobile}
                  </p>
                )}
              </div>

              {/* password */}
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
              {(values.password) && (
                <PasswordStrengthMeter password={values.password} />
              )}

              {/* Confirm Password */}
              <div
                className={`relative ${
                  errors.passwordConfirmation && touched.passwordConfirmation
                    ? "input-error"
                    : ""
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
                  disabled={loading || telegramLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-5 top-5 text-primary dark:text-gray-500 cursor-pointer"
                >
                  {showConfirmPassword ? (
                    <FiEye size={18} />
                  ) : (
                    <FiEyeOff size={18} />
                  )}
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
                  !(isValid && dirty) || telegramLoading
                    ? "disable cursor-not-allowed"
                    : ""
                }`}
                disabled={
                  loading ||
                  isSubmitting ||
                  telegramLoading ||
                  !(isValid && dirty)
                }
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
