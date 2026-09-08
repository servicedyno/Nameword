/* eslint-disable no-unused-vars */
import { FaCheck } from "react-icons/fa6";
import { IoClose } from "react-icons/io5";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { NavLink, useNavigate } from "react-router";
import ErrorComponent from "../../components/common/ErrorComponent";
import OTPExpiryTimer from "../../components/common/OTPExpiryTimer";
import { useAuth } from "../../hooks/useAuth";
import Loader from "../../components/common/Loader";
import { useAlert } from "../../context/AlertContext";
import { useLanguage } from "../../hooks/useLanguage";
import { mergeGuestCartIntoServer } from "../../utils/guestCart";
import { cartAPI } from "../../api/cartApi";

const OtpCode = () => {
    const { t } = useLanguage();
    const [otp, setOtp] = useState(["", "", "", ""]);
    const [email, setEmail] = useState(localStorage.getItem("email") || '');
    const [success, setSuccess] = useState(false);
    const [errorToggle, setErrorToggle] = useState(false);
    const [verifying, setVerifying] = useState(false);

    const { verifyEmailCode, sendEmailCode, error, clearError, resendLoading, updateUser } = useAuth();
    const { showAlert } = useAlert();

    const inputsRef = useRef([]);
    const navigate = useNavigate();

    useEffect(() => {
        if (error) {
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    }, [error])

    const handleChange = (e, index) => {
        clearError();
        const value = e.target.value.replace(/\D/g, ""); // Only digits
        if (!value) return;

        const newOtp = [...otp];
        newOtp[index] = value[0];
        setOtp(newOtp);

        // Move to next input
        if (index < otp.length - 1) {
            inputsRef.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (e, index) => {
        if (e.key === "Backspace") {
            const newOtp = [...otp];
            newOtp[index] = "";
            setOtp(newOtp);
            if (index > 0) {
                inputsRef.current[index - 1]?.focus();
            }
        }
    };

    const handlePaste = (e) => {
        const pasteData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
        const newOtp = [...otp];
        pasteData.split("").forEach((char, i) => {
            newOtp[i] = char;
            if (inputsRef.current[i]) inputsRef.current[i].value = char;
        });
        setOtp(newOtp);
        const next = pasteData.length < 4 ? pasteData.length : 3;
        inputsRef.current[next]?.focus();
    };

    const handleResendCode = async () => {
        try {
            const data = await sendEmailCode(email);
            showAlert(data?.message, { duration: 2500, type: 'success' });
        } catch (e) {
            console.error(e);
        } finally {
            setOtp(["", "", "", ""]);
        }
    };

    const handleVerifyOTP = useCallback(async () => {
        try {
            clearError();
            setVerifying(true);
            setSuccess(false);
            setErrorToggle(false);

            const code = otp.join("");
            const data = await verifyEmailCode({ email, otp: code });

            setSuccess(true);
            showAlert(data?.message, { duration: 2500, type: 'success' });
            setTimeout(async () => {
                if (data?.data?.enabled2FA){
                    localStorage.removeItem('otpExpireAt');
                    localStorage.setItem('qrCode', data?.qrCode);
                    localStorage.setItem('email', data?.data?.email);
                    navigate('/2fa/verify', { replace: true });
                }else{
                    localStorage.removeItem('otpExpireAt');
                    localStorage.removeItem('email');
                    localStorage.removeItem("registerId");

                    updateUser(data?.data);
                    try {
                        await mergeGuestCartIntoServer(cartAPI);
                    } catch (e) {
                        console.warn("Merge guest cart failed:", e);
                    }
                    const path = localStorage.getItem("path");
                    navigate(path || '/', { replace: true });
                }
            }, 2000);
        } catch (error) {
            setErrorToggle(true);
            console.error('OTP verification failed:', error);
        } finally {
            setVerifying(false);
        }
    }, [otp, email]);

    useEffect(() => {
        const filled = otp.every((digit) => digit !== "");
        if (filled) {
            handleVerifyOTP();
        }
    }, [otp, handleVerifyOTP]);

    const otpBoxClass = useMemo(() => {
        return (verifying || success) ? "after-code" : (errorToggle && error) ? "wrong-otp" : '';
    }, [verifying, success, errorToggle, error]);

    return (
        <>
            <div className='login-section'>
                <div className='inner-section'>
                    <h2 className="heading-title">{t.auth.enterYourCode || "Enter your code"}</h2>
                    <hr className='card-divider my-3' />

                    {error && <ErrorComponent error={error} />}

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
                                    {t.auth.weSentCodeTo?.replace("${email}", email) || `We sent a code to ${email}`}
                                </p>
                                {localStorage.getItem("registerId") ?
                                <NavLink to='/change-email' className='text-darkbtn dark:text-gray-200 hover:underline text-13 font-medium mt-2' >{t.auth.changeEmail || "Change email"}</NavLink>
                                :null }
                            </div>
                        </div>
                    </div>

                    {/* enter OTP code */}
                    <div className={`flex justify-start items-center gap-4 my-3 ${otpBoxClass}`}>
                        {[0, 1, 2, 3].map((i) => (
                            <input
                                key={i}
                                type="text"
                                maxLength={1}
                                value={otp[i]}
                                onChange={(e) => handleChange(e, i)}
                                onKeyDown={(e) => handleKeyDown(e, i)}
                                onPaste={handlePaste}
                                ref={(el) => (inputsRef.current[i] = el)}
                                className="otp-input"
                            />
                        ))}
                        {verifying ? <>
                            <svg className="mr-3 -ml-1 size-6 animate-spin text-primary dark:text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </> :
                            success ?
                                <FaCheck size={25} className='text-sucess-400' /> :
                                (error && errorToggle) &&
                                <IoClose size={25} className='text-warning' />
                        }
                    </div>

                    <div className='flex flex-col'>
                        <OTPExpiryTimer expiresAt={localStorage.getItem("otpExpireAt") || null} handleResendCode={handleResendCode} resendLoading={resendLoading} />
                    </div>
                    <div className="mt-0">
                        <NavLink to="/sign-in" className="text-13 text-darkbtn dark:text-gray-200 hover:underline font-medium">{t.auth.backToLogin || "Back to Login"}</NavLink>
                    </div>
                </div>
                {resendLoading && <Loader />}
            </div>
        </>
    )
}

export default OtpCode