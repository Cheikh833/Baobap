import { describe, expect, it } from "vitest";
import { activitiesHealth, activityProgress, createsCycle, dependencyConflicts, ganttRange, isActivityLate, planningProgress } from "@/lib/planning";

const d = (s: string) => new Date(`${s}T00:00:00Z`);

describe("formules de planification", () => {
  it("avancement d'une activité : tâches terminées, sinon saisie ; terminée = 100 %", () => {
    expect(activityProgress({ id: "a", status: "IN_PROGRESS", progress: 10, startDate: null, endDate: null, tasks: [{ status: "DONE" }, { status: "TODO" }, { status: "DONE" }, { status: "REVIEW" }] })).toBe(50);
    expect(activityProgress({ id: "a", status: "IN_PROGRESS", progress: 30, startDate: null, endDate: null })).toBe(30);
    expect(activityProgress({ id: "a", status: "DONE", progress: 0, startDate: null, endDate: null })).toBe(100);
  });
  it("avancement du projet pondéré par la durée, activités annulées exclues", () => {
    const r = planningProgress([
      { id: "a", status: "DONE", progress: 0, startDate: d("2026-01-01"), endDate: d("2026-01-10") }, // 10 j, 100 %
      { id: "b", status: "IN_PROGRESS", progress: 0, startDate: d("2026-01-01"), endDate: d("2026-04-10"), tasks: [] }, // 100 j, 0 %
      { id: "c", status: "CANCELED", progress: 0, startDate: d("2026-01-01"), endDate: d("2026-12-31") },
    ]);
    expect(r).toBe(9);
    expect(planningProgress([])).toBeNull();
  });
  it("retards, conflits de dépendance, cycles", () => {
    expect(isActivityLate({ status: "IN_PROGRESS", endDate: d("2026-01-01") }, d("2026-02-01"))).toBe(true);
    expect(isActivityLate({ status: "DONE", endDate: d("2026-01-01") }, d("2026-02-01"))).toBe(false);
    const byId = new Map([["p", { startDate: d("2026-01-01"), endDate: d("2026-03-01") }], ["s", { startDate: d("2026-02-01"), endDate: d("2026-04-01") }]]);
    expect(dependencyConflicts([{ predecessorId: "p", successorId: "s" }], byId)).toHaveLength(1);
    expect(createsCycle([{ predecessorId: "a", successorId: "b" }, { predecessorId: "b", successorId: "c" }], "c", "a")).toBe(true);
    expect(createsCycle([{ predecessorId: "a", successorId: "b" }], "a", "c")).toBe(false);
  });
  it("santé « Activités » et plage du Gantt", () => {
    expect(activitiesHealth(null, 50, 0)).toBe("unknown");
    expect(activitiesHealth(45, 50, 0)).toBe("good");
    expect(activitiesHealth(45, 50, 1)).toBe("watch");
    expect(activitiesHealth(20, 50, 0)).toBe("critical");
    const r = ganttRange([d("2026-02-15"), d("2026-05-03")]);
    expect(r.start.toISOString().slice(0, 10)).toBe("2026-02-01");
    expect(r.end.toISOString().slice(0, 10)).toBe("2026-05-31");
  });
});
