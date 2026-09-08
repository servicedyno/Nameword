import { useEffect, useState, useRef } from 'react';
import { NavLink } from 'react-router';
import { useLanguage } from '../../hooks/useLanguage';

const OTPExpiryTimer = ({ expiresAt = "2025-07-20T07:11:52.753+00:00", handleResendCode }) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const intervalRef = useRef(null);
  const { t } = useLanguage();

  useEffect(() => {
    const expiry = new Date(expiresAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diffInSeconds = Math.floor((expiry - now) / 1000);

      if (diffInSeconds <= 0) {
        setTimeLeft(0);
        clearInterval(intervalRef.current); // 🔥 Stop interval
      } else {
        setTimeLeft(diffInSeconds);
      }
    };

    updateTimer(); // Run immediately
    intervalRef.current = setInterval(updateTimer, 1000);

    return () => clearInterval(intervalRef.current); // Cleanup on unmount
  }, [expiresAt]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div>
      {handleResendCode && <> {timeLeft > 0 ?
        <>
          <p className="text-13 font-medium text-primary dark:text-gray-500">
            {t.common.otp.expiresIn} <span className="font-semibold">{formatTime(timeLeft)}</span>
          </p>
          <NavLink className="text-13 text-disable font-medium hover:underline text-left cursor-not-allowed pointer-events-none" disabled>
            {t.common.otp.resendCode}
          </NavLink>
        </> :
        <div>
          <p className="text-13 font-medium text-secondary">
            {t.common.otp.codeExpired}
          </p>
          <NavLink className="text-13 text-darkbtn font-medium hover:underline text-left" onClick={handleResendCode}>
             {t.common.otp.resendCode}
          </NavLink>
        </div>}
      </>}
    </div>
  );
};

export default OTPExpiryTimer;
