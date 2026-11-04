import Link from "next/link";
import { Clock } from "lucide-react";
import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { getIndicator, getLogframe } from "@/server/services/meal";
import { hierarchyOptions } from "@/server/services/options";
import { db } from "@/server/db";
import { effectiveValues } from "@/lib/meal";
import { Badge, Card, DefinitionList, PageHeader } from "@/components/ui/display";
import { ActionForm, TextField } from "@/components/forms/action-form";
import { IndicatorFields, ValueFields } from "@/components/meal/fields";
import { IndicatorChart } from "@/components/meal/line-chart";
import { RateMeter, TrackBadge, numFmt, type Track } from "@/components/meal/display";
import { Ring } from "@/components/charts/charts";
import { formatDate } from "@/lib/metrics";
import { getMessages } from "@/i18n/server";
import { fill } from "@/i18n/translate";
import { Forbidden } from "../../../forbidden";
import { orNotFound } from "../../../guard";
import { addValueAction, correctValueAction, deleteIndicatorAction, deleteValueAction, reviewValueAction, updateIndicatorAction } from "../../actions";

const STATUS_TONE = { DRAFT: "info", VALIDATED: "success", REJECTED: "danger" } as const;

export default async function IndicatorPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireTenant();
  if (!can(ctx, "meal:view")) return <Forbidden />;
  const { id } = await params;
  const [ind, { m, locale }] = await Promise.all([orNotFound(getIndicator(ctx, id)), getMessages()]);
  const M = m.meal;
  const F = M.fields;
  const fmt = numFmt(locale);
  const c = ind.calc;
  const people = await db.user.findMany({ where: { id: { in: ind.values.flatMap((v) => [v.collectedById, v.validatedById]).filter((x): x is string => !!x).concat(ind.responsibleId ? [ind.responsibleId] : []) } }, select: { id: true, name: true } });
  const name = new Map(people.map((p) => [p.id, p.name]));
  const effective = new Set(effectiveValues(ind.values.map((v) => ({ ...v, value: v.value === null ? null : Number(v.value) }))).map((v) => v.id));
  const points = ind.values.filter((v) => effective.has(v.id) && v.value !== null).map((v) => ({ date: v.periodEnd, value: Number(v.value) }));
  const editInd = can(ctx, "meal:edit");
  const [opts, lf] = editInd ? await Promise.all([hierarchyOptions(ctx), getLogframe(ctx, ind.projectId)]) : [null, null];
  const values = [...ind.values].reverse();

  return (
    <>
      <PageHeader
        title={ind.name}
        breadcrumb={<><Link href="/meal" className="hover:underline">{M.title}</Link> › <Link href={`/projects/${ind.project.id}?tab=meal`} className="hover:underline">{ind.project.code}</Link> › {ind.code}</>}
        actions={<>{c.stale && <Badge tone="warning"><Clock className="mr-1 h-3 w-3" />{M.stale}</Badge>}<TrackBadge status={c.status as Track} m={m} /></>}
      />
      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="flex items-center gap-5">
            <Ring value={Math.max(0, Math.min(100, c.rate ?? 0))} label={M.rate} color={c.status === "critical" ? "#DC2626" : c.status === "watch" ? "#D97706" : "#087F68"}>
              <span className="font-display text-2xl font-bold tabular">{c.rate === null ? "—" : `${fmt(c.rate)} %`}</span>
            </Ring>
            <div>
              <p className="text-sm font-medium text-slate-600">{M.rate}</p>
              {c.expected !== null && <p className="text-xs text-slate-500">{fill(M.expected, { pct: c.expected })}</p>}
              <div className="mt-2 w-40"><RateMeter rate={c.rate} expected={c.expected} status={c.status as Track} label={M.rate} /></div>
            </div>
          </Card>
          <Card>
            <p className="text-sm font-medium text-slate-600">{M.current}</p>
            <p className="font-display text-3xl font-bold tabular">{fmt(c.current)} <span className="text-base font-medium text-slate-500">{ind.unit}</span></p>
            <p className="mt-1 text-xs text-slate-500">{M.aggregations[ind.aggregation]}</p>
          </Card>
          <Card>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-xs text-slate-500">{F.baseline}</dt><dd className="font-semibold tabular">{fmt(c.baseline)} <span className="text-xs font-normal text-slate-500">{formatDate(ind.baselineDate, locale)}</span></dd></div>
              <div><dt className="text-xs text-slate-500">{F.target}</dt><dd className="font-semibold tabular">{fmt(c.target)} <span className="text-xs font-normal text-slate-500">{formatDate(ind.targetDate, locale)}</span></dd></div>
              <div><dt className="text-xs text-slate-500">{F.direction}</dt><dd>{M.directions[ind.direction]}</dd></div>
              <div><dt className="text-xs text-slate-500">{F.frequency}</dt><dd>{M.frequencies[ind.frequency]}</dd></div>
            </dl>
          </Card>
        </div>

        <Card>
          <h2 className="font-display font-semibold">{M.chart}</h2>
          <p className="mb-3 text-xs text-slate-500">{M.chartHint}</p>
          {points.length ? <IndicatorChart points={points} baseline={c.baseline} target={c.target} unit={ind.unit} label={`${M.chart} — ${ind.name}`} fmtDate={(d) => formatDate(d, locale)} fmtNum={(n) => fmt(n)} /> : <p className="text-sm text-slate-500">{M.chartEmpty}</p>}
        </Card>

        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <h2 className="mb-3 font-display font-semibold">{M.values}</h2>
            {values.length === 0 && <p className="text-sm text-slate-500">{M.noValues}</p>}
            <ul className="divide-y divide-line">
              {values.map((v) => {
                const corrected = v.supersededBy?.status === "VALIDATED";
                const dis = v.disaggregation as Record<string, Record<string, number>> | null;
                const orig = v.supersedesId ? ind.values.find((x) => x.id === v.supersedesId) : null;
                return (
                  <li key={v.id} className={`py-3 ${corrected || v.status === "REJECTED" ? "opacity-60" : ""}`}>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium">{formatDate(v.periodStart, locale)} → {formatDate(v.periodEnd, locale)}</span>
                      <span className="font-display text-lg font-bold tabular">{v.value === null ? "" : `${fmt(Number(v.value))} ${ind.unit}`}</span>
                      <Badge tone={STATUS_TONE[v.status]}>{M.valueStatus[v.status]}</Badge>
                      {corrected && <Badge>{M.correctedBy}</Badge>}
                      {orig && <span className="text-xs text-slate-500">{fill(M.correctionOf, { date: formatDate(orig.periodEnd, locale) })} ({fmt(Number(orig.value))})</span>}
                    </div>
                    {v.textValue && <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{v.textValue}</p>}
                    {dis && (
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                        {Object.entries(dis).map(([d, cats]) => <span key={d}><span className="font-semibold">{d}</span> : {Object.entries(cats).map(([k, n]) => `${k} ${fmt(n)}`).join(" · ")}</span>)}
                      </div>
                    )}
                    <p className="mt-1 text-xs text-slate-500">
                      {F.valueSource} : {v.source} · {fill(M.collectedBy, { name: name.get(v.collectedById ?? "") ?? "—" })}
                      {v.validatedById && <> · {fill(M.validatedBy, { status: M.valueStatus[v.status], name: name.get(v.validatedById) ?? "—", date: formatDate(v.validatedAt, locale) })}</>}
                    </p>
                    {v.comment && <p className="text-xs italic text-slate-500">{v.comment}</p>}
                    {v.reviewComment && <p className="text-xs text-slate-600">{F.reviewComment} : {v.reviewComment}</p>}
                    <div className="mt-2 flex flex-wrap items-end gap-2">
                      {v.status === "DRAFT" && can(ctx, "meal:approve") && (
                        <>
                          <ActionForm action={reviewValueAction.bind(null, v.id, true)} submitLabel={M.validate} className="flex flex-wrap items-end gap-2 space-y-0"><TextField name="reviewComment" label={F.reviewComment} className="w-56" /></ActionForm>
                          <ActionForm action={reviewValueAction.bind(null, v.id, false)} submitLabel={M.reject} submitVariant="secondary" className="space-y-0" />
                        </>
                      )}
                      {v.status !== "VALIDATED" && (can(ctx, "meal:delete") || (v.collectedById === ctx.userId && can(ctx, "meal:create"))) && (
                        <ActionForm action={deleteValueAction.bind(null, v.id)} submitLabel={M.deleteValue} submitVariant="secondary" className="space-y-0" confirm={fill(m.ui.confirmDelete, { name: formatDate(v.periodEnd, locale) })} />
                      )}
                    </div>
                    {v.status === "VALIDATED" && !corrected && v.supersededBy?.status !== "DRAFT" && can(ctx, "meal:create") && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs font-medium text-brand">{M.correct}</summary>
                        <p className="mt-2 text-xs text-slate-500">{M.correctHint}</p>
                        <div className="mt-2"><ActionForm action={correctValueAction.bind(null, v.id)}><ValueFields dims={ind.dimensions} type={ind.type} period={false} m={m} /></ActionForm></div>
                      </details>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>

          <div className="space-y-6 lg:col-span-2">
            {can(ctx, "meal:create") && (
              <Card>
                <h2 className="font-display font-semibold">{M.addValue}</h2>
                <p className="mb-3 text-xs text-slate-500">{M.addValueHint}</p>
                <ActionForm action={addValueAction.bind(null, ind.id)} resetOnSuccess><ValueFields dims={ind.dimensions} type={ind.type} m={m} /></ActionForm>
              </Card>
            )}
            <Card>
              <h2 className="mb-3 font-display font-semibold">{M.details}</h2>
              <DefinitionList items={[
                [F.definition, ind.definition], [F.item, ind.logframeItem ? `${M.levels[ind.logframeItem.level]} · ${ind.logframeItem.code} — ${ind.logframeItem.title}` : null],
                [F.type, M.types[ind.type]], [F.unit, ind.unit], [F.source, ind.source], [F.method, ind.method],
                [F.responsible, ind.responsibleId ? name.get(ind.responsibleId) : null], [F.disaggregations, ind.disaggregations.join("\n")],
              ]} />
              <p className="mt-4 text-xs text-slate-500">{M.formula}</p>
            </Card>
          </div>
        </div>

        {editInd && opts && lf && (
          <Card>
            <details>
              <summary className="cursor-pointer font-semibold">{m.ui.edit}</summary>
              <div className="mt-4 space-y-4">
                <ActionForm action={updateIndicatorAction.bind(null, ind.id)}><IndicatorFields ind={ind} items={lf.items.map((i) => [i.id, `${M.levels[i.level]} · ${i.code} — ${i.title}`] as const)} members={opts.members} m={m} /></ActionForm>
                {can(ctx, "meal:delete") && <ActionForm action={deleteIndicatorAction.bind(null, ind.id, ind.projectId)} submitLabel={M.deleteIndicator} submitVariant="danger" confirm={fill(m.ui.confirmDelete, { name: ind.name })} />}
              </div>
            </details>
          </Card>
        )}
      </div>
    </>
  );
}
