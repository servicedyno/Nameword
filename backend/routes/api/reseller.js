const router = require("express").Router();
const c = require("../../app/controllers/reseller/resellerController");

// Nomadly Reseller API proxy. The reseller API key lives server-side (env), so the
// browser never sees it. Mode (dry_run vs live) is controlled by the provider.
// Catalog/search endpoints are public; anything that lists, creates or manages
// resources requires auth — accepted either as a signed-in session/JWT OR an
// x-api-key (so a user's personal API key works across every service we provide).
const auth = require("../../app/middlewares/session-or-apikey");

// ---------- Meta ----------
router.get("/health", c.getHealth);
router.get("/account", ...auth, c.getAccount);
// Unified upcoming-expiry list, scoped to the signed-in buyer (Module 12).
router.get("/renewals", ...auth, c.getRenewals);

// ---------- VPS (Linux) ----------
router.get("/vps/plans", c.getVpsPlans);
router.get("/vps", ...auth, c.listVps);
router.post("/vps", ...auth, c.createVps);
router.get("/vps/:id/credentials", ...auth, c.getVpsCredentials);
router.post("/vps/:id/action", ...auth, c.vpsAction);
router.get("/vps/:id", ...auth, c.getVps);
router.delete("/vps/:id", ...auth, c.deleteVps);

// ---------- RDP (Windows) ----------
router.get("/rdp/plans", c.getRdpPlans);
router.get("/rdp", ...auth, c.listRdp);
router.post("/rdp", ...auth, c.createRdp);
router.get("/rdp/:id/credentials", ...auth, c.getRdpCredentials);
router.post("/rdp/:id/action", ...auth, c.rdpAction);
router.get("/rdp/:id", ...auth, c.getRdp);
router.delete("/rdp/:id", ...auth, c.deleteRdp);

// ---------- Domains ----------
router.get("/domains/search", c.searchDomain);
router.get("/domains/suggest", c.suggestDomains);
router.get("/domains", ...auth, c.listDomains);
router.post("/domains/register", ...auth, c.registerDomain);

// ---------- DNS (free) ----------
router.get("/dns/:domain/records", ...auth, c.listDnsRecords);
router.post("/dns/:domain/records", ...auth, c.addDnsRecord);
router.put("/dns/:domain/records", ...auth, c.updateDnsRecord);
router.delete("/dns/:domain/records", ...auth, c.deleteDnsRecord);
router.put("/dns/:domain/nameservers", ...auth, c.setNameservers);

// ---------- cPanel Hosting — specific paths must precede :user ----------
router.get("/hosting/plans", c.getHostingPlans);
router.get("/hosting", ...auth, c.listHosting);
router.post("/hosting", ...auth, c.createHosting);
// Visitor Captcha (Gold plan) — scoped by the SITE domain, not the cPanel user.
router.get("/hosting/captcha/:domain", ...auth, c.getHostingCaptcha);
router.post("/hosting/captcha/:domain", ...auth, c.setHostingCaptcha);
// Account management (:user)
router.post("/hosting/:user/suspend", ...auth, c.suspendHosting);
router.post("/hosting/:user/unsuspend", ...auth, c.unsuspendHosting);
router.post("/hosting/:user/upgrade", ...auth, c.upgradeHosting);
router.get("/hosting/:user/login", ...auth, c.hostingLogin);
router.get("/hosting/:user/credentials", ...auth, c.hostingCredentials);
router.get("/hosting/:user/addons", ...auth, c.listHostingAddons);
router.post("/hosting/:user/addons", ...auth, c.addHostingAddon);
// Full panel management (Modules 2-11): MySQL, subdomains, domains, SSL, stats,
// File Manager, security/Anti-Red, geo, analytics, site-status. Each entry is
// ownership-scoped and multi-segment, so it never shadows GET/DELETE /hosting/:user.
c.hostingManagementRoutes.forEach(({ method, path, handler }) => {
  router[method](path, ...auth, handler);
});
router.delete("/hosting/:user", ...auth, c.terminateHosting);
router.get("/hosting/:user", ...auth, c.getHostingDetails);

module.exports = router;
