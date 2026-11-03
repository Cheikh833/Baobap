import { db } from "@/server/db";
import { assertCan, type TenantContext } from "@/server/permissions/check";

export async function listAuditLogs(ctx: TenantContext, opts: { page?: number; entityType?: string } = {}) {
  assertCan(ctx, "audit:view");
  const take = 50;
  const page = Math.max(1, opts.page ?? 1);
  const where = { organizationId: ctx.organizationId, ...(opts.entityType ? { entityType: opts.entityType } : {}) };
  const [rows, total] = await Promise.all([
    db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, take, skip: (page - 1) * take }),
    db.auditLog.count({ where }),
  ]);
  const actorIds = [...new Set(rows.map((r) => r.actorId).filter(Boolean))] as string[];
  const actors = await db.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } });
  const names = new Map(actors.map((a) => [a.id, a.name]));
  return { rows: rows.map((r) => ({ ...r, actorName: r.actorId ? names.get(r.actorId) ?? "Utilisateur supprimé" : "Système" })), total, page, pages: Math.max(1, Math.ceil(total / take)) };
}

/** Activité récente visible au tableau de bord (les membres sans audit:view ne voient que leurs propres actions). */
export async function recentActivity(ctx: TenantContext, take = 8) {
  const all = ctx.roleKey === "ORG_OWNER" || ctx.permissions.has("audit:view");
  const rows = await db.auditLog.findMany({
    where: { organizationId: ctx.organizationId, ...(all ? {} : { actorId: ctx.userId }) },
    orderBy: { createdAt: "desc" },
    take,
  });
  const actors = await db.user.findMany({ where: { id: { in: rows.map((r) => r.actorId!).filter(Boolean) } }, select: { id: true, name: true } });
  const names = new Map(actors.map((a) => [a.id, a.name]));
  return rows.map((r) => ({ ...r, actorName: r.actorId ? names.get(r.actorId) ?? "—" : "Système" }));
}
