import Link from "next/link";
import { listReports } from "@/server/services/studio";
import { Badge, Card } from "@/components/ui/display";
import { CreateReportForm } from "@/components/studio/create-form";
import { formatDate } from "@/lib/metrics";
import { can, type TenantContext } from "@/server/permissions/check";
import type { Messages } from "@/i18n/messages/fr";

export async function ReportsTab({ ctx, projectId, m, locale }: { ctx: TenantContext; projectId: string; m: Messages; locale: string }) {
  const S = m.studio;
  if (!can(ctx, "reports:view")) return <Card><p className="text-sm text-slate-600">{m.ui.readOnlyRole}</p></Card>;
  const reports = await listReports(ctx, projectId);
  return (
    <div className="space-y-6">
      <Card className="p-0">
        <h2 className="px-5 pt-5 font-display font-semibold">{S.projectReports}</h2>
        {reports.length === 0 ? <p className="px-5 py-4 text-sm text-slate-500">{S.emptyText}</p> : (
          <ul className="mt-3 divide-y divide-line">
            {reports.map((r) => (
              <li key={r.id}><Link href={`/studio/${r.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3 hover:bg-canvas">
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{r.title}</span><span className="block text-xs text-slate-500">{S.types[r.type]} · {formatDate(r.updatedAt, locale)}</span></span>
                <Badge tone={r.status === "FINAL" ? "success" : "warning"}>{S.status[r.status]}</Badge>
              </Link></li>
            ))}
          </ul>
        )}
      </Card>
      {can(ctx, "reports:create") && <Card><details open={reports.length === 0}><summary className="cursor-pointer font-display font-semibold text-brand">+ {S.newReport}</summary><div className="mt-3"><CreateReportForm projects={[]} m={m} projectId={projectId} /></div></details></Card>}
    </div>
  );
}
