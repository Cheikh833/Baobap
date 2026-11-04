import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { AppError, forbidden, notFound } from "@/server/errors";
import { audit, diff } from "@/server/audit";
import { assertCan, can, READ_ONLY_MESSAGE, type TenantContext } from "@/server/permissions/check";
import { activitySchema, milestoneSchema, phaseSchema, taskSchema } from "@/lib/validation/schemas";
import { createsCycle } from "@/lib/planning";
import { assertMember } from "./guards";

type Tx = Prisma.TransactionClient;
const alive = { deletedAt: null };

async function loadProject(tx: Tx | typeof db, ctx: TenantContext, projectId: string) {
  const p = await tx.project.findFirst({ where: { id: projectId, organizationId: ctx.organizationId, deletedAt: null } });
  if (!p) throw notFound("Projet introuvable.");
  return p;
}

const log = (tx: Tx, ctx: TenantContext, action: string, entityType: string, entityId: string, summary: string, changes?: Prisma.InputJsonValue) =>
  audit(tx, { organizationId: ctx.organizationId, actorId: ctx.userId, action, entityType, entityId, summary, changes });

// ───────────── Lecture ─────────────

export async function getPlanning(ctx: TenantContext, projectId: string) {
  assertCan(ctx, "project:view");
  const project = await loadProject(db, ctx, projectId);
  const [phases, activities, milestones, tasks] = await Promise.all([
    db.projectPhase.findMany({ where: { projectId, ...alive }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] }),
    db.activity.findMany({
      where: { projectId, ...alive },
      include: { tasks: { where: alive, select: { id: true, status: true } }, predecessors: { select: { predecessorId: true, successorId: true } } },
      orderBy: [{ position: "asc" }, { startDate: "asc" }, { code: "asc" }],
    }),
    db.milestone.findMany({ where: { projectId, ...alive }, orderBy: { dueDate: "asc" } }),
    db.task.findMany({ where: { projectId, ...alive }, include: { activity: { select: { id: true, code: true, title: true } } }, orderBy: [{ status: "asc" }, { position: "asc" }, { createdAt: "asc" }] }),
  ]);
  return { project, phases, activities, milestones, tasks, dependencies: activities.flatMap((a) => a.predecessors) };
}

// ───────────── Phases ─────────────

export async function createPhase(ctx: TenantContext, projectId: string, input: unknown) {
  assertCan(ctx, "project:edit");
  const data = phaseSchema.parse(input);
  return db.$transaction(async (tx) => {
    await loadProject(tx, ctx, projectId);
    const ph = await tx.projectPhase.create({ data: { name: data.name, position: data.position ?? 0, projectId, organizationId: ctx.organizationId } });
    await log(tx, ctx, "planning.phase.create", "ProjectPhase", ph.id, `Phase « ${ph.name} » ajoutée`);
    return ph;
  });
}

export async function deletePhase(ctx: TenantContext, id: string) {
  assertCan(ctx, "project:edit");
  await db.$transaction(async (tx) => {
    const ph = await tx.projectPhase.findFirst({ where: { id, organizationId: ctx.organizationId, ...alive } });
    if (!ph) throw notFound("Phase introuvable.");
    if (await tx.activity.count({ where: { phaseId: id, ...alive } })) throw new AppError("CONFLICT", "Cette phase contient des activités : déplacez-les ou supprimez-les d'abord.");
    await tx.projectPhase.update({ where: { id }, data: { deletedAt: new Date() } });
    await log(tx, ctx, "planning.phase.delete", "ProjectPhase", id, `Phase « ${ph.name} » supprimée`);
  });
}

// ───────────── Activités ─────────────

