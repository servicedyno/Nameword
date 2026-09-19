import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import ProductShell from "../components/layout/ProductShell";
import resellerAPI from "../api/reseller";
import { useAlert } from "../context/AlertContext";
import { usePageMeta } from "../hooks/usePageMeta";
import {
  FiGlobe,
  FiPlus,
  FiX,
  FiTrash2,
  FiEdit2,
  FiRefreshCw,
  FiServer,
  FiSave,
  FiSearch,
  FiCopy,
  FiCheck,
  FiChevronDown,
  FiChevronUp,
  FiAlertTriangle,
} from "react-icons/fi";

/* ------------------------------- helpers ------------------------------ */
const RECORD_TYPES = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SRV"];
const hasPriority = (type) => ["MX", "SRV"].includes(String(type).toUpperCase());
const isSrv = (type) => String(type).toUpperCase() === "SRV";
const isTxt = (type) => String(type).toUpperCase() === "TXT";

const TTL_PRESETS = [
  { label: "Auto", value: 1 },
  { label: "1 min", value: 60 },
  { label: "5 min", value: 300 },
  { label: "30 min", value: 1800 },
  { label: "1 hour", value: 3600 },
  { label: "1 day", value: 86400 },
];
const ttlLabel = (sec) => {
  const n = Number(sec);
  if (!n || n === 1) return "Auto";
  const p = TTL_PRESETS.find((x) => x.value === n);
  if (p) return p.label;
  if (n % 86400 === 0) return `${n / 86400} day${n / 86400 > 1 ? "s" : ""}`;
  if (n % 3600 === 0) return `${n / 3600} hr`;
  if (n % 60 === 0) return `${n / 60} min`;
  return `${n}s`;
};

const TYPE_COLORS = {
  A: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  AAAA: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
  CNAME: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  MX: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  TXT: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  NS: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300",
  SRV: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
};
const TYPE_HINTS = {
  A: "Points a name to an IPv4 address (e.g. 203.0.113.10).",
  AAAA: "Points a name to an IPv6 address.",
  CNAME: "Aliases this name to another hostname.",
  MX: "Mail server for the domain, with a priority.",
  TXT: "Free-form text (SPF, DKIM, verification, etc.).",
  NS: "Delegates the name to another nameserver.",
  SRV: "Service location: priority, weight, port and target.",
};

const IPV4_RE = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
const IPV6_RE = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|:(:[0-9a-fA-F]{1,4}){1,7}|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|::([fF]{4}:)?(\d{1,3}\.){3}\d{1,3})$/;
const HOST_RE = /^(\*\.)?([a-zA-Z0-9_-]{1,63}\.)*[a-zA-Z0-9_-]{1,63}\.?$/;

const fqdn = (name, domain) => {
  const n = String(name || "").trim().replace(/\.$/, "");
  if (!n || n === "@") return domain;
  if (n === domain || n.endsWith(`.${domain}`)) return n;
  return `${n}.${domain}`;
};

const blankForm = () => ({
  type: "A",
  name: "@",
  value: "",
  ttl: 1,
  priority: "10",
  srvWeight: "1",
  srvPort: "",
  srvTarget: "",
});

// Turn a loaded record into an editable form (parse SRV value back into fields).
const recordToForm = (r) => {
  const f = { ...blankForm(), ...r, type: r.type, name: r.name ?? "@", value: r.value ?? "", ttl: Number(r.ttl) || 1, priority: r.priority ?? r.prio ?? "10" };
  if (isSrv(r.type)) {
    const parts = String(r.value || "").trim().split(/\s+/);
    if (parts.length >= 3) {
      f.srvWeight = parts[0];
      f.srvPort = parts[1];
      f.srvTarget = parts.slice(2).join(" ");
    }
  }
  return f;
};

