import Link from "next/link";
import { FileText } from "lucide-react";
import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { listReports } from "@/server/services/studio";
import { db } from "@/server/db";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/display";
import { CreateReportForm } from "@/components/studio/create-form";
import { formatDate } from "@/lib/metrics";
import { getMessages } from "@/i18n/server";
import { Forbidden } from "../forbidden";

export const metadata = { title: "BAOBAB Studio" };

export default async function StudioPage() {
  const ctx = await requireTenant();
  if (!can(ctx, "reports:view")) return <Forbidden />;
  const [reports, { m, locale }] = await Promise.all([listReports(ctx), getMessages()]);
  const S = m.studio;
  const projects = can(ctx, "reports:create") ? (await db.project.findMany({ where: { organizationId: ctx.organizationId, deletedAt: null }, select: { id: true, code: true, name: true }, orderBy: { code: "asc" } })).map((p) => [p.id, `${p.code} · ${p.name}`] as const) : [];
  return (
    <>
      <PageHeader title={S.title} description={S.intro} />
      <div className="space-y-6">
        {reports.length === 0 ? <EmptyState icon={FileText} title={S.emptyTitle} description={S.emptyText} /> : (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {reports.map((r, i) => (
              <li key={r.id} className="min-w-0 animate-fade-up" style={{ animationDelay: `${Math.min(i, 12) * 50}ms` }}>
                <Link href={`/studio/${r.id}`} className="group relative block h-full overflow-hidden rounded-2xl border border-line bg-white p-5 shadow-soft transition hover:-translate-y-1 hover:shadow-lift">
                  <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand via-brand-400 to-ochre opacity-70 transition group-hover:opacity-100" aria-hidden />
                  <span className="flex items-center justify-between gap-2"><Badge tone={r.status === "FINAL" ? "success" : "warning"}>{S.status[r.status]}</Badge>{r.project && <span className="font-mono text-xs text-slate-500">{r.project.code}</span>}</span>
                  <span className="mt-3 block font-display text-lg font-semibold leading-snug">{r.title}</span>
                  <span className="mt-1 block text-xs text-slate-500">{S.types[r.type]}</span>
                  <span className="mt-4 flex items-end justify-between">
                    <span className="text-[11px] text-slate-400">{formatDate(r.updatedAt, locale)}</span>
                    <span className="flex h-12 w-10 flex-col gap-1 rounded-md border border-line bg-canvas p-1.5 shadow-sm transition group-hover:rotate-3" aria-hidden>{[90, 70, 85, 50].map((w, j) => <span key={j} className="h-0.5 rounded bg-slate-300" style={{ width: `${w}%` }} />)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {can(ctx, "reports:create") && (
          <Card>
            <details open={reports.length === 0}>
              <summary className="cursor-pointer font-display font-semibold text-brand">+ {S.newReport}</summary>
              <div className="mt-3"><CreateReportForm projects={projects} m={m} /></div>
            </details>
          </Card>
        )}
      </div>
    </>
  );
}
