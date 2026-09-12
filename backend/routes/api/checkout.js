const router = require("express").Router();
const CheckoutController = require("../../app/controllers/checkout/CheckoutController");
const currentUser = require("../../app/middlewares/current-user");
const requireAuth = require("../../app/middlewares/require-auth");

// Quote is public (guests build their cart before the account gate); paying and
// reading orders requires a signed-in user.
router.post("/quote", currentUser, CheckoutController.quote);
router.post("/orders", currentUser, requireAuth, CheckoutController.createOrder);
router.get("/orders", currentUser, requireAuth, CheckoutController.listOrders);
router.get("/orders/:id", currentUser, requireAuth, CheckoutController.getOrder);
// C3: async provisioning — live status poll + failed-item retry.
router.get("/orders/:id/status", currentUser, requireAuth, CheckoutController.getOrderStatus);
router.post("/orders/:id/items/:idx/retry", currentUser, requireAuth, CheckoutController.retryItem);

module.exports = router;
