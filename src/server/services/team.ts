import { db } from "@/server/db";
import { AppError, notFound } from "@/server/errors";
import { audit, diff } from "@/server/audit";
import { assertCan, can, type TenantContext } from "@/server/permissions/check";
import { projectMemberSchema, stakeholderSchema } from "@/lib/validation/schemas";
import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;
const alive = { deletedAt: null };

async function loadProject(tx: Tx | typeof db, ctx: TenantContext, projectId: string) {
  const p = await tx.project.findFirst({ where: { id: projectId, organizationId: ctx.organizationId, deletedAt: null } });
  if (!p) throw notFound("Projet introuvable.");
  return p;
}
const log = (tx: Tx, ctx: TenantContext, action: string, entityType: string, entityId: string, summary: string, changes?: Prisma.InputJsonValue) =>
  audit(tx, { organizationId: ctx.organizationId, actorId: ctx.userId, action, entityType, entityId, summary, changes });

/** Quadrant de la grille de Mendelow (influence × intérêt, de 1 à 3). */
export type Quadrant = "manage" | "satisfy" | "inform" | "monitor";
export const quadrant = (influence: number, interest: number): Quadrant =>
  influence >= 2 && interest >= 2 ? "manage" : influence >= 2 ? "satisfy" : interest >= 2 ? "inform" : "monitor";

export async function getProjectTeam(ctx: TenantContext, projectId: string) {
  assertCan(ctx, "project:view");
  await loadProject(db, ctx, projectId);
  const [members, stakeholders] = await Promise.all([
    db.projectMember.findMany({ where: { projectId }, orderBy: { createdAt: "asc" } }),
    db.stakeholder.findMany({ where: { projectId, ...alive }, orderBy: [{ influence: "desc" }, { interest: "desc" }, { name: "asc" }] }),
  ]);
  const users = await db.user.findMany({ where: { id: { in: members.map((m) => m.userId) } }, select: { id: true, name: true, email: true } });
  const byId = new Map(users.map((u) => [u.id, u]));
  // Coordonnées personnelles des parties prenantes : visibles seulement par qui peut modifier le projet.
  const showContacts = can(ctx, "project:edit");
  return {
    members: members.map((m) => ({ ...m, user: byId.get(m.userId) ?? null })),
    stakeholders: stakeholders.map((s) => ({ ...s, quadrant: quadrant(s.influence, s.interest), ...(showContacts ? {} : { email: null, phone: null, contactName: null }) })),
    showContacts,
  };
}

export async function addProjectMember(ctx: TenantContext, projectId: string, input: unknown) {
  assertCan(ctx, "project:edit");
  const data = projectMemberSchema.parse(input);
  return db.$transaction(async (tx) => {
    const p = await loadProject(tx, ctx, projectId);
    const ms = await tx.membership.findUnique({ where: { userId_organizationId: { userId: data.userId, organizationId: ctx.organizationId } }, include: { user: { select: { name: true } } } });
    if (!ms || ms.status !== "ACTIVE") throw new AppError("VALIDATION", "Le membre doit être un membre actif de l'organisation.");
    if (await tx.projectMember.findUnique({ where: { projectId_userId: { projectId, userId: data.userId } } })) throw new AppError("CONFLICT", "Cette personne fait déjà partie de l'équipe du projet.");
    const m = await tx.projectMember.create({ data: { ...data, projectId, organizationId: ctx.organizationId } });
    await log(tx, ctx, "project.team.add", "Project", projectId, `${ms.user.name} ajouté(e) à l'équipe de « ${p.name} » (${data.role})`);
    return m;
  });
}

export async function updateProjectMember(ctx: TenantContext, id: string, input: unknown) {
  assertCan(ctx, "project:edit");
  return db.$transaction(async (tx) => {
    const before = await tx.projectMember.findFirst({ where: { id, organizationId: ctx.organizationId, project: { deletedAt: null } } });
    if (!before) throw notFound("Membre de l'équipe introuvable.");
    const data = projectMemberSchema.parse({ ...(input as object), userId: before.userId });
    const full = { allocation: null, startDate: null, endDate: null, ...data };
    await tx.projectMember.update({ where: { id }, data: full });
    await log(tx, ctx, "project.team.update", "Project", before.projectId, "Équipe du projet : affectation modifiée", diff(before, full));
  });
}

export async function removeProjectMember(ctx: TenantContext, id: string) {
  assertCan(ctx, "project:edit");
  await db.$transaction(async (tx) => {
    const m = await tx.projectMember.findFirst({ where: { id, organizationId: ctx.organizationId } });
    if (!m) throw notFound("Membre de l'équipe introuvable.");
    await tx.projectMember.delete({ where: { id } });
    await log(tx, ctx, "project.team.remove", "Project", m.projectId, `Retrait de l'équipe du projet (${m.role})`);
  });
}

export async function createStakeholder(ctx: TenantContext, projectId: string, input: unknown) {
  assertCan(ctx, "project:edit");
  const data = stakeholderSchema.parse(input);
  return db.$transaction(async (tx) => {
    await loadProject(tx, ctx, projectId);
    const s = await tx.stakeholder.create({ data: { ...data, projectId, organizationId: ctx.organizationId } });
    await log(tx, ctx, "project.stakeholder.create", "Project", projectId, `Partie prenante « ${s.name} » ajoutée`);
    return s;
  });
}

export async function updateStakeholder(ctx: TenantContext, id: string, input: unknown) {
  assertCan(ctx, "project:edit");
  const data = stakeholderSchema.parse(input);
  await db.$transaction(async (tx) => {
    const before = await tx.stakeholder.findFirst({ where: { id, organizationId: ctx.organizationId, ...alive } });
    if (!before) throw notFound("Partie prenante introuvable.");
    const full = { organization: null, contactName: null, email: null, phone: null, engagement: null, ...data };
    await tx.stakeholder.update({ where: { id }, data: full });
    await log(tx, ctx, "project.stakeholder.update", "Project", before.projectId, `Partie prenante « ${data.name} » modifiée`, diff(before, full));
  });
}

export async function deleteStakeholder(ctx: TenantContext, id: string) {
  assertCan(ctx, "project:edit");
  await db.$transaction(async (tx) => {
    const s = await tx.stakeholder.findFirst({ where: { id, organizationId: ctx.organizationId, ...alive } });
    if (!s) throw notFound("Partie prenante introuvable.");
    await tx.stakeholder.update({ where: { id }, data: { deletedAt: new Date() } });
    await log(tx, ctx, "project.stakeholder.delete", "Project", s.projectId, `Partie prenante « ${s.name} » supprimée`);
  });
}
