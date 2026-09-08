import { useState, useEffect } from "react";
import { IoChevronDown } from "react-icons/io5";
import { hostingAPI } from "../../../api/hosting";
import { useAlert } from "../../../context/AlertContext";
import { useLanguage } from "../../../hooks/useLanguage";

const ServerLocationstep = ({ onLocationSelected, initialData = {} }) => {
  const { t } = useLanguage();
  // Ensure serverLocation is a string, not an object
  const getInitialLocation = () => {
    if (!initialData.serverLocation) return "";
    if (typeof initialData.serverLocation === "string")
      return initialData.serverLocation;
    // If it's an object, try to extract a string value
    if (typeof initialData.serverLocation === "object") {
      return initialData.serverLocation.toString() || "";
    }
    return String(initialData.serverLocation || "");
  };

  const [selected, setSelected] = useState(getInitialLocation());
  const [open, setOpen] = useState(false);
  const [serverInfo, setServerInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState([]);
  const { showAlert } = useAlert();

  useEffect(() => {
    fetchServerInfo();
  }, []);

  const fetchServerInfo = async () => {
    try {
      setLoading(true);
      const response = await hostingAPI.getServerInfo();

      if (response?.success && response?.responseData) {
        const serverData = response.responseData;
        setServerInfo(serverData);

        // Format location string
        const location = serverData.location;
        if (location) {
          const locationString = `${location.region || location.country || "Unknown"
            } (${location.datacenter || location.country || "Unknown"})`;
          setLocations([locationString]);

          // If no initial selection, set the fetched location
          if (!selected && locationString) {
            setSelected(locationString);
            if (onLocationSelected) {
              onLocationSelected(locationString, serverData);
            }
          }
        }
      } else {
        showAlert(t.admin.failedToFetchServerInformation, { type: "fail" });
      }
    } catch (error) {
      console.error("Error fetching server info:", error);
      showAlert(t.admin.failedToFetchServerInformation, { type: "fail" });
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSelect = (location) => {
    setSelected(location);
    setOpen(false);
    if (onLocationSelected && serverInfo) {
      onLocationSelected(location, serverInfo);
    }
  };

  return (
    <div className="py-7 px-5 space-y-4">
      <div className="relative xl:w-1/4 lg:w-1/2 w-full">
        <div onClick={() => !loading && setOpen(!open)} className="term-select">
          <p className="text-xs text-secondary font-medium">{t.admin.serverLocation}</p>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-primary dark:text-gray-400">
              {loading ? t.admin.loading : selected || t.admin.selectLocation}
            </span>
            <IoChevronDown className="absolute top-1/2 transform -translate-y-1/2 right-4 w-4 h-4 text-primary dark:text-gray-400" />
          </div>
        </div>

        {/* Dropdown items */}
        {open && !loading && locations.length > 0 && (
          <div className="dropdown-select">
            {locations.map((term, index) => (
              <div
                key={index}
                onClick={() => handleLocationSelect(term)}
                className={`px-4 py-2 cursor-pointer hover:bg-slatelight dark:hover:bg-gray-800 text-sm font-medium text-primary dark:text-gray-400 ${selected === term
                  ? "bg-slatelight dark:bg-gray-900 font-medium"
                  : ""
                  }`}
              >
                {term}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServerLocationstep;