async function checkActivity(tx: Tx, ctx: TenantContext, projectId: string, data: ReturnType<typeof activitySchema.parse>, exceptId?: string) {
  const project = await loadProject(tx, ctx, projectId);
  if (data.phaseId && !(await tx.projectPhase.findFirst({ where: { id: data.phaseId, projectId, ...alive } }))) throw new AppError("VALIDATION", "Phase introuvable dans ce projet.");
  await assertMember(tx, ctx.organizationId, data.ownerId, "Le responsable");
  // Les activités s'inscrivent dans la période du projet (quand elle est connue).
  if (project.startDate && data.startDate && data.startDate < project.startDate) throw new AppError("VALIDATION", "L'activité ne peut pas commencer avant le début du projet.");
  if (project.endDate && data.endDate && data.endDate > project.endDate) throw new AppError("VALIDATION", "L'activité ne peut pas se terminer après la fin du projet.");
  const dup = await tx.activity.findFirst({ where: { projectId, code: data.code, ...alive, ...(exceptId ? { id: { not: exceptId } } : {}) } });
  if (dup) throw new AppError("CONFLICT", "Ce code d'activité est déjà utilisé dans ce projet.");
}

export async function createActivity(ctx: TenantContext, projectId: string, input: unknown) {
  assertCan(ctx, "project:edit");
  const data = activitySchema.parse(input);
  return db.$transaction(async (tx) => {
    await checkActivity(tx, ctx, projectId, data);
    const a = await tx.activity.create({ data: { ...data, position: data.position ?? 0, projectId, organizationId: ctx.organizationId, createdById: ctx.userId } });
    await log(tx, ctx, "planning.activity.create", "Activity", a.id, `Activité ${a.code} « ${a.title} » ajoutée`);
    return a;
  });
}

async function loadActivity(tx: Tx | typeof db, ctx: TenantContext, id: string) {
  const a = await tx.activity.findFirst({ where: { id, organizationId: ctx.organizationId, ...alive, project: { deletedAt: null } } });
  if (!a) throw notFound("Activité introuvable.");
  return a;
}

export async function updateActivity(ctx: TenantContext, id: string, input: unknown) {
  assertCan(ctx, "project:edit");
  const data = activitySchema.parse(input);
  return db.$transaction(async (tx) => {
    const before = await loadActivity(tx, ctx, id);
    await checkActivity(tx, ctx, before.projectId, data, id);
    const full = { description: null, phaseId: null, ownerId: null, startDate: null, endDate: null, ...data, position: data.position ?? 0 };
    const a = await tx.activity.update({ where: { id }, data: full });
    await log(tx, ctx, "planning.activity.update", "Activity", id, `Activité ${a.code} modifiée`, diff(before, full));
    return a;
  });
}

export async function deleteActivity(ctx: TenantContext, id: string) {
  assertCan(ctx, "project:edit");
  await db.$transaction(async (tx) => {
    const a = await loadActivity(tx, ctx, id);
    if (await tx.task.count({ where: { activityId: id, ...alive } })) throw new AppError("CONFLICT", "Cette activité contient des tâches : supprimez-les ou rattachez-les ailleurs d'abord.");
    await tx.activityDependency.deleteMany({ where: { OR: [{ predecessorId: id }, { successorId: id }] } });
    await tx.activity.update({ where: { id }, data: { deletedAt: new Date() } });
    await log(tx, ctx, "planning.activity.delete", "Activity", id, `Activité ${a.code} supprimée`);
  });
}

/** Ajoute une dépendance « fin → début ». Même projet, sans cycle. */
export async function addDependency(ctx: TenantContext, predecessorId: string, successorId: string) {
  assertCan(ctx, "project:edit");
  await db.$transaction(async (tx) => {
    const [p, s] = await Promise.all([loadActivity(tx, ctx, predecessorId), loadActivity(tx, ctx, successorId)]);
    if (p.projectId !== s.projectId) throw new AppError("VALIDATION", "Les deux activités doivent appartenir au même projet.");
    const edges = await tx.activityDependency.findMany({ where: { successor: { projectId: p.projectId } } });
    if (createsCycle(edges, predecessorId, successorId)) throw new AppError("VALIDATION", "Cette dépendance créerait une boucle entre activités.");
    await tx.activityDependency.upsert({ where: { predecessorId_successorId: { predecessorId, successorId } }, create: { predecessorId, successorId }, update: {} });
    await log(tx, ctx, "planning.dependency.add", "Activity", successorId, `Dépendance : ${s.code} après ${p.code}`);
  });
}

