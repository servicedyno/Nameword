import { useState, useMemo } from "react";
import { ErrorMessage, Field, Form, Formik } from "formik";
import PhoneInput from "react-phone-input-2";
import { useAuth } from "../../../../hooks/useAuth";
import { parsePhoneNumberWithError, parsePhoneNumberFromString } from "libphonenumber-js";
import * as Yup from 'yup';
import Loader from "../../../common/Loader";
import ErrorComponent from "../../../common/ErrorComponent";
import { useAlert } from "../../../../context/AlertContext";
import { useLanguage } from "../../../../hooks/useLanguage";

const AccountInformation = () => {
    const { t } = useLanguage();
    const { user, accountDetailUpdate } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const { showAlert } = useAlert();

    // Validation schema with translations
    const accountDetailsSchema = useMemo(() => Yup.object().shape({
        name: Yup.string()
            .trim()
            .required(t.admin.nameRequired)
            .min(2, t.admin.nameMinLength)
            .max(50, t.admin.nameMaxLength)
            .matches(/^[A-Za-z\s]+$/, t.admin.nameInvalidChars),
        username: Yup.string()
            .trim()
            .required(t.admin.usernameRequired)
            .min(2, t.admin.usernameMinLength)
            .max(30, t.admin.usernameMaxLength)
            .matches(/^[a-zA-Z0-9_-]+$/, t.admin.usernameInvalidChars),
        mobile: Yup.string()
            .trim()
            .required(t.admin.mobileFieldRequired)
            .test('is-valid', t.admin.enterValidPhoneNumber, function (value) {
                const { phoneCountryCode } = this.parent;
                const phoneNumber = parsePhoneNumberFromString(`+${value || ''}`, phoneCountryCode?.toUpperCase() || 'US');
                return phoneNumber?.isValid() || false;
            }),
    }), [t]);

    function getCountryNameFromNumber(number) {
        try {
            const phoneNumber = parsePhoneNumberWithError(number);
            return phoneNumber?.country?.toLowerCase() || '';
        } catch (err) {
            console.log('err: ', err);
            return null;
        }
    }

    const handleSubmit = async (values, { setSubmitting }) => {
        setLoading(true);
        setError(null);
        const userData = {
            name: values.name,
            username: values.username,
            mobile: "+" + values.mobile,
        };
        const data = await accountDetailUpdate(userData);
        if (data?.success) {
            showAlert(data?.message || t.admin.accountUpdatedSuccess, { duration: 2500, type: 'success' });
        } else {
            setError(data?.error);
        }

        setLoading(false);
        setSubmitting(false);
    };

    return (
        <>
            <div className="py-7 px-5 space-y-4">
                {error && <ErrorComponent error={error} />}
                <Formik
                    enableReinitialize
                    initialValues={{
                        name: user?.name || "",
                        username: user?.username || "",
                        mobile: user?.mobile?.replace("+", "") || "91",
                        phoneCountryCode: user?.mobile ? getCountryNameFromNumber(user?.mobile) || '' : '',
                    }}
                    validationSchema={accountDetailsSchema}
                    onSubmit={handleSubmit}
                >
                    {({ values, errors, touched, handleChange, handleBlur, setFieldValue, setFieldTouched, validateField, isValid, dirty, submitCount }) => (
                        <Form>
                            <div className="flex flex-col gap-3 w_full react-tel">
                                <div className={`relative w-full ${errors.name && touched.name ? "input-error" : ""}`}>
                                    <Field
                                        type="text" 
                                        name="name"
                                        id="name"
                                        maxLength={50}
                                        className={`input-field peer w-full ${errors.name && touched.name ? 'border-red-500 dark:border-red-400' : 'admin-form '} disabled:cursor-not-allowed`} value={values.name}
                                        onChange={(e) => handleChange(e)}
                                        onBlur={handleBlur}
                                    />
                                    <label
                                        htmlFor="name"
                                        className={`absolute left-5 transition-all font-medium ${values.name
                                            ? 'top-2 text-xs text-gray-600'
                                            : 'top-4 text-13 text-primary dark:text-gray-500'
                                            } peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}
                                    >
                                        {t.admin.name} *
                                    </label>
                                    <ErrorMessage name="name" component="p" className="text-warning pl-5 text-xs font-medium mt-1" />
                                    {submitCount > 0 && errors.name && <p className="pl-5 text-xs text-secondary dark:text-gray-400 mt-1">{t.admin.nameFieldHelper}</p>}
                                </div>
                                <div className={`relative w-full ${errors.username && touched.username ? "input-error" : ""}`}>
                                    <Field
                                        type="text"
                                        name="username"
                                        id="username"
                                        maxLength={30}
                                        className={`input-field peer w-full ${errors.username && touched.username ? 'border-red-500 dark:border-red-400' : 'admin-form '} disabled:cursor-not-allowed`} value={values.username}
                                        onChange={(e) => handleChange(e)}
                                        onBlur={handleBlur}
                                    />
                                    <label
                                        htmlFor="username"
                                        className={`absolute left-5 transition-all font-medium ${values.username
                                            ? 'top-2 text-xs text-gray-600'
                                            : 'top-4 text-13 text-primary dark:text-gray-500'
                                            } peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}
                                    >
                                        {t.auth.username} 
                                    </label>
                                    <ErrorMessage name="username" component="p" className="text-warning pl-5 text-xs font-medium mt-1" />
                                    {submitCount > 0 && errors.username && <p className="pl-5 text-xs text-secondary dark:text-gray-400 mt-1">{t.admin.usernameFieldHelper}</p>}
                                </div>
                                        <div className={`relative w-full react-tel-flag ${errors.mobile && touched.mobile ? "input-error" : ""}`}>
                                    <PhoneInput
                                        country={'in'}
                                        value={values.mobile}
                                        onChange={(value, data) => {
                                            setFieldValue('mobile', value);
                                            setFieldValue('phoneCountryCode', data.countryCode);
                                            // if (error) clearError();
                                            setTimeout(() => {
                                                setFieldTouched('mobile', true);
                                                validateField('mobile');
                                            }, 0);
                                        }}
                                        specialLabel=""
                                        placeholder=""
                                        inputProps={{
                                            name: 'mobile',
                                            className: `input-field peer w-full mobile-number ${errors.mobile && touched.mobile ? 'border-red-500 dark:border-red-400' : 'admin-form '} disabled:cursor-not-allowed`,
                                            onBlur: () => {
                                                setFieldTouched('mobile', true); // ✅ manually mark as touched
                                            },
                                        }}
                                        enableSearch={true}
                                        searchPlaceholder={t.admin.searchCountries}
                                        searchNotFound={t.admin.noCountryFound}
                                    />
                                    <label
                                        htmlFor="mobile"
                                        className={`absolute left-12 transition-all font-medium ${values.mobile
                                            ? 'top-2 text-xs text-gray-600'
                                            : 'top-4 text-13 text-primary dark:text-gray-500'
                                            } peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}
                                    >
                                        {t.admin.mobileNumber} *
                                    </label>
                                    {errors.mobile && touched.mobile && <p className="text-warning pl-5 text-xs font-medium mt-1" >{errors.mobile}</p>}
                                </div>
                            </div>
                            <div className='flex items-center justify-end admin-btn gap-2 mt-3'>
                                <button type="submit" className={`${!(isValid && dirty) ? "disable" : ""} add-to-cart`} disabled={!(isValid && dirty)}>
                                    {t.admin.save}
                                </button>
                            </div>
                        </Form>
                    )}
                </Formik>
            </div>
            {loading && <Loader />}
        </>
    )
}

export default AccountInformation