import { db } from "@/server/db";
import type { TenantContext } from "@/server/permissions/check";
import { listActiveMemberOptions } from "./members";
import { objectiveOptions } from "./strategy";

/** Listes de choix pour les formulaires, toujours limitées à l'organisation active. */
export async function hierarchyOptions(ctx: TenantContext) {
  const w = { organizationId: ctx.organizationId, deletedAt: null };
  const [members, portfolios, programs, org] = await Promise.all([
    listActiveMemberOptions(ctx),
    db.portfolio.findMany({ where: w, select: { id: true, name: true, code: true }, orderBy: { name: "asc" } }),
    db.program.findMany({ where: w, select: { id: true, name: true, code: true, portfolioId: true }, orderBy: { name: "asc" } }),
    db.organization.findUniqueOrThrow({ where: { id: ctx.organizationId }, select: { defaultCurrency: true } }),
  ]);
  return {
    members: members.map((m) => [m.id, m.name] as const),
    portfolios: portfolios.map((p) => [p.id, `${p.code} · ${p.name}`] as const),
    programs: programs.map((p) => [p.id, `${p.code} · ${p.name}`] as const),
    memberNames: new Map(members.map((m) => [m.id, m.name])),
    currency: org.defaultCurrency,
  };
}

/** Options d'objectifs stratégiques + contributions actuelles d'un projet (étape 2 de l'assistant). */
export async function strategyOptions(ctx: TenantContext, projectId?: string) {
  const [plans, current] = await Promise.all([
    objectiveOptions(ctx),
    projectId ? db.projectObjectiveContribution.findMany({ where: { projectId, project: { organizationId: ctx.organizationId } }, select: { objectiveId: true, weight: true } }) : Promise.resolve([]),
  ]);
  return { plans, current: Object.fromEntries(current.map((c) => [c.objectiveId, c.weight])) };
}
