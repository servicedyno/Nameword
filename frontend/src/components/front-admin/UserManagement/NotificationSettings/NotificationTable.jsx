import { useState, useEffect, useCallback } from "react";
import { authAPI } from "../../../../api/auth";
import { useAlert } from "../../../../context/AlertContext";
import { useLanguage } from "../../../../hooks/useLanguage";

const NotificationTable = () => {
  const { t } = useLanguage();
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    
    subscriptionsAndPayments: {
      sms: false,
      whatsapp: false,
      email: true,
    },
    accountAndSecurity: {
      sms: false,
      whatsapp: true,
      email: true,
    },
    serviceStatusAndChanges: {
      sms: false,
      whatsapp: true,
      email: true,
    },
    productUpdatesAndOffers: {
      sms: true,
      whatsapp: true,
      email: true,
    },
  });

  const loadPreferences = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authAPI.getNotificationPreferences();
      if (response.success && response.data) {
  
        const loadedPreferences = {
          subscriptionsAndPayments: {
            sms: false,
            whatsapp: false,
            email: response.data.subscriptionsAndPayments?.email !== false,
          },
          accountAndSecurity: {
            sms: false,
            whatsapp: false,
            email: response.data.accountAndSecurity?.email !== false,
          },
          serviceStatusAndChanges: {
            sms: false,
            whatsapp: false,
            email: response.data.serviceStatusAndChanges?.email !== false,
          },
          productUpdatesAndOffers: {
            sms: false,
            whatsapp: false,
            email: response.data.productUpdatesAndOffers?.email !== false,
          },
        };
        setPreferences(loadedPreferences);
      }
    } catch (error) {
      console.error("Error loading notification preferences:", error);
      showAlert(t.admin.failedToLoadNotificationPreferences, {
        type: "fail",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  }, [showAlert, t]);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const handlePreferenceChange = async (category, channel, value) => {
    // Optimistically update UI
    const previousPreferences = { ...preferences };
    const updatedPreferences = {
      ...preferences,
      [category]: {
        ...preferences[category],
        [channel]: value,
      },
    };
    setPreferences(updatedPreferences);

    // Save to backend
    try {
      setSaving(true);
      const response = await authAPI.updateNotificationPreferences(updatedPreferences);
      if (response.success) {
        showAlert(t.admin.notificationPreferencesUpdatedSuccess, {
          type: "success",
          duration: 2500,
        });
      } else {
        // Revert on failure
        setPreferences(previousPreferences);
        showAlert(response.message || t.admin.failedToUpdatePreferences, {
          type: "fail",
          duration: 3000,
        });
      }
    } catch (error) {
      // Revert on error
      setPreferences(previousPreferences);
      console.error("Error updating notification preferences:", error);
      showAlert(t.admin.failedToUpdateNotificationPreferences, {
        type: "fail",
        duration: 3000,
      });
    } finally {
      setSaving(false);
    }                                                                
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <p className="text-secondary">{t.admin.loadingNotificationPreferences}</p>
      </div>
    );
  }

  return (
    <div>

      <div className='table-auto md:table-fixed w-full overflow-auto notification-table'>
        <table className='table-main'>
          <thead className='table-thead'>
            <tr>
              <th>
                <div className='icon-head'>{t.admin.managePreferences}</div>
              </th>
              <th>
                <div className='icon-head'>{t.admin.sms}</div>
              </th>
              <th>
                <div className='icon-head'>{t.admin.whatsapp}</div>
              </th>
              <th>
                <div className='icon-head'>{t.admin.emailLabel}</div>
              </th>
            </tr>
          </thead>
          <tbody className='table-body'>
            <tr>
              <td>
                <div className='icon-head !mt-6'>
                  <div className="flex flex-col">
                    <p>{t.admin.subscriptionsAndPayments}</p>
                    <p className="text-secondary">{t.admin.subscriptionsAndPaymentsDescription}</p>
                  </div>
                </div>
              </td>
              <td className='text-center'>
                <input
                  type="checkbox"
                  checked={preferences.subscriptionsAndPayments.sms}
                  onChange={(e) => handlePreferenceChange('subscriptionsAndPayments', 'sms', e.target.checked)}
                  disabled={true}
                />
              </td>
              <td className='text-center'>
                <input
                  type="checkbox"
                  checked={preferences.subscriptionsAndPayments.whatsapp}
                  onChange={(e) => handlePreferenceChange('subscriptionsAndPayments', 'whatsapp', e.target.checked)}
                  disabled={true}
                />
              </td>
              <td className='text-center'>
                <input
                  type="checkbox"
                  checked={preferences.subscriptionsAndPayments.email}
                  onChange={(e) => handlePreferenceChange('subscriptionsAndPayments', 'email', e.target.checked)}
                  disabled={saving}
                />
              </td>
            </tr>

            <tr className="border-none">
              <td>
                <div className='icon-head'>
                  <div className="flex flex-col">
                    <p>{t.admin.accountAndItsSecurity}</p>
                    <p className="text-secondary">{t.admin.accountAndItsSecurityDescription}</p>
                  </div>
                </div>
              </td>
              <td className='text-center'>
                <input
                  type="checkbox"
                  checked={preferences.accountAndSecurity.sms}
                  onChange={(e) => handlePreferenceChange('accountAndSecurity', 'sms', e.target.checked)}
                  disabled={true}
                />
              </td>
              <td className='text-center'>
                <input
                  type="checkbox"
                  checked={preferences.accountAndSecurity.whatsapp}
                  onChange={(e) => handlePreferenceChange('accountAndSecurity', 'whatsapp', e.target.checked)}
                  disabled={true}
                />
              </td>
              <td className='text-center'>
                <input
                  type="checkbox"
                  checked={preferences.accountAndSecurity.email}
                  onChange={(e) => handlePreferenceChange('accountAndSecurity', 'email', e.target.checked)}
                  disabled={saving}
                />
              </td>
            </tr>

            <tr className="border-none">
              <td>
                <div className='icon-head'>
                  <div className="flex flex-col">
                    <p>{t.admin.serviceStatusAndChanges}</p>
                    <p className="text-secondary">{t.admin.serviceStatusAndChangesDescription}</p>
                  </div>
                </div>
              </td>
              <td className='text-center'>
                <input
                  type="checkbox"
                  checked={preferences.serviceStatusAndChanges.sms}
                  onChange={(e) => handlePreferenceChange('serviceStatusAndChanges', 'sms', e.target.checked)}
                  disabled={true}
                />
              </td>
              <td className='text-center'>
                <input
                  type="checkbox"
                  checked={preferences.serviceStatusAndChanges.whatsapp}
                  onChange={(e) => handlePreferenceChange('serviceStatusAndChanges', 'whatsapp', e.target.checked)}
                  disabled={true}
                />
              </td>
              <td className='text-center'>
                <input
                  type="checkbox"
                  checked={preferences.serviceStatusAndChanges.email}
                  onChange={(e) => handlePreferenceChange('serviceStatusAndChanges', 'email', e.target.checked)}
                  disabled={saving}
                />
              </td>
            </tr>

            <tr className="border-none">
              <td>
                <div className='icon-head !mb-5'>
                  <div className="flex flex-col">
                    <p>{t.admin.productUpdatesAndSpecialOffers}</p>
                    <p className="text-secondary">{t.admin.productUpdatesAndSpecialOffersDescription}</p>
                  </div>
                </div>
              </td>
              <td className='text-center'>
                <input
                  type="checkbox"
                  checked={preferences.productUpdatesAndOffers.sms}
                  onChange={(e) => handlePreferenceChange('productUpdatesAndOffers', 'sms', e.target.checked)}
                  disabled={true}
                />
              </td>
              <td className='text-center'>
                <input
                  type="checkbox"
                  checked={preferences.productUpdatesAndOffers.whatsapp}
                  onChange={(e) => handlePreferenceChange('productUpdatesAndOffers', 'whatsapp', e.target.checked)}
                  disabled={true}
                />
              </td>
              <td className='text-center'>
                <input
                  type="checkbox"
                  checked={preferences.productUpdatesAndOffers.email}
                  onChange={(e) => handlePreferenceChange('productUpdatesAndOffers', 'email', e.target.checked)}
                  disabled={saving}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default NotificationTable;
