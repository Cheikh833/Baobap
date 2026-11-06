import Link from "next/link";
import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { getArticle } from "@/server/services/documents";
import { db } from "@/server/db";
import { Badge, Card, PageHeader } from "@/components/ui/display";
import { ActionForm } from "@/components/forms/action-form";
import { ArticleFields } from "@/components/documents/fields";
import { formatDate } from "@/lib/metrics";
import { getMessages } from "@/i18n/server";
import { fill } from "@/i18n/translate";
import { Forbidden } from "../../../forbidden";
import { orNotFound } from "../../../guard";
import { deleteArticleAction, updateArticleAction } from "../../actions";

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireTenant();
  if (!can(ctx, "documents:view")) return <Forbidden />;
  const { id } = await params;
  const [a, { m, locale }] = await Promise.all([orNotFound(getArticle(ctx, id)), getMessages()]);
  const D = m.docs;
  const edit = can(ctx, "documents:edit") || (a.authorId === ctx.userId && can(ctx, "documents:create"));
  const author = a.authorId ? await db.user.findUnique({ where: { id: a.authorId }, select: { name: true } }) : null;
  const projects = edit ? (await db.project.findMany({ where: { organizationId: ctx.organizationId, deletedAt: null }, select: { id: true, code: true, name: true }, orderBy: { code: "asc" } })).map((p) => [p.id, `${p.code} · ${p.name}`] as const) : [];
  return (
    <>
      <PageHeader title={a.title} breadcrumb={<><Link href="/documents?tab=knowledge" className="hover:underline">{D.tabs.knowledge}</Link>{a.project && <> › <Link href={`/projects/${a.project.id}`} className="hover:underline">{a.project.code}</Link></>}</>} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2"><Badge tone="warning">{D.kcategories[a.category]}</Badge>{a.tags.map((t) => <Badge key={t} tone="brand">#{t}</Badge>)}</div>
          <article className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-slate-800">{a.body}</article>
          <p className="mt-6 text-xs text-slate-500">{fill(D.by, { name: author?.name ?? "—", date: formatDate(a.updatedAt, locale) })}</p>
        </Card>
        <div className="space-y-6">
          {edit && <Card><details><summary className="cursor-pointer font-semibold">{m.ui.edit}</summary><div className="mt-3"><ActionForm action={updateArticleAction.bind(null, a.id)}><ArticleFields a={a} projects={projects} m={m} /></ActionForm></div></details></Card>}
          {can(ctx, "documents:delete") && <Card className="border-danger/30"><ActionForm action={deleteArticleAction.bind(null, a.id)} submitLabel={D.deleteArticle} submitVariant="danger" confirm={fill(m.ui.confirmDelete, { name: a.title })} /></Card>}
        </div>
      </div>
    </>
  );
}
