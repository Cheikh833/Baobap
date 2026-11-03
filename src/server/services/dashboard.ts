import { db } from "@/server/db";
import { can, type TenantContext } from "@/server/permissions/check";
import { isOverdue, sumByCurrency, weightedTimeProgress } from "@/lib/metrics";

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
          select: { id: true, name: true, code: true, status: true, startDate: true, endDate: true, plannedBudget: true, currency: true, wizardStep: true },
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

  return {
    portfolios,
    programs,
    members,
    projects: {
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
