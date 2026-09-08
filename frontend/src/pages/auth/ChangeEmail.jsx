import { TbArrowRight } from "react-icons/tb";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { NavLink } from "react-router";
import { useAuth } from "../../hooks/useAuth";
import { useAlert } from "../../context/AlertContext";
import ErrorComponent from "../../components/common/ErrorComponent";
import Loader from "../../components/common/Loader";
import { useLanguage } from "../../hooks/useLanguage";

const ChangeEmail = () => {
    const { t } = useLanguage();
    
    const validationSchema = Yup.object({
        email: Yup.string()
            .email(t.auth.invalidEmailAddress || "Invalid email address")
            .required(t.auth.emailRequired || "Email is required"),
    });

    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const { changeEmail } = useAuth();
    const { showAlert } = useAlert();
    
    useEffect(() => {
        if (!localStorage.getItem("registerId") || !localStorage.getItem("email")) {
            navigate("/create-account", { replace: true });
        }
    }, [navigate]);

    const initialValues = {
        email: localStorage.getItem("email") || "",
    };


    const handleSubmit = async (values, { setSubmitting }) => {
        setLoading(true);
        try {
            setError(null);
            const userData = {
                email: values.email,
                id: localStorage.getItem("registerId")
            };

            const data = await changeEmail(userData);
            if (data.success){
                showAlert(data?.message, { duration: 2500, type: "success" });
                navigate("/otp-code", { replace: true });
                return
            }
            setError(data?.error)
            // Redirect to home page after successful registration
        } catch (error) {
            console.error("change email failed:", error);
        } finally {
            setLoading(false);
            setSubmitting(false);
        }
    };

    return (
        <div className="login-section">
            <div className="inner-section">
                <h2 className="heading-title">{t.auth.enterYourCode || "Enter your code"}</h2>
                <hr className="card-divider my-3" />
                {error && <ErrorComponent error={error} />}
                <Formik
                    initialValues={initialValues}
                    validationSchema={validationSchema}
                    onSubmit={handleSubmit}
                >
                    {({ values, touched, errors, isValid, dirty }) => (
                        <Form className="flex flex-col gap-2.5">
                            {/* Email Field */}
                            <div
                                className={`relative ${errors.email && touched.email ? "input-error" : ""
                                    }`}
                            >
                                <Field
                                    type="email"
                                    name="email"
                                    className={`input-field peer ${errors.email && touched.email ? "border-red-500 dark:border-red-400" : ""}`}
                                    id="email"
                                />
                                <label
                                    htmlFor="email"
                                    className={`absolute left-5 transition-all font-medium ${values.email ? "top-2 text-xs text-gray-600" : "top-4 text-13 text-primary dark:text-gray-500 "} peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}
                                >
                                    {t.auth.emailAddress || "Email Address *"}
                                </label>
                                <ErrorMessage
                                    name="email"
                                    component="p"
                                    className="text-warning pl-2 text-xs font-medium mt-1"
                                />
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                className={`add-to-cart max-w-full ${!(isValid && dirty) ? "disable cursor-not-allowed" : ""}`}
                                disabled={loading || !(isValid && dirty)}
                            >
                                {t.auth.sendMeTheCode || "Send me the code"} <TbArrowRight size={18} />
                            </button>

                            {/* Back Link */}
                            <div className="text-center mt-3">
                                <NavLink
                                    to="/otp-code"
                                    className="text-13 text-darkbtn dark:text-gray-200 hover:underline font-medium"
                                >
                                    {t.admin.back || "Back"}
                                </NavLink>
                            </div>
                        </Form>
                    )}
                </Formik>
            </div>
            {loading && <Loader />}
        </div>
    );
};

export default ChangeEmail;