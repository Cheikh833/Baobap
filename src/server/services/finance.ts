import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { AppError, forbidden, notFound } from "@/server/errors";
import { audit, diff } from "@/server/audit";
import { assertCan, can, type TenantContext } from "@/server/permissions/check";
import { OWNER_ROLE_KEY } from "@/server/permissions/catalog";
import { budgetLineSchema, expenseSchema, fundingSchema } from "@/lib/validation/schemas";
import { lineTotals, projectFinance } from "@/lib/finance";

type Tx = Prisma.TransactionClient;
const alive = { deletedAt: null };
const money = (x: unknown) => Math.round(Number(x) * 100) / 100;

async function loadProject(tx: Tx | typeof db, ctx: TenantContext, projectId: string) {
  const p = await tx.project.findFirst({ where: { id: projectId, organizationId: ctx.organizationId, deletedAt: null } });
  if (!p) throw notFound("Projet introuvable.");
  return p;
}
const log = (tx: Tx, ctx: TenantContext, action: string, entityType: string, entityId: string, summary: string, changes?: Prisma.InputJsonValue) =>
  audit(tx, { organizationId: ctx.organizationId, actorId: ctx.userId, action, entityType, entityId, summary, changes });

// ───────────── Lecture ─────────────

export async function getProjectFinance(ctx: TenantContext, projectId: string) {
  assertCan(ctx, "finance:view");
  const project = await loadProject(db, ctx, projectId);
  const [fundings, lines, expenses] = await Promise.all([
    db.funding.findMany({ where: { projectId, ...alive }, orderBy: { createdAt: "asc" } }),
    db.budgetLine.findMany({ where: { projectId, ...alive }, orderBy: [{ position: "asc" }, { code: "asc" }] }),
    db.expense.findMany({ where: { projectId }, orderBy: [{ date: "desc" }, { createdAt: "desc" }] }),
  ]);
  const totals = projectFinance(lines, expenses, fundings);
  return { project, fundings, lines: lines.map((l) => ({ ...l, totals: lineTotals(l, expenses) })), expenses, totals };
}

/** Vue d'ensemble de l'organisation : totaux par devise (jamais additionnés entre devises) et dépenses à valider. */
export async function financeOverview(ctx: TenantContext) {
  assertCan(ctx, "finance:view");
  const projects = await db.project.findMany({
    where: { organizationId: ctx.organizationId, deletedAt: null, budgetLines: { some: { deletedAt: null } } },
    select: {
      id: true, code: true, name: true, currency: true, startDate: true, endDate: true, status: true,
      budgetLines: { where: alive, select: { id: true, plannedAmount: true, fundingId: true } },
      expenses: { select: { amount: true, status: true, budgetLineId: true } },
      fundings: { where: alive, select: { amount: true } },
    },
    orderBy: { code: "asc" },
  });
  const rows = projects.map((p) => ({ ...p, totals: projectFinance(p.budgetLines, p.expenses, p.fundings) }));
  const byCurrency = new Map<string, { planned: number; spent: number; pending: number; funded: number; projects: number }>();
  for (const r of rows) {
    const c = byCurrency.get(r.currency) ?? { planned: 0, spent: 0, pending: 0, funded: 0, projects: 0 };
    c.planned += r.totals.planned; c.spent += r.totals.spent; c.pending += r.totals.pending; c.funded += r.totals.funded; c.projects++;
    byCurrency.set(r.currency, c);
  }
  const pending = await db.expense.findMany({
    where: { organizationId: ctx.organizationId, status: "DRAFT", project: { deletedAt: null } },
    include: { project: { select: { id: true, code: true, currency: true } }, budgetLine: { select: { code: true, label: true } } },
    orderBy: { createdAt: "asc" },
  });
  return { rows, byCurrency: [...byCurrency].map(([currency, v]) => ({ currency, ...v })), pending };
}

// ───────────── Financements ─────────────

export async function createFunding(ctx: TenantContext, projectId: string, input: unknown) {
  assertCan(ctx, "finance:edit");
  const data = fundingSchema.parse(input);
  return db.$transaction(async (tx) => {
    const p = await loadProject(tx, ctx, projectId);
    const f = await tx.funding.create({ data: { ...data, projectId, organizationId: ctx.organizationId } });
    await log(tx, ctx, "finance.funding.create", "Funding", f.id, `Financement « ${f.donor} » ajouté (${money(f.amount)} ${p.currency})`);
    return f;
  });
}

