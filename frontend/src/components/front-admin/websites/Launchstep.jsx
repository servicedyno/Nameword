import { useState, useEffect, useRef } from "react";
import { MdCheck } from "react-icons/md";
import { NavLink } from "react-router";
import { hostingAPI } from "../../../api/hosting";
import { useAlert } from "../../../context/AlertContext";
import { useLanguage } from "../../../hooks/useLanguage";

const Launchstep = ({ setupData = {} }) => {
  const { t } = useLanguage();
  const [linkingStatus, setLinkingStatus] = useState(null);
  const [linkingProgress, setLinkingProgress] = useState(0);
  const [intentId, setIntentId] = useState(null);
  const [currentStep, setCurrentStep] = useState(null);
  const { showAlert } = useAlert();
  const pollingIntervalRef = useRef(null);


  const DEFAULT_HOSTING_PLAN = "pro_7day";

  // Initiate domain linking for external domains on component mount
  useEffect(() => {
    const isExternalDomain = setupData?.domainStatus === "notFound";

    if (isExternalDomain && !linkingStatus) {
      initiateDomainLinking();
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [setupData?.domainStatus]);

  const checkLinkingStatus = async () => {
    if (!setupData?.domain) return;

    try {
      const response = await hostingAPI.getLinkingStatus(setupData.domain);

      if (response?.success && response?.responseData) {
        const { status, progress, current_step } = response.responseData;

        setLinkingProgress(progress || 0);
        setCurrentStep(current_step);

        // Map HostBay status to our UI status
        if (status === "completed" || status === "linked") {
          setLinkingStatus("linked");
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          showAlert(t.admin.domainSuccessfullyLinked, { type: "success" });
        } else if (status === "failed") {
          setLinkingStatus("failed");
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        } else {

          setLinkingStatus("checking");
        }
      }
    } catch (error) {
      console.error("Error checking linking status:", error);
    }
  };

  const initiateDomainLinking = async () => {
    if (!setupData?.domain) return;

    try {
      setLinkingStatus("initiating");

      const response = await hostingAPI.linkDomainToHosting(setupData.domain, {
        linking_mode: "smart",
        hosting_plan: DEFAULT_HOSTING_PLAN,
      });

      if (response?.success && response?.responseData) {
        const { intent_id, progress_percentage, status } =
          response.responseData;

        setIntentId(intent_id);
        setLinkingProgress(progress_percentage || 5);
        setLinkingStatus("checking");

        showAlert(
          t.admin.domainLinkingInitiated,
          {
            type: "success",
          }
        );

        pollingIntervalRef.current = setInterval(() => {
          checkLinkingStatus();
        }, 10000);

        setTimeout(() => {
          checkLinkingStatus();
        }, 2000);
      } else {
        setLinkingStatus("failed");
        showAlert(
          response?.responseMsg?.message || t.admin.failedToInitiateDomainLinking,
          { type: "fail" }
        );
      }
    } catch (error) {
      console.error("Error initiating domain linking:", error);
      setLinkingStatus("failed");
      showAlert(t.admin.failedToInitiateDomainLinkingRetry, {
        type: "fail",
      });
    }
  };

  const handleRetryLinking = async () => {
    if (!setupData?.domain) return;

    try {
      setLinkingStatus("initiating");
      const response = await hostingAPI.retryLinking(setupData.domain);

      if (response?.success && response?.responseData) {
        setLinkingStatus("checking");
        showAlert(t.admin.retryingDomainLinking, { type: "success" });

        // Restart polling
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }

        pollingIntervalRef.current = setInterval(() => {
          checkLinkingStatus();
        }, 10000);

        setTimeout(() => {
          checkLinkingStatus();
        }, 2000);
      } else {
        showAlert(response?.responseMsg?.message || t.admin.failedToRetryLinking, {
          type: "fail",
        });
      }
    } catch (error) {
      console.error("Error retrying linking:", error);
      showAlert(t.admin.failedToRetryLinkingRetry, {
        type: "fail",
      });
    }
  };

  const getStatusMessage = () => {
    if (currentStep) {
      const stepMessages = {
        nameserver_verification_failed: t.admin.nameserverVerificationFailed,
        dns_propagation: t.admin.waitingForDnsPropagation,
        nameserver_verification: t.admin.verifyingNameservers,
        a_record_verification: t.admin.verifyingARecord,
      };
      return stepMessages[currentStep] || t.admin.currentStep.replace('{step}', currentStep);
    }

    switch (linkingStatus) {
      case "initiating":
        return t.admin.initiatingDomainLinking;
      case "checking":
        return t.admin.checkingDnsPropagation.replace('{progress}', linkingProgress);
      case "linked":
        return t.admin.domainSuccessfullyLinked;
      case "failed":
        return t.admin.domainLinkingFailed;
      default:
        return null;
    }
  };

  const isExternalDomain = setupData?.domainStatus === "notFound";

  return (
    <div className="py-7 px-5 space-y-5 card-essential max-w-sm mx-auto">
      <div className="flex items-center text-center justify-center flex-col py-14">
        {isExternalDomain && linkingStatus ? (
          <>
            <div className="rounded-icon-bg">
              {linkingStatus === "checking" && (
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-tealdark"></div>
              )}
              {linkingStatus === "linked" && (
                <MdCheck size={24} className="text-darkbtn dark:text-white" />
              )}
              {linkingStatus === "failed" && (
                <MdCheck size={24} className="text-red-500" />
              )}
            </div>
            <div>
              <p className="font-medium text-base text-primary dark:text-gray-300">
                {linkingStatus === "checking"
                  ? t.admin.linkingDomain
                  : linkingStatus === "linked"
                    ? t.admin.domainSuccessfullyLinkedTitle
                    : linkingStatus === "failed"
                      ? t.admin.linkingFailed
                      : t.admin.processing}
              </p>
              <p className="font-medium text-13 text-primary dark:text-gray-500 mt-2">
                {getStatusMessage()}
              </p>
              {linkingStatus === "checking" && (
                <p className="font-medium text-xs text-secondary mt-2">
                  {t.admin.dnsChangesPropagate}
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="rounded-icon-bg">
              <MdCheck size={24} className="text-darkbtn dark:text-white" />
            </div>
            <div>
              <p className="font-medium text-base text-primary dark:text-gray-300">
                {t.admin.yourHostingIsReady}
              </p>
              <p className="font-medium text-13 text-primary dark:text-gray-500">
                {t.admin.everythingIsSetUp}
              </p>
            </div>
          </>
        )}

        {linkingStatus !== "failed" && (
          <NavLink
            to={"/websites-overview"}
            className="add-to-cart !h-[50px] mt-5"
          >
            {t.admin.goToOverview}
          </NavLink>
        )}
        {linkingStatus === "failed" && (
          <button
            onClick={handleRetryLinking}
            className="add-to-cart !h-[50px] mt-5"
          >
            {t.admin.retryLinking}
          </button>
        )}
      </div>
    </div>
  );
};

export default Launchstep;
