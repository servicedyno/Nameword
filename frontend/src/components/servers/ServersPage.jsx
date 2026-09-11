import React, { useCallback, useEffect, useState } from "react";
import Navbar from "../layout/Navbar";
import Footer from "../layout/Footer";
import { resellerProduct } from "../../api/reseller";
import WalletNudge from "../reseller/WalletNudge";
import { useAlert } from "../../context/AlertContext";
import { useLanguage } from "../../hooks/useLanguage";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useBuyer } from "../../hooks/useBuyer";
import { Link } from "react-router";
import {
  FiServer,
  FiCpu,
  FiHardDrive,
  FiGlobe,
  FiX,
  FiRefreshCw,
  FiPlay,
  FiPower,
  FiRotateCw,
  FiTrash2,
  FiLock,
  FiCheckCircle,
  FiAlertTriangle,
  FiZap,
} from "react-icons/fi";

// Jurisdictions offered today (labels come from locales/site.*.js -> servers.regions)
const REGIONS = ["EU", "SG"];

// Product facts that never change with language. Copy lives in locales/site.*.js -> servers.{vps,rdp}
const PRODUCT_META = {
  vps: {
    title: "Offshore VPS",
    user: "root",
    osChoices: ["ubuntu", "debian", "centos", "fedora", "rocky", "almalinux"],
  },
  rdp: {
    title: "Private RDP",
    user: "Administrator",
    osChoices: null,
  },
};
const CHIP_ICONS = [FiGlobe, FiLock, FiZap];

const money = (n) =>
  n === null || n === undefined || isNaN(Number(n))
    ? "—"
    : `$${Number(n).toFixed(2)}`;

const statusStyle = (status = "") => {
  const s = String(status).toLowerCase();
  if (["active", "running", "online"].includes(s))
    return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";
  if (["provisioning", "pending", "creating", "starting"].includes(s))
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  if (["stopped", "off", "shutoff"].includes(s))
    return "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
  return "bg-lightgray text-primary dark:bg-gray-800 dark:text-white";
};

const Spec = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-2 text-sm text-ink-soft dark:text-gray-400">
    <Icon className="shrink-0 text-brand" size={16} />
    <span className="text-primary dark:text-white font-medium">{value}</span>
    <span>{label}</span>
  </div>
);

const PlanSkeleton = () => (
  <div className="rounded-2xl border border-line dark:border-gray-800 p-6 animate-pulse">
    <div className="h-5 w-32 bg-lightgray dark:bg-gray-800 rounded mb-4" />
    <div className="h-3 w-24 bg-lightgray dark:bg-gray-800 rounded mb-2" />
    <div className="h-3 w-20 bg-lightgray dark:bg-gray-800 rounded mb-2" />
    <div className="h-3 w-28 bg-lightgray dark:bg-gray-800 rounded mb-6" />
    <div className="h-9 w-full bg-lightgray dark:bg-gray-800 rounded" />
  </div>
);

