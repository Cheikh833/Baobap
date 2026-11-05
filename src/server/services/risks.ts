import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { AppError, notFound } from "@/server/errors";
import { audit, diff } from "@/server/audit";
import { assertCan, type TenantContext } from "@/server/permissions/check";
import { riskSchema } from "@/lib/validation/schemas";
import { isReviewOverdue, riskLevel, riskScore } from "@/lib/risk";
import { assertMember } from "./guards";

type Tx = Prisma.TransactionClient;
const alive = { deletedAt: null };

const withScore = <T extends { probability: number; impact: number; status: string; reviewDate: Date | null }>(r: T, now = new Date()) => {
  const score = riskScore(r.probability, r.impact);
  return { ...r, score, level: riskLevel(score), overdue: isReviewOverdue(r, now) };
};

export async function listProjectRisks(ctx: TenantContext, projectId: string) {
  assertCan(ctx, "risk:view");
  const p = await db.project.findFirst({ where: { id: projectId, organizationId: ctx.organizationId, deletedAt: null }, select: { id: true } });
  if (!p) throw notFound("Projet introuvable.");
  const risks = await db.risk.findMany({ where: { projectId, ...alive }, orderBy: { code: "asc" } });
  return risks.map((r) => withScore(r)).sort((a, b) => Number(a.status === "CLOSED") - Number(b.status === "CLOSED") || b.score - a.score || a.code.localeCompare(b.code));
}

export async function risksOverview(ctx: TenantContext, now = new Date()) {
  assertCan(ctx, "risk:view");
  const risks = await db.risk.findMany({
    where: { organizationId: ctx.organizationId, ...alive, project: { deletedAt: null } },
    include: { project: { select: { id: true, code: true, name: true } } },
  });
  return risks.map((r) => withScore(r, now)).sort((a, b) => Number(a.status === "CLOSED") - Number(b.status === "CLOSED") || b.score - a.score);
}

async function check(tx: Tx, ctx: TenantContext, projectId: string, data: ReturnType<typeof riskSchema.parse>, exceptId?: string) {
  await assertMember(tx, ctx.organizationId, data.ownerId, "Le responsable");
  const dup = await tx.risk.findFirst({ where: { projectId, code: data.code, ...alive, ...(exceptId ? { id: { not: exceptId } } : {}) } });
  if (dup) throw new AppError("CONFLICT", "Ce code de risque est déjà utilisé dans ce projet.");
}

export async function createRisk(ctx: TenantContext, projectId: string, input: unknown) {
  assertCan(ctx, "risk:create");
  const data = riskSchema.parse(input);
  return db.$transaction(async (tx) => {
    const p = await tx.project.findFirst({ where: { id: projectId, organizationId: ctx.organizationId, deletedAt: null } });
    if (!p) throw notFound("Projet introuvable.");
    await check(tx, ctx, projectId, data);
    const r = await tx.risk.create({ data: { ...data, projectId, organizationId: ctx.organizationId, createdById: ctx.userId } });
    await audit(tx, { organizationId: ctx.organizationId, actorId: ctx.userId, action: "risk.create", entityType: "Risk", entityId: r.id, summary: `Risque ${r.code} « ${r.title} » enregistré (score ${riskScore(r.probability, r.impact)})` });
    return r;
  });
}

export async function updateRisk(ctx: TenantContext, id: string, input: unknown) {
  assertCan(ctx, "risk:edit");
  const data = riskSchema.parse(input);
  return db.$transaction(async (tx) => {
    const before = await tx.risk.findFirst({ where: { id, organizationId: ctx.organizationId, ...alive } });
    if (!before) throw notFound("Risque introuvable.");
    await check(tx, ctx, before.projectId, data, id);
    const full = { description: null, ownerId: null, mitigation: null, contingency: null, reviewDate: null, ...data };
    const r = await tx.risk.update({ where: { id }, data: full });
    await audit(tx, { organizationId: ctx.organizationId, actorId: ctx.userId, action: "risk.update", entityType: "Risk", entityId: id, summary: `Risque ${r.code} mis à jour (score ${riskScore(r.probability, r.impact)})`, changes: diff(before, full) as Prisma.InputJsonValue });
    return r;
  });
}

export async function deleteRisk(ctx: TenantContext, id: string) {
  assertCan(ctx, "risk:delete");
  await db.$transaction(async (tx) => {
    const r = await tx.risk.findFirst({ where: { id, organizationId: ctx.organizationId, ...alive } });
    if (!r) throw notFound("Risque introuvable.");
    await tx.risk.update({ where: { id }, data: { deletedAt: new Date() } });
    await audit(tx, { organizationId: ctx.organizationId, actorId: ctx.userId, action: "risk.delete", entityType: "Risk", entityId: id, summary: `Risque ${r.code} supprimé` });
  });
}
