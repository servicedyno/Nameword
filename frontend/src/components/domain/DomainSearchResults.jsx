import React, { useEffect, useRef, useState } from "react";
import { FiGlobe, FiCheckCircle, FiShoppingCart, FiAlertTriangle } from "react-icons/fi";
import resellerAPI from "../../api/reseller";
import RegisterDomainModal from "./RegisterDomainModal";

const money = (n) =>
  n === null || n === undefined || isNaN(Number(n)) ? "—" : `$${Number(n).toFixed(2)}`;

const MAX_SUGGESTIONS = 8;

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
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRegister(domain, price_usd); }}
            className="nw-btn-primary nw-btn-sm"
          >
            <FiShoppingCart size={15} /> Register
          </button>
        )}
      </div>
    </div>
  );
}

// Inline domain search results for the public landing page. Fetches the exact
// match and alternative-TLD suggestions INDEPENDENTLY so the fast exact result
// renders immediately while the slower suggestions stream in afterwards.
export default function DomainSearchResults({ query }) {
  const [mode, setMode] = useState(null);
  const [account, setAccount] = useState(null);
  const [exact, setExact] = useState(null);
  const [exactLoading, setExactLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [sugLoading, setSugLoading] = useState(false);
  const [reg, setReg] = useState(null);
  const reqIdRef = useRef(0);

  // Wallet balance + dry_run banner (fetched once).
  useEffect(() => {
    let alive = true;
    Promise.allSettled([resellerAPI.getHealth(), resellerAPI.getAccount()]).then(([h, a]) => {
      if (!alive) return;
      if (h.status === "fulfilled") setMode(h.value?.mode || null);
      if (a.status === "fulfilled") setAccount(a.value || null);
    });
    return () => { alive = false; };
  }, []);

  // Re-run whenever the submitted query changes.
  useEffect(() => {
    const q = String(query || "").trim().toLowerCase();
    if (!q) { setExact(null); setSuggestions([]); return; }
    const myId = ++reqIdRef.current;
    setExact(null);
    setSuggestions([]);
    setExactLoading(true);
    setSugLoading(true);

    resellerAPI.searchDomain(q)
      .then((d) => { if (reqIdRef.current === myId) setExact(d || null); })
      .catch(() => { if (reqIdRef.current === myId) setExact(null); })
      .finally(() => { if (reqIdRef.current === myId) setExactLoading(false); });

    resellerAPI.suggestDomains(q)
      .then((d) => {
        if (reqIdRef.current !== myId) return;
        const list = (d?.suggestions || [])
          .filter((s) => String(s.domain || "").toLowerCase() !== q)
          .slice(0, MAX_SUGGESTIONS);
        setSuggestions(list);
      })
      .catch(() => { if (reqIdRef.current === myId) setSuggestions([]); })
      .finally(() => { if (reqIdRef.current === myId) setSugLoading(false); });
  }, [query]);

  const openRegister = (domain, price_usd) => setReg({ domain, price_usd });

  if (!String(query || "").trim()) return null;

  // Drop any suggestion that duplicates the exact match (e.g. searching a bare
  // keyword resolves to ".com", which the suggestions list also returns).
  const exactDomain = String(exact?.domain || "").toLowerCase();
  const visibleSuggestions = suggestions.filter(
    (s) => String(s.domain || "").toLowerCase() !== exactDomain
  );

  const nothingFound = !exactLoading && !sugLoading && !exact && visibleSuggestions.length === 0;

  return (
    <div className="rounded-3xl border border-line bg-white/70 p-5 shadow-lg shadow-slate-200/40 backdrop-blur dark:border-white/[0.08] dark:bg-gray-900/70 dark:shadow-black/40 sm:p-7">
      {mode === "dry_run" && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-400/40 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 mb-6" data-testid="dry-run-banner">
          <FiAlertTriangle className="text-amber-600 dark:text-amber-300 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <span className="font-semibold">Test mode.</span> Registrations are validated and priced but no domain is registered and your wallet is never charged.
          </p>
        </div>
      )}

      <h2 className="text-xl font-semibold text-primary dark:text-white mb-5">Search results</h2>

      <div className="space-y-3">
        {/* Exact match (renders as soon as the fast lookup returns) */}
        {exactLoading ? (
          <div className="h-16 rounded-xl border border-lightgray dark:border-gray-800 animate-pulse" />
        ) : exact && exact.available ? (
          <ResultCard domain={exact.domain} available={true} price_usd={exact.price_usd} registrar={exact.registrar} onRegister={openRegister} />
        ) : exact && !exact.available ? (
          <ResultCard domain={exact.domain || query} available={false} />
        ) : null}

        {/* Alternative TLD suggestions */}
        {!exactLoading && (exact || !sugLoading) && (visibleSuggestions.length > 0 || sugLoading) && (
          <p className="pt-2 text-sm font-medium text-ink-soft dark:text-gray-400">More options</p>
        )}
        {sugLoading ? (
          <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-16 rounded-xl border border-lightgray dark:border-gray-800 animate-pulse" />)}</div>
        ) : (
          visibleSuggestions.map((s) => (
            <ResultCard key={s.domain} domain={s.domain} available={s.available} price_usd={s.price_usd} registrar={s.registrar} onRegister={openRegister} />
          ))
        )}

        {nothingFound && (
          <div className="flex flex-col items-center justify-center text-center rounded-2xl border border-line dark:border-gray-800 py-10 px-6">
            <FiGlobe className="text-ink-soft mb-3" size={26} />
            <p className="text-primary dark:text-white font-medium">No available domains for that search.</p>
            <p className="text-ink-soft dark:text-gray-400 text-sm mt-1">Try a different name.</p>
          </div>
        )}

        {/* Once the exact match is available, hint that suggestions are still loading */}
        {!exactLoading && exact && sugLoading && (
          <p className="flex items-center gap-2 pt-1 text-sm text-ink-soft dark:text-gray-400">
            <FiCheckCircle className="text-green-500" /> Loading more extensions…
          </p>
        )}
      </div>

      <RegisterDomainModal reg={reg} account={account} onClose={() => setReg(null)} />
    </div>
  );
}
