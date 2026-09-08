const router = require("express").Router();
const  ClientController  = require("../app/controllers/connect-reseller/ClientController");

router.route("/add/user").get(ClientController.createClient);

module.exports = router;
