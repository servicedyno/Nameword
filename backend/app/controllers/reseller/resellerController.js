const { nomadly } = require("../../services/nomadlyReseller");
const ownership = require("../../services/ownership");

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

// ---------- Ownership helpers (C1) ----------
// Every "my X" list and management action is scoped to the SIGNED-IN buyer via
// their order records. Resources the user doesn't own are never listed and any
// action against them is rejected with 403.
const forbidden = (res, what) =>
  res.status(403).json({
    success: false,
    error: "forbidden",
    message: `You don't have access to this ${what}.`,
  });

const userId = (req) => req.user && (req.user.id || req.user._id);

// Shape an owned server entry into the list item the frontend expects,
// optionally merged with a live upstream detail object.
const serverListItem = (entry, live) => {
  const it = entry.item;
  const liveStatus = live && (live.status || live.state || live.power_status);
  const liveIp = live && (live.ip || live.ip_address || live.ipv4);
  return {
    id: entry.ref,
    hostname: it.hostname || null,
    plan: it.plan_name || it.plan_id || null,
    plan_id: it.plan_id || null,
    region: it.region || null,
    os: it.os || null,
    price_usd: it.price_usd ?? null,
    status: it.status === "test_mode" ? "test_mode" : liveStatus || it.status || "unknown",
    ip: liveIp || it.server_ip || null,
    mode: entry.mode,
    created_at: entry.createdAt,
  };
};

const testModeResult = (kind) => ({
  mode: "dry_run",
  status: "test_mode",
  message: `Test mode — this ${kind} was validated and priced by the provider but not provisioned, so there is nothing to control yet.`,
});

// ---------- Meta ----------
const getHealth = (req, res) => forward(res, nomadly.get("/health"));
const getAccount = (req, res) => forward(res, nomadly.get("/account"));

// Upstream returns vcpus=null; the plan_id encodes it (e.g. "s-2vcpu-4gb").
const VCPU_RE = /(\d+)\s*vcpu/i;
const withVcpus = (upstream) => {
  const plans = upstream?.data?.plans;
  if (!Array.isArray(plans)) return upstream;
  const mapped = plans.map((p) => {
    if (p.vcpus != null) return p;
    const m = String(p.plan_id || "").match(VCPU_RE);
    return { ...p, vcpus: m ? Number(m[1]) : null };
  });
  return { ...upstream, data: { ...upstream.data, plans: mapped } };
};

// ---------- Servers: VPS (Linux) & RDP (Windows) ----------
// Plans + create are public/checkout concerns and stay as thin proxies.
const getVpsPlans = (req, res) =>
  forward(res, nomadly.get("/vps/plans", { params: req.query }).then(withVcpus));
const createVps = (req, res) => forward(res, nomadly.post("/vps", req.body || {}));
const getRdpPlans = (req, res) =>
  forward(res, nomadly.get("/rdp/plans", { params: req.query }).then(withVcpus));
const createRdp = (req, res) => forward(res, nomadly.post("/rdp", req.body || {}));

// List only the signed-in buyer's servers (from their orders), enriched with
// live provider detail when the resource was really provisioned (live mode).
async function listServers(req, res, type) {
  try {
    const entries = await ownership.ownedList(userId(req), type);
    const items = await Promise.all(
      entries.map(async (entry) => {
        let live = null;
        if (entry.item.provider_id) {
          try {
            const r = await nomadly.get(`/${type}/${enc(entry.item.provider_id)}`);
            live = r.data || null;
          } catch (_) {
            /* per-resource failure must not break the whole list */
          }
        }
        return serverListItem(entry, live);
      })
    );
    return res.json({ [type]: items, count: items.length });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, error: "internal_error", message: err.message });
  }
}

async function getServer(req, res, type) {
  const entry = await ownership.findOwnedServer(userId(req), type, req.params.id);
  if (!entry) return forbidden(res, type === "rdp" ? "RDP" : "server");
  if (entry.item.provider_id) {
    return forward(res, nomadly.get(`/${type}/${enc(entry.item.provider_id)}`));
  }
  return res.json(serverListItem(entry, null));
}

async function serverAction(req, res, type) {
  const entry = await ownership.findOwnedServer(userId(req), type, req.params.id);
  if (!entry) return forbidden(res, type === "rdp" ? "RDP" : "server");
  if (entry.item.provider_id) {
    return forward(res, nomadly.post(`/${type}/${enc(entry.item.provider_id)}/action`, req.body || {}));
  }
  return res.json(testModeResult(type === "rdp" ? "RDP" : "server"));
}

async function deleteServer(req, res, type) {
  const entry = await ownership.findOwnedServer(userId(req), type, req.params.id);
  if (!entry) return forbidden(res, type === "rdp" ? "RDP" : "server");
  if (entry.item.provider_id) {
    return forward(res, nomadly.delete(`/${type}/${enc(entry.item.provider_id)}`));
  }
  return res.json({
    mode: "dry_run",
    status: "test_mode",
    message: "Test mode — nothing was provisioned upstream to destroy.",
  });
}

