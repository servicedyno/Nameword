import { useState } from "react";
import { TbSearch } from "react-icons/tb";
import { FiCheck, FiPlus } from "react-icons/fi";
import { useDomainSearch } from "../../hooks/useDomainSearch";
import { useCart } from "../../hooks/useCart";
import { useAuth } from "../../hooks/useAuth";
import { money } from "../../utils/checkoutFormat";

const clean = (raw) =>
  String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/\s+/g, "");

// Inline domain search: exact-match availability + price + alternative TLDs, right
// where the user is — adding feeds the mini-cart (no full-page jump). Buy buttons are
// wallet-aware so the user knows upfront if it's one tap or a top-up.
export default function InlineDomainSearch({ autoFocus = false }) {
  const { searchDomain, getTldSuggestions, tldSuggestions, loading } = useDomainSearch();
  const cart = useCart();
  const { isAuthenticated } = useAuth();

  const [term, setTerm] = useState("");
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [exact, setExact] = useState(null); // { domain, available, price, registrar }

  const run = async (e) => {
    e?.preventDefault?.();
    const raw = clean(term);
    if (!raw) return;
    const sld = raw.includes(".") ? raw.split(".")[0] : raw;
    const query = raw.includes(".") ? raw : `${raw}.com`;
    setBusy(true);
    setSearched(true);
    setExact(null);
    try {
      const [res] = await Promise.all([
        searchDomain(query).catch(() => null),
        getTldSuggestions(sld).catch(() => {}),
      ]);
      if (res) {
        setExact({
          domain: res.domain || query,
          available: !!res.available,
          price: Number(res.price_usd) || 0,
          registrar: res.registrar || null,
        });
      }
    } finally {
      setBusy(false);
    }
  };

  const AddButton = ({ domain, price, registrar }) => {
    const inCart = cart.hasDomain(domain);
    const add = () => {
      if (inCart) return;
      cart.addDomain({ domain, price_usd: price, registrar: registrar || "openprovider" });
    };
    if (inCart) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" data-testid={`inline-search-incart-${domain}`}>
          <FiCheck size={15} /> In cart
        </span>
      );
    }
    return (
      <button
        type="button"
        onClick={add}
        className="nw-btn-primary nw-btn-sm"
        data-testid={`inline-search-add-${domain}`}
      >
        <FiPlus size={14} /> {isAuthenticated ? "Buy now" : "Add to cart"}
      </button>
    );
  };

  return (
    <div className="max-w-2xl" data-testid="inline-domain-search">
      <form onSubmit={run} className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          autoFocus={autoFocus}
          placeholder="Find your domain — type a name or full domain"
          className="input-admin w-full"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          data-testid="inline-search-input"
        />
        <button type="submit" className="btn-blue !h-12 sm:!w-14 !w-full disabled:opacity-50 disabled:!cursor-not-allowed" disabled={!term.trim() || busy} data-testid="inline-search-submit">
          <TbSearch size={18} />
        </button>
      </form>

      {(busy || loading) && (
        <div className="mt-4 flex items-center gap-2 text-sm text-ink-soft dark:text-gray-400" data-testid="inline-search-loading">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-brand" /> Checking availability…
        </div>
      )}

      {searched && !busy && (
        <div className="mt-4 space-y-2.5">
          {exact && exact.available && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50/60 px-4 py-3 dark:border-emerald-500/30 dark:bg-emerald-500/[0.07]" data-testid="inline-search-exact">
              <div className="min-w-0">
                <p className="truncate font-semibold text-primary dark:text-white">{exact.domain} <span className="ml-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">available</span></p>
                <p className="text-xs text-ink-soft dark:text-gray-400">Domain registration · 1 year</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="font-bold text-primary dark:text-white nw-mono">{money(exact.price)}</span>
                <AddButton domain={exact.domain} price={exact.price} registrar={exact.registrar} />
              </div>
            </div>
          )}
          {exact && !exact.available && (
            <p className="rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-ink-soft dark:border-white/[0.06] dark:bg-white/[0.03] dark:text-gray-400" data-testid="inline-search-taken">
              <span className="font-semibold text-primary dark:text-white">{exact.domain}</span> is already taken — try one of these instead:
            </p>
          )}

          {tldSuggestions && tldSuggestions.length > 0 && (
            <div className="grid gap-2.5 sm:grid-cols-2" data-testid="inline-search-suggestions">
              {tldSuggestions
                .filter((s) => !exact || String(s.websiteName || "").toLowerCase() !== String(exact.domain || "").toLowerCase())
                .slice(0, 6)
                .map((s) => (
                <div key={s.websiteName} className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-2.5 dark:border-white/[0.06]" data-testid={`inline-search-suggestion-${s.websiteName}`}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-primary dark:text-white">{s.websiteName}</p>
                    <p className="text-xs text-ink-soft dark:text-gray-400 nw-mono">{money(s.registrationFee)}</p>
                  </div>
                  <AddButton domain={s.websiteName} price={s.registrationFee} registrar={s.registrar} />
                </div>
              ))}
            </div>
          )}

          {!exact?.available && (!tldSuggestions || tldSuggestions.length === 0) && (
            <p className="text-sm text-ink-soft dark:text-gray-400" data-testid="inline-search-noresults">No matches right now — try another name.</p>
          )}
        </div>
      )}
    </div>
  );
}
