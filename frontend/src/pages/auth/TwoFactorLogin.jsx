/* eslint-disable react-hooks/exhaustive-deps */
import { useState } from "react";
import { NavLink, useNavigate } from "react-router";
import { Formik, Form, Field, ErrorMessage } from "formik";
import { TbArrowRight } from "react-icons/tb";
import Loader from "../../components/common/Loader";
import ErrorComponent from "../../components/common/ErrorComponent";
import { useAuth } from "../../hooks/useAuth";
import QRCodeDisplay from "../../components/common/QRCodeDisplay";
import * as Yup from "yup";
import { useAlert } from "../../context/AlertContext";
import { useLanguage } from "../../hooks/useLanguage";
import { mergeGuestCartIntoServer } from "../../utils/guestCart";
import { cartAPI } from "../../api/cartApi";

const TwoFactorLogin = () => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const { verify2FA, error, clearError } = useAuth();
  const navigate = useNavigate();
  const { showAlert } = useAlert();

  const handleSubmit = async (values, { setSubmitting }) => {
    setLoading(true);
    try {
      clearError();
      const res = await verify2FA(values);
      showAlert(res?.message || "Login successful!", {
        duration: 2500,
        type: "success",
      });
      try {
        await mergeGuestCartIntoServer(cartAPI);
      } catch (e) {
        console.warn("Merge guest cart failed:", e);
      }
      const path = localStorage.getItem("path");
      navigate(path || "/", { replace: true });
    } catch (err) {
      console.error("2FA failed:", err);
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  return (
    <div className="login-section">
      <div className="inner-section">
        <h2 className="heading-title">{t.auth.twoFactorAuthentication || "Two-Factor Authentication"}</h2>
        <hr className="card-divider my-3" />
        {/* Error message */}
        {error && <ErrorComponent error={error} />}

        <QRCodeDisplay />

        <p className="text-13 text-primary dark:text-gray-500 font-medium mb-2">
          {t.auth.enter6DigitCode || "Enter the 6-digit code from your Authenticator app to continue."}
        </p>

        <Formik
          initialValues={{ token: "", email: localStorage.getItem("email") }}
          validationSchema={Yup.object().shape({
            token: Yup.string()
              .required(t.auth.twoFactorCodeRequired || "2FA code is required")
              .matches(/^\d{6}$/, t.auth.codeMustBe6Digits || "Code must be exactly 6 digits"),
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
              {/* 2FA Token Field */}
              <div
                className={`relative ${
                  errors.token && touched.token ? "input-error" : ""
                }`}
              >
                <Field
                  type="text"
                  name="token"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  className={`input-field peer ${
                    errors.token && touched.token
                      ? "border-red-500 dark:border-red-400"
                      : ""
                  }`}
                  id="token"
                  value={values.token}
                  onChange={(e) => {
                    const onlyNums = e.target.value.replace(/\D/g, "");
                    handleChange({
                      target: { name: "token", value: onlyNums },
                    });
                  }}
                  onBlur={handleBlur}
                  disabled={loading}
                />
                <label
                  htmlFor="token"
                  className={`absolute left-5 transition-all font-medium ${
                    values.token
                      ? "top-2 text-xs text-gray-600"
                      : "top-4 text-13 text-primary dark:text-gray-500 "
                  } peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}
                >
                  {t.auth.twoFactorCode || "2FA Code *"}
                </label>
                <ErrorMessage
                  name="token"
                  component="p"
                  className="text-warning pl-5 text-xs font-medium mt-1"
                />
              </div>

              <button
                type="submit"
                className={`add-to-cart mt-3 max-w-full ${
                  !(isValid && dirty) || loading ? "disable" : ""
                }`}
                disabled={loading || isSubmitting || !(isValid && dirty)}
              >
                {t.auth.verifyAndContinue || "Verify & Continue"} <TbArrowRight size={18} />
              </button>
            </Form>
          )}
        </Formik>
        <div className="mt-0 text-center">
          <NavLink
            to="/sign-in"
            className="text-13 text-darkbtn dark:text-gray-200 hover:underline font-medium"
          >
            {t.auth.backToLogin || "Back to Login"}
          </NavLink>
        </div>
      </div>

      {loading && <Loader />}
    </div>
  );
};

export default TwoFactorLogin;
