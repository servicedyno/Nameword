const express = require("express");
const CartController = require("../../app/controllers/cart/CartController");
const validateAPIKey = require("../../app/middlewares/validate-apikey");
const requireAuth = require("../../app/middlewares/require-auth");
const validateRequest = require("../../app/middlewares/validate-request");
const { addToCartRules, removeFromCartRules } = require("../../app/validations/cartRules");
const currentUser = require("../../app/middlewares/current-user");

const router = express.Router();
// router.use(validateAPIKey, requireAuth);
router.post("/add", addToCartRules, currentUser, requireAuth, CartController.add);
router.get("/list", currentUser, requireAuth, CartController.list);
router.delete("/remove", removeFromCartRules, validateRequest, currentUser, requireAuth, CartController.remove);
router.post("/checkout", currentUser, requireAuth, CartController.checkout);
router.delete("/clear", currentUser, requireAuth, CartController.clear);
router.put("/update", currentUser, requireAuth, CartController.update);



module.exports = router;


