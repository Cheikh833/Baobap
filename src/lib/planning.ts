// Planification — formules (docs/product/business-rules.md, section Planification).
//
// - Avancement d'une activité : part des tâches terminées (si l'activité a des tâches),
//   sinon l'avancement saisi. Une activité « terminée » vaut 100 %, une activité annulée est exclue.
// - Avancement réel du projet : moyenne des avancements d'activités, pondérée par leur durée (jours).
// - Activité en retard : date de fin dépassée et statut ni « terminée » ni « annulée ».
// - Tâche en retard : échéance dépassée et tâche non terminée.
// - Conflit de dépendance : le successeur commence avant la fin du prédécesseur.

export type PActivity = { id: string; status: string; progress: number; startDate: Date | null; endDate: Date | null; tasks?: { status: string }[] };

export function activityProgress(a: PActivity): number {
  if (a.status === "DONE") return 100;
  const tasks = a.tasks ?? [];
  if (tasks.length) return Math.round((tasks.filter((t) => t.status === "DONE").length / tasks.length) * 100);
  return Math.max(0, Math.min(100, a.progress));
}

export const isActivityLate = (a: { status: string; endDate: Date | null }, now = new Date()) =>
  !!a.endDate && a.endDate < now && !["DONE", "CANCELED"].includes(a.status);

export const isTaskOverdue = (t: { status: string; dueDate: Date | null }, now = new Date()) => !!t.dueDate && t.dueDate < now && t.status !== "DONE";

const days = (a: Date, b: Date) => Math.max(1, Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1);

/** Avancement réel pondéré par la durée ; null si aucune activité exploitable. */
export function planningProgress(activities: PActivity[]) {
  let w = 0, sum = 0;
  for (const a of activities) {
    if (a.status === "CANCELED") continue;
    const d = a.startDate && a.endDate ? days(a.startDate, a.endDate) : 1;
    sum += activityProgress(a) * d;
    w += d;
  }
  return w ? Math.round(sum / w) : null;
}

export function dependencyConflicts(deps: { predecessorId: string; successorId: string }[], byId: Map<string, { startDate: Date | null; endDate: Date | null }>) {
  return deps.filter((d) => {
    const p = byId.get(d.predecessorId), s = byId.get(d.successorId);
    return !!p?.endDate && !!s?.startDate && s.startDate < p.endDate;
  });
}

/** Vrai si ajouter l'arc from → to crée un cycle dans le graphe des dépendances. */
export function createsCycle(edges: { predecessorId: string; successorId: string }[], from: string, to: string) {
  if (from === to) return true;
  const next = new Map<string, string[]>();
  for (const e of edges) next.set(e.predecessorId, [...(next.get(e.predecessorId) ?? []), e.successorId]);
  const stack = [to], seen = new Set<string>();
  while (stack.length) {
    const n = stack.pop()!;
    if (n === from) return true;
    if (seen.has(n)) continue;
    seen.add(n);
    stack.push(...(next.get(n) ?? []));
  }
  return false;
}

/** Plage affichée par le Gantt : dates du projet, élargies aux activités et jalons. */
export function ganttRange(items: (Date | null | undefined)[], fallback = new Date()) {
  const ds = items.filter((d): d is Date => !!d).map((d) => d.getTime());
  if (!ds.length) {
    const s = new Date(Date.UTC(fallback.getUTCFullYear(), fallback.getUTCMonth(), 1));
    return { start: s, end: new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth() + 6, 0)) };
  }
  const s = new Date(Math.min(...ds)), e = new Date(Math.max(...ds));
  return { start: new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), 1)), end: new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth() + 1, 0)) };
}

/** Écart entre avancement réel et temps écoulé → niveau de santé « Activités ». */
export function activitiesHealth(actual: number | null, elapsed: number | null, lateCount: number): "good" | "watch" | "critical" | "unknown" {
  if (actual === null) return "unknown";
  const gap = elapsed === null ? 0 : elapsed - actual;
  if (gap > 25) return "critical";
  if (gap > 10 || lateCount > 0) return "watch";
  return "good";
}
