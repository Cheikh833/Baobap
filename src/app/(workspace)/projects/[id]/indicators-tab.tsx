import Link from "next/link";
import { Clock } from "lucide-react";
import { getLogframe } from "@/server/services/meal";
import { Badge, Card } from "@/components/ui/display";
import { ActionForm } from "@/components/forms/action-form";
import { IndicatorFields } from "@/components/meal/fields";
import { RateMeter, TrackBadge, numFmt, type Track } from "@/components/meal/display";
import { can, type TenantContext } from "@/server/permissions/check";
import type { Messages } from "@/i18n/messages/fr";
import { fill } from "@/i18n/translate";
import { createIndicatorAction } from "../../meal/actions";

export async function IndicatorsTab({ ctx, projectId, members, memberNames, m, locale }: { ctx: TenantContext; projectId: string; members: readonly (readonly [string, string])[]; memberNames: Map<string, string>; m: Messages; locale: string }) {
  const { items, indicators } = await getLogframe(ctx, projectId);
  const M = m.meal;
  const fmt = numFmt(locale);
  const itemOptions = items.map((i) => [i.id, `${M.levels[i.level]} · ${i.code} — ${i.title}`] as const);
  const count = (s: Track) => indicators.filter((i) => i.calc.status === s).length;

  return (
    <div className="space-y-6">
      {indicators.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-4">
          {([["indicators", indicators.length, "text-navy"], ["onTrack", count("good"), "text-green-700"], ["critical", count("critical"), "text-red-700"], ["pending", indicators.reduce((s, i) => s + i.calc.pending, 0), "text-amber-700"]] as const).map(([k, v, c]) => (
            <Card key={k}><p className={`font-display text-3xl font-bold tabular ${c}`}>{v}</p><p className="text-xs text-slate-500">{M.stats[k]}</p></Card>
          ))}
        </div>
      )}
      <Card>
        <h2 className="mb-1 font-display font-semibold">{M.indicators}</h2>
        <p className="mb-4 text-xs text-slate-500">{M.formula}</p>
        {indicators.length === 0 && <p className="text-sm text-slate-500">{M.noIndicators}</p>}
        <ul className="grid gap-3 lg:grid-cols-2">
          {indicators.map((x, i) => (
            <li key={x.id} className="min-w-0 animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
              <Link href={`/meal/indicators/${x.id}`} className="block rounded-xl border border-line bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-slate-500">{x.code}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{x.name}</span>
                  <TrackBadge status={x.calc.status as Track} m={m} />
                </div>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <div>
                    <p className="font-display text-2xl font-bold tabular">{fmt(x.calc.current)} <span className="text-sm font-medium text-slate-500">{x.unit}</span></p>
                    <p className="text-xs text-slate-500">{M.fields.baseline} {fmt(x.calc.baseline)} · {M.fields.target} {fmt(x.calc.target)}</p>
                  </div>
                  <p className="text-right font-display text-xl font-bold tabular text-brand-deep">{x.calc.rate === null ? "—" : `${fmt(x.calc.rate)} %`}</p>
                </div>
                <div className="mt-2"><RateMeter rate={x.calc.rate} expected={x.calc.expected} status={x.calc.status as Track} label={M.rate} /></div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                  {x.calc.expected !== null && <span>{fill(M.expected, { pct: x.calc.expected })}</span>}
                  <span>· {M.frequencies[x.frequency]}</span>
                  {x.responsibleId && <span>· {memberNames.get(x.responsibleId)}</span>}
                  {x.calc.stale && <Badge tone="warning"><Clock className="mr-1 h-3 w-3" />{M.stale}</Badge>}
                  {x.calc.pending > 0 && <Badge tone="info">{fill(M.pending, { n: x.calc.pending })}</Badge>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
        {can(ctx, "meal:edit") && (
          <details className="mt-4 rounded-xl border border-dashed border-brand/30 p-4" open={indicators.length === 0}>
            <summary className="cursor-pointer text-sm font-semibold text-brand">+ {M.newIndicator}</summary>
            <div className="mt-3"><ActionForm action={createIndicatorAction.bind(null, projectId)} submitLabel={m.ui.create} resetOnSuccess><IndicatorFields items={itemOptions} members={members} m={m} /></ActionForm></div>
          </details>
        )}
      </Card>
    </div>
  );
}
