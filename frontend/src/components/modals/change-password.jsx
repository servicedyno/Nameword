import { IoClose } from "react-icons/io5";
import { useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { ErrorMessage, Field, Form, Formik } from "formik";
import PasswordStrengthMeter from "../common/PasswordStrengthMeter";
import * as Yup from 'yup';
import { useAuth } from "../../hooks/useAuth";
import Loader from "../common/Loader";
import ErrorComponent from "../common/ErrorComponent";
import { useAlert } from "../../context/AlertContext";
import { useLanguage } from "../../hooks/useLanguage";

const ChangePassword = ({ onClose }) => {
    const { t } = useLanguage();
    
    const changePasswordSchema = Yup.object().shape({
        oldPassword: Yup.string().trim().required(t.admin.currentPasswordRequired || "Current password is required."),
        newPassword: Yup.string()
            .min(8, t.admin.newPasswordMinLength || 'New password must contain at least 8 characters')
            .matches(/[!@#$%^&*(),.?":{}|<>]/, t.admin.newPasswordSpecialChar || 'New password must include at least one special symbol')
            .matches(/[a-z]/, t.admin.newPasswordLowercase || 'New password must include a lowercase letter')
            .matches(/[A-Z]/, t.admin.newPasswordUppercase || 'New password must include an uppercase letter')
            .matches(/[0-9]/, t.admin.newPasswordNumber || 'New password must include at least one number')
            .required(t.admin.newPasswordRequired || 'New password is required'),
        newPasswordConfirmation: Yup.string()
            .oneOf([Yup.ref('newPassword'), null], t.admin.passwordsMustMatch || 'New Password and Confirm Password must be the same.')
            .required(t.admin.confirmPasswordRequired || 'Confirm password is required.'),
    });
    const [oldPassword, setOldPassword] = useState(false);
    const [newPassword, setNewPassword] = useState(false);
    const [cPassword, setCPassword] = useState(false);
    const [error, setError] = useState(false);
    const { showAlert } = useAlert();

    const { changePassword: changePasswordAPI, clearstorage } = useAuth();

    const initialValues = {
        oldPassword: '',
        newPassword: '',
        newPasswordConfirmation: '',
    };

    const handleSubmit = async (values, { setSubmitting }) => {
        setError(null);
        setSubmitting(true);
        const data = await changePasswordAPI(values);
        if (data?.success) {
            showAlert(data?.message || t.admin.passwordChangedSuccess, { duration: 2500, type: 'success' });
            clearstorage();
            onClose()
        } else {
            setError(data?.error);
        }
        setSubmitting(false);
    };

    return (
        <>
            <div className="fixed inset-0 z-50 bg-white/80 dark:bg-gray-600/80 overflow-auto py-5">
                <div className="flex items-center justify-center w-full h-full">
                    <div className="modal-dialog">
                        {/* Close Button */}
                        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-black cursor-pointer">
                            <IoClose className='text-primary dark:text-gray-500' size={30} />
                        </button>

                        {/* Modal Title */}
                        <div className="flex flex-col gap-2">
                            <h2 className="modal-title">
                                {t.admin.changePassword}
                                <p className="text-15 font-medium text-secondary mt-1">
                                    {t.admin.changePasswordDescription.split('here.')[0]}<span className="text-primary dark:text-white">here.</span>
                                </p>
                            </h2>
                        </div>
                        {error && <ErrorComponent error={error} />}
                        <Formik
                            initialValues={initialValues}
                            validationSchema={changePasswordSchema}
                            onSubmit={handleSubmit}
                            enableReinitialize
                        >
                            {({ values, errors, touched, handleChange, handleBlur, isSubmitting, isValid, dirty }) => (
                                <Form>
                                    {/* New Password */}
                                    <div className={`relative ${errors.oldPassword && touched.oldPassword ? "input-error" : ""}`}>
                                        <Field
                                            type={oldPassword ? "text" : "password"}
                                            name="oldPassword"
                                            className={`input-field peer ${errors.oldPassword && touched.oldPassword ? 'border-red-500 dark:border-red-400' : ''}`}
                                            id="oldPassword"
                                            value={values.oldPassword}
                                            onChange={(e) => {
                                                handleChange(e);
                                            }}
                                            onBlur={handleBlur}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setOldPassword(!oldPassword)}
                                            className="absolute right-5 top-5 text-primary dark:text-gray-500 cursor-pointer"
                                        >
                                            {oldPassword ? <FiEye size={18} /> : <FiEyeOff size={18} />}
                                        </button>
                                        <label
                                            htmlFor="oldPassword"
                                            className={`absolute left-5 transition-all font-medium ${values.oldPassword ? 'top-2 text-xs text-gray-600' : 'top-4 text-13 text-primary dark:text-gray-500'} peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}
                                        >
                                            {t.admin.currentPassword}
                                        </label>
                                        <ErrorMessage name="oldPassword" component="p" className="text-warning pl-5 text-xs font-medium mt-1" />
                                    </div>
                                    {/* New Password */}
                                    <div className={`relative mt-2.5 ${errors.newPassword && touched.newPassword ? "input-error" : ""}`}>
                                        <Field
                                            type={newPassword ? "text" : "password"}
                                            name="newPassword"
                                            className={`input-field peer ${errors.newPassword && touched.newPassword ? 'border-red-500 dark:border-red-400' : ''}`}
                                            id="newPassword"
                                            value={values.newPassword}
                                            onChange={(e) => {
                                                handleChange(e);
                                            }}
                                            onBlur={handleBlur}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setNewPassword(!newPassword)}
                                            className="absolute right-5 top-5 text-primary dark:text-gray-500 cursor-pointer"
                                        >
                                            {newPassword ? <FiEye size={18} /> : <FiEyeOff size={18} />}
                                        </button>
                                        <label
                                            htmlFor="newPassword"
                                            className={`absolute left-5 transition-all font-medium ${values.newPassword ? 'top-2 text-xs text-gray-600' : 'top-4 text-13 text-primary dark:text-gray-500'} peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}
                                        >
                                            {t.admin.newPassword}
                                        </label>
                                        <ErrorMessage name="newPassword" component="p" className="text-warning pl-5 text-xs font-medium mt-1" />
                                        {(values.newPassword === values.oldPassword && values.newPassword) &&
                                            (<p className="text-warning pl-5 text-xs font-medium mt-1">
                                                {t.admin.oldAndNewPasswordSame}
                                            </p>)}
                                        {(touched.newPassword || values.newPassword) && <PasswordStrengthMeter password={values.newPassword} />}
                                    </div>
                                    <div className={`relative mt-2.5 ${errors.newPasswordConfirmation && touched.newPasswordConfirmation ? "input-error" : ""}`}>
                                        <Field
                                            type={cPassword ? "text" : "password"}
                                            name="newPasswordConfirmation"
                                            className={`input-field peer ${errors.newPasswordConfirmation && touched.newPasswordConfirmation ? 'border-red-500 dark:border-red-400' : ''}`}
                                            id="newPasswordConfirmation"
                                            value={values.newPasswordConfirmation}
                                            onChange={(e) => {
                                                handleChange(e);
                                            }}
                                            onBlur={handleBlur}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setCPassword(!cPassword)}
                                            className="absolute right-5 top-5 text-primary dark:text-gray-500 cursor-pointer"
                                        >
                                            {cPassword ? <FiEye size={18} /> : <FiEyeOff size={18} />}
                                        </button>
                                        <label
                                            htmlFor="newPasswordConfirmation"
                                            className={`absolute left-5 transition-all font-medium ${values.newPasswordConfirmation ? 'top-2 text-xs text-gray-600' : 'top-4 text-13 text-primary dark:text-gray-500'} peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}
                                        >
                                            {t.admin.newPasswordAgain}
                                        </label>
                                        <ErrorMessage name="newPasswordConfirmation" component="p" className="text-warning pl-5 text-xs font-medium mt-1" />
                                    </div>
                                    <div className="mt-5 flex justify-end gap-2 admin-btn">
                                        <button className={`add-to-cart ${!(isValid && dirty) || isSubmitting || values.newPassword === values.oldPassword ? "disable" : ""}`} disabled={!(isValid && dirty) || isSubmitting || values.newPassword === values.oldPassword}>
                                            {t.admin.confirm}
                                        </button>
                                    </div>
                                    {isSubmitting && <Loader />}
                                </Form>
                            )}
                        </Formik>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ChangePassword;