// Nameword "Keyhole N" brand logo.
// The mark is a self-contained indigo badge (stays indigo in BOTH themes) with a
// white "N" carrying a keyhole cut in negative space. The wordmark is real HTML
// text in Outfit so it is crisp and theme-correct (slate in light, near-white in
// dark) without relying on the .dark-mode brightness hack.

export const NamewordMark = ({ className = "h-8 w-8" }) => (
  <svg viewBox="0 0 512 512" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect width="512" height="512" rx="116" fill="#4F46E5" />
    <g fill="#FFFFFF">
      <rect x="150" y="150" width="58" height="212" rx="10" />
      <rect x="304" y="150" width="58" height="212" rx="10" />
      <path d="M155 150 H208 L357 362 H304 Z" />
    </g>
    <g fill="#4F46E5">
      <circle cx="238" cy="230" r="21" />
      <path d="M242 249 L261 249 L305 307 L281 307 Z" />
    </g>
  </svg>
);

const BrandLogo = ({
  markClassName = "h-8 w-8",
  textClassName = "text-[1.6rem]",
  showText = true,
  className = "",
}) => (
  <span className={`inline-flex items-center gap-2.5 ${className}`} data-testid="brand-logo">
    <NamewordMark className={markClassName} />
    {showText && (
      <span
        className={`font-display font-bold tracking-tight leading-none text-[#0F172A] dark:text-white ${textClassName}`}
        style={{ fontFamily: "Outfit, 'Plus Jakarta Sans', sans-serif" }}
      >
        nameword
      </span>
    )}
  </span>
);

export default BrandLogo;
