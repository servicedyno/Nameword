import { useState, useEffect, useCallback } from "react";
import { domainAPI } from "../../../api/domains";
import RegistrantContact from "../../../components/front-admin/domain/ContactInfo/RegistrantContact";
import EditRegistrantContact from "../../../components/front-admin/domain/ContactInfo/EditRegistrantContact";
import Administrative from "../../../components/front-admin/domain/ContactInfo/Administrative";
import EditAdministrative from "../../../components/front-admin/domain/ContactInfo/EditAdministrative";
import Billing from "../../../components/front-admin/domain/ContactInfo/Billing";
import EditBilling from "../../../components/front-admin/domain/ContactInfo/EditBilling";
import Technical from "../../../components/front-admin/domain/ContactInfo/Technical";
import EditTechnical from "../../../components/front-admin/domain/ContactInfo/EditTechnical";
import { useCustomLocation } from "../../../hooks/useCustomLocation"; 
import { useDomain } from "../../../hooks/useDomain";
import { useAlert } from "../../../context/AlertContext";
import Loader from '../../../components/common/Loader';
import { useLanguage } from "../../../hooks/useLanguage";


const ContactInfo = () => {
    const { currentDomain: domainFromLocation = {} } = useCustomLocation();
    const { domains } = useDomain();
    const currentDomain = domainFromLocation?.websiteName
        ? domainFromLocation
        : domains?.[0];
    const { t } = useLanguage();
    
    const [activeTab, setActiveTab] = useState('registrant');
    const [contacts, setContacts] = useState({
        registrant: null,
        administrative: null,
        billing: null,
        technical: null
    });

    const [isLoading, setIsLoading] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const { showAlert } = useAlert();

    const fetchContacts = useCallback(async (contactType) => {
        if (!currentDomain?.websiteName) return; 

        setIsLoading(true);
        try {
            const response = await domainAPI.getDomainContacts(
                currentDomain.websiteName, 
                contactType
            );
            const contactTypeLabel = t.admin[contactType] || contactType;

            // Check if response indicates an error
            if (response?.responseMsg && response.responseMsg.statusCode !== 200) {
                const errorMessage =
                    response.responseMsg.message ||
                    response.message ||
                    (t.admin.failedToFetchContactInfo
                        ? t.admin.failedToFetchContactInfo.replace("{type}", contactTypeLabel)
                        : `Failed to fetch ${contactType} contact information`);
                showAlert(errorMessage, { duration: 3000, type: 'fail' });
                setContacts(prev => ({ ...prev, [contactType]: null }));
                return;
            }

            // Backend returns: { domain, provider, contacts: { [contactType]: contactData } }
            const contactData = response?.contacts?.[contactType] || null;
            setContacts(prev => ({ ...prev, [contactType]: contactData }));
        } catch (error) {
            console.error("Error fetching contacts:", error);
            // Extract error message from various possible locations
            const contactTypeLabel = t.admin[contactType] || contactType;
            let errorMsg = t.admin.failedToFetchContactInfo
                ? t.admin.failedToFetchContactInfo.replace("{type}", contactTypeLabel)
                : `Failed to fetch ${contactType} contact information`;
            if (error?.response?.data?.responseMsg?.message) {
                errorMsg = error.response.data.responseMsg.message;
            } else if (error?.response?.data?.message) {
                errorMsg = error.response.data.message;
            } else if (error?.response?.data?.error) {
                errorMsg = error.response.data.error;
            } else if (error?.message) {
                errorMsg = error.message;
            }
            showAlert(errorMsg, { duration: 3000, type: 'fail' });
            setContacts(prev => ({ ...prev, [contactType]: null }));
        } finally {
            setIsLoading(false);
        }
    }, [currentDomain?.websiteName, showAlert]);


    useEffect(() => {
        console.log("useEffect triggered for", currentDomain?.websiteName)
        if (currentDomain?.websiteName) {
            fetchContacts(activeTab);
        }
        // Reset edit mode when switching tabs
        setIsEditMode(false);
    }, [currentDomain?.websiteName, activeTab, fetchContacts]);

    const handleSaveSuccess = () => {
        setIsEditMode(false);
        fetchContacts(activeTab);
        showAlert(t.admin.contactUpdated, { duration: 2500, type: 'success' });
    };

    const handleCancelEdit = () => {
        setIsEditMode(false);
    };
    return (
        <div className='space-y-7'>
            {/* Title */}
            <div className='flex flex-col gap-2 title-section'>
                <h2>{t.admin.contactInfo}</h2>
            </div>

            {/* Tab Menu */}
            <div className="flex gap-2.5 mb-6 overflow-auto">
                <button onClick={() => setActiveTab('registrant')} className={`tab-button ${activeTab === 'registrant' ? 'active' : ''}`}>
                    {t.admin.registrant}
                </button>
                <button onClick={() => setActiveTab('administrative')} className={`tab-button ${activeTab === 'administrative' ? 'active' : ''}`}>
                    {t.admin.administrative}
                </button>
                <button onClick={() => setActiveTab('billing')} className={`tab-button ${activeTab === 'billing' ? 'active' : ''}`}>
                    {t.admin.billing}
                </button>
                <button onClick={() => setActiveTab('technical')} className={`tab-button ${activeTab === 'technical' ? 'active' : ''}`}>
                    {t.admin.technical}
                </button>
            </div>

            {/* Tab Content */}
            <div className='table-card'>
                {activeTab === 'registrant' && (
                    <div>
                        <p className="info-card-title px-5 py-4">{t.admin.registrantContact}</p>
                        <hr className='card-divider' />
                        <div className="py-7 px-5 space-y-4">
                            {!isEditMode ? (
                                <RegistrantContact 
                                    data={contacts.registrant} 
                                    onEdit={() => setIsEditMode(true)}
                                />
                            ) : (
                                <EditRegistrantContact 
                                    data={contacts.registrant}
                                    onSave={handleSaveSuccess}
                                    onCancel={handleCancelEdit}
                                    currentDomain={currentDomain?.websiteName}
                                />
                            )}
                        </div>
                    </div>
                )}
                {activeTab === 'administrative' && (
                    <div>
                        <p className="info-card-title px-5 py-4">{t.admin.administrativeContact}</p>
                        <hr className='card-divider' />
                        <div className="py-7 px-5 space-y-4">
                            {!isEditMode ? (
                                <Administrative 
                                    data={contacts.administrative} 
                                    onRefresh={() => fetchContacts('administrative')}
                                    onEdit={() => setIsEditMode(true)}
                                />
                            ) : (
                                <EditAdministrative 
                                    data={contacts.administrative}
                                    onSave={handleSaveSuccess}
                                    onCancel={handleCancelEdit}
                                    currentDomain={currentDomain}
                                />
                            )}
                        </div>
                    </div>
                )}
                {activeTab === 'billing' && (
                    <div>
                        <p className="info-card-title px-5 py-4">{t.admin.billingContact}</p>
                        <hr className='card-divider' />
                        <div className="py-7 px-5 space-y-4">
                            {!isEditMode ? (
                                <Billing 
                                    data={contacts.billing} 
                                    onRefresh={() => fetchContacts('billing')}
                                    onEdit={() => setIsEditMode(true)}
                                />
                            ) : (
                                <EditBilling 
                                    data={contacts.billing}
                                    onSave={handleSaveSuccess}
                                    onCancel={handleCancelEdit}
                                    currentDomain={currentDomain}
                                />
                            )}
                        </div>
                    </div>
                )}
                {activeTab === 'technical' && (
                    <div>
                        <p className="info-card-title px-5 py-4">{t.admin.technicalContact}</p>
                        <hr className='card-divider' />
                        <div className="py-7 px-5 space-y-4">
                            {!isEditMode ? (
                                <Technical 
                                    data={contacts.technical} 
                                    onRefresh={() => fetchContacts('technical')}
                                    onEdit={() => setIsEditMode(true)}
                                />
                            ) : (
                                <EditTechnical 
                                    data={contacts.technical}
                                    onSave={handleSaveSuccess}
                                    onCancel={handleCancelEdit}
                                    currentDomain={currentDomain}
                                />
                            )}
                        </div>
                    </div>
                )}
            </div>
            {isLoading && <Loader />}
        </div>
    );
};

export default ContactInfo;
