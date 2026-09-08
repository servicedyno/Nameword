import { HiCheck } from "react-icons/hi";
import { RxCross2 } from "react-icons/rx";
import { useEffect, useState } from "react";

const AlertMessage = ({
  message,
  description,
  type = "success", // "success" | "warning" | "fail"
  show = true,
  onClose,
  autoHide = true,
  autoHideDuration = 5000,
}) => {
  const [isVisible, setIsVisible] = useState(show);

  useEffect(() => {
    setIsVisible(show);
  }, [show]);

  useEffect(() => {
    if (autoHide && isVisible) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onClose) onClose();
      }, autoHideDuration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, autoHide, autoHideDuration, onClose]);

  if (!isVisible) return null;

  const isSuccess = type === "success";

  const containerAccent = isSuccess ? "" : "border border-warning";

  return (
    <div
      className="alert"
      role="alert"
      aria-live={isSuccess ? "polite" : "assertive"}
    >
      <div className={`alert-container ${containerAccent}`}>
        <div className="flex justify-start items-center gap-3 py-4 px-3.5">
          {isSuccess ? (
            <div className="size-8 rounded-full bg-teallight-50 flex justify-center items-center flex-none">
              <HiCheck className="flex-none text-tealdark" size={18} />
            </div>
          ) : (
            <div className="size-8 rounded-full bg-warning flex justify-center items-center flex-none">
              <RxCross2 className="flex-none text-white" size={18} />
            </div>
          )}

          <div className="alert-text-container">
            <p
              className={`alert-text ${
                isSuccess ? "text-tealdark" : "text-warning"
              }`}
            >
              {message}
            </p>
            {description && <p className="alert-desc-text">{description}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertMessage;
