import Link from "next/link";
import { Download } from "lucide-react";
import { listDocuments } from "@/server/services/documents";
import { Badge, Card } from "@/components/ui/display";
import { ActionForm } from "@/components/forms/action-form";
import { DocFields, FileKindIcon, fmtSize } from "@/components/documents/fields";
import { formatDate } from "@/lib/metrics";
import { can, type TenantContext } from "@/server/permissions/check";
import type { Messages } from "@/i18n/messages/fr";
import { fill } from "@/i18n/translate";
import { uploadAction } from "../../documents/actions";

export async function DocumentsTab({ ctx, projectId, m, locale }: { ctx: TenantContext; projectId: string; m: Messages; locale: string }) {
  const D = m.docs;
  if (!can(ctx, "documents:view")) return <Card><p className="text-sm text-slate-600">{m.ui.readOnlyRole}</p></Card>;
  const docs = await listDocuments(ctx, { projectId });
  return (
    <div className="space-y-6">
      <Card className="p-0">
        <h2 className="px-5 pt-5 font-display font-semibold">{D.projectDocs}</h2>
        {docs.length === 0 ? <p className="px-5 py-4 text-sm text-slate-500">{D.emptyText}</p> : (
          <ul className="mt-3 divide-y divide-line">
            {docs.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-deep"><FileKindIcon mime={d.current?.mimeType} className="h-4 w-4" /></span>
                <Link href={`/documents/${d.id}`} className="min-w-0 flex-1 hover:underline"><span className="block truncate text-sm font-medium">{d.title}</span><span className="block text-xs text-slate-500">{D.categories[d.category]}{d.current && <> · {fill(D.version, { n: d.current.version })} · {fmtSize(d.current.size, locale)}</>} · {formatDate(d.updatedAt, locale)}</span></Link>
                {d.tags.slice(0, 2).map((t) => <Badge key={t} tone="brand">#{t}</Badge>)}
                {d.current && <a href={`/api/documents/${d.current.id}`} className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-brand hover:border-brand"><Download className="h-3.5 w-3.5" />{D.download}</a>}
              </li>
            ))}
          </ul>
        )}
      </Card>
      {can(ctx, "documents:create") && (
        <Card>
          <details open={docs.length === 0}>
            <summary className="cursor-pointer font-display font-semibold text-brand">+ {D.upload}</summary>
            <p className="mb-3 mt-1 text-xs text-slate-500">{D.uploadHint}</p>
            <ActionForm action={uploadAction} submitLabel={D.upload}>
              <input type="hidden" name="back" value={`/projects/${projectId}?tab=documents`} />
              <DocFields projects={[]} m={m} withFile projectId={projectId} />
            </ActionForm>
          </details>
        </Card>
      )}
    </div>
  );
}
