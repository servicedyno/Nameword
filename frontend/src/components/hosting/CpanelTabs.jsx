import React, { useCallback, useEffect, useState } from "react";
import resellerAPI from "../../api/reseller";
import { useAlert } from "../../context/AlertContext";
import {
  FiDatabase,
  FiGlobe,
  FiLock,
  FiFolder,
  FiFile,
  FiShield,
  FiMapPin,
  FiBarChart2,
  FiPower,
  FiRefreshCw,
  FiTrash2,
  FiPlus,
  FiExternalLink,
  FiChevronRight,
  FiAlertTriangle,
  FiEdit2,
  FiSave,
  FiX,
} from "react-icons/fi";

const M = resellerAPI.hostingManage;

const isTest = (d) => !!(d && (d.test_mode || d.mode === "dry_run"));

const TestBanner = ({ data, feature }) =>
  isTest(data) ? (
    <div className="flex items-start gap-2 rounded-lg border border-amber-400/40 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-amber-800 dark:text-amber-200 mb-3">
      <FiAlertTriangle className="mt-0.5 shrink-0" size={15} />
      <span className="text-xs">
        {data?.note ||
          `Test mode — ${feature || "this feature"} shows live data and applies changes once your account is provisioned.`}
      </span>
    </div>
  ) : null;

const Loading = () => (
  <p className="text-secondary dark:text-gray-400 flex items-center gap-2 text-sm py-4">
    <FiRefreshCw className="animate-spin" size={15} /> Loading…
  </p>
);

const Empty = ({ children }) => (
  <p className="text-xs text-secondary dark:text-gray-400 py-3">{children}</p>
);

const SectionTitle = ({ icon: Icon, children }) => (
  <p className="font-medium text-primary dark:text-white mb-2 flex items-center gap-1.5">
    {Icon && <Icon size={15} />} {children}
  </p>
);

// Shared hook: load a resource when the tab mounts.
function useLoad(loader, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await loader());
    } catch (e) {
      setData({ _error: e?.response?.data?.message || "Could not load." });
    } finally {
      setLoading(false);
    }
  }, deps);
  useEffect(() => {
    reload();
  }, [reload]);
  return { data, loading, reload, setData };
}

// Shared action runner with test-mode-aware toast.
function useRunner() {
  const { showAlert } = useAlert();
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async (fn, okMsg) => {
      setBusy(true);
      try {
        const res = await fn();
        if (isTest(res)) {
          showAlert(res.note || "Test mode — applies once your account is live.", { type: "success" });
        } else {
          showAlert(okMsg || "Done.", { type: "success" });
        }
        return res;
      } catch (e) {
        showAlert(e?.response?.data?.message || "Action failed.", { type: "fail" });
        return null;
      } finally {
        setBusy(false);
      }
    },
    [showAlert]
  );
  return { run, busy };
}

