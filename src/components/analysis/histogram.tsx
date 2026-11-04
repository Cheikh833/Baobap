/** Histogramme vertical (SVG), barres animées. */
export function Histogram({ bins, label, fmt }: { bins: { from: number; to: number; count: number }[]; label: string; fmt: (n: number) => string }) {
  const W = 640, H = 220, L = 36, B = 28, T = 10;
  const max = Math.max(1, ...bins.map((b) => b.count));
  const bw = (W - L - 8) / bins.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={label}>
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={L} x2={W - 8} y1={T + (1 - f) * (H - T - B)} y2={T + (1 - f) * (H - T - B)} stroke="#E4EAE7" />
          <text x={L - 6} y={T + (1 - f) * (H - T - B) + 4} textAnchor="end" fontSize="10" fill="#64748B">{Math.round(max * f)}</text>
        </g>
      ))}
      {bins.map((b, i) => {
        const h = (b.count / max) * (H - T - B);
        return (
          <g key={i}>
            <rect x={L + i * bw + 1.5} y={H - B - h} width={Math.max(1, bw - 3)} height={h} rx="3" fill="url(#hist)" className="origin-bottom animate-grow-y" style={{ animationDelay: `${i * 40}ms`, transformBox: "fill-box" }}>
              <title>{`${fmt(b.from)} – ${fmt(b.to)} : ${b.count}`}</title>
            </rect>
          </g>
        );
      })}
      {bins.map((b, i) => (i === 0 || i === bins.length - 1 || i === Math.floor(bins.length / 2)) && (
        <text key={`l${i}`} x={L + i * bw + (i === bins.length - 1 ? bw : 0)} y={H - 8} textAnchor={i === 0 ? "start" : i === bins.length - 1 ? "end" : "start"} fontSize="10" fill="#64748B">{fmt(i === bins.length - 1 ? b.to : b.from)}</text>
      ))}
      <defs><linearGradient id="hist" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#2BA587" /><stop offset="100%" stopColor="#087F68" /></linearGradient></defs>
    </svg>
  );
}
