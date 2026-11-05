import Link from "next/link";
import { CheckCircle2, Clock, ShieldAlert } from "lucide-react";
import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { risksOverview } from "@/server/services/risks";
import { Badge, Card, EmptyState, PageHeader, Stat, Table, Td } from "@/components/ui/display";
import { ButtonLink } from "@/components/ui/button";
import { LEVEL_BG, LEVEL_FG, RiskMatrix } from "@/components/risks/matrix";
import { riskMatrix } from "@/lib/risk";
import { formatDate } from "@/lib/metrics";
import { getMessages } from "@/i18n/server";
import { Forbidden } from "../forbidden";

export default async function RisksPage() {
  const ctx = await requireTenant();
  if (!can(ctx, "risk:view")) return <Forbidden />;
  const [risks, { m, locale }] = await Promise.all([risksOverview(ctx), getMessages()]);
  const R = m.risks;
  if (!risks.length) {
    return (
      <>
        <PageHeader title={R.title} description={R.intro} />
        <EmptyState icon={ShieldAlert} title={R.emptyTitle} description={R.emptyText} action={<ButtonLink href="/projects">{m.meal.seeProjects}</ButtonLink>} />
      </>
    );
  }
  const open = risks.filter((r) => r.status !== "CLOSED");
  const overdue = risks.filter((r) => r.overdue);
  return (
    <>
      <PageHeader title={R.title} description={R.intro} />
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label={R.stats.open} value={open.length} tone="navy" index={0} />
          <Stat label={R.stats.critical} value={open.filter((r) => r.level === "critical").length} tone="ochre" index={1} />
          <Stat label={R.stats.high} value={open.filter((r) => r.level === "high").length} tone="teal" index={2} />
          <Stat label={R.stats.overdue} value={overdue.length} tone="brand" index={3} />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <h2 className="font-display font-semibold">{R.matrix}</h2>
            <p className="mb-4 text-xs text-slate-500">{R.matrixHint}</p>
            <RiskMatrix counts={riskMatrix(risks)} m={m} />
          </Card>
          <Card className="p-0 lg:col-span-2">
            <h2 className="px-5 pt-5 font-display font-semibold">{R.topTitle}</h2>
            <div className="mt-3">
              <Table head={R.headAll}>
                {open.slice(0, 10).map((r) => (
                  <tr key={r.id} className="hover:bg-canvas">
                    <Td><Link href={`/projects/${r.project.id}?tab=risks`} className="whitespace-nowrap font-mono text-xs hover:underline">{r.project.code}</Link></Td>
                    <Td><span className="font-mono text-xs text-slate-500">{r.code}</span> <span className="font-medium">{r.title}</span><p className="text-xs text-slate-500">{R.categories[r.category]}</p></Td>
                    <Td><span className="inline-flex h-8 w-8 items-center justify-center rounded-lg font-display text-sm font-bold" style={{ background: LEVEL_BG[r.level], color: LEVEL_FG[r.level] }} title={R.levels[r.level]}>{r.score}</span></Td>
                    <Td><Badge tone={r.status === "MITIGATING" ? "info" : "warning"}>{R.status[r.status]}</Badge></Td>
                    <Td className="whitespace-nowrap text-xs">{r.overdue ? <span className="font-semibold text-danger">{formatDate(r.reviewDate, locale)}</span> : formatDate(r.reviewDate, locale)}</Td>
                  </tr>
                ))}
              </Table>
            </div>
          </Card>
        </div>
        <Card>
          <h2 className="mb-3 font-display font-semibold">{R.overdueTitle}</h2>
          {overdue.length === 0 ? <p className="flex items-center gap-2 text-sm text-green-700"><CheckCircle2 className="h-4 w-4" />{R.noOverdue}</p> : (
            <ul className="space-y-2 text-sm">
              {overdue.map((r) => (
                <li key={r.id} className="flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0 text-danger" aria-hidden />
                  <Link href={`/projects/${r.project.id}?tab=risks`} className="min-w-0 flex-1 truncate hover:underline"><span className="font-mono text-xs text-slate-500">{r.project.code} · {r.code}</span> {r.title}</Link>
                  <span className="text-xs text-slate-500">{formatDate(r.reviewDate, locale)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <p className="text-xs text-slate-500">{R.rules}</p>
      </div>
    </>
  );
}
