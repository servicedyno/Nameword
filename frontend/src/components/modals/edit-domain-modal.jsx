import { IoClose } from "react-icons/io5";
import { useState, useEffect, useCallback, useRef } from "react";
import { domainAPI } from "../../api/domains";
import { useDomainSuggestions } from "../../hooks/useDomainSuggestions";
import { useLanguage } from "../../hooks/useLanguage";

const EditDomainModal = ({ isOpen, onClose, item, onConfirm }) => {
    const { t } = useLanguage();
    console.log('item: ', item);
    const hostingData = item?.hosting || {};
    const currentDomainOption = ["existing", "external"].includes(hostingData.domainOption) ? 6 : 5;
    const [domainExisting, setDomainExisting] = useState("");
    const [existingInputError, setExistingInputError] = useState("");
    const [selectedPlan, setSelectedPlan] = useState(currentDomainOption);
    const [domainName, setDomainName] = useState(hostingData.domainName || "");
    const [ownedDomains, setOwnedDomains] = useState([]);
    const [ownedDomainsLoading, setOwnedDomainsLoading] = useState(false);
    const [selectedExistingDomain, setSelectedExistingDomain] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedDomainSuggestion, setSelectedDomainSuggestion] = useState(null);
    const domainInputRef = useRef(null);
    const suggestionsRef = useRef(null);
    const suggestionsLimitRef = useRef(5);
    const initialDomainNameRef = useRef(null);
    const isUserTypingRef = useRef(false);

    const isValidDomain = (domain) =>
        /^(?!:\/\/)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/.test(domain);

    // Domain suggestions hook
    const {
        getSuggestions,
        loading: suggestionsLoading,
        clearSuggestions,
        suggestions,
    } = useDomainSuggestions();

    // Initialize state when modal opens or item changes
    useEffect(() => {
        if (isOpen && item) {
            setSelectedPlan(currentDomainOption);
            if (hostingData?.domainOption === "external") {
                setDomainExisting(hostingData.domainName)
            } else {
                const initialDomain = hostingData.domainName || "";
                setDomainName(initialDomain);
                initialDomainNameRef.current = initialDomain;
            }
            setSelectedDomainSuggestion(null);
            clearSuggestions();
            setShowSuggestions(false);
            suggestionsLimitRef.current = 5;
            isUserTypingRef.current = false; // Reset user typing flag when modal opens
        }
    }, [isOpen, item, currentDomainOption, hostingData.domainName, clearSuggestions, hostingData.domainOption]);

    // Fetch owned domains when "Use existing domain" is selected
    const fetchOwnedDomains = useCallback(async () => {
        try {
            setOwnedDomainsLoading(true);
            const response = await domainAPI.domainList();
            const list = Array.isArray(response?.data)
                ? response.data
                : Array.isArray(response)
                    ? response
                    : [];
            setOwnedDomains(list);
            if (list.length > 0 && !selectedExistingDomain && hostingData?.domainOption !== "external") {
                // Try to find the current domain in the list
                const currentDomain = hostingData.domainName;
                const found = list.find((d) => {
                    const name = d?.websiteName || d?.domainName || d?.name || "";
                    return name.toLowerCase() === (currentDomain || "").toLowerCase();
                });
                setSelectedExistingDomain(found || list[0]);
            }
        } catch (error) {
            console.error("Failed to fetch owned domains:", error);
        } finally {
            setOwnedDomainsLoading(false);
        }
    }, [hostingData.domainName, selectedExistingDomain, hostingData?.domainOption]);

    useEffect(() => {
        if (selectedPlan === 6 && ownedDomains.length === 0 && !ownedDomainsLoading && isOpen) {
            fetchOwnedDomains();
        }
        if (selectedPlan === 5) {
            clearSuggestions();
            setShowSuggestions(false);
            suggestionsLimitRef.current = 5;
        }
    }, [selectedPlan, ownedDomains.length, ownedDomainsLoading, isOpen, fetchOwnedDomains, clearSuggestions]);

    // Fetch domain suggestions when typing in new domain input
    const fetchDomainSuggestions = useCallback(
        async (extraLimit = 0) => {
            if (selectedPlan !== 5) {
                return;
            }

            const trimmedDomain = domainName.trim();

            if (trimmedDomain.length > 2) {
                try {
                    setShowSuggestions(true);
                    suggestionsLimitRef.current =
                        suggestionsLimitRef.current + extraLimit;
                    await getSuggestions(trimmedDomain, suggestionsLimitRef.current);
                } catch (error) {
                    console.error("Failed to get domain suggestions:", error);
                    setShowSuggestions(false);
                }
            }
        },
        [domainName, selectedPlan, getSuggestions]
    );

    useEffect(() => {
        if (selectedPlan !== 5) {
            clearSuggestions();
            setShowSuggestions(false);
            suggestionsLimitRef.current = 5;
            return;
        }

        // Only fetch suggestions if user has manually typed something
        // Skip if this is the initial domain name from props
        if (!isUserTypingRef.current && domainName === initialDomainNameRef.current) {
            return;
        }

        const trimmedDomain = domainName.trim();

        if (trimmedDomain.length > 2) {
            const timeoutId = setTimeout(() => {
                suggestionsLimitRef.current = 5;
                fetchDomainSuggestions();
            }, 500);

            return () => clearTimeout(timeoutId);
        } else {
            clearSuggestions();
            setShowSuggestions(false);
            suggestionsLimitRef.current = 5;
        }
    }, [domainName, selectedPlan, clearSuggestions, fetchDomainSuggestions]);

    // Update showSuggestions based on suggestions availability
    useEffect(() => {
        if (suggestionsLoading) {
            setShowSuggestions(true);
        } else if (suggestions && suggestions.length > 0) {
            setShowSuggestions(true);
        } else if (!suggestionsLoading && suggestions && suggestions.length === 0) {
            setShowSuggestions(false);
        }
    }, [suggestionsLoading, suggestions]);

    // Handle click outside to close suggestions
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                suggestionsRef.current &&
                !suggestionsRef.current.contains(e.target) &&
                domainInputRef.current &&
                !domainInputRef.current.contains(e.target)
            ) {
                setShowSuggestions(false);
            }
        };

        if (showSuggestions) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showSuggestions]);

    // Handle suggestion selection
    const handleSuggestionSelect = (suggestion) => {
        const domainNameValue = suggestion.domainName || suggestion;
        isUserTypingRef.current = false; // Reset flag since this is selection, not typing
        setDomainName(domainNameValue);
        setSelectedDomainSuggestion(suggestion);
        setShowSuggestions(false);
        clearSuggestions();
        suggestionsLimitRef.current = 5;
    };

    // Handle load more suggestions
    const handleLoadMore = (e) => {
        e.preventDefault();
        fetchDomainSuggestions(5);
    };

    const getDomainKey = (domain) =>
        domain?.id ||
        domain?._id ||
        domain?.websiteName ||
        domain?.domainName ||
        domain?.name ||
        "";

    const selectedExistingDomainName =
        selectedExistingDomain?.websiteName ||
        selectedExistingDomain?.domainName ||
        selectedExistingDomain?.name ||
        "";

    const handleConfirm = async () => {
        if (!item) return;

        const resolvedDomainName =
            selectedPlan === 5
                ? domainName.trim()
                : selectedExistingDomainName.trim() || domainExisting?.trim();

        if (!resolvedDomainName) {
            return;
        }

        try {
            setSubmitting(true);

            const updatedHostingData = {
                ...hostingData,
                domainOption: selectedPlan === 5 ? "new" : domainExisting ? "external" : "existing",
                domainName: resolvedDomainName,
                domainPrice: selectedPlan === 5 && selectedDomainSuggestion?.price
                    ? Number(selectedDomainSuggestion.price)
                    : hostingData.domainPrice || null,
                existingDomainId:
                    selectedPlan === 6
                        ? selectedExistingDomain?.id || selectedExistingDomain?._id || null
                        : null,
                existingDomainProvider:
                    selectedPlan === 6 ? selectedExistingDomain?.provider || null : null,
            };

            if (onConfirm) {
                await onConfirm(item._id, updatedHostingData);
            }

            onClose();
        } catch (error) {
            console.error("Failed to update domain:", error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleSelectDomain = (e) => {
        const next = ownedDomains.find(
            (domain) => getDomainKey(domain) === e.target.value
        );
        setDomainExisting("");
        setExistingInputError(null);
        setSelectedExistingDomain(next || null);
    }

    const handleExternalDomainChange = (e) => {
        const value = e.target.value.trim();
        setDomainExisting(value)
        console.log('isValidDomain(value): ', isValidDomain(value));
        if (!value) {
            setExistingInputError(t.admin.domainRequired);
        } else if (!isValidDomain(value)) {
            setExistingInputError(t.cart.hosting.enterValidDomain);
        } else {
            // Allow any valid domain - user has authority over it regardless of registrar
            setExistingInputError("");
        }
        // Clear selected suggestion if user manually types
        if (domainName) {
            setDomainName(null);
        }
        if (selectedDomainSuggestion) {
            setSelectedDomainSuggestion(null);
        }
        if (selectedExistingDomain) {
            setSelectedExistingDomain(null);
        }
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-600/80 backdrop-blur-sm">
            <div className="modal-dialog relative">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-black dark:hover:text-white z-10"
                >
                    <IoClose className='text-primary dark:text-gray-500' size={30} />
                </button>

                {/* Modal Title */}
                <h2 className="modal-title">{t.admin.editDomain || "Edit Domain"}</h2>

                <p className="bg-tealdark py-0.5 px-1 text-white text-xs inline-flex mb-2">{t.cart.hosting.comesFree}</p>

                {/* Subtitle */}
                <p className="text-primary dark:text-gray-500 text-lg font-medium mb-5">
                    {t.cart.hosting.domainForOneYear}
                </p>

                <div className='flex gap-2 justify-between items-center w-full mt-5'>
                    <div className='flex flex-col gap-1 w-full'>

                        {/* Register a New Domain */}
                        <label className={`choose-plan-price ${selectedPlan === 5 ? 'selected' : ''}`} >
                            <div className="flex items-start gap-2">
                                <div className="mt-1">
                                    <input
                                        type="radio"
                                        name="domainOption"
                                        checked={selectedPlan === 5}
                                        onChange={() => setSelectedPlan(5)}
                                        className="sr-only"
                                    />

                                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors duration-200 ${selectedPlan === 5 ? 'border-tealdark bg-tealdark' : 'border-gray-400'}`} >
                                        {selectedPlan === 5 && (
                                            <div className="w-1.5 h-1.5 bg-white dark:bg-gray-800 rounded-full"></div>
                                        )}
                                    </div>
                                </div>
                                <p className="font-medium text-15 text-primary dark:text-gray-300">{t.cart.hosting.registerNewDomainOption}</p>
                            </div>
                        </label>

                        {/* Use an Existing Domain */}
                        <label className={`choose-plan-price ${selectedPlan === 6 ? 'selected' : ''}`} >
                            <div className="flex items-start gap-2">
                                <div className="mt-1">
                                    <input
                                        type="radio"
                                        name="domainOption"
                                        checked={selectedPlan === 6}
                                        onChange={() => setSelectedPlan(6)}
                                        className="sr-only"
                                    />

                                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors duration-200 ${selectedPlan === 6 ? 'border-tealdark bg-tealdark' : 'border-gray-400'}`} >
                                        {selectedPlan === 6 && (
                                            <div className="w-1.5 h-1.5 bg-white dark:bg-gray-800 rounded-full"></div>
                                        )}
                                    </div>
                                </div>
                                <p className="font-medium text-15 text-primary dark:text-gray-300">{t.cart.hosting.useExistingDomain}</p>
                            </div>
                        </label>
                    </div>
                </div>
                <hr className="card-divider my-6" />
                <p className="cart-title text-13 mt-4 mb-2">{selectedPlan === 6 ? t.admin.selectYourDomain || "Select your domain" : t.cart.hosting.letsPickDomain}</p>
                {/* Domain Input Fields */}
                {selectedPlan === 5 && (
                    <div className="mt-4 relative" ref={domainInputRef}>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder={t.cart.hosting.domainPlaceholder}
                                className="domain-pick w-full"
                                value={domainName}
                                onChange={(e) => {
                                    isUserTypingRef.current = true; // Mark that user is typing
                                    setDomainName(e.target.value);
                                    if (selectedDomainSuggestion) {
                                        setSelectedDomainSuggestion(null);
                                    }
                                }}
                                onFocus={() => {
                                    if (suggestions && suggestions.length > 0) {
                                        setShowSuggestions(true);
                                    }
                                }}
                            />
                            {suggestionsLoading && (
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-tealdark"></div>
                                </div>
                            )}
                        </div>

                        {/* Domain Suggestions Dropdown */}
                        {(showSuggestions || suggestionsLoading) && (
                            <div
                                ref={suggestionsRef}
                                className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto"
                            >
                                {suggestionsLoading ? (
                                    <div className="px-4 py-4 flex items-center justify-center">
                                        <div className="flex items-center gap-2">
                                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-tealdark"></div>
                                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                                {t.cart.hosting.loadingSuggestions}
                                            </span>
                                        </div>
                                    </div>
                                ) : suggestions && suggestions.length > 0 ? (
                                    <>
                                        {suggestions.map((suggestion, index) => {
                                            const domainNameValue =
                                                suggestion.domainName || suggestion;
                                            return (
                                                <div
                                                    key={index}
                                                    onClick={() => handleSuggestionSelect(suggestion)}
                                                    className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-200 dark:border-gray-700 last:border-b-0 transition-colors"
                                                >
                                                    <span className="text-sm font-medium text-primary dark:text-gray-200">
                                                        {domainNameValue}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                        {suggestions.length >= 5 && !suggestionsLoading && (
                                            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                                                <button
                                                    onClick={handleLoadMore}
                                                    disabled={suggestionsLoading}
                                                    className="w-full text-sm font-medium text-tealdark hover:text-tealdark/80 transition-colors text-center disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {suggestionsLoading ? t.common.loading : t.cart.hosting.loadMore}
                                                </button>
                                            </div>
                                        )}
                                    </>
                                ) : null}
                            </div>
                        )}
                    </div>
                )}

                {selectedPlan === 6 && (
                    <>
                        <div className="mt-4">
                            {ownedDomainsLoading ? (
                                <p className="text-sm text-secondary">{t.admin.loadingYourDomains || "Loading your domains..."}</p>
                            ) : ownedDomains.length > 0 ? (
                                <select
                                    className="domain-pick w-full"
                                    value={getDomainKey(selectedExistingDomain)}
                                    onChange={handleSelectDomain}
                                >
                                    <option value="">{t.admin.selectDomain || "Select domain"}</option>
                                    {ownedDomains.map((domain) => {
                                        const name =
                                            domain.websiteName ||
                                            domain.domainName ||
                                            domain.name ||
                                            "";
                                        const value = getDomainKey(domain);
                                        return (
                                            <option key={value} value={value}>
                                                {name}
                                                {domain.status ? ` — ${domain.status}` : ""}
                                            </option>
                                        );
                                    })}
                                </select>
                            ) : (
                                <div className="rounded border border-dashed border-gray-300 p-3 text-sm text-secondary">
                                    {t.admin.noDomainsYet || "You don't have any domains yet."}
                                </div>
                            )}
                        </div>
                        {/* Divider */}
                        <div className="flex items-center w-full justify-center my-2">
                            <span className="text-xs text-gray-500 uppercase">{t.admin.or || "Or"}</span>
                        </div>
                        <p className="cart-title text-13 mb-2">{t.admin.enterExternalDomain || "Enter External Domain"}</p>
                        <div className="relative mt-2">
                            <input
                                type="text"
                                placeholder={t.cart.hosting.domainPlaceholder}
                                className="domain-pick w-full"
                                value={domainExisting}
                                onChange={handleExternalDomainChange}
                            />
                        </div>
                        {(existingInputError) && (
                            <p className="text-red-500 text-sm mr-auto" role="alert">
                                {existingInputError}
                            </p>
                        )}
                    </>
                )}

                {/* Confirm Button */}
                <div className="mt-5 flex justify-end">
                    <button
                        onClick={handleConfirm}
                        disabled={submitting || (selectedPlan === 5 && !domainName.trim()) || (selectedPlan === 6 && ((domainExisting.trim().length < 1 && !selectedExistingDomainName) || existingInputError))}
                        className={`add-to-cart ${submitting || (selectedPlan === 5 && !domainName.trim()) || (selectedPlan === 6 && ((domainExisting.trim().length < 1 && !selectedExistingDomainName) || existingInputError)) ? 'opacity-60 !cursor-not-allowed' : ''}`}
                    >
                        {submitting ? t.admin.updating : t.admin.confirm}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default EditDomainModal