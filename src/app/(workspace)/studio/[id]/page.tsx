import Link from "next/link";
import { FileDown, FileSpreadsheet, FileText, Lock, Printer, RefreshCw } from "lucide-react";
import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { getReport } from "@/server/services/studio";
import { db } from "@/server/db";
import { Badge, Card, PageHeader } from "@/components/ui/display";
import { ActionForm, TextAreaField } from "@/components/forms/action-form";
import { ReportView } from "@/components/studio/report-view";
import { reportBlocks } from "@/lib/report-render";
import { formatDate } from "@/lib/metrics";
import { getMessages } from "@/i18n/server";
import { fill } from "@/i18n/translate";
import { Forbidden } from "../../forbidden";
import { orNotFound } from "../../guard";
import { deleteReportAction, finalizeAction, narrativeAction } from "../actions";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireTenant();
  if (!can(ctx, "reports:view")) return <Forbidden />;
  const { id } = await params;
  const [r, { m, locale }] = await Promise.all([orNotFound(getReport(ctx, id)), getMessages()]);
  const S = m.studio;
  const draft = r.status === "DRAFT";
  const edit = draft && (can(ctx, "reports:edit") || (r.createdById === ctx.userId && can(ctx, "reports:create")));
  const approver = r.approvedById ? await db.user.findUnique({ where: { id: r.approvedById }, select: { name: true } }) : null;
  const blocks = reportBlocks(r, r.data, r.narrative, m, locale);
  const exp = (f: string, Icon: typeof FileText, label: string, external = false) => (
    <a href={f === "pdf" ? `/print/report/${r.id}` : `/api/reports/${r.id}/${f}`} target={external ? "_blank" : undefined} rel="noopener" className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold text-navy shadow-sm transition hover:-translate-y-0.5 hover:border-brand hover:text-brand"><Icon className="h-4 w-4" />{label}</a>
  );
  return (
    <>
      <PageHeader title={r.title} breadcrumb={<><Link href="/studio" className="hover:underline">{S.title}</Link>{r.project && <> › <Link href={`/projects/${r.project.id}?tab=reports`} className="hover:underline">{r.project.code}</Link></>}</>}
        actions={<Badge tone={draft ? "warning" : "success"}>{S.status[r.status]}</Badge>} />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {exp("pdf", Printer, S.exportPdf, true)}{exp("docx", FileText, S.exportWord)}{exp("xlsx", FileSpreadsheet, S.exportExcel)}
        <p className="ml-auto flex items-center gap-1.5 text-xs text-slate-500">{draft ? <><RefreshCw className="h-3.5 w-3.5" />{S.live}</> : <><Lock className="h-3.5 w-3.5 text-green-700" />{fill(S.finalized, { name: approver?.name ?? "—", date: formatDate(r.approvedAt, locale) })}</>}</p>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 rounded-3xl bg-gradient-to-br from-canvas to-brand-50/40 p-2 sm:p-6"><ReportView blocks={blocks} /></div>
        <div className="space-y-6">
          {edit && (
            <Card>
              <h2 className="font-display font-semibold">{S.narrativeTitle}</h2>
              <p className="mb-3 text-xs text-slate-500">{S.narrativeHint}</p>
              <ActionForm action={narrativeAction.bind(null, r.id)}>
                <TextAreaField name="summary" label={S.fields.summary} rows={4} defaultValue={r.narrative.summary ?? ""} />
                <TextAreaField name="highlights" label={S.fields.highlights} rows={4} defaultValue={r.narrative.highlights ?? ""} />
                <TextAreaField name="challenges" label={S.fields.challenges} rows={4} defaultValue={r.narrative.challenges ?? ""} />
                <TextAreaField name="nextSteps" label={S.fields.nextSteps} rows={3} defaultValue={r.narrative.nextSteps ?? ""} />
              </ActionForm>
            </Card>
          )}
          {draft && can(ctx, "reports:approve") && (
            <Card className="border-brand/30 bg-gradient-to-br from-white to-brand-50/60">
              <ActionForm action={finalizeAction.bind(null, r.id)} submitLabel={S.finalize} confirm={S.finalizeConfirm} />
            </Card>
          )}
          {(can(ctx, "reports:delete") || edit) && <Card className="border-danger/30"><ActionForm action={deleteReportAction.bind(null, r.id)} submitLabel={S.deleteReport} submitVariant="danger" confirm={fill(m.ui.confirmDelete, { name: r.title })} /></Card>}
          <p className="flex items-start gap-2 text-xs text-slate-500"><FileDown className="mt-0.5 h-4 w-4 shrink-0" />{S.intro}</p>
        </div>
      </div>
    </>
  );
}
