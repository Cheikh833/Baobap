import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { AppError, forbidden, notFound } from "@/server/errors";
import { audit } from "@/server/audit";
import { assertCan, can, type TenantContext } from "@/server/permissions/check";
import { dateRange, optDate, optId, optText, reqText } from "@/lib/validation/common";
import { getProject } from "./projects";
import { getPlanning } from "./planning";
import { getLogframe, mealOverview } from "./meal";
import { financeOverview, getProjectFinance } from "./finance";
import { listProjectRisks, risksOverview } from "./risks";
import { getProjectTeam } from "./team";
import { activePlanSummary } from "./strategy";
import { isActivityLate, planningProgress } from "@/lib/planning";
import { timeProgress } from "@/lib/metrics";
import { planCoverage } from "@/lib/strategy";

// BAOBAB Studio : rapports générés depuis les données. Un rapport en brouillon se recalcule à chaque affichage ;
// à la validation, ses données sont figées (snapshot) et ne changent plus.

export const REPORT_TYPES = ["PROJECT_PROGRESS", "PROJECT_FINANCIAL", "ORGANIZATION_SUMMARY"] as const;
export const reportSchema = dateRange(z.object({
  type: z.enum(REPORT_TYPES),
  projectId: optId,
  title: reqText("Le titre", 200),
  startDate: optDate,
  endDate: optDate,
}));
export const narrativeSchema = z.object({ summary: optText(5000), highlights: optText(5000), challenges: optText(5000), nextSteps: optText(5000) });
export type Narrative = z.infer<typeof narrativeSchema>;

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));
const alive = { deletedAt: null };
const optional = async <T,>(ok: boolean, f: () => Promise<T>) => (ok ? f().catch(() => null) : null);

