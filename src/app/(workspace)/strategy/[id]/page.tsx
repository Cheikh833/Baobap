import Link from "next/link";
import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { getPlan, unalignedProjects } from "@/server/services/strategy";
import { hierarchyOptions } from "@/server/services/options";
import { Badge, Card, DefinitionList, PageHeader, ProgressBar, Stat } from "@/components/ui/display";
import { ActionForm } from "@/components/forms/action-form";
import { AxisFields, ObjectiveFields, PlanFields } from "@/components/strategy-fields";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, formatMoney } from "@/lib/metrics";
import { objectiveAlignment, planCoverage } from "@/lib/strategy";
import { getMessages } from "@/i18n/server";
import { fill } from "@/i18n/translate";
import { Forbidden } from "../../forbidden";
import { orNotFound } from "../../guard";
import {
  createAxisAction, createObjectiveAction, deleteAxisAction, deleteObjectiveAction, deletePlanAction, updateAxisAction, updateObjectiveAction, updatePlanAction,
} from "../actions";

export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireTenant();
  if (!can(ctx, "strategy:view")) return <Forbidden />;
  const { id } = await params;
  const [plan, o, unaligned, { m, locale }] = await Promise.all([orNotFound(getPlan(ctx, id)), hierarchyOptions(ctx), unalignedProjects(ctx, id), getMessages()]);
  const S = m.strategy;
  const edit = can(ctx, "strategy:edit");
  const del = can(ctx, "strategy:delete");
  const objectives = plan.axes.flatMap((a) => a.objectives);
  const cov = planCoverage(objectives);
  const axisOptions = plan.axes.map((a) => [a.id, `${a.code} · ${a.title}`] as const);
  const money = (b: Record<string, number>) => Object.entries(b).map(([c, v]) => formatMoney(v, c, locale)).join(" · ") || "—";

  return (
    <>
      <PageHeader
        title={plan.title}
        breadcrumb={<><Link href="/strategy" className="hover:underline">{S.title}</Link>{plan.reference && <> › {plan.reference}</>}</>}
        description={plan.startDate || plan.endDate ? `${formatDate(plan.startDate, locale)} → ${formatDate(plan.endDate, locale)}` : undefined}
        actions={<StatusBadge status={plan.status} />}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label={S.axes} value={plan.axes.length} hint={`${objectives.length} ${S.objectives.toLowerCase()}`} />
        <Stat label={S.coverage} value={cov.rate === null ? "—" : `${cov.rate} %`} hint={fill(S.coverageValue, { covered: cov.covered, total: cov.objectives })} />
        <Stat label={S.alignedBudget} value={money(cov.budget)} hint={S.alignedHint} />
      </div>
      {cov.rate !== null && <div className="mt-3"><ProgressBar value={cov.rate} label={S.coverage} /></div>}

      <section className="mt-8 space-y-4">
        <h2 className="text-lg font-semibold">{S.axes}</h2>
        {plan.axes.length === 0 && <Card><p className="text-sm text-slate-500">{S.noAxes}</p></Card>}
        {plan.axes.map((axis) => (
          <Card key={axis.id}>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-mono text-sm text-brand">{axis.code}</span>
              <h3 className="font-semibold">{axis.title}</h3>
            </div>
            {axis.description && <p className="mt-1 text-sm text-slate-600">{axis.description}</p>}

            <ul className="mt-4 space-y-3">
              {axis.objectives.length === 0 && <li className="text-sm text-slate-500">{S.noObjectives}</li>}
              {axis.objectives.map((obj) => {
                const al = objectiveAlignment(obj);
                return (
                  <li key={obj.id} className="rounded-lg border border-line p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-slate-500">{obj.code}</span>
                      <span className="font-medium">{obj.title}</span>
                      {al.covered ? <Badge tone="success">{fill(S.projectsCount, { n: al.projects })}</Badge> : <Badge tone="warning">{S.notCovered}</Badge>}
                      {obj.ownerId && <span className="text-xs text-slate-500">· {o.memberNames.get(obj.ownerId)}</span>}
                      <span className="ml-auto text-xs text-slate-600">{money(al.budget)}</span>
                    </div>
                    {obj.expectedResult && <p className="mt-1 text-xs text-slate-600">{obj.expectedResult}</p>}
                    {obj.contributions.length > 0 && (
                      <ul className="mt-2 flex flex-wrap gap-2 text-xs">
                        {obj.contributions.map((c) => (
                          <li key={c.projectId}><Link href={`/projects/${c.project.id}`} className="inline-flex items-center gap-1 rounded-full bg-canvas px-2 py-0.5 hover:underline">{c.project.code} · {c.project.name} <strong>{fill(S.weight, { w: c.weight })}</strong></Link></li>
                        ))}
                      </ul>
                    )}
                    {(edit || del) && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs font-medium text-brand">{m.ui.edit}</summary>
                        <div className="mt-3 space-y-3">
                          {edit && <ActionForm action={updateObjectiveAction.bind(null, obj.id)}><ObjectiveFields o={obj} axes={axisOptions} members={o.members} m={m} /></ActionForm>}
                          {del && <ActionForm action={deleteObjectiveAction.bind(null, obj.id)} submitLabel={S.deleteObjective} submitVariant="danger" confirm={fill(m.ui.confirmDelete, { name: obj.title })} />}
                        </div>
                      </details>
                    )}
                  </li>
                );
              })}
            </ul>

            {(edit || del) && (
              <div className="mt-4 grid gap-3 border-t border-line pt-3 lg:grid-cols-2">
                {edit && (
                  <details>
                    <summary className="cursor-pointer text-sm font-medium text-brand">+ {S.newObjective}</summary>
                    <div className="mt-3"><ActionForm action={createObjectiveAction} submitLabel={m.ui.create} resetOnSuccess><ObjectiveFields axes={axisOptions} members={o.members} axisId={axis.id} m={m} /></ActionForm></div>
                  </details>
                )}
                <details>
                  <summary className="cursor-pointer text-sm font-medium text-slate-600">{m.ui.edit} · {axis.code}</summary>
                  <div className="mt-3 space-y-3">
                    {edit && <ActionForm action={updateAxisAction.bind(null, axis.id)}><AxisFields a={axis} m={m} /></ActionForm>}
                    {del && <ActionForm action={deleteAxisAction.bind(null, axis.id)} submitLabel={S.deleteAxis} submitVariant="danger" confirm={fill(m.ui.confirmDelete, { name: axis.title })} />}
                  </div>
                </details>
              </div>
            )}
          </Card>
        ))}
        {edit && (
          <Card>
            <h3 className="mb-3 font-semibold">{S.newAxis}</h3>
            <ActionForm action={createAxisAction.bind(null, plan.id)} submitLabel={m.ui.create} resetOnSuccess><AxisFields m={m} /></ActionForm>
          </Card>
        )}
      </section>

      <Card className="mt-8">
        <h2 className="font-semibold">{S.unaligned}</h2>
        <p className="mb-3 text-xs text-slate-500">{S.unalignedHint}</p>
        {unaligned.length === 0 ? <p className="text-sm text-slate-500">{S.noUnaligned}</p> : (
          <ul className="divide-y divide-line text-sm">
            {unaligned.map((p) => <li key={p.id} className="flex justify-between gap-2 py-2"><Link className="hover:underline" href={`/projects/${p.id}?tab=settings`}>{p.code} · {p.name}</Link><StatusBadge status={p.status} /></li>)}
          </ul>
        )}
      </Card>

      <Card className="mt-8">
        <h2 className="mb-4 font-semibold">{S.info}</h2>
        {edit ? (
          <ActionForm action={updatePlanAction.bind(null, plan.id)}><PlanFields p={plan} m={m} /></ActionForm>
        ) : (
          <DefinitionList items={[[S.fields.reference, plan.reference], [S.fields.period, `${formatDate(plan.startDate, locale)} → ${formatDate(plan.endDate, locale)}`], [S.fields.vision, plan.vision], [S.fields.mission, plan.mission], [S.fields.context, plan.context]]} />
        )}
      </Card>

      {del && (
        <Card className="mt-6 border-danger/30">
          <h2 className="font-semibold text-danger">{m.ui.sensitiveZone}</h2>
          <p className="mb-3 text-sm text-slate-600">{S.deleteText}</p>
          <ActionForm action={deletePlanAction.bind(null, plan.id)} submitLabel={S.deletePlan} submitVariant="danger" confirm={fill(m.ui.confirmDelete, { name: plan.title })} />
        </Card>
      )}
    </>
  );
}
