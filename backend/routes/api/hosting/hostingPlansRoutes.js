const express = require('express');
const validateRequest = require('../../../app/middlewares/validateRequest');
const HostingPlansController = require('../../../app/controllers/hosting/HostingPlansController');
const currentUser = require('../../../app/middlewares/current-user');
const requireAuth = require('../../../app/middlewares/require-auth');

const router = express.Router();

router.get('/plans', HostingPlansController.getHostingPlans.bind(HostingPlansController));

router.get('/calculate-price', HostingPlansController.calculateHostingPrice.bind(HostingPlansController));

// Get dynopay checkout URL for hosting (requires auth)
router.post('/dynocheckout-url', currentUser, requireAuth, HostingPlansController.getHostingDynocheckoutUrl.bind(HostingPlansController));

// Get dynopay checkout URL for bundle (domain + hosting) (requires auth)
router.post('/bundle-dynocheckout-url', currentUser, requireAuth, HostingPlansController.getBundleDynocheckoutUrl.bind(HostingPlansController));

// Process wallet payment for hosting (requires auth)
router.post('/wallet-payment', currentUser, requireAuth, HostingPlansController.processHostingWalletPayment.bind(HostingPlansController));

// Create hosting for existing domain (setup flow - requires auth)
router.post('/create-for-existing-domain', currentUser, requireAuth, HostingPlansController.createHostingForExistingDomain.bind(HostingPlansController));

// Hosting payment webhook (no auth required - called by dynopay)
router.get('/dynocheckout-webhook', HostingPlansController.handleHostingDynoPaymentWebhook.bind(HostingPlansController));
router.post('/dynocheckout-webhook', HostingPlansController.handleHostingDynoPaymentWebhook.bind(HostingPlansController));

// Get user's hosting orders (requires auth)
router.get('/orders', currentUser, requireAuth, HostingPlansController.getUserHostingOrders.bind(HostingPlansController));

// Delete/Cancel hosting order (requires auth)
router.delete('/orders/:orderId', currentUser, requireAuth, HostingPlansController.deleteHostingOrder.bind(HostingPlansController));

// Link domain to hosting (requires auth)
router.post('/domains/:domain_name/link', currentUser, requireAuth, HostingPlansController.linkDomainToHosting.bind(HostingPlansController));

// Get domain linking status (requires auth)
router.get('/domains/:domain_name/link/status', currentUser, requireAuth, HostingPlansController.getLinkingStatus.bind(HostingPlansController));

// Retry domain linking (requires auth)
router.post('/domains/:domain_name/link/retry', currentUser, requireAuth, HostingPlansController.retryLinking.bind(HostingPlansController));

// Get hosting credentials (requires auth)
router.get('/hosting/:subscription_id/credentials', currentUser, requireAuth, HostingPlansController.getHostingCredentials.bind(HostingPlansController));

// Install SSL certificate (requires auth)
router.post('/ssl/install', currentUser, requireAuth, HostingPlansController.installSSL.bind(HostingPlansController));

// Get SSL certificate status (requires auth)
router.get('/ssl/status', currentUser, requireAuth, HostingPlansController.getSSLStatus.bind(HostingPlansController));

// Get external domain DNS info (Cloudflare nameservers and server IP) (requires auth)
router.get('/external-domain/dns-info', currentUser, requireAuth, HostingPlansController.getExternalDomainDNSInfo.bind(HostingPlansController));

// Get server info (requires auth)
router.get('/server-info', currentUser, requireAuth, HostingPlansController.getServerInfo.bind(HostingPlansController));

// Get hosting renewal price (requires auth)
router.get('/hosting/:subscription_id/renewal-price', currentUser, requireAuth, HostingPlansController.getHostingRenewalPrice.bind(HostingPlansController));

// Get hosting renewal options with all plans and periods (requires auth)
router.get('/hosting/:subscription_id/renewal-options', currentUser, requireAuth, HostingPlansController.getHostingRenewalOptions.bind(HostingPlansController));

router.post('/hosting/:subscription_id/renew', currentUser, requireAuth, HostingPlansController.renewHosting.bind(HostingPlansController));

// Process hosting renewal via wallet payment (requires auth)
router.post('/renewal/wallet-payment', currentUser, requireAuth, HostingPlansController.processHostingRenewalWalletPayment.bind(HostingPlansController));

// Get DynoPay checkout URL for hosting renewal (requires auth)
router.post('/renewal/dynocheckout-url', currentUser, requireAuth, HostingPlansController.getHostingRenewalDynoCheckoutUrl.bind(HostingPlansController));

// Hosting renewal payment webhook (no auth required - called by dynopay)
router.get('/renewal/dynocheckout-webhook', HostingPlansController.handleHostingRenewalDynoPaymentWebhook.bind(HostingPlansController));
router.post('/renewal/dynocheckout-webhook', HostingPlansController.handleHostingRenewalDynoPaymentWebhook.bind(HostingPlansController));

// Add addon domain to HostBay subscription (requires auth)
router.post('/hosting/:subscription_id/addon-domains', currentUser, requireAuth, HostingPlansController.addAddonDomain.bind(HostingPlansController));

// Get addon domains for HostBay subscription (requires auth)
router.get('/hosting/:subscription_id/addon-domains', currentUser, requireAuth, HostingPlansController.getAddonDomains.bind(HostingPlansController));                               
       
module.exports = router;

