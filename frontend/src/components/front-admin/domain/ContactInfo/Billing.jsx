import PasteContactModal from "../../../modals/paste-contact-modal";
import { useEffect, useState } from "react";
import { copyToClipboard } from "../../../../utils/copyToClipboard";
import { useAlert } from "../../../../context/AlertContext";
import { domainAPI } from "../../../../api/domains";
import { useCustomLocation } from "../../../../hooks/useCustomLocation";
import { useDomain } from "../../../../hooks/useDomain";
import { useLanguage } from "../../../../hooks/useLanguage";

const Billing = ({ data, onRefresh, onEdit }) => {  
    const { showAlert } = useAlert();
    const { t } = useLanguage();
    const { currentDomain: domainFromLocation = {} } = useCustomLocation();
    const { domains } = useDomain();
    const currentDomain = domainFromLocation.websiteName
        ? domainFromLocation
        : domains?.[0];
    // Modal click
    const [isOpen, setIsOpen] = useState(false);
    const [isPasting, setIsPasting] = useState(false);
    const [showFullDetails, setShowFullDetails] = useState(false);

    // Helper function to format phone number
    const formatPhone = (phone) => {
        if (!phone) return ' - ';
        const { country_code, subscriber_number } = phone;
        if (!country_code && !subscriber_number) return ' - ';
        return `${country_code || ''} ${subscriber_number || ''}`.trim() || ' - ';
    };

    const splitAddress = (address) => {
        if (!address) return { line1: '', line2: '' };

        const line1Raw = address.street?.trim() || '';
        const line2Raw = address.addressLine2?.trim() || '';

        const escapeRegExp = (str = '') => str.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&');

        if (line1Raw && line2Raw) {
            const trailingLine2Pattern = new RegExp(String.raw`[\s,]*${escapeRegExp(line2Raw)}$`, 'i');
            const cleanedLine1 = line1Raw
                .replace(trailingLine2Pattern, '')
                .replaceAll(/,\s*,/g, ', ')
                .replace(/,\s*$/, '')
                .trim();
            return {
                line1: cleanedLine1 || line1Raw,
                line2: line2Raw,
            };
        }

        if (line1Raw && !line2Raw) {
            const parts = line1Raw
                .split(',')
                .map((part) => part.trim())
                .filter((part) => part.length > 0);

            if (parts.length > 1) {
                return {
                    line1: parts.shift(),
                    line2: parts.join(', '),
                };
            }

            return { line1: line1Raw, line2: '' };
        }

        return { line1: '', line2: line2Raw };
    };

    const { line1: addressLine1, line2: addressLine2 } = splitAddress(data?.address);

    const hasExtendedData = Boolean(
        data?.company_name ||
        data?.address?.country ||
        data?.address?.state ||
        data?.address?.city ||
        addressLine1 ||
        addressLine2 ||
        data?.address?.zipcode
    );

    useEffect(() => {
        if (hasExtendedData) {
            setShowFullDetails(true);
        }
    }, [hasExtendedData]);

    // Helper function to get display value or fallback
    const getValue = (value) => (value && value.length > 0 ? value : ' - ');

    const handleCopy = () => {
        if (!data) {
            showAlert(t.admin.noContactDataToCopy, { duration: 2500, type: 'warning' });
            return;
        }
        
        const contactText = `${t.admin.email} ${data?.email || 'N/A'}
${t.admin.firstName} ${data?.name?.first_name || 'N/A'}
${t.admin.lastName} ${data?.name?.last_name || 'N/A'}
${t.admin.phoneNumber} ${formatPhone(data?.phone)}
${t.admin.country} ${data?.address?.country || 'N/A'}
${t.admin.regionStateProvince} ${data?.address?.state || 'N/A'}
${t.admin.city} ${data?.address?.city || 'N/A'}
${t.admin.addressLine1} ${addressLine1 || 'N/A'}
${t.admin.addressLine2} ${addressLine2 || 'N/A'}
${t.admin.zipCode} ${data?.address?.zipcode || 'N/A'}
${t.admin.company} ${data?.company_name || 'N/A'}`;

        copyToClipboard(contactText, (message) => {
            showAlert(message, { duration: 2500, type: 'success' });
        });
    };

    const handlePaste = async () => {
        if (!currentDomain?.websiteName) {
            showAlert(t.admin.domainRequired, { duration: 2500, type: 'warning' });
            return;
        }

        setIsPasting(true);
        try {
            // Get clipboard content
            const clipboardText = await navigator.clipboard.readText();
            
            // Parse clipboard text - only extract fields that are present
            const lines = clipboardText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
            const parsedData = {};
            
            lines.forEach(line => {
                // Split by colon, but keep the rest together
                const colonIndex = line.indexOf(':');
                if (colonIndex === -1) return; // Skip lines without colon
                
                const key = line.substring(0, colonIndex).trim();
                const value = line.substring(colonIndex + 1).trim();
                const cleanKey = key.toLowerCase();
                
                // Skip if value is empty, 'N/A', or just '-'
                if (!value || value === 'N/A' || value === '-' || value === ' - ') {
                    return;
                }
                
                // Match fields more precisely
                if (cleanKey === 'email') {
                    parsedData.email = value;
                } else if (cleanKey === 'first name') {
                    parsedData.firstName = value;
                } else if (cleanKey === 'last name') {
                    parsedData.lastName = value;
                } else if (cleanKey === 'phone') {
                    parsedData.phone = value;
                } else if (cleanKey === 'country') {
                    parsedData.country = value;
                } else if (cleanKey === 'region/state/province' || cleanKey === 'region' || cleanKey === 'state' || cleanKey === 'province') {
                    parsedData.state = value;
                } else if (cleanKey === 'city') {
                    parsedData.city = value;
                } else if (cleanKey === 'address line 1') {
                    parsedData.address1 = value;
                } else if (cleanKey === 'address line 2') {
                    parsedData.address2 = value;
                } else if (cleanKey === 'zip code') {
                    parsedData.zipcode = value;
                }
            });

            // Check if we have at least some valid data
            if (Object.keys(parsedData).length === 0) {
                showAlert(t.admin.noValidContactDataFound, { duration: 3000, type: 'warning' });
                setIsPasting(false);
                return;
            }

            // Start with existing data if updating, or empty object if creating new
            const contactData = data ? {
                name: data.name ? { ...data.name } : {},
                email: data.email || '',
                phone: data.phone ? { ...data.phone } : {},
                address: data.address ? { ...data.address } : {},
                ...(data.company_name && { company_name: data.company_name })
            } : {
                name: {},
                email: '',
                phone: {},
                address: {}
            };

            // Update only fields that were found in clipboard
            if (parsedData.firstName) {
                contactData.name.first_name = parsedData.firstName;
            }
            if (parsedData.lastName) {
                contactData.name.last_name = parsedData.lastName;
            }
            if (parsedData.email) {
                contactData.email = parsedData.email;
            }
            
            // Parse phone number if found
            if (parsedData.phone) {
                const phoneParts = parsedData.phone.trim().split(' ');
                let phoneCountryCode = phoneParts[0] || '+1';
                let phoneSubscriber = phoneParts.slice(1).join(' ') || phoneParts[0];
                if (!phoneCountryCode.startsWith('+')) {
                    phoneCountryCode = `+${phoneCountryCode}`;
                }
                contactData.phone = {
                    country_code: phoneCountryCode,
                    subscriber_number: phoneSubscriber,
                };
            }

            // Update address fields only if found
            if (parsedData.address1) {
                contactData.address.street = parsedData.address1;
            }
            if (parsedData.address2) {
                contactData.address.addressLine2 = parsedData.address2;
            }
            if (parsedData.city) {
                contactData.address.city = parsedData.city;
            }
            if (parsedData.state) {
                contactData.address.state = parsedData.state;
            }
            if (parsedData.country) {
                contactData.address.country = parsedData.country;
            }
            if (parsedData.zipcode) {
                contactData.address.zipcode = parsedData.zipcode;
            }

            // For HostBay, always use update API (PUT endpoint)
            // The backend will handle merging with existing data
            console.log("[Billing Paste] Using update API for HostBay");
            console.log("[Billing Paste] Contact data to update:", contactData);
            console.log("[Billing Paste] Domain:", currentDomain.websiteName);
            console.log("[Billing Paste] Existing handle:", data?.handle || 'billing');
            
            try {
                // Always use update API - backend will merge with existing data
                await domainAPI.updateDomainContact(
                    currentDomain.websiteName, 
                    data?.handle || 'billing', 
                    'billing', 
                    contactData
                );
                
                showAlert(t.admin.contactUpdated, { duration: 2500, type: 'success' });
                setShowFullDetails(true);
                
                // Close modal after successful paste
                setIsOpen(false);
                
                // Refresh the contact data
                if (onRefresh) {
                    onRefresh();
                }
            } catch (error) {
                console.error("Error saving pasted contact:", error);
                // Extract error message from various possible locations
                let errorMsg = t.admin.failedToPasteContact;
                if (error?.response?.data?.message) {
                    errorMsg = error.response.data.message;
                } else if (error?.response?.data?.error) {
                    errorMsg = error.response.data.error;
                } else if (error?.message) {
                    errorMsg = error.message;
                }
                showAlert(errorMsg, { duration: 4000, type: 'fail' });
            }
        } catch (error) {
            console.error("Error pasting contact:", error);
            if (error.name === 'NotAllowedError') {
                showAlert(t.admin.clipboardAccessDenied, { duration: 3000, type: 'fail' });
            } else {
                showAlert(t.admin.failedToPasteContactMessage, { duration: 3000, type: 'fail' });
            }
        } finally {
            setIsPasting(false);
        }
    };
  
    return (
        <div>
            {/* <p className="info-card-title px-5 py-4">Billing Contact</p>
            <hr className='card-divider' /> */}

            <div className="space-y-4">
                <div className="flex items-center gap-2 info-detail">
                    <p className="text-secondary">{t.admin.email}</p>
                    <a href={`mailto:${getValue(data?.email)}`} target="_blank" className="text-primary dark:text-white">{getValue(data?.email)}</a>
                </div>
                <div className="flex items-center gap-2 info-detail">
                    <p className="text-secondary">{t.admin.firstName}</p>
                    <span className="text-primary dark:text-white">{getValue(data?.name?.first_name)}</span>
                </div>
                <div className="flex items-center gap-2 info-detail">
                    <p className="text-secondary">{t.admin.lastName}</p>
                    <span className="text-primary dark:text-white">{getValue(data?.name?.last_name)}</span>
                </div>
                <div className="flex items-center gap-2 info-detail">
                    <p className="text-secondary">{t.admin.phoneNumber}</p>
                    <a href={`tel:${formatPhone(data?.phone)}`} className="text-primary dark:text-white">{formatPhone(data?.phone)}</a>
                </div>
                {showFullDetails && (
                    <>
                        {data?.company_name && (
                            <div className="flex items-center gap-2 info-detail">
                                <p className="text-secondary">{t.admin.company}</p>
                                <span className="text-primary dark:text-white">{getValue(data?.company_name)}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2 info-detail">
                            <p className="text-secondary">{t.admin.country}</p>
                            <span className="text-primary dark:text-white">{getValue(data?.address?.country)}</span>
                        </div>
                        <div className="flex items-center gap-2 info-detail">
                            <p className="text-secondary">{t.admin.regionStateProvince}</p>
                            <span className="text-primary dark:text-white">{getValue(data?.address?.state)}</span>
                        </div>
                        <div className="flex items-center gap-2 info-detail">
                            <p className="text-secondary">{t.admin.city}</p>
                            <span className="text-primary dark:text-white">{getValue(data?.address?.city)}</span>
                        </div>
                        <div className="flex items-center gap-2 info-detail">
                            <p className="text-secondary">{t.admin.addressLine1}</p>
                            <span className="text-primary dark:text-white">{getValue(addressLine1)}</span>
                        </div>
                        <div className="flex items-center gap-2 info-detail">
                            <p className="text-secondary">{t.admin.addressLine2}</p>
                            <span className="text-primary dark:text-white">{getValue(addressLine2)}</span>
                        </div>
                        <div className="flex items-center gap-2 info-detail">
                            <p className="text-secondary">{t.admin.zipCode}</p>
                            <span className="text-primary dark:text-white">{getValue(data?.address?.zipcode)}</span>
                        </div>
                    </>
                )}

                <div className='flex flex-wrap items-center admin-btn gap-2'>
                    <button onClick={onEdit} className='btn-outline border-dark'>
                        {t.admin.changeContacts}
                    </button>
                    <button onClick={handleCopy} className='btn-outline border-dark'>
                        {t.admin.copy}
                    </button>
                    {!showFullDetails && (
                        <button className='add-to-cart' onClick={() => setIsOpen(true)}>
                            {t.admin.paste}
                        </button>
                    )}
                </div>
            </div>

            {/* Modal */}
            {isOpen && (
                <PasteContactModal 
                    onClose={() => setIsOpen(false)}
                    onPaste={handlePaste}
                    isPasting={isPasting}
                />
            )}

        </div>
    )
}

export default Billing