/* ------------------------------- MySQL ------------------------------- */
const MysqlTab = ({ user }) => {
  const dbs = useLoad(() => M.mysqlDatabases(user), [user]);
  const users = useLoad(() => M.mysqlUsers(user), [user]);
  const { run, busy } = useRunner();
  const [dbName, setDbName] = useState("");
  const [uName, setUName] = useState("");
  const [uPass, setUPass] = useState("");

  const dbList = Array.isArray(dbs.data?.data) ? dbs.data.data : [];
  const userList = Array.isArray(users.data?.data) ? users.data.data : [];

  const openPhpMyAdmin = async () => {
    const res = await run(() => M.phpMyAdmin(user), "Opening phpMyAdmin…");
    if (res?.url) window.open(res.url, "_blank", "noopener");
  };

  return (
    <div className="space-y-5" data-testid="cpanel-tab-mysql">
      <TestBanner data={dbs.data} feature="MySQL" />
      <div>
        <div className="flex items-center justify-between mb-2">
          <SectionTitle icon={FiDatabase}>Databases</SectionTitle>
          <button onClick={openPhpMyAdmin} disabled={busy} className="text-xs text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1 disabled:opacity-50">
            <FiExternalLink size={12} /> phpMyAdmin
          </button>
        </div>
        {dbs.loading ? <Loading /> : dbList.length ? (
          <ul className="space-y-1 mb-2">
            {dbList.map((d, i) => {
              const name = d.database || d.name || d;
              return (
                <li key={i} className="flex items-center justify-between text-secondary dark:text-gray-300 text-sm">
                  <span className="inline-flex items-center gap-2"><FiDatabase size={13} /> {name}</span>
                  <button onClick={async () => { await run(() => M.deleteMysqlDatabase(user, name), "Database deleted."); dbs.reload(); }} disabled={busy} className="text-red-500 hover:text-red-600 disabled:opacity-50" aria-label="Delete database"><FiTrash2 size={14} /></button>
                </li>
              );
            })}
          </ul>
        ) : <Empty>No databases yet.</Empty>}
        <div className="flex items-center gap-2">
          <input value={dbName} onChange={(e) => setDbName(e.target.value)} placeholder="db name (e.g. wp)" className="nw-input !py-2 !px-3 text-sm flex-1" data-testid="mysql-db-input" />
          <button onClick={async () => { if (!dbName.trim()) return; await run(() => M.createMysqlDatabase(user, dbName.trim()), "Database created."); setDbName(""); dbs.reload(); }} disabled={busy || !dbName.trim()} className="nw-btn-secondary nw-btn-sm disabled:opacity-50 inline-flex items-center gap-1"><FiPlus size={13} /> Create</button>
        </div>
      </div>

      <div className="border-t border-lightgray dark:border-gray-800 pt-4">
        <SectionTitle icon={FiLock}>Database users</SectionTitle>
        {users.loading ? <Loading /> : userList.length ? (
          <ul className="space-y-1 mb-2">
            {userList.map((u, i) => {
              const name = typeof u === "string" ? u : u.user || u.name;
              return (
                <li key={i} className="flex items-center justify-between text-secondary dark:text-gray-300 text-sm">
                  <span className="inline-flex items-center gap-2"><FiLock size={13} /> {name}</span>
                  <button onClick={async () => { await run(() => M.deleteMysqlUser(user, name), "User deleted."); users.reload(); }} disabled={busy} className="text-red-500 hover:text-red-600 disabled:opacity-50" aria-label="Delete user"><FiTrash2 size={14} /></button>
                </li>
              );
            })}
          </ul>
        ) : <Empty>No database users yet.</Empty>}
        <div className="flex items-center gap-2">
          <input value={uName} onChange={(e) => setUName(e.target.value)} placeholder="user" className="nw-input !py-2 !px-3 text-sm flex-1" data-testid="mysql-user-input" />
          <input value={uPass} onChange={(e) => setUPass(e.target.value)} placeholder="password" type="password" className="nw-input !py-2 !px-3 text-sm flex-1" />
          <button onClick={async () => { if (!uName.trim() || !uPass) return; await run(() => M.createMysqlUser(user, uName.trim(), uPass), "User created."); setUName(""); setUPass(""); users.reload(); }} disabled={busy || !uName.trim() || !uPass} className="nw-btn-secondary nw-btn-sm disabled:opacity-50 inline-flex items-center gap-1"><FiPlus size={13} /> Add</button>
        </div>
      </div>
    </div>
  );
};

