/** Courbe d'évolution d'un indicateur (SVG) : valeurs validées, référence et cible. */
export function IndicatorChart({ points, baseline, target, unit, label, fmtDate, fmtNum }: {
  points: { date: Date; value: number }[]; baseline: number | null; target: number | null; unit: string; label: string;
  fmtDate: (d: Date) => string; fmtNum: (n: number) => string;
}) {
  const W = 640, H = 240, L = 48, R = 16, T = 16, B = 32;
  const ys = [...points.map((p) => p.value), ...(baseline !== null ? [baseline] : []), ...(target !== null ? [target] : [])];
  let lo = Math.min(...ys), hi = Math.max(...ys);
  if (lo === hi) { lo -= 1; hi += 1; }
  const pad = (hi - lo) * 0.1; lo -= pad; hi += pad;
  if (lo > 0 && Math.min(...ys) >= 0 && lo < (hi - lo) * 0.5) lo = 0;
  const ts = points.map((p) => p.date.getTime());
  const t0 = Math.min(...ts), t1 = Math.max(...ts);
  const x = (t: number) => (t1 === t0 ? L + (W - L - R) / 2 : L + ((t - t0) / (t1 - t0)) * (W - L - R));
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(p.date.getTime()).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = points.length > 1 ? `${path} L${x(t1).toFixed(1)},${H - B} L${x(t0).toFixed(1)},${H - B} Z` : "";
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => lo + f * (hi - lo));
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={label}>
        <defs>
          <linearGradient id="ind-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#087F68" stopOpacity=".25" /><stop offset="100%" stopColor="#087F68" stopOpacity="0" /></linearGradient>
        </defs>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#E4EAE7" />
            <text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fill="#64748B">{fmtNum(Math.round(v * 10) / 10)}</text>
          </g>
        ))}
        {baseline !== null && <line x1={L} x2={W - R} y1={y(baseline)} y2={y(baseline)} stroke="#94A3B8" strokeWidth="1.5" />}
        {target !== null && (
          <g>
            <line x1={L} x2={W - R} y1={y(target)} y2={y(target)} stroke="#D99A2B" strokeWidth="2" strokeDasharray="6 4" />
            <text x={W - R} y={y(target) - 6} textAnchor="end" fontSize="11" fontWeight="600" fill="#9A6A12">{fmtNum(target)} {unit}</text>
          </g>
        )}
        {area && <path d={area} fill="url(#ind-area)" className="animate-fade-in" />}
        {points.length > 1 && <path d={path} fill="none" stroke="#087F68" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" pathLength={1} className="animate-draw" style={{ strokeDasharray: 1, ["--dash" as string]: 1, ["--dash-to" as string]: 0 }} />}
        {points.map((p, i) => (
          <g key={i} className="animate-pop-in" style={{ animationDelay: `${300 + i * 80}ms` }}>
            <circle cx={x(p.date.getTime())} cy={y(p.value)} r="4.5" fill="#fff" stroke="#087F68" strokeWidth="2.5"><title>{`${fmtDate(p.date)} : ${fmtNum(p.value)} ${unit}`}</title></circle>
          </g>
        ))}
        {points.map((p, i) => (i === 0 || i === points.length - 1 || points.length <= 6) && (
          <text key={`d${i}`} x={x(p.date.getTime())} y={H - 10} textAnchor={points.length > 1 && i === 0 ? "start" : points.length > 1 && i === points.length - 1 ? "end" : "middle"} fontSize="10" fill="#64748B">{fmtDate(p.date)}</text>
        ))}
      </svg>
    </figure>
  );
}
