const router = require("express").Router();
const c = require("../../app/controllers/reseller/resellerController");

// Nomadly Reseller API proxy. The reseller API key lives server-side (env), so the
// browser never sees it. Mode (dry_run vs live) is controlled by the provider.

// ---------- Meta ----------
router.get("/health", c.getHealth);
router.get("/account", c.getAccount);

// ---------- VPS (Linux) — specific paths must precede :id ----------
router.get("/vps/plans", c.getVpsPlans);
router.get("/vps", c.listVps);
router.post("/vps", c.createVps);
router.get("/vps/:id/credentials", c.getVpsCredentials);
router.post("/vps/:id/action", c.vpsAction);
router.get("/vps/:id", c.getVps);
router.delete("/vps/:id", c.deleteVps);

// ---------- RDP (Windows) ----------
router.get("/rdp/plans", c.getRdpPlans);
router.get("/rdp", c.listRdp);
router.post("/rdp", c.createRdp);
router.get("/rdp/:id/credentials", c.getRdpCredentials);
router.post("/rdp/:id/action", c.rdpAction);
router.get("/rdp/:id", c.getRdp);
router.delete("/rdp/:id", c.deleteRdp);

module.exports = router;
