import { useState, useEffect } from "react";
import ChangeServerLocation from "../../../components/modals/change-server-location";
import { useLanguage } from "../../../hooks/useLanguage";
import { hostingAPI } from "../../../api/hosting";

const ServerDetailsCard = ({ hostingOrder }) => {
  const { t } = useLanguage();
  // Modal click
  const [isOpen, setIsOpen] = useState(false);
  // Server info state
  const [serverInfo, setServerInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch server info from API
  useEffect(() => {
    const fetchServerInfo = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get domain name from hosting order if available
        const domainName =
          hostingOrder?.domain_name || hostingOrder?.domainName;

        const response = await hostingAPI.getServerInfo(domainName);

        if (response?.success && response?.responseData) {
          setServerInfo(response.responseData);
        } else {
          throw new Error("Failed to fetch server information");
        }
      } catch (err) {
        console.error("Error fetching server info:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchServerInfo();
  }, [hostingOrder]);

  // Get server details with fallback to hosting order data
  const serverName =
    serverInfo?.server_name ||
    serverInfo?.server ||
    serverInfo?.hostname ||
    hostingOrder?.hostbayResponse?.server_name ||
    hostingOrder?.hostbayResponse?.server ||
    hostingOrder?.hostbayResponse?.hostname ||
    "N/A";

  // Handle serverLocation that might be an object
  const getServerLocation = () => {
    const locationData =
      serverInfo?.server_location ||
      serverInfo?.location ||
      serverInfo?.datacenter ||
      hostingOrder?.hostbayResponse?.server_location ||
      hostingOrder?.hostbayResponse?.location ||
      hostingOrder?.hostbayResponse?.datacenter;

    if (!locationData) return "N/A";

    // If it's an object, try to format it nicely
    if (typeof locationData === "object" && locationData !== null) {
      // Try common location object properties
      if (locationData.region && locationData.country) {
        return `${locationData.region}, ${locationData.country}`;
      } else if (locationData.datacenter) {
        return locationData.datacenter;
      } else if (locationData.region) {
        return locationData.region;
      } else if (locationData.country) {
        return locationData.country;
      } else {
        // Fallback: stringify the object
        return JSON.stringify(locationData);
      }
    }

    return String(locationData);
  };

  const serverLocation = getServerLocation();

  return (
    <div className="table-card">
      <div className="flex justify-between items-center gap-2 px-5 py-2.5">
        <p className="info-card-title">{t.admin.serverDetails}</p>
      </div>
      <hr className="card-divider" />

      <div className="py-7 px-5 space-y-4 card-essential">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="text-red-500 text-center py-4">
            <p>Failed to load server information</p>
            <button
              onClick={() => window.location.reload()}
              className="text-primary hover:underline mt-2"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 info-detail">
              <p className="text-secondary">{t.admin.serverName}</p>
              <span className="text-primary dark:text-white">{serverName}</span>
            </div>
            <div className="flex items-center gap-2 info-detail">
              <p className="text-secondary">{t.admin.serverLocation}</p>
              <span className="text-primary dark:text-white flex items-center gap-1">
                {serverLocation}
                <button
                  onClick={() => setIsOpen(true)}
                  className="text-darkbtn dark:text-white inline-flex items-center gap-1"
                >
                  <svg
                    width="16"
                    height="17"
                    viewBox="0 0 11 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M2.20237 9.63997C2.09756 9.63997 2.00956 9.60453 1.93837 9.53364C1.86717 9.46275 1.83173 9.37475 1.83203 9.26964V8.79297C1.83203 8.69153 1.85189 8.59497 1.89162 8.50331C1.93134 8.41164 1.98466 8.3325 2.05157 8.26589L7.87287 2.43818C7.91962 2.39632 7.97141 2.36393 8.02824 2.34102C8.08507 2.3181 8.14435 2.30664 8.20607 2.30664C8.2678 2.30664 8.32738 2.31642 8.38482 2.33597C8.44227 2.35553 8.49574 2.39036 8.54524 2.44047L9.03428 2.93272C9.0847 2.98131 9.11923 3.03478 9.13787 3.09314C9.1562 3.1512 9.16537 3.20925 9.16537 3.26731C9.16537 3.32964 9.15498 3.38922 9.1342 3.44606C9.11312 3.50259 9.07981 3.55438 9.03428 3.60143L3.20612 9.42043C3.13981 9.48704 3.06067 9.54021 2.9687 9.57993C2.87673 9.61966 2.78017 9.63967 2.67903 9.63997H2.20237ZM8.02137 3.9516L8.70703 3.27418L8.19782 2.76497L7.52087 3.45064L8.02137 3.9516Z"
                      fill="currentcolor"
                    />
                  </svg>
                </button>
              </span>
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {isOpen && <ChangeServerLocation onClose={() => setIsOpen(false)} />}
    </div>
  );
};

export default ServerDetailsCard;
