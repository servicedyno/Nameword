import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import resellerAPI from "../api/reseller";
import WalletNudge from "../components/reseller/WalletNudge";
import { useAlert } from "../context/AlertContext";
import { usePageMeta } from "../hooks/usePageMeta";
import {
  FiSearch,
  FiGlobe,
  FiCheckCircle,
  FiX,
  FiAlertTriangle,
  FiRefreshCw,
  FiSettings,
  FiShoppingCart,
} from "react-icons/fi";

const money = (n) =>
  n === null || n === undefined || isNaN(Number(n)) ? "—" : `$${Number(n).toFixed(2)}`;

// Single availability/result row. Defined at module scope so React keeps it stable.
function ResultCard({ domain, available, price_usd, registrar, onRegister }) {
  return (
    <div className="nw-card !p-4 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-primary dark:text-white truncate">{domain}</span>
          {available ? (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">Available</span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300">Taken</span>
          )}
          {registrar && <span className="text-xs text-ink-soft dark:text-gray-500">{registrar}</span>}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {available && <span className="font-bold text-primary dark:text-white">{money(price_usd)}<span className="text-secondary text-xs font-normal">/yr</span></span>}
        {available && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRegister(domain, price_usd);
            }}
            className="nw-btn-primary nw-btn-sm"
          >
            <FiShoppingCart size={15} /> Register
          </button>
        )}
      </div>
    </div>
  );
}