export async function updateFunding(ctx: TenantContext, id: string, input: unknown) {
  assertCan(ctx, "finance:edit");
  const data = fundingSchema.parse(input);
  return db.$transaction(async (tx) => {
    const before = await tx.funding.findFirst({ where: { id, organizationId: ctx.organizationId, ...alive } });
    if (!before) throw notFound("Financement introuvable.");
    const full = { reference: null, startDate: null, endDate: null, notes: null, ...data };
    const f = await tx.funding.update({ where: { id }, data: full });
    await log(tx, ctx, "finance.funding.update", "Funding", id, `Financement « ${f.donor} » modifié`, diff(before, full));
    return f;
  });
}

export async function deleteFunding(ctx: TenantContext, id: string) {
  assertCan(ctx, "finance:delete");
  await db.$transaction(async (tx) => {
    const f = await tx.funding.findFirst({ where: { id, organizationId: ctx.organizationId, ...alive } });
    if (!f) throw notFound("Financement introuvable.");
    if (await tx.budgetLine.count({ where: { fundingId: id, ...alive } })) throw new AppError("CONFLICT", "Des lignes budgétaires sont rattachées à ce financement : rattachez-les ailleurs d'abord.");
    await tx.funding.update({ where: { id }, data: { deletedAt: new Date() } });
    await log(tx, ctx, "finance.funding.delete", "Funding", id, `Financement « ${f.donor} » supprimé`);
  });
}

// ───────────── Lignes budgétaires ─────────────

async function checkLine(tx: Tx, projectId: string, data: ReturnType<typeof budgetLineSchema.parse>, exceptId?: string) {
  if (data.fundingId && !(await tx.funding.findFirst({ where: { id: data.fundingId, projectId, ...alive } }))) throw new AppError("VALIDATION", "Financement introuvable dans ce projet.");
  const dup = await tx.budgetLine.findFirst({ where: { projectId, code: data.code, ...alive, ...(exceptId ? { id: { not: exceptId } } : {}) } });
  if (dup) throw new AppError("CONFLICT", "Ce code de ligne budgétaire est déjà utilisé dans ce projet.");
}

export async function createBudgetLine(ctx: TenantContext, projectId: string, input: unknown) {
  assertCan(ctx, "finance:edit");
  const data = budgetLineSchema.parse(input);
  return db.$transaction(async (tx) => {
    const p = await loadProject(tx, ctx, projectId);
    await checkLine(tx, projectId, data);
    const l = await tx.budgetLine.create({ data: { ...data, projectId, organizationId: ctx.organizationId } });
    await log(tx, ctx, "finance.line.create", "BudgetLine", l.id, `Ligne budgétaire ${l.code} « ${l.label} » ajoutée (${money(l.plannedAmount)} ${p.currency})`);
    return l;
  });
}

/** Révision budgétaire : le montant prévu ne peut pas descendre sous le montant déjà dépensé (validé). */
export async function updateBudgetLine(ctx: TenantContext, id: string, input: unknown) {
  assertCan(ctx, "finance:edit");
  const data = budgetLineSchema.parse(input);
  return db.$transaction(async (tx) => {
    const before = await tx.budgetLine.findFirst({ where: { id, organizationId: ctx.organizationId, ...alive } });
    if (!before) throw notFound("Ligne budgétaire introuvable.");
    await checkLine(tx, before.projectId, data, id);
    const spent = lineTotals(before, await tx.expense.findMany({ where: { budgetLineId: id } })).spent;
    if (data.plannedAmount < spent) throw new AppError("CONFLICT", `Le montant prévu ne peut pas être inférieur au montant déjà dépensé (${spent}).`);
    const full = { fundingId: null, notes: null, ...data };
    const l = await tx.budgetLine.update({ where: { id }, data: full });
    await log(tx, ctx, "finance.line.update", "BudgetLine", id, `Ligne budgétaire ${l.code} modifiée`, diff(before, full));
    return l;
  });
}

export async function deleteBudgetLine(ctx: TenantContext, id: string) {
  assertCan(ctx, "finance:delete");
  await db.$transaction(async (tx) => {
    const l = await tx.budgetLine.findFirst({ where: { id, organizationId: ctx.organizationId, ...alive } });
    if (!l) throw notFound("Ligne budgétaire introuvable.");
    if (await tx.expense.count({ where: { budgetLineId: id, status: { in: ["DRAFT", "VALIDATED"] } } })) throw new AppError("CONFLICT", "Cette ligne a des dépenses : elle ne peut pas être supprimée.");
    await tx.budgetLine.update({ where: { id }, data: { deletedAt: new Date() } });
    await log(tx, ctx, "finance.line.delete", "BudgetLine", id, `Ligne budgétaire ${l.code} supprimée`);
  });
}

// ───────────── Dépenses ─────────────

