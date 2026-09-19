import React, { useCallback, useEffect, useState } from "react";
import ProductShell from "../components/layout/ProductShell";
import EmptyState from "../components/common/EmptyState";
import resellerAPI from "../api/reseller";
import WalletNudge from "../components/reseller/WalletNudge";
import CpanelTabs from "../components/hosting/CpanelTabs";
import { useAlert } from "../context/AlertContext";
import { usePageMeta } from "../hooks/usePageMeta";
import { useBuyer } from "../hooks/useBuyer";
import { useCart } from "../hooks/useCart";
import { Link, useNavigate } from "react-router";
import {
  FiShield,
  FiGlobe,
  FiCheck,
  FiX,
  FiRefreshCw,
  FiTrash2,
  FiLock,
  FiExternalLink,
  FiAlertTriangle,
  FiPauseCircle,
  FiPlayCircle,
  FiServer,
  FiStar,
  FiSettings,
} from "react-icons/fi";

const money = (n) =>
  n === null || n === undefined || isNaN(Number(n))
    ? "—"
    : `$${Number(n).toFixed(2)}`;

const tierStyle = (tier = "") => {
  const t = String(tier).toLowerCase();
  if (t === "gold")
    return "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300";
  if (t === "premium")
    return "bg-brand-50 text-brand-700 dark:bg-brand/15 dark:text-brand-200";
  return "bg-lightgray text-primary dark:bg-gray-800 dark:text-white";
};

const durationLabel = (days) => {
  if (!days) return "";
  if (days % 30 === 0) return `${days / 30} month${days / 30 > 1 ? "s" : ""}`;
  if (days % 7 === 0) return `${days / 7} week${days / 7 > 1 ? "s" : ""}`;
  return `${days} days`;
};

const PlanSkeleton = () => (
  <div className="rounded-2xl border border-line dark:border-gray-800 p-6 animate-pulse">
    <div className="h-5 w-40 bg-lightgray dark:bg-gray-800 rounded mb-4" />
    <div className="h-8 w-28 bg-lightgray dark:bg-gray-800 rounded mb-4" />
    <div className="h-3 w-32 bg-lightgray dark:bg-gray-800 rounded mb-2" />
    <div className="h-3 w-28 bg-lightgray dark:bg-gray-800 rounded mb-2" />
    <div className="h-3 w-36 bg-lightgray dark:bg-gray-800 rounded mb-6" />
    <div className="h-9 w-full bg-lightgray dark:bg-gray-800 rounded" />
  </div>
);

const Row = ({ label, value }) => (
  <div className="flex items-center justify-between gap-4">
    <span className="text-secondary dark:text-gray-400">{label}</span>
    <span className="font-mono text-primary dark:text-white break-all text-right">{value}</span>
  </div>
);

