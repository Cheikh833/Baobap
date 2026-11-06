import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { getReport } from "@/server/services/studio";
import { ReportView } from "@/components/studio/report-view";
import { PrintButton } from "@/components/studio/print-button";
import { reportBlocks } from "@/lib/report-render";
import { getMessages } from "@/i18n/server";
import { orNotFound } from "@/app/(workspace)/guard";
import { notFound } from "next/navigation";

export const metadata = { title: "Rapport — impression" };

export default async function PrintReport({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireTenant();
  if (!can(ctx, "reports:view")) notFound();
  const { id } = await params;
  const [r, { m, locale }] = await Promise.all([orNotFound(getReport(ctx, id)), getMessages()]);
  return (
    <>
      <style>{"@page { size: A4; margin: 16mm 14mm; } @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }"}</style>
      <div className="mx-auto mb-4 flex max-w-[210mm] justify-end px-4 print:hidden"><PrintButton label={m.studio.print} /></div>
      <div className="px-4 print:px-0"><ReportView blocks={reportBlocks(r, r.data, r.narrative, m, locale)} animated={false} /></div>
    </>
  );
}
