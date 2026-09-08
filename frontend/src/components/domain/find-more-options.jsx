import { FiInfo } from "react-icons/fi";
import { NavLink, useMatch, useSearchParams } from "react-router";
import HighlightTLD from "./HighlightTLD";
import { useEffect, useMemo, useState } from "react";
import { TbArrowRight } from "react-icons/tb";
import { MdCheck } from "react-icons/md";
import { useAuth } from "../../hooks/useAuth";
import { cartAPI } from "../../api/cartApi";
import { useAlert } from "../../context/AlertContext";
import Loader from "../common/Loader";
import { useLanguage } from "../../hooks/useLanguage";
import { guestCart } from "../../utils/guestCart";

const FindOptions = ({ tldSuggestions = [] }) => {
  const [next, setNext] = useState(9);
  const [activeTab, setActiveTab] = useState("All");
  const [cartItems, setCartItems] = useState([]);
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [searchParams] = useSearchParams();
  const searchResult = searchParams.get("value") || "";
  const [isLoading, setIsLoading] = useState(false)
  const [cartLoading, setCartLoading] = useState(false)
  const { t } = useLanguage();

  const isAddCart = useMatch("/add-to-cart")

  const fetchCart = async () => {
    if (user) {
      if (!isAddCart) return;
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
    const handleCartUpdated = () => fetchCart();
    const handleCartUpdatedPayload = (e) => {
      const incoming = e?.detail;
      if (incoming) {
        setCartItems(incoming?.items || []);
      } else {
        fetchCart();
      }
    };

    window.addEventListener("cart:updated", handleCartUpdated);
    window.addEventListener("cart:updated:payload", handleCartUpdatedPayload);

    return () => {
      window.removeEventListener("cart:updated", handleCartUpdated);
      window.removeEventListener("cart:updated:payload", handleCartUpdatedPayload);
    };
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

  const handleAddToCart = async (tld) => {
    if (!tld?.websiteName) return;
    setIsLoading(true);

    const apiData = {
      itemType: "domain",
      websiteName: tld.websiteName,
      action: "register",
      availability: tld.available,
      years: 1,
      provider: "hostbay",
      price: {
        amount: tld.registrationFee,
        currency: "USD",
      },
      renew: {
        amount: tld.renewalfee,
        currency: "USD",
      },
    };

    try {
      if (user) {
        const result = await cartAPI.addToCart(apiData);
        if (result?.success === true) {
          showAlert(result?.message || t.domain.domainAddedSuccess, {
            duration: 2500,
            type: "success",
          });
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

  const getTldFromDomain = (domainName) => {
    if (!domainName || typeof domainName !== "string") return "";
    const parts = domainName.split(".");
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
  };

  const baseList = useMemo(() => {
    return Array.isArray(tldSuggestions) ? tldSuggestions.slice(1) : [];
  }, [tldSuggestions]);

  const filteredList = useMemo(() => {
    if (!Array.isArray(baseList)) return [];

    const popularTlds = new Set([
      "com",
      "net",
      "org",
      "co",
      "io",
      "ai",
      "app",
      "dev",
      "xyz",
      "online",
      "info",
    ]);
    const businessTlds = new Set([
      "biz",
      "business",
      "company",
      "co",
      "inc",
      "llc",
      "ltd",
      "enterprise",
      "services",
      "shop",
      "store",
      "agency",
      "consulting",
      "partners",
    ]);
    const educationTlds = new Set([
      "edu",
      "education",
      "academy",
      "school",
      "college",
      "university",
      "courses",
      "training",
      "study",
      "degree",
      "institute",
    ]);
    const entertainmentTlds = new Set([
      "fun",
      "games",
      "game",
      "live",
      "media",
      "movie",
      "tv",
      "music",
      "party",
      "show",
      "video",
      "play",
      "art",
      "club",
    ]);
    const internationalExtras = new Set(["global", "world", "international"]);

    switch (activeTab) {
      case "Cheap":
        return baseList.filter((t) => Number(t?.registrationFee) < 10);
      case "Premium":
        return baseList.filter((t) => Number(t?.registrationFee) > 10);
      case "Business":
        return baseList.filter((t) =>
          businessTlds.has(getTldFromDomain(t?.websiteName))
        );
      case "Education":
        return baseList.filter((t) =>
          educationTlds.has(getTldFromDomain(t?.websiteName))
        );
      case "Entertainment":
        return baseList.filter((t) =>
          entertainmentTlds.has(getTldFromDomain(t?.websiteName))
        );
      case "International":
        return baseList.filter((t) => {
          const tld = getTldFromDomain(t?.websiteName);
          return tld.length === 2 || internationalExtras.has(tld);
        });
      case "Popular":
        return baseList.filter((t) =>
          popularTlds.has(getTldFromDomain(t?.websiteName))
        );
      case "All":
      default:
        return baseList;
    }
  }, [activeTab, baseList]);

  const visibleList = useMemo(
    () => filteredList.slice(0, next),
    [filteredList, next]
  );

  return (
    <>
      <div className="md:py-16 sm:py-14 py-10">
        <div className="max-w-5xl mx-auto">
          <div className="searcharea w-full text-center">
            <h2 className="mb-12">{t.domain.findMoreOptions}</h2>
          </div>

          {/* search tab */}
          <div>
            <ul className="tablist">
              <li>
                <a
                  href="#"
                  className={activeTab === "Popular" ? "active" : ""}
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab("Popular");
                    setNext(9);
                  }}
                >
                  {t.domain.tabs.popular}
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className={activeTab === "Cheap" ? "active" : ""}
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab("Cheap");
                    setNext(9);
                  }}
                >
                  {t.domain.tabs.cheap}
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className={activeTab === "Premium" ? "active" : ""}
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab("Premium");
                    setNext(9);
                  }}
                >
                  {t.domain.tabs.premium}
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className={activeTab === "Business" ? "active" : ""}
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab("Business");
                    setNext(9);
                  }}
                >
                  {t.domain.tabs.business}
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className={activeTab === "International" ? "active" : ""}
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab("International");
                    setNext(9);
                  }}
                >
                  {t.domain.tabs.international}
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className={activeTab === "Education" ? "active" : ""}
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab("Education");
                    setNext(9);
                  }}
                >
                  {t.domain.tabs.education}
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className={activeTab === "Entertainment" ? "active" : ""}
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab("Entertainment");
                    setNext(9);
                  }}
                >
                  {t.domain.tabs.entertainment}
                </a>
              </li>

              <li>
                <a
                  href="#"
                  className={activeTab === "All" ? "active" : ""}
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab("All");
                    setNext(9);
                  }}
                >
                  {t.domain.tabs.all}
                </a>
              </li>
            </ul>

            {/* data list */}
            <div className="domain-list">
              {filteredList.length === 0 ? (
                <div className="w-full">
                  <div className="flex items-start gap-3 p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                    <div className="text-primary mt-0.5">
                      <FiInfo />
                    </div>
                    <div className="flex-1">
                      <p className="text-darkbtn dark:text-white font-medium">
                        {t.domain.domainsNotAvailable.replace('{filter}', activeTab !== "All" ? `${activeTab} ` : "")}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {t.domain.tryDifferentFilter}
                      </p>
                    </div>
                  </div>
                </div>
              ) : visibleList?.length > 0 ? (
                visibleList.map((tld, index) => (
                  <div key={index}>
                    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5">
                      <HighlightTLD domain={tld.websiteName} />

                      <div className="flex flex-wrap items-center gap-4 domainlist-detail">
                        {/* <span className='save-lable bg-tealdark'>Save 15%</span> */}
                        <div className="text-left min-w-36">
                          <p className="flex text-primary dark:text-white text-xs font-medium gap-1.5 items-center">
                            {t.domain.forFirstYear}
                            <FiInfo />
                          </p>
                          <p className="price-tag">
                            ${tld.registrationFee.toFixed(2) || 0}
                          </p>
                        </div>
                        <div className="flex justify-start">
                          {isDomainInCart(tld.websiteName) ? (
                            <div className="flex items-center gap-4">
                              <div className="text-left min-w-36">
                                <NavLink to={`/domain?value=${searchResult}`} className="btn-outline add-domain">
                                  <MdCheck className="w-4 h-4 flex-none" /> {t.domain.domainAdded}
                                </NavLink>
                              </div>
                              <NavLink to="/upsell-checkout" className="add-to-cart">
                                {t.domain.continue} <TbArrowRight size={18} />
                              </NavLink>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="btn-outline"
                              onClick={() => handleAddToCart(tld)}
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
                                  d="M10.2764 2.05333C10.395 1.99405 10.5322 1.98428 10.658 2.02616C10.7838 2.06804 10.8878 2.15814 10.9471 2.27666L12.1558 4.694C12.4407 4.70777 12.7007 4.73133 12.9358 4.76466C13.6398 4.86533 14.2224 5.08266 14.6364 5.59466C15.0504 6.10666 15.1411 6.722 15.0924 7.43133C15.0458 8.11866 14.8591 8.986 14.6271 10.0693L14.3264 11.474C14.1698 12.2053 14.0424 12.798 13.8824 13.2607C13.7158 13.744 13.4958 14.1407 13.1211 14.444C12.7464 14.7473 12.3118 14.8787 11.8051 14.9407C11.3184 15 10.7118 15 9.96511 15H7.03444C6.28644 15 5.68044 15 5.19377 14.9407C4.68711 14.8787 4.25244 14.7473 3.87777 14.444C3.50311 14.1407 3.28311 13.744 3.11644 13.2613C2.95644 12.798 2.82977 12.2053 2.67244 11.4747L2.37177 10.07C2.13977 8.986 1.95377 8.11866 1.90644 7.43133C1.85777 6.722 1.94844 6.10733 2.36244 5.59466C2.77577 5.08266 3.35844 4.86533 4.06244 4.76466C4.29799 4.73177 4.55799 4.70822 4.84244 4.694L6.05311 2.27666C6.11295 2.15908 6.21685 2.06992 6.34215 2.02861C6.46745 1.98731 6.604 1.99719 6.72204 2.05613C6.84008 2.11506 6.93005 2.21826 6.97233 2.34323C7.01461 2.46821 7.00579 2.60483 6.94777 2.72333L5.97444 4.668C6.21711 4.66666 6.47244 4.66622 6.74044 4.66666H10.2591C10.5271 4.66666 10.7824 4.66711 11.0251 4.668L10.0524 2.72333C9.99316 2.60477 9.98339 2.46753 10.0253 2.34176C10.0671 2.216 10.1573 2.11202 10.2758 2.05266M4.32111 5.73866L4.05244 6.276C4.02251 6.3348 4.00451 6.39896 3.99949 6.46475C3.99446 6.53055 4.00252 6.59669 4.02318 6.65936C4.04384 6.72203 4.0767 6.77999 4.11987 6.8299C4.16304 6.87981 4.21566 6.92068 4.2747 6.95015C4.33373 6.97963 4.39802 6.99713 4.46386 7.00164C4.52969 7.00615 4.59577 6.99758 4.65827 6.97644C4.72078 6.95529 4.77849 6.92198 4.82806 6.87842C4.87763 6.83487 4.91809 6.78193 4.94711 6.72266L5.47177 5.67333C5.85177 5.66666 6.28511 5.666 6.78111 5.666H10.2184C10.7144 5.666 11.1478 5.666 11.5278 5.67266L12.0524 6.72266C12.1123 6.84024 12.2162 6.9294 12.3415 6.97071C12.4668 7.01202 12.6033 7.00213 12.7214 6.9432C12.8394 6.88427 12.9294 6.78107 12.9717 6.65609C13.0139 6.53111 13.0051 6.39449 12.9471 6.276L12.6784 5.73866L12.7944 5.754C13.3838 5.83866 13.6724 5.99266 13.8591 6.22266C14.0424 6.44933 14.1324 6.758 14.0964 7.33266H2.90311C2.86711 6.758 2.95711 6.44933 3.14044 6.22266C3.32711 5.99266 3.61577 5.83866 4.20511 5.754L4.32111 5.73866Z"
                                  fill="currentcolor"
                                />
                                <path
                                  d="M3.35844 9.9C3.24382 9.37939 3.13692 8.85711 3.03777 8.33333H13.9618C13.8622 8.85707 13.7551 9.37935 13.6404 9.9L13.3551 11.2333C13.1898 12.0033 13.0751 12.536 12.9371 12.9347C12.8038 13.3213 12.6678 13.5253 12.4924 13.6667C12.3178 13.808 12.0891 13.8987 11.6844 13.948C11.2651 13.9993 10.7198 14 9.93244 14H7.06644C6.27977 14 5.73444 13.9993 5.31511 13.948C4.90977 13.8987 4.68177 13.808 4.50711 13.6667C4.33177 13.5253 4.19511 13.3207 4.06244 12.9347C3.92444 12.536 3.80911 12.0033 3.64444 11.2333L3.35844 9.9Z"
                                  fill="currentcolor"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <hr className="card-divider" />
                  </div>
                ))
              ) : (
                ""
              )}
              {/* {isDomainNotSelect &&
                              <div className="select-domain">
                                  <div className='flex items-center justify-between gap-2'>
                                      <h2 className='flex flex-wrap items-center card-title'>
                                          <span className='text-primary dark:text-gray-500'>apple</span>
                                          <span className='text-darkbtn dark:text_WHITE'> .org</span>
                                      </h2>

                                      <div className='flex items-center gap-4 domainlist-detail'>
                                          <div className='text-left min-w-36'>
                                              <a href='#' className='btn-outline add-domain'>
                                                  <MdCheck className='w-4 h-4 flex-none' /> Domain Added
                                              </a>
                                          </div>
                                          <div className='flex justify-start'>
                                              {user ?
                                                  <NavLink to="/upsell-checkout" className='add-to-cart' >
                                                      Continue <TbArrowRight size={18} />
                                                  </NavLink> :
                                                  <NavLink to="/sign-in" className='add-to-cart' onClickCapture={() => localStorage.setItem("path", "/upsell-checkout")} >
                                                      Continue <TbArrowRight size={18} />
                                                  </NavLink>
                                              }
                                          </div>
                                      </div>
                                  </div>

                                  <hr className='card-divider my-2' />

                                  <div className='flex items-center justify-between gap-2'>
                                      <div className="flex flex-col items-start justify-between gap-2">
                                          <button className='btn-sky'>Consider This Package</button>
                                          <h2 className='flex flex-wrap items-center card-title'>
                                              <RiGlobalLine className='mr-1.5 text-lg text-primary dark:text_WHITE' />
                                              <span className='text-primary dark:text_WHITE'>apple</span>
                                              <span className='text-darkbtn dark:text_WHITE'>.org</span>
                                              <span className='text-primary dark:text_WHITE'> + .store + .shop</span>
                                          </h2>
                                      </div>

                                      <div className='flex items-center gap-4 domainlist-detail'>
                                          <span className='save-lable bg-tealdark'>Save 55%</span>
                                          <div className='text-left min-w-36'>
                                              <p className='flex text-primary dark:text_WHITE text-xs font-medium gap-1.5 items-center'>
                                                  For the first year
                                                  <FiInfo />
                                              </p>
                                              <p className='price-tag'>$38.99 <span>$74.99</span></p>
                                          </div>
                                          <div className='flex justify-start'>
                                              <NavLink to="" className='btn-outline' >
                                                  <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                      <path d="M7.1665 9.33331C7.0339 9.33331 6.90672 9.38599 6.81295 9.47976C6.71918 9.57353 6.6665 9.7007 6.6665 9.83331C6.6665 9.96592 6.71918 10.0931 6.81295 10.1869C6.90672 10.2806 7.0339 10.3333 7.1665 10.3333H9.83317C9.96578 10.3333 10.093 10.2806 10.1867 10.1869C10.2805 10.0931 10.3332 9.96592 10.3332 9.83331C10.3332 9.7007 10.2805 9.57353 10.1867 9.47976C10.093 9.38599 9.96578 9.33331 9.83317 9.33331H7.1665Z" fill="currentcolor" />
                                                      <path fillRule="evenodd" clipRule="evenodd" d="M10.2764 2.05333C10.395 1.99405 10.5322 1.98428 10.658 2.02616C10.7838 2.06804 10.8878 2.15814 10.9471 2.27666L12.1558 4.694C12.4407 4.70777 12.7007 4.73133 12.9358 4.76466C13.6398 4.86533 14.2224 5.08266 14.6364 5.59466C15.0504 6.10666 15.1411 6.722 15.0924 7.43133C15.0458 8.11866 14.8591 8.986 14.6271 10.0693L14.3264 11.474C14.1698 12.2053 14.0424 12.798 13.8824 13.2607C13.7158 13.744 13.4958 14.1407 13.1211 14.444C12.7464 14.7473 12.3118 14.8787 11.8051 14.9407C11.3184 15 10.7118 15 9.96511 15H7.03444C6.28644 15 5.68044 15 5.19377 14.9407C4.68711 14.8787 4.25244 14.7473 3.87777 14.444C3.50311 14.1407 3.28311 13.744 3.11644 13.2613C2.95644 12.798 2.82977 12.2053 2.67244 11.4747L2.37177 10.07C2.13977 8.986 1.95377 8.11866 1.90644 7.43133C1.85777 6.722 1.94844 6.10733 2.36244 5.59466C2.77577 5.08266 3.35844 4.86533 4.06244 4.76466C4.29799 4.73177 4.55799 4.70822 4.84244 4.694L6.05311 2.27666C6.11295 2.15908 6.21685 2.06992 6.34215 2.02861C6.46745 1.98731 6.604 1.99719 6.72204 2.05613C6.84008 2.11506 6.93005 2.21826 6.97233 2.34323C7.01461 2.46821 7.00579 2.60483 6.94777 2.72333L5.97444 4.668C6.21711 4.66666 6.47244 4.66622 6.74044 4.66666H10.2591C10.5271 4.66666 10.7824 4.66711 11.0251 4.668L10.0524 2.72333C9.99316 2.60477 9.98339 2.46753 10.0253 2.34176C10.0671 2.216 10.1573 2.11202 10.2758 2.05266M4.32111 5.73866L4.05244 6.276C4.02251 6.3348 4.00451 6.39896 3.99949 6.46475C3.99446 6.53055 4.00252 6.59669 4.02318 6.65936C4.04384 6.72203 4.0767 6.77999 4.11987 6.8299C4.16304 6.87981 4.21566 6.92068 4.2747 6.95015C4.33373 6.97963 4.39802 6.99713 4.46386 7.00164C4.52969 7.00615 4.59577 6.99758 4.65827 6.97644C4.72078 6.95529 4.77849 6.92198 4.82806 6.87842C4.87763 6.83487 4.91809 6.78193 4.94711 6.72266L5.47177 5.67333C5.85177 5.66666 6.28511 5.666 6.78111 5.666H10.2184C10.7144 5.666 11.1478 5.666 11.5278 5.67266L12.0524 6.72266C12.1123 6.84024 12.2162 6.9294 12.3415 6.97071C12.4668 7.01202 12.6033 7.00213 12.7214 6.9432C12.8394 6.88427 12.9294 6.78107 12.9717 6.65609C13.0139 6.53111 13.0051 6.39449 12.9471 6.276L12.6784 5.73866L12.7944 5.754C13.3838 5.83866 13.6724 5.99266 13.8591 6.22266C14.0424 6.44933 14.1324 6.758 14.0964 7.33266H2.90311C2.86711 6.758 2.95711 6.44933 3.14044 6.22266C3.32711 5.99266 3.61577 5.83866 4.20511 5.754L4.32111 5.73866Z" fill="currentcolor" />
                                                </svg>
                                              </NavLink>
                                          </div>
                                      </div>
                                  </div>

                                  <hr className='card-divider my-2' />

                                  <div className='flex items-center justify-between gap-2'>
                                      <div className="flex flex-col items-start justify-between gap-2">
                                          <button className='btn-sky'>Consider This Package</button>
                                          <h2 className='flex flex-wrap items-center card-title'>
                                              <RiGlobalLine className='mr-1.5 text-lg text-primary dark:text_WHITE' />
                                              <span className='text-primary dark:text_WHITE'>apple</span>
                                              <span className='text-darkbtn dark:text_WHITE'>.org</span>
                                              <span className='text-primary dark:text_WHITE'> + .store + .shop</span>
                                          </h2>
                                      </div>

                                      <div className='flex items-center gap-4 domainlist-detail'>
                                          <span className='save-lable bg-tealdark'>Save 55%</span>
                                          <div className='text-left min-w-36'>
                                              <p className='flex text-primary dark:text_WHITE text-xs font-medium gap-1.5 items-center'>
                                                  For the first year
                                                  <FiInfo />
                                              </p>
                                              <p className='price-tag'>$38.99 <span>$74.99</span></p>
                                          </div>
                                          <div className='flex justify-start'>
                                              <NavLink to="" className='btn-outline' >
                                                  <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                      <path d="M7.1665 9.33331C7.0339 9.33331 6.90672 9.38599 6.81295 9.47976C6.71918 9.57353 6.6665 9.7007 6.6665 9.83331C6.6665 9.96592 6.71918 10.0931 6.81295 10.1869C6.90672 10.2806 7.0339 10.3333 7.1665 10.3333H9.83317C9.96578 10.3333 10.093 10.2806 10.1867 10.1869C10.2805 10.0931 10.3332 9.96592 10.3332 9.83331C10.3332 9.7007 10.2805 9.57353 10.1867 9.47976C10.093 9.38599 9.96578 9.33331 9.83317 9.33331H7.1665Z" fill="currentcolor" />
                                                      <path fillRule="evenodd" clipRule="evenodd" d="M10.2764 2.05333C10.395 1.99405 10.5322 1.98428 10.658 2.02616C10.7838 2.06804 10.8878 2.15814 10.9471 2.27666L12.1558 4.694C12.4407 4.70777 12.7007 4.73133 12.9358 4.76466C13.6398 4.86533 14.2224 5.08266 14.6364 5.59466C15.0504 6.10666 15.1411 6.722 15.0924 7.43133C15.0458 8.11866 14.8591 8.986 14.6271 10.0693L14.3264 11.474C14.1698 12.2053 14.0424 12.798 13.8824 13.2607C13.7158 13.744 13.4958 14.1407 13.1211 14.444C12.7464 14.7473 12.3118 14.8787 11.8051 14.9407C11.3184 15 10.7118 15 9.96511 15H7.03444C6.28644 15 5.68044 15 5.19377 14.9407C4.68711 14.8787 4.25244 14.7473 3.87777 14.444C3.50311 14.1407 3.28311 13.744 3.11644 13.2613C2.95644 12.798 2.82977 12.2053 2.67244 11.4747L2.37177 10.07C2.13977 8.986 1.95377 8.11866 1.90644 7.43133C1.85777 6.722 1.94844 6.10733 2.36244 5.59466C2.77577 5.08266 3.35844 4.86533 4.06244 4.76466C4.29799 4.73177 4.55799 4.70822 4.84244 4.694L6.05311 2.27666C6.11295 2.15908 6.21685 2.06992 6.34215 2.02861C6.46745 1.98731 6.604 1.99719 6.72204 2.05613C6.84008 2.11506 6.93005 2.21826 6.97233 2.34323C7.01461 2.46821 7.00579 2.60483 6.94777 2.72333L5.97444 4.668C6.21711 4.66666 6.47244 4.66622 6.74044 4.66666H10.2591C10.5271 4.66666 10.7824 4.66711 11.0251 4.668L10.0524 2.72333C9.99316 2.60477 9.98339 2.46753 10.0253 2.34176C10.0671 2.216 10.1573 2.11202 10.2758 2.05266M4.32111 5.73866L4.05244 6.276C4.02251 6.3348 4.00451 6.39896 3.99949 6.46475C3.99446 6.53055 4.00252 6.59669 4.02318 6.65936C4.04384 6.72203 4.0767 6.77999 4.11987 6.8299C4.16304 6.87981 4.21566 6.92068 4.2747 6.95015C4.33373 6.97963 4.39802 6.99713 4.46386 7.00164C4.52969 7.00615 4.59577 6.99758 4.65827 6.97644C4.72078 6.95529 4.77849 6.92198 4.82806 6.87842C4.87763 6.83487 4.91809 6.78193 4.94711 6.72266L5.47177 5.67333C5.85177 5.66666 6.28511 5.666 6.78111 5.666H10.2184C10.7144 5.666 11.1478 5.666 11.5278 5.67266L12.0524 6.72266C12.1123 6.84024 12.2162 6.9294 12.3415 6.97071C12.4668 7.01202 12.6033 7.00213 12.7214 6.9432C12.8394 6.88427 12.9294 6.78107 12.9717 6.65609C13.0139 6.53111 13.0051 6.39449 12.9471 6.276L12.6784 5.73866L12.7944 5.754C13.3838 5.83866 13.6724 5.99266 13.8591 6.22266C14.0424 6.44933 14.1324 6.758 14.0964 7.33266H2.90311C2.86711 6.758 2.95711 6.44933 3.14044 6.22266C3.32711 5.99266 3.61577 5.83866 4.20511 5.754L4.32111 5.73866Z" fill="currentcolor" />
                                                </svg>
                                              </NavLink>
                                          </div>
                                      </div>
                                  </div>
              */}
            </div>
          </div>
        </div>
      </div>
      {(isLoading || cartLoading) && <Loader />}
    </>
  );
};

export default FindOptions;
