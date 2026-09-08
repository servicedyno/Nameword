// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL
    ? `${import.meta.env.VITE_API_BASE_URL}/api/v1`
    : 'http://localhost:3000/api/v1',
  API_KEY: import.meta.env.VITE_API_KEY || 'YOUR_API_KEY_HERE'
};

// Environment validation
export const validateEnvironment = () => {
  const required = ['VITE_API_BASE_URL', 'VITE_API_KEY'];
  const missing = required.filter(key => !import.meta.env[key]);

  if (missing.length > 0) {
    console.warn('⚠️ Missing environment variables:', missing);
    console.warn('Please check your .env file');
  }
};

// API endpoints
export const ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    CURRENT_USER: '/auth/me',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_EMAIL: '/auth/verify-email-code',
    SEND_EMAIL_CODE: '/auth/send-email-code',
    TELEGRAM_LOGIN: '/auth/telegram',
    TELEGRAM_LINK: '/auth/telegram/link',
    TELEGRAM_UNLINK: '/auth/telegram/unlink',
    ACCOUNT_DETAIL: '/auth/update-userDetails',
    CHANGE_PASSWORD: '/auth/change-password',
    DELETE_ACCOUNT: '/auth/delete-account',
    UNLINK_GOOGLE_ACCOUNT: '/auth/google/unlink',
    VERIFY_2FA: '/auth/2fa/verify',
    CHANGE_EMAIL: '/auth/change-email',
    GET_NOTIFICATION_PREFERENCES: '/auth/notification-preferences',
    UPDATE_NOTIFICATION_PREFERENCES: '/auth/notification-preferences',
  },

  // Domain Management
  DOMAIN: {
    SEARCH: '/domain/search',
    SUGGESTIONS: '/domain/suggestion',
    TLD_SUGGESTIONS: '/domain/tld-suggestion',
    LIST: '/domain/list',
    VIEW_DOMAIN: '/domain/view-domain',
    BUNDLES: '/domain/bundles',
    DOMAIN_DYNO_CHECKOUT: '/domain/dynocheckout-url', 
    DOMAIN_DYNO_CHECKOUT_WEBHOOK: '/domain/dynocheckout-webhook',
    RENEW_DYNO_CHECKOUT: '/domain/renew/dynocheckout-url',
    RENEW_DYNO_CHECKOUT_WEBHOOK: '/domain/renew/dynocheckout-webhook',
    TRANSFER_DYNO_CHECKOUT: '/domain/transfer/dynocheckout-url',
    TRANSFER_DYNO_CHECKOUT_WEBHOOK: '/domain/transfer/dynocheckout-webhook',
    ORDER: '/domain/order',
    RENEW: '/domain/renew',
    TRANSFER: '/domain/transfer',
    TRANSFER_STATUS: '/domain/transfer/status',
    TRANSFER_LIST: '/domain/transfer/list',
    VALIDATE_TRANSFER: '/domain/validate-transfer',
    CANCEL_TRANSFER: '/domain/cancel-transfer',
    MODIFY_NAMESERVER: '/domain/modiify-nameserver',
    MODIFY_AUTHCODE: '/domain/modify-authcode',
    MANAGE_LOCK: '/domain/manage-lock',
    MANAGE_PRIVACY: '/domain/manage-privacy',
    BULK_MANAGE_AUTORENEW: '/domain/bulk-manage-autorenew',
    BULK_MANAGE_LOCK: '/domain/bulk-manage-lock',
    BULK_MODIFY_NAMESERVER: '/domain/bulk-modify-nameserver',
    WHOIS: '/domain/whois',
    PRIVACY_ENABLE: '/domain/privacy/enable',
    PRIVACY_DISABLE: '/domain/privacy/disable',
    PRIVACY_DYNO_CHECKOUT: '/domain/privacy/dynocheckout-url',
    PRIVACY_DYNO_CHECKOUT_WEBHOOK: '/domain/privacy/dynocheckout-webhook',
    VIEW_SECRET_KEY: '/domain/view-secret-key',
    MANAGE_DNS: '/domain/manage-dns-records',
    PRICE: '/domain/price',
    REMOVE_DOMAIN: (id) => `/domain/${id}`,
    CONTACTS: (domainName) => `/domain/${domainName}/contacts`,
    CONTACT: (domainName, contactId) => `/domain/${domainName}/contacts/${contactId}`,
    AUTH_CODE: (domainName) => `/domain/${domainName}/auth-code`,
    DNS_RECORDS: (domainName) => `/domain/${domainName}/dns/records`,
  },

  // DNS Management
  DNS: {
    VIEW: '/dns/view',
    ADD: '/dns/add',
    MODIFY: '/dns/modify',
    DELETE: '/dns/delete',
    MANAGE: '/dns/manage',
    NAMESERVERS_VIEW: '/dns/nameservers/view',
    NAMESERVERS_UPDATE: '/dns/nameservers/update',
    DNSSEC_VIEW: '/dns/dnssec/view',
    DNSSEC_ADD: '/dns/dnssec/add',
    DNSSEC_MODIFY: '/dns/dnssec/modify',
    DNSSEC_DELETE: '/dns/dnssec/delete',
    HISTORY: '/dns/history',
    HISTORY_RESTORE: '/dns/history/restore',
    CHILD_NAMESERVER_VIEW: '/host/get-child-nameserver',
    CHILD_NAMESERVER_ADD: '/host/add-child-nameserver',
    CHILD_NAMESERVER_MODIFY_IP: '/host/modify-child-nameserver-ip',
    CHILD_NAMESERVER_MODIFY_HOST: '/host/modify-child-nameserver-host',
    CHILD_NAMESERVER_DELETE: '/host/delete-child-nameserver',
  },

  // Add to Cart
  CART:{
    ADD:'/cart/add',
    LIST:'/cart/list',
    REMOVE:'/cart/remove',
    CHECKOUT: '/cart/checkout',
    CLEAR: '/cart/clear',
    UPDATE: '/cart/update',   
  },                                                                                                                                                                                

  USER_SESSION: {
    GET_LIST: "/user-session",
    SINGLE_LOGOUT: "/user-session/logout",  // ex. "/user-session/logout/:sessionId",
    LOGOUT_ALL: '/user-session/logout-all'
  },                         

  API_KEY: {
    CREATE:"/user/api-keys",
    LIST:"/user/api-keys",
    SINGLE_API_KEY: "/user/api-keys"// ex. "/user/api-keys/:Id",
  },

  WALLET: {
    CREATE: '/wallet/create',
    GET: '/wallet/get',
    FUND: '/wallet/fund',
    PAY: '/wallet/pay',
    DYNO_CHECKOUT: '/wallet/dynocheckout-url',
    DYNO_WEBHOOK: '/wallet/dynocheckout-webhook',
    TRANSACTIONS: '/wallet/transactions',
    REFUNDS: '/wallet/refunds',
  },

  // Domain Forwarding
  DOMAIN_FORWARD: {
    SET: '/domain-forward/set',
    GET: '/domain-forward/get',
    ALL: '/domain-forward/all',
    UPDATE: '/domain-forward/update',
    DELETE: '/domain-forward/delete',
  },

  // Hosting Plans
  HOSTING_PLANS: {
    BUNDLE_DYNO_CHECKOUT: '/hosting-plans/bundle-dynocheckout-url',
    BUNDLE_WALLET_PAYMENT: '/hosting-plans/bundle-wallet-payment',
    GET: '/hosting-plans/plans',
    CALCULATE_PRICE: '/hosting-plans/calculate-price',
    DYNO_CHECKOUT: '/hosting-plans/dynocheckout-url',
    WALLET_PAYMENT: '/hosting-plans/wallet-payment',
    CREATE_FOR_EXISTING_DOMAIN: '/hosting-plans/create-for-existing-domain',
    GET_ORDERS: '/hosting-plans/orders',
    DELETE_ORDER: (orderId) => `/hosting-plans/orders/${orderId}`,
    LINK_DOMAIN: '/hosting-plans/domains',
    INSTALL_SSL: '/hosting-plans/ssl/install',
    GET_SSL_STATUS: '/hosting-plans/ssl/status',
    GET_EXTERNAL_DOMAIN_DNS_INFO: '/hosting-plans/external-domain/dns-info',
    GET_SERVER_INFO: '/hosting-plans/server-info',
    GET_RENEWAL_PRICE: (subscriptionId) => `/hosting-plans/hosting/${subscriptionId}/renewal-price`,
    GET_RENEWAL_OPTIONS: (subscriptionId) => `/hosting-plans/hosting/${subscriptionId}/renewal-options`,
    RENEWAL_WALLET_PAYMENT: '/hosting-plans/renewal/wallet-payment',
    RENEWAL_DYNO_CHECKOUT: '/hosting-plans/renewal/dynocheckout-url',
    ADD_ADDON_DOMAIN: (subscriptionId) => `/hosting-plans/hosting/${subscriptionId}/addon-domains`,
    GET_ADDON_DOMAINS: (subscriptionId) => `/hosting-plans/hosting/${subscriptionId}/addon-domains`,
  },

  // Live Chat
  CHAT: {
    SEND_MESSAGE: '/chat/message',
    GET_MESSAGES: '/chat/messages',
    GET_SESSIONS: '/chat/sessions',
    MARK_AS_READ: '/chat/messages/read',
  },

  // Tax
  TAX: {
    GET_USER_COUNTRY: '/tax/user-country',
    GET_TAX_RATE: '/tax/tax-rates',
    VALIDATE_VAT: '/tax/validate-vat',
  },

  // Promocode
  PROMO: {
    VALIDATE: '/promo/validate',
  },
}; 