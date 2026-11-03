import type { StrategicAxis, StrategicObjective, StrategicPlan } from "@prisma/client";
import { SelectField, TextAreaField, TextField } from "@/components/forms/action-form";
import { toDateInput } from "@/lib/dates";
import type { Messages } from "@/i18n/messages/fr";

type Opt = readonly (readonly [string, string])[];

export function PlanFields({ p, m }: { p?: StrategicPlan; m: Messages }) {
  const F = m.strategy.fields;
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="title" label={F.title} defaultValue={p?.title} required className="sm:col-span-2" placeholder="Plan stratégique 2026–2030" />
        <TextField name="reference" label={F.reference} defaultValue={p?.reference ?? ""} />
        <SelectField name="status" label={F.status} options={Object.entries(m.status)} defaultValue={p?.status ?? "DRAFT"} hint={m.strategy.singleActive} />
        <TextField name="startDate" label={F.start} type="date" defaultValue={toDateInput(p?.startDate)} />
        <TextField name="endDate" label={F.end} type="date" defaultValue={toDateInput(p?.endDate)} />
      </div>
      <TextAreaField name="context" label={F.context} rows={3} defaultValue={p?.context ?? ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextAreaField name="vision" label={F.vision} rows={2} defaultValue={p?.vision ?? ""} />
        <TextAreaField name="mission" label={F.mission} rows={2} defaultValue={p?.mission ?? ""} />
      </div>
    </>
  );
}

export function AxisFields({ a, m }: { a?: StrategicAxis; m: Messages }) {
  const F = m.strategy.axisFields;
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <TextField name="code" label={F.code} defaultValue={a?.code} required placeholder="A1" />
      <TextField name="title" label={F.title} defaultValue={a?.title} required className="sm:col-span-2" />
      <TextField name="position" label={F.position} type="number" min={0} defaultValue={a?.position ?? ""} />
      <TextAreaField name="description" label={F.description} rows={2} defaultValue={a?.description ?? ""} className="sm:col-span-4" />
    </div>
  );
}

export function ObjectiveFields({ o, axes, members, axisId, m }: { o?: StrategicObjective; axes: Opt; members: Opt; axisId?: string; m: Messages }) {
  const F = m.strategy.objectiveFields;
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <SelectField name="axisId" label={F.axis} options={axes} defaultValue={o?.axisId ?? axisId} />
      <TextField name="code" label={F.code} defaultValue={o?.code} required placeholder="OS1.1" />
      <TextField name="title" label={F.title} defaultValue={o?.title} required className="sm:col-span-2" />
      <SelectField name="ownerId" label={F.owner} options={members} placeholder={m.ui.notAssigned} defaultValue={o?.ownerId ?? ""} />
      <TextField name="position" label={F.position} type="number" min={0} defaultValue={o?.position ?? ""} />
      <TextAreaField name="expectedResult" label={F.expectedResult} rows={2} defaultValue={o?.expectedResult ?? ""} className="sm:col-span-2" />
      <TextAreaField name="description" label={F.description} rows={2} defaultValue={o?.description ?? ""} className="sm:col-span-4" />
    </div>
  );
}
