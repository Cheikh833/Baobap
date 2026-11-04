import { db } from "@/server/db";
import { can, type TenantContext } from "@/server/permissions/check";
import { isOverdue, sumByCurrency, timeProgress, weightedTimeProgress } from "@/lib/metrics";

/**
 * Vue consolidée de l'organisation, calculée uniquement à partir des données enregistrées.
 * Chaque bloc n'est calculé que si l'utilisateur a le droit de consulter la ressource.
 */
export async function getDashboard(ctx: TenantContext) {
  const where = { organizationId: ctx.organizationId, deletedAt: null };
  const [portfolios, programs, projects, members] = await Promise.all([
    can(ctx, "portfolio:view") ? db.portfolio.count({ where }) : null,
    can(ctx, "program:view") ? db.program.count({ where }) : null,
    can(ctx, "project:view")
      ? db.project.findMany({
          where,
          select: { id: true, name: true, code: true, status: true, startDate: true, endDate: true, plannedBudget: true, currency: true, wizardStep: true, portfolio: { select: { id: true, name: true } } },
        })
      : null,
    can(ctx, "members:view") ? db.membership.count({ where: { organizationId: ctx.organizationId, status: "ACTIVE" } }) : null,
  ]);

  if (!projects) return { portfolios, programs, members, projects: null };

  const byStatus: Record<string, number> = {};
  for (const p of projects) byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
  const running = projects.filter((p) => p.status === "ACTIVE");
  const now = new Date();
  const overdue = projects.filter((p) => isOverdue(p.status, p.endDate, now));
  const in30 = new Date(now.getTime() + 30 * 86_400_000);
  const upcoming = projects
    .filter((p) => p.endDate && p.endDate >= now && p.endDate <= in30 && !["CLOSED", "ARCHIVED"].includes(p.status))
    .sort((a, b) => a.endDate!.getTime() - b.endDate!.getTime());
  const drafts = projects.filter((p) => p.status === "DRAFT");
  const active = projects.filter((p) => p.status !== "ARCHIVED");

  // Budget prévu par portefeuille (par devise ; « Hors portefeuille » pour les projets non rattachés).
  const byPortfolio = new Map<string, { name: string | null; totals: Record<string, number>; count: number }>();
  for (const p of active) {
    const key = p.portfolio?.id ?? "_none";
    const e = byPortfolio.get(key) ?? { name: p.portfolio?.name ?? null, totals: {}, count: 0 };
    e.count++;
    if (p.plannedBudget !== null) e.totals[p.currency] = (e.totals[p.currency] ?? 0) + Number(p.plannedBudget);
    byPortfolio.set(key, e);
  }
  const runningProgress = running
    .map((p) => ({ id: p.id, code: p.code, name: p.name, endDate: p.endDate, progress: timeProgress(p.startDate, p.endDate, now) }))
    .filter((p) => p.progress !== null)
    .sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0))
    .slice(0, 6) as { id: string; code: string; name: string; endDate: Date | null; progress: number }[];

  return {
    portfolios,
    programs,
    members,
    projects: {
      byPortfolio: [...byPortfolio.values()],
      runningProgress,
      total: projects.length,
      byStatus,
      overdue,
      upcoming,
      drafts,
      budget: sumByCurrency(active),
      timeProgress: weightedTimeProgress(running, now),
      runningCount: running.length,
    },
  };
}
