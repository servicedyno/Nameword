// Reusable server plan card for the home-page VPS & RDP sections.
export default function ServerPlanCard({
  name,
  price,
  perMonth,
  specs = [],
  popular = false,
  popularLabel,
  ctaLabel,
  onCta,
  ctaTestId,
}) {
  return (
    <div
      className={`relative flex h-full flex-col rounded-2xl bg-white p-6 transition-all dark:bg-gray-900 ${
        popular
          ? "border-2 border-brand-500 shadow-lg shadow-brand-500/10 dark:border-brand-500"
          : "border border-line hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg hover:shadow-brand/5 dark:border-white/[0.07] dark:hover:border-brand/40"
      }`}
    >
      {popular && (
        <span className="absolute -top-3 left-6 rounded-full bg-brand-600 px-3 py-1 text-[11px] font-semibold text-white shadow-sm">
          {popularLabel}
        </span>
      )}
      <h3 className="text-lg font-bold text-primary dark:text-white">{name}</h3>
      <div className="mt-3 flex items-end gap-1">
        <span className="font-display text-3xl font-bold tracking-tight text-primary dark:text-white">${price}</span>
        <span className="pb-1 text-sm text-ink-soft dark:text-gray-400">{perMonth}</span>
      </div>
      <ul className="mt-5 flex-1 space-y-2.5 border-t border-line pt-5 text-sm dark:border-white/[0.06]">
        {specs.map((sp) => (
          <li key={sp.label} className="flex items-center justify-between">
            <span className="text-ink-soft dark:text-gray-400">{sp.label}</span>
            <span className="font-semibold text-primary dark:text-white">{sp.value}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={onCta}
        data-testid={ctaTestId}
        className={`mt-6 w-full ${popular ? "nw-btn-primary" : "nw-btn-secondary"}`}
      >
        {ctaLabel}
      </button>
    </div>
  );
}

export function ServerPlanSkeleton() {
  return (
    <div className="rounded-2xl border border-line bg-white p-6 dark:border-white/[0.07] dark:bg-gray-900">
      <div className="h-4 w-24 animate-pulse rounded bg-surface-3 dark:bg-white/[0.06]" />
      <div className="mt-4 h-8 w-28 animate-pulse rounded bg-surface-3 dark:bg-white/[0.06]" />
      <div className="mt-6 space-y-3 border-t border-line pt-5 dark:border-white/[0.06]">
        <div className="h-3 w-full animate-pulse rounded bg-surface-3 dark:bg-white/[0.06]" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-surface-3 dark:bg-white/[0.06]" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-surface-3 dark:bg-white/[0.06]" />
      </div>
      <div className="mt-6 h-10 w-full animate-pulse rounded-lg bg-surface-3 dark:bg-white/[0.06]" />
    </div>
  );
}
