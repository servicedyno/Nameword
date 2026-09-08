import {
  useState,
  useEffect,
  useMemo,
  useImperativeHandle,
  forwardRef,
} from "react";
import { useLocation } from "react-router";
import { useCustomLocation } from "../../../hooks/useCustomLocation";
import { hostingAPI } from "../../../api/hosting";
import { useAlert } from "../../../context/AlertContext";
import { useLanguage } from "../../../hooks/useLanguage";

const Securitystep = forwardRef(({ domain: propDomain, hostingPlan, hostingPeriod, linkingMode }, ref) => {
  const { t } = useLanguage();
  const [selectedPlan, setSelectedPlan] = useState(1); // Default to "Auto-enable SSL"
  const [loading, setLoading] = useState(false);
  const [sslInstalled, setSslInstalled] = useState(false);
  const [sslStatus, setSslStatus] = useState(null); // { has_ssl, issuer, expires_at }
  const [checkingStatus, setCheckingStatus] = useState(false);
  const locationState = useCustomLocation();
  const location = useLocation();
  const { showAlert } = useAlert();

  // Get domain from prop, location state, or localStorage
  const domainName = useMemo(() => {
    if (propDomain) {
      return propDomain;
    }
    // Try to get from location state (sidebar)
    if (locationState?.currentDomain?.websiteName) {
      return locationState.currentDomain.websiteName;
    }
    // Try to get from localStorage setupData
    try {
      const savedData = localStorage.getItem("websiteSetupData");
      if (savedData) {
        const parsed = JSON.parse(savedData);
        return parsed?.domain || null;
      }
    } catch (error) {
      console.error("Failed to parse saved setup data:", error);
    }
    return null;
  }, [propDomain, locationState?.currentDomain?.websiteName]);

  // Check SSL status when domain is available (only if hosting order exists)
  // During setup flow, we skip this check since hosting doesn't exist yet
  useEffect(() => {
    const checkSSLStatus = async () => {
      if (!domainName) {
        setSslStatus(null);
        setSslInstalled(false);
        return;
      }

      try {
        setCheckingStatus(true);
        const response = await hostingAPI.getSSLStatus(domainName);

        if (response?.success && response?.responseData) {
          const status = response.responseData;
          setSslStatus(status);
          if (status.has_ssl) {
            setSslInstalled(true);
            // Auto-select option 1 if SSL is already installed
            setSelectedPlan(1);
          }
        } else {
          // SSL not installed or error (404 means hosting order doesn't exist yet - this is OK during setup)
          if (response?.responseMsg?.statusCode === 404) {
            // Hosting order not found - this is expected during setup flow
            setSslStatus({ has_ssl: false, isSetupFlow: true });
            setSslInstalled(false);
          } else {
            setSslStatus({ has_ssl: false });
            setSslInstalled(false);
          }
        }
      } catch (error) {
        console.error("Error checking SSL status:", error);
        // If 404 error, it means hosting order doesn't exist yet (expected during setup)
        if (
          error?.response?.status === 404 ||
          error?.response?.data?.responseMsg?.statusCode === 404
        ) {
          setSslStatus({ has_ssl: false, isSetupFlow: true });
        } else {
          setSslStatus({ has_ssl: false });
        }
        setSslInstalled(false);
      } finally {
        setCheckingStatus(false);
      }
    };

    checkSSLStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domainName]);

  // Helper function to get plan code from existing hosting order
  const getPlanFromExistingHosting = async () => {
    try {
      // Fetch user's existing hosting orders
      const hostingResponse = await hostingAPI.getHostingOrders({
        status: "completed",
      });

      let allOrders = [];
      if (hostingResponse?.success) {
        if (Array.isArray(hostingResponse.responseData?.orders)) {
          allOrders = hostingResponse.responseData.orders;
        } else if (Array.isArray(hostingResponse.responseData)) {
          allOrders = hostingResponse.responseData;
        } else if (Array.isArray(hostingResponse.data?.orders)) {
          allOrders = hostingResponse.data.orders;
        } else if (Array.isArray(hostingResponse.data)) {
          allOrders = hostingResponse.data;
        } else if (Array.isArray(hostingResponse.orders)) {
          allOrders = hostingResponse.orders;
        }

        // If single order object, wrap in array
        if (
          allOrders.length === 0 &&
          hostingResponse.responseData &&
          typeof hostingResponse.responseData === "object" &&
          !Array.isArray(hostingResponse.responseData)
        ) {
          if (
            hostingResponse.responseData.domainName ||
            hostingResponse.responseData.plan
          ) {
            allOrders = [hostingResponse.responseData];
          }
        }
      }

      if (allOrders.length === 0) {
        return null;
      }

      // Get the first active hosting order
      const existingOrder = allOrders[0];

      // Extract plan code from hosting order
      // Priority: order.plan > planSnapshot.code > planSnapshot.whm_package > planSnapshot.plan_code
      const planCode =
        existingOrder.plan ||
        existingOrder.planSnapshot?.code ||
        existingOrder.planSnapshot?.whm_package ||
        existingOrder.planSnapshot?.plan_code ||
        existingOrder.hostbayResponse?.plan_details?.code ||
        existingOrder.hostbayResponse?.plan_details?.whm_package ||
        null;

      return planCode;
    } catch (error) {
      console.error("Error fetching existing hosting orders:", error);
      return null;
    }
  };

  // Helper function to create hosting order
  const createHostingOrder = async () => {
    if (!domainName) {
      console.warn("Cannot create hosting order: domain name missing");
      return { success: false, message: "Domain name is required" };
    }

    try {
      // Get hosting plan data from props, location.state, setupData, or existing hosting order
      let setupData = null;
      try {
        const savedData = localStorage.getItem("websiteSetupData");
        if (savedData) {
          setupData = JSON.parse(savedData);
        }
      } catch (e) {
        console.error("Failed to parse setupData:", e);
      }

      // Priority: props > location.state > setupData > existing hosting order
      let plan = hostingPlan || 
                 location?.state?.hostingPlan || 
                 location?.state?.plan || 
                 location?.state?.planCode ||
                 location?.state?.plan_code ||
                 setupData?.hostingPlan || 
                 setupData?.plan || 
                 setupData?.planCode ||
                 setupData?.plan_code;

      // If plan not found, get from existing hosting order
      if (!plan) {
        plan = await getPlanFromExistingHosting();
      }

      if (!plan) {
        console.warn("Cannot create hosting order: plan code not found");
        return { success: false, message: "Hosting plan code is required. Please ensure you have an active hosting order." };
      }

      const period = hostingPeriod || 
                     location?.state?.hostingPeriod || 
                     location?.state?.period || 
                     setupData?.hostingPeriod || 
                     setupData?.period || 
                     1;

      let domain_type = "existing"; // default
      const selectedPlan = setupData?.selectedPlan || location?.state?.selectedPlan;
      const domainStatus = setupData?.domainStatus || location?.state?.domainStatus;
      
      if (selectedPlan === 1) {
        // User selected "Register a New Domain"
        domain_type = "new";
      } else if (selectedPlan === 2) {
        // User selected "Use an Existing Domain"
        if (domainStatus === "found") {
          // Domain exists in user's account (and should be in HostBay account)
          domain_type = "existing";
        } else if (domainStatus === "notFound") {
          // Domain is external (registered elsewhere, not in HostBay account)
          domain_type = "external";
        }
      }

      console.log("Creating hosting order with:", { 
        domain_name: domainName, 
        domain_type, 
        plan, 
        period,
        selectedPlan,
        domainStatus
      });

      const hostingOrderResponse = await hostingAPI.createHostingForExistingDomain({
        domain_name: domainName,
        domain_type: domain_type,
        plan: plan,
        period: period,
      });

      if (hostingOrderResponse?.success) {
        console.log("Hosting order created successfully:", hostingOrderResponse);
        return { 
          success: true, 
          message: "Hosting order created successfully",
          data: hostingOrderResponse 
        };
      } else {
        console.warn("Hosting order creation failed:", hostingOrderResponse);
        return { 
          success: false, 
          message: hostingOrderResponse?.responseMsg?.message || "Failed to create hosting order" 
        };
      }
    } catch (hostingOrderError) {
      console.error("Error creating hosting order:", hostingOrderError);
      return { 
        success: false, 
        message: hostingOrderError?.response?.data?.responseMsg?.message || "Failed to create hosting order" 
      };
    }
  };

  // Expose installSSL method to parent component via ref
  useImperativeHandle(ref, () => ({
    installSSL: async () => {
      // Only call hosting order API (SSL will be handled automatically by hosting)
      if (selectedPlan === 1 && domainName) {
        try {
          setLoading(true);
          const hostingResult = await createHostingOrder();
          if (hostingResult.success) {
            return {
              success: true,
              message: hostingResult.message || "Hosting order created successfully. SSL will be automatically installed when your hosting account is ready.",
            };
          } else {
            return {
              success: false,
              message: hostingResult.message || "Failed to create hosting order",
            };
          }
        } catch (error) {
          console.error("Error creating hosting order:", error);
          return {
            success: false,
            message: error?.response?.data?.responseMsg?.message || "Failed to create hosting order",
          };
        } finally {
          setLoading(false);
        }
      }

      // If user didn't select option 1, return success (no installation needed)
      return { success: true, message: "SSL installation skipped" };
    },
  }));

  const handlePlanChange = (plan) => {
    if (loading) return; // Prevent changes while loading
    setSelectedPlan(plan);
    if (plan === 2) {
      // Reset SSL installed state if user chooses not to use SSL
      setSslInstalled(false);
    }
  };

  return (
    <div className="py-7 px-5 space-y-4">
      <div className="flex flex-col w-full gap-2.5">
        <p className="text-primary dark:text-gray-500 text-13 font-medium">
          {t.admin.enableFreeSsl}
        </p>
        <div>
          <label
            className={`choose-plan-price mb-1 ${
              selectedPlan === 1 ? "selected" : ""
            } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="flex items-start gap-2">
              <div className="mt-1">
                <input
                  type="radio"
                  name="plan"
                  checked={selectedPlan === 1}
                  onChange={() => handlePlanChange(1)}
                  disabled={loading}
                  className="sr-only"
                />
                <div
                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors duration-200 ${
                    selectedPlan === 1
                      ? "border-tealdark bg-tealdark"
                      : "border-gray-400"
                  }`}
                >
                  {selectedPlan === 1 && (
                    <div className="w-1.5 h-1.5 bg-white dark:bg-gray-800 rounded-full"></div>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <p className="font-medium text-15 text-primary dark:text-gray-300">
                  {t.admin.autoEnableSsl}
                </p>
                {checkingStatus && (
                  <p className="text-sm text-gray-500 mt-1">
                    {t.admin.checkingSslStatus}
                  </p>
                )}
                {!checkingStatus &&
                  selectedPlan === 1 &&
                  sslInstalled &&
                  sslStatus?.has_ssl && (
                    <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                      {t.admin.sslCertificateInstalled}
                      {sslStatus?.issuer && ` (${sslStatus.issuer})`}
                      {sslStatus?.expires_at &&
                        ` - ${t.admin.expires}: ${new Date(
                          sslStatus.expires_at
                        ).toLocaleDateString()}`}
                    </p>
                  )}
              </div>
            </div>
          </label>

          {/* <label
            className={`choose-plan-price mb-1 ${
              selectedPlan === 2 ? "selected" : ""
            } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="flex items-start gap-2">
              <div className="mt-1">
                <input
                  type="radio"
                  name="plan"
                  checked={selectedPlan === 2}
                  onChange={() => handlePlanChange(2)}
                  disabled={loading}
                  className="sr-only"
                />
                <div
                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors duration-200 ${
                    selectedPlan === 2
                      ? "border-tealdark bg-tealdark"
                      : "border-gray-400"
                  }`}
                >
                  {selectedPlan === 2 && (
                    <div className="w-1.5 h-1.5 bg-white dark:bg-gray-800 rounded-full"></div>
                  )}
                </div>
              </div>
              <p className="font-medium text-15 text-primary dark:text-gray-300">
                I don't need SSL for now
              </p>
            </div>
          </label> */}
        </div>
        {!domainName && (
          <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
            {t.admin.pleaseSelectDomainToEnableSsl}
          </p>
        )}
      </div>
    </div>
  );
});

export default Securitystep;
