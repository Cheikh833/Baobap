import { riskLevel, type RiskLevel } from "@/lib/risk";
import type { Messages } from "@/i18n/messages/fr";

export const LEVEL_BG: Record<RiskLevel, string> = { low: "#DCFCE7", medium: "#FEF3C7", high: "#FED7AA", critical: "#FECACA" };
export const LEVEL_FG: Record<RiskLevel, string> = { low: "#166534", medium: "#92400E", high: "#9A3412", critical: "#991B1B" };

/** Matrice 5×5 (probabilité en lignes, de 5 en haut à 1 en bas ; impact en colonnes). */
export function RiskMatrix({ counts, m }: { counts: number[][]; m: Messages }) {
  const R = m.risks;
  return (
    <div className="flex gap-2">
      <div className="flex w-5 items-center justify-center"><span className="-rotate-90 whitespace-nowrap text-[11px] font-semibold uppercase tracking-wide text-slate-500">{R.probability}</span></div>
      <div className="flex-1">
        <div className="grid grid-cols-[auto_repeat(5,minmax(0,1fr))] gap-1" role="table" aria-label={R.matrix}>
          {[5, 4, 3, 2, 1].map((p) => (
            <div key={p} className="contents" role="row">
              <span className="flex items-center pr-1 text-xs font-semibold text-slate-500" role="rowheader">{p}</span>
              {[1, 2, 3, 4, 5].map((i) => {
                const n = counts[p - 1][i - 1];
                const lv = riskLevel(p * i);
                return (
                  <div key={i} role="cell" title={`${R.probability} ${p} × ${R.impact} ${i} = ${p * i} · ${R.levels[lv]}`}
                    className={`flex aspect-square min-h-9 items-center justify-center rounded-lg text-sm font-bold transition hover:scale-105 ${n ? "animate-pop-in shadow-sm ring-2 ring-white" : ""}`}
                    style={{ background: LEVEL_BG[lv], color: LEVEL_FG[lv], opacity: n ? 1 : 0.55, animationDelay: `${(p + i) * 40}ms` }}>
                    {n || ""}
                  </div>
                );
              })}
            </div>
          ))}
          <span />
          {[1, 2, 3, 4, 5].map((i) => <span key={i} className="text-center text-xs font-semibold text-slate-500">{i}</span>)}
        </div>
        <p className="mt-1 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">{R.impact}</p>
      </div>
    </div>
  );
}
