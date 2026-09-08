const { nomadly } = require("../../services/nomadlyReseller");

// Generic forwarder: performs the upstream call and mirrors its HTTP status + JSON
// body back to the client. Upstream (Nomadly) already returns clean {error,message}
// bodies with the right status codes, so we simply relay them.
async function forward(res, requestPromise) {
  try {
    const upstream = await requestPromise;
    return res.status(upstream.status).json(upstream.data);
  } catch (err) {
    if (err.response) {
      return res.status(err.response.status).json(err.response.data);
    }
    return res.status(502).json({
      success: false,
      error: "reseller_unreachable",
      message: err.message || "Failed to reach the reseller API",
    });
  }
}

const enc = (v) => encodeURIComponent(v);

// ---------- Meta ----------
const getHealth = (req, res) => forward(res, nomadly.get("/health"));
const getAccount = (req, res) => forward(res, nomadly.get("/account"));

// ---------- VPS (Linux) ----------
const getVpsPlans = (req, res) =>
  forward(res, nomadly.get("/vps/plans", { params: req.query }));
const listVps = (req, res) => forward(res, nomadly.get("/vps"));
const createVps = (req, res) => forward(res, nomadly.post("/vps", req.body || {}));
const getVps = (req, res) =>
  forward(res, nomadly.get(`/vps/${enc(req.params.id)}`));
const vpsAction = (req, res) =>
  forward(res, nomadly.post(`/vps/${enc(req.params.id)}/action`, req.body || {}));
const deleteVps = (req, res) =>
  forward(res, nomadly.delete(`/vps/${enc(req.params.id)}`));
const getVpsCredentials = (req, res) =>
  forward(res, nomadly.get(`/vps/${enc(req.params.id)}/credentials`));

// ---------- RDP (Windows) ----------
const getRdpPlans = (req, res) =>
  forward(res, nomadly.get("/rdp/plans", { params: req.query }));
const listRdp = (req, res) => forward(res, nomadly.get("/rdp"));
const createRdp = (req, res) => forward(res, nomadly.post("/rdp", req.body || {}));
const getRdp = (req, res) =>
  forward(res, nomadly.get(`/rdp/${enc(req.params.id)}`));
const rdpAction = (req, res) =>
  forward(res, nomadly.post(`/rdp/${enc(req.params.id)}/action`, req.body || {}));
const deleteRdp = (req, res) =>
  forward(res, nomadly.delete(`/rdp/${enc(req.params.id)}`));
const getRdpCredentials = (req, res) =>
  forward(res, nomadly.get(`/rdp/${enc(req.params.id)}/credentials`));

// ---------- Domains ----------
const searchDomain = (req, res) =>
  forward(res, nomadly.get("/domains/search", { params: req.query }));
const listDomains = (req, res) => forward(res, nomadly.get("/domains"));
const registerDomain = (req, res) =>
  forward(res, nomadly.post("/domains/register", req.body || {}));

// ---------- DNS (free) ----------
const listDnsRecords = (req, res) =>
  forward(res, nomadly.get(`/dns/${enc(req.params.domain)}/records`));
const addDnsRecord = (req, res) =>
  forward(res, nomadly.post(`/dns/${enc(req.params.domain)}/records`, req.body || {}));
const updateDnsRecord = (req, res) =>
  forward(res, nomadly.put(`/dns/${enc(req.params.domain)}/records`, req.body || {}));
const deleteDnsRecord = (req, res) =>
  forward(res, nomadly.delete(`/dns/${enc(req.params.domain)}/records`, { data: req.body || {} }));
const setNameservers = (req, res) =>
  forward(res, nomadly.put(`/dns/${enc(req.params.domain)}/nameservers`, req.body || {}));

// ---------- cPanel Hosting ----------
const getHostingPlans = (req, res) => forward(res, nomadly.get("/hosting/plans"));
const createHosting = (req, res) =>
  forward(res, nomadly.post("/hosting", req.body || {}));
const listHosting = (req, res) => forward(res, nomadly.get("/hosting"));
const suspendHosting = (req, res) =>
  forward(res, nomadly.post(`/hosting/${enc(req.params.user)}/suspend`, req.body || {}));
const unsuspendHosting = (req, res) =>
  forward(res, nomadly.post(`/hosting/${enc(req.params.user)}/unsuspend`, req.body || {}));
const terminateHosting = (req, res) =>
  forward(res, nomadly.delete(`/hosting/${enc(req.params.user)}`));
const hostingLogin = (req, res) =>
  forward(res, nomadly.get(`/hosting/${enc(req.params.user)}/login`));

module.exports = {
  getHealth,
  getAccount,
  getVpsPlans,
  listVps,
  createVps,
  getVps,
  vpsAction,
  deleteVps,
  getVpsCredentials,
  getRdpPlans,
  listRdp,
  createRdp,
  getRdp,
  rdpAction,
  deleteRdp,
  getRdpCredentials,
  searchDomain,
  listDomains,
  registerDomain,
  listDnsRecords,
  addDnsRecord,
  updateDnsRecord,
  deleteDnsRecord,
  setNameservers,
  getHostingPlans,
  createHosting,
  listHosting,
  suspendHosting,
  unsuspendHosting,
  terminateHosting,
  hostingLogin,
};
