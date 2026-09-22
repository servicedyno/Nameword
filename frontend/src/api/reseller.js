import apiClient from './client';

// Client for the Nomadly Reseller API, proxied through our backend at /reseller.
// The reseller secret key lives on the server — never in the browser.
const R = '/reseller';

export const resellerAPI = {
  getHealth: async () => (await apiClient.get(`${R}/health`)).data,
  getAccount: async () => (await apiClient.get(`${R}/account`)).data,

  // VPS (Linux)
  getVpsPlans: async (region = 'EU') =>
    (await apiClient.get(`${R}/vps/plans`, { params: { region } })).data,
  createVps: async (payload) => (await apiClient.post(`${R}/vps`, payload)).data,
  listVps: async () => (await apiClient.get(`${R}/vps`)).data,
  getVps: async (id) => (await apiClient.get(`${R}/vps/${id}`)).data,
  vpsAction: async (id, action) =>
    (await apiClient.post(`${R}/vps/${id}/action`, { action })).data,
  deleteVps: async (id) => (await apiClient.delete(`${R}/vps/${id}`)).data,
  getVpsCredentials: async (id) =>
    (await apiClient.get(`${R}/vps/${id}/credentials`)).data,

  // RDP (Windows)
  getRdpPlans: async (region = 'EU') =>
    (await apiClient.get(`${R}/rdp/plans`, { params: { region } })).data,
  createRdp: async (payload) => (await apiClient.post(`${R}/rdp`, payload)).data,
  listRdp: async () => (await apiClient.get(`${R}/rdp`)).data,
  getRdp: async (id) => (await apiClient.get(`${R}/rdp/${id}`)).data,
  rdpAction: async (id, action) =>
    (await apiClient.post(`${R}/rdp/${id}/action`, { action })).data,
  deleteRdp: async (id) => (await apiClient.delete(`${R}/rdp/${id}`)).data,
  getRdpCredentials: async (id) =>
    (await apiClient.get(`${R}/rdp/${id}/credentials`)).data,

  // Domains
  searchDomain: async (domain) =>
    (await apiClient.get(`${R}/domains/search`, { params: { domain } })).data,
  suggestDomains: async (domain) =>
    (await apiClient.get(`${R}/domains/suggest`, { params: { domain } })).data,
  listDomains: async () => (await apiClient.get(`${R}/domains`)).data,
  registerDomain: async (payload) =>
    (await apiClient.post(`${R}/domains/register`, payload)).data,

  // DNS (free)
  listDns: async (domain) =>
    (await apiClient.get(`${R}/dns/${encodeURIComponent(domain)}/records`)).data,
  addDns: async (domain, record) =>
    (await apiClient.post(`${R}/dns/${encodeURIComponent(domain)}/records`, record)).data,
  updateDns: async (domain, record) =>
    (await apiClient.put(`${R}/dns/${encodeURIComponent(domain)}/records`, { record })).data,
  deleteDns: async (domain, record) =>
    (await apiClient.delete(`${R}/dns/${encodeURIComponent(domain)}/records`, { data: { record } })).data,
  setNameservers: async (domain, nameservers) =>
    (await apiClient.put(`${R}/dns/${encodeURIComponent(domain)}/nameservers`, { nameservers })).data,
  resetNameservers: async (domain) =>
    (await apiClient.put(`${R}/dns/${encodeURIComponent(domain)}/nameservers`, { mode: "default" })).data,

  // cPanel Hosting
  getHostingPlans: async () => (await apiClient.get(`${R}/hosting/plans`)).data,
  createHosting: async (payload) => (await apiClient.post(`${R}/hosting`, payload)).data,
  listHosting: async () => (await apiClient.get(`${R}/hosting`)).data,
  suspendHosting: async (user, reason) =>
    (await apiClient.post(`${R}/hosting/${encodeURIComponent(user)}/suspend`, reason ? { reason } : {})).data,
  unsuspendHosting: async (user) =>
    (await apiClient.post(`${R}/hosting/${encodeURIComponent(user)}/unsuspend`, {})).data,
  terminateHosting: async (user) =>
    (await apiClient.delete(`${R}/hosting/${encodeURIComponent(user)}`)).data,
  hostingLogin: async (user) =>
    (await apiClient.get(`${R}/hosting/${encodeURIComponent(user)}/login`)).data,
  getHostingCredentials: async (user) =>
    (await apiClient.get(`${R}/hosting/${encodeURIComponent(user)}/credentials`)).data,
  // cPanel Hosting management (4d)
  getHostingDetails: async (user) =>
    (await apiClient.get(`${R}/hosting/${encodeURIComponent(user)}`, { params: { usage: true } })).data,
  upgradeHosting: async (user, plan_id) =>
    (await apiClient.post(`${R}/hosting/${encodeURIComponent(user)}/upgrade`, { plan_id })).data,
  listHostingAddons: async (user) =>
    (await apiClient.get(`${R}/hosting/${encodeURIComponent(user)}/addons`)).data,
  addHostingAddon: async (user, domain) =>
    (await apiClient.post(`${R}/hosting/${encodeURIComponent(user)}/addons`, { domain })).data,
  getHostingCaptcha: async (domain) =>
    (await apiClient.get(`${R}/hosting/captcha/${encodeURIComponent(domain)}`)).data,
  setHostingCaptcha: async (domain, enabled) =>
    (await apiClient.post(`${R}/hosting/captcha/${encodeURIComponent(domain)}`, { enabled })).data,

  // Unified upcoming-expiry list, scoped to the signed-in buyer (Module 12).
  getRenewals: async (days = 30) =>
    (await apiClient.get(`${R}/renewals`, { params: { days } })).data,

  // ---- cPanel FULL-PANEL MANAGEMENT (Modules 2-11) ----
  // All routes are ownership-scoped server-side; `u` is the account username.
  hostingManage: {
    // MySQL
    mysqlDatabases: async (u) => (await apiClient.get(`${R}/hosting/${encodeURIComponent(u)}/mysql/databases`)).data,
    createMysqlDatabase: async (u, name) => (await apiClient.post(`${R}/hosting/${encodeURIComponent(u)}/mysql/databases`, { name })).data,
    deleteMysqlDatabase: async (u, name) => (await apiClient.delete(`${R}/hosting/${encodeURIComponent(u)}/mysql/databases`, { params: { name }, data: { name } })).data,
    mysqlUsers: async (u) => (await apiClient.get(`${R}/hosting/${encodeURIComponent(u)}/mysql/users`)).data,
    createMysqlUser: async (u, name, password) => (await apiClient.post(`${R}/hosting/${encodeURIComponent(u)}/mysql/users`, { name, password })).data,
    deleteMysqlUser: async (u, name) => (await apiClient.delete(`${R}/hosting/${encodeURIComponent(u)}/mysql/users`, { params: { name }, data: { name } })).data,
    setMysqlUserPassword: async (u, user, password) => (await apiClient.put(`${R}/hosting/${encodeURIComponent(u)}/mysql/users/password`, { user, password })).data,
    grantMysqlPrivileges: async (u, user, database, privileges) => (await apiClient.post(`${R}/hosting/${encodeURIComponent(u)}/mysql/privileges/grant`, { user, database, privileges })).data,
    revokeMysqlPrivileges: async (u, user, database) => (await apiClient.post(`${R}/hosting/${encodeURIComponent(u)}/mysql/privileges/revoke`, { user, database })).data,
    mysqlRemoteHosts: async (u) => (await apiClient.get(`${R}/hosting/${encodeURIComponent(u)}/mysql/remote-hosts`)).data,
    addMysqlRemoteHost: async (u, host) => (await apiClient.post(`${R}/hosting/${encodeURIComponent(u)}/mysql/remote-hosts`, { host })).data,
    deleteMysqlRemoteHost: async (u, host) => (await apiClient.delete(`${R}/hosting/${encodeURIComponent(u)}/mysql/remote-hosts`, { params: { host }, data: { host } })).data,
    phpMyAdmin: async (u) => (await apiClient.get(`${R}/hosting/${encodeURIComponent(u)}/mysql/phpmyadmin`)).data,

    // Subdomains
    subdomains: async (u) => (await apiClient.get(`${R}/hosting/${encodeURIComponent(u)}/subdomains`)).data,
    createSubdomain: async (u, payload) => (await apiClient.post(`${R}/hosting/${encodeURIComponent(u)}/subdomains`, payload)).data,
    deleteSubdomain: async (u, subdomain) => (await apiClient.delete(`${R}/hosting/${encodeURIComponent(u)}/subdomains`, { params: { subdomain }, data: { subdomain } })).data,
    bulkCreateSubdomains: async (u, subdomains, rootdomain) => (await apiClient.post(`${R}/hosting/${encodeURIComponent(u)}/subdomains/bulk-create`, { subdomains, rootdomain })).data,

    // Domains on the account
    domains: async (u) => (await apiClient.get(`${R}/hosting/${encodeURIComponent(u)}/domains`)).data,
    setDocroot: async (u, payload) => (await apiClient.post(`${R}/hosting/${encodeURIComponent(u)}/domains/docroot`, payload)).data,
    deleteAddonDomain: async (u, domain) => (await apiClient.delete(`${R}/hosting/${encodeURIComponent(u)}/domains/addon`, { params: { domain }, data: { domain } })).data,
    docrootModes: async (u) => (await apiClient.get(`${R}/hosting/${encodeURIComponent(u)}/domains/docroot-modes`)).data,
    setDocrootMode: async (u, domain, mode) => (await apiClient.post(`${R}/hosting/${encodeURIComponent(u)}/domains/docroot-mode`, { domain, mode })).data,
    setPrimaryDomain: async (u, domain) => (await apiClient.post(`${R}/hosting/${encodeURIComponent(u)}/domains/set-primary`, { domain })).data,
    nsStatus: async (u, domain) => (await apiClient.get(`${R}/hosting/${encodeURIComponent(u)}/domains/ns-status`, { params: { domain } })).data,

    // SSL
    ssl: async (u) => (await apiClient.get(`${R}/hosting/${encodeURIComponent(u)}/ssl`)).data,
    autossl: async (u) => (await apiClient.post(`${R}/hosting/${encodeURIComponent(u)}/ssl/autossl`, {})).data,

    // Stats
    stats: async (u) => (await apiClient.get(`${R}/hosting/${encodeURIComponent(u)}/stats`)).data,

    // File Manager
    files: async (u, dir = '/public_html') => (await apiClient.get(`${R}/hosting/${encodeURIComponent(u)}/files`, { params: { dir } })).data,
    fileContent: async (u, dir, file) => (await apiClient.get(`${R}/hosting/${encodeURIComponent(u)}/files/content`, { params: { dir, file } })).data,
    saveFile: async (u, dir, file, content) => (await apiClient.post(`${R}/hosting/${encodeURIComponent(u)}/files/save`, { dir, file, content })).data,
    mkdir: async (u, dir, name) => (await apiClient.post(`${R}/hosting/${encodeURIComponent(u)}/files/mkdir`, { dir, name })).data,
    renameFile: async (u, dir, oldName, newName) => (await apiClient.post(`${R}/hosting/${encodeURIComponent(u)}/files/rename`, { dir, oldName, newName })).data,
    deleteFile: async (u, dir, file, isDirectory = false) => (await apiClient.delete(`${R}/hosting/${encodeURIComponent(u)}/files`, { data: { dir, file, isDirectory } })).data,
    uploadFile: async (u, dir, fileName, content_base64) => (await apiClient.post(`${R}/hosting/${encodeURIComponent(u)}/files/upload`, { dir, fileName, content_base64 })).data,
    // One-tap unzip: upload a base64 archive, extract it, and return the listing
    // in a single call. destDir defaults to dir; removeArchive deletes the archive
    // after a successful extract. Supports zip / tar / tar.gz.
    unzip: async (u, dir, fileName, content_base64, { destDir, removeArchive = true } = {}) =>
      (await apiClient.post(`${R}/hosting/${encodeURIComponent(u)}/files/unzip`, {
        dir, fileName, content_base64, ...(destDir ? { destDir } : {}), removeArchive,
      })).data,
    // Extract an archive (.zip/.tar/.gz) into destDir (defaults to the current dir upstream).
    extractFile: async (u, dir, file, destDir) => (await apiClient.post(`${R}/hosting/${encodeURIComponent(u)}/files/extract`, destDir ? { dir, file, destDir } : { dir, file })).data,
    // Zip a selection of files/folders in `dir` into destFile.
    compressFiles: async (u, dir, files, destFile) => (await apiClient.post(`${R}/hosting/${encodeURIComponent(u)}/files/compress`, { dir, files, destFile })).data,
    copyFile: async (u, sourceDir, fileName, destDir) => (await apiClient.post(`${R}/hosting/${encodeURIComponent(u)}/files/copy`, { sourceDir, fileName, destDir })).data,
    moveFile: async (u, sourceDir, fileName, destDir) => (await apiClient.post(`${R}/hosting/${encodeURIComponent(u)}/files/move`, { sourceDir, fileName, destDir })).data,
    // Large-file upload: send base64 chunks sharing one uploadId; the provider
    // assembles once the final chunk arrives.
    uploadChunk: async (u, payload) => (await apiClient.post(`${R}/hosting/${encodeURIComponent(u)}/files/upload-chunk`, payload)).data,
    cancelUploadChunk: async (u, uploadId) => (await apiClient.post(`${R}/hosting/${encodeURIComponent(u)}/files/upload-chunk/cancel`, { uploadId })).data,

    // Security / Anti-Red / Cloudflare
    securityStatus: async (u) => (await apiClient.get(`${R}/hosting/${encodeURIComponent(u)}/security/status`)).data,
    deployAntiRed: async (u) => (await apiClient.post(`${R}/hosting/${encodeURIComponent(u)}/security/anti-red/deploy`, {})).data,
    antiRedStatus: async (u) => (await apiClient.get(`${R}/hosting/${encodeURIComponent(u)}/security/anti-red/status`)).data,
    setAntiBot: async (u, profile) => (await apiClient.post(`${R}/hosting/${encodeURIComponent(u)}/security/anti-bot`, { profile })).data,
    safeBrowsing: async (u) => (await apiClient.get(`${R}/hosting/${encodeURIComponent(u)}/security/safe-browsing`)).data,
    blacklist: async (u) => (await apiClient.get(`${R}/hosting/${encodeURIComponent(u)}/security/blacklist`)).data,
    jsChallenge: async (u) => (await apiClient.get(`${R}/hosting/${encodeURIComponent(u)}/security/js-challenge`)).data,
    setJsChallenge: async (u, enabled) => (await apiClient.post(`${R}/hosting/${encodeURIComponent(u)}/security/js-challenge`, { enabled })).data,
    visitorCaptcha: async (u) => (await apiClient.get(`${R}/hosting/${encodeURIComponent(u)}/security/visitor-captcha`)).data,
    setVisitorCaptcha: async (u, enabled, domain) => (await apiClient.post(`${R}/hosting/${encodeURIComponent(u)}/security/visitor-captcha`, { enabled, domain })).data,

    // Geo firewall (Gold)
    geo: async (u) => (await apiClient.get(`${R}/hosting/${encodeURIComponent(u)}/geo`)).data,
    addGeoRule: async (u, payload) => (await apiClient.post(`${R}/hosting/${encodeURIComponent(u)}/geo`, payload)).data,
    deleteGeoRule: async (u, ruleId) => (await apiClient.delete(`${R}/hosting/${encodeURIComponent(u)}/geo`, { params: { ruleId }, data: { ruleId } })).data,

    // Analytics
    analytics: async (u, days = 7) => (await apiClient.get(`${R}/hosting/${encodeURIComponent(u)}/analytics`, { params: { days } })).data,

    // Site status
    siteStatus: async (u) => (await apiClient.get(`${R}/hosting/${encodeURIComponent(u)}/account/site-status`)).data,
    setSiteStatus: async (u, action, mode) => (await apiClient.post(`${R}/hosting/${encodeURIComponent(u)}/account/site-status`, { action, mode })).data,
  },
};

// Product-scoped facade so a single component can drive both VPS and RDP.
export const resellerProduct = (product) => {
  const isRdp = product === 'rdp';
  return {
    getPlans: (region) =>
      isRdp ? resellerAPI.getRdpPlans(region) : resellerAPI.getVpsPlans(region),
    create: (payload) =>
      isRdp ? resellerAPI.createRdp(payload) : resellerAPI.createVps(payload),
    list: () => (isRdp ? resellerAPI.listRdp() : resellerAPI.listVps()),
    get: (id) => (isRdp ? resellerAPI.getRdp(id) : resellerAPI.getVps(id)),
    action: (id, action) =>
      isRdp ? resellerAPI.rdpAction(id, action) : resellerAPI.vpsAction(id, action),
    remove: (id) => (isRdp ? resellerAPI.deleteRdp(id) : resellerAPI.deleteVps(id)),
    credentials: (id) =>
      isRdp ? resellerAPI.getRdpCredentials(id) : resellerAPI.getVpsCredentials(id),
  };
};

export default resellerAPI;
