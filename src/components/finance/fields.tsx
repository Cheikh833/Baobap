import type { BudgetLine, Funding } from "@prisma/client";
import { SelectField, TextAreaField, TextField } from "@/components/forms/action-form";
import { toDateInput } from "@/lib/dates";
import type { Messages } from "@/i18n/messages/fr";

type Opt = readonly (readonly [string, string])[];
const amt = (v: unknown) => (v === null || v === undefined ? "" : String(Number(v)));

export function FundingFields({ f, m }: { f?: Funding; m: Messages }) {
  const F = m.finance.fields;
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <TextField name="donor" label={F.donor} defaultValue={f?.donor} required className="sm:col-span-2" />
      <TextField name="reference" label={F.reference} defaultValue={f?.reference ?? ""} />
      <TextField name="amount" label={F.amount} inputMode="decimal" defaultValue={amt(f?.amount)} required />
      <TextField name="startDate" label={F.start} type="date" defaultValue={toDateInput(f?.startDate)} />
      <TextField name="endDate" label={F.end} type="date" defaultValue={toDateInput(f?.endDate)} />
      <TextAreaField name="notes" label={F.notes} rows={1} defaultValue={f?.notes ?? ""} className="sm:col-span-2" />
    </div>
  );
}

export function LineFields({ l, fundings, m }: { l?: BudgetLine; fundings: Opt; m: Messages }) {
  const F = m.finance.fields;
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <TextField name="code" label={F.code} defaultValue={l?.code} required placeholder="B1.1" />
      <TextField name="label" label={F.label} defaultValue={l?.label} required className="sm:col-span-3" />
      <SelectField name="category" label={F.category} options={Object.entries(m.finance.categories)} defaultValue={l?.category ?? "ACTIVITIES"} />
      <TextField name="plannedAmount" label={F.planned} inputMode="decimal" defaultValue={amt(l?.plannedAmount)} required />
      <SelectField name="fundingId" label={F.funding} options={fundings} placeholder={m.finance.noFunding} defaultValue={l?.fundingId ?? ""} className="sm:col-span-2" />
    </div>
  );
}

export function ExpenseFields({ lines, m }: { lines: Opt; m: Messages }) {
  const F = m.finance.fields;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <SelectField name="budgetLineId" label={F.line} options={lines} required className="sm:col-span-2" />
      <TextField name="date" label={F.date} type="date" required />
      <TextField name="amount" label={F.amount} inputMode="decimal" required />
      <TextField name="description" label={F.description} required className="sm:col-span-2" />
      <TextField name="supplier" label={F.supplier} />
      <TextField name="reference" label={F.pieceRef} />
    </div>
  );
}
