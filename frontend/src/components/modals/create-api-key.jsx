import { IoClose } from "react-icons/io5";
import * as Yup from 'yup';
import { ErrorMessage, Field, Form, Formik } from "formik";
import moment from "moment";
import { useApiKeys } from "../../hooks/useApiKeys";
import Loader from "../common/Loader";
import ErrorComponent from "../common/ErrorComponent";
import { IoIosArrowDown, IoIosArrowUp, IoIosArrowForward, IoIosArrowBack } from "react-icons/io";
import { useAlert } from "../../context/AlertContext";
import { useNavigate } from "react-router";
import { authAPI } from "../../api/auth";
import { useState } from "react";
import { useLanguage } from "../../hooks/useLanguage";

const CreateApiKey = ({ onClose, handleOpenModal }) => {
    const { t } = useLanguage();
    
    const apiKeySchema = Yup.object().shape({
        keyname: Yup.string().trim().required(t.admin.keyNameRequired || "Key name is required"),
        expiration: Yup.string().trim().required(t.admin.expirationRequired || "Expiration is required"),
    });
    const [isLoading, setLoading] = useState(null);

    const { createApiKey, loading, error, clearError } = useApiKeys();
    const { showAlert } = useAlert();
    const navigate = useNavigate();

     const checkAuth = async () => {
            try {
              setLoading(true);
              const userData = await authAPI.getCurrentUser();
              localStorage.setItem("user", JSON.stringify(userData.data));
            } catch (error) {
                showAlert(
                error?.response?.data?.message ||
                  error?.response?.data?.errors[0]?.message ||
                  t.admin.failedToFetchUserData,
                  {
                    type: "error"
                  }
              );
              console.error("Failed to get current user:", error);
              localStorage.removeItem("user");
              navigate("/sign-in", { replace: true });
            } finally {
              setLoading(false);
            }
          };


    const calculateExpirationDate = (value) => {
        switch (value) {
            case "1 month":
                return moment().add(1, "months").utc().format();
            case "3 months":
                return moment().add(3, "months").utc().format();
            case "6 months":
                return moment().add(6, "months").utc().format();
            case "1 year":
                return moment().add(1, "years").utc().format();
            default:
                return "";
        }
    };

    const handleSubmit = async(values) => {

        const result = await createApiKey({
            name: values.keyname,
            expiration: calculateExpirationDate(values.expiration)
        })

        if(result?.success){
            checkAuth();
            handleOpenModal();
        }

    }

    const handleCloseModal = () => {
        onClose(); 
        clearError();
    }

    return (
        <div className="fixed inset-0 z-50 bg-white/80 dark:bg-gray-600/80 overflow-auto py-5 min-h-screen">
            <div className="flex items-center justify-center w-full h-full">
                <div className="modal-dialog">
                    {/* Close Button */}
                    <button onClick={handleCloseModal} className="absolute top-4 right-4 text-gray-500 hover:text-black cursor-pointer">
                        <IoClose className='text-primary dark:text-gray-500' size={30} />
                    </button>

                    {/* Modal Title */}
                    <div className="flex flex-col gap-2">
                        <h2 className="modal-title">
                            {t.admin.generateApiKey}
                        </h2>
                    </div>
                    {error && <ErrorComponent error={error} />}

                    <Formik
                        initialValues={{
                            keyname: "",
                            expiration: "",
                        }}
                        validationSchema={apiKeySchema}
                        onSubmit={handleSubmit}
                    >
                        {({ values, handleChange, handleBlur, isValid, dirty, errors, touched }) => (
                            <Form>
                                {/* Key Name */}
                                <div className={`relative w-full ${errors.keyname && touched.keyname ? "input-error" : ""}`}>
                                    <Field
                                        type="text"
                                        name="keyname"
                                        id="keyname"
                                        className={`input-field ${errors.keyname && touched.keyname ? 'border-red-500 dark:border-red-400' : 'admin-form '} peer`}
                                        value={values.keyname}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                    />
                                    <label
                                        htmlFor="keyname"
                                        className={`absolute left-5 transition-all font-medium ${values.keyname
                                                ? "top-2 text-xs text-gray-600"
                                                : "top-4 text-13 text-primary dark:text-gray-500"
                                            } peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}
                                    >
                                        {t.admin.keyName}
                                    </label>
                                    <ErrorMessage
                                        name="keyname"
                                        component="p"
                                        className="text-warning pl-5 text-xs font-medium mt-1"
                                    />
                                </div>

                                {/* Expiration */}
                                <div className={`relative mt-2.5 ${errors.expiration && touched.expiration ? "input-error" : ""}`}>
                                    <Field
                                        as="select"
                                        name="expiration"
                                        id="expiration"
                                        className={`input-field ${errors.expiration && touched.expiration ? 'border-red-500 dark:border-red-400' : 'admin-form '} peer`}
                                        value={values.expiration}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                    >
                                        <option value="">{t.admin.selectExpiration}</option>
                                        <option value="1 month">{t.admin.oneMonth}</option>
                                        <option value="3 months">{t.admin.threeMonths}</option>
                                        <option value="6 months">{t.admin.sixMonths}</option>
                                        <option value="1 year">{t.admin.oneYear}</option>
                                    </Field>
                                    <IoIosArrowDown size={15} className="absolute top-1/2 transform -translate-y-1/2 right-4 text-primary dark:text-white" />
                                    <label
                                        htmlFor="expiration"
                                        className={`absolute left-5 transition-all font-medium top-2 text-xs text-gray-600 peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}
                                    >
                                        {t.admin.expirationLabel}
                                    </label>
                                    <ErrorMessage
                                        name="expiration"
                                        component="p"
                                        className="text-warning pl-5 text-xs font-medium mt-1"
                                    />
                                </div>

                                {/* Confirm Button */}
                                <div className="mt-5 flex justify-end admin-btn">
                                    <button
                                        type="submit"
                                        className={`add-to-cart ${!(isValid && dirty) ? "disable" : ""}`}
                                        disabled={!(isValid && dirty)}
                                    >
                                        {t.admin.generate}
                                    </button>
                                </div>
                            </Form>
                        )}
                    </Formik>
                </div>
            </div>

            {(loading || isLoading) && <Loader />}
        </div>
    )
}

export default CreateApiKey