import type { Indicator, LogframeItem } from "@prisma/client";
import { SelectField, TextAreaField, TextField } from "@/components/forms/action-form";
import { toDateInput } from "@/lib/dates";
import type { Messages } from "@/i18n/messages/fr";

type Opt = readonly (readonly [string, string])[];
const dec = (v: unknown) => (v === null || v === undefined ? "" : String(Number(v)));

export function ItemFields({ it, parents, m }: { it?: LogframeItem; parents: Opt; m: Messages }) {
  const F = m.meal.fields;
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <SelectField name="level" label={F.level} options={Object.entries(m.meal.levels)} defaultValue={it?.level ?? "OUTCOME"} required />
      <SelectField name="parentId" label={F.parent} options={parents} placeholder={m.meal.noParent} defaultValue={it?.parentId ?? ""} className="sm:col-span-2" />
      <TextField name="code" label={F.code} defaultValue={it?.code} required placeholder="R1" />
      <TextField name="title" label={F.title} defaultValue={it?.title} required className="sm:col-span-4" />
      <TextAreaField name="description" label={F.description} rows={2} defaultValue={it?.description ?? ""} className="sm:col-span-2" />
      <TextAreaField name="assumptions" label={F.assumptions} rows={2} defaultValue={it?.assumptions ?? ""} className="sm:col-span-2" />
    </div>
  );
}

export function IndicatorFields({ ind, items, members, m }: { ind?: Indicator; items: Opt; members: Opt; m: Messages }) {
  const F = m.meal.fields;
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <TextField name="code" label={F.code} defaultValue={ind?.code} required placeholder="IND-1" />
      <TextField name="name" label={F.name} defaultValue={ind?.name} required className="sm:col-span-3" />
      <TextAreaField name="definition" label={F.definition} rows={2} defaultValue={ind?.definition ?? ""} required className="sm:col-span-4" />
      <SelectField name="logframeItemId" label={F.item} options={items} placeholder={m.ui.noneF} defaultValue={ind?.logframeItemId ?? ""} className="sm:col-span-2" />
      <TextField name="unit" label={F.unit} defaultValue={ind?.unit} required placeholder="%, personnes…" />
      <SelectField name="type" label={F.type} options={Object.entries(m.meal.types)} defaultValue={ind?.type ?? "QUANTITATIVE"} />
      <SelectField name="direction" label={F.direction} options={Object.entries(m.meal.directions)} defaultValue={ind?.direction ?? "INCREASE"} />
      <SelectField name="aggregation" label={F.aggregation} options={Object.entries(m.meal.aggregations)} defaultValue={ind?.aggregation ?? "LATEST"} />
      <SelectField name="frequency" label={F.frequency} options={Object.entries(m.meal.frequencies)} defaultValue={ind?.frequency ?? "QUARTERLY"} />
      <SelectField name="responsibleId" label={F.responsible} options={members} placeholder={m.ui.notAssigned} defaultValue={ind?.responsibleId ?? ""} />
      <TextField name="baseline" label={F.baseline} inputMode="decimal" defaultValue={dec(ind?.baseline)} />
      <TextField name="baselineDate" label={F.baselineDate} type="date" defaultValue={toDateInput(ind?.baselineDate)} />
      <TextField name="target" label={F.target} inputMode="decimal" defaultValue={dec(ind?.target)} />
      <TextField name="targetDate" label={F.targetDate} type="date" defaultValue={toDateInput(ind?.targetDate)} />
      <TextField name="source" label={F.source} defaultValue={ind?.source ?? ""} className="sm:col-span-2" />
      <TextField name="method" label={F.method} defaultValue={ind?.method ?? ""} className="sm:col-span-2" />
      <TextAreaField name="disaggregations" label={F.disaggregations} hint={F.disaggregationsHint} rows={2} defaultValue={(ind?.disaggregations ?? []).join("\n")} className="sm:col-span-4" />
    </div>
  );
}

export function ValueFields({ dims, type, period = true, m }: { dims: { name: string; categories: string[] }[]; type: string; period?: boolean; m: Messages }) {
  const F = m.meal.fields;
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {period && <TextField name="periodStart" label={F.periodStart} type="date" required />}
        {period && <TextField name="periodEnd" label={F.periodEnd} type="date" required />}
        {type === "QUANTITATIVE" && <TextField name="value" label={F.value} inputMode="decimal" required />}
        <TextField name="source" label={F.valueSource} required className={type === "QUANTITATIVE" ? "" : "sm:col-span-2"} />
        {type === "QUALITATIVE" && <TextAreaField name="textValue" label={F.textValue} rows={3} required className="sm:col-span-2" />}
        <TextAreaField name="comment" label={F.comment} rows={2} className="sm:col-span-2" />
      </div>
      {type === "QUANTITATIVE" && dims.length > 0 && (
        <fieldset className="rounded-lg border border-line p-3">
          <legend className="px-1 text-sm font-medium">{m.meal.disaggregation}</legend>
          <p className="mb-2 text-xs text-slate-500">{m.meal.disaggregationHint}</p>
          <div className="space-y-3">
            {dims.map((d) => (
              <div key={d.name}>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{d.name}</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {d.categories.map((c) => <TextField key={c} name={`dis__${d.name}__${c}`} label={c} inputMode="decimal" />)}
                </div>
              </div>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}
