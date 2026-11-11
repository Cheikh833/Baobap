import { db } from "@/server/db";
import { can, type TenantContext } from "@/server/permissions/check";
import { listArticles, listDocuments, terms } from "./documents";

// Recherche globale (Ctrl+K) : chaque groupe n'est interrogé que si la personne a le droit de le consulter.
export type SearchHit = { group: string; title: string; subtitle?: string; href: string };
const N = 6;
const alive = { deletedAt: null };

export async function globalSearch(ctx: TenantContext, q: string): Promise<SearchHit[]> {
  const words = terms(q);
  if (!words.length) return [];
  const o = { organizationId: ctx.organizationId, ...alive };
  const match = (fields: string[]) => ({ AND: words.map((w) => ({ OR: fields.map((f) => ({ [f]: { contains: w, mode: "insensitive" as const } })) })) });
  const [projects, portfolios, programs, indicators, risks, reports, members, docs, articles] = await Promise.all([
    can(ctx, "project:view") ? db.project.findMany({ where: { ...o, ...match(["name", "code", "shortDescription"]) }, select: { id: true, code: true, name: true, status: true }, take: N }) : [],
    can(ctx, "portfolio:view") ? db.portfolio.findMany({ where: { ...o, ...match(["name", "code"]) }, select: { id: true, code: true, name: true }, take: N }) : [],
    can(ctx, "program:view") ? db.program.findMany({ where: { ...o, ...match(["name", "code"]) }, select: { id: true, code: true, name: true }, take: N }) : [],
    can(ctx, "meal:view") ? db.indicator.findMany({ where: { ...o, project: { deletedAt: null }, ...match(["name", "code", "definition"]) }, select: { id: true, code: true, name: true, project: { select: { code: true } } }, take: N }) : [],
    can(ctx, "risk:view") ? db.risk.findMany({ where: { ...o, project: { deletedAt: null }, ...match(["title", "code", "description"]) }, select: { code: true, title: true, project: { select: { id: true, code: true } } }, take: N }) : [],
    can(ctx, "reports:view") ? db.report.findMany({ where: { ...o, ...(can(ctx, "reports:create") ? {} : { status: "FINAL" as const }), ...match(["title"]) }, select: { id: true, title: true, status: true }, take: N }) : [],
    can(ctx, "members:view") ? db.membership.findMany({ where: { organizationId: ctx.organizationId, status: "ACTIVE", user: match(["name", "email"]) }, select: { user: { select: { name: true, email: true } } }, take: N }) : [],
    can(ctx, "documents:view") ? listDocuments(ctx, { q }).then((d) => d.slice(0, N)) : [],
    can(ctx, "documents:view") ? listArticles(ctx, q).then((d) => d.slice(0, N)) : [],
  ]);
  return [
    ...projects.map((p) => ({ group: "projects", title: `${p.code} · ${p.name}`, subtitle: p.status, href: `/projects/${p.id}` })),
    ...portfolios.map((p) => ({ group: "portfolios", title: `${p.code} · ${p.name}`, href: `/portfolios/${p.id}` })),
    ...programs.map((p) => ({ group: "programs", title: `${p.code} · ${p.name}`, href: `/programs/${p.id}` })),
    ...indicators.map((i) => ({ group: "indicators", title: `${i.code} · ${i.name}`, subtitle: i.project.code, href: `/meal/indicators/${i.id}` })),
    ...risks.map((r) => ({ group: "risks", title: `${r.code} · ${r.title}`, subtitle: r.project.code, href: `/projects/${r.project.id}?tab=risks` })),
    ...reports.map((r) => ({ group: "reports", title: r.title, subtitle: r.status, href: `/studio/${r.id}` })),
    ...docs.map((d) => ({ group: "documents", title: d.title, subtitle: d.snippet ?? undefined, href: `/documents/${d.id}` })),
    ...articles.map((a) => ({ group: "knowledge", title: a.title, subtitle: a.snippet ?? undefined, href: `/documents/knowledge/${a.id}` })),
    ...members.map((x) => ({ group: "members", title: x.user.name, subtitle: x.user.email, href: "/organization/members" })),
  ];
}
