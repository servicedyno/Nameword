import React, { useCallback, useEffect, useState } from "react";
import ProductShell from "../layout/ProductShell";
import EmptyState from "../common/EmptyState";
import resellerAPI, { resellerProduct } from "../../api/reseller";
import { useAlert } from "../../context/AlertContext";
import { useLanguage } from "../../hooks/useLanguage";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useBuyer } from "../../hooks/useBuyer";
import { useCart } from "../../hooks/useCart";
import { useCartUI } from "../../context/CartUIContext";
import { regionLabel } from "../../utils/regions";
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
  FiShoppingCart,
  FiArrowRight,
  FiKey,
  FiClock,
  FiActivity,
  FiDownloadCloud,
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
  const { isAuthenticated, mode, balance } = useBuyer();
  const cart = useCart();
  const { open: openCart } = useCartUI();

  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState(null);

  const [servers, setServers] = useState([]);
  const [serversLoading, setServersLoading] = useState(true);

  const [configPlan, setConfigPlan] = useState(null);
  const [hostname, setHostname] = useState("");
  const [os, setOs] = useState(meta.osChoices ? meta.osChoices[0] : "windows");

  // RDP Windows editions (ws2019 | ws2022 | ws2025) from GET /rdp/plans os_options.
  const [osOptions, setOsOptions] = useState([]);
  const [defaultOs, setDefaultOs] = useState("ws2022");
  const [rdpEdition, setRdpEdition] = useState("ws2022");

  const [busyId, setBusyId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [creds, setCreds] = useState(null);
  // RDP management modals
  const [statusId, setStatusId] = useState(null); // live "Windows is booting" status
  const [reinstallServer, setReinstallServer] = useState(null);
  const [reinstallOs, setReinstallOs] = useState("ws2022");
  const [renewServer, setRenewServer] = useState(null);
  const [renewMonths, setRenewMonths] = useState(1);

  // --- data loaders ---
  const loadPlans = useCallback(
    async (rg) => {
      setPlansLoading(true);
      setPlansError(null);
      try {
        const data = await api.getPlans(rg);
        setPlans(Array.isArray(data?.plans) ? data.plans : []);
        // Capture Windows editions for RDP (os_options + default_os).
        if (Array.isArray(data?.os_options) && data.os_options.length) {
          setOsOptions(data.os_options);
          const def = data.default_os || (data.os_options.find((o) => o.default) || data.os_options[0]).id;
          setDefaultOs(def);
          setRdpEdition(def);
          setReinstallOs(def);
        }
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
  // Guests and signed-in users alike configure a plan and add it to the cart.
  // Provisioning happens after login at checkout, paid from the prepaid wallet —
  // the same flow as domains and hosting.
  const openConfigure = (plan) => {
    setConfigPlan(plan);
    setHostname("");
    setOs(meta.osChoices ? meta.osChoices[0] : "windows");
  };

  const closeConfigure = () => {
    setConfigPlan(null);
  };

  const addToCart = () => {
    if (!configPlan) return;
    cart.addServer({
      product,
      plan: configPlan,
      region,
      os: meta.osChoices ? os : (product === "rdp" ? rdpEdition : undefined),
      hostname: hostname.trim(),
    });
    showAlert(`${configPlan.name || configPlan.plan_id} added to cart.`, { type: "success" });
    setConfigPlan(null);
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

  // --- RDP-only management ---
  const doResetPassword = async (id) => {
    setBusyId(id + "pw");
    try {
      const data = await api.resetPassword(id);
      if (data?.password) {
        setCreds({ ip: data.ip, username: data.username || "Administrator", password: data.password, _title: "New Administrator password" });
      }
      showAlert(data?.password ? "Administrator password reset — data preserved." : (data?.message || "Password reset requested."), { type: "success" });
      loadServers();
    } catch (err) {
      showAlert(err?.response?.data?.message || "Could not reset the password. The server must be running with its agent online.", { type: "fail" });
    } finally {
      setBusyId(null);
    }
  };

  const doReinstall = async () => {
    const id = reinstallServer;
    if (!id) return;
    setBusyId(id + "reinstall");
    try {
      const data = await api.reinstall(id, reinstallOs);
      setReinstallServer(null);
      if (data?.password) {
        setCreds({ ip: data.ip, username: "Administrator", password: data.password, _title: "New password after reinstall" });
      }
      showAlert(`Reinstalling ${data?.os_name || reinstallOs} — same IP, ready in ~${data?.eta_minutes || 3} min.`, { type: "success" });
      loadServers();
    } catch (err) {
      showAlert(err?.response?.data?.message || "Reinstall failed.", { type: "fail" });
    } finally {
      setBusyId(null);
    }
  };

  const doRenew = async () => {
    const id = renewServer;
    if (!id) return;
    setBusyId(id + "renew");
    try {
      const data = await api.renew(id, renewMonths);
      setRenewServer(null);
      const exp = data?.result?.expires_at ? ` New expiry: ${new Date(data.result.expires_at).toLocaleDateString()}.` : "";
      showAlert(`Renewed for ${renewMonths} month${renewMonths > 1 ? "s" : ""}.${exp}`, { type: "success" });
      loadServers();
    } catch (err) {
      showAlert(err?.response?.data?.message || "Renewal failed.", { type: "fail" });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ProductShell>
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
                <Link to="/wallet" className="nw-card nw-stat-glow relative overflow-hidden !px-4 !py-3 text-right hover:border-brand/40" data-testid="user-wallet-chip">
                  <p className="font-mono text-[11px] uppercase tracking-wider text-ink-soft dark:text-gray-400">{t.site.servers.wallet}</p>
                  <p className="font-mono text-lg font-bold nw-grad-text">{money(balance)}</p>
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
      <main className={`nw-container py-12 ${cart.count > 0 ? "pb-28" : ""}`}>

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
              <button onClick={() => loadPlans(region)} className="nw-btn-secondary nw-btn-sm mt-3">Retry</button>
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
                    <Spec icon={FiCpu} label={p.cpu ? `vCPU · ${p.cpu}` : "vCPU"} value={p.vcpus ?? "—"} />
                    <Spec icon={FiServer} label="GB RAM" value={p.ram_gb ?? "—"} />
                    <Spec icon={FiHardDrive} label={`GB ${p.storage_type || "SSD"}`} value={p.disk_gb ?? "—"} />
                  </div>
                  <div className="flex items-end justify-between border-t border-line dark:border-gray-800 pt-4">
                    <div>
                      <span className="text-2xl font-bold text-primary dark:text-white">{money(p.price_usd)}</span>
                      <span className="text-ink-soft dark:text-gray-400 text-sm"> /mo</span>
                    </div>
                    <button
                      onClick={() => openConfigure(p)}
                      className="nw-btn-primary nw-btn-sm"
                      data-testid={`server-add-${p.plan_id}`}
                    >
                      <FiShoppingCart size={15} /> Add to cart
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
            <EmptyState
              compact
              icon={FiServer}
              title={t.site.servers.none}
              description={mode === "dry_run" ? t.site.servers.noneDryRun : (t.site.servers.noneDesc || "Deploy your first server in seconds and pay from your prepaid wallet — no card on file.")}
              primaryLabel={t.site.servers.deployCta || `Browse ${meta.title} plans`}
              onPrimary={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            />
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
                      {product === "rdp" && (
                        <>
                          <button onClick={() => setStatusId(id)} title="Provisioning status" className="p-2 rounded-md border border-lightgray dark:border-gray-800 text-brand-600 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-gray-800" data-testid={`rdp-status-${id}`}><FiActivity size={16} /></button>
                          <button disabled={busyId === id + "pw"} onClick={() => doResetPassword(id)} title="Reset Administrator password (data preserved)" className="p-2 rounded-md border border-lightgray dark:border-gray-800 text-primary dark:text-white hover:bg-hover dark:hover:bg-gray-800 disabled:opacity-50" data-testid={`rdp-reset-${id}`}><FiKey size={16} /></button>
                          <button onClick={() => { setReinstallServer(id); setReinstallOs(defaultOs); }} title="Reinstall Windows (rebuild, same IP)" className="p-2 rounded-md border border-lightgray dark:border-gray-800 text-primary dark:text-white hover:bg-hover dark:hover:bg-gray-800" data-testid={`rdp-reinstall-${id}`}><FiDownloadCloud size={16} /></button>
                          <button onClick={() => { setRenewServer(id); setRenewMonths(1); }} title="Renew subscription" className="flex items-center gap-1.5 p-2 rounded-md border border-lightgray dark:border-gray-800 text-primary dark:text-white hover:bg-hover dark:hover:bg-gray-800" data-testid={`rdp-renew-${id}`}><FiClock size={16} /> <span className="text-sm">Renew</span></button>
                        </>
                      )}
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

      {/* Configure & add-to-cart modal */}
      {configPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={closeConfigure}>
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-xl" onClick={(e) => e.stopPropagation()} data-testid="server-configure-modal">
            <div className="flex items-center justify-between px-6 py-4 border-b border-lightgray dark:border-gray-800">
              <h3 className="text-lg font-semibold text-primary dark:text-white">Add {meta.title} to cart</h3>
              <button onClick={closeConfigure} className="text-secondary hover:text-primary dark:hover:text-white" aria-label="Close"><FiX size={22} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="rounded-lg bg-lightgray-200 dark:bg-gray-800 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-primary dark:text-white">{configPlan.name || configPlan.plan_id}</span>
                  <span className="font-bold text-primary dark:text-white">{money(configPlan.price_usd)}<span className="text-secondary text-sm font-normal"> /mo</span></span>
                </div>
                <p className="text-xs text-secondary dark:text-gray-400 mt-1">{configPlan.ram_gb} GB RAM · {configPlan.disk_gb} GB {configPlan.storage_type || "SSD"}{configPlan.cpu ? ` · ${configPlan.cpu}` : ""} · {regionLabel(region)}</p>
              </div>

              <div>
                <label htmlFor="hostname" className="block text-sm font-medium text-primary dark:text-white mb-1">Hostname <span className="text-secondary font-normal">(optional)</span></label>
                <input id="hostname" value={hostname} onChange={(e) => setHostname(e.target.value)} placeholder="web-01" className="w-full rounded-xl border border-line dark:border-gray-700 bg-white dark:bg-gray-800 text-primary dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/15" data-testid="server-hostname-input" />
              </div>
              {meta.osChoices ? (
                <div>
                  <label htmlFor="os" className="block text-sm font-medium text-primary dark:text-white mb-1">Operating system</label>
                  <select id="os" value={os} onChange={(e) => setOs(e.target.value)} className="w-full appearance-none rounded-xl border border-line dark:border-gray-700 bg-white dark:bg-gray-800 text-primary dark:text-white px-3 py-2.5 text-sm capitalize focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/15" data-testid="server-os-select">
                    {meta.osChoices.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label htmlFor="rdp-edition" className="block text-sm font-medium text-primary dark:text-white mb-1">Windows edition</label>
                  {osOptions.length ? (
                    <select id="rdp-edition" value={rdpEdition} onChange={(e) => setRdpEdition(e.target.value)} className="w-full appearance-none rounded-xl border border-line dark:border-gray-700 bg-white dark:bg-gray-800 text-primary dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/15" data-testid="rdp-edition-select">
                      {osOptions.map((o) => (
                        <option key={o.id} value={o.id}>{o.name}{o.fast_deploy ? ` · ready in ~${o.eta_minutes || 3} min` : ""}{o.default ? " (default)" : ""}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm text-secondary dark:text-gray-400">Operating system: <span className="text-primary dark:text-white font-medium">Windows Server</span></p>
                  )}
                </div>
              )}
              <p className="flex items-center gap-2 text-xs text-secondary dark:text-gray-400"><FiLock size={13} /> Pay from your prepaid wallet at checkout. Billed monthly.</p>
            </div>
            <div className="px-6 py-4 border-t border-lightgray dark:border-gray-800 flex justify-end gap-3">
              <button onClick={closeConfigure} className="nw-btn-secondary nw-btn-sm">Cancel</button>
              <button onClick={addToCart} className="nw-btn-primary nw-btn-sm" data-testid="server-add-to-cart-confirm"><FiShoppingCart size={15} /> Add to cart · {money(configPlan.price_usd)}</button>
            </div>
          </div>
        </div>
      )}

      {/* Credentials modal */}
      {creds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setCreds(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-lightgray dark:border-gray-800">
              <h3 className="text-lg font-semibold text-primary dark:text-white">{creds._title || "Login credentials"}</h3>
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

      {/* Reinstall (RDP) modal */}
      {reinstallServer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setReinstallServer(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-xl" onClick={(e) => e.stopPropagation()} data-testid="rdp-reinstall-modal">
            <div className="flex items-center justify-between px-6 py-4 border-b border-lightgray dark:border-gray-800">
              <h3 className="text-lg font-semibold text-primary dark:text-white">Reinstall Windows</h3>
              <button onClick={() => setReinstallServer(null)} className="text-secondary hover:text-primary dark:hover:text-white" aria-label="Close"><FiX size={22} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-amber-400/40 bg-amber-50 dark:bg-amber-500/10 px-4 py-3">
                <FiAlertTriangle className="text-amber-600 dark:text-amber-300 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-800 dark:text-amber-200">The disk is <span className="font-semibold">wiped</span> and Windows is rebuilt from a golden image. The public IP is kept and a new password is generated — ready in ~3-5 min.</p>
              </div>
              <div>
                <label htmlFor="reinstall-os" className="block text-sm font-medium text-primary dark:text-white mb-1">Windows edition</label>
                <select id="reinstall-os" value={reinstallOs} onChange={(e) => setReinstallOs(e.target.value)} className="w-full appearance-none rounded-xl border border-line dark:border-gray-700 bg-white dark:bg-gray-800 text-primary dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/15" data-testid="rdp-reinstall-os">
                  {(osOptions.length ? osOptions : [{ id: "ws2019", name: "Windows Server 2019" }, { id: "ws2022", name: "Windows Server 2022" }, { id: "ws2025", name: "Windows Server 2025" }]).map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-lightgray dark:border-gray-800 flex justify-end gap-3">
              <button onClick={() => setReinstallServer(null)} className="nw-btn-secondary nw-btn-sm">Cancel</button>
              <button disabled={busyId === reinstallServer + "reinstall"} onClick={doReinstall} className="nw-btn-primary nw-btn-sm" data-testid="rdp-reinstall-confirm"><FiDownloadCloud size={15} /> Reinstall</button>
            </div>
          </div>
        </div>
      )}

      {/* Renew (RDP) modal */}
      {renewServer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setRenewServer(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-xl" onClick={(e) => e.stopPropagation()} data-testid="rdp-renew-modal">
            <div className="flex items-center justify-between px-6 py-4 border-b border-lightgray dark:border-gray-800">
              <h3 className="text-lg font-semibold text-primary dark:text-white">Renew RDP subscription</h3>
              <button onClick={() => setRenewServer(null)} className="text-secondary hover:text-primary dark:hover:text-white" aria-label="Close"><FiX size={22} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-secondary dark:text-gray-400">Extend your term and clear any grace period. Charged from the prepaid wallet — longer terms get a bundle discount (2&nbsp;mo −10%, 3&nbsp;mo −15%).</p>
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((m) => (
                  <button key={m} onClick={() => setRenewMonths(m)} className={`rounded-xl border px-3 py-3 text-sm font-semibold ${renewMonths === m ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand/15 dark:text-brand-200 dark:border-brand-500" : "border-line text-primary dark:border-gray-700 dark:text-white"}`} data-testid={`rdp-renew-months-${m}`}>{m} mo{m > 1 ? ` · -${m === 2 ? 10 : 15}%` : ""}</button>
                ))}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-lightgray dark:border-gray-800 flex justify-end gap-3">
              <button onClick={() => setRenewServer(null)} className="nw-btn-secondary nw-btn-sm">Cancel</button>
              <button disabled={busyId === renewServer + "renew"} onClick={doRenew} className="nw-btn-primary nw-btn-sm" data-testid="rdp-renew-confirm"><FiClock size={15} /> Renew {renewMonths} mo</button>
            </div>
          </div>
        </div>
      )}

      {/* Live provisioning status (RDP) */}
      {statusId && <RdpStatusModal id={statusId} onClose={() => setStatusId(null)} onRefresh={loadServers} />}

      {/* Sticky cart bar — a persistent, always-visible way to reach the cart
          and the crypto checkout after adding a plan (mirrors the domains page). */}
      {cart.count > 0 && (
        <div className={`fixed inset-x-0 bottom-0 z-40 border-t border-line dark:border-white/[0.08] bg-white/95 dark:bg-gray-950/95 backdrop-blur-md ${isAuthenticated ? "max-lg:bottom-[62px]" : ""}`} data-testid="server-cart-bar">
          <div className="nw-container flex items-center justify-between gap-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="nw-icon h-10 w-10 shrink-0"><FiShoppingCart size={18} /></span>
              <div className="min-w-0">
                <p className="whitespace-nowrap text-sm font-semibold text-primary dark:text-white" data-testid="server-cart-bar-count">{cart.count} item{cart.count === 1 ? "" : "s"} in cart</p>
                <p className="hidden truncate text-xs text-ink-soft dark:text-gray-400 sm:block">{cart.servers.map((s) => s.plan_name || s.plan_id).join(", ") || "Ready to checkout"}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <span className="hidden sm:block text-lg font-bold text-primary dark:text-white nw-mono" data-testid="server-cart-bar-total">{money(cart.subtotal)}</span>
              <button type="button" onClick={openCart} className="nw-btn-primary" data-testid="server-cart-bar-checkout">
                <span className="sm:hidden">Checkout · {money(cart.subtotal)}</span>
                <span className="hidden sm:inline">View cart &amp; checkout</span> <FiArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

    </ProductShell>
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

// Live "Windows is booting" status — polls GET /rdp/:id every ~10s and renders the
// provisioning block (stage, progress, ETA, 4-step timeline) until credentials are ready.
function RdpStatusModal({ id, onClose, onRefresh }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    let timer;
    const isDone = (d) => {
      const st = String(d?.status || d?.provisioning?.status || "").toLowerCase();
      return d?.credentials_ready === true || ["active", "failed", "destroyed"].includes(st);
    };
    const poll = async () => {
      try {
        const d = await resellerAPI.getRdp(id);
        if (!alive) return;
        setData(d);
        setErr(null);
        if (!isDone(d)) timer = setTimeout(poll, 10000);
        else if (typeof onRefresh === "function") onRefresh();
      } catch (_) {
        if (!alive) return;
        setErr("Could not load status. Retrying…");
        timer = setTimeout(poll, 12000);
      }
    };
    poll();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [id, onRefresh]);

  const prov = data?.provisioning || {};
  const steps = Array.isArray(prov.steps) ? prov.steps : [];
  const progress = Math.max(0, Math.min(100, Number(prov.progress) || 0));
  const statusLabel = prov.stage_label || prov.status || data?.status || "Loading…";
  const eta =
    prov.eta_seconds != null
      ? `${Math.max(0, Math.round(prov.eta_seconds / 60))} min`
      : prov.eta_minutes != null
      ? `${prov.eta_minutes} min`
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 shadow-xl" onClick={(e) => e.stopPropagation()} data-testid="rdp-status-modal">
        <div className="flex items-center justify-between px-6 py-4 border-b border-lightgray dark:border-gray-800">
          <h3 className="text-lg font-semibold text-primary dark:text-white flex items-center gap-2"><FiActivity className="text-brand" /> Windows provisioning status</h3>
          <button onClick={onClose} className="text-secondary hover:text-primary dark:hover:text-white" aria-label="Close"><FiX size={22} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {!data ? (
            <div className="h-24 animate-pulse rounded-xl bg-lightgray dark:bg-gray-800" />
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusStyle(data.status || prov.status)}`}>{data.status || prov.status || "unknown"}</span>
                {eta && !data.credentials_ready && <span className="text-sm text-secondary dark:text-gray-400">ETA ~{eta}</span>}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-primary dark:text-white">{statusLabel}</span>
                  <span className="text-sm text-secondary dark:text-gray-400">{progress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-lightgray dark:bg-gray-800">
                  <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
              {steps.length > 0 && (
                <ol className="space-y-2">
                  {steps.map((s, i) => (
                    <li key={s.key || i} className="flex items-center gap-2 text-sm">
                      {s.done ? (
                        <FiCheckCircle className="text-green-500 shrink-0" />
                      ) : s.current ? (
                        <FiRefreshCw className="text-brand animate-spin shrink-0" />
                      ) : (
                        <span className="h-4 w-4 rounded-full border border-line dark:border-gray-700 shrink-0" />
                      )}
                      <span className={s.done || s.current ? "text-primary dark:text-white" : "text-secondary dark:text-gray-500"}>{s.label || s.key}</span>
                    </li>
                  ))}
                </ol>
              )}
              {data.ip && <p className="text-sm text-secondary dark:text-gray-400">IP: <span className="font-mono text-primary dark:text-white">{data.ip}</span></p>}
              {data.credentials_ready && (
                <div className="flex items-center gap-2 rounded-xl border border-green-400/40 bg-green-50 dark:bg-green-500/10 px-4 py-3 text-sm text-green-800 dark:text-green-200">
                  <FiCheckCircle className="shrink-0" /> Your server is ready — open Credentials to log in.
                </div>
              )}
              {err && <p className="text-xs text-amber-600 dark:text-amber-300">{err}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