export async function removeDependency(ctx: TenantContext, predecessorId: string, successorId: string) {
  assertCan(ctx, "project:edit");
  await loadActivity(db, ctx, successorId);
  await db.activityDependency.deleteMany({ where: { predecessorId, successorId } });
}

// ───────────── Tâches ─────────────

async function checkTask(tx: Tx, ctx: TenantContext, projectId: string, data: ReturnType<typeof taskSchema.parse>) {
  await loadProject(tx, ctx, projectId);
  if (data.activityId && !(await tx.activity.findFirst({ where: { id: data.activityId, projectId, ...alive } }))) throw new AppError("VALIDATION", "Activité introuvable dans ce projet.");
  await assertMember(tx, ctx.organizationId, data.assigneeId, "La personne assignée");
}

export async function createTask(ctx: TenantContext, projectId: string, input: unknown) {
  assertCan(ctx, "project:edit");
  const data = taskSchema.parse(input);
  return db.$transaction(async (tx) => {
    await checkTask(tx, ctx, projectId, data);
    const last = await tx.task.aggregate({ where: { projectId, status: data.status, ...alive }, _max: { position: true } });
    const t = await tx.task.create({ data: { ...data, projectId, organizationId: ctx.organizationId, createdById: ctx.userId, position: (last._max.position ?? 0) + 1, completedAt: data.status === "DONE" ? new Date() : null } });
    await log(tx, ctx, "planning.task.create", "Task", t.id, `Tâche « ${t.title} » créée`);
    return t;
  });
}

async function loadTask(tx: Tx | typeof db, ctx: TenantContext, id: string) {
  const t = await tx.task.findFirst({ where: { id, organizationId: ctx.organizationId, ...alive, project: { deletedAt: null } } });
  if (!t) throw notFound("Tâche introuvable.");
  return t;
}

export async function updateTask(ctx: TenantContext, id: string, input: unknown) {
  assertCan(ctx, "project:edit");
  const data = taskSchema.parse(input);
  return db.$transaction(async (tx) => {
    const before = await loadTask(tx, ctx, id);
    await checkTask(tx, ctx, before.projectId, data);
    const full = { description: null, activityId: null, assigneeId: null, dueDate: null, ...data, completedAt: data.status === "DONE" ? before.completedAt ?? new Date() : null };
    const t = await tx.task.update({ where: { id }, data: full });
    await log(tx, ctx, "planning.task.update", "Task", id, `Tâche « ${t.title} » modifiée`, diff(before, data));
    return t;
  });
}

/**
 * Déplace une tâche (Kanban). Autorisé avec « project:edit », ou à la personne assignée pour sa propre tâche.
 * La position place la tâche avant la tâche cible dans la colonne (ou en fin de colonne).
 */
export async function moveTask(ctx: TenantContext, id: string, status: string, beforeTaskId?: string | null) {
  if (ctx.readOnly) throw new AppError("FORBIDDEN", READ_ONLY_MESSAGE);
  const target = taskSchema.shape.status.parse(status);
  return db.$transaction(async (tx) => {
    const t = await loadTask(tx, ctx, id);
    if (!can(ctx, "project:edit") && t.assigneeId !== ctx.userId) throw forbidden();
    const column = await tx.task.findMany({ where: { projectId: t.projectId, status: target, ...alive, id: { not: id } }, orderBy: [{ position: "asc" }, { createdAt: "asc" }], select: { id: true } });
    const idx = beforeTaskId ? column.findIndex((c) => c.id === beforeTaskId) : -1;
    const ordered = [...column.map((c) => c.id)];
    ordered.splice(idx >= 0 ? idx : ordered.length, 0, id);
    await Promise.all(ordered.map((tid, i) => tx.task.update({ where: { id: tid }, data: { position: i + 1 } })));
    await tx.task.update({ where: { id }, data: { status: target, completedAt: target === "DONE" ? t.completedAt ?? new Date() : null } });
    if (t.status !== target) await log(tx, ctx, "planning.task.move", "Task", id, `Tâche « ${t.title} » : ${t.status} → ${target}`, { status: { from: t.status, to: target } });
  });
}