const validateRecord = (form) => {
  const t = String(form.type).toUpperCase();
  const name = String(form.name || "").trim();
  if (name && !HOST_RE.test(name) && name !== "@") return "That name does not look valid.";
  if (t === "A") {
    if (!IPV4_RE.test(String(form.value).trim())) return "Enter a valid IPv4 address (e.g. 203.0.113.10).";
  } else if (t === "AAAA") {
    if (!IPV6_RE.test(String(form.value).trim())) return "Enter a valid IPv6 address.";
  } else if (t === "CNAME" || t === "NS") {
    if (!HOST_RE.test(String(form.value).trim())) return "Enter a valid target hostname.";
  } else if (t === "MX") {
    if (!HOST_RE.test(String(form.value).trim())) return "Enter a valid mail server hostname.";
    if (form.priority === "" || isNaN(Number(form.priority))) return "Enter a numeric priority.";
  } else if (t === "TXT") {
    if (!String(form.value).trim()) return "Enter the text value.";
  } else if (t === "SRV") {
    if (form.priority === "" || isNaN(Number(form.priority))) return "Enter a numeric priority.";
    if (form.srvWeight === "" || isNaN(Number(form.srvWeight))) return "Enter a numeric weight.";
    if (form.srvPort === "" || isNaN(Number(form.srvPort))) return "Enter a numeric port.";
    if (!HOST_RE.test(String(form.srvTarget).trim())) return "Enter a valid SRV target host.";
  }
  return null;
};

// Build the API payload from the form (compose SRV value; attach priority).
const formToPayload = (form) => {
  const t = String(form.type).toUpperCase();
  const value = isSrv(t)
    ? `${Number(form.srvWeight)} ${Number(form.srvPort)} ${String(form.srvTarget).trim()}`
    : String(form.value).trim();
  return {
    type: t,
    name: String(form.name || "").trim() || "@",
    value,
    ttl: Number(form.ttl) || 1,
    ...(hasPriority(t) && form.priority !== "" ? { priority: Number(form.priority) } : {}),
  };
};

