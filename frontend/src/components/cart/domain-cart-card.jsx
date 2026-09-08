import { LuTrash2 } from "react-icons/lu";
import { IoChevronDown } from "react-icons/io5";

import { useState, useCallback, useEffect } from "react";
import { cartAPI } from "../../api/cartApi";
import { domainAPI } from "../../api/domains";
import { useAlert } from "../../context/AlertContext";
import { useLanguage } from "../../hooks/useLanguage";

const DomainCartCard = ({ items = [], onItemUpdate, setUpdateLoading, isGuestCart, onRemove }) => {
  const [selected, setSelected] = useState("1 Year");
  const [open, setOpen] = useState(false);
  const [isToggled, setIsToggled] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [selectedTermByItemId, setSelectedTermByItemId] = useState({});
  const [protectionToggledByItemId, setProtectionToggledByItemId] = useState(
    {}
  );
  const { showAlert } = useAlert();
  const { t } = useLanguage();

  const terms = [
    t.cart.domain.years.one,
    t.cart.domain.years.three,
    t.cart.domain.years.five,
    t.cart.domain.years.ten
  ];

  const handleRemoveFromCart = async (itemId) => {
    if (!itemId) return;
    if (onRemove) {
      await onRemove(itemId);
      showAlert(t.cart.domain.domainRemoved || "Domain removed from cart", { duration: 2500, type: "success" });
      return;
    }
    try {
      const removeFromCart = await cartAPI.removeCartItem({ id: itemId });
      if (removeFromCart?.success == true) {
        showAlert(removeFromCart?.message, { duration: 2500, type: "success" });
      }
      window.dispatchEvent(new Event("cart:updated"));
    } catch (error) {
      const msg =
        error?.response?.data?.message || t.cart.domain.removeError;
      showAlert(msg, { duration: 2500, type: "warning" });
    }
  };

  const handleTermSelect = useCallback(
    async (itemId, newTerm) => {
      const year = parseInt(newTerm.split(" ")[0]);
      const item = items.find((i) => i._id === itemId);
      const websiteName = item?.domain?.name || item?.websiteName || "";
      if (!websiteName) return;

      setUpdateLoading?.(true);

      try {
        const priceResponse = await domainAPI.checkDomainPrice({
          websiteName,
          provider: "openprovider",
          registrationFeePerc: 50,
          renewalFeePerc: 50,
          transferFeePerc: 50,
          duration: year,
        });

        const registrationFee = priceResponse?.responseData?.registrationFee;
        const originalAmount = (registrationFee / 1.5).toFixed(2);

        if (registrationFee && onItemUpdate) {
          onItemUpdate(itemId, {
            price: {
              ...item.price,
              amount: registrationFee.toFixed(2),
              originalAmount: originalAmount,
              currency: item?.price?.currency || "USD",
            },
            domain: { ...item.domain, years: year },
          });

          if (!isGuestCart) {
            await cartAPI.updateCartItem({
              id: itemId,
              years: year,
              price: {
                amount: registrationFee.toFixed(2),
                originalAmount: originalAmount,
                currency: item?.price?.currency || "USD",
              },
            });
          }

          showAlert(t.cart.domain.termUpdateSuccess.replace('{term}', newTerm), {
            duration: 2500,
            type: "success",
          });
        }
      } catch (error) {
        console.error("Failed to fetch dynamic price:", error);
        showAlert(t.cart.domain.priceUpdateError, {
          duration: 2500,
          type: "warning",
        });
      } finally {
        setUpdateLoading?.(false);
      }
    },
    [items, onItemUpdate, showAlert, setUpdateLoading, isGuestCart]
  );

  const handleProtectionToggle = useCallback(
    async (itemId, newVal) => {
      if (onItemUpdate) {
        const currentItem = items.find((i) => i._id === itemId);
        onItemUpdate(itemId, {
          domain: {
            ...currentItem.domain,
            whoisProtection: newVal,
          },
        });

        setUpdateLoading?.(true);

        try {
          if (isGuestCart) {
            showAlert(
              newVal ? t.cart.domain.protectionEnabled : t.cart.domain.protectionDisabled,
              { duration: 2500, type: "success" }
            );
          } else {
            const res = await cartAPI.updateCartItem({
              id: itemId,
              whoisProtection: newVal,
            });

            if (res?.success) {
              showAlert(
                newVal ? t.cart.domain.protectionEnabled : t.cart.domain.protectionDisabled,
                { duration: 2500, type: "success" }
              );
            } else {
              onItemUpdate(itemId, {
                domain: {
                  ...currentItem.domain,
                  whoisProtection: !newVal,
                },
              });
              showAlert(t.cart.domain.protectionError, {
                duration: 2500,
                type: "warning",
              });
            }
          }
        } catch (error) {
          console.error("Failed to update protection:", error);
          onItemUpdate(itemId, {
            domain: {
              ...currentItem.domain,
              whoisProtection: !newVal,
            },
          });
          showAlert(t.cart.domain.protectionUpdateError, {
            duration: 2500,
            type: "warning",
          });
        } finally {
          setUpdateLoading?.(false);
        }
      }
    },
    [items, onItemUpdate, showAlert, setUpdateLoading, isGuestCart]
  );

  useEffect(() => {
    const initialTerms = {};
    const initialProtection = {};

    items.forEach((item) => {
      if (item._id) {
        const years = item?.domain?.years || 1;
        initialTerms[item._id] = `${years} ${years === 1 ? t.cart.domain.year : t.cart.domain.yearsPlural}`;
        initialProtection[item._id] = !!item?.domain?.whoisProtection;
      }
    });

    setSelectedTermByItemId(initialTerms);
    setProtectionToggledByItemId(initialProtection);
  }, [items]);

  const getRenewalDate = (years) => {
    const now = new Date();
    now.setFullYear(now.getFullYear() + years);

    const month = now.toLocaleString("default", { month: "long" });
    const year = now.getFullYear();

    return t.cart.domain.renewsIn.replace('{month}', month).replace('{year}', year);
  };

  return (
    <div>
      {items.length > 0 &&
        items.map((item) => {
          const domainName = item?.domain?.name || item?.websiteName || "";
          const firstDotIndex = domainName.indexOf(".");
          const label =
            firstDotIndex > 0
              ? domainName.substring(0, firstDotIndex)
              : domainName;
          const tld =
            firstDotIndex > -1 ? domainName.substring(firstDotIndex) : "";
          const priceAmount = Number(item?.price?.amount ?? 0);
          const renewAmount =
            item?.renew?.amount ?? item?.domain?.renew?.amount ?? null;
          const isOpen = openDropdownId === item?._id;
          const selectedTerm = selectedTermByItemId[item?._id] || "1 Year";
          const itemProtectionOn = !!protectionToggledByItemId[item?._id];
          return (
            <div key={item?._id} className="cart-card mb-3">
              <div>
                <h2 className="flex flex-col flex-wrap items-start justify-start card-title font-medium">
                  <div className="flex items-center justify-between gap-3 flex-wrap w-full">
                    <p className="text-primary dark:text-gray-500 mb-1.5">
                      {label}
                      <span className="text-darkbtn dark:text-white">
                        {tld}
                      </span>
                    </p>
                    <LuTrash2
                      className="text-primary dark:text-gray-300 min-w-5 cursor-pointer"
                      size={18}
                      onClick={() => handleRemoveFromCart(item._id)}
                    />
                  </div>
                  <p className="text-xs font-medium text-primary dark:text-gray-300">
                    {t.cart.domain.brandProtection}
                  </p>
                </h2>
              </div>

              <hr className="card-divider my-6" />

              <div className="flex gap-2 justify-between items-center">
                <div className="flex flex-col gap-3">
                  <p className="cart-title text-15">
                    {t.cart.domain.domainRegistration.replace('{tld}', tld?.toUpperCase() || '')}
                  </p>

                  <div className="relative sm:w-48 w-36">
                    <div
                      onClick={() =>
                        setOpenDropdownId((prev) =>
                          prev === item?._id ? null : item?._id
                        )
                      }
                      className="term-select"
                    >
                      <p className="text-xs text-secondary font-medium">{t.cart.domain.term}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-primary dark:text-gray-400">
                          {selectedTerm}
                        </span>
                        <IoChevronDown className="absolute top-1/2 transform -translate-y-1/2 right-4 w-4 h-4 text-primary dark:text-gray-400" />
                      </div>
                    </div>

                    {isOpen && (
                      <div className="dropdown-select">
                        {terms.map((term) => (
                          <div
                            key={term}
                            onClick={() => {
                              setSelectedTermByItemId((prev) => ({
                                ...prev,
                                [item._id]: term,
                              }));
                              setOpenDropdownId(null);
                              handleTermSelect(item._id, term);
                            }}
                            className={`px-4 py-2 cursor-pointer hover:bg-slatelight dark:hover:bg-gray-800 text-sm font-medium text-primary dark:text-gray-400 ${selectedTerm === term
                              ? "bg-slatelight dark:bg-gray-900 font-medium"
                              : ""
                              }`}
                          >
                            {term}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {renewAmount !== null && (
                    <p className="cart-title text-13">
                      {getRenewalDate(item?.domain?.years || 1)} for $
                      {Number(renewAmount).toFixed(2)}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 text-primary dark:text-gray-300">
                  <p className="text-base font-medium text-tealdark">
                    ${priceAmount.toFixed(2)}
                  </p>
                  {/* Static discount example; can be made dynamic if backend provides original price */}
                  <p className="text-sm font-medium line-through">$34.99</p>
                  <p className="text-xs font-medium">21% off</p>
                </div>
              </div>

              <hr className="card-divider my-6" />

              <div className="flex items-center justify-between gap-3">
                <h2 className="flex flex-col flex-wrap items-start justify-start card-title font-medium gap-1">
                  <p className="text-primary dark:text-gray-500 mb-1.5 flex items-center gap-2.5">
                    <button
                      onClick={() => {
                        const newVal = !itemProtectionOn;
                        setProtectionToggledByItemId((prev) => ({
                          ...prev,
                          [item._id]: newVal,
                        }));
                        handleProtectionToggle(item._id, newVal);
                      }}
                      className={`w-12 h-6 flex items-center rounded-full border border-active-border p-1.5 transition-colors duration-300 ${itemProtectionOn ? "bg-white" : "bg-white"
                        }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full shadow-md transform transition-transform ${itemProtectionOn
                          ? "translate-x-5 bg-indigo-800"
                          : "-translate-x-0.5 bg-lightgray-300"
                          }`}
                      ></span>
                    </button>
                    {t.cart.domain.fullProtection}
                  </p>
                  <p className="text-xs font-medium text-primary dark:text-gray-300">
                    {t.cart.domain.protectionDescription}
                  </p>
                  {renewAmount && (
                    <p className="cart-title text-13">
                      Renews in July 2030 for $9.99
                    </p>
                  )}
                </h2>
                <div className="flex flex-col items-end gap-1 text-primary dark:text-gray-300">
                  <p className="text-base font-medium text-tealdark">
                    {t.cart.domain.freeFirstYear}
                  </p>
                  <p className="text-sm font-medium line-through">$5.99</p>
                  <p className="text-xs font-medium">{t.cart.hosting.hundredPercentOff}</p>
                </div>
              </div>
            </div>
          );
        })}

      {/* Static Code */}
      {/* <div className="cart-card mb-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex flex-col flex-wrap items-start justify-start card-title font-medium">
            <p className="text-primary dark:text-gray-500 mb-1.5">
              apple
              <span className="text-darkbtn dark:text-white">.kitchen</span>
            </p>
            <p className="text-xs font-medium text-primary dark:text-gray-300">
              The more domains you lock down, the better you protect your brand.
            </p>
          </h2>
          <LuTrash2
            className="text-primary dark:text-gray-300 min-w-5"
            size={18}
          />
        </div>

        <hr className="card-divider my-6" />

        <div className="flex gap-2 justify-between items-center">
          <div className="flex flex-col gap-3">
            <div className="relative w-48">
              <div onClick={() => setOpen(!open)} className="term-select">
                <p className="text-xs text-secondary font-medium">Term</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-primary dark:text-gray-400">
                    {selected}
                  </span>
                  <IoChevronDown className="w-4 h-4 text-primary dark:text-gray-400" />
                </div>
              </div>

              {open && (
                <div className="dropdown-select">
                  {terms.map((term) => (
                    <div
                      key={term}
                      onClick={() => {
                        setSelected(term);
                        setOpen(false);
                      }}
                      className={`px-4 py-2 cursor-pointer hover:bg-slatelight dark:hover:bg-gray-800 text-sm font-medium text-primary dark:text-gray-400 ${selected === term
                        ? "bg-slatelight dark:bg-gray-900 font-medium"
                        : ""
                        }`}
                    >
                      {term}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <p className="cart-title text-13">Renews in July 2030 for $9.99</p>
          </div>
          <div className="flex flex-col items-end gap-1 text-primary dark:text-gray-300">
            <p className="text-base font-medium text-tealdark">$9.99</p>
            <p className="text-sm font-medium line-through">$21.99</p>
            <p className="text-xs font-medium">15% off</p>
          </div>
        </div>

        <hr className="card-divider my-6" />

        <div className="flex items-center justify-between gap-3">
          <h2 className="flex flex_col flex-wrap items-start justify-start card-title font-medium gap-1">
            <p className="text-primary dark:text-gray-500 mb-1.5 flex items-center gap-2.5">
              <button
                onClick={() => setIsToggled(!isToggled)}
                className={`w-12 h-6 flex items-center rounded-full border border-active-border p-1.5 transition-colors duration-300 ${isToggled ? "bg-white" : "bg-white"
                  }`}
              >
                <span
                  className={`w-4 h-4 rounded-full shadow-md transform transition-transform ${isToggled
                    ? "translate-x-5 bg-indigo-800"
                    : "-translate-x-0.5 bg-lightgray-300"
                    }`}
                ></span>
              </button>
              Full Domain Protection
            </p>
            <p className="text-xs font-medium text-primary dark:text-gray-300">
              Keep your personal info (name, email, phone) hidden in public
              WHOIS records.
            </p>
            <p className="cart-title text-13">Renews in July 2030 for $9.99</p>
          </h2>
          <div className="flex flex-col items-end gap-1 text-primary dark:text-gray-300">
            <p className="text-base font-medium text-tealdark">
              Free for the 1st year
            </p>
            <p className="text-sm font_medium line-through">$5.99</p>
            <p className="text-xs font-medium">100% off</p>
          </div>
        </div>
      </div> */}

      {/* TEst */}
      {/* <div className="cart-card mb-3">
        <div className="flex items_center justify-between gap-3">
          <h2 className="flex flex-col flex-wrap items-start justify-start card-title font-medium">
            <p className="text-primary dark:text-gray-500 mb-1.5">
              Brand Protection Domain Package
            </p>
          </h2>
          <LuTrash2
            className="text-primary dark:text-gray-300 min-w-5"
            size={18}
          />
        </div>

        <hr className="card-divider my-6" />

        <div className="flex gap-2 justify-between items-center">
          <div className="flex flex-col gap-3">
            <p className="cart-title text-15">
              Domain Package (.kitchen + .com + .online)
            </p>

            <div className="relative w-48">
              <div onClick={() => setOpen(!open)} className="term-select">
                <p className="text-xs text-secondary font-medium">Term</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-primary dark:text-gray-400">
                    {selected}
                  </span>
                  <IoChevronDown className="w-4 h-4 text-primary dark:text-gray-400" />
                </div>
              </div>

              {open && (
                <div className="dropdown-select">
                  {terms.map((term) => (
                    <div
                      key={term}
                      onClick={() => {
                        setSelected(term);
                        setOpen(false);
                      }}
                      className={`px-4 py-2 cursor-pointer hover:bg-slatelight dark:hover:bg-gray-800 text-sm font-medium text-primary dark:text-gray-400 ${
                        selected === term
                          ? "bg-slatelight dark:bg-gray-900 font-medium"
                          : ""
                      }`}
                    >
                      {term}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 text-primary dark:text-gray-300">
            <p className="text-base font-medium text-tealdark">$155.99</p>
            <p className="text-sm font-medium line-through">$224.99</p>
            <p className="text-xs font-medium">45% off</p>
          </div>
        </div>

        <hr className="card-divider my-6" />

        <div className="flex flex-col card-title font-medium mb-3">
          <p className="text-primary dark:text-gray-500 mb-1">
            apple
            <span className="text-darkbtn dark:text-white">.kitchen</span>
          </p>
          <p className="cart-title text-13">Renews July 2026 for $24.99</p>
        </div>

        <div className="flex flex-col card-title font-medium mb-3">
          <p className="text-primary dark:text-gray-500 mb-1">
            apple
            <span className="text-darkbtn dark:text-white">.com</span>
          </p>
          <p className="cart-title text-13">Renews July 2026 for $27.99</p>
        </div>

        <div className="flex flex-col card-title font-medium mb-3">
          <p className="text-primary dark:text-gray-500 mb-1">
            apple
            <span className="text-darkbtn dark:text-white">.online</span>
          </p>
          <p className="cart-title text-13">enews July 2026 for $18.64</p>
        </div>
      </div> */}

      {/* <div className="cart-card mb-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex flex-col flex-wrap items-start justify-start card-title font-medium">
            <p className="text-primary dark:text-gray-500 mb-1.5">
              apple
              <span className="text-darkbtn dark:text-white">.org</span>
            </p>
            <p className="text-xs font-medium text-primary dark:text-gray-300">
              The more domains you lock down, the better you protect your brand.
            </p>
          </h2>
          <LuTrash2
            className="text-primary dark:text-gray-300 min-w-5"
            size={18}
          />
        </div>

        <hr className="card-divider my-6" />

        <div className="flex gap-2 justify_between items-center">
          <div className="flex flex-col gap-3">
            <div className="relative w-48">
              <div onClick={() => setOpen(!open)} className="term-select">
                <p className="text-xs text-secondary font-medium">Term</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-primary dark:text-gray-400">
                    {selected}
                  </span>
                  <IoChevronDown className="w-4 h-4 text-primary dark:text-gray-400" />
                </div>
              </div>

              {open && (
                <div className="dropdown-select">
                  {terms.map((term) => (
                    <div
                      key={term}
                      onClick={() => {
                        setSelected(term);
                        setOpen(false);
                      }}
                      className={`px-4 py-2 cursor-pointer hover:bg-slatelight dark:hover:bg-gray-800 text-sm font-medium text-primary dark:text-gray-400 ${selected === term
                        ? "bg-slatelight dark:bg-gray-900 font-medium"
                        : ""
                        }`}
                    >
                      {term}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <p className="cart-title text-13">Renews in July 2026 for $9.99</p>
          </div>
          <div className="flex flex-col items-end gap-1 text-primary dark:text-gray-300">
            <p className="text-base font-medium text-tealdark">$18.99</p>
            <p className="text-sm font-medium line-through">$34.99</p>
            <p className="text-xs font-medium">21% off</p>
          </div>
        </div>

        <hr className="card-divider my-6" />

        <div className="flex items-center justify-between gap-3">
          <h2 className="flex flex-col flex-wrap items-start justify-start card-title font-medium gap-1">
            <p className="text-primary dark:text-gray-500 mb-1.5 flex items-center gap-2.5">
              <button
                onClick={() => setIsToggled(!isToggled)}
                className={`w-12 h-6 flex items-center rounded-full border border-active-border p-1.5 transition-colors duration-300 ${isToggled ? "bg-white" : "bg-white"
                  }`}
              >
                <span
                  className={`w-4 h-4 rounded-full shadow-md transform transition-transform ${isToggled
                    ? "translate-x-5 bg-indigo-800"
                    : "-translate-x-0.5 bg-lightgray-300"
                    }`}
                ></span>
              </button>
              Full Domain Protection
            </p>
            <p className="text-xs font-medium text-primary dark:text-gray-300">
              Keep your personal info (name, email, phone) hidden in public
              WHOIS records.
            </p>
            <p className="cart-title text-13">Renews in July 2026 for $5.99</p>
          </h2>
          <div className="flex flex-col items-end gap-1 text-primary dark:text-gray-300">
            <p className="text-base font-medium text-tealdark">
              Free for the 1st year
            </p>
            <p className="text-sm font-medium line-through">$5.99</p>
            <p className="text-xs font-medium">100% off</p>
          </div>
        </div>
      </div> */}
    </div>
  );
};

export default DomainCartCard;