export default function DomainsNomadly() {
  usePageMeta("Domains", "Search, register and manage domains — wallet-billed at the live registrar price.");
  const { showAlert } = useAlert();

  const [mode, setMode] = useState(null);
  const [account, setAccount] = useState(null);

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [exact, setExact] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [searched, setSearched] = useState(false);

  const [domains, setDomains] = useState([]);
  const [domainsLoading, setDomainsLoading] = useState(true);

  // register modal
  const [reg, setReg] = useState(null); // { domain, price_usd }
  const [nsChoice, setNsChoice] = useState("cloudflare");
  const [customNs, setCustomNs] = useState("");
  const [registering, setRegistering] = useState(false);
  const [regResult, setRegResult] = useState(null);

  const loadMeta = useCallback(async () => {
    try {
      const [h, a] = await Promise.allSettled([resellerAPI.getHealth(), resellerAPI.getAccount()]);
      if (h.status === "fulfilled") setMode(h.value?.mode || null);
      if (a.status === "fulfilled") setAccount(a.value || null);
    } catch (_) {
      /* non-blocking */
    }
  }, []);

  const loadDomains = useCallback(async () => {
    setDomainsLoading(true);
    try {
      const data = await resellerAPI.listDomains();
      setDomains(Array.isArray(data?.domains) ? data.domains : []);
    } catch (_) {
      setDomains([]);
    } finally {
      setDomainsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMeta();
    loadDomains();
  }, [loadMeta, loadDomains]);

  const doSearch = async (e) => {
    if (e) e.preventDefault();
    const q = query.trim().toLowerCase();
    if (!q) return;
    setSearching(true);
    setSearched(true);
    setExact(null);
    setSuggestions([]);
    try {
      const [ex, sg] = await Promise.allSettled([
        resellerAPI.searchDomain(q),
        resellerAPI.suggestDomains(q),
      ]);
      if (ex.status === "fulfilled") setExact(ex.value || null);
      if (sg.status === "fulfilled") {
        const list = (sg.value?.suggestions || []).filter(
          (s) => String(s.domain || "").toLowerCase() !== q
        );
        setSuggestions(list);
      }
    } catch (err) {
      showAlert(err?.response?.data?.message || "Domain search failed.", { type: "fail" });
    } finally {
      setSearching(false);
    }
  };

  const openRegister = (domain, price_usd) => {
    setReg({ domain, price_usd });
    setNsChoice("cloudflare");
    setCustomNs("");
    setRegResult(null);
  };
  const closeRegister = () => {
    setReg(null);
    setRegResult(null);
    setRegistering(false);
  };

  const submitRegister = async () => {
    if (!reg) return;
    setRegistering(true);
    setRegResult(null);
    try {
      const payload = { domain: reg.domain };
      if (nsChoice === "custom") {
        const ns = customNs
          .split(/[\s,]+/)
          .map((x) => x.trim())
          .filter(Boolean);
        payload.nameservers = ns;
      } else {
        payload.ns_choice = nsChoice;
      }
      const res = await resellerAPI.registerDomain(payload);
      setRegResult(res);
      if (res?.mode === "live" && res?.result?.success) {
        showAlert("Domain registered.", { type: "success" });
        loadDomains();
        loadMeta();
      }
    } catch (err) {
      const data = err?.response?.data;
      setRegResult({ _error: true, ...(data || { message: "Registration failed." }) });
      showAlert(data?.message || "Registration failed.", { type: "fail" });
    } finally {
      setRegistering(false);
    }
  };

  return (
    <>
      <Navbar />
      <section className="nw-hero border-b border-line dark:border-white/[0.06]">
        <div className="absolute inset-0 nw-grid-bg opacity-60 dark:opacity-100" />
        <div className="nw-hero-glow -top-24 -right-24 h-72 w-72" />
        <div className="nw-container relative py-10 sm:py-14">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="w-full">
              <span className="nw-eyebrow mb-4">Domains</span>
              <h1 className="max-w-2xl text-3xl font-bold leading-tight tracking-tight text-primary dark:text-white sm:text-4xl">
                Find your domain, register in seconds
              </h1>
              <p className="mt-3 max-w-xl nw-lead">
                Real-time availability and pricing. Register straight from your prepaid wallet — DNS is
                pointed at Cloudflare by default, WHOIS privacy included.
              </p>
              <form onSubmit={doSearch} className="mt-6 flex max-w-xl gap-2">
                <div className="relative flex-1">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" size={18} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="yourname.com"
                    className="w-full rounded-xl border border-line dark:border-gray-700 bg-white dark:bg-gray-800 text-primary dark:text-white pl-10 pr-3 py-3 text-sm focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/15"
                  />
                </div>
                <button type="submit" disabled={searching} className="nw-btn-primary disabled:opacity-60">
                  {searching ? "Searching…" : "Search"}
                </button>
              </form>
            </div>
            {account && (
              <div className="rounded-2xl border border-line bg-white px-4 py-3 text-right shadow-sm dark:border-white/[0.08] dark:bg-gray-900 shrink-0">
                <p className="text-xs text-ink-soft dark:text-gray-400">Wallet balance</p>
                <p className="text-lg font-bold text-primary dark:text-white">{money(account.wallet_balance_usd)}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <main className="nw-container py-12">
        {mode === "dry_run" && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-400/40 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 mb-8" data-testid="dry-run-banner">
            <FiAlertTriangle className="text-amber-600 dark:text-amber-300 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <span className="font-semibold">Test mode.</span> Registrations are validated and priced but no domain is registered and your wallet is never charged.
            </p>
          </div>
        )}

        {/* Search results */}
        {searched && (
          <section className="mb-14">
            <h2 className="text-xl font-semibold text-primary dark:text-white mb-5">Search results</h2>
            {searching ? (
              <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-16 rounded-xl border border-lightgray dark:border-gray-800 animate-pulse" />)}</div>
            ) : (
              <div className="space-y-3">
                {exact && exact.available ? (
                  <ResultCard domain={exact.domain} available={true} price_usd={exact.price_usd} registrar={exact.registrar} onRegister={openRegister} />
                ) : exact && !exact.available ? (
                  <ResultCard domain={exact.domain || query} available={false} />
                ) : null}
                {suggestions.map((s) => (
                  <ResultCard key={s.domain} domain={s.domain} available={s.available} price_usd={s.price_usd} registrar={s.registrar} onRegister={openRegister} />
                ))}
                {!exact && suggestions.length === 0 && (
                  <div className="flex flex-col items-center justify-center text-center rounded-2xl border border-line dark:border-gray-800 py-10 px-6">
                    <FiGlobe className="text-ink-soft mb-3" size={26} />
                    <p className="text-primary dark:text-white font-medium">No available domains for that search.</p>
                    <p className="text-ink-soft dark:text-gray-400 text-sm mt-1">Try a different name.</p>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* My domains */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold text-primary dark:text-white">Your domains</h2>
            <button onClick={loadDomains} className="flex items-center gap-2 text-sm text-darkbtn hover:text-darkbtn-hover font-medium"><FiRefreshCw size={15} /> Refresh</button>
          </div>
          {domainsLoading ? (
            <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="h-16 rounded-xl border border-lightgray dark:border-gray-800 animate-pulse" />)}</div>
          ) : domains.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-line dark:border-gray-800 py-12 px-6">
              <FiGlobe className="text-ink-soft mb-3" size={28} />
              <p className="text-primary dark:text-white font-medium">No domains yet</p>
              <p className="text-secondary dark:text-gray-400 text-sm mt-1">Search above to register your first domain.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {domains.map((d) => (
                <div key={d.domain} className="nw-card !p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <span className="font-semibold text-primary dark:text-white">{d.domain}</span>
                    <div className="flex items-center gap-x-5 gap-y-1 flex-wrap text-sm text-secondary dark:text-gray-400 mt-0.5">
                      {d.registrar && <span>{d.registrar}</span>}
                      {d.nameserver_type && <span>NS: {d.nameserver_type}</span>}
                      {d.registered_at && <span>Since {new Date(d.registered_at).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <Link to={`/dns-manager?domain=${encodeURIComponent(d.domain)}`} className="nw-btn-secondary nw-btn-sm shrink-0">
                    <FiSettings size={15} /> Manage DNS
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Register modal — rendered via a portal to document.body so no ancestor
          stacking/overflow context can hide the overlay. */}
      {reg && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50" onClick={closeRegister}>
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-lightgray dark:border-gray-800">
              <h3 className="text-lg font-semibold text-primary dark:text-white">Register {reg.domain}</h3>
              <button onClick={closeRegister} className="text-secondary hover:text-primary dark:hover:text-white" aria-label="Close"><FiX size={22} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="rounded-lg bg-lightgray-200 dark:bg-gray-800 p-4 flex items-center justify-between">
                <span className="font-medium text-primary dark:text-white">{reg.domain}</span>
                <span className="font-bold text-primary dark:text-white">{money(reg.price_usd)}<span className="text-secondary text-sm font-normal">/yr</span></span>
              </div>

              {!regResult && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-primary dark:text-white mb-1">DNS / Nameservers</label>
                    <select value={nsChoice} onChange={(e) => setNsChoice(e.target.value)} className="w-full appearance-none rounded-xl border border-line dark:border-gray-700 bg-white dark:bg-gray-800 text-primary dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/15">
                      <option value="cloudflare">Cloudflare DNS (recommended)</option>
                      <option value="registrar">Registrar default</option>
                      <option value="custom">Custom nameservers</option>
                    </select>
                  </div>
                  {nsChoice === "custom" && (
                    <div>
                      <label className="block text-sm font-medium text-primary dark:text-white mb-1">Custom nameservers</label>
                      <textarea value={customNs} onChange={(e) => setCustomNs(e.target.value)} rows={2} placeholder="ns1.example.com, ns2.example.com" className="w-full rounded-xl border border-line dark:border-gray-700 bg-white dark:bg-gray-800 text-primary dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/15" />
                      <p className="text-xs text-secondary dark:text-gray-400 mt-1">Separate with commas or spaces (at least two).</p>
                    </div>
                  )}
                  <WalletNudge balance={account?.wallet_balance_usd} price={reg.price_usd} />
                </>
              )}

              {regResult && !regResult._error && regResult.mode === "dry_run" && (
                <div className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 text-sm">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-semibold mb-2"><FiCheckCircle /> Simulated (test mode)</div>
                  <p className="text-amber-800 dark:text-amber-200">Priced at <span className="font-semibold">{money(regResult.price_usd)}</span> and validated. No domain was registered and no funds were charged.</p>
                </div>
              )}
              {regResult && !regResult._error && regResult.mode === "live" && (
                <div className="rounded-lg border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4 text-sm space-y-1">
                  <div className="flex items-center gap-2 text-green-800 dark:text-green-200 font-semibold mb-1"><FiCheckCircle /> Registered</div>
                  <p className="text-green-800 dark:text-green-200">Charged {money(regResult.charged_usd)}. New balance {money(regResult.wallet_balance_usd)}.</p>
                  {Array.isArray(regResult.result?.nameservers) && <p className="text-green-800 dark:text-green-200">Nameservers: <span className="font-mono">{regResult.result.nameservers.join(", ")}</span></p>}
                </div>
              )}
              {regResult && regResult._error && (
                <div className="rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-semibold mb-1"><FiAlertTriangle /> {regResult.error || "Error"}</div>
                  <p className="text-red-700 dark:text-red-300">{regResult.message}</p>
                  {regResult.shortfall_usd ? <p className="text-red-700 dark:text-red-300 mt-1">Short by {money(regResult.shortfall_usd)} — top up your wallet and retry.</p> : null}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-lightgray dark:border-gray-800 flex justify-end gap-3">
              {!regResult ? (
                <>
                  <button onClick={closeRegister} className="px-4 py-2 rounded-md border border-lightgray dark:border-gray-800 text-primary dark:text-white text-sm font-medium">Cancel</button>
                  <button onClick={submitRegister} disabled={registering} className="px-5 py-2 rounded-md bg-darkbtn hover:bg-darkbtn-hover text-white text-sm font-medium disabled:opacity-60">{registering ? "Processing…" : `Register · ${money(reg.price_usd)}`}</button>
                </>
              ) : (
                <button onClick={closeRegister} className="px-5 py-2 rounded-md bg-darkbtn hover:bg-darkbtn-hover text-white text-sm font-medium">Done</button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      <Footer />
    </>
  );
}
