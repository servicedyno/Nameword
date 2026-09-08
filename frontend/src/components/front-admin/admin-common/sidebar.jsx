import { hostingData, billing, favicon, Help } from "../../common/icons";
import { NavLink, useLocation, useNavigate, useParams } from "react-router";
import { RiGlobalLine } from "react-icons/ri";
import {
  IoIosArrowDown,
  IoIosArrowUp,
  IoIosArrowForward,
  IoIosArrowBack,
} from "react-icons/io";
import { HiOutlineExternalLink } from "react-icons/hi";
import { useEffect, useMemo, useState } from "react";
import { ImSun } from "react-icons/im";
import { MdOutlineNightlight } from "react-icons/md";
import { useTheme } from "../../../hooks/useTheme";
import { useDomain } from "../../../hooks/useDomain";
import { useCustomLocation } from "../../../hooks/useCustomLocation";
import { hostingAPI } from "../../../api/hosting";
import { useAlert } from "../../../context/AlertContext";
import { useLanguage } from "../../../hooks/useLanguage";

const domainRoutes = ["/domain-overview", "/dns-management", "/contact-info"];

const hostingRoutes = new Set([
  "/setup-websites",
  "/websites-overview",
  "/manage-plan",
  "/upgrade-plan",
  "/renew-plan",
]);

