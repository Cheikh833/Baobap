import type { Project } from "@prisma/client";
import { CheckboxGroup, SelectField, TextAreaField, TextField } from "@/components/forms/action-form";
import { joinList, toDateInput } from "@/lib/dates";
import type { ProjectStep } from "@/lib/validation/schemas";
import type { Messages } from "@/i18n/messages/fr";

type Opt = readonly (readonly [string, string])[];
export type StepOptions = { members: Opt; portfolios: Opt; programs: Opt; currency: string; defaults?: { programId?: string } };

/** Champs de chaque étape, partagés entre l'assistant de création et l'édition de la fiche projet. */
export function ProjectStepFields({ step, p, o, m }: { step: ProjectStep; p?: Project | null; o: StepOptions; m: Messages }) {
  const F = m.wizard.fields;
  switch (step) {
    case 1:
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="name" label={F.name} defaultValue={p?.name} required className="sm:col-span-2" />
          <TextField name="code" label={F.code} defaultValue={p?.code} required />
          <TextField name="type" label={F.type} defaultValue={p?.type ?? ""} placeholder={F.typePlaceholder} />
          <SelectField name="programId" label={F.program} options={o.programs} placeholder={m.ui.none} defaultValue={p?.programId ?? o.defaults?.programId ?? ""} hint={F.programHint} />
          <SelectField name="portfolioId" label={F.portfolio} options={o.portfolios} placeholder={F.portfolioInherit} defaultValue={p?.portfolioId ?? ""} />
          <SelectField name="managerId" label={F.manager} options={o.members} placeholder={m.ui.notAssigned} defaultValue={p?.managerId ?? ""} />
          <TextField name="sectors" label={F.sectors} hint={m.ui.listHint} defaultValue={joinList(p?.sectors)} />
          <TextAreaField name="shortDescription" label={F.shortDescription} rows={3} defaultValue={p?.shortDescription ?? ""} className="sm:col-span-2" />
        </div>
      );
    case 2:
      return (
        <>
          <SelectField name="priority" label={F.priority} options={Object.entries(m.priority)} defaultValue={p?.priority ?? "MEDIUM"} />
          <CheckboxGroup name="sdgs" label={F.sdgs} options={m.sdg.map((l, i) => [String(i + 1), `${F.sdgShort} ${i + 1} — ${l}`] as const)} defaultValues={(p?.sdgs ?? []).map(String)} />
          <p className="text-xs text-slate-500">{F.strategyNote}</p>
        </>
      );
    case 3:
      return (
        <>
          <TextAreaField name="context" label={F.context} defaultValue={p?.context ?? ""} />
          <TextAreaField name="problemStatement" label={F.problem} defaultValue={p?.problemStatement ?? ""} />
          <TextAreaField name="justification" label={F.justification} defaultValue={p?.justification ?? ""} />
        </>
      );
    case 4:
      return (
        <>
          <TextAreaField name="generalObjective" label={F.generalObjective} rows={3} defaultValue={p?.generalObjective ?? ""} />
          <TextAreaField name="specificObjectives" label={F.specificObjectives} hint={F.specificHint} rows={5} defaultValue={(p?.specificObjectives ?? []).join("\n")} />
          <p className="text-xs text-slate-500">{F.objectivesNote}</p>
        </>
      );
    case 5:
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="directBeneficiaries" label={F.direct} type="number" min={0} defaultValue={p?.directBeneficiaries ?? ""} />
          <TextField name="indirectBeneficiaries" label={F.indirect} type="number" min={0} defaultValue={p?.indirectBeneficiaries ?? ""} />
          <TextField name="country" label={F.country} defaultValue={p?.country ?? ""} />
          <TextField name="region" label={F.region} defaultValue={p?.region ?? ""} />
          <TextField name="zones" label={F.zones} hint={m.ui.listHint} defaultValue={joinList(p?.zones)} className="sm:col-span-2" />
        </div>
      );
    case 6:
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="startDate" label={F.start} type="date" defaultValue={toDateInput(p?.startDate)} />
          <TextField name="endDate" label={F.end} type="date" defaultValue={toDateInput(p?.endDate)} />
          <p className="text-xs text-slate-500 sm:col-span-2">{F.planningNote}</p>
        </div>
      );
    case 7:
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="plannedBudget" label={F.budget} inputMode="decimal" defaultValue={p?.plannedBudget?.toString() ?? ""} />
          <TextField name="currency" label={F.currency} maxLength={3} defaultValue={p?.currency ?? o.currency} />
          <p className="text-xs text-slate-500 sm:col-span-2">{F.financeNote}</p>
        </div>
      );
  }
}
