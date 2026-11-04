import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import {
  addDependency, createActivity, createMilestone, createPhase, createTask, deleteActivity, deletePhase, getPlanning, moveTask, myTasks, planningAlerts, setMilestoneAchieved,
} from "@/server/services/planning";
import { createProjectDraft, saveProjectStep } from "@/server/services/projects";
import { memberWithRole, ownerWithOrg, resetDb } from "./helpers";

const code = (e: unknown) => (e instanceof AppError ? e.code : e && typeof e === "object" && "name" in e && e.name === "ZodError" ? "ZOD" : String(e));
const expectCode = (p: Promise<unknown>, c: string) => expect(p.then(() => "OK", code)).resolves.toBe(c);

beforeEach(resetDb);
afterAll(() => db.$disconnect());

async function setup() {
  const a = await ownerWithOrg("A");
  const p = await createProjectDraft(a.ctx, { name: "Projet", code: "P1" });
  await saveProjectStep(a.ctx, p.id, 6, { startDate: "2026-01-01", endDate: "2026-12-31" });
  return { a, p };
}

describe("planification", () => {
  it("activités dans la période du projet, codes uniques, phases", async () => {
    const { a, p } = await setup();
    const ph = await createPhase(a.ctx, p.id, { name: "Lancement" });
    await createActivity(a.ctx, p.id, { code: "A1", title: "Recrutement", phaseId: ph.id, startDate: "2026-01-10", endDate: "2026-02-28" });
    await expectCode(createActivity(a.ctx, p.id, { code: "a1", title: "Doublon" }), "CONFLICT");
    await expectCode(createActivity(a.ctx, p.id, { code: "A2", title: "Trop tôt", startDate: "2025-12-01" }), "VALIDATION");
    await expectCode(createActivity(a.ctx, p.id, { code: "A3", title: "Trop tard", endDate: "2027-03-01" }), "VALIDATION");
    await expectCode(createActivity(a.ctx, p.id, { code: "A4", title: "Dates inversées", startDate: "2026-05-01", endDate: "2026-04-01" }), "ZOD");
    await expectCode(deletePhase(a.ctx, ph.id), "CONFLICT");
    const plan = await getPlanning(a.ctx, p.id);
    expect(plan.activities).toHaveLength(1);
  });

  it("dépendances : même projet, sans boucle", async () => {
    const { a, p } = await setup();
    const x = await createActivity(a.ctx, p.id, { code: "A1", title: "X" });
    const y = await createActivity(a.ctx, p.id, { code: "A2", title: "Y" });
    const z = await createActivity(a.ctx, p.id, { code: "A3", title: "Z" });
    await addDependency(a.ctx, x.id, y.id);
    await addDependency(a.ctx, y.id, z.id);
    await expectCode(addDependency(a.ctx, z.id, x.id), "VALIDATION");
    await expectCode(addDependency(a.ctx, x.id, x.id), "VALIDATION");
    const q = await createProjectDraft(a.ctx, { name: "Autre", code: "P2" });
    const w = await createActivity(a.ctx, q.id, { code: "B1", title: "W" });
    await expectCode(addDependency(a.ctx, x.id, w.id), "VALIDATION");
    expect((await getPlanning(a.ctx, p.id)).dependencies).toHaveLength(2);
  });

  it("tâches : Kanban, ordre, assigné qui déplace sa tâche, lecteur refusé", async () => {
    const { a, p } = await setup();
    const tm = await memberWithRole(a.org.id, "TEAM_MEMBER");
    const t1 = await createTask(a.ctx, p.id, { title: "T1", assigneeId: tm.user.id });
    const t2 = await createTask(a.ctx, p.id, { title: "T2" });
    await moveTask(tm.ctx, t1.id, "IN_PROGRESS");
    await expectCode(moveTask(tm.ctx, t2.id, "DONE"), "FORBIDDEN");
    await moveTask(a.ctx, t2.id, "IN_PROGRESS", t1.id);
    const col = (await getPlanning(a.ctx, p.id)).tasks.filter((t) => t.status === "IN_PROGRESS").sort((x, y) => x.position - y.position).map((t) => t.title);
    expect(col).toEqual(["T2", "T1"]);
    await moveTask(a.ctx, t1.id, "DONE");
    expect((await db.task.findUniqueOrThrow({ where: { id: t1.id } })).completedAt).not.toBeNull();
    expect(await myTasks(tm.ctx)).toHaveLength(0);
    await expectCode(createTask(tm.ctx, p.id, { title: "Interdit" }), "FORBIDDEN");
  });

  it("isolation : aucune action sur la planification d'une autre organisation", async () => {
    const { p, a } = await setup();
    const b = await ownerWithOrg("B");
    const t = await createTask(a.ctx, p.id, { title: "Secrète" });
    await expectCode(getPlanning(b.ctx, p.id), "NOT_FOUND");
    await expectCode(createActivity(b.ctx, p.id, { code: "X1", title: "Intrusion" }), "NOT_FOUND");
    await expectCode(moveTask(b.ctx, t.id, "DONE"), "NOT_FOUND");
    await expectCode(createTask(a.ctx, p.id, { title: "x", assigneeId: b.user.id }), "VALIDATION");
  });

  it("jalons et alertes ; activité avec tâches non supprimable", async () => {
    const { a, p } = await setup();
    const act = await createActivity(a.ctx, p.id, { code: "A1", title: "Ancienne", startDate: "2026-01-01", endDate: "2026-01-31" });
    await createTask(a.ctx, p.id, { title: "En retard", activityId: act.id, dueDate: "2026-01-15" });
    await expectCode(deleteActivity(a.ctx, act.id), "CONFLICT");
    const ms = await createMilestone(a.ctx, p.id, { title: "Lancement", dueDate: "2026-03-01" });
    await setMilestoneAchieved(a.ctx, ms.id, true);
    expect((await db.milestone.findUniqueOrThrow({ where: { id: ms.id } })).achievedAt).not.toBeNull();
    const al = await planningAlerts(a.ctx, new Date("2026-06-01"));
    expect(al).toEqual({ lateActivities: 1, overdueTasks: 1 });
  });
});
