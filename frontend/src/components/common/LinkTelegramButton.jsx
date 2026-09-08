import { useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useAlert } from '../../context/AlertContext';
import { useLanguage } from '../../hooks/useLanguage';

const LinkTelegramButton = ({ loading, setLoading }) => {
  const telegramWrapperRef = useRef(null);

  const { linkTelegramAccount } = useAuth();
  const { showAlert } = useAlert();
  const { t } = useLanguage();

  const onTelegramAuth = async (user, reclaim = false) => {
    try {
      setLoading(true);
      const payload = reclaim ? { ...user, reclaim: true } : user;
      const data = await linkTelegramAccount(payload);
      if (data?.success) {
        showAlert(data?.message || t.admin.telegramLinkedSuccess || 'Telegram account linked successfully', {
          duration: 2500,
          type: 'success',
        });
      } else {
        const errorMsg = data?.error || t.admin.failedToLinkTelegram || 'Failed to link Telegram account';
        if (errorMsg.includes('already linked to another user') && !reclaim) {
          const reclaimConfirm = window.confirm(
            t.admin.telegramAlreadyLinkedReclaim ||
            'This Telegram account is already linked to another account. Do you want to unlink it from that account and link it to this one?'
          );
          if (reclaimConfirm) {
            await onTelegramAuth(user, true);
            return;
          }
        }
        showAlert(errorMsg, { duration: 2500, type: 'warning' });
      }
    } catch (error) {
      console.error('Telegram link failed:', error);
      const errorMsg = error?.response?.data?.error || error?.message || t.admin.failedToLinkTelegram || 'Failed to link Telegram account';
      if (errorMsg.includes('already linked to another user') && !reclaim) {
        const reclaimConfirm = window.confirm(
          t.admin.telegramAlreadyLinkedReclaim ||
          'This Telegram account is already linked to another account. Do you want to unlink it from that account and link it to this one?'
        );
        if (reclaimConfirm) {
          await onTelegramAuth(user, true);
          return;
        }
      }
      showAlert(errorMsg, { duration: 2500, type: 'warning' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const scriptElement = document.createElement('script');
    scriptElement.src = 'https://telegram.org/js/telegram-widget.js?22';
    scriptElement.setAttribute('data-telegram-login', import.meta.env.VITE_TELEGRAM_BOT_NAME);
    scriptElement.setAttribute('data-size', 'medium');
    scriptElement.setAttribute('data-onauth', 'onTelegramAuth(user)');
    scriptElement.setAttribute('data-userpic', 'false');
    scriptElement.setAttribute('data-request-access', 'write');
    scriptElement.async = true;

    window.onTelegramAuth = onTelegramAuth;

    const container = telegramWrapperRef.current;
    if (!container) return;

    container.appendChild(scriptElement);

    const forceIframeFullSize = () => {
      const iframe = container.querySelector('iframe');
      if (iframe) {
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.minHeight = '36px';
      }
    };

    const observer = new MutationObserver(forceIframeFullSize);
    observer.observe(container, { childList: true, subtree: true });
    forceIframeFullSize();

    return () => {
      observer.disconnect();
      container.innerHTML = '';
    };
  }, []);

  return (
    <div className="relative">
      <button
        type="button"
        className={`btn-outline small pointer-events-none z-10 relative ${loading ? 'disable' : ''}`}
        disabled={loading}
        aria-hidden
      >
        {t.admin.linkTelegram || 'Link Telegram'}
      </button>
      <div
        ref={telegramWrapperRef}
        className="absolute inset-0 z-20 [&>iframe]:!w-full [&>iframe]:!h-full [&>iframe]:!min-h-[36px]"
        style={{ opacity: 0 }}
        aria-hidden
      />
      {loading && (
        <div className="absolute inset-0 z-30 cursor-not-allowed" aria-hidden />
      )}
    </div>
  );
};

export default LinkTelegramButton;
