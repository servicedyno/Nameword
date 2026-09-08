import DomainList from "./domain/DomainList";
import ExternalDomain from "./domain/ExternalDomain";
import { useLanguage } from "../../hooks/useLanguage";

const DomainPortfolio = () => {
  const { t } = useLanguage();
  
  return (
    <div className="space-y-7">
      {/* Domain title */}
      <div className="flex flex-col gap-2 title-section">
        <h2>{t.admin.domainPortfolio}</h2>
      </div>

      {/* domain list */}
      <DomainList />

      {/* External Domains */}
      <ExternalDomain />
    </div>
  );
};

export default DomainPortfolio;
