import { db } from "@/server/db";
import { AppError, notFound } from "@/server/errors";
import { audit } from "@/server/audit";
import { assertCan, type TenantContext } from "@/server/permissions/check";
import { getPlan } from "@/lib/plans";
import { usage as billingUsage } from "./billing";
import { storageUsed } from "./documents";
import { toCsv } from "@/lib/csv-write";
import { createZip } from "@/lib/zip";

const monthStart = (now = new Date()) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

/** Requêtes BAOBAB AI consommées ce mois-ci par l'organisation (réponses de l'assistant). */
export async function aiUsageThisMonth(organizationId: string, now = new Date()) {
  return db.aiMessage.count({ where: { organizationId, role: "assistant", createdAt: { gte: monthStart(now) } } });
}

export async function usage(ctx: TenantContext) {
  assertCan(ctx, "administration:view");
  const plan = getPlan(ctx.plan);
  const [counts, storage, ai, byRole] = await Promise.all([
    billingUsage(db, ctx.organizationId),
    storageUsed(ctx.organizationId),
    aiUsageThisMonth(ctx.organizationId),
    db.membership.groupBy({ by: ["roleId"], where: { organizationId: ctx.organizationId, status: "ACTIVE" }, _count: true }),
  ]);
  const roles = await db.role.findMany({ where: { id: { in: byRole.map((r: { roleId: string }) => r.roleId) } }, select: { id: true, key: true, name: true } });
  const sensitive = await db.auditLog.findMany({
    where: { organizationId: ctx.organizationId, OR: ["delete", "role", "member", "cancel", "finalize", "export", "invitation", "subscription"].map((k) => ({ action: { contains: k } })) },
    orderBy: { createdAt: "desc" }, take: 12, select: { id: true, summary: true, createdAt: true, actorId: true },
  });
  return {
    plan: plan.code, limits: plan.limits,
    members: counts.members, projects: counts.projects, storage, ai,
    byRole: byRole.map((r: { roleId: string; _count: number }) => ({ role: roles.find((x) => x.id === r.roleId)!, count: r._count })),
    sensitive,
  };
}

// ───────────── Sécurité du compte (chaque utilisateur, pour lui-même) ─────────────