export async function deleteTask(ctx: TenantContext, id: string) {
  assertCan(ctx, "project:edit");
  await db.$transaction(async (tx) => {
    const t = await loadTask(tx, ctx, id);
    await tx.task.update({ where: { id }, data: { deletedAt: new Date() } });
    await log(tx, ctx, "planning.task.delete", "Task", id, `Tâche « ${t.title} » supprimée`);
  });
}

/** Tâches assignées à l'utilisateur, non terminées, toutes organisations confondues exclues (organisation active seulement). */
export async function myTasks(ctx: TenantContext, take = 8) {
  return db.task.findMany({
    where: { organizationId: ctx.organizationId, assigneeId: ctx.userId, status: { not: "DONE" }, ...alive, project: { deletedAt: null } },
    include: { project: { select: { id: true, code: true, name: true } } },
    orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
    take,
  });
}

/** Compteurs d'alerte de planification pour le tableau de bord. */
export async function planningAlerts(ctx: TenantContext, now = new Date()) {
  if (!can(ctx, "project:view")) return null;
  const base = { organizationId: ctx.organizationId, ...alive, project: { deletedAt: null } };
  const [lateActivities, overdueTasks] = await Promise.all([
    db.activity.count({ where: { ...base, endDate: { lt: now }, status: { notIn: ["DONE", "CANCELED"] } } }),
    db.task.count({ where: { ...base, dueDate: { lt: now }, status: { not: "DONE" } } }),
  ]);
  return { lateActivities, overdueTasks };
}

// ───────────── Jalons ─────────────

export async function createMilestone(ctx: TenantContext, projectId: string, input: unknown) {
  assertCan(ctx, "project:edit");
  const data = milestoneSchema.parse(input);
  return db.$transaction(async (tx) => {
    await loadProject(tx, ctx, projectId);
    const ms = await tx.milestone.create({ data: { ...data, projectId, organizationId: ctx.organizationId } });
    await log(tx, ctx, "planning.milestone.create", "Milestone", ms.id, `Jalon « ${ms.title} » ajouté`);
    return ms;
  });
}

export async function setMilestoneAchieved(ctx: TenantContext, id: string, achieved: boolean) {
  assertCan(ctx, "project:edit");
  await db.$transaction(async (tx) => {
    const ms = await tx.milestone.findFirst({ where: { id, organizationId: ctx.organizationId, ...alive } });
    if (!ms) throw notFound("Jalon introuvable.");
    await tx.milestone.update({ where: { id }, data: { achievedAt: achieved ? new Date() : null } });
    await log(tx, ctx, "planning.milestone.update", "Milestone", id, `Jalon « ${ms.title} » ${achieved ? "atteint" : "rouvert"}`);
  });
}

export async function deleteMilestone(ctx: TenantContext, id: string) {
  assertCan(ctx, "project:edit");
  await db.$transaction(async (tx) => {
    const ms = await tx.milestone.findFirst({ where: { id, organizationId: ctx.organizationId, ...alive } });
    if (!ms) throw notFound("Jalon introuvable.");
    await tx.milestone.update({ where: { id }, data: { deletedAt: new Date() } });
    await log(tx, ctx, "planning.milestone.delete", "Milestone", id, `Jalon « ${ms.title} » supprimé`);
  });
}
