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
// Default TLD applied when a caller searches a bare keyword (no dot). This lets
// "coolstartup2026" resolve to "coolstartup2026.com" instead of the upstream
// returning a 400 invalid_domain. Alternative TLDs ("friends") are surfaced by
// the /domains/suggest endpoint below.
const DEFAULT_TLD = "com";
const searchDomain = (req, res) => {
  const params = { ...req.query };
  const raw = String(params.domain || "").trim().toLowerCase();
  if (raw && !raw.includes(".")) {
    const label = raw.replace(/[^a-z0-9-]/g, "");
    params.domain = label ? `${label}.${DEFAULT_TLD}` : raw;
  }
  return forward(res, nomadly.get("/domains/search", { params }));
};

// Curated set of popular TLDs used to build live alternative suggestions.
const POPULAR_TLDS = [
  "com", "net", "org", "io", "co", "ai",
  "app", "dev", "xyz", "online", "shop", "store",
];

// Live TLD suggestions powered by the reseller search. Given a keyword or a
// full domain, we check the base label across a curated set of TLDs in parallel
// and return real availability + pricing. Failures per-TLD are ignored so a slow
// or erroring upstream lookup never breaks the whole response.
const suggestDomains = async (req, res) => {
  const raw = String(req.query.domain || req.query.keyword || "")
    .trim()
    .toLowerCase();
  if (!raw) {
    return res
      .status(400)
      .json({ error: "bad_request", message: "domain or keyword is required" });
  }
  const label = (raw.includes(".") ? raw.split(".")[0] : raw).replace(/[^a-z0-9-]/g, "");
  if (!label) {
    return res
      .status(400)
      .json({ error: "bad_request", message: "invalid domain/keyword" });
  }

  // Build candidate list: exact input first (if it had a TLD), then popular TLDs.
  const candidates = [];
  if (raw.includes(".")) candidates.push(raw);
  for (const tld of POPULAR_TLDS) {
    const d = `${label}.${tld}`;
    if (!candidates.includes(d)) candidates.push(d);
  }
  const limited = candidates.slice(0, 12);

  const settled = await Promise.allSettled(
    limited.map((d) => nomadly.get("/domains/search", { params: { domain: d } }))
  );
  const suggestions = settled
    .map((r, i) => {
      if (r.status !== "fulfilled") return null;
      const data = r.value?.data || {};
      return {
        domain: data.domain || limited[i],
        available: !!data.available,
        price_usd: data.price_usd ?? null,
        registrar: data.registrar || null,
      };
    })
    .filter(Boolean);

  return res.json({ keyword: label, count: suggestions.length, suggestions });
};

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
// Reveal cPanel account credentials (surfaced in the live hosting list as credentials_url).
const hostingCredentials = (req, res) =>
  forward(res, nomadly.get(`/hosting/${enc(req.params.user)}/credentials`));

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
  suggestDomains,
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
  hostingCredentials,
};