/* ----------------------------- Subdomains ---------------------------- */
const SubdomainsTab = ({ user }) => {
  const { data, loading, reload } = useLoad(() => M.subdomains(user), [user]);
  const { run, busy } = useRunner();
  const [sub, setSub] = useState("");
  const list = Array.isArray(data?.data) ? data.data : [];
  return (
    <div className="space-y-3" data-testid="cpanel-tab-subdomains">
      <TestBanner data={data} feature="Subdomains" />
      <SectionTitle icon={FiGlobe}>Subdomains</SectionTitle>
      {loading ? <Loading /> : list.length ? (
        <ul className="space-y-1 mb-2">
          {list.map((s, i) => {
            const full = s.fullDomain || s.domain || s;
            const del = s.fullDomain || (s.domain ? `${s.domain}` : full);
            return (
              <li key={i} className="flex items-center justify-between text-secondary dark:text-gray-300 text-sm">
                <span className="inline-flex items-center gap-2"><FiGlobe size={13} /> {full}</span>
                <button onClick={async () => { await run(() => M.deleteSubdomain(user, del), "Subdomain deleted."); reload(); }} disabled={busy} className="text-red-500 hover:text-red-600 disabled:opacity-50" aria-label="Delete subdomain"><FiTrash2 size={14} /></button>
              </li>
            );
          })}
        </ul>
      ) : <Empty>No subdomains yet.</Empty>}
      <div className="flex items-center gap-2">
        <input value={sub} onChange={(e) => setSub(e.target.value)} placeholder="shop" className="nw-input !py-2 !px-3 text-sm flex-1" data-testid="subdomain-input" />
        <button onClick={async () => { if (!sub.trim()) return; await run(() => M.createSubdomain(user, { subdomain: sub.trim() }), "Subdomain created."); setSub(""); reload(); }} disabled={busy || !sub.trim()} className="nw-btn-secondary nw-btn-sm disabled:opacity-50 inline-flex items-center gap-1"><FiPlus size={13} /> Create</button>
      </div>
    </div>
  );
};

