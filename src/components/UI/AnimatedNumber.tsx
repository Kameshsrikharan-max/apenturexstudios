import { useEffect, useRef, useState } from "react";

const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Animates a number from its current displayed value to `target`.
 * - Starts at 0 on first mount, so values "count up" when a page loads.
 * - If `target` changes mid-animation, it continues from where it is now.
 * - Respects prefers-reduced-motion (jumps straight to the target).
 */
export function useCountUp(target: number, duration = 900, delay = 0): number {
  const [display, setDisplay] = useState(0);
  const currentRef = useRef(0);

  useEffect(() => {
    const safeTarget = Number.isFinite(target) ? target : 0;

    if (prefersReducedMotion()) {
      currentRef.current = safeTarget;
      setDisplay(safeTarget);
      return;
    }

    const from = currentRef.current;
    if (from === safeTarget) {
      setDisplay(safeTarget);
      return;
    }

    let raf = 0;
    const timer = window.setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
        const next = t >= 1 ? safeTarget : Math.round(from + (safeTarget - from) * eased);
        currentRef.current = next;
        setDisplay(next);
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);

    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [target, duration, delay]);

  return display;
}

interface AnimatedAmountProps {
  value: number;
  /** Custom formatter. Defaults to "₹12,34,567" (Indian grouping). */
  format?: (n: number) => string;
  duration?: number;
  /** ms to wait before the count starts (handy for staggered rows). */
  delay?: number;
  className?: string;
}

const defaultFormat = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export function AnimatedAmount({
  value,
  format = defaultFormat,
  duration = 900,
  delay = 0,
  className,
}: AnimatedAmountProps) {
  const display = useCountUp(value, duration, delay);
  return <span className={`mo-num${className ? ` ${className}` : ""}`}>{format(display)}</span>;
}

export default AnimatedAmount;