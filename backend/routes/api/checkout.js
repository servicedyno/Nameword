const router = require("express").Router();
const CheckoutController = require("../../app/controllers/checkout/CheckoutController");
const currentUser = require("../../app/middlewares/current-user");
const requireAuth = require("../../app/middlewares/require-auth");

// Quote is public (guests build their cart before the account gate); paying and
// reading orders requires a signed-in user.
router.post("/quote", currentUser, CheckoutController.quote);
router.post("/orders", currentUser, requireAuth, CheckoutController.createOrder);
// Direct crypto-order payment (bypasses the wallet): create + poll for confirmation.
router.post("/orders/crypto", currentUser, requireAuth, CheckoutController.createCryptoOrder);
router.get("/orders", currentUser, requireAuth, CheckoutController.listOrders);
router.get("/orders/:id/crypto-status", currentUser, requireAuth, CheckoutController.getCryptoOrderStatus);
router.get("/orders/:id", currentUser, requireAuth, CheckoutController.getOrder);
// C3: async provisioning — live status poll + failed-item retry.
router.get("/orders/:id/status", currentUser, requireAuth, CheckoutController.getOrderStatus);
router.post("/orders/:id/items/:idx/retry", currentUser, requireAuth, CheckoutController.retryItem);
// C2: renewals — unified expiring list, per-item renew, auto-renew toggle.
router.get("/renewals", currentUser, requireAuth, CheckoutController.listRenewals);
router.post("/orders/:id/items/:idx/renew", currentUser, requireAuth, CheckoutController.renewItem);
router.put("/orders/:id/items/:idx/auto-renew", currentUser, requireAuth, CheckoutController.setAutoRenew);

module.exports = router;