async function getServerCredentials(req, res, type) {
  const entry = await ownership.findOwnedServer(userId(req), type, req.params.id);
  if (!entry) return forbidden(res, type === "rdp" ? "RDP" : "server");
  if (entry.item.provider_id) {
    return forward(res, nomadly.get(`/${type}/${enc(entry.item.provider_id)}/credentials`));
  }
  return res.json({
    mode: "dry_run",
    username: type === "rdp" ? "Administrator" : "root",
    ip: entry.item.server_ip || null,
    password: null,
    message: "Test mode — credentials are only available once a live server is provisioned.",
  });
}

const listVps = (req, res) => listServers(req, res, "vps");
const getVps = (req, res) => getServer(req, res, "vps");
const vpsAction = (req, res) => serverAction(req, res, "vps");
const deleteVps = (req, res) => deleteServer(req, res, "vps");
const getVpsCredentials = (req, res) => getServerCredentials(req, res, "vps");

const listRdp = (req, res) => listServers(req, res, "rdp");
const getRdp = (req, res) => getServer(req, res, "rdp");
const rdpAction = (req, res) => serverAction(req, res, "rdp");
const deleteRdp = (req, res) => deleteServer(req, res, "rdp");
const getRdpCredentials = (req, res) => getServerCredentials(req, res, "rdp");

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

// List only the signed-in buyer's registered domains (from their orders).
async function listDomains(req, res) {
  try {
    const entries = await ownership.ownedList(userId(req), "domain");
    const domains = entries.map((e) => ({
      domain: e.item.domain,
      registrar: e.item.registrar || null,
      ns_choice: e.item.ns_choice || null,
      nameservers: e.item.nameservers || [],
      status: e.item.status === "test_mode" ? "test_mode" : e.item.status || "active",
      mode: e.mode,
      created_at: e.createdAt,
      order_id: e.order_id,
    }));
    return res.json({ domains, count: domains.length });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, error: "internal_error", message: err.message });
  }
}
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

// List only the signed-in buyer's hosting accounts (from their orders).
async function listHosting(req, res) {
  try {
    const entries = await ownership.ownedList(userId(req), "hosting");
    let panel_url = null;
    let server_ip = null;
    for (const e of entries) {
      if (!panel_url && e.item.panel_url) panel_url = e.item.panel_url;
      if (!server_ip && e.item.server_ip) server_ip = e.item.server_ip;
    }
    const accounts = entries.map((e) => ({
      username: e.ref,
      domain: e.item.domain || null,
      plan: e.item.plan_name || e.item.plan_id || null,
      plan_id: e.item.plan_id || null,
      suspended: false,
      status: e.item.status === "test_mode" ? "test_mode" : e.item.status || "active",
      mode: e.mode,
      created_at: e.createdAt,
    }));
    return res.json({ panel_url, server_ip, accounts, count: accounts.length });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, error: "internal_error", message: err.message });
  }
}

// Resolve the owned hosting account or reject; then run `fn(providerUsername)`
// in live mode, or return the supplied test-mode payload in dry_run.
async function withOwnedHosting(req, res, liveFn, dryResult) {
  const entry = await ownership.findOwnedHosting(userId(req), req.params.user);
  if (!entry) return forbidden(res, "hosting account");
  if (entry.item.provider_username) {
    return liveFn(entry.item.provider_username);
  }
  return res.json(typeof dryResult === "function" ? dryResult(entry) : dryResult);
}

const suspendHosting = (req, res) =>
  withOwnedHosting(
    req,
    res,
    (u) => forward(res, nomadly.post(`/hosting/${enc(u)}/suspend`, req.body || {})),
    { mode: "dry_run", status: "test_mode", message: "Test mode — nothing was provisioned upstream to suspend." }
  );
const unsuspendHosting = (req, res) =>
  withOwnedHosting(
    req,
    res,
    (u) => forward(res, nomadly.post(`/hosting/${enc(u)}/unsuspend`, req.body || {})),
    { mode: "dry_run", status: "test_mode", message: "Test mode — nothing was provisioned upstream to unsuspend." }
  );
const terminateHosting = (req, res) =>
  withOwnedHosting(
    req,
    res,
    (u) => forward(res, nomadly.delete(`/hosting/${enc(u)}`)),
    { mode: "dry_run", status: "test_mode", message: "Test mode — nothing was provisioned upstream to terminate." }
  );
const hostingLogin = (req, res) =>
  withOwnedHosting(
    req,
    res,
    (u) => forward(res, nomadly.get(`/hosting/${enc(u)}/login`)),
    { mode: "dry_run", note: "One-click login is only available once a live account is provisioned." }
  );
// Reveal cPanel account credentials (surfaced in the live hosting list as credentials_url).
const hostingCredentials = (req, res) =>
  withOwnedHosting(
    req,
    res,
    (u) => forward(res, nomadly.get(`/hosting/${enc(u)}/credentials`)),
    (entry) => ({
      mode: "dry_run",
      username: entry.ref,
      panel_url: entry.item.panel_url || null,
      server_ip: entry.item.server_ip || null,
      password: null,
      message: "Test mode — credentials are only available once a live account is provisioned.",
    })
  );

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