export default function HostingNomadly() {
  usePageMeta("Offshore cPanel Hosting", "Anti-Red cPanel hosting from a privacy-respecting jurisdiction.");
  const { showAlert } = useAlert();
  const { isAuthenticated, mode, balance } = useBuyer();
  const navigate = useNavigate();
  const cart = useCart();

  const [platform, setPlatform] = useState(null);
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState(null);

  const [accountsMeta, setAccountsMeta] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(true);

  // Add-to-cart modal
  const [buyPlan, setBuyPlan] = useState(null);
  const [domain, setDomain] = useState("");
  const [domainMode, setDomainMode] = useState("byo");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState(null);

  // Account actions
  const [busyUser, setBusyUser] = useState(null);
  const [confirmUser, setConfirmUser] = useState(null);
  const [creds, setCreds] = useState(null);

  // Manage panel (4d: details/usage, upgrade, addon domains, Visitor Captcha)
  const [manage, setManage] = useState(null); // { user, domain, plan_id }
  const [manageData, setManageData] = useState(null); // hosting details
  const [manageAddons, setManageAddons] = useState(null);
  const [manageCaptcha, setManageCaptcha] = useState(null);
  const [manageLoading, setManageLoading] = useState(false);
  const [manageBusy, setManageBusy] = useState(null); // 'upgrade' | 'addon' | 'captcha'
  const [manageTab, setManageTab] = useState("overview"); // 'overview' | 'advanced'
  const [addonInput, setAddonInput] = useState("");
  const [addonResult, setAddonResult] = useState(null); // {domain, owned, ns_pointed, nameservers, note}
  const [upgradePlan, setUpgradePlan] = useState("");

  const loadPlans = useCallback(async () => {
    setPlansLoading(true);
    setPlansError(null);
    try {
      const data = await resellerAPI.getHostingPlans();
      setPlatform(data?.platform || null);
      setPlans(Array.isArray(data?.plans) ? data.plans : []);
    } catch (err) {
      setPlansError(err?.response?.data?.message || "Could not load hosting plans. Please retry.");
      setPlans([]);
    } finally {
      setPlansLoading(false);
    }
  }, []);

  const loadAccounts = useCallback(async () => {
    setAccountsLoading(true);
    try {
      const data = await resellerAPI.listHosting();
      setAccountsMeta({ panel_url: data?.panel_url, server_ip: data?.server_ip });
      setAccounts(Array.isArray(data?.accounts) ? data.accounts : []);
    } catch (_) {
      setAccounts([]);
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  useEffect(() => {
    if (isAuthenticated) loadAccounts();
  }, [isAuthenticated, loadAccounts]);

  const openBuy = (plan) => {
    setBuyPlan(plan);
    setDomain("");
    setDomainMode("byo");
    setAddError(null);
  };

  const closeBuy = () => {
    setBuyPlan(null);
    setAddError(null);
    setAdding(false);
  };

  const DOMAIN_RE = /^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

  // Wire "Select plan" into the shared checkout cart (Hostinger-style funnel).
  // BYO: attach hosting to a domain the customer already owns (they point our
  // nameservers afterwards). Register-new: price the domain live and add both
  // the registration and the hosting to the cart.
  const addPlanToCart = async () => {
    if (!buyPlan) return;
    const d = domain.trim().toLowerCase();
    if (!DOMAIN_RE.test(d)) {
      setAddError("Please enter a valid domain, e.g. mysite.com");
      return;
    }
    setAdding(true);
    setAddError(null);
    try {
      if (domainMode === "buy") {
        const res = await resellerAPI.searchDomain(d);
        if (!res?.available) {
          setAddError(`${d} isn't available to register. Switch to "I already own it" to host it, or try another name.`);
          setAdding(false);
          return;
        }
        cart.addDomain({ domain: d, price_usd: res.price_usd, registrar: res.registrar });
      }
      cart.addHosting({ domain: d, plan: buyPlan });
      showAlert(`${buyPlan.name || "Hosting"} added to cart for ${d}`, { type: "success" });
      setBuyPlan(null);
      navigate(isAuthenticated ? "/cart" : "/checkout/account");
    } catch (err) {
      setAddError(err?.response?.data?.message || "Could not add this plan to your cart. Please try again.");
    } finally {
      setAdding(false);
    }
  };

  const doSuspend = async (user) => {
    setBusyUser(user + "suspend");
    try {
      await resellerAPI.suspendHosting(user);
      showAlert("Account suspended.", { type: "success" });
      loadAccounts();
    } catch (err) {
      showAlert(err?.response?.data?.message || "Failed to suspend.", { type: "fail" });
    } finally {
      setBusyUser(null);
    }
  };

  const doUnsuspend = async (user) => {
    setBusyUser(user + "unsuspend");
    try {
      await resellerAPI.unsuspendHosting(user);
      showAlert("Account unsuspended.", { type: "success" });
      loadAccounts();
    } catch (err) {
      showAlert(err?.response?.data?.message || "Failed to unsuspend.", { type: "fail" });
    } finally {
      setBusyUser(null);
    }
  };

  const doTerminate = async (user) => {
    setBusyUser(user + "terminate");
    try {
      await resellerAPI.terminateHosting(user);
      showAlert("Account terminated.", { type: "success" });
      setConfirmUser(null);
      loadAccounts();
    } catch (err) {
      showAlert(err?.response?.data?.message || "Failed to terminate.", { type: "fail" });
    } finally {
      setBusyUser(null);
    }
  };

  const doLogin = async (user) => {
    setBusyUser(user + "login");
    try {
      const data = await resellerAPI.hostingLogin(user);
      if (data?.login_url) {
        window.open(data.login_url, "_blank", "noopener,noreferrer");
      } else {
        showAlert(data?.note || "One-click login is only available in live mode.", { type: "info" });
      }
    } catch (err) {
      showAlert(err?.response?.data?.message || "Could not generate login link.", { type: "fail" });
    } finally {
      setBusyUser(null);
    }
  };

  const revealCreds = async (user) => {
    setBusyUser(user + "creds");
    try {
      const data = await resellerAPI.getHostingCredentials(user);
      setCreds({ user, ...(data || {}) });
    } catch (err) {
      const data = err?.response?.data;
      setCreds({ user, _error: true, ...(data || { message: "Could not fetch credentials." }) });
    } finally {
      setBusyUser(null);
    }
  };

  // ---- Manage panel (4d) ----
  const openManage = async (a) => {
    const user = a.username;
    setManage({ user, domain: a.domain || null, plan_id: a.plan_id || null });
    setManageTab("overview");
    setManageData(null);
    setManageAddons(null);
    setManageCaptcha(null);
    setUpgradePlan("");
    setAddonInput("");
    setAddonResult(null);
    setManageLoading(true);
    try {
      const [details, addons] = await Promise.all([
        resellerAPI.getHostingDetails(user).catch(() => null),
        resellerAPI.listHostingAddons(user).catch(() => null),
      ]);
      setManageData(details);
      setManageAddons(addons);
      // Captcha status only makes sense for a domain (Gold plan exclusive).
      if (a.domain) {
        try {
          setManageCaptcha(await resellerAPI.getHostingCaptcha(a.domain));
        } catch { /* not eligible / not gold — leave null */ }
      }
    } finally {
      setManageLoading(false);
    }
  };
  const closeManage = () => {
    setManage(null);
    setManageData(null);
    setManageAddons(null);
    setManageCaptcha(null);
  };
  const doUpgrade = async () => {
    if (!manage || !upgradePlan) return;
    setManageBusy("upgrade");
    try {
      const res = await resellerAPI.upgradeHosting(manage.user, upgradePlan);
      if (res?.mode === "dry_run") {
        showAlert("Test mode — upgrades apply once a live account is provisioned.", { type: "success" });
      } else {
        showAlert(`Upgraded${res?.charged_usd != null ? ` — charged ${money(res.charged_usd)}` : ""}.`, { type: "success" });
        window.dispatchEvent(new Event("wallet:updated"));
      }
      loadAccounts();
      openManage({ username: manage.user, domain: manage.domain, plan_id: upgradePlan });
    } catch (err) {
      const d = err?.response?.data;
      showAlert(d?.message || "Upgrade failed.", { type: "fail" });
    } finally {
      setManageBusy(null);
    }
  };
  const doAddAddon = async () => {
    const d = addonInput.trim().toLowerCase();
    if (!manage || !d) return;
    setManageBusy("addon");
    setAddonResult(null);
    try {
      const res = await resellerAPI.addHostingAddon(manage.user, d);
      const connect = res?.connect || null;
      setAddonResult(connect);
      if (connect?.ns_pointed) {
        showAlert(`Connected ${d} — nameservers now point to your hosting.`, { type: "success" });
      } else if (connect?.nameservers?.length) {
        showAlert(`Attached ${d}. Set the nameservers shown below at your registrar to finish.`, { type: "success" });
      } else {
        showAlert(`Addon domain ${d} attached.`, { type: "success" });
      }
      setAddonInput("");
      setManageAddons(await resellerAPI.listHostingAddons(manage.user).catch(() => manageAddons));
    } catch (err) {
      const e = err?.response?.data;
      showAlert(e?.message || "Could not add the addon domain.", { type: "fail" });
    } finally {
      setManageBusy(null);
    }
  };
  const toggleCaptcha = async () => {
    if (!manage?.domain) return;
    const next = !(manageCaptcha?.visitor_captcha_enabled);
    setManageBusy("captcha");
    try {
      const res = await resellerAPI.setHostingCaptcha(manage.domain, next);
      setManageCaptcha((c) => ({ ...(c || {}), visitor_captcha_enabled: res?.visitor_captcha_enabled ?? next }));
      showAlert(next ? "Visitor Captcha turned on." : "Visitor Captcha turned off.", { type: "success" });
    } catch (err) {
      const e = err?.response?.data;
      showAlert(e?.message || "Visitor Captcha is only available on a live Gold-plan domain.", { type: "fail" });
    } finally {
      setManageBusy(null);
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
              <span className="nw-eyebrow mb-4">Offshore cPanel Hosting</span>
              <h1 className="max-w-2xl text-3xl font-bold leading-tight tracking-tight text-primary dark:text-white sm:text-4xl">
                Anti-Red hosting, wallet-billed
              </h1>
              <p className="mt-3 max-w-xl nw-lead">
                The control panel you already know — served from a privacy-respecting jurisdiction, with
                Anti-Red protection built in. Bring your own domain or register one in the same step.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="nw-chip"><FiShield className="h-4 w-4 text-brand-600 dark:text-brand-400" /> Anti-Red protection</span>
                <span className="nw-chip"><FiGlobe className="h-4 w-4 text-brand-600 dark:text-brand-400" /> Offshore jurisdiction</span>
                <span className="nw-chip"><FiLock className="h-4 w-4 text-brand-600 dark:text-brand-400" /> Visitor Captcha + Geo</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isAuthenticated && balance != null && (
                <Link to="/wallet" className="nw-card !px-4 !py-3 text-right hover:border-brand/40" data-testid="user-wallet-chip">
                  <p className="font-mono text-[11px] uppercase tracking-wider text-ink-soft dark:text-gray-400">Your wallet</p>
                  <p className="font-mono text-lg font-bold text-primary dark:text-white">{money(balance)}</p>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <main className="nw-container py-12">
        {/* Mode banner */}
        {isAuthenticated && mode === "dry_run" && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-400/40 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 mb-8" data-testid="dry-run-banner">
            <FiAlertTriangle className="text-amber-600 dark:text-amber-300 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <span className="font-semibold">Test mode.</span> Test mode is on — orders are validated and priced, but no account is provisioned yet.
            </p>
          </div>
        )}

        {/* Plans */}
        <section className="mb-14">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold text-primary dark:text-white">Choose a plan</h2>
            <button onClick={loadPlans} className="flex items-center gap-2 text-sm text-darkbtn hover:text-darkbtn-hover font-medium">
              <FiRefreshCw size={15} /> Refresh
            </button>
          </div>

          {plansLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[0, 1, 2].map((i) => <PlanSkeleton key={i} />)}
            </div>
          ) : plansError ? (
            <div className="flex flex-col items-center justify-center text-center rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 py-12 px-6">
              <FiAlertTriangle className="text-red-500 mb-3" size={28} />
              <p className="text-primary dark:text-white font-medium mb-1">{plansError}</p>
              <button onClick={loadPlans} className="nw-btn-primary nw-btn-sm mt-3">Retry</button>
            </div>
          ) : plans.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center rounded-2xl border border-line dark:border-gray-800 py-12 px-6">
              <FiServer className="text-ink-soft mb-3" size={28} />
              <p className="text-primary dark:text-white font-medium">No hosting plans available right now.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((p) => {
                const isGold = String(p.tier).toLowerCase() === "gold";
                return (
                  <div
                    key={p.plan_id}
                    className={`nw-card nw-card-hover !p-6 relative flex flex-col ${isGold ? "ring-2 ring-amber-400/60 dark:ring-amber-500/40" : ""}`}
                  >
                    {isGold && (
                      <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-amber-400 px-3 py-1 text-xs font-semibold text-amber-950 shadow">
                        <FiStar size={12} /> Most protection
                      </span>
                    )}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-primary dark:text-white">{p.name || p.plan_id}</h3>
                        {p.duration_days ? <p className="font-mono text-[11px] uppercase tracking-wider text-ink-soft dark:text-gray-500 mt-0.5">{durationLabel(p.duration_days)} plan</p> : null}
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${tierStyle(p.tier)}`}>{p.tier}</span>
                    </div>

                    <div className="mb-4">
                      <span className="text-3xl font-bold text-primary dark:text-white">{money(p.price_usd)}</span>
                      {p.duration_days ? (
                        <span className="text-ink-soft dark:text-gray-400 text-sm"> / {durationLabel(p.duration_days)}</span>
                      ) : null}
                    </div>

                    <ul className="space-y-2 mb-5 flex-1">
                      {(p.features || []).map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-secondary dark:text-gray-300">
                          <FiCheck className="shrink-0 mt-0.5 text-brand-600 dark:text-brand-400" size={15} />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="flex flex-wrap gap-2 mb-5">
                      <span className="nw-chip !text-xs">
                        {p.addon_domains === "unlimited"
                          ? "Unlimited addon domains"
                          : `${p.addon_domains} addon domain${p.addon_domains === 1 ? "" : "s"}`}
                      </span>
                      {p.visitor_captcha_available && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                          <FiShield size={12} /> Visitor Captcha + Geo
                        </span>
                      )}
                    </div>

                    <button onClick={() => openBuy(p)} className="nw-btn-primary w-full justify-center">Select plan</button>
                  </div>
                );
              })}
            </div>
          )}

          {platform && (
            <p className="mt-4 text-xs text-ink-soft dark:text-gray-500">
              {platform.offshore_hosting_on ? "Offshore hosting is online. " : ""}
              {platform.hosting_trial_on ? "Free trial available. " : ""}
            </p>
          )}
        </section>

        {/* My hosting accounts (signed-in only) */}
        {isAuthenticated && <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold text-primary dark:text-white">Your hosting accounts</h2>
            <button onClick={loadAccounts} className="flex items-center gap-2 text-sm text-darkbtn hover:text-darkbtn-hover font-medium">
              <FiRefreshCw size={15} /> Refresh
            </button>
          </div>

          {accountsMeta && (accountsMeta.panel_url || accountsMeta.server_ip) && (
            <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-secondary dark:text-gray-400">
              {accountsMeta.panel_url && (
                <span>Panel: <a href={accountsMeta.panel_url} target="_blank" rel="noopener noreferrer" className="text-brand-600 dark:text-brand-400 hover:underline">{accountsMeta.panel_url}</a></span>
              )}
              {accountsMeta.server_ip && <span>Server IP: <span className="text-primary dark:text-white font-medium">{accountsMeta.server_ip}</span></span>}
            </div>
          )}

          {accountsLoading ? (
            <div className="space-y-3">
              {[0, 1].map((i) => <div key={i} className="h-20 rounded-xl border border-lightgray dark:border-gray-800 animate-pulse" />)}
            </div>
          ) : accounts.length === 0 ? (
            <EmptyState
              compact
              icon={FiServer}
              title="No hosting accounts yet"
              description="Spin up cPanel hosting on an offshore, privacy‑first server. Pick a plan above and pay from your prepaid wallet."
              primaryLabel="Choose a plan"
              onPrimary={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            />
          ) : (
            <div className="space-y-4">
              {accounts.map((a) => {
                const user = a.username;
                return (
                  <div key={user} className="nw-card !p-5 flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-semibold text-primary dark:text-white">{a.domain || user}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${a.suspended ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"}`}>
                          {a.suspended ? "Suspended" : "Active"}
                        </span>
                      </div>
                      <div className="flex items-center gap-x-6 gap-y-1 flex-wrap text-sm text-secondary dark:text-gray-400 mt-1">
                        <span>User: <span className="text-primary dark:text-white font-medium">{user}</span></span>
                        {a.plan && <span>{String(a.plan).replace(/-/g, " ")}</span>}
                        {a.expires_at && <span>Expires: {new Date(a.expires_at).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button disabled={busyUser === user + "login"} onClick={() => doLogin(user)} title="Open cPanel" className="flex items-center gap-1.5 p-2 rounded-md border border-lightgray dark:border-gray-800 text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-gray-800 disabled:opacity-50"><FiExternalLink size={16} /> <span className="text-sm">Login</span></button>
                      <button onClick={() => openManage(a)} title="Manage plan, addons & captcha" className="flex items-center gap-1.5 p-2 rounded-md border border-lightgray dark:border-gray-800 text-primary dark:text-white hover:bg-hover dark:hover:bg-gray-800" data-testid={`hosting-manage-${user}`}><FiSettings size={16} /> <span className="text-sm">Manage</span></button>
                      <button disabled={busyUser === user + "creds"} onClick={() => revealCreds(user)} title="Credentials" className="flex items-center gap-1.5 p-2 rounded-md border border-lightgray dark:border-gray-800 text-primary dark:text-white hover:bg-hover dark:hover:bg-gray-800 disabled:opacity-50"><FiLock size={16} /> <span className="text-sm">Credentials</span></button>
                      {a.suspended ? (
                        <button disabled={busyUser === user + "unsuspend"} onClick={() => doUnsuspend(user)} title="Unsuspend" className="p-2 rounded-md border border-lightgray dark:border-gray-800 text-green-600 hover:bg-green-50 dark:hover:bg-gray-800 disabled:opacity-50"><FiPlayCircle size={16} /></button>
                      ) : (
                        <button disabled={busyUser === user + "suspend"} onClick={() => doSuspend(user)} title="Suspend" className="p-2 rounded-md border border-lightgray dark:border-gray-800 text-amber-600 hover:bg-amber-50 dark:hover:bg-gray-800 disabled:opacity-50"><FiPauseCircle size={16} /></button>
                      )}
                      {confirmUser === user ? (
                        <span className="flex items-center gap-1">
                          <button disabled={busyUser === user + "terminate"} onClick={() => doTerminate(user)} className="px-3 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm">Confirm</button>
                          <button onClick={() => setConfirmUser(null)} className="px-3 py-2 rounded-md border border-lightgray dark:border-gray-800 text-sm text-primary dark:text-white">Cancel</button>
                        </span>
                      ) : (
                        <button onClick={() => setConfirmUser(user)} title="Terminate" className="p-2 rounded-md border border-lightgray dark:border-gray-800 text-red-600 hover:bg-red-50 dark:hover:bg-gray-800"><FiTrash2 size={16} /></button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>}
      </main>

      {/* Buy modal */}
      {buyPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={closeBuy}>
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-lightgray dark:border-gray-800">
              <h3 className="text-lg font-semibold text-primary dark:text-white">Add {buyPlan.name || buyPlan.plan_id}</h3>
              <button onClick={closeBuy} className="text-secondary hover:text-primary dark:hover:text-white" aria-label="Close"><FiX size={22} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="rounded-lg bg-lightgray-200 dark:bg-gray-800 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-primary dark:text-white capitalize">{buyPlan.tier} · {durationLabel(buyPlan.duration_days)}</span>
                  <span className="font-bold text-primary dark:text-white">{money(buyPlan.price_usd)}</span>
                </div>
                <p className="text-xs text-secondary dark:text-gray-400 mt-1">
                  {buyPlan.addon_domains === "unlimited" ? "Unlimited addon domains" : `${buyPlan.addon_domains} addon domains`}
                  {buyPlan.visitor_captcha_available ? " · Visitor Captcha + Geo" : ""}
                </p>
              </div>

              <div>
                <label htmlFor="h-domain" className="block text-sm font-medium text-primary dark:text-white mb-1">Primary domain</label>
                <input id="h-domain" value={domain} onChange={(e) => { setDomain(e.target.value); setAddError(null); }} placeholder="mysite.com" className="w-full rounded-xl border border-line dark:border-gray-700 bg-white dark:bg-gray-800 text-primary dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/15" />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary dark:text-white mb-1">Domain</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => { setDomainMode("byo"); setAddError(null); }} className={`rounded-xl border px-3 py-2.5 text-sm font-medium ${domainMode === "byo" ? "border-brand bg-brand-50 text-brand-700 dark:bg-brand/15 dark:text-brand-200 dark:border-brand" : "border-line dark:border-gray-700 text-primary dark:text-white"}`}>I already own it</button>
                  <button type="button" onClick={() => { setDomainMode("buy"); setAddError(null); }} className={`rounded-xl border px-3 py-2.5 text-sm font-medium ${domainMode === "buy" ? "border-brand bg-brand-50 text-brand-700 dark:bg-brand/15 dark:text-brand-200 dark:border-brand" : "border-line dark:border-gray-700 text-primary dark:text-white"}`}>Register new</button>
                </div>
                {domainMode === "byo" ? (
                  <p className="text-xs text-secondary dark:text-gray-400 mt-1.5">
                    After payment we&apos;ll show the nameservers to set on your domain — point them at us and your site goes live.
                  </p>
                ) : (
                  <p className="text-xs text-secondary dark:text-gray-400 mt-1.5">We&apos;ll check availability and add the domain registration (1 year) to your cart alongside hosting.</p>
                )}
              </div>

              <WalletNudge balance={balance} price={buyPlan.price_usd} />

              {addError && (
                <div className="rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
                  <FiAlertTriangle className="mt-0.5 shrink-0" /> <span>{addError}</span>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-lightgray dark:border-gray-800 flex justify-end gap-3">
              <button onClick={closeBuy} className="px-4 py-2 rounded-md border border-lightgray dark:border-gray-800 text-primary dark:text-white text-sm font-medium">Cancel</button>
              <button onClick={addPlanToCart} disabled={adding} className="px-5 py-2 rounded-md bg-darkbtn hover:bg-darkbtn-hover text-white text-sm font-medium disabled:opacity-60 inline-flex items-center gap-2">
                {adding ? "Adding…" : `Add to cart · ${money(buyPlan.price_usd)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credentials modal */}
      {creds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setCreds(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-lightgray dark:border-gray-800">
              <h3 className="text-lg font-semibold text-primary dark:text-white">cPanel credentials</h3>
              <button onClick={() => setCreds(null)} className="text-secondary hover:text-primary dark:hover:text-white" aria-label="Close"><FiX size={22} /></button>
            </div>
            <div className="px-6 py-5 space-y-3 text-sm">
              {creds._error ? (
                <p className="text-secondary dark:text-gray-400">{creds.message || "Credentials are not available."}</p>
              ) : (
                <>
                  <Row label="User" value={creds.username || creds.user} />
                  {creds.panel_url && <Row label="Panel URL" value={creds.panel_url} />}
                  {creds.server_ip && <Row label="Server IP" value={creds.server_ip} />}
                  {Array.isArray(creds.nameservers) && creds.nameservers.length > 0 && (
                    <Row label="Nameservers" value={creds.nameservers.join(", ")} />
                  )}
                  <Row label="Panel PIN" value={creds.panel_pin || (creds.mode === "dry_run" ? "(only shown in live mode)" : "—")} />
                  {creds.direct_cpanel_login_url && (
                    <div className="pt-1">
                      <a href={creds.direct_cpanel_login_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-brand-600 dark:text-brand-400 hover:underline font-medium"><FiExternalLink size={14} /> Open cPanel</a>
                    </div>
                  )}
                  {creds.note && <p className="text-xs text-secondary dark:text-gray-400 pt-1 border-t border-lightgray dark:border-gray-800 mt-2">{creds.note}</p>}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manage modal (4d): details/usage, upgrade, addon domains, Visitor Captcha */}
      {manage && (
        <div className="fixed inset-0 z-[60] flex bg-black/60" onClick={closeManage}>
          <div className="w-full h-full sm:h-[94vh] sm:max-w-6xl sm:m-auto sm:rounded-2xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()} data-testid="hosting-manage-modal">
            <div className="flex items-center justify-between px-6 py-4 border-b border-lightgray dark:border-gray-800 shrink-0">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-primary dark:text-white truncate">Manage {manage.domain || manage.user}</h3>
                <p className="text-xs text-secondary dark:text-gray-400 truncate">cPanel account: {manage.user}</p>
              </div>
              <button onClick={closeManage} className="text-secondary hover:text-primary dark:hover:text-white" aria-label="Close" data-testid="hosting-manage-close"><FiX size={22} /></button>
            </div>
            {/* Overview / Advanced switch */}
            <div className="flex items-center gap-2 px-6 pt-4 shrink-0">
              <button onClick={() => setManageTab("overview")} data-testid="manage-tab-overview" className={`rounded-lg px-3 py-1.5 text-sm font-medium ${manageTab === "overview" ? "bg-brand-600 text-white dark:bg-brand-500" : "text-secondary dark:text-gray-400 hover:bg-lightgray dark:hover:bg-gray-800"}`}>Overview</button>
              <button onClick={() => setManageTab("advanced")} data-testid="manage-tab-advanced" className={`rounded-lg px-3 py-1.5 text-sm font-medium ${manageTab === "advanced" ? "bg-brand-600 text-white dark:bg-brand-500" : "text-secondary dark:text-gray-400 hover:bg-lightgray dark:hover:bg-gray-800"}`}>Advanced cPanel</button>
            </div>
            <div className="flex-1 overflow-y-auto">
            {manageTab === "advanced" ? (
              <div className="px-6 py-5">
                <CpanelTabs
                  user={manage.user}
                  domain={manage.domain}
                  isGold={/gold/i.test(String(manageData?.plan || manage.plan_id || ""))}
                  onUpgrade={() => {
                    setManageTab("overview");
                    const gp = plans.find(
                      (p) =>
                        String(p.tier || "").toLowerCase() === "gold" ||
                        /gold/i.test(p.plan_id || "") ||
                        /golden/i.test(p.name || "")
                    );
                    if (gp) setUpgradePlan(gp.plan_id);
                  }}
                />
              </div>
            ) : (
            <div className="px-6 py-5 space-y-5 text-sm">
              {manageLoading ? (
                <p className="text-secondary dark:text-gray-400 flex items-center gap-2"><FiRefreshCw className="animate-spin" size={15} /> Loading account…</p>
              ) : (
                <>
                  {manageData?.mode === "dry_run" && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-400/40 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-amber-800 dark:text-amber-200">
                      <FiAlertTriangle className="mt-0.5 shrink-0" size={15} />
                      <span className="text-xs">Test mode — plan, addons and captcha changes apply once a live account is provisioned.</span>
                    </div>
                  )}

                  {/* Overview */}
                  <div className="grid grid-cols-2 gap-3">
                    <Row label="Plan" value={String(manageData?.plan || manage.plan_id || "—").replace(/-/g, " ")} />
                    <Row label="Status" value={manageData?.suspended ? "Suspended" : (manageData?.status === "test_mode" ? "Test mode" : "Active")} />
                    <Row label="Expires" value={manageData?.expires_at ? new Date(manageData.expires_at).toLocaleDateString() : "—"} />
                    <Row label="Server IP" value={manageData?.deliverables?.server_ip || "—"} />
                  </div>
                  {manageData?.usage && (
                    <div>
                      <p className="text-xs font-medium text-secondary dark:text-gray-400 mb-1">Disk usage</p>
                      <div className="h-2 rounded-full bg-lightgray dark:bg-gray-800 overflow-hidden">
                        <div className="h-full bg-brand-600 dark:bg-brand-500" style={{ width: `${Math.min(100, Math.round(manageData.usage.disk_used_pct || 0))}%` }} />
                      </div>
                      <p className="text-xs text-secondary dark:text-gray-400 mt-1">{Math.round(manageData.usage.disk_used_mb || 0)} MB used ({Math.round(manageData.usage.disk_used_pct || 0)}%)</p>
                    </div>
                  )}

                  {/* Upgrade */}
                  <div className="border-t border-lightgray dark:border-gray-800 pt-4">
                    <p className="font-medium text-primary dark:text-white mb-2">Upgrade plan</p>
                    <div className="flex items-center gap-2">
                      <select value={upgradePlan} onChange={(e) => setUpgradePlan(e.target.value)} className="nw-input !py-2 !px-3 text-sm flex-1" data-testid="hosting-upgrade-select">
                        <option value="">Choose a plan…</option>
                        {plans.filter((p) => p.plan_id !== (manageData?.plan_id || manage.plan_id)).map((p) => (
                          <option key={p.plan_id} value={p.plan_id}>{p.name} — {money(p.price_usd)}</option>
                        ))}
                      </select>
                      <button onClick={doUpgrade} disabled={!upgradePlan || manageBusy === "upgrade"} className="nw-btn-primary nw-btn-sm disabled:opacity-50" data-testid="hosting-upgrade-btn">
                        {manageBusy === "upgrade" ? "…" : "Upgrade"}
                      </button>
                    </div>
                  </div>

                  {/* Addon domains */}
                  <div className="border-t border-lightgray dark:border-gray-800 pt-4">
                    <p className="font-medium text-primary dark:text-white mb-2">Addon domains {manageAddons?.addon_quota != null && <span className="text-xs text-secondary dark:text-gray-400">(quota: {String(manageAddons.addon_quota)})</span>}</p>
                    {Array.isArray(manageAddons?.addons) && manageAddons.addons.length > 0 ? (
                      <ul className="mb-2 space-y-1">
                        {manageAddons.addons.map((ad, i) => (
                          <li key={i} className="flex items-center gap-2 text-secondary dark:text-gray-300"><FiGlobe size={13} /> {ad.domain || ad}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-secondary dark:text-gray-400 mb-2">No addon domains yet.</p>
                    )}
                    <div className="flex items-center gap-2">
                      <input value={addonInput} onChange={(e) => setAddonInput(e.target.value)} placeholder="blog.example.com" className="nw-input !py-2 !px-3 text-sm flex-1" data-testid="hosting-addon-input" />
                      <button onClick={doAddAddon} disabled={!addonInput.trim() || manageBusy === "addon"} className="nw-btn-secondary nw-btn-sm disabled:opacity-50" data-testid="hosting-addon-btn">
                        {manageBusy === "addon" ? "…" : "Add"}
                      </button>
                    </div>
                    {addonResult && (
                      <div className={`mt-3 rounded-lg border px-3 py-2.5 text-xs ${addonResult.ns_pointed ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-900/20" : "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20"}`} data-testid="hosting-addon-result">
                        <p className={`font-medium ${addonResult.ns_pointed ? "text-green-700 dark:text-green-300" : "text-amber-800 dark:text-amber-200"}`}>
                          {addonResult.ns_pointed ? "✓ " : ""}{addonResult.note}
                        </p>
                        {!addonResult.ns_pointed && Array.isArray(addonResult.nameservers) && addonResult.nameservers.length > 0 && (
                          <ul className="mt-2 space-y-1" data-testid="hosting-addon-ns">
                            {addonResult.nameservers.map((ns, i) => (
                              <li key={i} className="flex items-center gap-2 font-mono text-secondary dark:text-gray-300"><FiGlobe size={12} /> {ns}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Visitor Captcha (Gold only) */}
                  {manage.domain && (
                    <div className="border-t border-lightgray dark:border-gray-800 pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-primary dark:text-white flex items-center gap-1.5"><FiShield size={15} /> Visitor Captcha + Geo</p>
                          <p className="text-xs text-secondary dark:text-gray-400 mt-0.5">Golden Anti-Red exclusive · requires the domain on Cloudflare.</p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={!!manageCaptcha?.visitor_captcha_enabled}
                          disabled={manageBusy === "captcha"}
                          onClick={toggleCaptcha}
                          data-testid="hosting-captcha-toggle"
                          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${manageCaptcha?.visitor_captcha_enabled ? "bg-brand-600 dark:bg-brand-500" : "bg-gray-300 dark:bg-gray-600"}`}
                        >
                          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${manageCaptcha?.visitor_captcha_enabled ? "translate-x-5" : "translate-x-0.5"}`} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            )}
            </div>
          </div>
        </div>
      )}

    </ProductShell>
  );
}