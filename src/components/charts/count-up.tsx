"use client";
import { useEffect, useRef } from "react";

/**
 * Nombre qui « compte » jusqu'à sa valeur. Le rendu serveur affiche directement la valeur finale
 * (aucun écart d'hydratation, lisible sans JavaScript) ; l'animation ne fait que rejouer la montée.
 */
export function CountUp({ value, locale = "fr-FR", suffix = "", duration = 1100, options }: { value: number; locale?: string; suffix?: string; duration?: number; options?: Intl.NumberFormatOptions }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches || value === 0) return;
    const fmt = new Intl.NumberFormat(locale, options);
    let raf = 0;
    const run = () => {
      const start = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt.format(Math.round(value * eased)).replace(/\u202f/g, "\u00a0") + suffix;
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    // La montée démarre quand le nombre devient visible (immédiatement s'il l'est déjà).
    if (typeof IntersectionObserver === "undefined") { run(); return () => cancelAnimationFrame(raf); }
    const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { io.disconnect(); run(); } }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [value, locale, suffix, duration, options]);
  return <span ref={ref} className="tabular">{new Intl.NumberFormat(locale, options).format(value).replace(/\u202f/g, "\u00a0")}{suffix}</span>;
}
