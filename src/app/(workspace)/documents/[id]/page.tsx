import Link from "next/link";
import { Download, ShieldCheck } from "lucide-react";
import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { getDocument } from "@/server/services/documents";
import { db } from "@/server/db";
import { Badge, Card, PageHeader } from "@/components/ui/display";
import { ActionForm, TextField } from "@/components/forms/action-form";
import { DocFields, FileKindIcon, fmtSize } from "@/components/documents/fields";
import { formatDate } from "@/lib/metrics";
import { getMessages } from "@/i18n/server";
import { fill } from "@/i18n/translate";
import { Forbidden } from "../../forbidden";
import { orNotFound } from "../../guard";
import { deleteDocAction, updateDocAction, versionAction } from "../actions";

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireTenant();
  if (!can(ctx, "documents:view")) return <Forbidden />;
  const { id } = await params;
  const [d, { m, locale }] = await Promise.all([orNotFound(getDocument(ctx, id)), getMessages()]);
  const D = m.docs;
  const mine = d.createdById === ctx.userId && can(ctx, "documents:create");
  const edit = can(ctx, "documents:edit") || mine;
  const names = new Map((await db.user.findMany({ where: { id: { in: d.versions.map((v) => v.createdById!).filter(Boolean) } }, select: { id: true, name: true } })).map((u) => [u.id, u.name]));
  const projects = edit ? (await db.project.findMany({ where: { organizationId: ctx.organizationId, deletedAt: null }, select: { id: true, code: true, name: true }, orderBy: { code: "asc" } })).map((p) => [p.id, `${p.code} · ${p.name}`] as const) : [];
  const cur = d.versions[0];
  return (
    <>
      <PageHeader title={d.title} breadcrumb={<><Link href="/documents" className="hover:underline">{D.title}</Link>{d.project && <> › <Link href={`/projects/${d.project.id}?tab=documents`} className="hover:underline">{d.project.code}</Link></>}</>}
        actions={cur && <a href={`/api/documents/${cur.id}`} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-glow hover:bg-brand-deep"><Download className="h-4 w-4" />{D.download}</a>} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <div className="flex flex-wrap items-center gap-2"><Badge>{D.categories[d.category]}</Badge>{d.tags.map((t) => <Badge key={t} tone="brand">#{t}</Badge>)}</div>
            {d.description && <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{d.description}</p>}
          </Card>
          <Card className="p-0">
            <h2 className="px-5 pt-5 font-display font-semibold">{D.versions}</h2>
            <ul className="mt-3 divide-y divide-line">
              {d.versions.map((v, i) => (
                <li key={v.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-canvas text-brand-deep"><FileKindIcon mime={v.mimeType} className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 text-sm font-medium">{fill(D.version, { n: v.version })} · <span className="truncate">{v.fileName}</span>{i === 0 && <Badge tone="success">✓</Badge>}</span>
                    <span className="block text-xs text-slate-500">{fmtSize(v.size, locale)} · {names.get(v.createdById ?? "") ?? "—"} · {formatDate(v.createdAt, locale)}{v.comment && <> · {v.comment}</>}</span>
                    <span className="block truncate font-mono text-[10px] text-slate-400" title={v.sha256}><ShieldCheck className="mr-1 inline h-3 w-3" />{fill(D.integrity, { hash: v.sha256.slice(0, 16) + "…" })}</span>
                  </span>
                  <a href={`/api/documents/${v.id}`} className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-brand hover:border-brand"><Download className="h-3.5 w-3.5" />{D.download}</a>
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <div className="space-y-6">
          {edit && (
            <Card>
              <h2 className="font-display font-semibold">{D.newVersion}</h2>
              <p className="mb-3 text-xs text-slate-500">{D.newVersionHint}</p>
              <ActionForm action={versionAction.bind(null, d.id)} submitLabel={D.newVersion} resetOnSuccess>
                <TextField name="file" label={D.fields.file} type="file" required />
                <TextField name="comment" label={D.fields.comment} />
              </ActionForm>
            </Card>
          )}
          {edit && (
            <Card>
              <details>
                <summary className="cursor-pointer font-semibold">{m.ui.edit}</summary>
                <div className="mt-3"><ActionForm action={updateDocAction.bind(null, d.id)}><DocFields d={d} projects={projects} m={m} /></ActionForm></div>
              </details>
            </Card>
          )}
          {can(ctx, "documents:delete") && <Card className="border-danger/30"><ActionForm action={deleteDocAction.bind(null, d.id)} submitLabel={D.deleteDoc} submitVariant="danger" confirm={fill(m.ui.confirmDelete, { name: d.title })} /></Card>}
        </div>
      </div>
    </>
  );
}
