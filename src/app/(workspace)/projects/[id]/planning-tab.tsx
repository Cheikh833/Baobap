import { Diamond } from "lucide-react";
import { getPlanning } from "@/server/services/planning";
import { Badge, Card } from "@/components/ui/display";
import { ActionForm, SelectField, TextField } from "@/components/forms/action-form";
import { Gantt } from "@/components/planning/gantt";
import { ActivityFields } from "@/components/planning/fields";
import { Meter } from "@/components/charts/charts";
import { activityProgress, isActivityLate, planningProgress } from "@/lib/planning";
import { formatDate, timeProgress } from "@/lib/metrics";
import type { TenantContext } from "@/server/permissions/check";
import type { Messages } from "@/i18n/messages/fr";
import { fill } from "@/i18n/translate";
import {
  addDependencyAction, createActivityAction, createMilestoneAction, createPhaseAction, deleteActivityAction, deleteMilestoneAction, deletePhaseAction, milestoneAchievedAction, updateActivityAction,
} from "../actions";

export async function PlanningTab({ ctx, projectId, edit, members, memberNames, m, locale }: { ctx: TenantContext; projectId: string; edit: boolean; members: readonly (readonly [string, string])[]; memberNames: Map<string, string>; m: Messages; locale: string }) {
  const { project, phases, activities, milestones } = await getPlanning(ctx, projectId);
  const P = m.planning;
  const phaseOptions = phases.map((p) => [p.id, p.name] as const);
  const activityOptions = activities.map((a) => [a.id, `${a.code} · ${a.title}`] as const);
  const actual = planningProgress(activities);
  const elapsed = timeProgress(project.startDate, project.endDate);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm font-medium text-slate-600">{P.actual}</p>
          <p className="font-display text-3xl font-bold tabular">{actual === null ? "—" : `${actual} %`}</p>
          {actual !== null && <div className="mt-2"><Meter value={actual} label={P.actual} /></div>}
        </Card>
        <Card>
          <p className="text-sm font-medium text-slate-600">{P.elapsed}</p>
          <p className="font-display text-3xl font-bold tabular">{elapsed === null ? "—" : `${elapsed} %`}</p>
          {elapsed !== null && <div className="mt-2"><Meter value={elapsed} label={P.elapsed} color="linear-gradient(90deg,#102A43,#1E4A6E)" /></div>}
        </Card>
      </div>

      <Card>
        <h2 className="font-display font-semibold">{P.gantt}</h2>
        <p className="mb-4 text-xs text-slate-500">{P.ganttHint}</p>
        <Gantt activities={activities} phases={phases} milestones={milestones} projectStart={project.startDate} projectEnd={project.endDate} m={m} locale={locale} />
      </Card>

      <Card>
        <h2 className="mb-3 font-display font-semibold">{P.activities}</h2>
        <ul className="divide-y divide-line">
          {activities.length === 0 && <li className="py-2 text-sm text-slate-500">{P.noActivities}</li>}
          {activities.map((a) => {
            const prog = activityProgress(a);
            return (
              <li key={a.id} className="py-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-mono text-xs text-slate-500">{a.code}</span>
                  <span className="font-medium">{a.title}</span>
                  <Badge tone={a.status === "DONE" ? "success" : a.status === "BLOCKED" ? "danger" : a.status === "IN_PROGRESS" ? "info" : "neutral"}>{P.activityStatus[a.status]}</Badge>
                  {isActivityLate(a) && <Badge tone="danger">{P.late}</Badge>}
                  {a.tasks.length > 0 && <span className="text-xs text-slate-500">{fill(P.tasksCount, { done: a.tasks.filter((t) => t.status === "DONE").length, total: a.tasks.length })}</span>}
                  <span className="ml-auto text-xs text-slate-500">{a.ownerId ? memberNames.get(a.ownerId) : ""} · {formatDate(a.startDate, locale)} → {formatDate(a.endDate, locale)}</span>
                </div>
                <div className="mt-2 max-w-md"><Meter value={prog} label={a.title} /></div>
                {edit && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-medium text-brand">{m.ui.edit}</summary>
                    <div className="mt-3 space-y-3">
                      <ActionForm action={updateActivityAction.bind(null, a.id)}><ActivityFields a={a} phases={phaseOptions} members={members} m={m} /></ActionForm>
                      <ActionForm action={deleteActivityAction.bind(null, a.id)} submitLabel={P.deleteActivity} submitVariant="danger" confirm={fill(m.ui.confirmDelete, { name: a.title })} />
                    </div>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
        {edit && (
          <details className="mt-4 rounded-xl border border-dashed border-brand/30 p-4" open={activities.length === 0}>
            <summary className="cursor-pointer text-sm font-semibold text-brand">+ {P.newActivity}</summary>
            <div className="mt-3"><ActionForm action={createActivityAction.bind(null, projectId)} submitLabel={m.ui.create} resetOnSuccess><ActivityFields phases={phaseOptions} members={members} m={m} /></ActionForm></div>
          </details>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <h2 className="mb-3 font-display font-semibold">{P.phases}</h2>
          <ul className="space-y-2 text-sm">
            {phases.map((ph) => (
              <li key={ph.id} className="flex items-center justify-between gap-2">
                <span>{ph.name}</span>
                {edit && <ActionForm action={deletePhaseAction.bind(null, ph.id)} submitLabel="×" submitVariant="secondary" className="space-y-0" confirm={fill(m.ui.confirmDelete, { name: ph.name })} />}
              </li>
            ))}
          </ul>
          {edit && <div className="mt-3"><ActionForm action={createPhaseAction.bind(null, projectId)} submitLabel={P.newPhase} resetOnSuccess className="space-y-2"><TextField name="name" label={P.fields.name} required /></ActionForm></div>}
        </Card>

        <Card>
          <h2 className="mb-3 font-display font-semibold">{P.milestones}</h2>
          {milestones.length === 0 && <p className="text-sm text-slate-500">{P.noMilestones}</p>}
          <ul className="space-y-3 text-sm">
            {milestones.map((ms) => (
              <li key={ms.id} className="flex flex-wrap items-center gap-2">
                <Diamond className={`h-4 w-4 ${ms.achievedAt ? "fill-brand text-brand" : "text-ochre"}`} aria-hidden />
                <span className="font-medium">{ms.title}</span>
                <span className="text-xs text-slate-500">{formatDate(ms.dueDate, locale)}</span>
                {ms.achievedAt && <Badge tone="success">{P.achieved}</Badge>}
                {edit && (
                  <span className="ml-auto flex gap-1">
                    <ActionForm action={milestoneAchievedAction.bind(null, ms.id, !ms.achievedAt)} submitLabel={ms.achievedAt ? P.reopen : P.markAchieved} submitVariant="secondary" className="space-y-0" />
                    <ActionForm action={deleteMilestoneAction.bind(null, ms.id)} submitLabel="×" submitVariant="secondary" className="space-y-0" confirm={fill(m.ui.confirmDelete, { name: ms.title })} />
                  </span>
                )}
              </li>
            ))}
          </ul>
          {edit && (
            <div className="mt-3">
              <ActionForm action={createMilestoneAction.bind(null, projectId)} submitLabel={P.newMilestone} resetOnSuccess className="space-y-2">
                <TextField name="title" label={P.fields.title} required />
                <TextField name="dueDate" label={P.fields.date} type="date" required />
              </ActionForm>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 font-display font-semibold">{P.dependencies}</h2>
          <ul className="space-y-1 text-sm">
            {activities.flatMap((a) => a.predecessors.map((d) => {
              const pre = activities.find((x) => x.id === d.predecessorId);
              return <li key={`${d.predecessorId}-${d.successorId}`}><span className="font-mono text-xs">{a.code}</span> {P.after} <span className="font-mono text-xs">{pre?.code}</span></li>;
            }))}
          </ul>
          {edit && activities.length > 1 && (
            <div className="mt-3">
              <ActionForm action={addDependencyAction} submitLabel={P.addDependency} className="space-y-2">
                <SelectField name="successorId" label={P.successor} options={activityOptions} />
                <SelectField name="predecessorId" label={P.predecessor} options={activityOptions} />
              </ActionForm>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
