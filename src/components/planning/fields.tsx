import type { Activity, Task } from "@prisma/client";
import { SelectField, TextAreaField, TextField } from "@/components/forms/action-form";
import { toDateInput } from "@/lib/dates";
import type { Messages } from "@/i18n/messages/fr";

type Opt = readonly (readonly [string, string])[];

export function ActivityFields({ a, phases, members, m }: { a?: Activity; phases: Opt; members: Opt; m: Messages }) {
  const F = m.planning.fields;
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <TextField name="code" label={F.code} defaultValue={a?.code} required placeholder="A1.1" />
      <TextField name="title" label={F.title} defaultValue={a?.title} required className="sm:col-span-3" />
      <SelectField name="phaseId" label={F.phase} options={phases} placeholder={m.planning.noPhase} defaultValue={a?.phaseId ?? ""} />
      <SelectField name="ownerId" label={F.owner} options={members} placeholder={m.ui.notAssigned} defaultValue={a?.ownerId ?? ""} />
      <TextField name="startDate" label={F.start} type="date" defaultValue={toDateInput(a?.startDate)} />
      <TextField name="endDate" label={F.end} type="date" defaultValue={toDateInput(a?.endDate)} />
      <SelectField name="status" label={F.status} options={Object.entries(m.planning.activityStatus)} defaultValue={a?.status ?? "NOT_STARTED"} />
      <TextField name="progress" label={F.progress} type="number" min={0} max={100} defaultValue={a?.progress ?? 0} hint={F.progressHint} />
      <TextAreaField name="description" label={F.description} rows={2} defaultValue={a?.description ?? ""} className="sm:col-span-2" />
    </div>
  );
}

export function TaskFields({ t, activities, members, m }: { t?: Task; activities: Opt; members: Opt; m: Messages }) {
  const F = m.planning.fields;
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <TextField name="title" label={F.title} defaultValue={t?.title} required className="sm:col-span-2" />
      <SelectField name="activityId" label={F.activity} options={activities} placeholder={m.ui.noneF} defaultValue={t?.activityId ?? ""} />
      <SelectField name="assigneeId" label={F.assignee} options={members} placeholder={m.ui.notAssigned} defaultValue={t?.assigneeId ?? ""} />
      <TextField name="dueDate" label={F.due} type="date" defaultValue={toDateInput(t?.dueDate)} />
      <SelectField name="priority" label={F.priority} options={Object.entries(m.priority)} defaultValue={t?.priority ?? "MEDIUM"} />
      <SelectField name="status" label={F.status} options={Object.entries(m.planning.taskStatus)} defaultValue={t?.status ?? "TODO"} />
      <TextAreaField name="description" label={F.description} rows={2} defaultValue={t?.description ?? ""} className="sm:col-span-4" />
    </div>
  );
}
