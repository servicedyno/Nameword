import {
  useState,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import { FiCheck, FiInfo } from "react-icons/fi";
import { PiWarningBold, PiArrowArcRightFill } from "react-icons/pi";
import { TbCopy } from "react-icons/tb";
import { Tooltip } from "react-tooltip";
import { useNavigate } from "react-router";
import { domainAPI, dnsAPI } from "../../../api/domains";
import { hostingAPI } from "../../../api/hosting";
import { copyToClipboard } from "../../../utils/copyToClipboard";
import { useAlert } from "../../../context/AlertContext";
import RegisterDomainModal from "../../modals/register-domain-modal";
import { useLanguage } from "../../../hooks/useLanguage";

const DomainSetupstep = forwardRef(
  ({ onDomainSelected, onSelectedPlanChange, initialData = {} }, ref) => {
    const { t } = useLanguage();
    const [selectedPlan, setSelectedPlan] = useState(
      initialData.selectedPlan || 1
    );

    const [domainName, setDomainName] = useState(initialData.domain || "");
    const [domainStatus, setDomainStatus] = useState(
      initialData.domainStatus || null
    );
    const [dnsMethod, setDnsMethod] = useState(initialData.dnsMethod || 1); // 1 = Nameservers, 2 = A-Record
    const [nameservers, setNameservers] = useState(
      initialData.nameservers || []
    );
    const [aRecordIP, setARecordIP] = useState(
      initialData.aRecordIP || "123.45.67.89"
    );

    const [ownedDomains, setOwnedDomains] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const navigate = useNavigate();
    const { showAlert } = useAlert();

    // Default nameservers
    const defaultNameservers = ["ns1.nameword.com", "ns2.dns-parking.com"];

    // Fetch user's owned domains only when domain is entered and user wants to check
    const fetchOwnedDomains = useCallback(async () => {
      try {
        const response = await domainAPI.domainList();
        const list = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
            ? response
            : [];
        setOwnedDomains(list);
      } catch (error) {
        console.error("Failed to fetch owned domains:", error);
      }
    }, []);

    // Check if domain exists in user's account
    const checkDomainInAccount = useCallback(
      async (domain) => {
        if (!domain || domain.trim().length === 0) {
          setDomainStatus(null);
          return;
        }

        setDomainStatus("checking");
        try {
          const trimmedDomain = domain.trim().toLowerCase();
          let domainInList = false;
          let domainList = [];

          // Fetch owned domains first if not already fetched
          if (ownedDomains.length === 0) {
            const response = await domainAPI.domainList();
            domainList = Array.isArray(response?.data)
              ? response.data
              : Array.isArray(response)
                ? response
                : [];
            setOwnedDomains(domainList);
          } else {
            domainList = ownedDomains;
          }

          domainInList = domainList.find((d) => {
            const domainName = d?.websiteName || d?.domainName || d?.name || "";
            return domainName.toLowerCase() === trimmedDomain;
          });

          if (domainInList) {
            setDomainStatus("found");
            return; // Domain found, no need to set up DNS info
          } else {
            setDomainStatus("notFound");
          }

          // Domain not found - set up DNS info for external domain
          // Use server info if available (from server location step)
          if (initialData?.serverInfo) {
            const serverData = initialData.serverInfo;
            const cloudflareNameservers =
              serverData.cloudflare_nameservers || [];
            const serverIP = serverData.ip_address;

            if (cloudflareNameservers.length > 0) {
              setNameservers(cloudflareNameservers);
            } else {
              setNameservers(defaultNameservers);
            }

            if (serverIP) {
              setARecordIP(serverIP);
            }
          } else {
            // Fetch Cloudflare nameservers and server IP for external domain
            try {
              const controlPanel = initialData?.controlPanel || "cpanel";
              const dnsInfoResponse =
                await hostingAPI.getExternalDomainDNSInfo({
                  domain: trimmedDomain,
                  controlPanel: controlPanel,
                });

              if (dnsInfoResponse?.success && dnsInfoResponse?.responseData) {
                const cloudflareNameservers =
                  dnsInfoResponse.responseData.nameservers || [];
                const serverIP = dnsInfoResponse.responseData.serverIP;

                if (cloudflareNameservers.length > 0) {
                  setNameservers(cloudflareNameservers);
                } else {
                  setNameservers(defaultNameservers);
                }

                if (serverIP) {
                  setARecordIP(serverIP);
                }
              } else {
                setNameservers(defaultNameservers);
              }
            } catch (error) {
              console.error("Error fetching DNS info:", error);
              setNameservers(defaultNameservers);
            }
          }
        } catch (error) {
          console.error("Error checking domain:", error);
          setDomainStatus("notFound");
          setNameservers(defaultNameservers);
        }
      },
      [ownedDomains, initialData]
    );

    // Debounced domain check - only when user types
    useEffect(() => {
      if (selectedPlan === 2 && domainName.trim().length > 0) {
        const timeoutId = setTimeout(() => {
          checkDomainInAccount(domainName);
        }, 500);
        return () => clearTimeout(timeoutId);
      } else if (selectedPlan === 2 && domainName.trim().length === 0) {
        setDomainStatus(null);
      }
    }, [domainName, selectedPlan, checkDomainInAccount]);

    // Restore domain data when initialData is provided (e.g., when user goes back to this step)
    useEffect(() => {
      if (initialData?.domain) {
        setDomainName(initialData.domain);
        setDomainStatus(initialData.domainStatus);
        setDnsMethod(initialData.dnsMethod || 1);

        // Use server info if available (preferred over saved nameservers/IP)
        if (initialData?.serverInfo) {
          const serverData = initialData.serverInfo;
          const cloudflareNameservers = serverData.cloudflare_nameservers || [];
          const serverIP = serverData.ip_address;

          if (cloudflareNameservers.length > 0) {
            setNameservers(cloudflareNameservers);
          } else {
            setNameservers(initialData.nameservers || []);
          }

          if (serverIP) {
            setARecordIP(serverIP);
          } else {
            setARecordIP(initialData.aRecordIP || "123.45.67.89");
          }
        } else {
          setNameservers(initialData.nameservers || []);
          setARecordIP(initialData.aRecordIP || "123.45.67.89");
        }

        if (initialData.selectedPlan) {
          setSelectedPlan(initialData.selectedPlan);
        }

      }
    }, [initialData?.domain, initialData?.serverInfo]); // Run when domain or server info changes

    // Reset domain status when switching options (only if no saved domain)
    useEffect(() => {
      if (!initialData?.domain) {
        setDomainName("");
        setDomainStatus(null);
        setDnsMethod(1);
      }
    }, [selectedPlan]);

    // Calculate display nameservers
    const displayNameservers =
      nameservers.length > 0 ? nameservers : defaultNameservers;

    // Expose methods to parent component via ref
    useImperativeHandle(ref, () => ({
      // Just return collected data - no DNS operations
      getDomainData: () => {
        return {
          domain: domainName.trim(),
          status: domainStatus,
          selectedPlan: selectedPlan,
          dnsMethod: dnsMethod,
          nameservers: displayNameservers,
          aRecordIP: aRecordIP,
        };
      },
    }));

    // Handle Get Domain button (open registration modal)
    const handleGetDomain = () => {
      if (!domainName.trim()) {
        showAlert(t.admin.pleaseEnterDomainName, { type: "fail" });
        return;
      }
      setIsRegisterModalOpen(true);
    };

    // Handle Use This Domain button - just collect data, don't link
    const handleUseDomain = () => {
      if (!domainName.trim()) {
        showAlert(t.admin.pleaseEnterDomainName, { type: "fail" });
        return;
      }
      if (domainStatus !== "found") {
        showAlert(t.admin.pleaseVerifyDomainFirst, { type: "fail" });
        return;
      }

      // Just collect the data - don't link the domain
      // The linking will happen later when creating the cPanel/Plesk plan
      const domainData = {
        domain: domainName.trim(),
        status: "found",
        selectedPlan: selectedPlan,
        dnsMethod: null,
        nameservers: null,
        aRecordIP: null,
      };

      if (onDomainSelected) {
        onDomainSelected(domainData);
      }

      showAlert(t.admin.domainInformationSaved, {
        type: "success",
      });
    };

    // Handle Continue with External Domain (for domains not found in account)
    const handleContinueWithExternalDomain = () => {
      if (!domainName.trim()) {
        showAlert(t.admin.pleaseEnterDomainName, { type: "fail" });
        return;
      }
      if (domainStatus === "notFound") {
        const domainData = {
          domain: domainName.trim(),
          status: "notFound",
          selectedPlan: selectedPlan,
          dnsMethod: dnsMethod,
          nameservers: displayNameservers,
          aRecordIP: aRecordIP,
        };

        if (onDomainSelected) {
          onDomainSelected(domainData);
        }

        showAlert(
          t.admin.domainSetupSaved,
          {
            type: "success",
          }
        );
      } else {
        showAlert(t.admin.pleaseVerifyDomainFirst, { type: "fail" });
      }
    };

    // Handle copy to clipboard
    const handleCopy = (text) => {
      copyToClipboard(text, (message) => {
        showAlert(message, { type: "success" });
      });
    };

    return (
      <div className="py-7 px-5 space-y-4 card-essential">
        <div className="flex flex-col w-full gap-2.5">
          <p className="text-primary dark:text-gray-500 text-13 font-medium">
            {t.admin.chooseTheOption}
          </p>
          <div>
            <label
              className={`choose-plan-price mb-1 ${selectedPlan === 1 ? "selected" : ""
                }`}
            >
              <div className="flex items-start gap-2">
                <div className="mt-1">
                  <input
                    type="radio"
                    name="plan"
                    checked={selectedPlan === 1}
                    onChange={() => {
                      setSelectedPlan(1);
                      if (onSelectedPlanChange) {
                        onSelectedPlanChange(1);
                      }
                    }}
                    className="sr-only"
                  />

                  <div
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors duration-200 ${selectedPlan === 1
                      ? "border-tealdark bg-tealdark"
                      : "border-gray-400"
                      }`}
                  >
                    {selectedPlan === 1 && (
                      <div className="w-1.5 h-1.5 bg-white dark:bg-gray-800 rounded-full"></div>
                    )}
                  </div>
                </div>
                <p className="font-medium text-15 text-primary dark:text-gray-300">
                  {t.admin.registerANewDomain}
                </p>
              </div>
            </label>
            <label
              className={`choose-plan-price mb-1 ${selectedPlan === 2 ? "selected" : ""
                }`}
            >
              <div className="flex items-start gap-2">
                <div className="mt-1">
                  <input
                    type="radio"
                    name="plan"
                    checked={selectedPlan === 2}
                    onChange={() => {
                      setSelectedPlan(2);
                      if (onSelectedPlanChange) {
                        onSelectedPlanChange(2);
                      }
                    }}
                    className="sr-only"
                  />

                  <div
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors duration-200 ${selectedPlan === 2
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
                  {t.admin.useAnExistingDomain}
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Register a New Domain */}
        {selectedPlan === 1 && (
          <div className="flex flex-col gap-2.5 2xl:w-2/5 xl:w-1/2 lg:w-3/4 w-full">
            <p className="text-primary dark:text-gray-500 text-13 font-medium">
              {t.admin.enterTheDomain}
            </p>
            <div className="flex sm:flex-row flex-col items-center justify-center gap-3">
              <div className="relative input-admin w-full flex justify-between items-center">
                <input
                  type="text"
                  placeholder="applesample.com"
                  className="w-full !pr-16 !outline-0"
                  value={domainName}
                  onChange={(e) => setDomainName(e.target.value)}
                />
                {domainName.trim().length > 0 && (
                  <FiCheck size={20} className="text-sucess-400" />
                )}
              </div>
              <button
                className="add-to-cart !h-[50px] sm:w-auto w-full"
                onClick={handleGetDomain}
                disabled={!domainName.trim()}
              >
                {t.admin.getDomain}
              </button>
            </div>
            <p className="text-13 font-medium text-secondary">
              {t.admin.youWillBeRedirected}
            </p>
          </div>
        )}

        {/* Use an Existing Domain */}
        {selectedPlan === 2 && (
          <>
            <div className="flex flex-col gap-2.5 2xl:w-2/5 xl:w-1/2 lg:w-3/4 w-full">
              <p className="text-primary dark:text-gray-500 text-13 font-medium">
                {t.admin.enterTheDomain}
              </p>
              <div className="flex items-center justify-center gap-3">
                <div className="relative input-admin w-full flex justify-between items-center">
                  <input
                    type="text"
                    placeholder="applesample.com"
                    className="w-full !pr-16 !outline-0"
                    value={domainName}
                    onChange={(e) => setDomainName(e.target.value)}
                  />
                  {domainStatus === "checking" && (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-tealdark"></div>
                  )}
                  {domainStatus === "found" && (
                    <FiCheck size={20} className="text-sucess-400" />
                  )}
                  {domainStatus === "notFound" && (
                    <PiWarningBold size={20} className="text-golder" />
                  )}
                </div>
              </div>

              {/* Domain found in account */}
              {domainStatus === "found" && (
                <>
                  <div className="flex gap-2.5 text-sucess-400 bg-sucess-50 dark:bg-green-700/30 border border-sucess-100 dark:border-green-900 rounded-md px-4 py-2.5 text-xs font-medium">
                    <FiCheck size={16} />
                    {t.admin.weFoundThisDomain}
                  </div>
                  <div className="flex justify-start">
                    <button
                      className="add-to-cart !h-[50px] sm:w-auto w-full"
                      onClick={handleUseDomain}
                    >
                      {t.admin.useThisDomain}
                    </button>
                  </div>
                  <p className="text-13 font-medium text-secondary">
                    {t.admin.thisDomainWillBeUsed}
                  </p>
                </>
              )}

              {/* Domain not found in account - show DNS configuration */}
              {domainStatus === "notFound" && domainName.trim().length > 0 && (
                <>
                  <div className="flex gap-2.5 text-golder dark:text-amber-100 bg-golder-50 dark:bg-amber-900/20 border border-golder-100 dark:border-amber-700/40 rounded-md px-4 py-2.5 text-xs font-medium">
                    <PiWarningBold size={16} />
                    <p className="flex-1">
                      {t.admin.domainRegisteredElsewhere}
                    </p>
                  </div>

                  <div className="table-card p-4">
                    <div className="flex justify-between items-center gap-2 tooltip-container">
                      <p className="info-card-title flex gap-2">
                        <PiArrowArcRightFill size={20} /> {t.admin.chooseTheWayToPointDomain}
                      </p>
                      <FiInfo
                        className="text-primary dark:text-gray-500"
                        data-tooltip-id="control-panel"
                        data-tooltip-place="bottom"
                      />

                      <Tooltip id="control-panel" clickable className="tooltip">
                        <div>
                          <div className="flex flex-col gap-2.5 text-left">
                            <span>
                              {t.admin.changeNameservers} <br />
                              {t.admin.delegateFullDnsControl} <br />
                              {t.admin.replaceNameservers}
                            </span>
                            <span>
                              {t.admin.updateARecord} <br />
                              {t.admin.keepDnsAtRegistrar} <br />
                              {t.admin.updateARecordToPoint}
                            </span>
                          </div>
                        </div>
                      </Tooltip>
                    </div>
                    <hr className="card-divider my-4" />

                    <div className="flex flex-row items-center flex-wrap sm:gap-5 gap-3 mb-4">
                      <label
                        className={`flex items-start gap-2 ${dnsMethod === 1 ? "selected" : ""
                          }`}
                      >
                        <div className="mt-0.5 relative">
                          <input
                            type="radio"
                            name="dnsMethod"
                            checked={dnsMethod === 1}
                            onChange={() => setDnsMethod(1)}
                            className="sr-only"
                          />

                          <div
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors duration-200 
                                                    ${dnsMethod === 1
                                ? "border-tealdark bg-tealdark"
                                : "border-gray-400"
                              }`}
                          >
                            {dnsMethod === 1 && (
                              <div className="w-1.5 h-1.5 bg-white dark:bg-gray-800 rounded-full"></div>
                            )}
                          </div>
                        </div>
                        <p className="font-medium text-13 text-primary dark:text-gray-300">
                          {t.admin.nameserversChange}
                        </p>
                      </label>
                      <label
                        className={`flex items-start gap-2 ${dnsMethod === 2 ? "selected" : ""
                          }`}
                      >
                        <div className="mt-0.5 relative">
                          <input
                            type="radio"
                            name="dnsMethod"
                            checked={dnsMethod === 2}
                            onChange={() => setDnsMethod(2)}
                            className="sr-only"
                          />

                          <div
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors duration-200 
                                                    ${dnsMethod === 2
                                ? "border-tealdark bg-tealdark"
                                : "border-gray-400"
                              }`}
                          >
                            {dnsMethod === 2 && (
                              <div className="w-1.5 h-1.5 bg-white dark:bg-gray-800 rounded-full"></div>
                            )}
                          </div>
                        </div>
                        <p className="font-medium text-13 text-primary dark:text-gray-300">
                          {t.admin.aRecordUpdate}
                        </p>
                      </label>
                    </div>

                    {/* Nameservers Change */}
                    {dnsMethod === 1 && (
                      <div>
                        {displayNameservers.map((ns, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 info-detail text-primary dark:text-white !flex-row mb-2"
                          >
                            <span>{ns}</span>
                            <button
                              onClick={() => handleCopy(ns)}
                              className="cursor-pointer hover:opacity-80"
                            >
                              <TbCopy
                                size={14}
                                className="text-darkbtn dark:text-white"
                              />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* A-Record Update */}
                    {dnsMethod === 2 && (
                      <div>
                        <div className="flex justify-between gap-3 w-full mt-2">
                          <div className="flex flex-col gap-2">
                            <p className="text-secondary text-13">{t.admin.type}</p>
                            <span className="text-primary dark:text-white text-13 font-medium">
                              A
                            </span>
                          </div>
                          <div className="flex flex-col gap-2">
                            <p className="text-secondary text-13">{t.admin.name}</p>
                            <span className="text-primary dark:text-white text-13 font-medium">
                              @
                            </span>
                          </div>
                          <div className="flex flex-col gap-2 flex-1">
                            <p className="text-secondary text-13">{t.admin.value}</p>
                            <div className="flex items-center gap-2 text-primary dark:text-white !flex-row">
                              <span className="text-13 font-medium">
                                {aRecordIP}
                              </span>
                              <button
                                onClick={() => handleCopy(aRecordIP)}
                                className="cursor-pointer hover:opacity-80 flex-shrink-0"
                              >
                                <TbCopy
                                  size={14}
                                  className="text-darkbtn dark:text-white"
                                />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <hr className="card-divider my-4" />

                    <p className="text-13 text-secondary flex gap-1 items-center font-medium">
                      <FiCheck size={20} /> {t.admin.updateDnsSettings}
                    </p>
                    <p className="text-13 text-secondary flex gap-1 items-center font-medium">
                      <FiCheck size={20} /> {t.admin.dnsChangesPropagateWithin}
                    </p>
                    <p className="text-13 text-secondary flex gap-1 items-center font-medium">
                      <FiCheck size={20} /> {t.admin.weWillAutomaticallyCheck}
                    </p>
                    {/* <div className="flex justify-start mt-4">
                    <button
                      className="add-to-cart !h-[50px] sm:w-auto w-full"
                      onClick={handleContinueWithExternalDomain}
                    >
                      Use this domain
                    </button>
                  </div> */}
                  </div>
                </>
              )}
            </div>
          </>
        )}
        {isRegisterModalOpen && (
          <RegisterDomainModal
            onClose={() => setIsRegisterModalOpen(false)}
            domainName={domainName.trim()}
            pricingProvider="hostbay"
          />
        )}
      </div>
    );
  }
);

export default DomainSetupstep;
