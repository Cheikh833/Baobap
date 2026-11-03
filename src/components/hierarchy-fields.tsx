import type { Portfolio, Program } from "@prisma/client";
import { SelectField, TextAreaField, TextField } from "@/components/forms/action-form";
import { joinList, toDateInput } from "@/lib/dates";
import type { Messages } from "@/i18n/messages/fr";

type Opt = readonly (readonly [string, string])[];
const statusOptions = (m: Messages) => Object.entries(m.status) as [string, string][];

export function PortfolioFields({ p, members, currency, m }: { p?: Portfolio; members: Opt; currency: string; m: Messages }) {
  const F = m.portfolio.fields;
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="name" label={F.name} defaultValue={p?.name} required />
        <TextField name="code" label={F.code} defaultValue={p?.code} required hint={F.codeHint} />
        <SelectField name="managerId" label={F.manager} options={members} placeholder={m.ui.notAssigned} defaultValue={p?.managerId ?? ""} />
        <SelectField name="status" label={F.status} options={statusOptions(m)} defaultValue={p?.status ?? "DRAFT"} />
        <TextField name="startDate" label={F.start} type="date" defaultValue={toDateInput(p?.startDate)} />
        <TextField name="endDate" label={F.end} type="date" defaultValue={toDateInput(p?.endDate)} />
        <TextField name="plannedBudget" label={F.budget} inputMode="decimal" defaultValue={p?.plannedBudget?.toString() ?? ""} hint={F.budgetHint} />
        <TextField name="currency" label={F.currency} maxLength={3} defaultValue={p?.currency ?? currency} />
      </div>
      <TextAreaField name="objective" label={F.objective} rows={2} defaultValue={p?.objective ?? ""} />
      <TextAreaField name="description" label={F.description} defaultValue={p?.description ?? ""} />
    </>
  );
}

export function ProgramFields({ p, members, portfolios, currency, m }: { p?: Program; members: Opt; portfolios: Opt; currency: string; m: Messages }) {
  const F = m.program.fields;
  const P = m.portfolio.fields;
  const S = m.program.sections;
  return (
    <>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{S.identity}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="name" label={F.name} defaultValue={p?.name} required />
        <TextField name="code" label={P.code} defaultValue={p?.code} required />
        <SelectField name="portfolioId" label={F.portfolio} options={portfolios} placeholder={m.ui.none} defaultValue={p?.portfolioId ?? ""} />
        <SelectField name="status" label={P.status} options={statusOptions(m)} defaultValue={p?.status ?? "DRAFT"} />
        <SelectField name="managerId" label={P.manager} options={members} placeholder={m.ui.notAssigned} defaultValue={p?.managerId ?? ""} />
        <SelectField name="coordinatorId" label={F.coordinator} options={members} placeholder={m.ui.notAssigned} defaultValue={p?.coordinatorId ?? ""} />
        <TextField name="sectors" label={F.sectors} hint={m.ui.listHint} defaultValue={joinList(p?.sectors)} />
        <TextField name="zones" label={F.zones} hint={m.ui.listHint} defaultValue={joinList(p?.zones)} />
      </div>
      <h3 className="pt-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{S.context}</h3>
      <TextAreaField name="context" label={F.context} defaultValue={p?.context ?? ""} />
      <TextAreaField name="problemStatement" label={F.problem} defaultValue={p?.problemStatement ?? ""} />
      <TextAreaField name="generalObjective" label={F.generalObjective} rows={2} defaultValue={p?.generalObjective ?? ""} />
      <h3 className="pt-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{S.period}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="startDate" label={P.start} type="date" defaultValue={toDateInput(p?.startDate)} />
        <TextField name="endDate" label={P.end} type="date" defaultValue={toDateInput(p?.endDate)} />
        <TextField name="plannedBudget" label={P.budget} inputMode="decimal" defaultValue={p?.plannedBudget?.toString() ?? ""} />
        <TextField name="currency" label={P.currency} maxLength={3} defaultValue={p?.currency ?? currency} />
      </div>
      <p className="text-xs text-slate-500">{m.program.note}</p>
    </>
  );
}
