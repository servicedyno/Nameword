const router = require("express").Router();
const { validatePromoCode } = require("../../app/controllers/promo/PromoController");
const currentUser = require("../../app/middlewares/current-user");
const requireAuth = require("../../app/middlewares/require-auth");

// Validate promocode
router.post("/validate", currentUser, requireAuth, validatePromoCode);

module.exports = router;

