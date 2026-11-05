import Link from "next/link";
import { CheckCircle2, Wallet } from "lucide-react";
import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { financeOverview } from "@/server/services/finance";
import { Badge, Card, EmptyState, PageHeader, Table, Td } from "@/components/ui/display";
import { ButtonLink } from "@/components/ui/button";
import { Meter } from "@/components/charts/charts";
import { budgetHealth } from "@/lib/finance";
import { formatDate, formatMoney, intlLocale, timeProgress } from "@/lib/metrics";
import { getMessages } from "@/i18n/server";
import { Forbidden } from "../forbidden";

export default async function FinancePage() {
  const ctx = await requireTenant();
  if (!can(ctx, "finance:view")) return <Forbidden />;
  const [{ rows, byCurrency, pending }, { m, locale }] = await Promise.all([financeOverview(ctx), getMessages()]);
  const F = m.finance;
  const pct = (x: number | null) => `${new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: 1 }).format(x ?? 0)}\u00A0%`;
  if (!rows.length) {
    return (
      <>
        <PageHeader title={F.title} description={F.intro} />
        <EmptyState icon={Wallet} title={F.emptyTitle} description={F.emptyText} action={<ButtonLink href="/projects">{m.meal.seeProjects}</ButtonLink>} />
      </>
    );
  }
  return (
    <>
      <PageHeader title={F.title} description={F.intro} />
      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-2">
          {byCurrency.map((c, i) => {
            const exec = c.planned > 0 ? Math.round((c.spent / c.planned) * 1000) / 10 : 0;
            return (
              <Card key={c.currency} className="animate-fade-up relative overflow-hidden">
                <div style={{ animationDelay: `${i * 80}ms` }}>
                  <div className="flex items-baseline justify-between"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{F.byCurrency} · {c.currency}</p><Badge tone="brand">{m.nav.projects} : {c.projects}</Badge></div>
                  <p className="mt-2 font-display text-3xl font-bold tabular">{formatMoney(c.spent, c.currency, locale)} <span className="text-base font-medium text-slate-500">/ {formatMoney(c.planned, c.currency, locale)}</span></p>
                  <div className="mt-3"><Meter value={exec} label={F.stats.execution} /></div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div><dt className="text-slate-500">{F.stats.execution}</dt><dd className="font-semibold tabular">{pct(exec)}</dd></div>
                    <div><dt className="text-slate-500">{F.stats.pending}</dt><dd className="font-semibold tabular">{formatMoney(c.pending, c.currency, locale)}</dd></div>
                    <div><dt className="text-slate-500">{F.stats.funded}</dt><dd className="font-semibold tabular">{formatMoney(c.funded, c.currency, locale)}</dd></div>
                  </dl>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="p-0">
          <Table head={F.projectsHead}>
            {rows.map((r) => {
              const h = budgetHealth(r.totals.execution, timeProgress(r.startDate, r.endDate), r.totals.overspentLines);
              return (
                <tr key={r.id} className="hover:bg-canvas">
                  <Td><Link href={`/projects/${r.id}?tab=finance`} className="font-medium hover:underline"><span className="font-mono text-xs text-slate-500">{r.code}</span> {r.name}</Link></Td>
                  <Td className="font-mono text-xs">{r.currency}</Td>
                  <Td className="whitespace-nowrap tabular">{formatMoney(r.totals.planned, r.currency, locale)}</Td>
                  <Td className="whitespace-nowrap tabular">{formatMoney(r.totals.spent, r.currency, locale)}</Td>
                  <Td className="min-w-[7rem]"><span className="font-semibold tabular">{pct(r.totals.execution)}</span><div className="mt-1"><Meter value={r.totals.execution ?? 0} label={r.name} color={r.totals.overspentLines ? "#DC2626" : undefined} /></div></Td>
                  <Td className="whitespace-nowrap tabular">{formatMoney(r.totals.funded, r.currency, locale)}</Td>
                  <Td><Badge tone={h === "critical" ? "danger" : h === "watch" ? "warning" : h === "good" ? "success" : "neutral"}>{m.project.levels[h]}</Badge>{r.totals.overspentLines > 0 && <Badge tone="danger">{F.overspent}</Badge>}</Td>
                </tr>
              );
            })}
          </Table>
        </Card>

        <Card>
          <h2 className="mb-3 font-display font-semibold">{F.pendingTitle}</h2>
          {pending.length === 0 ? <p className="flex items-center gap-2 text-sm text-green-700"><CheckCircle2 className="h-4 w-4" />{F.noPending}</p> : (
            <ul className="divide-y divide-line text-sm">
              {pending.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-2 py-2">
                  <Link href={`/projects/${e.project.id}?tab=finance`} className="min-w-0 flex-1 truncate hover:underline"><span className="font-mono text-xs text-slate-500">{e.project.code} · {e.budgetLine.code}</span> {e.description}</Link>
                  <span className="text-xs text-slate-500">{formatDate(e.date, locale)}</span>
                  <span className="font-semibold tabular">{formatMoney(Number(e.amount), e.project.currency, locale)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <p className="text-xs text-slate-500">{F.rules}</p>
      </div>
    </>
  );
}
