import DNSrecords from "../../../components/front-admin/domain/DNSManagement/DNSrecords";
import DNSrecordsTables from "../../../components/front-admin/domain/DNSManagement/DNSrecordsTables";
import ChildNameservers from "../../../components/front-admin/domain/DNSManagement/ChildNameservers";
import AddDNSrecord from "../../../components/front-admin/domain/DNSManagement/AddDNSrecord";
import DNSSEC from "../../../components/front-admin/domain/DNSManagement/DNSSEC";
import DNShistory from "../../../components/front-admin/domain/DNSManagement/DNShistory";
import { useState, useMemo, useEffect } from "react";
import { useParams } from "react-router";
import { useDomain } from "../../../hooks/useDomain";
import { useCustomLocation } from "../../../hooks/useCustomLocation";
import { useLanguage } from "../../../hooks/useLanguage";

const DNSManagement = () => {
  const [activeTab, setActiveTab] = useState("dns-records");
  const { t } = useLanguage();
  const locationState = useCustomLocation();
  const { domainName: domainNameParam } = useParams();
  const { viewDomain, domains, fetchViewDomain } = useDomain();

  const decodedDomainName = useMemo(() => {
    if (!domainNameParam) {
      return undefined;
    }
    try {
      return decodeURIComponent(domainNameParam);
    } catch (error) {
      console.error("Failed to decode domain name parameter:", error);
      return domainNameParam;
    }
  }, [domainNameParam]);

  const activeDomain = useMemo(() => {
    if (locationState?.currentDomain?.websiteName) {
      return locationState.currentDomain;
    }

    if (decodedDomainName && Array.isArray(domains)) {
      const matchedDomain = domains.find(
        (domain) =>
          domain.websiteName?.toLowerCase() === decodedDomainName.toLowerCase()
      );

      if (matchedDomain) {
        return matchedDomain;
      }

      return { websiteName: decodedDomainName };
    }

    if (Array.isArray(domains) && domains.length > 0) {
      return domains[0];
    }

    return {};
  }, [locationState, decodedDomainName, domains]);

  const domainName = activeDomain?.websiteName || decodedDomainName || "";

  useEffect(() => {
    if (domainName && (!viewDomain || viewDomain?.websiteName !== domainName)) {
      fetchViewDomain(domainName);
    }
  }, [domainName, viewDomain, fetchViewDomain]);

  return (
    <div className="space-y-7">
      {/* title */}
      <div className="flex flex-col gap-2 title-section">
        <h2>{t.admin.dnsManagement}</h2>
      </div>

      {/* Tab menu */}
      <div className="flex overflow-auto gap-2.5 mb-6">
        <button
          onClick={() => setActiveTab("dns-records")}
          className={`tab-button ${activeTab === "dns-records" ? "active" : ""
            }`}
        >
          {t.admin.dnsRecords}
        </button>
        <button
          onClick={() => setActiveTab("child-nameservers")}
          className={`tab-button ${activeTab === "child-nameservers" ? "active" : ""
            }`}
        >
          {t.admin.childNameservers}
        </button>
        <button
          onClick={() => setActiveTab("DNSSEC")}
          className={`tab-button ${activeTab === "DNSSEC" ? "active" : ""}`}
        >
          {t.admin.dnssec}
        </button>

        <button
          onClick={() => setActiveTab("dns-history")}
          className={`tab-button ${activeTab === "dns-history" ? "active" : ""
            }`}
        >
          {t.admin.dnsHistory}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "dns-records" && (
        <div>
          <div className="table-card mb-8">
            <div>
              <p className="info-card-title px-5 py-4">{t.admin.nameservers}</p>
              <hr className="card-divider" />
              <DNSrecords domainName={domainName} />
            </div>
          </div>
          <div className="table-card mb-8">
            <div>
              <p className="info-card-title px-5 py-4">{t.admin.addDnsRecord}</p>
              <hr className="card-divider" />
              <AddDNSrecord domainName={domainName} viewDomain={viewDomain} />
            </div>
          </div>
          <div className="table-card mb-8">
            <div>
              <p className="info-card-title px-5 py-4">{t.admin.manageDnsRecords}</p>
              <hr className="card-divider" />
              <DNSrecordsTables domainName={domainName} />
            </div>
          </div>
        </div>
      )}

      {activeTab === "child-nameservers" && (
        <div className="table-card">
          <p className="info-card-title px-5 py-4">{t.admin.createChildNameservers}</p>
          <hr className="card-divider" />
          <ChildNameservers domainName={domainName} />
        </div>
      )}

      {activeTab === "DNSSEC" && (
        <div className="table-card">
          <p className="info-card-title px-5 py-4">{t.admin.manageDnssec}</p>
          <hr className="card-divider" />
          <DNSSEC domainName={domainName} />
        </div>
      )}

      {activeTab === "dns-history" && (
        <div className="table-card">
          <DNShistory domainName={domainName} />
        </div>
      )}
    </div>
  );
};

export default DNSManagement;