/** Données d'un rapport, sérialisables (pour l'affichage et pour l'instantané figé). */
export async function buildReportData(ctx: TenantContext, r: { type: string; projectId: string | null; periodStart: Date | null; periodEnd: Date | null }) {
  const org = await db.organization.findUniqueOrThrow({ where: { id: ctx.organizationId }, select: { name: true, defaultCurrency: true } });
  const base = { generatedAt: new Date().toISOString(), orgName: org.name, type: r.type, periodStart: iso(r.periodStart), periodEnd: iso(r.periodEnd) };

  if (r.type === "ORGANIZATION_SUMMARY") {
    const [fin, meal, risks, plan, projects] = await Promise.all([
      optional(can(ctx, "finance:view"), () => financeOverview(ctx)),
      optional(can(ctx, "meal:view"), () => mealOverview(ctx)),
      optional(can(ctx, "risk:view"), () => risksOverview(ctx)),
      optional(can(ctx, "strategy:view"), () => activePlanSummary(ctx)),
      db.project.findMany({ where: { organizationId: ctx.organizationId, ...alive, status: { not: "ARCHIVED" } }, select: { id: true, code: true, name: true, status: true, currency: true, plannedBudget: true }, orderBy: { code: "asc" } }),
    ]);
    const cov = plan ? planCoverage(plan.axes.flatMap((x) => x.objectives)) : null;
    return {
      ...base,
      org: {
        projects: projects.map((p) => {
          const f = fin?.rows.find((x) => x.id === p.id);
          const inds = meal?.rows.filter((i) => i.project.id === p.id && i.calc.rate !== null) ?? [];
          return { code: p.code, name: p.name, status: p.status, currency: p.currency, planned: f?.totals.planned ?? n(p.plannedBudget), execution: f?.totals.execution ?? null, indicatorsAvg: inds.length ? Math.round(inds.reduce((s, i) => s + Math.min(100, i.calc.rate!), 0) / inds.length) : null, criticalRisks: risks?.filter((x) => x.project.id === p.id && x.status !== "CLOSED" && x.level === "critical").length ?? null };
        }),
        byCurrency: fin?.byCurrency ?? null,
        indicators: meal ? { total: meal.rows.length, good: meal.rows.filter((i) => i.calc.status === "good").length, watch: meal.rows.filter((i) => i.calc.status === "watch").length, critical: meal.rows.filter((i) => i.calc.status === "critical").length } : null,
        risks: risks ? { open: risks.filter((x) => x.status !== "CLOSED").length, critical: risks.filter((x) => x.status !== "CLOSED" && x.level === "critical").length } : null,
        strategy: plan && cov ? { title: plan.title, covered: cov.covered, objectives: cov.objectives, rate: cov.rate } : null,
      },
    };
  }

  if (!r.projectId) throw new AppError("VALIDATION", "Choisissez le projet du rapport.");
  const p = await getProject(ctx, r.projectId);
  const [planning, lf, fin, risks, team] = await Promise.all([
    optional(true, () => getPlanning(ctx, p.id)),
    optional(can(ctx, "meal:view"), () => getLogframe(ctx, p.id)),
    optional(can(ctx, "finance:view"), () => getProjectFinance(ctx, p.id)),
    optional(can(ctx, "risk:view"), () => listProjectRisks(ctx, p.id)),
    optional(true, () => getProjectTeam(ctx, p.id)),
  ]);
  const manager = p.managerId ? await db.user.findUnique({ where: { id: p.managerId }, select: { name: true } }) : null;
  const project = {
    code: p.code, name: p.name, program: p.program?.name ?? null, manager: manager?.name ?? null, region: p.region, country: p.country,
    start: iso(p.startDate), end: iso(p.endDate), currency: p.currency, status: p.status, objective: p.generalObjective,
    elapsed: timeProgress(p.startDate, p.endDate), actual: planning ? planningProgress(planning.activities) : null,
  };
  const inPeriod = (d: Date) => (!r.periodStart || d >= r.periodStart) && (!r.periodEnd || d <= r.periodEnd);
  const finance = fin && {
    currency: p.currency, ...(({ perLine: _p, ...t }) => t)(fin.totals),
    lines: fin.lines.map((l) => ({ code: l.code, label: l.label, category: l.category, planned: l.totals.planned, spent: l.totals.spent, remaining: l.totals.remaining, rate: l.totals.rate })),
    fundings: fin.fundings.map((f) => ({ donor: f.donor, reference: f.reference, amount: n(f.amount) })),
    expenses: r.type === "PROJECT_FINANCIAL"
      ? fin.expenses.filter((e) => e.status === "VALIDATED" && inPeriod(e.date)).map((e) => ({ date: iso(e.date), line: fin.lines.find((l) => l.id === e.budgetLineId)?.code ?? "", description: e.description, supplier: e.supplier, reference: e.reference, amount: n(e.amount) })).sort((a, b) => (a.date! < b.date! ? -1 : 1))
      : null,
  };
  if (finance?.expenses) (finance as Record<string, unknown>).periodSpent = Math.round(finance.expenses.reduce((s, e) => s + (e.amount ?? 0), 0) * 100) / 100;
  return {
    ...base, project, finance,
    activities: planning ? {
      total: planning.activities.length, done: planning.activities.filter((a) => a.status === "DONE").length,
      late: planning.activities.filter((a) => isActivityLate(a)).map((a) => ({ code: a.code, title: a.title, end: iso(a.endDate) })),
    } : null,
    milestones: planning ? planning.milestones.map((m) => ({ title: m.title, due: iso(m.dueDate), achieved: iso(m.achievedAt) })) : null,
    indicators: lf ? lf.indicators.map((i) => ({ code: i.code, name: i.name, unit: i.unit, baseline: i.calc.baseline, target: i.calc.target, current: i.calc.current, rate: i.calc.rate, status: i.calc.status })) : null,
    risks: risks ? risks.filter((x) => x.status !== "CLOSED").map((x) => ({ code: x.code, title: x.title, score: x.score, level: x.level, status: x.status, mitigation: x.mitigation })) : null,
    team: team ? team.members.map((t) => ({ name: t.user?.name ?? "—", role: t.role })) : null,
  };
}
export type ReportData = Awaited<ReturnType<typeof buildReportData>>;

// ───────────── Cycle de vie ─────────────

/** Les personnes sans droit de création (ex. bailleurs) ne voient que les rapports validés. */
const visibleWhere = (ctx: TenantContext): Prisma.ReportWhereInput => ({ organizationId: ctx.organizationId, ...alive, ...(can(ctx, "reports:create") ? {} : { status: "FINAL" }) });

export async function listReports(ctx: TenantContext, projectId?: string) {
  assertCan(ctx, "reports:view");
  return db.report.findMany({ where: { ...visibleWhere(ctx), ...(projectId ? { projectId } : {}) }, include: { project: { select: { id: true, code: true, name: true } } }, orderBy: { updatedAt: "desc" }, take: 200 });
}

