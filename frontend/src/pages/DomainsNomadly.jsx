import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import ProductShell from "../components/layout/ProductShell";
import resellerAPI from "../api/reseller";
import { useAlert } from "../context/AlertContext";
import { usePageMeta } from "../hooks/usePageMeta";
import { useAuth } from "../hooks/useAuth";
import { useCart } from "../hooks/useCart";
import { money } from "../utils/checkoutFormat";
import {
  FiSearch,
  FiGlobe,
  FiCheck,
  FiCheckCircle,
  FiXCircle,
  FiRefreshCw,
  FiSettings,
  FiShoppingCart,
  FiArrowRight,
  FiShield,
  FiLock,
} from "react-icons/fi";

// Hostinger-style exact-match card: the searched name, its price, one clear CTA.
function ExactMatchCard({ result, inCart, onAdd, onContinue }) {
  const available = !!result.available;
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-6 sm:p-8 ${
        available ? "border-brand/40 bg-gradient-to-br from-brand-50/80 via-white to-white dark:from-brand/10 dark:via-gray-900 dark:to-gray-900" : "border-line dark:border-gray-800 bg-white dark:bg-gray-900"
      }`}
      data-testid="exact-match-card"
    >
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 text-sm font-semibold">
            {available ? (
              <span className="inline-flex items-center gap-1.5 text-green-700 dark:text-green-300"><FiCheckCircle /> Available</span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-300"><FiXCircle /> Taken</span>
            )}
          </div>
          <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-primary dark:text-white break-all" data-testid="exact-match-domain">
            {result.domain}
            {available ? <span className="text-ink-soft dark:text-gray-400 font-medium"> is available!</span> : <span className="text-ink-soft dark:text-gray-400 font-medium"> is already registered</span>}
          </h2>
          {available ? (
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink-soft dark:text-gray-400">
              <li className="inline-flex items-center gap-1.5"><FiLock size={14} className="text-brand" /> WHOIS privacy included</li>
              <li className="inline-flex items-center gap-1.5"><FiShield size={14} className="text-brand" /> Free managed DNS</li>
              <li className="inline-flex items-center gap-1.5"><FiCheck size={14} className="text-brand" /> Instant activation</li>
            </ul>
          ) : (
            <p className="mt-3 text-sm text-ink-soft dark:text-gray-400">Try one of the alternatives below — same name, different extension.</p>
          )}
        </div>
        {available && (
          <div className="flex flex-col items-start gap-3 md:items-end shrink-0">
            <div className="text-right">
              <p className="text-3xl font-bold text-primary dark:text-white nw-mono" data-testid="exact-match-price">{money(result.price_usd)}</p>
              <p className="text-xs text-ink-soft dark:text-gray-400">first year · renews at the live price</p>
            </div>
            {inCart ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-3 py-2 text-sm font-medium text-green-700 dark:text-green-300" data-testid="exact-match-in-cart">
                  <FiCheck /> In cart
                </span>
                <button type="button" onClick={onContinue} className="nw-btn-primary" data-testid="exact-match-continue-button">
                  Continue <FiArrowRight size={16} />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => onAdd(result)} className="nw-btn-primary" data-testid="exact-match-add-button">
                <FiShoppingCart size={16} /> Add to cart
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function OptionCard({ item, inCart, onAdd, onRemove }) {
  const available = !!item.available;
  return (
    <div className={`nw-card nw-card-hover !p-4 flex items-center justify-between gap-4 ${!available ? "opacity-60" : ""}`} data-testid={`option-card-${item.domain}`}>
      <div className="min-w-0">
        <p className="font-semibold text-primary dark:text-white truncate">{item.domain}</p>
        <p className="text-xs text-ink-soft dark:text-gray-400">{available ? `${money(item.price_usd)} / yr` : "Taken"}</p>
      </div>
      {available &&
        (inCart ? (
          <button type="button" onClick={() => onRemove(item.domain)} className="inline-flex items-center gap-1.5 rounded-lg border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 text-sm font-medium text-green-700 dark:text-green-300" data-testid={`option-in-cart-${item.domain}`}>
            <FiCheck /> Added
          </button>
        ) : (
          <button type="button" onClick={() => onAdd(item)} className="nw-btn-secondary nw-btn-sm shrink-0" data-testid={`option-add-${item.domain}`}>
            <FiShoppingCart size={14} /> Add
          </button>
        ))}
    </div>
  );
}

export default function DomainsNomadly() {
  usePageMeta("Domains", "Search and register domains — real-time availability and pricing.");
  const { showAlert } = useAlert();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const cart = useCart();

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [exact, setExact] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [searched, setSearched] = useState(false);

  const [domains, setDomains] = useState([]);
  const [domainsLoading, setDomainsLoading] = useState(true);

  const loadDomains = useCallback(async () => {
    setDomainsLoading(true);
    try {
      const data = await resellerAPI.listDomains();
      setDomains(Array.isArray(data?.domains) ? data.domains : []);
    } catch {
      setDomains([]);
    } finally {
      setDomainsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) loadDomains();
  }, [isAuthenticated, loadDomains]);

  const doSearch = async (e, override) => {
    if (e) e.preventDefault();
    const q = String(override != null ? override : query).trim().toLowerCase();
    if (!q) return;
    if (override != null) setQuery(q);
    setSearching(true);
    setSearched(true);
    setExact(null);
    setSuggestions([]);

    // Exact availability is the PRIMARY result and controls the spinner — it must
    // NOT be blocked behind the slower suggestions lookup (12 upstream TLD checks).
    resellerAPI
      .searchDomain(q)
      .then((v) => setExact(v || { domain: q, available: false }))
      .catch((err) => {
        setExact({ domain: q, available: false, error: true });
        showAlert(err?.response?.data?.message || "Domain search failed. Please try again.", { type: "fail" });
      })
      .finally(() => setSearching(false));

    // Suggestions fill in independently; a slow/failed suggest never wedges the UI.
    resellerAPI
      .suggestDomains(q)
      .then((sg) => {
        setSuggestions((sg?.suggestions || []).filter((s) => String(s.domain || "").toLowerCase() !== q));
      })
      .catch(() => setSuggestions([]));
  };

  // Auto-run a search when arriving with ?value= / ?q=.
  const autoSearchedRef = useRef(false);
  useEffect(() => {
    if (autoSearchedRef.current) return;
    const initial = (searchParams.get("value") || searchParams.get("q") || "").trim();
    if (initial) {
      autoSearchedRef.current = true;
      setQuery(initial);
      doSearch(null, initial);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const goHosting = (domain) => navigate(`/checkout/hosting?domain=${encodeURIComponent(domain)}`);

  // Exact match: add and move straight to the hosting step (Hostinger pattern).
  const addExact = (r) => {
    cart.addDomain({ domain: r.domain, price_usd: r.price_usd, registrar: r.registrar });
    goHosting(r.domain);
  };
  // Alternatives: stay on the page so several names can be collected.
  const addOption = (s) => {
    cart.addDomain({ domain: s.domain, price_usd: s.price_usd, registrar: s.registrar });
    showAlert(`${s.domain} added to cart`, { type: "success" });
  };
  const removeOption = (domain) => {
    const item = cart.items.find((i) => i.type === "domain" && i.domain === domain);
    if (item) cart.remove(item.id);
  };
  const continueCheckout = () => {
    if (cart.nextDomainForHosting) goHosting(cart.nextDomainForHosting);
    else navigate(isAuthenticated ? "/cart" : "/checkout/account");
  };

  const availableSuggestions = suggestions.filter((s) => s.available);
  const takenSuggestions = suggestions.filter((s) => !s.available);

  return (
    <ProductShell>
      <section className="nw-hero border-b border-line dark:border-white/[0.06]">
        <div className="absolute inset-0 nw-grid-bg opacity-60 dark:opacity-100" />
        <div className="nw-hero-glow -top-24 -right-24 h-72 w-72" />
        <div className="nw-container relative py-10 sm:py-14">
          <span className="nw-eyebrow mb-4">Domains</span>
          <h1 className="max-w-2xl text-3xl font-bold leading-tight tracking-tight text-primary dark:text-white sm:text-4xl">
            Find your domain, register in seconds
          </h1>
          <p className="mt-3 max-w-xl nw-lead">
            Real-time availability and pricing. Add a name to your cart, pick hosting if you want it, and pay from your prepaid wallet.
          </p>
          <form onSubmit={doSearch} className="mt-6 flex max-w-xl gap-2" data-testid="domain-search-form">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" size={18} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="yourname.com"
                className="w-full rounded-xl border border-line dark:border-gray-700 bg-white dark:bg-gray-800 text-primary dark:text-white pl-10 pr-3 py-3 text-sm focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/15"
                data-testid="domain-search-input"
              />
            </div>
            <button type="submit" disabled={searching} className="nw-btn-primary disabled:opacity-60" data-testid="domain-search-button">
              {searching ? "Searching…" : "Search"}
            </button>
          </form>
        </div>
      </section>

      <main className="nw-container py-12 pb-32">
        {searched && (
          <section className="mb-14" data-testid="search-results">
            {searching ? (
              <div className="space-y-4">
                <div className="h-40 rounded-2xl border border-line dark:border-gray-800 animate-pulse" />
                <div className="grid gap-3 sm:grid-cols-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl border border-line dark:border-gray-800 animate-pulse" />)}</div>
              </div>
            ) : (
              <div className="space-y-10">
                {exact && (
                  <ExactMatchCard result={exact} inCart={cart.hasDomain(exact.domain)} onAdd={addExact} onContinue={continueCheckout} />
                )}

                {(availableSuggestions.length > 0 || takenSuggestions.length > 0) && (
                  <div>
                    <div className="flex items-end justify-between mb-4">
                      <h3 className="text-xl font-semibold text-primary dark:text-white">Other options</h3>
                      <span className="text-sm text-ink-soft dark:text-gray-400">{availableSuggestions.length} available</span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2" data-testid="other-options-grid">
                      {availableSuggestions.map((s) => (
                        <OptionCard key={s.domain} item={s} inCart={cart.hasDomain(s.domain)} onAdd={addOption} onRemove={removeOption} />
                      ))}
                      {takenSuggestions.map((s) => (
                        <OptionCard key={s.domain} item={s} inCart={false} onAdd={addOption} onRemove={removeOption} />
                      ))}
                    </div>
                  </div>
                )}

                {!exact && suggestions.length === 0 && (
                  <div className="flex flex-col items-center justify-center text-center rounded-2xl border border-line dark:border-gray-800 py-10 px-6" data-testid="no-results">
                    <FiGlobe className="text-ink-soft mb-3" size={26} />
                    <p className="text-primary dark:text-white font-medium">No available domains for that search.</p>
                    <p className="text-ink-soft dark:text-gray-400 text-sm mt-1">Try a different name.</p>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {isAuthenticated && (
          <section data-testid="your-domains">
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
        )}
      </main>

      {/* Sticky cart bar */}
      {cart.count > 0 && (
        <div className={`fixed inset-x-0 bottom-0 z-40 border-t border-line dark:border-white/[0.08] bg-white/95 dark:bg-gray-950/95 backdrop-blur-md ${isAuthenticated ? "max-lg:bottom-[62px]" : ""}`} data-testid="cart-bar">
          <div className="nw-container flex items-center justify-between gap-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="nw-icon h-10 w-10 shrink-0"><FiShoppingCart size={18} /></span>
              <div className="min-w-0">
                <p className="whitespace-nowrap text-sm font-semibold text-primary dark:text-white" data-testid="cart-bar-count">{cart.count} item{cart.count === 1 ? "" : "s"} in cart</p>
                <p className="hidden truncate text-xs text-ink-soft dark:text-gray-400 sm:block">{cart.domains.map((d) => d.domain).join(", ")}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <span className="hidden sm:block text-lg font-bold text-primary dark:text-white nw-mono" data-testid="cart-bar-total">{money(cart.subtotal)}</span>
              <button type="button" onClick={continueCheckout} className="nw-btn-primary" data-testid="cart-bar-continue">
                <span className="sm:hidden">Continue · {money(cart.subtotal)}</span>
                <span className="hidden sm:inline">Continue</span> <FiArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

    </ProductShell>
  );
}
