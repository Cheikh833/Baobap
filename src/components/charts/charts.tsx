import type { ReactNode } from "react";

// Graphiques SVG légers, animés en CSS, alimentés uniquement par des données réelles.
// Chaque graphique accepte un libellé accessible et affiche une légende lisible sans couleur.

export type Slice = { label: string; value: number; color: string };

/** Anneau (répartition). Les segments se dessinent à l'affichage. */
export function Donut({ data, size = 148, thickness = 18, center, label, format }: { data: Slice[]; size?: number; thickness?: number; center?: ReactNode; label: string; format?: (v: number) => string }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={label} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E4EAE7" strokeWidth={thickness} />
          {total > 0 && data.filter((d) => d.value > 0).map((d, i) => {
            const len = (d.value / total) * c;
            const seg = (
              <circle
                key={d.label}
                cx={size / 2} cy={size / 2} r={r} fill="none" stroke={d.color} strokeWidth={thickness} strokeLinecap="butt"
                strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset}
                className="animate-fade-in" style={{ animationDelay: `${i * 120}ms` }}
              />
            );
            offset += len;
            return seg;
          })}
        </svg>
        {center && <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{center}</div>}
      </div>
      <ul className="min-w-0 space-y-1.5 text-sm">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} aria-hidden />
            <span className="text-slate-600">{d.label}</span>
            <span className="ml-auto whitespace-nowrap pl-3 font-semibold tabular">{format ? format(d.value) : d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Jauge circulaire (pourcentage), tracé animé. */
export function Ring({ value, size = 120, thickness = 12, color = "#087F68", label, children }: { value: number; size?: number; thickness?: number; color?: string; label: string; children?: ReactNode }) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={`${label} : ${v} %`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E4EAE7" strokeWidth={thickness} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={thickness} strokeLinecap="round"
          strokeDasharray={c} className="animate-draw"
          style={{ ["--dash" as string]: c, ["--dash-to" as string]: c * (1 - v / 100), strokeDashoffset: c * (1 - v / 100) }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children ?? <span className="whitespace-nowrap font-display text-2xl font-bold tabular">{v}&nbsp;%</span>}</div>
    </div>
  );
}

/** Barres horizontales proportionnelles, qui « poussent » à l'affichage. */
export function Bars({ data, format, label }: { data: { label: ReactNode; value: number; hint?: ReactNode; color?: string }[]; format: (v: number) => string; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="space-y-3" aria-label={label}>
      {data.map((d, i) => (
        <li key={i} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">{d.label}</span>
            <span className="shrink-0 font-semibold tabular">{format(d.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full origin-left animate-grow-x rounded-full" style={{ width: `${(d.value / max) * 100}%`, background: d.color ?? "linear-gradient(90deg,#087F68,#2BA587)", animationDelay: `${i * 90}ms` }} />
          </div>
          {d.hint && <div className="text-xs text-slate-500">{d.hint}</div>}
        </li>
      ))}
    </ul>
  );
}

/** Barre de progression animée. */
export function Meter({ value, label, color }: { value: number; label: string; color?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="h-full origin-left animate-grow-x rounded-full" style={{ width: `${v}%`, background: color ?? "linear-gradient(90deg,#087F68,#2BA587)" }} />
    </div>
  );
}
