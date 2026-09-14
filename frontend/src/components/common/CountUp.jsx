import { useEffect, useRef, useState } from "react";

const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Animated number that counts up from 0 to `value` on mount / when value changes.
 * Falls back to the final value instantly when the user prefers reduced motion.
 */
export default function CountUp({
  value = 0,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 900,
  className = "",
  testid,
}) {
  const target = Number(value) || 0;
  const [display, setDisplay] = useState(() => (prefersReduced() ? target : 0));
  const rafRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    if (prefersReduced()) {
      setDisplay(target);
      return undefined;
    }
    cancelAnimationFrame(rafRef.current);
    startRef.current = null;
    const from = 0;
    const step = (ts) => {
      if (startRef.current == null) startRef.current = ts;
      const p = Math.min(1, (ts - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setDisplay(from + (target - from) * eased);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setDisplay(target);
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  const formatted = display.toFixed(decimals);
  return (
    <span className={className} data-testid={testid}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