export async function createReport(ctx: TenantContext, input: unknown) {
  assertCan(ctx, "reports:create");
  const data = reportSchema.parse(input);
  if (data.type !== "ORGANIZATION_SUMMARY" && !data.projectId) throw new AppError("VALIDATION", "Choisissez le projet du rapport.");
  if (data.projectId && !(await db.project.findFirst({ where: { id: data.projectId, organizationId: ctx.organizationId, ...alive } }))) throw new AppError("VALIDATION", "Projet introuvable.");
  return db.$transaction(async (tx) => {
    const r = await tx.report.create({ data: { organizationId: ctx.organizationId, type: data.type, projectId: data.type === "ORGANIZATION_SUMMARY" ? null : data.projectId, title: data.title, periodStart: data.startDate ?? null, periodEnd: data.endDate ?? null, createdById: ctx.userId } });
    await audit(tx, { organizationId: ctx.organizationId, actorId: ctx.userId, action: "report.create", entityType: "Report", entityId: r.id, summary: `Rapport « ${r.title} » créé` });
    return r;
  });
}

export async function getReport(ctx: TenantContext, id: string) {
  assertCan(ctx, "reports:view");
  const r = await db.report.findFirst({ where: { id, ...visibleWhere(ctx) }, include: { project: { select: { id: true, code: true, name: true } } } });
  if (!r) throw notFound("Rapport introuvable.");
  const data = (r.status === "FINAL" && r.snapshot ? r.snapshot : await buildReportData(ctx, r)) as ReportData;
  return { ...r, data, narrative: narrativeSchema.parse(r.narrative ?? {}) };
}

const canEdit = (ctx: TenantContext, r: { createdById: string | null }) => can(ctx, "reports:edit") || (r.createdById === ctx.userId && can(ctx, "reports:create"));

export async function updateNarrative(ctx: TenantContext, id: string, input: unknown) {
  const r = await db.report.findFirst({ where: { id, organizationId: ctx.organizationId, ...alive } });
  if (!r) throw notFound("Rapport introuvable.");
  if (!canEdit(ctx, r)) throw forbidden();
  if (r.status === "FINAL") throw new AppError("CONFLICT", "Un rapport validé ne se modifie plus.");
  const narrative = narrativeSchema.parse(input);
  await db.$transaction(async (tx) => {
    await tx.report.update({ where: { id }, data: { narrative } });
    await audit(tx, { organizationId: ctx.organizationId, actorId: ctx.userId, action: "report.update", entityType: "Report", entityId: id, summary: `Rapport « ${r.title} » : texte modifié` });
  });
}

/** Validation : fige les données (instantané) ; le rapport ne bouge plus ensuite. */
export async function finalizeReport(ctx: TenantContext, id: string) {
  assertCan(ctx, "reports:approve");
  const r = await db.report.findFirst({ where: { id, organizationId: ctx.organizationId, ...alive } });
  if (!r) throw notFound("Rapport introuvable.");
  if (r.status === "FINAL") throw new AppError("CONFLICT", "Ce rapport est déjà validé.");
  const snapshot = await buildReportData(ctx, r);
  await db.$transaction(async (tx) => {
    await tx.report.update({ where: { id }, data: { status: "FINAL", snapshot: snapshot as Prisma.InputJsonValue, approvedById: ctx.userId, approvedAt: new Date() } });
    await audit(tx, { organizationId: ctx.organizationId, actorId: ctx.userId, action: "report.finalize", entityType: "Report", entityId: id, summary: `Rapport « ${r.title} » validé (données figées)` });
  });
}

export async function deleteReport(ctx: TenantContext, id: string) {
  const r = await db.report.findFirst({ where: { id, organizationId: ctx.organizationId, ...alive } });
  if (!r) throw notFound("Rapport introuvable.");
  // brouillon : son auteur ou reports:delete ; rapport validé : reports:delete uniquement (traçabilité)
  if (!(can(ctx, "reports:delete") || (r.status === "DRAFT" && canEdit(ctx, r)))) throw forbidden();
  await db.$transaction(async (tx) => {
    await tx.report.update({ where: { id }, data: { deletedAt: new Date() } });
    await audit(tx, { organizationId: ctx.organizationId, actorId: ctx.userId, action: "report.delete", entityType: "Report", entityId: id, summary: `Rapport « ${r.title} » supprimé` });
  });
}