export async function mySecurity(userId: string) {
  const [sessions, accounts, user] = await Promise.all([
    db.session.findMany({ where: { userId, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" }, select: { id: true, createdAt: true, expiresAt: true, userAgent: true } }),
    db.oAuthAccount.findMany({ where: { userId }, orderBy: { createdAt: "asc" }, select: { id: true, provider: true, email: true, lastUsedAt: true } }),
    db.user.findUniqueOrThrow({ where: { id: userId }, select: { passwordHash: true, email: true } }),
  ]);
  return { sessions, accounts, hasPassword: !!user.passwordHash, email: user.email };
}

/** Déconnecte tous les autres appareils (la session courante est conservée). */
export async function revokeOtherSessions(userId: string, currentId: string | null) {
  const { count } = await db.session.deleteMany({ where: { userId, ...(currentId ? { id: { not: currentId } } : {}) } });
  await audit(db, { organizationId: null, actorId: userId, action: "user.sessions.revoke", entityType: "User", entityId: userId, summary: `Déconnexion de ${count} autre(s) appareil(s)` });
  return count;
}

/** Retire un compte externe, sauf s'il est le seul moyen de connexion (pas de mot de passe ni d'autre compte). */
export async function unlinkAccount(userId: string, accountId: string) {
  const acc = await db.oAuthAccount.findFirst({ where: { id: accountId, userId } });
  if (!acc) throw notFound("Compte introuvable.");
  const s = await mySecurity(userId);
  if (!s.hasPassword && s.accounts.length <= 1) throw new AppError("CONFLICT", "C'est votre seul moyen de connexion : définissez d'abord un mot de passe (« Mot de passe oublié »).");
  await db.oAuthAccount.delete({ where: { id: accountId } });
  await audit(db, { organizationId: null, actorId: userId, action: "user.oauth.unlink", entityType: "User", entityId: userId, summary: `Compte ${acc.provider} détaché` });
}

// ───────────── Export complet des données de l'organisation ─────────────

export async function exportOrganization(ctx: TenantContext) {
  assertCan(ctx, "administration:export");
  const o = { organizationId: ctx.organizationId };
  const [org, members, units, portfolios, programs, projects, activities, tasks, milestones, logframe, indicators, values, fundings, lines, expenses, risks, stakeholders, team, documents, articles, reports, plans, auditLog] = await Promise.all([
    db.organization.findUniqueOrThrow({ where: { id: ctx.organizationId } }),
    db.membership.findMany({ where: o, include: { user: { select: { name: true, email: true } }, role: { select: { key: true, name: true } } } }),
    db.organizationalUnit.findMany({ where: o }),
    db.portfolio.findMany({ where: o }), db.program.findMany({ where: o }), db.project.findMany({ where: o }),
    db.activity.findMany({ where: o }), db.task.findMany({ where: o }), db.milestone.findMany({ where: o }),
    db.logframeItem.findMany({ where: o }), db.indicator.findMany({ where: o }), db.indicatorValue.findMany({ where: o }),
    db.funding.findMany({ where: o }), db.budgetLine.findMany({ where: o }), db.expense.findMany({ where: o }),
    db.risk.findMany({ where: o }), db.stakeholder.findMany({ where: o }), db.projectMember.findMany({ where: o }),
    db.document.findMany({ where: o, include: { versions: { select: { version: true, fileName: true, mimeType: true, size: true, sha256: true, createdAt: true } } } }),
    db.knowledgeArticle.findMany({ where: o }), db.report.findMany({ where: o }),
    db.strategicPlan.findMany({ where: o, include: { axes: { include: { objectives: true } } } }),
    db.auditLog.findMany({ where: o, orderBy: { createdAt: "asc" } }),
  ]);
  const table = (rows: Record<string, unknown>[]) => {
    if (!rows.length) return toCsv(["(vide)"], []);
    const head = Object.keys(rows[0]).filter((k) => k !== "content");
    return toCsv(head, rows.map((r) => head.map((k) => r[k])));
  };
  const flatMembers = members.map((m) => ({ name: m.user.name, email: m.user.email, role: m.role.key, roleName: m.role.name, status: m.status, joinedAt: m.createdAt }));
  const files = [
    { name: "LISEZ-MOI.txt", data: `Export complet BAOBAB — ${org.name}\r\nGénéré le ${new Date().toISOString()}\r\n\r\nUn fichier CSV par type de données (séparateur « ; », UTF-8). Les fichiers des documents ne sont pas inclus : leur liste et leur empreinte SHA-256 sont dans documents.csv.\r\nLes cellules commençant par = + - @ sont préfixées d'une apostrophe (protection contre l'exécution de formules).\r\n` },
    { name: "organisation.csv", data: table([org as unknown as Record<string, unknown>]) },
    { name: "membres.csv", data: table(flatMembers) },
    ...([["structures", units], ["portefeuilles", portfolios], ["programmes", programs], ["projets", projects], ["activites", activities], ["taches", tasks], ["jalons", milestones],
      ["cadre_logique", logframe], ["indicateurs", indicators], ["valeurs_indicateurs", values], ["financements", fundings], ["lignes_budgetaires", lines], ["depenses", expenses],
      ["risques", risks], ["parties_prenantes", stakeholders], ["equipes_projets", team], ["fiches_connaissances", articles], ["rapports", reports], ["journal_audit", auditLog]] as const)
      .map(([n, rows]) => ({ name: `${n}.csv`, data: table(rows as unknown as Record<string, unknown>[]) })),
    { name: "documents.csv", data: table(documents.flatMap((d) => d.versions.map((v) => ({ document: d.title, category: d.category, projectId: d.projectId, deletedAt: d.deletedAt, ...v })))) },
    { name: "strategie.json", data: JSON.stringify(plans, null, 2) },
  ];
  await audit(db, { organizationId: ctx.organizationId, actorId: ctx.userId, action: "administration.export", entityType: "Organization", entityId: ctx.organizationId, summary: "Export complet des données de l'organisation" });
  return { zip: createZip(files), name: `baobab-export-${org.code.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.zip` };
}
