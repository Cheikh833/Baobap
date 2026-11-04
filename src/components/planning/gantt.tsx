import { AlertTriangle } from "lucide-react";
import { activityProgress, dependencyConflicts, ganttRange, isActivityLate, type PActivity } from "@/lib/planning";
import { intlLocale } from "@/lib/metrics";
import type { Messages } from "@/i18n/messages/fr";
import { fill } from "@/i18n/translate";

type GActivity = PActivity & { code: string; title: string; phaseId: string | null; predecessors: { predecessorId: string; successorId: string }[] };

const STATUS_BAR: Record<string, string> = {
  NOT_STARTED: "from-slate-300 to-slate-200",
  IN_PROGRESS: "from-brand to-brand-400",
  BLOCKED: "from-danger to-red-400",
  DONE: "from-brand-deep to-brand",
  CANCELED: "from-slate-200 to-slate-100",
};

/** Diagramme de Gantt (HTML/CSS), groupé par phase, avec jalons, ligne « aujourd'hui » et conflits de dépendances. */
export function Gantt({
  activities, phases, milestones, projectStart, projectEnd, m, locale, now = new Date(),
}: {
  activities: GActivity[]; phases: { id: string; name: string }[]; milestones: { id: string; title: string; dueDate: Date; achievedAt: Date | null }[];
  projectStart: Date | null; projectEnd: Date | null; m: Messages; locale: string; now?: Date;
}) {
  const P = m.planning;
  const range = ganttRange([projectStart, projectEnd, ...activities.flatMap((a) => [a.startDate, a.endDate]), ...milestones.map((x) => x.dueDate)], now);
  const span = range.end.getTime() - range.start.getTime() || 1;
  const pos = (d: Date) => Math.max(0, Math.min(100, ((d.getTime() - range.start.getTime()) / span) * 100));
  const months: Date[] = [];
  for (let d = new Date(range.start); d <= range.end; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) months.push(d);
  const monthFmt = new Intl.DateTimeFormat(intlLocale(locale), { month: "short", year: months.length > 12 ? "2-digit" : undefined, timeZone: "UTC" });
  // Un libellé tous les 1, 2, 3 ou 6 mois selon la durée affichée, pour qu'ils ne se chevauchent pas.
  const step = months.length <= 12 ? 1 : months.length <= 24 ? 2 : months.length <= 36 ? 3 : 6;
  const byId = new Map(activities.map((a) => [a.id, a]));
  const conflicts = dependencyConflicts(activities.flatMap((a) => a.predecessors), byId);
  const conflictOf = new Map(conflicts.map((c) => [c.successorId, byId.get(c.predecessorId)?.code ?? ""]));
  const todayPos = now >= range.start && now <= range.end ? pos(now) : null;
  const groups = [...phases.map((p) => ({ id: p.id as string | null, name: p.name })), { id: null, name: P.noPhase }]
    .map((g) => ({ ...g, items: activities.filter((a) => a.phaseId === g.id) }))
    .filter((g) => g.items.length);

  if (!activities.length && !milestones.length) return <p className="text-sm text-slate-500">{P.noActivities}</p>;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[760px]">
        {/* en-tête des mois */}
        <div className="grid grid-cols-[220px_1fr] border-b border-line pb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          <span>{P.activities}</span>
          <div className="relative mr-4 h-4">
            {months.filter((_, i) => i % step === 0).map((mo) => <span key={mo.toISOString()} className="absolute top-0 whitespace-nowrap" style={{ left: `${pos(mo)}%` }}>{monthFmt.format(mo)}</span>)}
          </div>
        </div>

        <div className="relative">
          {/* repères de mois + aujourd'hui */}
          <div className="pointer-events-none absolute inset-y-0 left-[220px] right-4" aria-hidden>
            {months.map((mo, i) => <span key={mo.toISOString()} className={`absolute inset-y-0 w-px ${i % step === 0 ? "bg-line" : "bg-line/40"}`} style={{ left: `${pos(mo)}%` }} />)}
            {todayPos !== null && (
              <span className="absolute inset-y-0 w-0.5 bg-ochre" style={{ left: `${todayPos}%` }}>
                <span className="absolute -top-0.5 left-1 whitespace-nowrap rounded bg-ochre px-1 text-[10px] font-semibold text-navy">{P.today}</span>
              </span>
            )}
          </div>

          {groups.map((g) => (
            <div key={g.id ?? "none"} className="pt-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-deep">{g.name}</p>
              {g.items.map((a, i) => {
                const prog = activityProgress(a);
                const late = isActivityLate(a, now);
                const conflict = conflictOf.get(a.id);
                const left = a.startDate ? pos(a.startDate) : null;
                const right = a.endDate ? pos(a.endDate) : null;
                return (
                  <div key={a.id} className="group grid grid-cols-[220px_1fr] items-center rounded-lg py-1.5 transition-colors hover:bg-canvas">
                    <div className="min-w-0 pr-3">
                      <p className="truncate text-sm font-medium"><span className="font-mono text-xs text-slate-500">{a.code}</span> {a.title}</p>
                      <p className="flex items-center gap-1 text-[11px] text-slate-500">
                        {m.planning.activityStatus[a.status as keyof typeof m.planning.activityStatus]} · {prog} %
                        {late && <span className="font-semibold text-danger">· {P.late}</span>}
                        {conflict && <span className="inline-flex items-center gap-0.5 font-semibold text-amber-700" title={fill(P.conflict, { code: conflict })}><AlertTriangle className="h-3 w-3" />{conflict}</span>}
                      </p>
                    </div>
                    <div className="relative mr-4 h-7">
                      {left !== null && right !== null ? (
                        <div
                          className={`absolute top-1 h-5 origin-left animate-grow-x overflow-hidden rounded-md bg-gradient-to-r shadow-sm ring-1 ring-black/5 ${STATUS_BAR[a.status] ?? STATUS_BAR.NOT_STARTED} ${late ? "ring-2 ring-danger/60" : ""}`}
                          style={{ left: `${left}%`, width: `${Math.max(0.8, right - left)}%`, animationDelay: `${i * 60}ms` }}
                          title={`${a.code} · ${prog} %`}
                        >
                          <div className="h-full bg-white/35" style={{ width: `${100 - prog}%`, marginLeft: `${prog}%` }} />
                        </div>
                      ) : (
                        <span className="absolute top-1.5 text-[11px] italic text-slate-400">{m.ui.notProvided}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {milestones.length > 0 && (
            <div className="pt-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-deep">{P.milestones}</p>
              {milestones.map((ms) => (
                <div key={ms.id} className="grid grid-cols-[220px_1fr] items-center py-1.5">
                  <p className="truncate pr-3 text-sm">{ms.title}</p>
                  <div className="relative mr-4 h-6">
                    <span className={`absolute top-1 h-3.5 w-3.5 -translate-x-1/2 rotate-45 animate-pop-in rounded-sm shadow ${ms.achievedAt ? "bg-brand" : "border-2 border-ochre bg-white"}`} style={{ left: `${pos(ms.dueDate)}%` }} title={ms.title} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