export default function ServersPage({ product = "vps" }) {
  const meta = PRODUCT_META[product] || PRODUCT_META.vps;
  const api = resellerProduct(product);
  const { showAlert } = useAlert();
  const { t } = useLanguage();
  const copy = t.site.servers[product] || t.site.servers.vps;
  usePageMeta(copy.eyebrow, copy.tagline);

  const [region, setRegion] = useState("EU");
  const { isAuthenticated, mode, balance, refresh, requireLogin } = useBuyer();

  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState(null);

  const [servers, setServers] = useState([]);
  const [serversLoading, setServersLoading] = useState(true);

  const [deployPlan, setDeployPlan] = useState(null);
  const [hostname, setHostname] = useState("");
  const [os, setOs] = useState(meta.osChoices ? meta.osChoices[0] : "windows");
  const [deploying, setDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState(null);

  const [busyId, setBusyId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [creds, setCreds] = useState(null);

  // --- data loaders ---
  const loadPlans = useCallback(
    async (rg) => {
      setPlansLoading(true);
      setPlansError(null);
      try {
        const data = await api.getPlans(rg);
        setPlans(Array.isArray(data?.plans) ? data.plans : []);
      } catch (err) {
        setPlansError(
          err?.response?.data?.message || "Could not load plans. Please retry."
        );
        setPlans([]);
      } finally {
        setPlansLoading(false);
      }
    },
    [api]
  );

  const loadServers = useCallback(async () => {
    setServersLoading(true);
    try {
      const data = await api.list();
      const list = data?.vps || data?.rdp || data?.servers || [];
      setServers(Array.isArray(list) ? list : []);
    } catch (_) {
      setServers([]);
    } finally {
      setServersLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (isAuthenticated) loadServers();
  }, [product, isAuthenticated]);

  useEffect(() => {
    loadPlans(region);
  }, [region, product]);

  // --- actions ---
  const openDeploy = (plan) => {
    if (!requireLogin(`/${product}`)) return;
    setDeployPlan(plan);
    setHostname("");
    setOs(meta.osChoices ? meta.osChoices[0] : "windows");
    setDeployResult(null);
  };

  const closeDeploy = () => {
    setDeployPlan(null);
    setDeployResult(null);
    setDeploying(false);
  };

  const submitDeploy = async () => {
    if (!deployPlan) return;
    setDeploying(true);
    setDeployResult(null);
    try {
      const payload = {
        plan_id: deployPlan.plan_id,
        region,
        ...(hostname ? { hostname } : {}),
        ...(meta.osChoices ? { os } : {}),
      };
      const res = await api.create(payload);
      setDeployResult(res);
      if (res?.mode === "live" && res?.result?.success) {
        showAlert(`${meta.title} deployed successfully.`, { type: "success" });
        loadServers();
        refresh();
      }
    } catch (err) {
      const data = err?.response?.data;
      setDeployResult({ _error: true, ...(data || { message: "Deployment failed." }) });
      showAlert(data?.message || "Deployment failed.", { type: "fail" });
    } finally {
      setDeploying(false);
    }
  };

  const doAction = async (id, action) => {
    setBusyId(id + action);
    try {
      await api.action(id, action);
      showAlert(`Action "${action}" sent.`, { type: "success" });
      loadServers();
    } catch (err) {
      showAlert(err?.response?.data?.message || `Failed to ${action}.`, {
        type: "fail",
      });
    } finally {
      setBusyId(null);
    }
  };

  const doDestroy = async (id) => {
    setBusyId(id + "destroy");
    try {
      await api.remove(id);
      showAlert("Server destroyed.", { type: "success" });
      setConfirmId(null);
      loadServers();
    } catch (err) {
      showAlert(err?.response?.data?.message || "Failed to destroy.", {
        type: "fail",
      });
    } finally {
      setBusyId(null);
    }
  };

  const revealCreds = async (id) => {
    setBusyId(id + "creds");
    try {
      const data = await api.credentials(id);
      setCreds(data);
    } catch (err) {
      showAlert(err?.response?.data?.message || "Could not fetch credentials.", {
        type: "fail",
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <Navbar />
      {/* Branded hero */}
      <section className="nw-hero border-b border-line dark:border-white/[0.06]">
        <div className="absolute inset-0 nw-grid-bg opacity-60 dark:opacity-100" />
        <div className="nw-hero-glow -top-24 -right-24 h-72 w-72" />
        <div className="nw-container relative py-10 sm:py-14">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="nw-eyebrow mb-4">{copy.eyebrow}</span>
              <h1 className="max-w-2xl text-3xl font-bold leading-tight tracking-tight text-primary dark:text-white sm:text-4xl">
                {copy.title}
              </h1>
              <p className="mt-3 max-w-xl nw-lead">{copy.tagline}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {copy.chips.map((c, i) => {
                  const Icon = CHIP_ICONS[i] || FiCheckCircle;
                  return <span key={c} className="nw-chip"><Icon className="h-4 w-4 text-brand-600 dark:text-brand-400" /> {c}</span>;
                })}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isAuthenticated && balance != null && (
                <Link to="/wallet" className="nw-card !px-4 !py-3 text-right hover:border-brand/40" data-testid="user-wallet-chip">
                  <p className="font-mono text-[11px] uppercase tracking-wider text-ink-soft dark:text-gray-400">{t.site.servers.wallet}</p>
                  <p className="font-mono text-lg font-bold text-primary dark:text-white">{money(balance)}</p>
                </Link>
              )}
              <div>
                <label className="sr-only" htmlFor="region">{t.site.servers.regionLabel}</label>
                <div className="relative">
                  <FiGlobe className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" size={16} />
                  <select
                    id="region"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="appearance-none rounded-xl border border-line bg-white pl-9 pr-8 py-3 text-sm font-medium text-primary focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    {REGIONS.map((code) => (
                      <option key={code} value={code}>{t.site.servers.regions[code] || code}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <main className="nw-container py-12">

        {/* Mode banner (signed-in only) */}
        {isAuthenticated && mode === "dry_run" && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-400/40 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 mb-8" data-testid="dry-run-banner">
            <FiAlertTriangle className="text-amber-600 dark:text-amber-300 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <span className="font-semibold">{t.site.servers.dryRun.title}</span> {t.site.servers.dryRun.body}
            </p>
          </div>
        )}

        {/* Plans */}
        <section className="mb-14">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold text-primary dark:text-white">
              Choose a plan
            </h2>
            <button
              onClick={() => loadPlans(region)}
              className="flex items-center gap-2 text-sm text-darkbtn hover:text-darkbtn-hover font-medium"
            >
              <FiRefreshCw size={15} /> Refresh
            </button>
          </div>

          {plansLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[0, 1, 2, 3, 4, 5].map((i) => <PlanSkeleton key={i} />)}
            </div>
          ) : plansError ? (
            <div className="flex flex-col items-center justify-center text-center rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 py-12 px-6">
              <FiAlertTriangle className="text-red-500 mb-3" size={28} />
              <p className="text-primary dark:text-white font-medium mb-1">{plansError}</p>
              <button onClick={() => loadPlans(region)} className="btn-teal mt-3">Retry</button>
            </div>
          ) : plans.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center rounded-2xl border border-line dark:border-gray-800 py-12 px-6">
              <FiServer className="text-ink-soft mb-3" size={28} />
              <p className="text-primary dark:text-white font-medium">No plans available in this region</p>
              <p className="text-ink-soft dark:text-gray-400 text-sm mt-1">Try a different region.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((p) => (
                <div
                  key={p.plan_id}
                  className="nw-card nw-card-hover group !p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-primary dark:text-white">{p.name || p.plan_id}</h3>
                      <p className="font-mono text-[11px] uppercase tracking-wider text-ink-soft dark:text-gray-500 mt-0.5">{t.site.servers.regions[region] || region}</p>
                    </div>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand/15 dark:text-brand-200"><FiZap size={18} /></span>
                  </div>
                  <div className="space-y-2 mb-5">
                    <Spec icon={FiCpu} label="vCPU" value={p.vcpus ?? "—"} />
                    <Spec icon={FiServer} label="GB RAM" value={p.ram_gb ?? "—"} />
                    <Spec icon={FiHardDrive} label="GB SSD" value={p.disk_gb ?? "—"} />
                  </div>
                  <div className="flex items-end justify-between border-t border-line dark:border-gray-800 pt-4">
                    <div>
                      <span className="text-2xl font-bold text-primary dark:text-white">{money(p.price_usd)}</span>
                      <span className="text-ink-soft dark:text-gray-400 text-sm"> /mo</span>
                    </div>
                    <button
                      onClick={() => openDeploy(p)}
                      className="nw-btn-primary nw-btn-sm"
                    >
                      Deploy
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* My servers (signed-in only) */}
        {isAuthenticated && <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold text-primary dark:text-white">{t.site.servers.yourServers}</h2>
            <button onClick={loadServers} className="flex items-center gap-2 text-sm text-darkbtn hover:text-darkbtn-hover font-medium">
              <FiRefreshCw size={15} /> Refresh
            </button>
          </div>

          {serversLoading ? (
            <div className="space-y-3">
              {[0, 1].map((i) => (
                <div key={i} className="h-20 rounded-xl border border-lightgray dark:border-gray-800 animate-pulse" />
              ))}
            </div>
          ) : servers.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-line dark:border-gray-800 py-12 px-6">
              <FiServer className="text-ink-soft mb-3" size={28} />
              <p className="text-primary dark:text-white font-medium">{t.site.servers.none}</p>
              <p className="text-secondary dark:text-gray-400 text-sm mt-1 max-w-md">
                {mode === "dry_run" && t.site.servers.noneDryRun}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {servers.map((s) => {
                const id = s.id || s._id || s.instance_id;
                return (
                  <div key={id} className="nw-card !p-5 flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-semibold text-primary dark:text-white">{s.hostname || s.plan || meta.title}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusStyle(s.status)}`}>{s.status || "unknown"}</span>
                      </div>
                      <div className="flex items-center gap-x-6 gap-y-1 flex-wrap text-sm text-secondary dark:text-gray-400 mt-1">
                        {s.ip && <span>IP: <span className="text-primary dark:text-white font-medium">{s.ip}</span></span>}
                        {s.plan && <span>{s.plan}</span>}
                        {s.region && <span>{s.region}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button disabled={busyId === id + "start"} onClick={() => doAction(id, "start")} title="Start" className="p-2 rounded-md border border-lightgray dark:border-gray-800 text-green-600 hover:bg-green-50 dark:hover:bg-gray-800 disabled:opacity-50"><FiPlay size={16} /></button>
                      <button disabled={busyId === id + "stop"} onClick={() => doAction(id, "stop")} title="Stop" className="p-2 rounded-md border border-lightgray dark:border-gray-800 text-amber-600 hover:bg-amber-50 dark:hover:bg-gray-800 disabled:opacity-50"><FiPower size={16} /></button>
                      <button disabled={busyId === id + "reboot"} onClick={() => doAction(id, "reboot")} title="Reboot" className="p-2 rounded-md border border-lightgray dark:border-gray-800 text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-800 disabled:opacity-50"><FiRotateCw size={16} /></button>
                      <button disabled={busyId === id + "creds"} onClick={() => revealCreds(id)} className="flex items-center gap-1.5 p-2 rounded-md border border-lightgray dark:border-gray-800 text-primary dark:text-white hover:bg-hover dark:hover:bg-gray-800 disabled:opacity-50"><FiLock size={16} /> <span className="text-sm">Credentials</span></button>
                      {confirmId === id ? (
                        <span className="flex items-center gap-1">
                          <button disabled={busyId === id + "destroy"} onClick={() => doDestroy(id)} className="px-3 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm">Confirm</button>
                          <button onClick={() => setConfirmId(null)} className="px-3 py-2 rounded-md border border-lightgray dark:border-gray-800 text-sm text-primary dark:text-white">Cancel</button>
                        </span>
                      ) : (
                        <button onClick={() => setConfirmId(id)} title="Destroy" className="p-2 rounded-md border border-lightgray dark:border-gray-800 text-red-600 hover:bg-red-50 dark:hover:bg-gray-800"><FiTrash2 size={16} /></button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>}
      </main>

      {/* Deploy modal */}
      {deployPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={closeDeploy}>
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-lightgray dark:border-gray-800">
              <h3 className="text-lg font-semibold text-primary dark:text-white">Deploy {meta.title}</h3>
              <button onClick={closeDeploy} className="text-secondary hover:text-primary dark:hover:text-white" aria-label="Close"><FiX size={22} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="rounded-lg bg-lightgray-200 dark:bg-gray-800 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-primary dark:text-white">{deployPlan.name || deployPlan.plan_id}</span>
                  <span className="font-bold text-primary dark:text-white">{money(deployPlan.price_usd)}<span className="text-secondary text-sm font-normal"> /mo</span></span>
                </div>
                <p className="text-xs text-secondary dark:text-gray-400 mt-1">{deployPlan.ram_gb} GB RAM · {deployPlan.disk_gb} GB SSD · {region}</p>
              </div>

              {!deployResult && (
                <>
                  <div>
                    <label htmlFor="hostname" className="block text-sm font-medium text-primary dark:text-white mb-1">Hostname <span className="text-secondary font-normal">(optional)</span></label>
                    <input id="hostname" value={hostname} onChange={(e) => setHostname(e.target.value)} placeholder="web-01" className="w-full rounded-xl border border-line dark:border-gray-700 bg-white dark:bg-gray-800 text-primary dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/15" />
                  </div>
                  {meta.osChoices && (
                    <div>
                      <label htmlFor="os" className="block text-sm font-medium text-primary dark:text-white mb-1">Operating system</label>
                      <select id="os" value={os} onChange={(e) => setOs(e.target.value)} className="w-full appearance-none rounded-xl border border-line dark:border-gray-700 bg-white dark:bg-gray-800 text-primary dark:text-white px-3 py-2.5 text-sm capitalize focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/15">
                        {meta.osChoices.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  )}
                  {!meta.osChoices && (
                    <p className="text-sm text-secondary dark:text-gray-400">Operating system: <span className="text-primary dark:text-white font-medium">Windows</span></p>
                  )}
                  <WalletNudge balance={balance} price={deployPlan.price_usd} />
                </>
              )}

              {deployResult && !deployResult._error && deployResult.mode === "dry_run" && (
                <div className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 text-sm">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-semibold mb-2"><FiCheckCircle /> Simulated (test mode)</div>
                  <p className="text-amber-800 dark:text-amber-200">This order priced at <span className="font-semibold">{money(deployResult.price_usd)}</span> and passed validation. No server was created and no funds were charged.</p>
                  {deployResult.sufficient_balance === false && (
                    <p className="text-amber-800 dark:text-amber-200 mt-2">Note: wallet balance ({money(deployResult.wallet_balance_usd)}) is below the price — top up before going live.</p>
                  )}
                </div>
              )}

              {deployResult && !deployResult._error && deployResult.mode === "live" && (
                <div className="rounded-lg border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4 text-sm space-y-1">
                  <div className="flex items-center gap-2 text-green-800 dark:text-green-200 font-semibold mb-1"><FiCheckCircle /> Deployed</div>
                  <p className="text-green-800 dark:text-green-200">Charged {money(deployResult.charged_usd)}. New balance {money(deployResult.wallet_balance_usd)}.</p>
                  {deployResult.result?.ip && <p className="text-green-800 dark:text-green-200">IP: <span className="font-mono">{deployResult.result.ip}</span></p>}
                  {deployResult.result?.default_password && <p className="text-green-800 dark:text-green-200">Password: <span className="font-mono">{deployResult.result.default_password}</span></p>}
                </div>
              )}

              {deployResult && deployResult._error && (
                <div className="rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-semibold mb-1"><FiAlertTriangle /> {deployResult.error || "Error"}</div>
                  <p className="text-red-700 dark:text-red-300">{deployResult.message}</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-lightgray dark:border-gray-800 flex justify-end gap-3">
              {!deployResult ? (
                <>
                  <button onClick={closeDeploy} className="px-4 py-2 rounded-md border border-lightgray dark:border-gray-800 text-primary dark:text-white text-sm font-medium">Cancel</button>
                  <button onClick={submitDeploy} disabled={deploying} className="px-5 py-2 rounded-md bg-darkbtn hover:bg-darkbtn-hover text-white text-sm font-medium disabled:opacity-60">{deploying ? "Deploying…" : `Deploy · ${money(deployPlan.price_usd)}`}</button>
                </>
              ) : (
                <button onClick={closeDeploy} className="px-5 py-2 rounded-md bg-darkbtn hover:bg-darkbtn-hover text-white text-sm font-medium">Done</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Credentials modal */}
      {creds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setCreds(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-lightgray dark:border-gray-800">
              <h3 className="text-lg font-semibold text-primary dark:text-white">Login credentials</h3>
              <button onClick={() => setCreds(null)} className="text-secondary hover:text-primary dark:hover:text-white" aria-label="Close"><FiX size={22} /></button>
            </div>
            <div className="px-6 py-5 space-y-3 text-sm">
              <Row label="IP" value={creds.ip} />
              <Row label="Username" value={creds.username || meta.user} />
              <Row label="Password" value={creds.password || (creds.mode === "dry_run" ? "(only shown in live mode)" : "—")} />
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-secondary dark:text-gray-400">{label}</span>
      <span className="font-mono text-primary dark:text-white break-all text-right">{value}</span>
    </div>
  );
}