/* --------------------------- small components ------------------------- */
const TypeBadge = ({ type }) => (
  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-mono font-bold ${TYPE_COLORS[String(type).toUpperCase()] || "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200"}`}>
    {String(type).toUpperCase()}
  </span>
);

const CopyButton = ({ text, testId }) => {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={() => {
        try { navigator.clipboard?.writeText(String(text || "")); } catch { /* noop */ }
        setDone(true);
        setTimeout(() => setDone(false), 1200);
      }}
      className="shrink-0 text-ink-soft hover:text-brand dark:text-gray-500 dark:hover:text-brand-400"
      title="Copy value"
    >
      {done ? <FiCheck size={14} className="text-emerald-500" /> : <FiCopy size={14} />}
    </button>
  );
};

const Field = ({ label, hint, children }) => (
  <div>
    <label className="block text-xs font-medium text-ink-soft dark:text-gray-400 mb-1">{label}</label>
    {children}
    {hint && <p className="mt-1 text-[11px] leading-snug text-ink-soft/80 dark:text-gray-500">{hint}</p>}
  </div>
);

const inputCls =
  "w-full rounded-lg border border-line dark:border-gray-700 bg-white dark:bg-gray-800 text-primary dark:text-white px-3 py-2 text-sm focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/15";

/* -------------------------- shared record form ------------------------ */
const RecordForm = ({ form, setForm, onSubmit, onCancel, submitting, submitLabel, mode }) => {
  const t = String(form.type).toUpperCase();
  const err = validateRecord(form);
  const set = (patch) => setForm({ ...form, ...patch });
  const ttlIsPreset = TTL_PRESETS.some((p) => p.value === Number(form.ttl));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Type">
          <select
            value={t}
            disabled={mode === "edit"}
            onChange={(e) => set({ type: e.target.value })}
            data-testid="dns-add-type"
            className={`${inputCls} appearance-none disabled:opacity-60`}
          >
            {RECORD_TYPES.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </Field>

        <Field label="Name" hint="Use @ for the root domain, or a subdomain like www.">
          <input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="@ or www" className={inputCls} data-testid="dns-add-name" />
        </Field>

        {hasPriority(t) && (
          <Field label="Priority">
            <input type="number" value={form.priority} onChange={(e) => set({ priority: e.target.value })} placeholder="10" className={inputCls} data-testid="dns-add-priority" />
          </Field>
        )}

        <Field label="TTL" hint="How long resolvers cache this record.">
          <div className="flex gap-2">
            <select
              value={ttlIsPreset ? String(Number(form.ttl)) : "custom"}
              onChange={(e) => { const v = e.target.value; set({ ttl: v === "custom" ? (Number(form.ttl) || 3600) : Number(v) }); }}
              data-testid="dns-add-ttl"
              className={`${inputCls} appearance-none`}
            >
              {TTL_PRESETS.map((p) => <option key={p.value} value={String(p.value)}>{p.label}</option>)}
              <option value="custom">Custom…</option>
            </select>
            {!ttlIsPreset && (
              <input type="number" min="1" value={form.ttl} onChange={(e) => set({ ttl: e.target.value })} className={`${inputCls} w-28`} title="Seconds" data-testid="dns-add-ttl-custom" />
            )}
          </div>
        </Field>
      </div>

      {/* Value area (type-aware) */}
      {isTxt(t) ? (
        <Field label="Value" hint={TYPE_HINTS.TXT}>
          <textarea value={form.value} onChange={(e) => set({ value: e.target.value })} rows={3} placeholder="v=spf1 include:_spf.example.com ~all" className={`${inputCls} font-mono`} data-testid="dns-add-value" />
        </Field>
      ) : isSrv(t) ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Weight"><input type="number" value={form.srvWeight} onChange={(e) => set({ srvWeight: e.target.value })} placeholder="1" className={inputCls} data-testid="dns-add-srv-weight" /></Field>
          <Field label="Port"><input type="number" value={form.srvPort} onChange={(e) => set({ srvPort: e.target.value })} placeholder="443" className={inputCls} data-testid="dns-add-srv-port" /></Field>
          <Field label="Target" hint={TYPE_HINTS.SRV}><input value={form.srvTarget} onChange={(e) => set({ srvTarget: e.target.value })} placeholder="sipserver.example.com" className={inputCls} data-testid="dns-add-srv-target" /></Field>
        </div>
      ) : (
        <Field label="Value" hint={TYPE_HINTS[t]}>
          <input value={form.value} onChange={(e) => set({ value: e.target.value })} placeholder={t === "A" ? "203.0.113.10" : t === "AAAA" ? "2606:4700:4700::1111" : "target.example.com"} className={`${inputCls} font-mono`} data-testid="dns-add-value" />
        </Field>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || !!err}
          title={err || ""}
          className="nw-btn-primary disabled:opacity-50 inline-flex items-center gap-1.5"
          data-testid={mode === "edit" ? "dns-edit-save" : "dns-add-btn"}
        >
          {mode === "edit" ? <FiSave size={15} /> : <FiPlus size={15} />}
          {submitting ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg border border-line dark:border-gray-700 text-primary dark:text-white text-sm font-medium" data-testid="dns-edit-cancel">Cancel</button>
        )}
        {err && form.value !== "" && (
          <span className="text-xs text-red-500 inline-flex items-center gap-1"><FiAlertTriangle size={13} /> {err}</span>
        )}
      </div>
    </div>
  );
};

/* ================================ page =============================== */
export default function DnsManagerNomadly() {
  usePageMeta("DNS Manager", "Add and edit DNS records and nameservers for your domains.");
  const { showAlert } = useAlert();
  const [params, setParams] = useSearchParams();

  const [ownedDomains, setOwnedDomains] = useState([]);
  const [manualMode, setManualMode] = useState(false);
  const [domain, setDomain] = useState(params.get("domain") || "");
  const [activeDomain, setActiveDomain] = useState(params.get("domain") || "");

  const [records, setRecords] = useState([]);
  const [source, setSource] = useState(null);
  const [nameservers, setNameservers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const [addForm, setAddForm] = useState(blankForm());
  const [adding, setAdding] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [confirmDel, setConfirmDel] = useState(null); // {rec, key}
  const [busyKey, setBusyKey] = useState(null);

  const [ns, setNs] = useState("");
  const [savingNs, setSavingNs] = useState(false);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [sort, setSort] = useState({ key: "type", dir: "asc" });

  /* ------- load owned domains for the picker ------- */
  useEffect(() => {
    (async () => {
      try {
        const data = await resellerAPI.listDomains();
        setOwnedDomains(Array.isArray(data?.domains) ? data.domains : []);
      } catch { /* picker is optional */ }
    })();
  }, []);

  const loadRecords = useCallback(async (d) => {
    const dom = String(d || "").trim().toLowerCase();
    if (!dom) return;
    setLoading(true);
    setLoaded(false);
    setEditingId(null);
    try {
      const data = await resellerAPI.listDns(dom);
      const mapped = Array.isArray(data?.records)
        ? data.records.map((r) => ({
            ...r,
            type: r.recordType || r.type,
            name: r.recordName || r.name,
            value: r.recordContent || r.value,
            id: r.cfRecordId || r.id,
          }))
        : [];
      setRecords(mapped);
      setSource(data?.source || null);
      setActiveDomain(dom);
      // current nameservers: from the owned-domain entry, else NS records
      const owned = ownedDomains.find((x) => String(x.domain).toLowerCase() === dom);
      const nsFromRecords = mapped.filter((r) => String(r.type).toUpperCase() === "NS").map((r) => r.value);
      setNameservers(owned?.nameservers?.length ? owned.nameservers : nsFromRecords);
      setLoaded(true);
    } catch (err) {
      setRecords([]);
      showAlert(err?.response?.data?.message || "Could not load DNS records.", { type: "fail" });
    } finally {
      setLoading(false);
    }
  }, [showAlert, ownedDomains]);

  useEffect(() => {
    const d = params.get("domain");
    if (d) loadRecords(d);
  }, []);

  const onLoad = (e) => {
    if (e) e.preventDefault();
    const dom = domain.trim().toLowerCase();
    if (!dom) return;
    setParams({ domain: dom });
    loadRecords(dom);
  };

  const addRecord = async () => {
    const err = validateRecord(addForm);
    if (err) { showAlert(err, { type: "fail" }); return; }
    setAdding(true);
    try {
      await resellerAPI.addDns(activeDomain, formToPayload(addForm));
      showAlert("Record added.", { type: "success" });
      setAddForm(blankForm());
      setShowAdd(false);
      loadRecords(activeDomain);
    } catch (err2) {
      showAlert(err2?.response?.data?.message || "Could not add record.", { type: "fail" });
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (rec) => {
    setEditingId(rec.id || `${rec.type}-${rec.name}`);
    setEditForm(recordToForm(rec));
  };

  const saveEdit = async (original) => {
    const err = validateRecord(editForm);
    if (err) { showAlert(err, { type: "fail" }); return; }
    setSavingEdit(true);
    try {
      // Send the ORIGINAL record object (keeps provider ids) merged with edits.
      const payload = { ...original, ...formToPayload(editForm) };
      await resellerAPI.updateDns(activeDomain, payload);
      showAlert("Record updated.", { type: "success" });
      setEditingId(null);
      setEditForm(null);
      loadRecords(activeDomain);
    } catch (err2) {
      showAlert(err2?.response?.data?.message || "Could not update record.", { type: "fail" });
    } finally {
      setSavingEdit(false);
    }
  };

  const doDelete = async () => {
    if (!confirmDel) return;
    const { rec, key } = confirmDel;
    setBusyKey(key);
    setConfirmDel(null);
    try {
      await resellerAPI.deleteDns(activeDomain, rec);
      showAlert("Record deleted.", { type: "success" });
      loadRecords(activeDomain);
    } catch (err) {
      showAlert(err?.response?.data?.message || "Could not delete record.", { type: "fail" });
    } finally {
      setBusyKey(null);
    }
  };

  const saveNameservers = async (e) => {
    if (e) e.preventDefault();
    const list = ns.split(/[\s,]+/).map((x) => x.trim()).filter(Boolean);
    if (list.length < 2) { showAlert("Provide at least two nameservers.", { type: "fail" }); return; }
    setSavingNs(true);
    try {
      await resellerAPI.setNameservers(activeDomain, list);
      showAlert("Nameservers updated.", { type: "success" });
      setNameservers(list);
      setNs("");
    } catch (err) {
      showAlert(err?.response?.data?.message || "Could not update nameservers.", { type: "fail" });
    } finally {
      setSavingNs(false);
    }
  };

  /* ------- derived: filtered + sorted records ------- */
  const view = useMemo(() => {
    let out = records.slice();
    if (typeFilter !== "ALL") out = out.filter((r) => String(r.type).toUpperCase() === typeFilter);
    const q = search.trim().toLowerCase();
    if (q) out = out.filter((r) => `${r.name} ${r.value} ${r.type}`.toLowerCase().includes(q));
    const { key, dir } = sort;
    out.sort((a, b) => {
      let av = a[key], bv = b[key];
      if (key === "ttl") { av = Number(av) || 0; bv = Number(bv) || 0; return dir === "asc" ? av - bv : bv - av; }
      av = String(av || "").toLowerCase(); bv = String(bv || "").toLowerCase();
      return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return out;
  }, [records, typeFilter, search, sort]);

  const toggleSort = (key) => setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  const sortHead = (label, k) => (
    <th className="px-4 py-3 font-medium select-none cursor-pointer" onClick={() => toggleSort(k)} data-testid={`dns-sort-${k}`}>
      <span className="inline-flex items-center gap-1">{label}{sort.key === k && (sort.dir === "asc" ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />)}</span>
    </th>
  );

  const keyFor = (r, i) => r.id || `${r.type}-${r.name}-${i}`;

  return (
    <ProductShell>
      {/* Hero + domain picker */}
      <section className="nw-hero border-b border-line dark:border-white/[0.06]">
        <div className="absolute inset-0 nw-grid-bg opacity-60 dark:opacity-100" />
        <div className="nw-hero-glow -top-24 -right-24 h-72 w-72" />
        <div className="nw-container relative py-10 sm:py-14">
          <span className="nw-eyebrow mb-4">DNS Manager</span>
          <h1 className="max-w-2xl text-3xl font-bold leading-tight tracking-tight text-primary dark:text-white sm:text-4xl">Manage your DNS like a pro</h1>
          <p className="mt-3 max-w-xl nw-lead">Pick a domain, then add or edit A, AAAA, CNAME, MX, TXT, NS and SRV records — or switch nameservers. DNS changes are free.</p>

          <form onSubmit={onLoad} className="mt-6 flex max-w-xl flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <FiGlobe className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft z-10" size={18} />
              {manualMode || ownedDomains.length === 0 ? (
                <input
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="mysite.com"
                  data-testid="dns-domain-manual-input"
                  className="w-full rounded-xl border border-line dark:border-gray-700 bg-white dark:bg-gray-800 text-primary dark:text-white pl-10 pr-3 py-3 text-sm focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/15"
                />
              ) : (
                <select
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  data-testid="dns-domain-select"
                  className="w-full appearance-none rounded-xl border border-line dark:border-gray-700 bg-white dark:bg-gray-800 text-primary dark:text-white pl-10 pr-9 py-3 text-sm focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/15"
                >
                  <option value="">Choose a domain…</option>
                  {ownedDomains.map((d) => <option key={d.domain} value={d.domain}>{d.domain}</option>)}
                </select>
              )}
            </div>
            <button type="submit" disabled={loading || !domain.trim()} className="nw-btn-primary disabled:opacity-60">{loading ? "Loading…" : "Load records"}</button>
          </form>
          {ownedDomains.length > 0 && (
            <button type="button" onClick={() => { setManualMode((m) => !m); setDomain(""); }} className="mt-2 text-xs text-brand hover:underline dark:text-brand-400" data-testid="dns-toggle-manual">
              {manualMode ? "Choose from my domains instead" : "Enter a domain manually instead"}
            </button>
          )}
        </div>
      </section>

      <main className="nw-container py-10">
        {/* Empty / loading states before a domain is chosen */}
        {!loaded && !loading && (
          <div className="flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-line dark:border-gray-800 py-16 px-6">
            <FiServer className="text-ink-soft mb-3" size={30} />
            <p className="text-primary dark:text-white font-medium">Choose a domain to manage its DNS</p>
            <p className="text-secondary dark:text-gray-400 text-sm mt-1">Records and nameservers load here.</p>
          </div>
        )}
        {loading && (
          <div className="space-y-3" data-testid="dns-loading">
            <div className="h-10 w-56 rounded-lg bg-lightgray-200 dark:bg-gray-800 animate-pulse" />
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-12 rounded-lg bg-lightgray-200/70 dark:bg-gray-800/60 animate-pulse" />)}
          </div>
        )}

        {loaded && !loading && (
          <>
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-2xl font-semibold text-primary dark:text-white inline-flex items-center gap-2"><FiGlobe className="text-brand" /> {activeDomain}</h2>
                <p className="text-xs text-ink-soft dark:text-gray-500 mt-0.5">
                  {records.length} record{records.length !== 1 ? "s" : ""}{source ? ` · served from ${source}` : ""}
                </p>
              </div>
              <button onClick={() => loadRecords(activeDomain)} className="flex items-center gap-2 text-sm text-darkbtn hover:text-darkbtn-hover font-medium"><FiRefreshCw size={15} /> Refresh</button>
            </div>

            {/* Current nameservers */}
            <div className="nw-card !p-5 mb-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-primary dark:text-white flex items-center gap-1.5 mb-2"><FiServer size={15} /> Current nameservers</h3>
                  {nameservers.length ? (
                    <div className="flex flex-wrap gap-2" data-testid="dns-current-ns">
                      {nameservers.map((n, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 rounded-lg bg-lightgray-200 dark:bg-gray-800 px-2.5 py-1 text-xs font-mono text-primary dark:text-gray-200">{n}<CopyButton text={n} testId={`dns-copy-ns-${i}`} /></span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-secondary dark:text-gray-400">Not available for this domain.</p>
                  )}
                </div>
              </div>
              <details className="mt-4 group">
                <summary className="cursor-pointer text-xs font-medium text-brand dark:text-brand-400 select-none">Replace nameservers</summary>
                <form onSubmit={saveNameservers} className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <textarea value={ns} onChange={(e) => setNs(e.target.value)} rows={2} placeholder="ns1.example.com, ns2.example.com" data-testid="dns-ns-input" className="flex-1 rounded-xl border border-line dark:border-gray-700 bg-white dark:bg-gray-800 text-primary dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/15" />
                  <button type="submit" disabled={savingNs} className="nw-btn-primary sm:self-start disabled:opacity-60 inline-flex items-center gap-1.5" data-testid="dns-ns-save"><FiSave size={15} /> {savingNs ? "Saving…" : "Save"}</button>
                </form>
                <p className="mt-1.5 text-[11px] text-ink-soft dark:text-gray-500">Provide at least two nameservers. DNS changes are free.</p>
              </details>
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <div className="relative flex-1 min-w-[200px]">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" size={15} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search records…" data-testid="dns-search" className="w-full rounded-lg border border-line dark:border-gray-700 bg-white dark:bg-gray-800 text-primary dark:text-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-brand" />
              </div>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} data-testid="dns-type-filter" className="appearance-none rounded-lg border border-line dark:border-gray-700 bg-white dark:bg-gray-800 text-primary dark:text-white px-3 py-2 text-sm focus:outline-none focus:border-brand">
                <option value="ALL">All types</option>
                {RECORD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <span className="text-xs text-ink-soft dark:text-gray-500" data-testid="dns-record-count">{view.length} shown</span>
              <button onClick={() => { setShowAdd((s) => !s); setAddForm(blankForm()); }} className="nw-btn-primary nw-btn-sm inline-flex items-center gap-1.5" data-testid="dns-add-toggle"><FiPlus size={15} /> Add record</button>
            </div>

            {/* Records card */}
            <div className="nw-card !p-0 overflow-hidden">
              {/* Add-record bar at the TOP */}
              {showAdd && (
                <div className="border-b border-line dark:border-gray-800 bg-lightgray-200/50 dark:bg-gray-800/40 p-5" data-testid="dns-add-panel">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-primary dark:text-white inline-flex items-center gap-1.5"><FiPlus size={15} /> Add a record</h3>
                    <button onClick={() => setShowAdd(false)} className="text-ink-soft hover:text-primary dark:hover:text-white" aria-label="Close"><FiX size={18} /></button>
                  </div>
                  <RecordForm form={addForm} setForm={setAddForm} onSubmit={addRecord} submitting={adding} submitLabel="Add record" mode="add" />
                </div>
              )}

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-lightgray-200 dark:bg-gray-800/60 text-left text-ink-soft dark:text-gray-400">
                    <tr>
                      {sortHead("Type", "type")}
                      {sortHead("Name", "name")}
                      {sortHead("Value", "value")}
                      {sortHead("TTL", "ttl")}
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-10 text-center text-secondary dark:text-gray-400">{records.length === 0 ? "No records yet. Add your first one above." : "No records match your search."}</td></tr>
                    ) : (
                      view.map((r, i) => {
                        const key = keyFor(r, i);
                        const editing = editingId === (r.id || `${r.type}-${r.name}`);
                        if (editing) {
                          return (
                            <tr key={key} className="border-t border-line dark:border-gray-800 bg-brand/[0.03] dark:bg-brand-500/[0.05]">
                              <td colSpan={5} className="px-4 py-4">
                                <RecordForm form={editForm} setForm={setEditForm} onSubmit={() => saveEdit(r)} onCancel={() => { setEditingId(null); setEditForm(null); }} submitting={savingEdit} submitLabel="Save changes" mode="edit" />
                              </td>
                            </tr>
                          );
                        }
                        return (
                          <tr key={key} className="border-t border-line dark:border-gray-800 hover:bg-lightgray-200/40 dark:hover:bg-gray-800/40" data-testid={`dns-row-${r.id || i}`}>
                            <td className="px-4 py-3"><TypeBadge type={r.type} /></td>
                            <td className="px-4 py-3 text-primary dark:text-white font-medium max-w-[220px] truncate" title={fqdn(r.name, activeDomain)}>{fqdn(r.name, activeDomain)}</td>
                            <td className="px-4 py-3 text-secondary dark:text-gray-300 font-mono">
                              <div className="flex items-center gap-2 max-w-[360px]">
                                <span className="truncate" title={r.value}>{hasPriority(r.type) && (r.priority ?? r.prio) != null && !isSrv(r.type) ? `${r.priority ?? r.prio} ` : ""}{r.value}</span>
                                <CopyButton text={r.value} testId={`dns-copy-${r.id || i}`} />
                              </div>
                            </td>
                            <td className="px-4 py-3 text-secondary dark:text-gray-400">{ttlLabel(r.ttl)}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => startEdit(r)} title="Edit" data-testid={`dns-edit-${r.id || i}`} className="p-2 rounded-md border border-lightgray dark:border-gray-800 text-primary dark:text-white hover:bg-hover dark:hover:bg-gray-800"><FiEdit2 size={15} /></button>
                                <button disabled={busyKey === key} onClick={() => setConfirmDel({ rec: r, key })} title="Delete" data-testid={`dns-delete-${r.id || i}`} className="p-2 rounded-md border border-lightgray dark:border-gray-800 text-red-600 hover:bg-red-50 dark:hover:bg-gray-800 disabled:opacity-50"><FiTrash2 size={15} /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-line dark:divide-gray-800">
                {view.length === 0 ? (
                  <p className="px-4 py-10 text-center text-secondary dark:text-gray-400">{records.length === 0 ? "No records yet. Add your first one above." : "No records match your search."}</p>
                ) : (
                  view.map((r, i) => {
                    const key = keyFor(r, i);
                    const editing = editingId === (r.id || `${r.type}-${r.name}`);
                    if (editing) {
                      return (
                        <div key={key} className="p-4 bg-brand/[0.03] dark:bg-brand-500/[0.05]">
                          <RecordForm form={editForm} setForm={setEditForm} onSubmit={() => saveEdit(r)} onCancel={() => { setEditingId(null); setEditForm(null); }} submitting={savingEdit} submitLabel="Save changes" mode="edit" />
                        </div>
                      );
                    }
                    return (
                      <div key={key} className="p-4" data-testid={`dns-card-${r.id || i}`}>
                        <div className="flex items-center justify-between mb-2">
                          <TypeBadge type={r.type} />
                          <div className="flex items-center gap-2">
                            <button onClick={() => startEdit(r)} className="p-2 rounded-md border border-lightgray dark:border-gray-800 text-primary dark:text-white" aria-label="Edit"><FiEdit2 size={14} /></button>
                            <button disabled={busyKey === key} onClick={() => setConfirmDel({ rec: r, key })} className="p-2 rounded-md border border-lightgray dark:border-gray-800 text-red-600 disabled:opacity-50" aria-label="Delete"><FiTrash2 size={14} /></button>
                          </div>
                        </div>
                        <p className="text-sm font-medium text-primary dark:text-white break-all">{fqdn(r.name, activeDomain)}</p>
                        <div className="mt-1 flex items-start gap-2">
                          <p className="flex-1 text-xs font-mono text-secondary dark:text-gray-300 break-all">{hasPriority(r.type) && (r.priority ?? r.prio) != null && !isSrv(r.type) ? `${r.priority ?? r.prio} ` : ""}{r.value}</p>
                          <CopyButton text={r.value} testId={`dns-copy-m-${r.id || i}`} />
                        </div>
                        <p className="mt-1 text-[11px] text-ink-soft dark:text-gray-500">TTL: {ttlLabel(r.ttl)}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Delete confirmation */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setConfirmDel(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 shadow-xl p-6" onClick={(e) => e.stopPropagation()} data-testid="dns-delete-dialog">
            <div className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400"><FiTrash2 size={20} /></div>
            <h3 className="text-lg font-semibold text-primary dark:text-white">Delete this record?</h3>
            <p className="mt-1 text-sm text-secondary dark:text-gray-400">
              <span className="font-mono font-semibold">{String(confirmDel.rec.type).toUpperCase()}</span> · {fqdn(confirmDel.rec.name, activeDomain)}
            </p>
            <p className="mt-1 text-xs font-mono text-ink-soft dark:text-gray-500 break-all">{confirmDel.rec.value}</p>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setConfirmDel(null)} className="px-4 py-2 rounded-lg border border-line dark:border-gray-700 text-primary dark:text-white text-sm font-medium" data-testid="dns-delete-cancel">Cancel</button>
              <button onClick={doDelete} className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium" data-testid="dns-delete-confirm">Delete</button>
            </div>
          </div>
        </div>
      )}
    </ProductShell>
  );
}