/** Saisie d'une dépense (brouillon). Elle ne compte dans « dépensé » qu'après validation. */
export async function createExpense(ctx: TenantContext, projectId: string, input: unknown, now = new Date()) {
  assertCan(ctx, "finance:create");
  const data = expenseSchema.parse(input);
  if (data.date.getTime() > now.getTime()) throw new AppError("VALIDATION", "La date de la dépense ne peut pas être dans le futur.");
  return db.$transaction(async (tx) => {
    const p = await loadProject(tx, ctx, projectId);
    const line = await tx.budgetLine.findFirst({ where: { id: data.budgetLineId, projectId, ...alive } });
    if (!line) throw new AppError("VALIDATION", "Ligne budgétaire introuvable dans ce projet.");
    const e = await tx.expense.create({ data: { ...data, projectId, organizationId: ctx.organizationId, createdById: ctx.userId } });
    await log(tx, ctx, "finance.expense.create", "Expense", e.id, `Dépense saisie sur ${line.code} : ${money(e.amount)} ${p.currency} (${e.description})`);
    return e;
  });
}

/**
 * Validation ou rejet (finance:approve). Séparation des tâches : la personne qui a saisi la dépense ne peut pas
 * la valider (sauf propriétaire de l'organisation). Une validation qui ferait dépasser la ligne est refusée :
 * il faut d'abord réviser le budget.
 */
export async function reviewExpense(ctx: TenantContext, id: string, approve: boolean, comment?: string) {
  assertCan(ctx, "finance:approve");
  return db.$transaction(async (tx) => {
    const e = await tx.expense.findFirst({ where: { id, organizationId: ctx.organizationId }, include: { budgetLine: true, project: { select: { currency: true } } } });
    if (!e) throw notFound("Dépense introuvable.");
    if (e.status !== "DRAFT") throw new AppError("CONFLICT", "Cette dépense a déjà été traitée.");
    if (approve) {
      if (e.createdById === ctx.userId && ctx.roleKey !== OWNER_ROLE_KEY) throw forbidden("Une dépense doit être validée par une autre personne que celle qui l'a saisie.");
      const t = lineTotals(e.budgetLine, await tx.expense.findMany({ where: { budgetLineId: e.budgetLineId } }));
      if (t.spent + money(e.amount) > t.planned) throw new AppError("CONFLICT", `Validation refusée : la ligne ${e.budgetLine.code} serait dépassée (disponible : ${t.remaining} ${e.project.currency}). Révisez le budget d'abord.`);
    }
    await tx.expense.update({ where: { id }, data: { status: approve ? "VALIDATED" : "REJECTED", validatedById: ctx.userId, validatedAt: new Date(), reviewComment: comment || null } });
    await log(tx, ctx, approve ? "finance.expense.validate" : "finance.expense.reject", "Expense", id, `${approve ? "Validation" : "Rejet"} d'une dépense de ${money(e.amount)} ${e.project.currency} sur ${e.budgetLine.code}`);
  });
}

/** Annulation d'une dépense validée : motif obligatoire, la dépense reste visible et tracée. */
export async function cancelExpense(ctx: TenantContext, id: string, reason: string | undefined) {
  assertCan(ctx, "finance:approve");
  if (!reason?.trim()) throw new AppError("VALIDATION", "Le motif d'annulation est obligatoire.");
  await db.$transaction(async (tx) => {
    const e = await tx.expense.findFirst({ where: { id, organizationId: ctx.organizationId }, include: { budgetLine: { select: { code: true } }, project: { select: { currency: true } } } });
    if (!e) throw notFound("Dépense introuvable.");
    if (e.status !== "VALIDATED") throw new AppError("CONFLICT", "Seule une dépense validée peut être annulée.");
    await tx.expense.update({ where: { id }, data: { status: "CANCELED", reviewComment: reason.trim().slice(0, 500) } });
    await log(tx, ctx, "finance.expense.cancel", "Expense", id, `Annulation d'une dépense validée de ${money(e.amount)} ${e.project.currency} sur ${e.budgetLine.code} : ${reason.trim()}`);
  });
}

/** Suppression d'un brouillon : par son auteur ou avec finance:delete. */
export async function deleteExpense(ctx: TenantContext, id: string) {
  const e = await db.expense.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!e) throw notFound("Dépense introuvable.");
  if (e.status !== "DRAFT") throw new AppError("CONFLICT", "Seule une dépense en attente de validation peut être supprimée.");
  if (!(can(ctx, "finance:delete") || (e.createdById === ctx.userId && can(ctx, "finance:create")))) throw forbidden();
  await db.$transaction(async (tx) => {
    await tx.expense.delete({ where: { id } });
    await log(tx, ctx, "finance.expense.delete", "Expense", id, `Suppression d'une dépense non validée (${money(e.amount)})`);
  });
}
