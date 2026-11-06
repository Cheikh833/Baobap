import Link from "next/link";
import { BookOpen, FolderOpen, Search } from "lucide-react";
import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { listArticles, listDocuments, storageUsed } from "@/server/services/documents";
import { db } from "@/server/db";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/display";
import { ActionForm } from "@/components/forms/action-form";
import { ArticleFields, DocFields, FileKindIcon, fmtSize } from "@/components/documents/fields";
import { cn } from "@/components/ui/cn";
import { formatDate } from "@/lib/metrics";
import { getPlan } from "@/lib/plans";
import { getMessages } from "@/i18n/server";
import { fill } from "@/i18n/translate";
import { Forbidden } from "../forbidden";
import { createArticleAction, uploadAction } from "./actions";

export const metadata = { title: "Documents & connaissances" };

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; category?: string }> }) {
  const ctx = await requireTenant();
  if (!can(ctx, "documents:view")) return <Forbidden />;
  const sp = await searchParams;
  const tab = sp.tab === "knowledge" ? "knowledge" : "docs";
  const q = sp.q?.trim() ?? "";
  const { m, locale } = await getMessages();
  const D = m.docs;
  const projects = (await db.project.findMany({ where: { organizationId: ctx.organizationId, deletedAt: null }, select: { id: true, code: true, name: true }, orderBy: { code: "asc" } })).map((p) => [p.id, `${p.code} · ${p.name}`] as const);
  const [docs, articles, used] = await Promise.all([
    tab === "docs" ? listDocuments(ctx, { q, category: sp.category }) : [],
    tab === "knowledge" ? listArticles(ctx, q) : [],
    storageUsed(ctx.organizationId),
  ]);
  const limit = getPlan(ctx.plan).limits.storageGb;
  const authors = new Map((await db.user.findMany({ where: { id: { in: articles.map((a) => a.authorId!).filter(Boolean) } }, select: { id: true, name: true } })).map((u) => [u.id, u.name]));

  return (
    <>
      <PageHeader title={D.title} description={D.intro} />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex gap-1 rounded-xl bg-white p-1 shadow-soft ring-1 ring-line" aria-label={D.title}>
          {(["docs", "knowledge"] as const).map((t) => (
            <Link key={t} href={`?tab=${t}${q ? `&q=${encodeURIComponent(q)}` : ""}`} aria-current={tab === t ? "page" : undefined} className={cn("flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition", tab === t ? "bg-brand text-white shadow" : "text-slate-600 hover:bg-canvas")}>
              {t === "docs" ? <FolderOpen className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}{D.tabs[t]}
            </Link>
          ))}
        </nav>
        <form method="get" className="flex w-full min-w-0 gap-2 sm:w-auto sm:max-w-lg sm:flex-1" role="search">
          <input type="hidden" name="tab" value={tab} />
          <label className="relative block min-w-0 flex-1">
            <span className="sr-only">{D.search}</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input name="q" defaultValue={q} placeholder={D.search} size={8} className="w-full min-w-0 rounded-xl border border-line bg-white py-2 pl-9 pr-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" />
          </label>
          {tab === "docs" && (
            <select name="category" defaultValue={sp.category ?? ""} aria-label={D.fields.category} className="hidden rounded-xl border border-line bg-white px-2 text-sm sm:block">
              <option value="">{D.allCategories}</option>
              {Object.entries(D.categories).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          )}
          <button className="rounded-xl bg-navy px-4 text-sm font-semibold text-white hover:bg-navy/90">{D.searchBtn}</button>
        </form>
      </div>
      {q && <p className="mb-3 text-sm text-slate-600">{fill(D.results, { n: tab === "docs" ? docs.length : articles.length, q })}</p>}

      {tab === "docs" ? (
        <div className="space-y-6">
          {docs.length === 0 ? (
            q ? <Card><p className="text-sm text-slate-500">{D.noResult}</p></Card> : <EmptyState icon={FolderOpen} title={D.emptyTitle} description={D.emptyText} />
          ) : (
            <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {docs.map((d, i) => (
                <li key={d.id} className="min-w-0 animate-fade-up" style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}>
                  <Link href={`/documents/${d.id}`} className="group flex h-full gap-3 rounded-2xl border border-line bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-lift">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-deep transition group-hover:bg-brand group-hover:text-white"><FileKindIcon mime={d.current?.mimeType} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{d.title}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                        <Badge>{D.categories[d.category]}</Badge>{d.project && <span className="font-mono">{d.project.code}</span>}
                        {d.current && <span>{fill(D.version, { n: d.current.version })} · {fmtSize(d.current.size, locale)}</span>}
                      </span>
                      {d.snippet && <span className="mt-1 block text-xs italic text-slate-600">{d.snippet}</span>}
                      <span className="mt-1 block text-[11px] text-slate-400">{formatDate(d.updatedAt, locale)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {can(ctx, "documents:create") && (
            <Card>
              <details open={docs.length === 0 && !q}>
                <summary className="cursor-pointer font-display font-semibold text-brand">+ {D.upload}</summary>
                <p className="mb-3 mt-1 text-xs text-slate-500">{D.uploadHint}</p>
                <ActionForm action={uploadAction} submitLabel={D.upload}><DocFields projects={projects} m={m} withFile /></ActionForm>
              </details>
            </Card>
          )}
          <p className="text-xs text-slate-500">{fill(D.storage, { used: fmtSize(used, locale), limit: limit === null ? D.unlimited : `${limit} Go` })}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {articles.length === 0 ? (
            q ? <Card><p className="text-sm text-slate-500">{D.noResult}</p></Card> : <EmptyState icon={BookOpen} title={D.knowledgeEmptyTitle} description={D.knowledgeEmptyText} />
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {articles.map((a, i) => (
                <li key={a.id} className="min-w-0 animate-fade-up" style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}>
                  <Link href={`/documents/knowledge/${a.id}`} className="block h-full rounded-2xl border border-line bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-ochre/50 hover:shadow-lift">
                    <span className="flex flex-wrap items-center gap-2"><Badge tone="warning">{D.kcategories[a.category]}</Badge>{a.project && <span className="font-mono text-xs text-slate-500">{a.project.code}</span>}</span>
                    <span className="mt-2 block font-display text-lg font-semibold">{a.title}</span>
                    <span className="mt-1 block text-sm text-slate-600">{a.snippet}</span>
                    <span className="mt-2 block text-[11px] text-slate-400">{fill(D.by, { name: authors.get(a.authorId ?? "") ?? "—", date: formatDate(a.updatedAt, locale) })}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {can(ctx, "documents:create") && (
            <Card>
              <details open={articles.length === 0 && !q}>
                <summary className="cursor-pointer font-display font-semibold text-brand">+ {D.newArticle}</summary>
                <div className="mt-3"><ActionForm action={createArticleAction} submitLabel={m.ui.create}><ArticleFields projects={projects} m={m} /></ActionForm></div>
              </details>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
