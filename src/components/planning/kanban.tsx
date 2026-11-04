"use client";
import { useEffect, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Clock, GripVertical } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { useI18n } from "@/i18n/client";
import { fill } from "@/i18n/translate";
import { moveTaskAction } from "@/app/(workspace)/projects/actions";

export type KTask = {
  id: string; title: string; status: Status; priority: string; position: number;
  dueDate: string | null; overdue: boolean; assigneeName: string | null; activityCode: string | null; canMove: boolean;
};
type Status = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
const COLUMNS: Status[] = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"];
const COL_STYLE: Record<Status, string> = {
  TODO: "bg-slate-400", IN_PROGRESS: "bg-info", REVIEW: "bg-ochre", DONE: "bg-brand",
};
const PRIO: Record<string, string> = { LOW: "bg-slate-100 text-slate-600", MEDIUM: "bg-blue-50 text-blue-700", HIGH: "bg-amber-50 text-amber-800", CRITICAL: "bg-red-50 text-red-700" };

/** Tableau Kanban : glisser-déposer + flèches (clavier, mobile). Mise à jour immédiate, annulée si le serveur refuse. */
export function Kanban({ tasks: initial, locale }: { tasks: KTask[]; locale: string }) {
  const { m } = useI18n();
  const P = m.planning;
  const [tasks, setTasks] = useState(initial);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  useEffect(() => setTasks(initial), [initial]);

  const dateFmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
  const col = (s: Status) => tasks.filter((t) => t.status === s).sort((a, b) => a.position - b.position);

  function move(id: string, status: Status, beforeId: string | null) {
    const prev = tasks;
    const t = tasks.find((x) => x.id === id);
    if (!t || !t.canMove || (t.status === status && !beforeId)) return;
    // Réordonnancement local immédiat
    const others = tasks.filter((x) => x.status === status && x.id !== id).sort((a, b) => a.position - b.position);
    const idx = beforeId ? others.findIndex((x) => x.id === beforeId) : -1;
    others.splice(idx >= 0 ? idx : others.length, 0, { ...t, status });
    const pos = new Map(others.map((x, i) => [x.id, i + 1]));
    setTasks(tasks.map((x) => (x.id === id ? { ...x, status, position: pos.get(id)! } : pos.has(x.id) ? { ...x, position: pos.get(x.id)! } : x)));
    setError(null);
    start(async () => {
      const r = await moveTaskAction(id, status, beforeId);
      if (!r?.ok) { setTasks(prev); setError(r?.message ?? m.states.errorText); }
    });
  }

  return (
    <div>
      <p className="mb-3 text-xs text-slate-500">{P.kanbanHint}</p>
      {error && <p role="alert" className="mb-3 rounded-lg border border-danger/30 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((s, ci) => (
          <section
            key={s}
            aria-label={P.taskStatus[s]}
            onDragOver={(e) => { e.preventDefault(); setOverCol(s); }}
            onDragLeave={() => setOverCol((c) => (c === s ? null : c))}
            onDrop={(e) => { e.preventDefault(); const target = (e.target as HTMLElement).closest<HTMLElement>("[data-task]")?.dataset.task ?? null; if (dragId) move(dragId, s, target !== dragId ? target : null); setDragId(null); setOverCol(null); }}
            className={cn("flex min-h-40 flex-col rounded-2xl border bg-canvas/70 p-3 transition-colors", overCol === s ? "border-brand/50 bg-brand-50/60" : "border-line")}
          >
            <header className="mb-3 flex items-center gap-2 px-1">
              <span className={cn("h-2.5 w-2.5 rounded-full", COL_STYLE[s])} aria-hidden />
              <h3 className="text-sm font-semibold">{P.taskStatus[s]}</h3>
              <span className="ml-auto rounded-full bg-white px-2 text-xs font-semibold text-slate-500 shadow-sm">{col(s).length}</span>
            </header>
            <ul className="flex flex-1 flex-col gap-2">
              {col(s).length === 0 && <li className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-xs text-slate-400">{P.noTasks}</li>}
              {col(s).map((t, i) => (
                <li
                  key={t.id}
                  data-task={t.id}
                  draggable={t.canMove}
                  onDragStart={(e) => { setDragId(t.id); e.dataTransfer.effectAllowed = "move"; }}
                  onDragEnd={() => setDragId(null)}
                  className={cn(
                    "group animate-pop-in rounded-xl border border-line bg-white p-3 shadow-sm transition duration-200",
                    t.canMove && "cursor-grab hover:-translate-y-0.5 hover:shadow-lift active:cursor-grabbing",
                    dragId === t.id && "opacity-50",
                  )}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="flex items-start gap-2">
                    {t.canMove && <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 group-hover:text-slate-400" aria-hidden />}
                    <p className={cn("min-w-0 flex-1 text-sm font-medium", s === "DONE" && "text-slate-500 line-through decoration-slate-300")}>{t.title}</p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className={cn("rounded-full px-1.5 py-0.5 font-semibold", PRIO[t.priority])}>{m.priority[t.priority as keyof typeof m.priority]}</span>
                    {t.activityCode && <span className="rounded-full bg-brand-50 px-1.5 py-0.5 font-mono font-semibold text-brand-deep">{t.activityCode}</span>}
                    {t.dueDate && (
                      <span className={cn("inline-flex items-center gap-0.5", t.overdue && s !== "DONE" ? "font-semibold text-danger" : "text-slate-500")}>
                        <Clock className="h-3 w-3" aria-hidden />{fill(P.due, { date: dateFmt.format(new Date(t.dueDate)) })}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    {t.assigneeName ? (
                      <span className="flex items-center gap-1.5 text-xs text-slate-600">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-navy to-[#1E4A6E] text-[10px] font-bold text-white" aria-hidden>
                          {t.assigneeName.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                        </span>
                        {t.assigneeName}
                      </span>
                    ) : <span />}
                    {t.canMove && (
                      <span className="flex gap-1">
                        <button type="button" disabled={ci === 0} onClick={() => move(t.id, COLUMNS[ci - 1], null)} className="rounded-md p-1 text-slate-400 hover:bg-canvas hover:text-navy disabled:opacity-30" aria-label={`${P.moveLeft} : ${t.title}`}><ChevronLeft className="h-4 w-4" /></button>
                        <button type="button" disabled={ci === COLUMNS.length - 1} onClick={() => move(t.id, COLUMNS[ci + 1], null)} className="rounded-md p-1 text-slate-400 hover:bg-canvas hover:text-navy disabled:opacity-30" aria-label={`${P.moveRight} : ${t.title}`}><ChevronRight className="h-4 w-4" /></button>
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
