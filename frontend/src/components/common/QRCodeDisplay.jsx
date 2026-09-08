import { useEffect, useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage';

const QRCodeDisplay = () => {
  const [qrCode, setQrCode] = useState(null);
  const { t } = useLanguage();

  useEffect(() => {
    const storedQRCode = localStorage.getItem("qrCode");
    if (storedQRCode) {
      setQrCode(storedQRCode);
    }
  }, []);

  if (!qrCode) return null;

  return (
    <div className="flex flex-col items-center my-2">
      <p className="text-primary dark:text-gray-500 text-sm mb-3">{t.common.qrCode.scanMessage}</p>
      <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
    </div>
  );
};

export default QRCodeDisplay;
