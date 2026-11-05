import type { Risk } from "@prisma/client";
import { SelectField, TextAreaField, TextField } from "@/components/forms/action-form";
import { toDateInput } from "@/lib/dates";
import type { Messages } from "@/i18n/messages/fr";

type Opt = readonly (readonly [string, string])[];

export function RiskFields({ r, members, m }: { r?: Risk; members: Opt; m: Messages }) {
  const F = m.risks.fields;
  const scale = m.risks.scale.map((l, i) => [String(i + 1), l] as const);
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <TextField name="code" label={F.code} defaultValue={r?.code} required placeholder="R1" />
      <TextField name="title" label={F.title} defaultValue={r?.title} required className="sm:col-span-3" />
      <SelectField name="category" label={F.category} options={Object.entries(m.risks.categories)} defaultValue={r?.category ?? "OPERATIONAL"} />
      <SelectField name="probability" label={F.probability} options={scale} defaultValue={String(r?.probability ?? 3)} required />
      <SelectField name="impact" label={F.impact} options={scale} defaultValue={String(r?.impact ?? 3)} required />
      <SelectField name="status" label={F.status} options={Object.entries(m.risks.status)} defaultValue={r?.status ?? "OPEN"} />
      <SelectField name="ownerId" label={F.owner} options={members} placeholder={m.ui.notAssigned} defaultValue={r?.ownerId ?? ""} className="sm:col-span-2" />
      <TextField name="reviewDate" label={F.review} type="date" defaultValue={toDateInput(r?.reviewDate)} />
      <div className="hidden sm:block" />
      <TextAreaField name="description" label={F.description} rows={2} defaultValue={r?.description ?? ""} className="sm:col-span-4" />
      <TextAreaField name="mitigation" label={F.mitigation} rows={2} defaultValue={r?.mitigation ?? ""} className="sm:col-span-2" />
      <TextAreaField name="contingency" label={F.contingency} rows={2} defaultValue={r?.contingency ?? ""} className="sm:col-span-2" />
    </div>
  );
}
