import React, { useCallback, useEffect, useState } from "react";
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
  FiAlertTriangle,
  FiServer,
  FiSave,
} from "react-icons/fi";

const RECORD_TYPES = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SRV"];
const hasPriority = (type) => ["MX", "SRV"].includes(String(type).toUpperCase());

const blankRecord = { type: "A", name: "@", value: "", ttl: 3600, priority: "" };

export default function DnsManagerNomadly() {
  usePageMeta("DNS Manager", "Add and edit DNS records and nameservers for your domains.");
  const { showAlert } = useAlert();
  const [params, setParams] = useSearchParams();

  const [domain, setDomain] = useState(params.get("domain") || "");
  const [activeDomain, setActiveDomain] = useState(params.get("domain") || "");
  const [records, setRecords] = useState([]);
  const [source, setSource] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const [form, setForm] = useState(blankRecord);
  const [adding, setAdding] = useState(false);

  const [edit, setEdit] = useState(null); // record being edited
  const [savingEdit, setSavingEdit] = useState(false);
  const [busyKey, setBusyKey] = useState(null);

  const [ns, setNs] = useState("");
  const [savingNs, setSavingNs] = useState(false);

  const loadRecords = useCallback(async (d) => {
    const dom = String(d || "").trim().toLowerCase();
    if (!dom) return;
    setLoading(true);
    setLoaded(false);
    try {
      const data = await resellerAPI.listDns(dom);
      // Map API response fields (recordType, recordName, recordContent) to component fields (type, name, value)
      const mappedRecords = Array.isArray(data?.records) 
        ? data.records.map(r => ({
            ...r,
            type: r.recordType || r.type,
            name: r.recordName || r.name,
            value: r.recordContent || r.value,
            id: r.cfRecordId || r.id,
          }))
        : [];
      setRecords(mappedRecords);
      setSource(data?.source || null);
      setActiveDomain(dom);
      setLoaded(true);
    } catch (err) {
      setRecords([]);
      showAlert(err?.response?.data?.message || "Could not load DNS records.", { type: "fail" });
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

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

  const addRecord = async (e) => {
    if (e) e.preventDefault();
    if (!form.value.trim()) {
      showAlert("Please enter a record value.", { type: "fail" });
      return;
    }
    setAdding(true);
    try {
      const payload = {
        type: form.type,
        name: form.name?.trim() || "@",
        value: form.value.trim(),
        ttl: Number(form.ttl) || 3600,
        ...(hasPriority(form.type) && form.priority !== "" ? { priority: Number(form.priority) } : {}),
      };
      await resellerAPI.addDns(activeDomain, payload);
      showAlert("Record added.", { type: "success" });
      setForm(blankRecord);
      loadRecords(activeDomain);
    } catch (err) {
      showAlert(err?.response?.data?.message || "Could not add record.", { type: "fail" });
    } finally {
      setAdding(false);
    }
  };

  const saveEdit = async () => {
    if (!edit) return;
    setSavingEdit(true);
    try {
      const record = {
        ...edit,
        ttl: Number(edit.ttl) || 3600,
        ...(hasPriority(edit.type) && edit.priority !== "" && edit.priority !== undefined
          ? { priority: Number(edit.priority) }
          : {}),
      };
      await resellerAPI.updateDns(activeDomain, record);
      showAlert("Record updated.", { type: "success" });
      setEdit(null);
      loadRecords(activeDomain);
    } catch (err) {
      showAlert(err?.response?.data?.message || "Could not update record.", { type: "fail" });
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteRecord = async (rec, key) => {
    setBusyKey(key);
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
    if (list.length < 2) {
      showAlert("Provide at least two nameservers.", { type: "fail" });
      return;
    }
    setSavingNs(true);
    try {
      await resellerAPI.setNameservers(activeDomain, list);
      showAlert("Nameservers updated.", { type: "success" });
    } catch (err) {
      showAlert(err?.response?.data?.message || "Could not update nameservers.", { type: "fail" });
    } finally {
      setSavingNs(false);
    }
  };

  return (
    <ProductShell>
      <section className="nw-hero border-b border-line dark:border-white/[0.06]">
        <div className="absolute inset-0 nw-grid-bg opacity-60 dark:opacity-100" />
        <div className="nw-hero-glow -top-24 -right-24 h-72 w-72" />
        <div className="nw-container relative py-10 sm:py-14">
          <span className="nw-eyebrow mb-4">DNS Manager</span>
          <h1 className="max-w-2xl text-3xl font-bold leading-tight tracking-tight text-primary dark:text-white sm:text-4xl">Point your domain anywhere</h1>
          <p className="mt-3 max-w-xl nw-lead">Add and edit A, CNAME, MX and TXT records — or switch nameservers. DNS changes are free.</p>
          <form onSubmit={onLoad} className="mt-6 flex max-w-xl gap-2">
            <div className="relative flex-1">
              <FiGlobe className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" size={18} />
              <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="mysite.com" className="w-full rounded-xl border border-line dark:border-gray-700 bg-white dark:bg-gray-800 text-primary dark:text-white pl-10 pr-3 py-3 text-sm focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/15" />
            </div>
            <button type="submit" disabled={loading} className="nw-btn-primary disabled:opacity-60">{loading ? "Loading…" : "Load records"}</button>
          </form>
        </div>
      </section>

      <main className="nw-container py-12">
        {!loaded && !loading && (
          <div className="flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-line dark:border-gray-800 py-16 px-6">
            <FiServer className="text-ink-soft mb-3" size={30} />
            <p className="text-primary dark:text-white font-medium">Enter a domain to manage its DNS</p>
            <p className="text-secondary dark:text-gray-400 text-sm mt-1">Records and nameservers load here.</p>
          </div>
        )}

        {loaded && (
          <>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-semibold text-primary dark:text-white">{activeDomain}</h2>
                {source && <p className="text-xs text-ink-soft dark:text-gray-500 mt-0.5">Source: {source}</p>}
              </div>
              <button onClick={() => loadRecords(activeDomain)} className="flex items-center gap-2 text-sm text-darkbtn hover:text-darkbtn-hover font-medium"><FiRefreshCw size={15} /> Refresh</button>
            </div>

            {/* Records table */}
            <div className="nw-card !p-0 overflow-hidden mb-8">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-lightgray-200 dark:bg-gray-800/60 text-left">
                    <tr className="text-ink-soft dark:text-gray-400">
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Value</th>
                      <th className="px-4 py-3 font-medium">TTL</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-secondary dark:text-gray-400">No records yet. Add one below.</td></tr>
                    ) : (
                      records.map((r, i) => {
                        const key = r.id || `${r.type}-${r.name}-${i}`;
                        return (
                          <tr key={key} className="border-t border-line dark:border-gray-800">
                            <td className="px-4 py-3"><span className="font-mono font-semibold text-primary dark:text-white">{r.type}</span></td>
                            <td className="px-4 py-3 text-primary dark:text-white">{r.name}</td>
                            <td className="px-4 py-3 text-secondary dark:text-gray-300 font-mono break-all">{hasPriority(r.type) && (r.priority ?? r.prio) !== undefined ? `${r.priority ?? r.prio ?? ""} ` : ""}{r.value}</td>
                            <td className="px-4 py-3 text-secondary dark:text-gray-400">{r.ttl ?? "—"}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => setEdit({ ...blankRecord, ...r })} title="Edit" className="p-2 rounded-md border border-lightgray dark:border-gray-800 text-primary dark:text-white hover:bg-hover dark:hover:bg-gray-800"><FiEdit2 size={15} /></button>
                                <button disabled={busyKey === key} onClick={() => deleteRecord(r, key)} title="Delete" className="p-2 rounded-md border border-lightgray dark:border-gray-800 text-red-600 hover:bg-red-50 dark:hover:bg-gray-800 disabled:opacity-50"><FiTrash2 size={15} /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Add record */}
            <div className="nw-card !p-6 mb-8">
              <h3 className="text-lg font-semibold text-primary dark:text-white mb-4 flex items-center gap-2"><FiPlus /> Add a record</h3>
              <form onSubmit={addRecord} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
                <div>
                  <label className="block text-xs font-medium text-ink-soft dark:text-gray-400 mb-1">Type</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full appearance-none rounded-lg border border-line dark:border-gray-700 bg-white dark:bg-gray-800 text-primary dark:text-white px-3 py-2 text-sm focus:outline-none focus:border-brand">
                    {RECORD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-soft dark:text-gray-400 mb-1">Name</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="@ or www" className="w-full rounded-lg border border-line dark:border-gray-700 bg-white dark:bg-gray-800 text-primary dark:text-white px-3 py-2 text-sm focus:outline-none focus:border-brand" />
                </div>
                <div className={hasPriority(form.type) ? "lg:col-span-1" : "lg:col-span-2"}>
                  <label className="block text-xs font-medium text-ink-soft dark:text-gray-400 mb-1">Value</label>
                  <input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="203.0.113.10" className="w-full rounded-lg border border-line dark:border-gray-700 bg-white dark:bg-gray-800 text-primary dark:text-white px-3 py-2 text-sm focus:outline-none focus:border-brand" />
                </div>
                {hasPriority(form.type) && (
                  <div>
                    <label className="block text-xs font-medium text-ink-soft dark:text-gray-400 mb-1">Priority</label>
                    <input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} placeholder="10" className="w-full rounded-lg border border-line dark:border-gray-700 bg-white dark:bg-gray-800 text-primary dark:text-white px-3 py-2 text-sm focus:outline-none focus:border-brand" />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-ink-soft dark:text-gray-400 mb-1">TTL</label>
                  <input type="number" value={form.ttl} onChange={(e) => setForm({ ...form, ttl: e.target.value })} className="w-full rounded-lg border border-line dark:border-gray-700 bg-white dark:bg-gray-800 text-primary dark:text-white px-3 py-2 text-sm focus:outline-none focus:border-brand" />
                </div>
                <div>
                  <button type="submit" disabled={adding} className="nw-btn-primary w-full justify-center disabled:opacity-60">{adding ? "Adding…" : "Add"}</button>
                </div>
              </form>
            </div>

            {/* Nameservers */}
            <div className="nw-card !p-6">
              <h3 className="text-lg font-semibold text-primary dark:text-white mb-1">Nameservers</h3>
              <p className="text-sm text-secondary dark:text-gray-400 mb-4">Replace the domain nameservers (provide at least two).</p>
              <form onSubmit={saveNameservers} className="flex flex-col sm:flex-row gap-3">
                <textarea value={ns} onChange={(e) => setNs(e.target.value)} rows={2} placeholder="ns1.example.com, ns2.example.com" className="flex-1 rounded-xl border border-line dark:border-gray-700 bg-white dark:bg-gray-800 text-primary dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/15" />
                <button type="submit" disabled={savingNs} className="nw-btn-primary sm:self-start disabled:opacity-60"><FiSave size={15} /> {savingNs ? "Saving…" : "Save nameservers"}</button>
              </form>
            </div>
          </>
        )}
      </main>

      {/* Edit modal */}
      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setEdit(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-lightgray dark:border-gray-800">
              <h3 className="text-lg font-semibold text-primary dark:text-white">Edit {edit.type} record</h3>
              <button onClick={() => setEdit(null)} className="text-secondary hover:text-primary dark:hover:text-white" aria-label="Close"><FiX size={22} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary dark:text-white mb-1">Name</label>
                <input value={edit.name || ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className="w-full rounded-xl border border-line dark:border-gray-700 bg-white dark:bg-gray-800 text-primary dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:border-brand" />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary dark:text-white mb-1">Value</label>
                <input value={edit.value || ""} onChange={(e) => setEdit({ ...edit, value: e.target.value })} className="w-full rounded-xl border border-line dark:border-gray-700 bg-white dark:bg-gray-800 text-primary dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:border-brand" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-primary dark:text-white mb-1">TTL</label>
                  <input type="number" value={edit.ttl ?? 3600} onChange={(e) => setEdit({ ...edit, ttl: e.target.value })} className="w-full rounded-xl border border-line dark:border-gray-700 bg-white dark:bg-gray-800 text-primary dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:border-brand" />
                </div>
                {hasPriority(edit.type) && (
                  <div>
                    <label className="block text-sm font-medium text-primary dark:text-white mb-1">Priority</label>
                    <input type="number" value={edit.priority ?? ""} onChange={(e) => setEdit({ ...edit, priority: e.target.value })} className="w-full rounded-xl border border-line dark:border-gray-700 bg-white dark:bg-gray-800 text-primary dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:border-brand" />
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-lightgray dark:border-gray-800 flex justify-end gap-3">
              <button onClick={() => setEdit(null)} className="px-4 py-2 rounded-md border border-lightgray dark:border-gray-800 text-primary dark:text-white text-sm font-medium">Cancel</button>
              <button onClick={saveEdit} disabled={savingEdit} className="px-5 py-2 rounded-md bg-darkbtn hover:bg-darkbtn-hover text-white text-sm font-medium disabled:opacity-60">{savingEdit ? "Saving…" : "Save changes"}</button>
            </div>
          </div>
        </div>
      )}

    </ProductShell>
  );
}