/* ------------------------------ Domains ------------------------------ */
const DomainsTab = ({ user, domain }) => {
  const { data, loading, reload } = useLoad(() => M.domains(user), [user]);
  const { run, busy } = useRunner();
  const d = data?.data || {};
  const main = d.main_domain || domain;
  const addons = Array.isArray(d.addon_domains) ? d.addon_domains : [];
  const subs = Array.isArray(d.sub_domains) ? d.sub_domains : [];
  return (
    <div className="space-y-3" data-testid="cpanel-tab-domains">
      <TestBanner data={data} feature="Domains" />
      <SectionTitle icon={FiGlobe}>Domains on this account</SectionTitle>
      {loading ? <Loading /> : (
        <div className="space-y-3 text-sm">
          <div>
            <p className="text-xs text-secondary dark:text-gray-400 mb-1">Primary</p>
            <p className="text-primary dark:text-white inline-flex items-center gap-2"><FiGlobe size={13} /> {main || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-secondary dark:text-gray-400 mb-1">Addon domains</p>
            {addons.length ? (
              <ul className="space-y-1">
                {addons.map((a, i) => {
                  const name = a.domain || a;
                  return (
                    <li key={i} className="flex items-center justify-between text-secondary dark:text-gray-300">
                      <span className="inline-flex items-center gap-2"><FiGlobe size={13} /> {name}</span>
                      <span className="flex items-center gap-3">
                        <button onClick={async () => { await run(() => M.setPrimaryDomain(user, name), "Primary domain updated."); reload(); }} disabled={busy} className="text-xs text-brand-600 dark:text-brand-400 hover:underline disabled:opacity-50">Make primary</button>
                        <button onClick={async () => { await run(() => M.deleteAddonDomain(user, name), "Addon domain removed."); reload(); }} disabled={busy} className="text-red-500 hover:text-red-600 disabled:opacity-50" aria-label="Remove addon"><FiTrash2 size={14} /></button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : <Empty>No addon domains.</Empty>}
          </div>
          <div>
            <p className="text-xs text-secondary dark:text-gray-400 mb-1">Subdomains</p>
            {subs.length ? (
              <ul className="space-y-1">
                {subs.map((s, i) => (
                  <li key={i} className="text-secondary dark:text-gray-300 inline-flex items-center gap-2"><FiChevronRight size={13} /> {s.fullDomain || s.domain || s}</li>
                ))}
              </ul>
            ) : <Empty>No subdomains.</Empty>}
          </div>
        </div>
      )}
    </div>
  );
};

/* -------------------------------- SSL -------------------------------- */
const SslTab = ({ user }) => {
  const { data, loading, reload } = useLoad(() => M.ssl(user), [user]);
  const { run, busy } = useRunner();
  const list = Array.isArray(data?.data) ? data.data : [];
  return (
    <div className="space-y-3" data-testid="cpanel-tab-ssl">
      <TestBanner data={data} feature="SSL" />
      <div className="flex items-center justify-between">
        <SectionTitle icon={FiLock}>SSL certificates</SectionTitle>
        <button onClick={async () => { await run(() => M.autossl(user), "AutoSSL started."); reload(); }} disabled={busy} className="nw-btn-secondary nw-btn-sm disabled:opacity-50 inline-flex items-center gap-1" data-testid="ssl-autossl-btn"><FiRefreshCw size={13} /> Run AutoSSL</button>
      </div>
      {loading ? <Loading /> : list.length ? (
        <ul className="space-y-2">
          {list.map((c, i) => {
            const na = c.certificate?.not_after;
            const exp = na ? new Date(na * 1000).toLocaleDateString() : "—";
            return (
              <li key={i} className="flex items-center justify-between text-sm text-secondary dark:text-gray-300 border border-line dark:border-gray-800 rounded-lg px-3 py-2">
                <span className="inline-flex items-center gap-2"><FiLock size={13} /> {c.servername || c.host || "—"}</span>
                <span className="text-xs">expires {exp}</span>
              </li>
            );
          })}
        </ul>
      ) : <Empty>No certificates found yet. Run AutoSSL to (re)issue.</Empty>}
    </div>
  );
};

/* ---------------------------- File Manager --------------------------- */
const TEXT_EDITABLE = /\.(txt|md|html?|htm|css|scss|less|js|mjs|cjs|jsx|ts|tsx|json|xml|ya?ml|env|ini|conf|cfg|htaccess|log|php|py|rb|sh|bash|sql|csv|tsv|svg|vue|toml|gitignore)$/i;
const isEditable = (name) => TEXT_EDITABLE.test(name) || !/\.[a-z0-9]+$/i.test(name); // known text ext or no ext

const FilesTab = ({ user }) => {
  const [dir, setDir] = useState("/public_html");
  const { data, loading, reload } = useLoad(() => M.files(user, dir), [user, dir]);
  const { run, busy } = useRunner();
  const { showAlert } = useAlert();
  const [newFolder, setNewFolder] = useState("");
  // Inline editor: { file, content, original, loading, test }
  const [editor, setEditor] = useState(null);
  const list = Array.isArray(data?.data) ? data.data : [];
  const goUp = () => {
    if (dir === "/" || !dir.includes("/")) return;
    const parts = dir.replace(/\/+$/, "").split("/");
    parts.pop();
    setDir(parts.join("/") || "/");
  };

  const openFile = async (name) => {
    setEditor({ file: name, content: "", original: "", loading: true, test: false });
    try {
      const res = await M.fileContent(user, dir, name);
      const content =
        typeof res?.data?.content === "string" ? res.data.content
        : typeof res?.content === "string" ? res.content
        : typeof res?.data === "string" ? res.data
        : "";
      setEditor({ file: name, content, original: content, loading: false, test: isTest(res) });
    } catch (e) {
      showAlert(e?.response?.data?.message || "Could not open file.", { type: "fail" });
      setEditor(null);
    }
  };

  const saveFile = async () => {
    if (!editor) return;
    const res = await run(() => M.saveFile(user, dir, editor.file, editor.content), "File saved.");
    if (res) setEditor((e) => (e ? { ...e, original: e.content } : e));
  };

  const dirty = editor && editor.content !== editor.original;

  return (
    <div className="space-y-3" data-testid="cpanel-tab-files">
      <TestBanner data={data} feature="File Manager" />
      <div className="flex items-center gap-2 text-sm">
        <FiFolder size={15} className="text-secondary dark:text-gray-400" />
        <input value={dir} onChange={(e) => setDir(e.target.value)} className="nw-input !py-2 !px-3 text-sm flex-1" data-testid="files-dir-input" />
        <button onClick={goUp} className="nw-btn-secondary nw-btn-sm">Up</button>
        <button onClick={reload} disabled={busy} className="nw-btn-secondary nw-btn-sm disabled:opacity-50"><FiRefreshCw size={13} /></button>
      </div>
      {loading ? <Loading /> : list.length ? (
        <ul className="space-y-1 max-h-56 overflow-y-auto">
          {list.map((f, i) => {
            const name = f.file || f.name || String(f);
            const isDir = f.type === "dir" || f.type === "directory" || f.isDirectory;
            const canEdit = !isDir && isEditable(name);
            return (
              <li key={i} className="flex items-center justify-between text-sm text-secondary dark:text-gray-300">
                <button
                  className={`inline-flex items-center gap-2 min-w-0 text-left ${isDir || canEdit ? "hover:text-primary dark:hover:text-white" : "cursor-default"}`}
                  onClick={() => {
                    if (isDir) setDir(`${dir.replace(/\/+$/, "")}/${name}`);
                    else if (canEdit) openFile(name);
                  }}
                  title={isDir ? "Open folder" : canEdit ? "Open & edit" : "Not editable here"}
                  data-testid={isDir ? `files-dir-${name}` : `files-file-${name}`}
                >
                  {isDir ? <FiFolder size={13} className="shrink-0" /> : <FiFile size={13} className="shrink-0" />}
                  <span className="truncate">{name}</span>
                  {!isDir && f.size != null && <span className="text-xs text-secondary/70 shrink-0">({Math.round(f.size / 1024)} KB)</span>}
                </button>
                <span className="flex items-center gap-3 shrink-0">
                  {canEdit && (
                    <button onClick={() => openFile(name)} disabled={busy} className="text-brand-600 dark:text-brand-400 hover:opacity-80 disabled:opacity-50" aria-label={`Edit ${name}`} data-testid={`files-edit-${name}`}><FiEdit2 size={14} /></button>
                  )}
                  <button onClick={async () => { await run(() => M.deleteFile(user, dir, name, isDir), "Deleted."); if (editor?.file === name) setEditor(null); reload(); }} disabled={busy} className="text-red-500 hover:text-red-600 disabled:opacity-50" aria-label="Delete"><FiTrash2 size={14} /></button>
                </span>
              </li>
            );
          })}
        </ul>
      ) : <Empty>Empty folder.</Empty>}

      {editor && (
        <div className="rounded-xl border border-line dark:border-gray-800 overflow-hidden" data-testid="file-editor">
          <div className="flex items-center justify-between px-3 py-2 bg-lightgray/60 dark:bg-gray-800/60">
            <span className="text-sm font-medium text-primary dark:text-white inline-flex items-center gap-2 min-w-0">
              <FiFile size={13} className="shrink-0" />
              <span className="truncate">{editor.file}</span>
              {dirty && <span className="text-[10px] uppercase tracking-wide text-amber-600 dark:text-amber-400">unsaved</span>}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={saveFile} disabled={busy || editor.loading || !dirty} className="nw-btn-primary nw-btn-sm disabled:opacity-50 inline-flex items-center gap-1" data-testid="file-editor-save"><FiSave size={13} /> Save</button>
              <button onClick={() => setEditor(null)} disabled={busy} className="nw-btn-secondary nw-btn-sm disabled:opacity-50 inline-flex items-center gap-1" data-testid="file-editor-close"><FiX size={13} /> Close</button>
            </div>
          </div>
          {editor.test && (
            <p className="px-3 py-1.5 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10">Test mode — file contents and saves apply once your account is live.</p>
          )}
          {editor.loading ? (
            <div className="px-3"><Loading /></div>
          ) : (
            <textarea
              value={editor.content}
              onChange={(e) => setEditor((ed) => ({ ...ed, content: e.target.value }))}
              spellCheck={false}
              rows={14}
              className="w-full resize-y bg-white dark:bg-gray-900 text-primary dark:text-gray-100 font-mono text-xs leading-relaxed p-3 outline-none border-0 focus:ring-0"
              placeholder="File is empty. Start typing…"
              data-testid="file-editor-textarea"
            />
          )}
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-lightgray dark:border-gray-800 pt-3">
        <input value={newFolder} onChange={(e) => setNewFolder(e.target.value)} placeholder="new folder name" className="nw-input !py-2 !px-3 text-sm flex-1" data-testid="files-mkdir-input" />
        <button onClick={async () => { if (!newFolder.trim()) return; await run(() => M.mkdir(user, dir, newFolder.trim()), "Folder created."); setNewFolder(""); reload(); }} disabled={busy || !newFolder.trim()} className="nw-btn-secondary nw-btn-sm disabled:opacity-50 inline-flex items-center gap-1"><FiPlus size={13} /> New folder</button>
      </div>
    </div>
  );
};

/* ------------------------------ Security ----------------------------- */
const Toggle = ({ on, onClick, disabled, testId }) => (
  <button
    type="button"
    role="switch"
    aria-checked={!!on}
    disabled={disabled}
    onClick={onClick}
    data-testid={testId}
    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${on ? "bg-brand-600 dark:bg-brand-500" : "bg-gray-300 dark:bg-gray-600"}`}
  >
    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : "translate-x-0.5"}`} />
  </button>
);

const SecurityTab = ({ user, domain }) => {
  const status = useLoad(() => M.securityStatus(user), [user]);
  const js = useLoad(() => M.jsChallenge(user), [user]);
  const captcha = useLoad(() => M.visitorCaptcha(user), [user]);
  const { run, busy } = useRunner();
  const [profile, setProfile] = useState("");

  const s = status.data || {};
  const jsOn = !!(js.data?.jsChallengeEnabled ?? js.data?.enabled);
  const capOn = !!(captcha.data?.enabled ?? captcha.data?.visitor_captcha_enabled);

  return (
    <div className="space-y-4" data-testid="cpanel-tab-security">
      <TestBanner data={status.data} feature="Security" />
      {!status.loading && (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-secondary dark:text-gray-400">Safe Browsing</p>
            <p className="text-primary dark:text-white">{s.antiRed?.safeBrowsing?.safe === false ? "Flagged" : s.antiRed?.safeBrowsing?.safe ? "Clean" : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-secondary dark:text-gray-400">Blacklist</p>
            <p className="text-primary dark:text-white">{s.antiRed?.blacklist?.listed ? "Listed" : s.antiRed ? "Not listed" : "—"}</p>
          </div>
        </div>
      )}

      <div className="border-t border-lightgray dark:border-gray-800 pt-3">
        <button onClick={() => run(() => M.deployAntiRed(user), "Anti-Red protection deployed.")} disabled={busy} className="nw-btn-secondary nw-btn-sm disabled:opacity-50 inline-flex items-center gap-1.5" data-testid="security-antired-btn"><FiShield size={14} /> Deploy Anti-Red protection</button>
      </div>

      <div className="border-t border-lightgray dark:border-gray-800 pt-3">
        <SectionTitle icon={FiShield}>Cloudflare anti-bot</SectionTitle>
        <div className="flex items-center gap-2">
          <select value={profile} onChange={(e) => setProfile(e.target.value)} className="nw-input !py-2 !px-3 text-sm flex-1" data-testid="security-antibot-select">
            <option value="">Choose profile…</option>
            {["off", "low", "medium", "high", "under_attack"].map((p) => <option key={p} value={p}>{p.replace("_", " ")}</option>)}
          </select>
          <button onClick={async () => { if (!profile) return; await run(() => M.setAntiBot(user, profile), "Anti-bot profile updated."); }} disabled={busy || !profile} className="nw-btn-secondary nw-btn-sm disabled:opacity-50">Apply</button>
        </div>
      </div>

      <div className="border-t border-lightgray dark:border-gray-800 pt-3 flex items-center justify-between">
        <div>
          <p className="font-medium text-primary dark:text-white">JS challenge</p>
          <p className="text-xs text-secondary dark:text-gray-400">Human verify-your-browser gate (Gold).</p>
        </div>
        <Toggle on={jsOn} disabled={busy || js.loading} testId="security-js-toggle" onClick={async () => { await run(() => M.setJsChallenge(user, !jsOn), "JS challenge updated."); js.reload(); }} />
      </div>

      <div className="border-t border-lightgray dark:border-gray-800 pt-3 flex items-center justify-between">
        <div>
          <p className="font-medium text-primary dark:text-white">Visitor Captcha</p>
          <p className="text-xs text-secondary dark:text-gray-400">Golden Anti-Red exclusive · domain on Cloudflare.</p>
        </div>
        <Toggle on={capOn} disabled={busy || captcha.loading} testId="security-captcha-toggle" onClick={async () => { await run(() => M.setVisitorCaptcha(user, !capOn, domain), "Visitor Captcha updated."); captcha.reload(); }} />
      </div>
    </div>
  );
};

/* -------------------------------- Geo -------------------------------- */
const GeoTab = ({ user }) => {
  const { data, loading, reload } = useLoad(() => M.geo(user), [user]);
  const { run, busy } = useRunner();
  const [countries, setCountries] = useState("");
  const [mode, setMode] = useState("block");
  const rules = Array.isArray(data?.rules) ? data.rules : [];
  return (
    <div className="space-y-3" data-testid="cpanel-tab-geo">
      <TestBanner data={data} feature="Geo firewall" />
      <SectionTitle icon={FiMapPin}>Geo firewall rules</SectionTitle>
      {loading ? <Loading /> : rules.length ? (
        <ul className="space-y-1 mb-2">
          {rules.map((r, i) => (
            <li key={i} className="flex items-center justify-between text-sm text-secondary dark:text-gray-300 border border-line dark:border-gray-800 rounded-lg px-3 py-2">
              <span className="inline-flex items-center gap-2"><FiMapPin size={13} /> <span className="uppercase text-xs font-medium">{r.action}</span> <span className="text-xs">{r.expression || (Array.isArray(r.countries) ? r.countries.join(", ") : "")}</span></span>
              <button onClick={async () => { await run(() => M.deleteGeoRule(user, r.id), "Rule removed."); reload(); }} disabled={busy} className="text-red-500 hover:text-red-600 disabled:opacity-50" aria-label="Delete rule"><FiTrash2 size={14} /></button>
            </li>
          ))}
        </ul>
      ) : <Empty>No geo rules yet.</Empty>}
      <div className="flex items-center gap-2">
        <input value={countries} onChange={(e) => setCountries(e.target.value)} placeholder="CN, RU, KP" className="nw-input !py-2 !px-3 text-sm flex-1" data-testid="geo-countries-input" />
        <select value={mode} onChange={(e) => setMode(e.target.value)} className="nw-input !py-2 !px-3 text-sm">
          <option value="block">Block</option>
          <option value="allow">Allow</option>
        </select>
        <button onClick={async () => {
          const cs = countries.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean);
          if (!cs.length) return;
          await run(() => M.addGeoRule(user, { countries: cs, mode }), "Geo rule added.");
          setCountries(""); reload();
        }} disabled={busy || !countries.trim()} className="nw-btn-secondary nw-btn-sm disabled:opacity-50 inline-flex items-center gap-1"><FiPlus size={13} /> Add</button>
      </div>
    </div>
  );
};

/* ----------------------------- Analytics ----------------------------- */
const AnalyticsStat = ({ label, value }) => (
  <div className="rounded-xl border border-line dark:border-gray-800 p-4 text-center">
    <p className="text-2xl font-semibold text-primary dark:text-white">{value}</p>
    <p className="text-xs text-secondary dark:text-gray-400 mt-1">{label}</p>
  </div>
);
const AnalyticsTab = ({ user }) => {
  const [days, setDays] = useState(7);
  const { data, loading } = useLoad(() => M.analytics(user, days), [user, days]);
  const totals = data?.totals || {};
  return (
    <div className="space-y-3" data-testid="cpanel-tab-analytics">
      <TestBanner data={data} feature="Analytics" />
      <div className="flex items-center justify-between">
        <SectionTitle icon={FiBarChart2}>Traffic ({days}d)</SectionTitle>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="nw-input !py-1.5 !px-2 text-sm">
          {[1, 7, 30].map((d) => <option key={d} value={d}>{d} days</option>)}
        </select>
      </div>
      {loading ? <Loading /> : (
        <div className="grid grid-cols-3 gap-3">
          <AnalyticsStat label="Requests" value={totals.requests != null ? Number(totals.requests).toLocaleString() : "—"} />
          <AnalyticsStat label="Threats" value={totals.threats != null ? Number(totals.threats).toLocaleString() : "—"} />
          <AnalyticsStat label="Bandwidth" value={totals.bandwidth_bytes != null ? `${(Number(totals.bandwidth_bytes) / 1e6).toFixed(1)} MB` : "—"} />
        </div>
      )}
    </div>
  );
};

/* ------------------------------ Site status --------------------------- */
const SiteTab = ({ user }) => {
  const { data, loading, reload } = useLoad(() => M.siteStatus(user), [user]);
  const { run, busy } = useRunner();
  const st = data?.status || (isTest(data) ? "test mode" : "—");
  const online = String(st).toLowerCase() === "online";
  return (
    <div className="space-y-4" data-testid="cpanel-tab-site">
      <TestBanner data={data} feature="Site status" />
      <SectionTitle icon={FiPower}>Site status</SectionTitle>
      {loading ? <Loading /> : (
        <>
          <div className="flex items-center gap-2 text-sm">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${online ? "bg-emerald-500" : "bg-amber-500"}`} />
            <span className="text-primary dark:text-white capitalize">{st}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={async () => { await run(() => M.setSiteStatus(user, "take_offline", "maintenance"), "Site taken to maintenance."); reload(); }} disabled={busy} className="nw-btn-secondary nw-btn-sm disabled:opacity-50" data-testid="site-offline-btn">Take offline (maintenance)</button>
            <button onClick={async () => { await run(() => M.setSiteStatus(user, "bring_online"), "Site brought online."); reload(); }} disabled={busy} className="nw-btn-primary nw-btn-sm disabled:opacity-50" data-testid="site-online-btn">Bring online</button>
          </div>
        </>
      )}
    </div>
  );
};

/* ------------------------------ Tab shell ---------------------------- */
const TABS = [
  { id: "databases", label: "Databases", icon: FiDatabase, Comp: MysqlTab },
  { id: "subdomains", label: "Subdomains", icon: FiGlobe, Comp: SubdomainsTab },
  { id: "domains", label: "Domains", icon: FiGlobe, Comp: DomainsTab },
  { id: "ssl", label: "SSL", icon: FiLock, Comp: SslTab },
  { id: "files", label: "Files", icon: FiFolder, Comp: FilesTab },
  { id: "security", label: "Security", icon: FiShield, Comp: SecurityTab },
  { id: "geo", label: "Geo", icon: FiMapPin, Comp: GeoTab },
  { id: "analytics", label: "Analytics", icon: FiBarChart2, Comp: AnalyticsTab },
  { id: "site", label: "Site", icon: FiPower, Comp: SiteTab },
];

export default function CpanelTabs({ user, domain }) {
  const [active, setActive] = useState("databases");
  const ActiveComp = (TABS.find((t) => t.id === active) || TABS[0]).Comp;
  return (
    <div data-testid="cpanel-tabs">
      <div className="flex items-center gap-1 overflow-x-auto pb-2 -mx-1 px-1 mb-3 border-b border-lightgray dark:border-gray-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            data-testid={`cpanel-tabbtn-${t.id}`}
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              active === t.id
                ? "bg-brand-600 text-white dark:bg-brand-500"
                : "text-secondary dark:text-gray-400 hover:bg-lightgray dark:hover:bg-gray-800"
            }`}
          >
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>
      <div className="min-h-[220px]">
        <ActiveComp user={user} domain={domain} />
      </div>
    </div>
  );
}
