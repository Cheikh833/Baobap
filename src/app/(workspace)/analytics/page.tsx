import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { listDatasets } from "@/server/services/analytics";
import { db } from "@/server/db";
import { Card, EmptyState, PageHeader, Table, Td } from "@/components/ui/display";
import { ActionForm, SelectField, TextAreaField, TextField } from "@/components/forms/action-form";
import { formatDate } from "@/lib/metrics";
import { getMessages } from "@/i18n/server";
import { Forbidden } from "../forbidden";
import { importDatasetAction } from "./actions";

const ANALYTICS_PLANS = ["PROFESSIONNEL", "INSTITUTION", "ENTREPRISE"];

export default async function AnalyticsPage() {
  const ctx = await requireTenant();
  if (!can(ctx, "analytics:view")) return <Forbidden />;
  const [list, { m, locale }] = await Promise.all([listDatasets(ctx), getMessages()]);
  const A = m.analytics;
  const canImport = can(ctx, "analytics:create");
  const projects = canImport ? await db.project.findMany({ where: { organizationId: ctx.organizationId, deletedAt: null }, select: { id: true, code: true, name: true }, orderBy: { code: "asc" } }) : [];
  const nf = new Intl.NumberFormat(locale === "en" ? "en-GB" : "fr-FR");

  return (
    <>
      <PageHeader title={A.title} description={A.intro} />
      <div className="space-y-6">
        {list.length === 0 ? (
          <EmptyState icon={BarChart3} title={A.emptyTitle} description={A.emptyText} />
        ) : (
          <Card className="p-0">
            <Table head={A.head}>
              {list.map((d) => (
                <tr key={d.id} className="hover:bg-canvas">
                  <Td><Link href={`/analytics/${d.id}`} className="font-medium hover:underline">{d.name}</Link><p className="text-xs text-slate-500">{d.fileName}</p></Td>
                  <Td>{d.project ? <Link href={`/projects/${d.project.id}`} className="font-mono text-xs hover:underline">{d.project.code}</Link> : "—"}</Td>
                  <Td className="tabular">{nf.format(d.rowCount)}</Td>
                  <Td className="tabular">{d.columnCount}</Td>
                  <Td className="whitespace-nowrap text-xs text-slate-500">{formatDate(d.createdAt, locale)}</Td>
                </tr>
              ))}
            </Table>
          </Card>
        )}
        {canImport && (
          <Card>
            <h2 className="font-display font-semibold">{A.importTitle}</h2>
            <p className="mb-4 text-xs text-slate-500">{A.importHint}</p>
            {ANALYTICS_PLANS.includes(ctx.plan) ? (
              <ActionForm action={importDatasetAction} submitLabel={A.import}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField name="name" label={A.fields.name} required />
                  <SelectField name="projectId" label={A.fields.project} options={projects.map((p) => [p.id, `${p.code} · ${p.name}`] as const)} placeholder={A.noProject} />
                  <TextField name="file" label={A.fields.file} type="file" accept=".csv,.tsv,.txt,text/csv" required className="sm:col-span-2" />
                  <TextAreaField name="description" label={A.fields.description} rows={2} className="sm:col-span-2" />
                </div>
              </ActionForm>
            ) : (
              <p className="text-sm text-slate-600">{A.planRequired} <Link href="/organization/billing" className="font-semibold text-brand hover:underline">{m.billing.tab} →</Link></p>
            )}
          </Card>
        )}
      </div>
    </>
  );
}
