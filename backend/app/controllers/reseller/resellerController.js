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
};
