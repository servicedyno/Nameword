import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import SimpleStepper from "../../../components/front-admin/websites/SimpleStepper";
import DomainSetupstep from "../../../components/front-admin/websites/DomainSetupstep";
import ServerLocationstep from "../../../components/front-admin/websites/ServerLocationstep";
import Securitystep from "../../../components/front-admin/websites/Securitystep";
import ControlPanelstep from "../../../components/front-admin/websites/ControlPanelstep";
import Launchstep from "../../../components/front-admin/websites/Launchstep";
import { useAlert } from "../../../context/AlertContext";
import { hostingAPI } from "../../../api/hosting";
import { useLanguage } from "../../../hooks/useLanguage";

const SetupWebsite = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const steps = [
    t.websites.setupWebsite.steps.domainSetup,
    t.websites.setupWebsite.steps.serverLocation,
    t.websites.setupWebsite.steps.controlPanel,
    t.websites.setupWebsite.steps.security,
    t.websites.setupWebsite.steps.launch,
  ];
  const [current, setCurrent] = useState(0);
  const [setupData, setSetupData] = useState({
    domain: null,
    domainStatus: null,
    dnsMethod: null,
    nameservers: null,
    aRecordIP: null,
    selectedPlan: null,
    serverLocation: null,
    serverInfo: null,
    controlPanel: null,
  });
  const securityStepRef = useRef(null);
  const domainSetupStepRef = useRef(null);
  const { showAlert } = useAlert();

  // Load selected plan from location state if available
  useEffect(() => {
    const stateSelectedPlan = location.state?.selectedPlan;

    if (stateSelectedPlan !== undefined) {
      setSetupData((prev) => ({
        ...prev,
        selectedPlan: stateSelectedPlan,
      }));
    }
  }, [location.state]);

  // Load saved setup data from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem("websiteSetupData");
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        // Only load saved data if no pre-selected domain from state
        if (!location.state?.currentDomain) {
          setSetupData(parsed);
        }
      } catch (error) {
        console.error("Failed to parse saved setup data:", error);
      }
    }
  }, [location.state]);

  // Save setup data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("websiteSetupData", JSON.stringify(setupData));
  }, [setupData]);

  // Handle domain selection from DomainSetupstep
  const handleDomainSelected = (domainData) => {
    setSetupData((prev) => ({
      ...prev,
      domain: domainData.domain,
      domainStatus: domainData.status,
      dnsMethod: domainData.dnsMethod,
      nameservers: domainData.nameservers,
      aRecordIP: domainData.aRecordIP,
      selectedPlan: domainData.selectedPlan,
    }));
  };

  const handleSelectedPlanChange = (selectedPlan) => {
    setSetupData((prev) => ({
      ...prev,
      selectedPlan: selectedPlan,
    }));
  };

  // Handle Next button click
  const handleNext = async () => {
    // If we're on Domain Setup step (step 0), just collect and validate data
    if (current === 0 && domainSetupStepRef.current) {
      // Get current domain data from the component
      const domainData = domainSetupStepRef.current.getDomainData();

      // Validate that domain information is collected
      if (!domainData || !domainData.domain || !domainData.domain.trim()) {
        showAlert(t.websites.setupWebsite.validation.domainNameRequired, { type: "fail" });
        return;
      }

      // Save the collected data (no DNS operations, just collecting info)
      handleDomainSelected(domainData);

      // Add domain as addon domain - must succeed before proceeding to next step
      try {
        const hostingOrdersResponse = await hostingAPI.getHostingOrders({
          status: "completed",
        });

        if (
          hostingOrdersResponse?.success &&
          hostingOrdersResponse?.responseData?.orders?.length > 0
        ) {
          // Find the first hosting order with a valid subscription_id
          const hostingOrder = hostingOrdersResponse.responseData.orders.find(
            (order) => {
              const subId =
                order?.hostbayResponse?.subscription?.id ||
                order?.hostbayResponse?.subscription_id;
              // Check if subscription_id exists and is valid (string or number)
              return (
                subId !== null &&
                subId !== undefined &&
                (typeof subId === "string" || typeof subId === "number") &&
                String(subId).trim().length > 0
              );
            }
          );

          if (hostingOrder && domainData.domain && domainData.domain.trim()) {
            const subscriptionId =
              hostingOrder.hostbayResponse?.subscription?.id ||
              hostingOrder.hostbayResponse?.subscription_id;

            // Validate subscription_id before making the call
            // Convert to integer as required by HostBay API
            if (subscriptionId !== null && subscriptionId !== undefined) {
              const subIdInt = parseInt(subscriptionId, 10);
              if (!isNaN(subIdInt) && subIdInt > 0) {
                const isDomainInHostBay = domainData.status === "found";
                const useDnsOnly = !isDomainInHostBay;

                const addonResponse = await hostingAPI.addAddonDomain(
                  subIdInt,
                  domainData.domain.trim(),
                  {
                    register_new: false,
                    dns_only: useDnsOnly,
                    auto_renew_domain: true,
                  }
                );

                if (addonResponse?.success) {
                  showAlert(
                    addonResponse?.responseMsg?.message ||
                      t.websites.setupWebsite.validation.domainAddedSuccess,
                    { type: "success", duration: 3000 }
                  );
                } else {
                  // If addon domain addition fails, show error and don't proceed
                  const errorMessage =
                    addonResponse?.responseMsg?.message ||
                    addonResponse?.responseData?.error?.message ||
                    t.websites.setupWebsite.validation.domainAddFailed;
                  showAlert(errorMessage, { type: "fail" });
                  return; // Don't proceed to next step
                }
              }
            }
          }
        }
      } catch (error) {
        // If error occurs, show error message and don't proceed
        const errorMessage =
          error?.response?.data?.responseMsg?.message ||
          error?.response?.data?.error?.message ||
          error?.message ||
          t.websites.setupWebsite.validation.domainAddFailedRetry;
        showAlert(errorMessage, { type: "fail" });
        return; // Don't proceed to next step
      }
    }

    if (current === 3 && securityStepRef.current) {
      try {
        const result = await securityStepRef.current.installSSL();
        if (result && !result.success) {
          showAlert(result.message || t.websites.setupWebsite.validation.sslInstallFailed, {
            type: "fail",
          });
          return; // Don't proceed to next step if installation failed
        }
        if (
          result &&
          result.success &&
          result.message !== "SSL installation skipped"
        ) {
          showAlert(
            result.message || t.websites.setupWebsite.validation.sslInstalledSuccess,
            { type: "success" }
          );
        }

        // 2. Check if hosting order exists for existing domain
        // For existing HostBay domains, check if hosting is purchased
        if (setupData?.domain && setupData?.domainStatus === "found") {
          try {
            // Check if hosting order exists for this domain
            const hostingOrdersResponse = await hostingAPI.getHostingOrders({
              domainName: setupData.domain,
              status: "completed",
            });

            const hasHostingOrder =
              hostingOrdersResponse?.success &&
              hostingOrdersResponse?.responseData?.orders?.length > 0;

            if (!hasHostingOrder) {
              // No hosting order found - redirect to hosting page to purchase
              showAlert(
                t.websites.setupWebsite.validation.hostingRequired,
                { type: "info", duration: 2000 }
              );

              // Redirect to hosting page with existing domain
              setTimeout(() => {
                navigate("/hosting", {
                  state: {
                    existingDomain: setupData.domain,
                    fromSetup: true,
                  },
                });
              }, 2000);
              return; // Don't proceed to next step
            }
            // Hosting exists - proceed normally
            console.log("Hosting order found for domain:", setupData.domain);
          } catch (orderError) {
            console.error("Error checking hosting orders:", orderError);
            // If check fails, still redirect to purchase
            showAlert(
              t.websites.setupWebsite.validation.unableToVerifyHosting,
              { type: "info", duration: 2000 }
            );

            setTimeout(() => {
              navigate("/hosting", {
                state: {
                  existingDomain: setupData.domain,
                  fromSetup: true,
                },
              });
            }, 2000);
            return; // Don't proceed to next step
          }
        }
        // Note: For external domains, domain linking is handled in Launch step
      } catch (error) {
        console.error("Error in Security step:", error);
        showAlert(error.message || t.websites.setupWebsite.validation.setupFailed, { type: "fail" });
        return; // Don't proceed to next step if processing failed
      }
    }
    // Move to next step
    setCurrent((c) => Math.min(steps.length - 1, c + 1));
  };

  return (
    <div>
      <div className="space-y-7">
        {/* title */}
        <div className="flex flex-col gap-2 title-section">
          <h2>{t.websites.setupWebsite.title}</h2>
        </div>

        {/* Stepper section */}
        <SimpleStepper
          steps={steps}
          current={current}
          // onStepClick={setCurrent}
        />

        {current === 0 && (
          <div className="table-card !rounded-b-none">
            <p className="info-card-title px-5 py-4">{t.websites.setupWebsite.steps.domainSetup}</p>
            <hr className="card-divider" />
            <DomainSetupstep
              ref={domainSetupStepRef}
              onDomainSelected={handleDomainSelected}
              onSelectedPlanChange={handleSelectedPlanChange}
              initialData={setupData}
            />
          </div>
        )}
        {current === 1 && (
          <div className="table-card !rounded-b-none">
            <p className="info-card-title px-5 py-4">{t.websites.setupWebsite.steps.serverLocation}</p>
            <hr className="card-divider" />
            <ServerLocationstep
              onLocationSelected={(location, serverInfo) => {
                setSetupData((prev) => ({
                  ...prev,
                  serverLocation: location,
                  serverInfo: serverInfo,
                }));
              }}
              initialData={setupData}
            />
          </div>
        )}
        {current === 2 && (
          <div className="table-card !rounded-b-none">
            <p className="info-card-title px-5 py-4">{t.websites.setupWebsite.steps.controlPanel}</p>
            <hr className="card-divider" />
            <ControlPanelstep
              serverInfo={setupData.serverInfo}
              onControlPanelSelected={(controlPanel) => {
                setSetupData((prev) => ({
                  ...prev,
                  controlPanel: controlPanel,
                }));
              }}
              initialData={setupData}
            />
          </div>
        )}
        {current === 3 && (
          <div className="table-card !rounded-b-none">
            <p className="info-card-title px-5 py-4">{t.websites.setupWebsite.steps.security}</p>
            <hr className="card-divider" />
            <Securitystep ref={securityStepRef} domain={setupData.domain} />
          </div>
        )}
        {current === 4 && (
          <div className="table-card">
            <p className="info-card-title px-5 py-4">{t.websites.setupWebsite.steps.launch}</p>
            <hr className="card-divider" />
            <Launchstep setupData={setupData} />
          </div>
        )}
      </div>

      {current < steps.length - 1 &&
        !(current === 0 && setupData.selectedPlan === 1) && (
          <div className="table-card !border-t-0 !rounded-t-none items-center justify-between flex gap-2 p-5 admin-btn">
            <button
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              className="btn-outline"
            >
              {t.websites.common.back}
            </button>
            <button onClick={handleNext} className="add-to-cart">
              {t.websites.common.next}
            </button>
          </div>
        )}
    </div>
  );
};

export default SetupWebsite;
