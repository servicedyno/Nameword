import { useState, useEffect } from "react";
import { IoIosArrowDown } from "react-icons/io";
import { domainAPI } from "../../../../api/domains";
import { useAlert } from "../../../../context/AlertContext";
import { Country, State, City } from "country-state-city";
import { Formik, Form, Field, ErrorMessage } from "formik";
import PhoneInput from "react-phone-input-2";
import { parsePhoneNumberFromString, parsePhoneNumberWithError } from "libphonenumber-js";
import * as Yup from "yup";
import { useLanguage } from "../../../../hooks/useLanguage";

const EditAdministrative = ({ data, onSave, onCancel, currentDomain }) => {
    const { showAlert } = useAlert();
    const { t } = useLanguage();
    const [countries, setCountries] = useState([]);
    const [states, setStates] = useState([]);
    const [cities, setCities] = useState([]);

    // Load countries on mount
    useEffect(() => {
        const allCountries = Country.getAllCountries();
        setCountries(allCountries);
    }, []);

    // Validation schema
    const validationSchema = Yup.object().shape({
        contactdetail: Yup.string().oneOf(['1', '2'], t.admin.invalidContactType),
        firstname: Yup.string().required(t.admin.firstNameRequired),
        lastname: Yup.string().required(t.admin.lastNameRequired),
        companyName: Yup.string().when("contactdetail", {
            is: 2,
            then: (schema) => schema.required(t.admin.companyNameRequired),
            otherwise: (schema) => schema.notRequired(),
        }),
        email: Yup.string().email(t.admin.invalidEmailAddress).required(t.admin.emailRequired),
        phone: Yup.string()
            .trim()
            .required(t.admin.phoneRequired)
            .test("is-valid-phone", t.admin.enterValidPhoneNumber, function (value) {
                const { phoneCountryCode } = this.parent;
                if (!value) return false;
                const sanitizedValue = value.replace(/\D/g, "");
                const country = phoneCountryCode ? phoneCountryCode.toUpperCase() : undefined;
                try {
                    const parsed = parsePhoneNumberFromString(`+${sanitizedValue}`, country);
                    return parsed?.isValid() || false;
                } catch {
                    return false;
                }
            }),
        phoneCountryCode: Yup.string().required(t.admin.countryCodeRequired),
        country: Yup.string().required(t.admin.countryRequired),
        state: Yup.string().required(t.admin.stateRequired),
        address1: Yup.string().required(t.admin.address1Required),
        city: Yup.string().required(t.admin.cityRequired),
        zipcode: Yup.string().required(t.admin.zipcodeRequired),
    });

    // Initial values
    const getInitialValues = () => {
        let phoneValue = '';
        let phoneCountryIso = '';

        if (data?.phone) {
            const rawCountryCode = data.phone.country_code ? `${data.phone.country_code}` : '';
            const normalizedCountryCode = rawCountryCode.startsWith('+') ? rawCountryCode : rawCountryCode ? `+${rawCountryCode}` : '';
            const subscriber = data.phone.subscriber_number ? `${data.phone.subscriber_number}`.replace(/\D/g, '') : '';
            const combined = normalizedCountryCode ? `${normalizedCountryCode}${subscriber}` : subscriber;

            if (combined) {
                try {
                    const parsed = parsePhoneNumberWithError(combined.startsWith('+') ? combined : `+${combined}`);
                    phoneValue = `${parsed.countryCallingCode}${parsed.nationalNumber}`;
                    phoneCountryIso = parsed.country ? parsed.country.toLowerCase() : '';
                } catch {
                    const fallbackCountry = normalizedCountryCode.replace('+', '');
                    phoneValue = `${fallbackCountry}${subscriber}`;
                }
            }
        }

        if (!phoneCountryIso && data?.phone?.country_code) {
            const fallback = `${data.phone.country_code}`.replace('+', '').toLowerCase();
            if (fallback && fallback.length === 2) {
                phoneCountryIso = fallback;
            }
        }
        
        // Find country and state codes
        let selectedCountryCode = '';
        let selectedStateCode = '';
        
        if (data?.address?.country && countries.length > 0) {
            const foundCountry = countries.find(c => c.name === data.address.country || c.isoCode === data.address.country);
            if (foundCountry) {
                selectedCountryCode = foundCountry.isoCode;
                const countryStates = State.getStatesOfCountry(foundCountry.isoCode);
                if (data?.address?.state) {
                    const foundState = countryStates.find(s => s.name === data.address.state || s.isoCode === data.address.state);
                    if (foundState) {
                        selectedStateCode = foundState.isoCode;
                    }
                }
            }
        }

        if (!selectedCountryCode && data?.address?.country) {
            selectedCountryCode = data.address.country;
        }

        if (!selectedStateCode && data?.address?.state) {
            selectedStateCode = data.address.state;
        }

        if (!phoneCountryIso && selectedCountryCode && selectedCountryCode.length === 2) {
            phoneCountryIso = selectedCountryCode.toLowerCase();
        }
        
        return {
            contactdetail: data?.company_name ? '2' : '1',
            firstname: data?.name?.first_name || '',
            lastname: data?.name?.last_name || '',
            companyName: data?.company_name || '',
            email: data?.email || '',
            phone: phoneValue,
            phoneCountryCode: phoneCountryIso || 'us',
            country: data?.address?.country || '',
            state: data?.address?.state || '',
            address1: data?.address?.street || '',
            address2: data?.address?.addressLine2 || '',
            city: data?.address?.city || '',
            zipcode: data?.address?.zipcode || '',
            selectedCountryCode: selectedCountryCode,
            selectedStateCode: selectedStateCode,
        };
    };

    const handleSubmit = async (values, { setSubmitting }) => {
        if (!currentDomain?.websiteName) {
            showAlert(t.admin.domainRequired, { duration: 2500, type: 'warning' });
            setSubmitting(false);
            return;
        }

        const sanitizedPhone = (values.phone || '').replace(/\D/g, '');
        let parsedPhone;
        try {
            parsedPhone = parsePhoneNumberFromString(`+${sanitizedPhone}`, values.phoneCountryCode?.toUpperCase() || undefined);
        } catch {
            parsedPhone = null;
        }

        if (!parsedPhone || !parsedPhone.isValid()) {
            showAlert(t.admin.pleaseEnterValidPhone, { duration: 2500, type: 'warning' });
            setSubmitting(false);
            return;
        }

        const phoneCountryCode = `+${parsedPhone.countryCallingCode}`;
        const phoneSubscriber = `${parsedPhone.nationalNumber}`;

        // Prepare contact data according to backend structure
        const contactData = {
            name: {
                first_name: values.firstname,
                last_name: values.lastname,
            },
            email: values.email,
            phone: {
                country_code: phoneCountryCode,
                subscriber_number: phoneSubscriber,
            },
            address: {
                street: values.address1,
                addressLine2: values.address2 || '',
                city: values.city,
                state: values.state,
                country: values.country,
                zipcode: values.zipcode,
            },
        };

        // Add company name if Company/Organization is selected
        if (values.contactdetail === '2' && values.companyName) {
            contactData.company_name = values.companyName;
        }

        console.log("[EditAdministrative] Saving contact data:", contactData);
        console.log("[EditAdministrative] Domain:", currentDomain.websiteName);
        console.log("[EditAdministrative] Existing data handle:", data?.handle);

        try {
            await domainAPI.updateDomainContact(currentDomain.websiteName, data?.handle || 'admin', 'admin', contactData);
            console.log("[EditAdministrative] Contact updated successfully");
            showAlert(t.admin.administrativeContactUpdated, { duration: 2500, type: 'success' });
            onSave();
        } catch (error) {
            console.error("[EditAdministrative] Error saving contact:", error);
            const errorMsg = error?.response?.data?.message || error?.message || t.admin.failedToSaveContact;
            showAlert(errorMsg, { duration: 3000, type: 'fail' });
        } finally {
            setSubmitting(false);
        }
    };

    // Initialize country/state/city when data changes
    useEffect(() => {
        if (data && countries.length > 0) {
            const countryName = data?.address?.country;
            const stateName = data?.address?.state;
            
            if (countryName) {
                const foundCountry = countries.find(c => c.name === countryName || c.isoCode === countryName);
                if (foundCountry) {
                    const countryStates = State.getStatesOfCountry(foundCountry.isoCode);
                    setStates(countryStates);
                    
                    if (stateName) {
                        const foundState = countryStates.find(s => s.name === stateName || s.isoCode === stateName);
                        if (foundState) {
                            const stateCities = City.getCitiesOfState(foundCountry.isoCode, foundState.isoCode);
                            setCities(stateCities);
                        }
                    }
                }
            }
        }
    }, [data, countries]);

    return (
        <Formik
            initialValues={getInitialValues()}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
            enableReinitialize
        >
            {({ values, errors, touched, setFieldValue, setFieldTouched, validateField, isSubmitting }) => {

                const handleCountryChange = (e) => {
                    const countryCode = e.target.value;
                    if (!countryCode) {
                        setFieldValue('selectedCountryCode', '');
                        setFieldValue('country', '');
                        setStates([]);
                        setCities([]);
                        setFieldValue('state', '');
                        setFieldValue('selectedStateCode', '');
                        setFieldValue('city', '');
                        return;
                    }

                    const selectedCountry = countries.find(c => c.isoCode === countryCode);
                    setFieldValue('selectedCountryCode', countryCode);
                    setFieldValue('country', selectedCountry ? selectedCountry.name : countryCode);

                    if (selectedCountry) {
                        const countryStates = State.getStatesOfCountry(selectedCountry.isoCode);
                        setStates(countryStates);
                    } else {
                        setStates([]);
                    }

                    setFieldValue('state', '');
                    setFieldValue('selectedStateCode', '');
                    setFieldValue('city', '');
                    setCities([]);
                };

                const handleStateChange = (e) => {
                    const stateCode = e.target.value;
                    if (!stateCode) {
                        setFieldValue('selectedStateCode', '');
                        setFieldValue('state', '');
                        setCities([]);
                        setFieldValue('city', '');
                        return;
                    }

                    const selectedState = states.find(s => s.isoCode === stateCode);
                    setFieldValue('selectedStateCode', stateCode);
                    setFieldValue('state', selectedState ? selectedState.name : stateCode);

                    if (values.selectedCountryCode && selectedState && countries.find(c => c.isoCode === values.selectedCountryCode)) {
                        const stateCities = City.getCitiesOfState(values.selectedCountryCode, stateCode);
                        setCities(stateCities);
                    } else {
                        setCities([]);
                    }

                    setFieldValue('city', '');
                };

                const hasCountryOption = values.selectedCountryCode
                    ? countries.some(c => c.isoCode === values.selectedCountryCode)
                    : false;
                const hasStateOption = values.selectedStateCode
                    ? states.some(s => s.isoCode === values.selectedStateCode)
                    : false;
                const hasCityOption = values.city
                    ? cities.some(cityItem => cityItem.name === values.city)
                    : false;

                return (
                    <Form className="space-y-4">
                        <div className="flex flex-wrap items-center gap-5">
                            <label className={`flex items-start gap-2 ${values.contactdetail === '1' ? 'selected' : ''}`}>
                                <div className="mt-1">
                                    <Field type="radio" name="contactdetail" value="1" className="sr-only" />
                                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors duration-200 ${values.contactdetail === '1' ? 'border-tealdark bg-tealdark' : 'border-gray-400'}`}>
                                        {values.contactdetail === '1' && (
                                            <div className="w-1.5 h-1.5 bg-white dark:bg-gray-800 rounded-full"></div>
                                        )}
                                    </div>
                                </div>
                                <p className="font-medium text-15 text-primary dark:text-gray-300">{t.admin.personal}</p>
                            </label>
                            <label className={`flex items-start gap-2 ${values.contactdetail === '2' ? 'selected' : ''}`}>
                                <div className="mt-1">
                                    <Field type="radio" name="contactdetail" value="2" className="sr-only" />
                                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors duration-200 ${values.contactdetail === '2' ? 'border-tealdark bg-tealdark' : 'border-gray-400'}`}>
                                        {values.contactdetail === '2' && (
                                            <div className="w-1.5 h-1.5 bg-white dark:bg-gray-800 rounded-full"></div>
                                        )}
                                    </div>
                                </div>
                                <p className="font-medium text-15 text-primary dark:text-gray-300">{t.admin.companyOrganization}</p>
                            </label>
                        </div>

                        <div className="lg:w-3/5 w-full">
                            <div className="grid lg:grid-cols-2 gap-2.5">
                                {/* First Name */}
                                <div className="relative">
                                    <Field 
                                        type="text" 
                                        className={`input-field admin-form peer ${errors.firstname && touched.firstname ? 'border-red-500 dark:border-red-400' : ''}`}
                                        id="firstname" 
                                        name="firstname"
                                        value={values.firstname}
                                         onChange={(e) => {
                                            const filteredValue = e.target.value.replace(/[^A-Za-z\s]/g, '');
                                            setFieldValue('firstname', filteredValue);
                                        }} 
                                    />
                                    <label htmlFor="firstname" className={`absolute left-5 transition-all font-medium ${values.firstname ? 'top-2 text-xs text-gray-600' : 'top-4 text-13 text-primary dark:text-gray-500 '} peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}>
                                        {t.admin.firstName} *
                                    </label>
                                    <ErrorMessage name="firstname" component="p" className="text-warning pl-5 text-xs font-medium mt-1" />
                                </div>

                                {/* Last Name */}
                                <div className="relative">
                                    <Field 
                                        type="text" 
                                        className={`input-field admin-form peer ${errors.lastname && touched.lastname ? 'border-red-500 dark:border-red-400' : ''}`}
                                        id="lastname" 
                                        name="lastname"
                                        value={values.lastname}
                                         onChange={(e) => {
                                            const filteredValue = e.target.value.replace(/[^A-Za-z\s]/g, '');
                                            setFieldValue('lastname', filteredValue);
                                        }} 
                                    />
                                    <label htmlFor="lastname" className={`absolute left-5 transition-all font-medium ${values.lastname ? 'top-2 text-xs text-gray-600' : 'top-4 text-13 text-primary dark:text-gray-500 '} peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}>
                                        {t.admin.lastName} *
                                    </label>
                                    <ErrorMessage name="lastname" component="p" className="text-warning pl-5 text-xs font-medium mt-1" />
                                </div>

                                {/* Company Name - Show only when Company/Organization is selected */}
                                {values.contactdetail === '2' && (
                                    <div className="relative lg:col-span-2">
                                        <Field 
                                            type="text" 
                                            className={`input-field admin-form peer ${errors.companyName && touched.companyName ? 'border-red-500 dark:border-red-400' : ''}`}
                                            id="companyName" 
                                            name="companyName" 
                                        />
                                        <label htmlFor="companyName" className={`absolute left-5 transition-all font-medium ${values.companyName ? 'top-2 text-xs text-gray-600' : 'top-4 text-13 text-primary dark:text-gray-500 '} peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}>
                                            {t.admin.companyName} *
                                        </label>
                                        <ErrorMessage name="companyName" component="p" className="text-warning pl-5 text-xs font-medium mt-1" />
                                    </div>
                                )}

                                {/* Email */}
                                <div className="relative">
                                    <Field 
                                        type="email" 
                                        className={`input-field admin-form peer ${errors.email && touched.email ? 'border-red-500 dark:border-red-400' : ''}`}
                                        id="email" 
                                        name="email" 
                                    />
                                    <label htmlFor="email" className={`absolute left-5 transition-all font-medium ${values.email ? 'top-2 text-xs text-gray-600' : 'top-4 text-13 text-primary dark:text-gray-500 '} peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}>
                                        {t.admin.email.replace(':', '')} *
                                    </label>
                                    <ErrorMessage name="email" component="p" className="text-warning pl-5 text-xs font-medium mt-1" />
                                </div>

                                {/* Phone */}
                                <div className="relative">
                                    <div className={`relative w-full react-tel-flag phone-input-no-flag ${errors.phone && touched.phone ? 'input-error' : ''}`}>
                                        <PhoneInput
                                            country={(values.phoneCountryCode || '').toLowerCase() || 'us'}
                                            value={values.phone}
                                            onChange={(value, data) => {
                                                const numericValue = value.replace(/\D/g, '');
                                                setFieldValue('phone', numericValue);
                                                if (data?.countryCode) {
                                                    setFieldValue('phoneCountryCode', data.countryCode);
                                                }
                                                setTimeout(() => {
                                                    setFieldTouched('phone', true);
                                                    validateField('phone');
                                                }, 0);
                                            }}
                                            specialLabel=""
                                            placeholder=""
                                            inputProps={{
                                                name: 'phone',
                                                className: `input-field peer w-full mobile-number ${errors.phone && touched.phone ? 'border-red-500 dark:border-red-400' : 'admin-form '} disabled:cursor-not-allowed`,
                                                onBlur: () => {
                                                    setFieldTouched('phone', true);
                                                    validateField('phone');
                                                }
                                            }}
                                        />
                                        <label htmlFor="phone" className={`absolute left-5 transition-all font-medium ${values.phone ? 'top-2 text-xs text-gray-600' : 'top-4 text-13 text-primary dark:text-gray-500 '} peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}>
                                            {t.admin.phoneNumber.replace(':', '')} *
                                        </label>
                                        {errors.phone && touched.phone && (
                                            <p className="text-warning pl-5 text-xs font-medium mt-1">{errors.phone}</p>
                                        )}
                                        {errors.phoneCountryCode && touched.phone && (
                                            <p className="text-warning pl-5 text-xs font-medium mt-1">{errors.phoneCountryCode}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Country */}
                                <div className="relative">
                                    <Field
                                        as="select"
                                        className={`input-field admin-form peer text-primary dark:text-white ${errors.country && touched.country ? 'border-red-500 dark:border-red-400' : ''}`}
                                        id="country"
                                        name="selectedCountryCode"
                                        onChange={handleCountryChange}
                                    >
                                        <option value="">{t.admin.selectCountry}</option>
                                        {!hasCountryOption && values.selectedCountryCode && (
                                            <option value={values.selectedCountryCode}>
                                                {values.country || values.selectedCountryCode}
                                            </option>
                                        )}
                                        {countries.map((countryItem) => (
                                            <option key={countryItem.isoCode} value={countryItem.isoCode}>
                                                {countryItem.name}
                                            </option>
                                        ))}
                                    </Field>
                                    <IoIosArrowDown size={15} className="absolute top-1/2 transform -translate-y-1/2 right-4 text-primary dark:text-white pointer-events-none" />
                                    <label htmlFor="country" className={`absolute left-5 top-2 text-xs font-medium pointer-events-none transition-all dark:text-gray-500 ${values.country ? 'text-gray-600' : 'text-secondary'}`}>
                                        {t.admin.country.replace(':', '')} *
                                    </label>
                                    <ErrorMessage name="country" component="p" className="text-warning pl-5 text-xs font-medium mt-1" />
                                </div>

                                {/* Region/State/Province */}
                                <div className="relative">
                                    <Field
                                        as="select"
                                        className={`input-field admin-form peer text-primary dark:text-white ${errors.state && touched.state ? 'border-red-500 dark:border-red-400' : ''}`}
                                        id="state"
                                        name="selectedStateCode"
                                        onChange={handleStateChange}
                                        disabled={!values.selectedCountryCode}
                                    >
                                        <option value="">{t.admin.selectState}</option>
                                        {!hasStateOption && values.selectedStateCode && (
                                            <option value={values.selectedStateCode}>
                                                {values.state || values.selectedStateCode}
                                            </option>
                                        )}
                                        {states.map((stateItem) => (
                                            <option key={stateItem.isoCode} value={stateItem.isoCode}>
                                                {stateItem.name}
                                            </option>
                                        ))}
                                    </Field>
                                    <IoIosArrowDown size={15} className="absolute top-1/2 transform -translate-y-1/2 right-4 text-primary dark:text-white pointer-events-none" />
                                    <label htmlFor="state" className={`absolute left-5 top-2 text-xs font-medium pointer-events-none transition-all dark:text-gray-500 ${values.state ? 'text-gray-600' : 'text-secondary'}`}>
                                        {t.admin.regionStateProvince.replace(':', '')} *
                                    </label>
                                    <ErrorMessage name="state" component="p" className="text-warning pl-5 text-xs font-medium mt-1" />
                                </div>

                                <div className="lg:col-span-2 col-span-1 flex w-full flex-col gap-2.5">
                                    {/* Address Line 1 */}
                                    <div className="relative">
                                        <Field 
                                            type="text" 
                                            className={`input-field admin-form peer ${errors.address1 && touched.address1 ? 'border-red-500 dark:border-red-400' : ''}`}
                                            id="address1" 
                                            name="address1" 
                                        />
                                        <label htmlFor="address1" className={`absolute left-5 transition-all font-medium ${values.address1 ? 'top-2 text-xs text-gray-600' : 'top-4 text-13 text-primary dark:text-gray-500 '} peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}>
                                            {t.admin.addressLine1.replace(':', '')} *
                                        </label>
                                        <ErrorMessage name="address1" component="p" className="text-warning pl-5 text-xs font-medium mt-1" />
                                    </div>

                                    {/* Address Line 2 */}
                                    <div className="relative">
                                        <Field 
                                            type="text" 
                                            className="input-field admin-form peer"
                                            id="address2" 
                                            name="address2" 
                                        />
                                        <label htmlFor="address2" className={`absolute left-5 transition-all font-medium ${values.address2 ? 'top-2 text-xs text-gray-600' : 'top-4 text-13 text-primary dark:text-gray-500 '} peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}>
                                            {t.admin.addressLine2.replace(':', '')} *
                                        </label>
                                    </div>
                                </div>

                                {/* City */}
                                <div className="relative">
                                    <Field
                                        as="select"
                                        className={`input-field admin-form peer text-primary dark:text-white ${errors.city && touched.city ? 'border-red-500 dark:border-red-400' : ''}`}
                                        id="city"
                                        name="city"
                                        disabled={!values.selectedStateCode}
                                    >
                                        <option value="">{t.admin.selectCity}</option>
                                        {!hasCityOption && values.city && (
                                            <option value={values.city}>{values.city}</option>
                                        )}
                                        {cities.map((cityItem) => (
                                            <option key={cityItem.name} value={cityItem.name}>
                                                {cityItem.name}
                                            </option>
                                        ))}
                                    </Field>
                                    <IoIosArrowDown size={15} className="absolute top-1/2 transform -translate-y-1/2 right-4 text-primary dark:text-white pointer-events-none" />
                                    <label htmlFor="city" className={`absolute left-5 top-2 text-xs font-medium pointer-events-none transition-all dark:text-gray-500 ${values.city ? 'text-gray-600' : 'text-secondary'}`}>
                                        {t.admin.city.replace(':', '')} *
                                    </label>
                                    <ErrorMessage name="city" component="p" className="text-warning pl-5 text-xs font-medium mt-1" />
                                </div>

                                {/* Zip Code */}
                                <div className="relative">
                                    <Field 
                                        type="text" 
                                        className={`input-field admin-form peer ${errors.zipcode && touched.zipcode ? 'border-red-500 dark:border-red-400' : ''}`}
                                        id="zipcode" 
                                        name="zipcode" 
                                        maxLength="10"
                                        pattern="[0-9A-Za-z\- ]*"
                                    />
                                    <label htmlFor="zipcode" className={`absolute left-5 transition-all font-medium ${values.zipcode ? 'top-2 text-xs text-gray-600' : 'top-4 text-13 text-primary dark:text-gray-500 '} peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}>
                                        {t.admin.zipCode.replace(':', '')} *
                                    </label>
                                    <ErrorMessage name="zipcode" component="p" className="text-warning pl-5 text-xs font-medium mt-1" />
                                </div>
                            </div>
                        </div>

                        <div className='flex flex-wrap items-center admin-btn gap-2 w-full'>
                            <button type="button" onClick={onCancel} className='btn-outline' disabled={isSubmitting}>
                                {t.admin.cancel}
                            </button>
                            <button type="submit" className={`add-to-cart ${isSubmitting ? 'disable' : ''}`} disabled={isSubmitting}>
                                {isSubmitting ? t.admin.saving : t.admin.save}
                            </button>
                        </div>
                    </Form>
                );
            }}
        </Formik>
    )
}

export default EditAdministrative

