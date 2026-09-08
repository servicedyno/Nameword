import { RiGlobalLine } from "react-icons/ri";
import { FiInfo } from "react-icons/fi";
import { MdCheck } from "react-icons/md";
import { cart } from "../common/icons";
import { TbArrowRight } from "react-icons/tb";
import { NavLink, useMatch, useSearchParams } from "react-router";
import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import HighlightTLD from "./HighlightTLD";
import ErrorComponent from "../common/ErrorComponent";
import { cartAPI } from "../../api/cartApi";
import { useAlert } from "../../context/AlertContext";
import Loader from "../common/Loader";
import { useLanguage } from "../../hooks/useLanguage";
import { guestCart } from "../../utils/guestCart";

const SearchDomainCard = ({ searchResults, tldSuggestions }) => {
  const isAddToCartRouteMatch = useMatch("/add-to-cart");

  const [searchParams] = useSearchParams();
  const searchResult = searchParams.get("value") || "";
  const [isLoading, setIsLoading] = useState(false)
  const [cartLoading, setCartLoading] = useState(false)

  const { user } = useAuth();
  const { showAlert } = useAlert();
  const { t } = useLanguage();

  const [cartItems, setCartItems] = useState([]);

  const fetchCart = async () => {
    if (user) {
      try {
        setCartLoading(true);
        const result = await cartAPI.getListAddToCart();
        const data = result?.data || result;
        setCartItems(data?.items || []);
      } catch (error) {
        console.log(error);
      } finally {
        setCartLoading(false);
      }
    } else {
      const data = guestCart.list();
      setCartItems(data?.items || []);
    }
  };

  useEffect(() => {
    fetchCart();
  }, [user]);

  useEffect(() => {
    const onCartUpdated = () => {
      fetchCart();
    };
    window.addEventListener("cart:updated", onCartUpdated);
    return () => window.removeEventListener("cart:updated", onCartUpdated);
  }, [user]);

  const normalizeName = (name) => (name || "").toString().trim().toLowerCase();
  const isDomainInCart = (name) => {
    const target = normalizeName(name);
    if (!target) return false;
    return cartItems?.some(
      (item) =>
        normalizeName(item?.domain?.name || item?.websiteName) === target
    );
  };                                  

  const handleClick = async (payload) => {
    const domainName = payload?.query || payload?.websiteName;
    if (!domainName) return;
    const apiData = {
      itemType: "domain",
      websiteName: domainName,
      action: "register",
      availability: payload.available,
      years: 1,
      provider: "hostbay",
      price: {
        amount: payload.registrationFee,
        currency: "USD",
      },
      renew: {
        amount: payload.renewalfee,
        currency: "USD",
      },
    };

    setIsLoading(true);
    try {
      if (user) {
        const result = await cartAPI.addToCart(apiData);
        if (result?.success === true) {
          showAlert(result?.message || t.domain.domainAddedSuccess, {
            duration: 2500,
            type: "success",
          });
          if (isAddToCartRouteMatch) {
            setCartItems((prev) => {
              const exists = prev?.some(
                (it) =>
                  (it?.domain?.name || it?.websiteName || "")
                    .toLowerCase()
                    .trim() === (domainName || "").toLowerCase().trim()
              );
              if (exists) return prev;
              return [
                ...prev,
                { websiteName: domainName, domain: { name: domainName } },
              ];
            });
          }
          try {
            const refreshed = await cartAPI.getListAddToCart();
            const data = refreshed?.data || refreshed;
            setCartItems(data?.items || []);
            window.dispatchEvent(
              new CustomEvent("cart:updated:payload", { detail: data })
            );
          } catch {
            window.dispatchEvent(new Event("cart:updated"));
          }
        }
      } else {
        guestCart.add(apiData);
        showAlert(t.domain.domainAddedSuccess, {
          duration: 2500,
          type: "success",
        });
        const data = guestCart.list();
        setCartItems(data?.items || []);
        window.dispatchEvent(
          new CustomEvent("cart:updated:payload", { detail: data })
        );
      }
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <>
      <div className="max-w-5xl mx-auto md:mt-8">
        {/* search domain card */}
        <div className="grid lg:grid-cols-2 gap-5">
          {/* card 1 */}
          {!searchResults ? 
            <div className="domain-card no-available md:mb-5">
            <div className="flex items-center justify-between gap-3">
              <HighlightTLD domain={searchResult} />
              <button className="btn-teal">{t.domain.domainTaken}</button>
            </div>
            </div>:
          <div className="domain-card md:mb-5">
            <div className="flex items-center justify-between gap-3">
              <HighlightTLD domain={searchResult || searchResults?.query} />
              <button className="btn-teal">{t.domain.exactMatch}</button>
            </div>

            <hr className="card-divider my-6" />

            <div className="text-left space-y-2">
              <p className="flex text-primary dark:text-gray-500 text-base font-medium gap-1.5 items-center">
                {t.domain.forFirstYear}
                <FiInfo />
              </p>
              <p className="price-tag">
                ${searchResults?.registrationFee?.toFixed(2) || 0}
              </p>
              {/* <p className='price-tag'>$9.99 <span>$21.99</span></p> */}
              {/* <span className='save-lable'>Save 15%</span> */}
            </div>

            <div className="flex justify-start mt-5">
              {(isDomainInCart(searchResults?.query || searchResult) ? (
                  <NavLink to="/upsell-checkout" className="add-to-cart">
                    {t.domain.continue} <TbArrowRight size={18} />
                  </NavLink>
                ) : (
                  <button
                    type="button"
                    className="add-to-cart"
                    onClick={() =>
                      handleClick({ ...searchResults, query: searchResult })
                    }
                  >
                    <img src={cart} alt="add-to-cart" title="" /> {t.domain.addToCart}
                  </button>
                ))}
            </div>

            <hr className="card-divider my-6" />

            <div className="flex flex-col w-full gap-4">
              <p className="flex items-center gap-2 text-left text-primary dark:text-gray-400 text-sm font-medium">
                <MdCheck className="w-5 h-5 flex-none" />
                  {t.domain.popularDomainsTaken.replace('{tld}', (searchResults?.query || searchResult || '')?.split(".")?.filter(Boolean)?.slice(1)?.join(".") || '')}
              </p>
              <p className="flex items-center gap-2 text-left text-primary dark:text-gray-400 text-sm font-medium">
                <MdCheck className="w-5 h-5 flex-none" />
                {t.domain.perfectPick}
              </p>
            </div>
          </div>
        }
          {tldSuggestions ? (
            <div className="domain-card md:mb-5">
              <div className="flex items-center justify-between gap-3">
                <HighlightTLD domain={tldSuggestions?.websiteName} />
                {!searchResults ?
                <button className="btn-teal">{t.domain.bestAlternative}</button> :
                <button className="btn-sky">{t.domain.package}</button>}
              </div>

              <hr className="card-divider my-6" />

              <div className="text-left space-y-2">
                <p className="flex text-primary dark:text-gray-500 text-base font-medium gap-1.5 items-center">
                  {t.domain.forFirstYear} <FiInfo />
                </p>
                <p className="price-tag">
                  ${tldSuggestions?.registrationFee?.toFixed(2) || 0}
                </p>
              </div>

              <div className="flex justify-start mt-5">

                {(isDomainInCart(tldSuggestions?.websiteName) ? (
                    <NavLink to="/upsell-checkout" className="add-to-cart">
                      {t.domain.continue} <TbArrowRight size={18} />
                    </NavLink>
                  ) : (
                    <button
                      type="button"
                      className="btn-outline w-40"
                      onClick={() => handleClick(tldSuggestions)}
                    >
                      <svg
                        width="17"
                        height="17"
                        viewBox="0 0 17 17"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M7.1665 9.33331C7.0339 9.33331 6.90672 9.38599 6.81295 9.47976C6.71918 9.57353 6.6665 9.7007 6.6665 9.83331C6.6665 9.96592 6.71918 10.0931 6.81295 10.1869C6.90672 10.2806 7.0339 10.3333 7.1665 10.3333H9.83317C9.96578 10.3333 10.093 10.2806 10.1867 10.1869C10.2805 10.0931 10.3332 9.96592 10.3332 9.83331C10.3332 9.7007 10.2805 9.57353 10.1867 9.47976C10.093 9.38599 9.96578 9.33331 9.83317 9.33331H7.1665Z"
                          fill="currentcolor"
                        />
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M10.2764 2.05333C10.395 1.99405 10.5322 1.98428 10.658 2.02616C10.7838 2.06804 10.8878 2.15814 10.9471 2.27666L12.1558 4.694C12.4407 4.70777 12.7007 4.73133 12.9358 4.76466C13.6398 4.86533 14.2224 5.08266 14.6364 5.59466C15.0504 6.10666 15.1411 6.722 15.0924 7.43133C15.0458 8.11866 14.8591 8.986 14.6271 10.0693L14.3264 11.474C14.1698 12.2053 14.0424 12.798 13.8824 13.2607C13.7158 13.744 13.4958 14.1407 13.1211 14.444C12.7464 14.7473 12.3118 14.8787 11.8051 14.9407C11.3184 15 10.7118 15 9.96511 15H7.03444C6.28644 15 5.68044 15 5.19377 14.9407C4.68711 14.8787 4.25244 14.7473 3.87777 14.444C3.50311 14.1407 3.28311 13.744 3.11644 13.2613C2.95644 12.798 2.82977 12.2053 2.67244 11.4747L2.37177 10.07C2.13977 8.986 1.95377 8.11866 1.90644 7.43133C1.85777 6.722 1.94844 6.10733 2.36244 5.59466C2.77577 5.08266 3.35844 4.86533 4.06244 4.76466C4.29799 4.73177 4.55799 4.70822 4.84244 4.694L6.05311 4.668C6.21711 4.66666 10.7824 4.66711 11.0251 4.668L10.0524 2.72333C9.99316 2.60477 9.98339 2.46753 10.0253 2.34176C10.0671 2.216 10.1573 2.11202 10.2758 2.05266M4.32111 5.73866L4.05244 6.276C4.02251 6.3348 4.00451 6.39896 3.99949 6.46475C3.99446 6.53055 4.00252 6.59669 4.02318 6.65936C4.04384 6.72203 4.0767 6.77999 4.11987 6.8299C4.16304 6.87981 4.21566 6.92068 4.2747 6.95015C4.33373 6.97963 4.39802 6.99713 4.46386 7.00164C4.52969 7.00615 4.59577 6.99758 4.65827 6.97644C4.72078 6.95529 4.77849 6.92198 4.82806 6.87842C4.87763 6.83487 4.91809 6.78193 4.94711 6.72266L5.47177 5.67333C5.85177 5.66666 6.28511 5.666 6.78111 5.666H10.2184C10.7144 5.666 11.1478 5.666 11.5278 5.67266L12.0524 6.72266C12.1123 6.84024 12.2162 6.9294 12.3415 6.97071C12.4668 7.01202 12.6033 7.00213 12.7214 6.9432C12.8394 6.88427 12.9294 6.78107 12.9717 6.65609C13.0139 6.53111 13.0051 6.39449 12.9471 6.276L12.6784 5.73866L12.7944 5.754C13.3838 5.83866 13.6724 5.99266 13.8591 6.22266C14.0424 6.44933 14.1324 6.758 14.0964 7.33266H2.90311C2.86711 6.758 2.95711 6.44933 3.14044 6.22266C3.32711 5.99266 3.61577 5.83866 4.20511 5.754L4.32111 5.73866ZM3.35844 9.9C3.24382 9.37939 3.13692 8.85711 3.03777 8.33333H13.9618C13.8622 8.85707 13.7551 9.37935 13.6404 9.9L13.3551 11.2333C13.1898 12.0033 13.0751 12.536 12.9371 12.9347C12.8038 13.3213 12.6678 13.5253 12.4924 13.6667C12.3178 13.808 12.0891 13.8987 11.6844 13.948C11.2651 13.9993 10.7198 14 9.93244 14H7.06644C6.27977 14 5.73444 13.9993 5.31511 13.948C4.90977 13.8987 4.68177 13.808 4.50711 13.6667C4.33177 13.5253 4.19511 13.3207 4.06244 12.9347C3.92444 12.536 3.80911 12.0033 3.64444 11.2333L3.35844 9.9Z"
                          fill="currentcolor"
                        />
                      </svg>
                      {t.domain.addToCart}
                    </button>
                  ))}
              </div>

              <hr className="card-divider my-6" />
                
              {searchResults ?
              <div className="flex flex-col w-full gap-4">
                <p className="flex items-center gap-2 text-left text-primary dark:text-gray-400 text-sm font-medium">
                  <MdCheck className="w-5 h-5 flex-none" />
                  {t.domain.domainBundle}
                </p>
                <p className="flex items-center gap-2 text-left text-primary dark:text-gray-400 text-sm font-medium">
                  <MdCheck className="w-5 h-5 flex-none" />
                  {t.domain.manageDomains}
                </p>
              </div>:
              <div className="flex flex-col w-full gap-4">
                <p className="flex items-center gap-2 text-left text-primary dark:text-gray-400 text-sm font-medium">
                  <MdCheck className="w-5 h-5 flex-none" />
                    {t.domain.popularDomainsTaken.replace('{tld}', (searchResults?.query || searchResult || '')?.split(".")?.filter(Boolean)?.slice(1)?.join(".") || '')}
                </p>
                <p className="flex items-center gap-2 text-left text-primary dark:text-gray-400 text-sm font-medium">
                  <MdCheck className="w-5 h-5 flex-none" />
                  {t.domain.perfectPick}
                </p>
              </div>}
            </div>
          ) : (
            <ErrorComponent error={t.domain.noDomainSuggestions} />
          )}
        </div>
      </div>
      {(isLoading || cartLoading ) && <Loader />}
    </>
  );
};

export default SearchDomainCard;
