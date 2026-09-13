import { NavLink } from "react-router";

/**
 * Reusable, illustrative empty-state used across the app so every list/section
 * guides the user instead of showing a blank area.
 *
 * Props:
 *  - icon: a react-icons component (rendered inside a soft badge)
 *  - title: short headline
 *  - description: one/two line explainer
 *  - primaryTo / primaryLabel / onPrimary: primary CTA (NavLink when `primaryTo`, else button)
 *  - secondaryTo / secondaryLabel / onSecondary: optional secondary CTA
 *  - compact: tighter vertical padding for inner cards
 *  - tone: "brand" (default) | "neutral" badge colouring
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  primaryTo,
  primaryLabel,
  onPrimary,
  secondaryTo,
  secondaryLabel,
  onSecondary,
  className = "",
  compact = false,
  tone = "brand",
}) {
  const badgeGlow =
    tone === "neutral"
      ? "from-gray-200 to-gray-300 dark:from-white/10 dark:to-white/5"
      : "from-brand-200 to-brand-400 dark:from-brand/25 dark:to-brand/10";
  const iconColor =
    tone === "neutral"
      ? "text-ink-soft dark:text-gray-300"
      : "text-brand-600 dark:text-brand-400";

  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${compact ? "py-10" : "py-16"} px-6 ${className}`}
      data-testid="empty-state"
    >
      <div className="relative mb-5">
        <div
          className={`absolute inset-0 -z-10 rounded-full bg-gradient-to-tr ${badgeGlow} opacity-70 blur-2xl`}
          aria-hidden="true"
        />
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-line bg-white shadow-sm dark:border-white/[0.08] dark:bg-gray-900">
          {Icon ? <Icon className={`h-9 w-9 ${iconColor}`} aria-hidden="true" /> : null}
        </div>
      </div>

      <h3 className="text-lg font-semibold text-primary dark:text-white">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-md text-15 text-ink-soft dark:text-gray-400">{description}</p>
      ) : null}

      {(primaryLabel || secondaryLabel) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {primaryLabel &&
            (primaryTo ? (
              <NavLink to={primaryTo} className="nw-btn-primary" data-testid="empty-primary-cta">
                {primaryLabel}
              </NavLink>
            ) : (
              <button type="button" onClick={onPrimary} className="nw-btn-primary" data-testid="empty-primary-cta">
                {primaryLabel}
              </button>
            ))}
          {secondaryLabel &&
            (secondaryTo ? (
              <NavLink to={secondaryTo} className="nw-btn-secondary">
                {secondaryLabel}
              </NavLink>
            ) : (
              <button type="button" onClick={onSecondary} className="nw-btn-secondary">
                {secondaryLabel}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