export default function Sidebar({ setIsEnlarge }) {
  const [openMenus, setOpenMenus] = useState({
    domains: false,
    hosting: false,
    billing: false,
  });
  const [hostingOrders, setHostingOrders] = useState([]);
  const [hostingLoading, setHostingLoading] = useState(true);
  const [addonDomainsMap, setAddonDomainsMap] = useState({});

  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { domainName: domainNameParam } = useParams();

  const { isHostingRoute, isDomainRoute } = useMemo(() => {
    return {
      isHostingRoute: hostingRoutes.has(pathname),
      isDomainRoute: domainRoutes.find((d) => pathname.startsWith(d)),
    };
  }, [pathname]);

  const { mode, darkMode, lightMode } = useTheme();

  const { domains } = useDomain();
  const { showAlert } = useAlert();
  const { t } = useLanguage();

  const locationState = useCustomLocation();
  const locationDomain = locationState?.currentDomain;

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

  const hostingDomains = useMemo(() => {
    if (!Array.isArray(domains)) {
      return [];
    }

    const connected = domains.filter((domain) => {
      if (!domain) return false;

      if (typeof domain.hostingStatus === "string") {
        return ["active", "connected", "provisioned"].includes(
          domain.hostingStatus.toLowerCase(),
        );
      }

      if (
        domain.hasHosting ||
        domain.isHostingActive ||
        domain.hostingActive ||
        domain.hostingPlan
      ) {
        return true;
      }

      return (domain.provider || "").toLowerCase() === "hostbay";
    });

    return connected;
  }, [domains]);

  const hostingSites = useMemo(() => {
    if (Array.isArray(hostingOrders) && hostingOrders.length > 0) {
      const domainLookup = Array.isArray(domains)
        ? domains.reduce((map, domain) => {
            const name = domain?.websiteName?.toLowerCase();
            if (name) {
              map.set(name, domain);
            }
            return map;
          }, new Map())
        : new Map();

      const uniqueSites = new Map();

      hostingOrders.forEach((order) => {
        const domainName = order?.domainName || order?.hostbayResponse?.domain;
        if (!domainName) {
          return;
        }
        const normalized = domainName.toLowerCase();
        if (uniqueSites.has(normalized)) {
          return;
        }
        uniqueSites.set(normalized, {
          key: order._id || order.id || domainName,
          domainName,
          domain: domainLookup.get(normalized) || null,
          hostingOrder: order,
          isAddon: false,
        });

        // Add addon domains as separate entries
        const subscriptionId =
          order?.hostbayResponse?.subscription?.id ||
          order?.hostbayResponse?.subscription_id ||
          order?.subscription_id ||
          order?.subscriptionId;

        if (subscriptionId) {
          const subIdInt = parseInt(subscriptionId, 10);
          const addonData = addonDomainsMap[subIdInt];

          if (
            addonData &&
            Array.isArray(addonData.addon_domains) &&
            addonData.addon_domains.length > 0
          ) {
            addonData.addon_domains.forEach((addonDomain) => {
              const addonDomainName = addonDomain.domain;
              if (addonDomainName) {
                const addonNormalized = addonDomainName.toLowerCase();
                if (!uniqueSites.has(addonNormalized)) {
                  uniqueSites.set(addonNormalized, {
                    key: `addon-${subIdInt}-${addonDomainName}`,
                    domainName: addonDomainName,
                    domain: null,
                    hostingOrder: order,
                    isAddon: true,
                  });
                }
              }
            });
          }
        }
      });

      // Add domain from location state if it's not already in the list
      if (locationDomain?.websiteName) {
        const normalizedLocationDomain =
          locationDomain.websiteName.toLowerCase();
        if (!uniqueSites.has(normalizedLocationDomain)) {
          const locationDomainObj = Array.isArray(domains)
            ? domains.find(
                (d) =>
                  d.websiteName?.toLowerCase() === normalizedLocationDomain,
              )
            : null;
          uniqueSites.set(normalizedLocationDomain, {
            key:
              locationDomainObj?.id ||
              locationDomainObj?._id ||
              locationDomain.id ||
              locationDomain._id ||
              locationDomain.websiteName,
            domainName: locationDomain.websiteName,
            domain: locationDomainObj || locationDomain,
            hostingOrder: null,
          });
        }
      }

      return Array.from(uniqueSites.values());
    }

    const fallbackList =
      hostingDomains.length > 0
        ? hostingDomains
        : Array.isArray(domains)
          ? domains
          : [];

    const sites = fallbackList.map((domain) => ({
      key:
        domain?.id || domain?._id || domain?.websiteName || domain?.domainName,
      domainName:
        domain?.websiteName || domain?.domainName || domain?.name || "",
      domain,
      hostingOrder: null,
    }));

    // Add domain from location state if it's not already in the list
    if (locationDomain?.websiteName) {
      const normalizedLocationDomain = locationDomain.websiteName.toLowerCase();
      const exists = sites.some(
        (site) =>
          site.domainName?.toLowerCase() === normalizedLocationDomain ||
          site.domain?.websiteName?.toLowerCase() === normalizedLocationDomain,
      );
      if (!exists) {
        sites.unshift({
          key:
            locationDomain.id ||
            locationDomain._id ||
            locationDomain.websiteName,
          domainName: locationDomain.websiteName,
          domain: locationDomain,
          hostingOrder: null,
        });
      }
    }

    return sites;
  }, [hostingOrders, hostingDomains, domains, locationDomain, addonDomainsMap]);

  const activeDomain = useMemo(() => {
    // First priority: domain from location state - try to match with domains array by websiteName
    if (locationDomain?.websiteName) {
      if (Array.isArray(domains)) {
        const matchedDomain = domains.find(
          (domain) =>
            domain.websiteName?.toLowerCase() ===
            locationDomain.websiteName.toLowerCase(),
        );
        if (matchedDomain) {
          return matchedDomain;
        }
      }

      // For hosting routes, also check hostingSites
      if (isHostingRoute && hostingSites.length > 0) {
        const matchedSite = hostingSites.find(
          (site) =>
            site.domainName?.toLowerCase() ===
              locationDomain.websiteName.toLowerCase() ||
            site.domain?.websiteName?.toLowerCase() ===
              locationDomain.websiteName.toLowerCase(),
        );
        if (matchedSite?.domain) {
          return matchedSite.domain;
        }
        // If site found but no domain object, create one
        if (matchedSite) {
          return {
            websiteName: matchedSite.domainName,
            id: matchedSite.key,
          };
        }
      }

      // Return locationDomain as fallback if no match found
      return locationDomain;
    }

    // Second priority: domain from URL parameter (when on domain route)
    if (decodedDomainName && Array.isArray(domains)) {
      const matchedDomain = domains.find(
        (domain) =>
          domain.websiteName?.toLowerCase() === decodedDomainName.toLowerCase(),
      );
      if (matchedDomain) {
        return matchedDomain;
      }
    }

    // Fallback: first domain/hosting site in the list
    if (isHostingRoute && hostingSites.length > 0) {
      const firstSite = hostingSites[0];
      return (
        firstSite.domain || {
          websiteName: firstSite.domainName,
          id: firstSite.key,
        }
      );
    }

    return null;
  }, [
    locationDomain,
    decodedDomainName,
    domains,
    isHostingRoute,
    hostingSites,
  ]);

  const activeDomainId = activeDomain?.id ?? activeDomain?._id ?? null;
  const normalizedActiveDomain = activeDomain?.websiteName?.toLowerCase() || "";

  useEffect(() => {
    if (
      isHostingRoute &&
      hostingSites.length > 0 &&
      activeDomain?.websiteName
    ) {
      const locationDomainName = locationDomain?.websiteName?.toLowerCase();
      const activeDomainName = activeDomain?.websiteName?.toLowerCase();

      if (!locationDomainName || locationDomainName !== activeDomainName) {
        navigate(pathname, {
          replace: true,
          state: { currentDomain: activeDomain },
        });
      }
    }
  }, [
    isHostingRoute,
    hostingSites,
    locationDomain,
    activeDomain,
    pathname,
    navigate,
  ]);

  useEffect(() => {
    let isMounted = true;

    const fetchHostingOrders = async () => {
      try {
        setHostingLoading(true);
        const response = await hostingAPI.getHostingOrders({
          status: "completed",
        });
        if (!isMounted) {
          return;
        }
        const orders = response?.responseData?.orders;
        setHostingOrders(Array.isArray(orders) ? orders : []);

        // Fetch addon domains for each hosting order with subscription_id
        if (Array.isArray(orders) && orders.length > 0) {
          const addonPromises = orders.map(async (order) => {
            const subscriptionId =
              order?.hostbayResponse?.subscription?.id ||
              order?.hostbayResponse?.subscription_id ||
              order?.subscription_id ||
              order?.subscriptionId;

            if (subscriptionId) {
              try {
                const subIdInt = parseInt(subscriptionId, 10);
                if (!isNaN(subIdInt) && subIdInt > 0) {
                  const addonResponse =
                    await hostingAPI.getAddonDomains(subIdInt);
                  if (addonResponse?.success && addonResponse?.responseData) {
                    return {
                      subscriptionId: subIdInt,
                      addonData: addonResponse.responseData,
                    };
                  }
                }
              } catch (error) {
                console.error(
                  `Failed to fetch addon domains for subscription ${subscriptionId}:`,
                  error,
                );
              }
            }
            return null;
          });

          const addonResults = await Promise.all(addonPromises);
          const addonMap = {};
          addonResults.forEach((result) => {
            if (result && result.subscriptionId) {
              addonMap[result.subscriptionId] = result.addonData;
            }
          });

          if (!isMounted) return;
          setAddonDomainsMap(addonMap);
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }
        console.error("Failed to fetch hosting orders:", error);
        const message =
          error?.response?.data?.responseMsg?.message ||
          error?.response?.data?.message ||
          t.admin.failedToFetchHostingOrders;
        showAlert(message, { duration: 3000, type: "warning" });
        setHostingOrders([]);
      } finally {
        if (isMounted) {
          setHostingLoading(false);
        }
      }
    };

    fetchHostingOrders();

    return () => {
      isMounted = false;
    };
  }, [showAlert]);

  const getOverviewPath = (domain) => {
    const targetDomain =
      domain?.websiteName ||
      activeDomain?.websiteName ||
      domains?.[0]?.websiteName;

    return targetDomain
      ? `/domain-overview/${encodeURIComponent(targetDomain)}`
      : "/domain-overview";
  };

  const toggleMenu = (menu) => {
    setOpenMenus((prev) => ({
      ...prev,
      [menu]: !prev[menu],
    }));
  };
  const closeSidebar = () => {
    if (window.innerWidth < 1280 && setIsEnlarge) {
      setIsEnlarge(false);
    }
  };

  const handleChangeDomain = (event) => {
    const selectedValue = event.target.value;

    let selectedDomain = null;

    if (isHostingRoute) {
      // For hosting routes, find domain from hostingSites
      const selectedSite = hostingSites.find((site) => {
        const domain = site.domain || {
          websiteName: site.domainName,
          id: site.key,
        };
        const siteValue =
          domain.id?.toString() || domain.websiteName || site.domainName;
        return (
          siteValue === selectedValue ||
          site.domain?.id?.toString() === selectedValue ||
          site.domain?.websiteName === selectedValue ||
          site.domainName === selectedValue ||
          site.key?.toString() === selectedValue
        );
      });

      if (selectedSite) {
        selectedDomain = selectedSite.domain || {
          websiteName: selectedSite.domainName,
          id: selectedSite.key,
        };

        if (selectedSite.domainName) {
          selectedDomain.websiteName = selectedSite.domainName;
        }
      }
    } else {
      // For domain routes, find from domains array
      selectedDomain = domains.find(
        (d) =>
          d.id.toString() === selectedValue || d.websiteName === selectedValue,
      );
    }

    if (!selectedDomain || !selectedDomain.websiteName) {
      return;
    }

    if (pathname.startsWith("/domain-overview")) {
      const overviewPath = getOverviewPath(selectedDomain);
      navigate(overviewPath, {
        replace: true,
        state: { currentDomain: selectedDomain },
      });
      return;
    }

    navigate(pathname, {
      replace: true,
      state: { currentDomain: selectedDomain },
    });
  };

  return (
    <aside className="h-full">
      <div className="flex flex-col justify-between h-full">
        <div>
          <div className="mb-8">
            <NavLink to={"/"}>
              <img
                src={favicon}
                alt="Hosting"
                className="w-8 h-8 dark-mode xl:block hidden"
              />
            </NavLink>
          </div>

          {!isHostingRoute && !isDomainRoute ? (
            <div className="space-y-6">
              {/* Dashboard */}
              <NavLink to={"/dashboard"} className="sidebar-items active">
                {t.admin.dashboard}
              </NavLink>

              <hr className="sidebar-divider my-6" />

              {/* Domains */}
              <div className="flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <NavLink
                    to={"/domain-portfolio"}
                    className="flex items-center gap-2 text-lightgray-700 dark:text-gray-400"
                    onClick={closeSidebar}
                  >
                    <RiGlobalLine size={20} />
                    <span className="font-medium text-15">
                      {t.admin.domains}
                    </span>
                  </NavLink>
                  <button
                    type="button"
                    className="right-link"
                    onClick={() => toggleMenu("domains")}
                  >
                    <NavLink to="/domain-portfolio">{t.admin.seeAll}</NavLink>
                    {openMenus.domains ? (
                      <IoIosArrowUp size={16} className="cursor-pointer" />
                    ) : (
                      <IoIosArrowDown size={16} className="cursor-pointer" />
                    )}
                  </button>
                </div>

                {openMenus.domains && (
                  <ul className="sidebar-link">
                    {domains.length > 0 ? (
                      domains.slice(0, 3).map((d) => (
                        <li key={d.id}>
                          <NavLink
                            to={getOverviewPath(d)}
                            state={{ currentDomain: d }}
                            className={
                              d.id === activeDomain?.id ? "active" : ""
                            }
                            onClick={closeSidebar}
                          >
                            {d.websiteName}
                          </NavLink>
                        </li>
                      ))
                    ) : (
                      <li>
                        <NavLink to={""}>{t.admin.noDomainFound}</NavLink>
                      </li>
                    )}
                  </ul>
                )}
              </div>

              <hr className="sidebar-divider my-6" />

              {/* Hosting */}
              <div className="flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <NavLink
                    to={"/websites"}
                    className="flex items-center gap-2 text-lightgray-700 dark:text-gray-400"
                    onClick={closeSidebar}
                  >
                    <img
                      src={hostingData}
                      alt="Hosting"
                      className="dark-mode"
                    />
                    <span className="font-medium text-15">
                      {t.admin.websites}
                    </span>
                  </NavLink>
                  <div
                    className="right-link"
                    onClick={() => toggleMenu("hosting")}
                  >
                    <NavLink to="/websites">{t.admin.seeAll}</NavLink>
                    <button type="button">
                      {openMenus.hosting ? (
                        <IoIosArrowUp size={16} />
                      ) : (
                        <IoIosArrowDown size={16} />
                      )}
                    </button>
                  </div>
                </div>

                {openMenus.hosting && (
                  <ul className="sidebar-link">
                    {hostingLoading ? (
                      <li>
                        <span className="text-secondary text-13">
                          {t.admin.loadingHosting}
                        </span>
                      </li>
                    ) : hostingSites.length > 0 ? (
                      hostingSites.slice(0, 3).map((site) => {
                        const domainState = site.domain
                          ? { currentDomain: site.domain }
                          : site.domainName
                            ? {
                                currentDomain: { websiteName: site.domainName },
                              }
                            : undefined;
                        const domainId =
                          site.domain?.id ?? site.domain?._id ?? null;
                        const isActive = domainId
                          ? domainId.toString() ===
                            (activeDomainId || "").toString()
                          : site.domainName?.toLowerCase() ===
                            normalizedActiveDomain;

                        return (
                          <li
                            key={`hosting-${
                              site.key || site.domainName || "row"
                            }`}
                          >
                            <NavLink
                              to={
                                site.hostingOrder
                                  ? "/websites-overview"
                                  : "/setup-websites"
                              }
                              state={domainState}
                              className={`flex justify-between items-center ${
                                isActive ? "active" : ""
                              }`}
                            >
                              {site.domainName || t.admin.unnamedDomain}
                              <IoIosArrowForward size={14} />
                            </NavLink>
                          </li>
                        );
                      })
                    ) : (
                      <li>
                        <span className="text-secondary text-13">
                          {t.admin.noHostingConnected}
                        </span>
                      </li>
                    )}
                  </ul>
                )}
              </div>

              <hr className="sidebar-divider my-6" />

              {/* Billing */}
              <div className="flex flex-col gap-5">
                <button
                  type="button"
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleMenu("billing")}
                >
                  <div className="flex items-center gap-2 text-lightgray-700 dark:text-gray-400">
                    <img src={billing} alt="Hosting" className="dark-mode" />
                    <span className="font-medium text-15">
                      {t.admin.billing}
                    </span>
                  </div>
                  <div className="right-link">
                    {openMenus.billing ? (
                      <IoIosArrowUp size={16} />
                    ) : (
                      <IoIosArrowDown size={16} />
                    )}
                  </div>
                </button>

                {openMenus.billing && (
                  <ul className="sidebar-link" onClick={closeSidebar}>
                    <li>
                      <NavLink to={"/wallet"}>{t.admin.wallet}</NavLink>
                    </li>
                    <li>
                      <NavLink to={"/subscriptions"}>
                        {t.admin.subscriptions}
                      </NavLink>
                    </li>
                    <li>
                      <NavLink to={"/payment-history"}>
                        {t.admin.paymentHistory}
                      </NavLink>
                    </li>
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <NavLink to={"/dashboard"} className={"right-link"}>
                <IoIosArrowBack /> {t.admin.back}
              </NavLink>

              {/* Domain */}
              <div className="relative">
                <select
                  className="select-items"
                  value={
                    activeDomain?.id?.toString() ||
                    activeDomain?.websiteName ||
                    ""
                  }
                  onChange={handleChangeDomain}
                >
                  {isHostingRoute ? (
                    // For hosting routes, show domains from hostingSites
                    hostingSites.length > 0 ? (
                      hostingSites.map((site) => {
                        const domain = site.domain || {
                          websiteName: site.domainName,
                          id: site.key,
                        };

                        const optionValue =
                          domain.id?.toString() ||
                          domain.websiteName ||
                          site.domainName;
                        const optionLabel =
                          domain.websiteName || site.domainName;
                        return (
                          <option
                            key={site.key || optionValue}
                            value={optionValue}
                          >
                            {optionLabel}
                          </option>
                        );
                      })
                    ) : (
                      <option value="">{t.admin.noHostingDomainsFound}</option>
                    )
                  ) : // For domain routes, show all domains
                  domains.length > 0 ? (
                    domains.map((d) => (
                      <option key={d.id} value={d.id.toString()}>
                        {d.websiteName}
                      </option>
                    ))
                  ) : (
                    <option value="">{t.admin.noDomainsFound}</option>
                  )}
                </select>
                <IoIosArrowDown size={16} className="absolute top-4 right-2" />
              </div>
              {isDomainRoute && (
                <ul className="sidebar-link" onClick={closeSidebar}>
                  <li>
                    <NavLink
                      to={getOverviewPath(activeDomain)}
                      state={{ currentDomain: activeDomain }}
                    >
                      {t.admin.overview}
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to={"/contact-info"}
                      state={{ currentDomain: activeDomain }}
                    >
                      {t.admin.contactInfo}
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to={"/dns-management"}
                      state={{ currentDomain: activeDomain }}
                    >
                      {t.admin.dnsManagement}
                    </NavLink>
                  </li>
                </ul>
              )}

              {/* Hosting */}
              {isHostingRoute && (
                <ul className="sidebar-link" onClick={closeSidebar}>
                  <li>
                    <NavLink to={"/setup-websites"}>{t.admin.setup}</NavLink>
                  </li>
                  <li>
                    <NavLink to={"/websites-overview"}>
                      {t.admin.overview}
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to={"/manage-plan"}>{t.admin.managePlan}</NavLink>
                  </li>
                  <li>
                    <NavLink to={"/upgrade-plan"}>
                      {t.admin.upgradePlan}
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to={"/renew-plan"}>{t.admin.renewPlan}</NavLink>
                  </li>
                  <li>
                    <a
                      href="https://www.cpanel.net/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={"flex items-center justify-between"}
                    >                    
                      {t.admin.cPanel} < HiOutlineExternalLink />
                    </a>
                  </li>
                </ul>
              )}
            </div>
          )}
        </div>
        <div className="space-y-5 text-13 font-medium xl:block hidden pt-20">
          <p className="text-lightgray-500 ">
            {new Date().getFullYear()} © {t.admin.allRightsReserved}
          </p>
          <div className="flex flex-col gap-2.5 dark:text-gray-400 hover:dark:text-gray-400">
            <NavLink to={"/terms-and-conditions"}>
              {t.admin.termsAndConditions}
            </NavLink>
            <NavLink to={"/privacy-policy"}>{t.admin.privacyPolicy}</NavLink>
          </div>
        </div>
        <div className="text-13 font-medium xl:hidden flex items-center justify-between">
          <NavLink to={"/help-support"} className="auth-navlink">
            <img
              src={Help}
              alt={t.admin.helpSupport}
              title={t.admin.helpSupport}
              className="dark-mode"
            />{" "}
            {t.admin.helpSupport}
          </NavLink>
          <div className="flex items-center gap-2.5">
            <div className="language-menu cursor-po">
              <button
                onClick={lightMode}
                className={`header-icon ${
                  mode === "light"
                    ? "text-white dark:text-white bg-darkbtn dark:bg-gray-700 rounded p-1"
                    : " text-primary dark:text-white bg-tranparent p-1"
                }`}
              >
                <ImSun />
              </button>

              <button
                onClick={darkMode}
                className={`header-icon rotate-180 ${
                  mode === "dark"
                    ? "text-white dark:text-white bg-darkbtn dark:bg-gray-700 rounded p-1"
                    : " text-primary dark:text-white bg-tranparent p-1"
                }`}
              >
                <MdOutlineNightlight />
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
