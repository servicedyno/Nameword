import { RiGlobalLine } from "react-icons/ri";
import { FiInfo } from "react-icons/fi";
import { MdCheck } from "react-icons/md";
import { cart } from "../common/icons";
import { NavLink, useSearchParams } from "react-router";
import HighlightTLD from "./HighlightTLD";
import ErrorComponent from "../common/ErrorComponent";
import { useLanguage } from "../../hooks/useLanguage";

const NoDomainAvailable = ({ tldSuggestions }) => {
  const [searchParams] = useSearchParams();
  const searchResult = searchParams.get("value") || "";
  const { t } = useLanguage();

  return (
    <div className="max-w-5xl mx-auto md:mt-8">
      {/* search domain card */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* card 1 */}
        <div className="domain-card no-available md:mb-5">
          <div className="flex items-center justify-between gap-3">
            <HighlightTLD domain={searchResult} />
            <button className="btn-teal">{t.domain.domainTaken}</button>
          </div>
        </div>

        {/* card 1 */}
        {tldSuggestions ? (
          <div className="domain-card md:mb-5">
            <div className="flex items-center justify-between gap-3">
              <HighlightTLD domain={tldSuggestions?.websiteName} />
              <button className="btn-teal">{t.domain.bestAlternative}</button>
            </div>

            <hr className="card-divider my-6" />

            <div className="text-left space-y-2">
              <p className="flex text-primary dark:text-gray-500 text-base font-medium gap-1.5 items-center">
                {t.domain.forFirstYear} <FiInfo />
              </p>
              <p className="price-tag">
                ${tldSuggestions?.registrationFee?.toFixed(2) || 0}
              </p>
              {/* <span className='save-lable'>Save 15%</span> */}
            </div>

            <div className="flex justify-start mt-5">
              <NavLink to="/add-to-cart" className="add-to-cart">
                <img src={cart} alt="add-to-cart" title="" /> {t.domain.addToCart}
              </NavLink>
            </div>

            <hr className="card-divider my-6" />

            <div className="flex flex-col w-full gap-4">
              <p className="flex items-center gap-2 text-left text-primary dark:text-gray-400 text-sm font-medium">
                <MdCheck className="w-5 h-5 flex-none" />
                {t.domain.popularDomainsTaken.replace('{tld}', 'kitchen')}
              </p>
              <p className="flex items-center gap-2 text-left text-primary dark:text-gray-400 text-sm font-medium">
                <MdCheck className="w-5 h-5 flex-none" />
                {t.domain.perfectPick}
              </p>
            </div>
          </div>
        ) : (
          <ErrorComponent error={t.domain.noDomainSuggestions} />
        )}
      </div>
    </div>
  );
};

export default NoDomainAvailable;
