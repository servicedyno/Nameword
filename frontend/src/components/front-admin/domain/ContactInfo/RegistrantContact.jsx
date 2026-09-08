import { copyToClipboard } from "../../../../utils/copyToClipboard";
import { useAlert } from "../../../../context/AlertContext";
import { useLanguage } from "../../../../hooks/useLanguage";

const RegistrantContact = ({ data, onEdit }) => {
    const { showAlert } = useAlert();
    const { t } = useLanguage();
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
${t.admin.zipCode} ${data?.address?.zipcode || 'N/A'}`;

        copyToClipboard(contactText, (message) => {
            showAlert(message, { duration: 2500, type: 'success' });
        });
    };

    return (
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

            <div className='flex flex-wrap items-center admin-btn gap-2 w-full'>
                <button onClick={onEdit} className='btn-outline border-dark'>
                    {t.admin.changeContacts}
                </button>
                <button onClick={handleCopy} className='btn-outline border-dark'>
                    {t.admin.copy}
                </button>
            </div>
        </div>
    )
}

export default RegistrantContact