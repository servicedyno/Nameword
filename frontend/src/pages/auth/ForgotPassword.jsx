import { TbArrowRight } from "react-icons/tb";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { useEffect, useState } from "react";
import * as Yup from 'yup';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import { NavLink } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import ErrorComponent from '../../components/common/ErrorComponent';
import Loader from "../../components/common/Loader";
import { useAlert } from "../../context/AlertContext";
import { useLanguage } from '../../hooks/useLanguage';

const ForgotPassword = () => {
  const { t } = useLanguage();

  const [loading, setLoading] = useState(false);
  const [isCheckMailBox, setIsCheckMailBox] = useState(false);
  const { showAlert } = useAlert();

  const { error, clearError, forgotPassword } = useAuth();

  const handleSubmit = async (values, { setSubmitting }) => {
    setLoading(true);
    try {
      const data = await forgotPassword(values.email);
      showAlert(data?.message, { duration: 2500, type: 'success' });
      setIsCheckMailBox(true);
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (error) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [error])

  return (
    <div className='login-section'>
      <div className='inner-section'>
        <h2 className="heading-title">{t.auth.resetPassword || "Reset Password"}</h2>
        <hr className='card-divider my-3' />
        {error && <ErrorComponent error={error} />}

        {/*----- enter username or email ----------*/}
        <div className='flex flex-col gap-2.5'>
          {!isCheckMailBox ? <>
            <p className='text-13 text-primary dark:text-gray-500 font-medium'>{t.auth.weWillEmailYouLink || "We will email you the link to reset your password"}</p>
            <Formik
              initialValues={{
                email: '',
              }}
              validationSchema={Yup.object().shape({
                email: Yup.string()
                  .email(t.auth.invalidEmailAddress || 'Please enter a valid email address')
                  .required(t.auth.emailRequired || 'Email is required'),
              })}
              onSubmit={handleSubmit}
              enableReinitialize
            >
              {({ values, errors, touched, handleChange, handleBlur, isSubmitting, isValid, dirty }) => (
                <Form className='gap-2.5 flex flex-col w-full'>
                  {/* Email */}
                  <div className={`relative ${errors.email && touched.email ? "input-error" : ""}`}>
                    <Field
                      type="email"
                      name="email"
                      className={`input-field peer ${errors.email && touched.email ? 'border-red-500 dark:border-red-400' : ''}`}
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
                      className={`absolute left-5 transition-all font-medium ${values.email ? 'top-2 text-xs text-gray-600' : 'top-4 text-13 text-primary dark:text-gray-500 '} peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}
                    >
                      {t.auth.emailAddress || "Email Address *"}
                    </label>
                    <ErrorMessage name="email" component="p" className="text-warning pl-5 text-xs font-medium mt-1" />
                  </div>
                  <button
                    type="submit"
                    className={`add-to-cart max-w-full ${!(isValid && dirty) ? "disable" : ""}`}
                    disabled={loading || isSubmitting || !(isValid && dirty)}
                  >
                    {t.auth.sendMeTheLink || "Send me the link"} <TbArrowRight size={18} />
                  </button>
                </Form>
              )}
            </Formik>
          </> :
            <div className='check-email-card'>
              <div className='flex items-start gap-3'>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className='text-primary dark:text-gray-500' xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M9.944 3.25H14.056C15.894 3.25 17.35 3.25 18.489 3.403C19.661 3.561 20.61 3.893 21.359 4.641C22.107 5.39 22.439 6.339 22.597 7.511C22.75 8.651 22.75 10.106 22.75 11.944V12.056C22.75 13.894 22.75 15.35 22.597 16.489C22.439 17.661 22.107 18.61 21.359 19.359C20.61 20.107 19.661 20.439 18.489 20.597C17.349 20.75 15.894 20.75 14.056 20.75H9.944C8.106 20.75 6.65 20.75 5.511 20.597C4.339 20.439 3.39 20.107 2.641 19.359C1.893 18.61 1.561 17.661 1.403 16.489C1.25 15.349 1.25 13.894 1.25 12.056V11.944C1.25 10.106 1.25 8.65 1.403 7.511C1.561 6.339 1.893 5.39 2.641 4.641C3.39 3.893 4.339 3.561 5.511 3.403C6.651 3.25 8.106 3.25 9.944 3.25ZM5.71 4.89C4.704 5.025 4.124 5.279 3.7 5.702C3.278 6.125 3.024 6.705 2.889 7.711C2.751 8.739 2.749 10.093 2.749 12C2.749 13.907 2.751 15.262 2.889 16.29C3.024 17.295 3.278 17.875 3.701 18.298C4.124 18.721 4.704 18.975 5.71 19.11C6.738 19.248 8.092 19.25 9.999 19.25H13.999C15.906 19.25 17.261 19.248 18.289 19.11C19.294 18.975 19.874 18.721 20.297 18.298C20.72 17.875 20.974 17.295 21.109 16.289C21.247 15.261 21.249 13.907 21.249 12C21.249 10.093 21.247 8.739 21.109 7.71C20.974 6.705 20.72 6.125 20.297 5.702C19.874 5.279 19.294 5.025 18.288 4.89C17.261 4.752 15.906 4.75 13.999 4.75H9.999C8.092 4.75 6.739 4.752 5.71 4.89ZM5.422 7.52C5.54934 7.36729 5.7321 7.27139 5.93013 7.25338C6.12815 7.23538 6.32521 7.29675 6.478 7.424L8.64 9.223C9.573 10 10.22 10.538 10.768 10.89C11.297 11.23 11.656 11.345 12.001 11.345C12.346 11.345 12.705 11.231 13.234 10.89C13.781 10.538 14.429 10 15.362 9.223L17.521 7.423C17.5967 7.35997 17.6841 7.31246 17.7782 7.2832C17.8722 7.25393 17.9711 7.24348 18.0692 7.25244C18.1673 7.2614 18.2627 7.2896 18.3499 7.33542C18.4371 7.38124 18.5145 7.44379 18.5775 7.5195C18.6405 7.59521 18.688 7.68259 18.7173 7.77665C18.7466 7.87072 18.757 7.96963 18.7481 8.06774C18.7391 8.16584 18.7109 8.26122 18.6651 8.34843C18.6193 8.43564 18.5567 8.51297 18.481 8.576L16.285 10.406C15.398 11.146 14.68 11.744 14.045 12.152C13.385 12.577 12.742 12.845 12.001 12.845C11.26 12.845 10.617 12.576 9.956 12.152C9.322 11.744 8.604 11.145 7.717 10.407L5.52 8.577C5.44424 8.51394 5.38165 8.43656 5.33582 8.34929C5.28998 8.26202 5.2618 8.16657 5.25289 8.0684C5.24397 7.97023 5.25449 7.87127 5.28385 7.77717C5.31322 7.68307 5.36084 7.59568 5.424 7.52" fill="currentcolor" />
                </svg>

                <div className='flex flex-col'>
                  <p className='text-base text-primary dark:text-gray-500 font-medium'>
                    {t.auth.checkYourInbox || "Check your inbox"}
                  </p>
                  <p className='text-13 text-primary dark:text-gray-500 font-medium'>
                    We’ve emailed you a link to reset your password.
                  </p>
                </div>
              </div>
            </div>}
          <div className="text-center mt-3">
            <NavLink to="/sign-in" className="text-13 text-darkbtn dark:text-gray-200 hover:underline font-medium">{t.auth.backToLogin || "Back to Login"}</NavLink>
          </div>
        </div>
      </div>
      {loading && <Loader />}
    </div>
  )
}

export default ForgotPassword