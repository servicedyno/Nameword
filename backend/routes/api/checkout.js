const router = require("express").Router();
const CheckoutController = require("../../app/controllers/checkout/CheckoutController");
const currentUser = require("../../app/middlewares/current-user");
// Authed routes accept EITHER a signed-in session/JWT OR an x-api-key, so a
// user's personal API key works for placing orders, renewals, etc.
const auth = require("../../app/middlewares/session-or-apikey");

// Quote is public (guests build their cart before the account gate); paying and
// reading orders requires auth (session or API key).
router.post("/quote", currentUser, CheckoutController.quote);
router.post("/orders", ...auth, CheckoutController.createOrder);
// Direct crypto-order payment (bypasses the wallet): create + poll for confirmation.
router.post("/orders/crypto", ...auth, CheckoutController.createCryptoOrder);
router.get("/orders", ...auth, CheckoutController.listOrders);
router.get("/orders/:id/crypto-status", ...auth, CheckoutController.getCryptoOrderStatus);
router.get("/orders/:id", ...auth, CheckoutController.getOrder);
// C3: async provisioning — live status poll + failed-item retry.
router.get("/orders/:id/status", ...auth, CheckoutController.getOrderStatus);
router.post("/orders/:id/items/:idx/retry", ...auth, CheckoutController.retryItem);
// C2: renewals — unified expiring list, per-item renew, auto-renew toggle.
router.get("/renewals", ...auth, CheckoutController.listRenewals);
router.post("/orders/:id/items/:idx/renew", ...auth, CheckoutController.renewItem);
router.put("/orders/:id/items/:idx/auto-renew", ...auth, CheckoutController.setAutoRenew);

module.exports = router;
