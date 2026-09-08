const APIRouter = require("express").Router();

APIRouter.use("/rdp", require("./rdp"));
APIRouter.use("/rdp-subscription", require("./rdpSubscription"));
APIRouter.use("/transactions", require("./transactions"));
APIRouter.use("/wallet", require("./wallet"));
APIRouter.use("/invoices", require("./invoices"));
APIRouter.use("/payment", require("./payment"));
APIRouter.use("/subscription", require("./subscription"));
APIRouter.use(
	"/vps-billing-cycle-discount",
	require("./vps-billing-cycle-discount")
);
APIRouter.use("/vps-plan", require("./vps-plans"));
APIRouter.use("/vps-disk", require("./vps-disks"));
APIRouter.use(require("./computeEngine"));
APIRouter.use("/ssh", require("./ssh-keys"));
APIRouter.use("/admin", require("./admin"));
APIRouter.use("/auth", require("./auth"));
APIRouter.use("/user-session", require("./userSessionRoutes"));
APIRouter.use("/cart", require("./cart"));
APIRouter.use("/chat", require("./chat"));

APIRouter.use(require("./api-keys"));
APIRouter.use("/dns", require("./dns"));
APIRouter.use("/domain-forward", require("./domain-forward"));
APIRouter.use("/domain", require("./domain"));
APIRouter.use("/host", require("./host"));
APIRouter.use("/cpanel", require("./hosting/cpanelRoutes"));
APIRouter.use("/hosting-plans", require("./hosting/hostingPlansRoutes"));
APIRouter.use(require("./hosting/pleskRoutes"));
APIRouter.use("/plesk", require("./hosting/pleskRoutes"));
APIRouter.use("/cloudflare", require("./hosting/cloudflareRoutes"));
APIRouter.use("/firewall", require("./firewall"));
APIRouter.use(require("./hosting/whmRoutes"));
APIRouter.use("/domain-provider-client", require("./domainProviderClient"));
APIRouter.use("/tax", require("./tax"));
APIRouter.use("/promo", require("./promo"));

module.exports = APIRouter;
