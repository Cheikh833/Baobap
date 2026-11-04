import Link from "next/link";
import { CheckCircle2, Clock, Target } from "lucide-react";
import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { mealOverview } from "@/server/services/meal";
import { effectiveValues } from "@/lib/meal";
import { Badge, Card, EmptyState, PageHeader, Stat, Table, Td } from "@/components/ui/display";
import { ButtonLink } from "@/components/ui/button";
import { Donut } from "@/components/charts/charts";
import { RateMeter, TRACK_COLOR, TrackBadge, numFmt, type Track } from "@/components/meal/display";
import { formatDate } from "@/lib/metrics";
import { getMessages } from "@/i18n/server";
import { Forbidden } from "../forbidden";

export default async function MealPage() {
  const ctx = await requireTenant();
  if (!can(ctx, "meal:view")) return <Forbidden />;
  const [{ rows, pending }, { m, locale }] = await Promise.all([mealOverview(ctx), getMessages()]);
  const M = m.meal;
  const fmt = numFmt(locale);
  const count = (s: Track) => rows.filter((r) => r.calc.status === s).length;
  const stale = rows.filter((r) => r.calc.stale);

  if (!rows.length) {
    return (
      <>
        <PageHeader title={M.title} description={M.intro} />
        <EmptyState icon={Target} title={M.emptyAllTitle} description={M.emptyAllText} action={<ButtonLink href="/projects">{M.seeProjects}</ButtonLink>} />
      </>
    );
  }

  return (
    <>
      <PageHeader title={M.title} description={M.intro} />
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label={M.stats.indicators} value={rows.length} tone="navy" index={0} />
          <Stat label={M.stats.onTrack} value={count("good")} tone="brand" index={1} />
          <Stat label={M.stats.critical} value={count("critical")} tone="ochre" index={2} />
          <Stat label={M.stats.pending} value={pending.length} tone="teal" index={3} />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <h2 className="mb-4 font-display font-semibold">{M.distribution}</h2>
            <Donut label={M.title} data={(["good", "watch", "critical", "unknown"] as Track[]).map((s) => ({ label: `${M.track[s]} (${count(s)})`, value: count(s), color: TRACK_COLOR[s] }))} center={<span className="font-display text-2xl font-bold">{rows.length}</span>} />
          </Card>
          <Card>
            <h2 className="mb-3 font-display font-semibold">{M.pendingTitle}</h2>
            {pending.length === 0 ? <p className="flex items-center gap-2 text-sm text-green-700"><CheckCircle2 className="h-4 w-4" />{M.noPending}</p> : (
              <ul className="space-y-2 text-sm">
                {pending.slice(0, 8).map((v) => (
                  <li key={v.id} className="flex flex-wrap items-center gap-2">
                    <Link href={`/meal/indicators/${v.indicator.id}`} className="min-w-0 flex-1 truncate hover:underline"><span className="font-mono text-xs text-slate-500">{v.indicator.project.code} · {v.indicator.code}</span> {v.indicator.name}</Link>
                    <span className="font-semibold tabular">{v.value === null ? "" : `${fmt(Number(v.value))} ${v.indicator.unit}`}</span>
                    <span className="text-xs text-slate-500">{formatDate(v.periodEnd, locale)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <h2 className="mb-3 font-display font-semibold">{M.staleTitle}</h2>
            {stale.length === 0 ? <p className="flex items-center gap-2 text-sm text-green-700"><CheckCircle2 className="h-4 w-4" />{M.noStale}</p> : (
              <ul className="space-y-2 text-sm">
                {stale.slice(0, 8).map((r) => (
                  <li key={r.id} className="flex items-center gap-2">
                    <Clock className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                    <Link href={`/meal/indicators/${r.id}`} className="min-w-0 flex-1 truncate hover:underline"><span className="font-mono text-xs text-slate-500">{r.project.code} · {r.code}</span> {r.name}</Link>
                    <span className="text-xs text-slate-500">{M.frequencies[r.frequency]}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-slate-500">{M.staleHint}</p>
          </Card>
        </div>

        <Card className="p-0">
          <Table head={M.headAll}>
            {rows.map((r) => {
              const last = effectiveValues(r.values.map((v) => ({ ...v, value: v.value === null ? null : Number(v.value) }))).at(-1);
              return (
                <tr key={r.id} className="hover:bg-canvas">
                  <Td><Link href={`/projects/${r.project.id}?tab=meal`} className="whitespace-nowrap font-mono text-xs hover:underline">{r.project.code}</Link></Td>
                  <Td><Link href={`/meal/indicators/${r.id}`} className="font-medium hover:underline"><span className="font-mono text-xs text-slate-500">{r.code}</span> {r.name}</Link>{r.logframeItem && <p className="text-xs text-slate-500">{M.levels[r.logframeItem.level]} {r.logframeItem.code}</p>}</Td>
                  <Td className="whitespace-nowrap tabular">{fmt(r.calc.current)} / {fmt(r.calc.target)} <span className="text-xs text-slate-500">{r.unit}</span></Td>
                  <Td className="min-w-[8rem]"><span className="font-semibold tabular">{r.calc.rate === null ? "—" : `${fmt(r.calc.rate)} %`}</span><div className="mt-1"><RateMeter rate={r.calc.rate} expected={r.calc.expected} status={r.calc.status as Track} label={M.rate} /></div></Td>
                  <Td><div className="flex flex-wrap gap-1"><TrackBadge status={r.calc.status as Track} m={m} />{r.calc.stale && <Badge tone="warning">{M.stale}</Badge>}</div></Td>
                  <Td className="whitespace-nowrap text-xs text-slate-500">{last ? formatDate(last.periodEnd, locale) : "—"}</Td>
                </tr>
              );
            })}
          </Table>
        </Card>
        <p className="text-xs text-slate-500">{M.formula}</p>
      </div>
    </>
  );
}
