import { IoClose, IoCopyOutline, IoCheckmarkCircle } from "react-icons/io5";
import { PiWarningBold } from "react-icons/pi";
import { useState } from "react";
import { useLanguage } from "../../hooks/useLanguage";

const DNSInstructionsModal = ({ dnsData = {} }) => {
  const { t } = useLanguage();
  const [copiedIndex, setCopiedIndex] = useState(null);



  if (!dnsData || Object.keys(dnsData)?.length < 1) {
    return null
  }

  // Extract DNS instructions from the data
  const dnsInstructions = dnsData?.hostbayResponse?.dns_instructions || {};
  const nameservers = dnsInstructions?.nameservers || [];
  const instructions = dnsInstructions?.instructions || [];
  const message = dnsInstructions?.message || t.admin.dnsConfigurationRequired;
  const estimatedPropagation = dnsInstructions?.estimated_propagation || t.admin.dnsPropagationTimeDefault || "24-48 hours";
  const domainName = dnsData?.domainName || t.admin.yourDomain;
  const status = dnsData?.hostbayResponse?.nameserver_status || t.admin.manualUpdateRequired;

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const onClose = () => {
    document.getElementById("dns-in")?.remove();
    window.location.href = "/websites";
  }

  return (
    <div className="fixed inset-0 z-50 bg-white/80 dark:bg-gray-600/80 overflow-auto py-5 px-3" id="dns-in">
      <div className="flex items-start justify-center w-full h-full">
        <div className="modal-dialog max-w-2xl">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
          >
            <IoClose className='text-primary dark:text-gray-500' size={30} />
          </button>

          {/* Modal Title */}
          <div className="flex flex-col gap-2 mb-3">
            <h2 className="modal-title">
              {t.admin.dnsSetupInstructions}
              <p className="text-15 font-medium text-secondary mt-1">
                {t.admin.configureNameserversFor.replace("{domain}", domainName)}
              </p>
            </h2>
          </div>

          <div className='flex items-start justify-between gap-2 px-4 py-2.5 rounded-md border border-stokecolor dark:border-gray-700 mb-3 bg-mutebg dark:bg-gray-800 mt-2.5
          '>
            <PiWarningBold className="text-secondary mt-0.5 flex-shrink-0" size={18} />
            <div className='flex flex-col justify-center gap-1 text-secondary'>
              <span className="text-sm font-semibold text-primary dark:text-white">
                {status === t.admin.manualUpdateRequired ? t.admin.actionRequired : t.admin.configurationStatus}
              </span>
              <span className="text-xs font-medium text-secondary">
                {message}
              </span>
            </div>
          </div>


          {/* Step-by-Step Instructions */}
          <div className="mb-5">
            <h3 className="text-base font-semibold text-primary dark:text-white mb-3">
              {t.admin.setupSteps}
            </h3>
            <div className="space-y-3">
              {instructions.map((instruction, index) => {
                // Check if this is a sub-item (starts with spaces and dash)
                const isSubItem = instruction.trim().startsWith('-');

                if (isSubItem) {
                  return (
                    <div
                      key={index}
                      className="flex gap-2 text-sm ml-8"
                    >
                      <span className="text-secondary flex-shrink-0">•</span>
                      <p className="text-secondary leading-relaxed font-mono text-xs">
                        {instruction.trim().substring(1).trim()}
                      </p>
                    </div>
                  );
                }

                return (
                  <div
                    key={index}
                    className="flex gap-3 text-sm"
                  >
                    <span className="text-secondary font-medium flex-shrink-0">
                      {instruction.split('.')[0]}.
                    </span>
                    <p className="text-secondary leading-relaxed">
                      {instruction.substring(instruction.indexOf('.') + 1).trim()}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Nameservers Section */}
          {nameservers?.length > 0 && <>
            <div className="mb-5">
              <h3 className="text-base font-semibold text-primary dark:text-white mb-3">
                {t.admin.requiredNameservers}
              </h3>
              <div className="space-y-2">
                {nameservers.map((ns, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between px-4 py-3 rounded-md border border-stokecolor dark:border-gray-700 bg-white dark:bg-gray-900"
                  >
                    <code className="text-sm font-mono text-primary dark:text-gray-300">
                      {ns}
                    </code>
                    <button
                      onClick={() => copyToClipboard(ns, index)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-mutebg dark:bg-gray-500 hover:bg-gray-200 dark:text-white dark:hover:bg-gray-700 transition-colors"
                    >
                      {copiedIndex === index ? (
                        <>
                          <IoCheckmarkCircle className="text-green-600" />
                          <span className="text-green-600">{t.admin.copied}</span>
                        </>
                      ) : (
                        <>
                          <IoCopyOutline />
                          <span>{t.admin.copy}</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>}


          {/* Propagation Notice */}
          <div className='flex items-center justify-between gap-2 px-4 py-2.5 rounded-md border border-stokecolor dark:border-gray-700 mb-3 bg-mutebg dark:bg-gray-800 mt-2.5'>
            <div className='flex items-center gap-2.5 text-secondary'>
              <PiWarningBold />
              <span className="text-xs font-medium">
                {t.admin.dnsPropagationTakes.replace("{time}", estimatedPropagation)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 admin-btn">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-md border border-stokecolor dark:border-gray-700 text-primary dark:text-white font-medium hover:bg-mutebg dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              {t.admin.close}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DNSInstructionsModal;