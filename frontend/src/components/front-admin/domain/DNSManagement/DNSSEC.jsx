import { NavLink } from "react-router";
import { useState, useEffect, useCallback } from "react";
import { IoIosArrowDown } from "react-icons/io";
import { dnsAPI } from "../../../../api/domains";
import { useAlert } from "../../../../context/AlertContext";
import { useDomain } from "../../../../hooks/useDomain";
import { useCustomLocation } from "../../../../hooks/useCustomLocation";
import { useLanguage } from "../../../../hooks/useLanguage";

const DNSSEC = ({ domainName }) => {
  const [algorithm, setAlgorithm] = useState("8");
  const [keyTag, setKeyTag] = useState("");
  const [digestType, setDigestType] = useState("1");
  const [digest, setDigest] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasExistingData, setHasExistingData] = useState(false);
  const { showAlert } = useAlert();
  const { t } = useLanguage();
  const { viewDomain } = useDomain();
  const locationState = useCustomLocation();

  const activeDomainName =
    domainName ||
    locationState?.currentDomain?.websiteName ||
    viewDomain?.websiteName ||
    "";

  const fetchDNSSECRecords = useCallback(async () => {
    if (!activeDomainName) return;

    setIsLoading(true);
    try {
      const response = await dnsAPI.viewDNSSEC({
        domain: activeDomainName,
      });

      if (response?.responseData?.dnssec) {
        const dnssecData = response.responseData.dnssec;
        let record = null;
        if (Array.isArray(dnssecData) && dnssecData.length > 0) {
          record = dnssecData[0];
        } else if (typeof dnssecData === "object" && dnssecData !== null) {
          record = dnssecData;
        }

        if (record) {
          setKeyTag(String(record.keyTag || record.key_tag || ""));
          setAlgorithm(String(record.algorithm || "8"));
          setDigestType(String(record.digestType || record.digest_type || "1"));
          setDigest(record.digest || "");
          setHasExistingData(true);
        } else {
          setKeyTag("");
          setAlgorithm("8");
          setDigestType("1");
          setDigest("");
          setHasExistingData(false);
        }
      } else {
        setKeyTag("");
        setAlgorithm("8");
        setDigestType("1");
        setDigest("");
        setHasExistingData(false);
      }
    } catch (error) {
      console.error("Error fetching DNSSEC records:", error);
      setKeyTag("");
      setAlgorithm("8");
      setDigestType("1");
      setDigest("");
      setHasExistingData(false);
    } finally {
      setIsLoading(false);
    }
  }, [activeDomainName]);

  useEffect(() => {
    fetchDNSSECRecords();
  }, [fetchDNSSECRecords]);

  const handleAdd = async (e) => {
    e.preventDefault();

    if (isLoading || isSubmitting || hasExistingData) {
      return;
    }

    if (!activeDomainName) {
      showAlert(t.admin.domainRequired, { type: "warning" });
      return;
    }

    if (!keyTag || !digest) {
      showAlert(t.admin.keyTagAndDigestRequired, { type: "warning" });
      return;
    }

    setIsSubmitting(true);
    try {
      const data = {
        domain: activeDomainName,
        keyTag: parseInt(keyTag),
        algorithm: parseInt(algorithm),
        digestType: parseInt(digestType),
        digest: digest,
      };

      const response = await dnsAPI.addDNSSEC(data);

      if (
        response?.responseMsg?.statusCode === 200 ||
        response?.responseData?.statusCode === 200
      ) {
        showAlert(
          response?.responseMsg?.message ||
          response?.responseData?.message ||
          t.admin.dnssecRecordAddedSuccess,
          { type: "success", duration: 2500 }
        );
        // Refresh records to update form
        await fetchDNSSECRecords();
      } else {
        const errorMessage =
          response?.responseMsg?.message ||
          response?.responseData?.message ||
          t.admin.failedToAddDnssecRecord;
        showAlert(errorMessage, { type: "warning" });
      }
    } catch (error) {
      const errorMessage =
        error?.response?.data?.responseMsg?.message ||
        error?.response?.data?.message ||
        error?.message ||
        t.admin.failedToAddDnssecRecord;
      showAlert(errorMessage, { type: "warning" });
      console.error("Error adding DNSSEC record:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-7 px-5 space-y-4">
      <div className="flex items-center gap-2 info-detail w-full">
        <span className="text-secondary">
          {t.admin.dnssecDescription}
        </span>
      </div>

      <div className="flex lg:flex-nowrap flex-wrap items-start gap-2">
        <div className="relative w-full">
          <input
            type="text"
            className="input-field admin-form peer w-full"
            id="keyTag"
            value={keyTag}
            onChange={(e) => setKeyTag(e.target.value)}
            disabled={isSubmitting || isLoading || hasExistingData}
          />
          <label
            htmlFor="keyTag"
            className={`absolute left-5 transition-all font-medium ${keyTag
                ? "top-2 text-xs text-gray-600"
                : "top-4 text-13 text-primary dark:text-gray-500 "
              } peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}
          >
            {t.admin.keyTag}
          </label>
        </div>

        <div className="relative w-full">
          <select
            className="input-field admin-form peer"
            id="algorithm"
            value={algorithm}
            onChange={(e) => setAlgorithm(e.target.value)}
            disabled={isSubmitting || isLoading || hasExistingData}
          >
            <option value="8">{t.admin.algorithm8}</option>
            <option value="13">{t.admin.algorithm13}</option>
            <option value="14">{t.admin.algorithm14}</option>
            <option value="15">{t.admin.algorithm15}</option>
            <option value="16">{t.admin.algorithm16}</option>
          </select>
          <IoIosArrowDown
            size={15}
            className="absolute top-1/2 transform -translate-y-1/2 right-4 text-primary dark:text-white pointer-events-none"
          />
          <label
            htmlFor="algorithm"
            className={`absolute left-5 transition-all font-medium ${algorithm
                ? "top-2 text-xs text-gray-600"
                : "top-4 text-13 text-primary dark:text-gray-500 "
              } peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}
          >
            {t.admin.algorithm}
          </label>
        </div>

        <div className="relative w-full">
          <select
            className="input-field admin-form peer"
            id="digestType"
            value={digestType}
            onChange={(e) => setDigestType(e.target.value)}
            disabled={isSubmitting || isLoading || hasExistingData}
          >
            <option value="1">{t.admin.digestType1}</option>
            <option value="2">{t.admin.digestType2}</option>
            <option value="3">{t.admin.digestType3}</option>
            <option value="4">{t.admin.digestType4}</option>
          </select>
          <IoIosArrowDown
            size={15}
            className="absolute top-1/2 transform -translate-y-1/2 right-4 text-primary dark:text-white pointer-events-none"
          />
          <label
            htmlFor="digestType"
            className={`absolute left-5 transition-all font-medium ${digestType
                ? "top-2 text-xs text-gray-600"
                : "top-4 text-13 text-primary dark:text-gray-500 "
              } peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}
          >
            {t.admin.digestType}
          </label>
        </div>

        <div className="relative w-full">
          <input
            type="text"
            className="input-field admin-form peer w-full"
            id="digest"
            value={digest}
            onChange={(e) => setDigest(e.target.value)}
            disabled={isSubmitting || isLoading || hasExistingData}
          />
          <label
            htmlFor="digest"
            className={`absolute left-5 transition-all font-medium ${digest
                ? "top-2 text-xs text-gray-600"
                : "top-4 text-13 text-primary dark:text-gray-500 "
              } peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}
          >
            {t.admin.digest}
          </label>
        </div>

        <NavLink
          className={`add-to-cart ${isSubmitting || isLoading || hasExistingData ? "disable" : ""
            }`}
          onClick={handleAdd}
        >
          {isSubmitting ? t.admin.adding : t.admin.add}
        </NavLink>
      </div>
    </div>
  );
};

export default DNSSEC;
