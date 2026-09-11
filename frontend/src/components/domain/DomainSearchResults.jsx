import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { FiGlobe, FiCheckCircle, FiShoppingCart } from "react-icons/fi";
import resellerAPI from "../../api/reseller";
import { cartStore } from "../../utils/cartStore";

const money = (n) =>
  n === null || n === undefined || isNaN(Number(n)) ? "\u2014" : `$${Number(n).toFixed(2)}`;

const MAX_SUGGESTIONS = 8;

function ResultCard({ domain, available, price_usd, registrar, ctaLabel, ctaIcon, onRegister }) {
  const Icon = ctaIcon || FiShoppingCart;
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
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRegister(domain, price_usd, registrar); }}
            data-testid={`home-result-add-${domain}`}
            className="nw-btn-primary nw-btn-sm"
          >
            <Icon size={15} /> {ctaLabel}
          </button>
        )}
      </div>
    </div>
  );
}

// Inline domain search results for the public landing page. Fetches the exact
// match and alternative-TLD suggestions INDEPENDENTLY so the fast exact result
// renders immediately while the slower suggestions stream in afterwards.
//
// This is a DISCOVERY surface only: no wallet / reseller state is shown here.
// Clicking "Register" starts the registration flow — logged-out visitors are
// sent to sign in / create an account (with the domain remembered), and the
// actual purchase (gated by the in-app wallet) happens in the authenticated area.
export default function DomainSearchResults({ query }) {
  const navigate = useNavigate();
  const [exact, setExact] = useState(null);
  const [exactLoading, setExactLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [sugLoading, setSugLoading] = useState(false);
  const reqIdRef = useRef(0);

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

  // Add to cart and go straight to the hosting step (Hostinger pattern). The
  // account gate comes later, so guests can start the order right here.
  const handleRegister = (domain, price_usd, registrar) => {
    cartStore.addDomain({ domain, price_usd, registrar });
    navigate(`/checkout/hosting?domain=${encodeURIComponent(domain)}`);
  };

  if (!String(query || "").trim()) return null;

  const ctaLabel = "Add to cart";
  const ctaIcon = FiShoppingCart;

  // Drop any suggestion that duplicates the exact match (e.g. a bare keyword
  // resolves to ".com", which the suggestions list also returns).
  const exactDomain = String(exact?.domain || "").toLowerCase();
  const visibleSuggestions = suggestions.filter(
    (s) => String(s.domain || "").toLowerCase() !== exactDomain
  );

  const nothingFound = !exactLoading && !sugLoading && !exact && visibleSuggestions.length === 0;

  return (
    <div className="rounded-3xl border border-line bg-white/70 p-5 shadow-lg shadow-slate-200/40 backdrop-blur dark:border-white/[0.08] dark:bg-gray-900/70 dark:shadow-black/40 sm:p-7">
      <h2 className="text-xl font-semibold text-primary dark:text-white mb-5">Search results</h2>

      <div className="space-y-3">
        {/* Exact match (renders as soon as the fast lookup returns) */}
        {exactLoading ? (
          <div className="h-16 rounded-xl border border-lightgray dark:border-gray-800 animate-pulse" />
        ) : exact && exact.available ? (
          <ResultCard domain={exact.domain} available={true} price_usd={exact.price_usd} registrar={exact.registrar} ctaLabel={ctaLabel} ctaIcon={ctaIcon} onRegister={handleRegister} />
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
            <ResultCard key={s.domain} domain={s.domain} available={s.available} price_usd={s.price_usd} registrar={s.registrar} ctaLabel={ctaLabel} ctaIcon={ctaIcon} onRegister={handleRegister} />
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
    </div>
  );
}
