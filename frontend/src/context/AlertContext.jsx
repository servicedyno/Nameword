import { createContext, useCallback, useContext, useState } from "react";
import AlertMessage from "../components/common/AlertMessage";

const AlertContext = createContext({
  showAlert: (_message, _options) => {},
  hideAlert: () => {},
});

export const useAlert = () => useContext(AlertContext);

export const AlertProvider = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("success");
  const [duration, setDuration] = useState(2500);

  const hideAlert = useCallback(() => setIsVisible(false), []);                                                          
                                                                                                                 

  const showAlert = useCallback((msg, options = {}) => {
    setMessage(msg || "");
    setDescription(options.description || "");
    if (options?.type) setType(options.type);
    setDuration(options?.duration ?? 2500);
    setIsVisible(true);
  }, []);

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      <AlertMessage
        show={isVisible}
        message={message}
        onClose={hideAlert}
        autoHide={true}
        autoHideDuration={duration}
        type={type}
        description={description}
      />
      {children}
    </AlertContext.Provider>
  );
};

export default AlertContext;
