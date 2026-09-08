import { useState, useEffect } from "react";
import { IoIosArrowDown } from "react-icons/io";
import { Country, State, City } from "country-state-city";
import { useLanguage } from "../../../../hooks/useLanguage";

const AddressDropdowns = ({
    country,
    state,
    city,
    onCountryChange,
    onStateChange,
    onCityChange,
    countryLabel,
    stateLabel,
    cityLabel
}) => {
    const { t } = useLanguage();
    const [countries, setCountries] = useState([]);
    const [states, setStates] = useState([]);
    const [cities, setCities] = useState([]);
    const [selectedCountryCode, setSelectedCountryCode] = useState("");

    // Use provided labels or fallback to translations
    const finalCountryLabel = countryLabel || `${t.admin.country.replace(':', '')} *`;
    const finalStateLabel = stateLabel || `${t.admin.regionStateProvince.replace(':', '')} *`;
    const finalCityLabel = cityLabel || `${t.admin.city.replace(':', '')} *`;

    // Load countries on mount and when country/state props change
    useEffect(() => {
        const allCountries = Country.getAllCountries();
        setCountries(allCountries);

        // If country is already set, find its code
        if (country) {
            const foundCountry = allCountries.find(
                c => c.name === country || c.isoCode === country
            );
            if (foundCountry) {
                setSelectedCountryCode(foundCountry.isoCode);
                // Load states for this country
                const countryStates = State.getStatesOfCountry(foundCountry.isoCode);
                setStates(countryStates);

                // If state is already set, load cities
                if (state) {
                    const foundState = countryStates.find(
                        s => s.name === state || s.isoCode === state
                    );
                    if (foundState) {
                        const stateCities = City.getCitiesOfState(foundCountry.isoCode, foundState.isoCode);
                        setCities(stateCities);
                    }
                }
            }
        }
    }, [country, state]);

    // Handle country change
    const handleCountryChange = (e) => {
        const countryCode = e.target.value;
        setSelectedCountryCode(countryCode);

        // Reset state and city when country changes
        setStates([]);
        setCities([]);
        if (onStateChange) onStateChange({ target: { value: "" } });
        if (onCityChange) onCityChange({ target: { value: "" } });

        if (countryCode) {
            const countryStates = State.getStatesOfCountry(countryCode);
            setStates(countryStates);

            const selectedCountry = countries.find(c => c.isoCode === countryCode);
            if (onCountryChange) {
                onCountryChange({
                    target: {
                        value: selectedCountry ? selectedCountry.name : countryCode
                    }
                });
            }
        } else {
            if (onCountryChange) onCountryChange({ target: { value: "" } });
        }
    };

    // Handle state change
    const handleStateChange = (e) => {
        const stateCode = e.target.value;

        // Reset city when state changes
        setCities([]);
        if (onCityChange) onCityChange({ target: { value: "" } });

        if (stateCode && selectedCountryCode) {
            const stateCities = City.getCitiesOfState(selectedCountryCode, stateCode);
            setCities(stateCities);

            const selectedState = states.find(s => s.isoCode === stateCode);
            if (onStateChange) {
                onStateChange({
                    target: {
                        value: selectedState ? selectedState.name : stateCode
                    }
                });
            }
        } else {
            if (onStateChange) onStateChange({ target: { value: "" } });
        }
    };

    // Handle city change
    const handleCityChange = (e) => {
        if (onCityChange) onCityChange(e);
    };

    // Find current country code from country name
    const getCurrentCountryCode = () => {
        if (!country) return "";
        const foundCountry = countries.find(
            c => c.name === country || c.isoCode === country
        );
        return foundCountry ? foundCountry.isoCode : selectedCountryCode;
    };

    // Find current state code from state name
    const getCurrentStateCode = () => {
        if (!state || !selectedCountryCode) return "";
        const foundState = states.find(
            s => s.name === state || s.isoCode === state
        );
        return foundState ? foundState.isoCode : "";
    };

    const currentCountryCode = getCurrentCountryCode() || selectedCountryCode;
    const currentStateCode = getCurrentStateCode();

    return (
        <>
            {/* Country Dropdown - Left Column */}
            <div className="relative">
                <select
                    className="input-field admin-form peer text-primary dark:text-white"
                    id="country"
                    value={currentCountryCode}
                    onChange={handleCountryChange}
                >
                    <option value="">{t.admin.selectCountry}</option>
                    {countries.map((countryItem) => (
                        <option key={countryItem.isoCode} value={countryItem.isoCode}>
                            {countryItem.name}
                        </option>
                    ))}
                </select>
                <IoIosArrowDown
                    size={15}
                    className="absolute top-1/2 transform -translate-y-1/2 right-4 text-primary dark:text-white pointer-events-none"
                />
                <label
                    htmlFor="country"
                    className={`absolute left-5 transition-all font-medium ${currentCountryCode ? 'top-2 text-xs text-gray-600' : 'top-4 text-13 text-primary dark:text-gray-500 '} peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary pointer-events-none`}
                >
                    {finalCountryLabel}
                </label>
            </div>

            {/* State Dropdown - Right Column */}
            <div className="relative">
                <select
                    className="input-field admin-form peer text-primary dark:text-white"
                    id="state"
                    value={currentStateCode}
                    onChange={handleStateChange}
                    disabled={!currentCountryCode}
                >
                    <option value="">{t.admin.selectState}</option>
                    {states.map((stateItem) => (
                        <option key={stateItem.isoCode} value={stateItem.isoCode}>
                            {stateItem.name}
                        </option>
                    ))}
                </select>
                <IoIosArrowDown
                    size={15}
                    className="absolute top-1/2 transform -translate-y-1/2 right-4 text-primary dark:text-white pointer-events-none"
                />
                <label
                    htmlFor="state"
                    className={`absolute left-5 transition-all font-medium ${currentStateCode ? 'top-2 text-xs text-gray-600' : 'top-4 text-13 text-primary dark:text-gray-500 '} peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary pointer-events-none`}
                >
                    {finalStateLabel}
                </label>
            </div>

            {/* City Dropdown - Left Column (after address fields) */}
            <div className="relative">
                <select
                    className="input-field admin-form peer text-primary dark:text-white"
                    id="city"
                    value={city || ""}
                    onChange={handleCityChange}
                    disabled={!currentStateCode}
                >
                    <option value="">{t.admin.selectCity}</option>
                    {cities.map((cityItem) => (
                        <option key={cityItem.name} value={cityItem.name}>
                            {cityItem.name}
                        </option>
                    ))}
                </select>
                <IoIosArrowDown
                    size={15}
                    className="absolute top-1/2 transform -translate-y-1/2 right-4 text-primary dark:text-white pointer-events-none"
                />
                <label
                    htmlFor="city"
                    className={`absolute left-5 transition-all font-medium ${city ? 'top-2 text-xs text-gray-600' : 'top-4 text-13 text-primary dark:text-gray-500 '} peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary pointer-events-none`}
                >
                    {finalCityLabel}
                </label>
            </div>
        </>
    );
};

export default AddressDropdowns;

