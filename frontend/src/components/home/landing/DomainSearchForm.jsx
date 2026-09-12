import { useState } from "react";
import { LuSearch, LuCheck } from "react-icons/lu";

export default function DomainSearchForm({ placeholder, buttonLabel, onSubmit, testId, glass = false, chips }) {
  const [query, setQuery] = useState("");
  const submit = () => {
    const q = query.trim();
    if (!q) return;
    onSubmit(q);
  };

  const shell = glass
    ? "rounded-2xl border border-white/15 bg-white/10 p-2 shadow-2xl shadow-black/30 backdrop-blur-xl"
    : "rounded-2xl border border-line bg-white p-4 shadow-xl shadow-slate-200/60 ring-1 ring-black/[0.02] dark:border-white/[0.08] dark:bg-gray-900 dark:shadow-black/40 dark:ring-white/[0.02]";

  return (
    <div className={shell} data-testid={`${testId}-search-form`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-2">
        <div className="relative flex-1">
          <LuSearch className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder={placeholder}
            className="nw-input pl-11"
            aria-label="Search for a domain"
            data-testid={`${testId}-domain-input`}
          />
        </div>
        <button onClick={submit} className="nw-btn-primary sm:w-auto" data-testid={`${testId}-search-button`}>
          <LuSearch className="h-4 w-4" />
          {buttonLabel}
        </button>
      </div>
      {chips && (
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 px-1">
          {chips.map((f) => (
            <span key={f} className="flex items-center gap-1.5 text-13 font-medium text-ink-soft dark:text-gray-400">
              <LuCheck className="h-4 w-4 text-brand-600 dark:text-brand-400" /> {f}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
