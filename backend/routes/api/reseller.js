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

// ---------- Domains ----------
router.get("/domains/search", c.searchDomain);
router.get("/domains/suggest", c.suggestDomains);
router.get("/domains", c.listDomains);
router.post("/domains/register", c.registerDomain);

// ---------- DNS (free) — specific paths must precede generic ----------
router.get("/dns/:domain/records", c.listDnsRecords);
router.post("/dns/:domain/records", c.addDnsRecord);
router.put("/dns/:domain/records", c.updateDnsRecord);
router.delete("/dns/:domain/records", c.deleteDnsRecord);
router.put("/dns/:domain/nameservers", c.setNameservers);

// ---------- cPanel Hosting — specific paths must precede :user ----------
router.get("/hosting/plans", c.getHostingPlans);
router.get("/hosting", c.listHosting);
router.post("/hosting", c.createHosting);
router.post("/hosting/:user/suspend", c.suspendHosting);
router.post("/hosting/:user/unsuspend", c.unsuspendHosting);
router.get("/hosting/:user/login", c.hostingLogin);
router.get("/hosting/:user/credentials", c.hostingCredentials);
router.delete("/hosting/:user", c.terminateHosting);

module.exports = router;
