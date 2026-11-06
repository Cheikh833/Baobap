import { db } from "@/server/db";
import { can, type TenantContext } from "@/server/permissions/check";
import { OWNER_ROLE_KEY } from "@/server/permissions/catalog";
import { isStale, toNum } from "@/lib/meal";

// « Mes actions » : ce que la personne connectée doit faire maintenant, calculé en direct à partir des données
// et de ses droits (aucune notification n'est stockée, donc jamais de doublon ni d'alerte périmée).

export type ActionKind = "meal-validate" | "expense-validate" | "task-overdue" | "task-soon" | "activity-late" | "risk-review" | "indicator-stale";
export type ActionItem = { kind: ActionKind; id: string; title: string; context: string; href: string; date: Date | null; severity: "high" | "medium" };

const DAY = 86_400_000;
const alive = { deletedAt: null };

export async function myActions(ctx: TenantContext, now = new Date()): Promise<ActionItem[]> {
  const live = { organizationId: ctx.organizationId, project: { deletedAt: null } };
  const owner = ctx.roleKey === OWNER_ROLE_KEY;
  // Séparation des tâches : on ne propose pas de valider ce qu'on a soi-même saisi (sauf propriétaire).
  const notMine = owner ? {} : { NOT: { collectedById: ctx.userId } };
  const notMineExp = owner ? {} : { NOT: { createdById: ctx.userId } };
  const [values, expenses, tasks, activities, risks, indicators] = await Promise.all([
    can(ctx, "meal:approve")
      ? db.indicatorValue.findMany({ where: { organizationId: ctx.organizationId, status: "DRAFT", indicator: { ...alive, project: { deletedAt: null } }, ...notMine }, include: { indicator: { select: { id: true, code: true, name: true, unit: true, project: { select: { code: true } } } } }, orderBy: { createdAt: "asc" }, take: 50 })
      : [],
    can(ctx, "finance:approve")
      ? db.expense.findMany({ where: { ...live, status: "DRAFT", ...notMineExp }, include: { project: { select: { id: true, code: true, currency: true } }, budgetLine: { select: { code: true } } }, orderBy: { createdAt: "asc" }, take: 50 })
      : [],
    db.task.findMany({ where: { ...live, ...alive, assigneeId: ctx.userId, status: { not: "DONE" }, dueDate: { lt: new Date(now.getTime() + 7 * DAY) } }, include: { project: { select: { id: true, code: true } } }, orderBy: { dueDate: "asc" }, take: 50 }),
    db.activity.findMany({ where: { ...live, ...alive, ownerId: ctx.userId, endDate: { lt: now }, status: { notIn: ["DONE", "CANCELED"] } }, include: { project: { select: { id: true, code: true } } }, orderBy: { endDate: "asc" }, take: 50 }),
    can(ctx, "risk:view")
      ? db.risk.findMany({ where: { ...live, ...alive, status: { not: "CLOSED" }, reviewDate: { lt: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) }, OR: [{ ownerId: ctx.userId }, ...(can(ctx, "risk:edit") ? [{ ownerId: null }] : [])] }, include: { project: { select: { id: true, code: true } } }, orderBy: { reviewDate: "asc" }, take: 50 })
      : [],
    can(ctx, "meal:create")
      ? db.indicator.findMany({ where: { ...live, ...alive, responsibleId: ctx.userId }, include: { project: { select: { code: true } }, values: { select: { id: true, periodStart: true, periodEnd: true, value: true, status: true, supersededBy: { select: { id: true, status: true } } } } }, take: 100 })
      : [],
  ]);
  const items: ActionItem[] = [
    ...values.map((v): ActionItem => ({ kind: "meal-validate", id: v.id, title: `${v.indicator.code} · ${v.indicator.name}`, context: `${v.indicator.project.code} · ${toNum(v.value) ?? ""} ${v.indicator.unit}`.trim(), href: `/meal/indicators/${v.indicator.id}`, date: v.periodEnd, severity: "medium" })),
    ...expenses.map((e): ActionItem => ({ kind: "expense-validate", id: e.id, title: e.description, context: `${e.project.code} · ${e.budgetLine.code} · ${Number(e.amount).toLocaleString("fr-FR")} ${e.project.currency}`, href: `/projects/${e.project.id}?tab=finance`, date: e.date, severity: "medium" })),
    ...tasks.map((t): ActionItem => {
      const overdue = !!t.dueDate && t.dueDate < now;
      return { kind: overdue ? "task-overdue" : "task-soon", id: t.id, title: t.title, context: t.project.code, href: `/projects/${t.project.id}?tab=activities`, date: t.dueDate, severity: overdue ? "high" : "medium" };
    }),
    ...activities.map((a): ActionItem => ({ kind: "activity-late", id: a.id, title: `${a.code} · ${a.title}`, context: a.project.code, href: `/projects/${a.project.id}?tab=planning`, date: a.endDate, severity: "high" })),
    ...risks.map((r): ActionItem => ({ kind: "risk-review", id: r.id, title: `${r.code} · ${r.title}`, context: r.project.code, href: `/projects/${r.project.id}?tab=risks`, date: r.reviewDate, severity: r.probability * r.impact > 15 ? "high" : "medium" })),
    ...indicators
      .filter((i) => isStale({ frequency: i.frequency, baselineDate: i.baselineDate }, i.values.map((v) => ({ ...v, value: toNum(v.value) })), now))
      .map((i): ActionItem => ({ kind: "indicator-stale", id: i.id, title: `${i.code} · ${i.name}`, context: i.project.code, href: `/meal/indicators/${i.id}`, date: null, severity: "medium" })),
  ];
  return items.sort((a, b) => Number(b.severity === "high") - Number(a.severity === "high") || (a.date?.getTime() ?? Infinity) - (b.date?.getTime() ?? Infinity));
}

/** Compteur pour le menu (même calcul, sans le détail). */
export async function myActionsCount(ctx: TenantContext) {
  return (await myActions(ctx)).length;
}
