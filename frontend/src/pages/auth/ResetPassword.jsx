import { TbArrowRight } from "react-icons/tb";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { useEffect, useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import ErrorComponent from "../../components/common/ErrorComponent";
import { useAuth } from "../../hooks/useAuth";
import { NavLink, useNavigate, useParams, useSearchParams } from "react-router";
import * as Yup from "yup";
import PasswordStrengthMeter from "../../components/common/PasswordStrengthMeter";
import Loader from "../../components/common/Loader";
import { useAlert } from "../../context/AlertContext";
import { useLanguage } from "../../hooks/useLanguage";

const ResetPassword = () => {
  const { t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [searchParams] = useSearchParams();

  const navigate = useNavigate();
  const { showAlert } = useAlert();

  // Get token and email from URL params
  const { token } = useParams();
  const email = searchParams.get("email");

  const { error, clearError, resetPassword } = useAuth();

  const handleSubmit = async (values, { setSubmitting }) => {
    setLoading(true);
    try {
      const data = await resetPassword(values);
      showAlert(data?.message, { duration: 2500, type: "success" });
      navigate("/sign-in", { replace: true });
    } catch (error) {
      console.error("reset failed:", error);
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (error) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [error]);

  return (
    <div className="login-section">
      <div className="inner-section">
        <h2 className="heading-title">{t.auth.resetPassword || "Reset Password"}</h2>
        <hr className="card-divider my-3" />
        {error && <ErrorComponent error={error} />}

        {/*----- set new password ----------*/}
        <div className="flex flex-col gap-2.5">
          <p className="text-lg text-primary dark:text-gray-500 font-medium">
            {t.auth.setTheNewPassword || "Set the new Password"}
          </p>
          <Formik
            initialValues={{
              email: email || "",
              token: token || "",
              password: "",
              passwordConfirmation: "",
            }}
            validationSchema={Yup.object().shape({
              // email: Yup.string()
              //   .email(t.auth.invalidEmailAddress || 'Please enter a valid email address')
              //   .required(t.auth.emailRequired || 'Email is required'),
              token: Yup.string()
                .required(t.auth.resetTokenRequired || 'Reset token is required'),
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
            enableReinitialize
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
                {/* New Password */}
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
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-5 text-primary dark:text-gray-500"
                  >
                    {showPassword ? (
                      <FiEye size={18} />
                    ) : (
                      <FiEyeOff size={18} />
                    )}
                  </button>
                  <label
                    htmlFor="password"
                    className={`absolute left-5 transition-all font-medium ${
                      values.password
                        ? "top-2 text-xs text-gray-600"
                        : "top-4 text-13 text-primary dark:text-gray-500"
                    } peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}
                  >
                    {t.auth.newPassword || "New Password *"}
                  </label>
                  <ErrorMessage
                    name="password"
                    component="p"
                    className="text-warning pl-5 text-xs font-medium mt-1"
                  />
                </div>
                {(touched.password || values.password) && (
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
                      errors.passwordConfirmation &&
                      touched.passwordConfirmation
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
                    className="absolute right-5 top-5 text-primary dark:text-gray-500"
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
                    {t.auth.newPasswordAgain || "New Password Again *"}
                  </label>
                  <ErrorMessage
                    name="passwordConfirmation"
                    component="p"
                    className="text-warning pl-5 text-xs font-medium mt-1"
                  />
                </div>

                <button
                  type="submit"
                  className={`add-to-cart max-w-full ${
                    !(isValid && dirty) ? "disable" : ""
                  }`}
                  disabled={loading || isSubmitting || !(isValid && dirty)}
                >
                  {t.admin.confirm || "Confirm"} <TbArrowRight size={18} />
                </button>
              </Form>
            )}
          </Formik>
          <div className="text-center mt-3">
            <NavLink
              to="/sign-in"
              className="text-13 text-darkbtn dark:text-gray-200 hover:underline font-medium"
            >
              {t.auth.backToLogin || "Back to Login"}
            </NavLink>
          </div>
        </div>
      </div>
      {loading && <Loader />}
    </div>
  );
};

export default ResetPassword;
