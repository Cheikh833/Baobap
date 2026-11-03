import type { Project } from "@prisma/client";
import { CheckboxGroup, SelectField, TextAreaField, TextField } from "@/components/forms/action-form";
import { joinList, toDateInput } from "@/lib/dates";
import type { ProjectStep } from "@/lib/validation/schemas";
import type { Messages } from "@/i18n/messages/fr";

type Opt = readonly (readonly [string, string])[];
export type StrategyOptions = {
  plans: { id: string; title: string; axes: { id: string; code: string; title: string; objectives: { id: string; code: string; title: string }[] }[] }[];
  current: Record<string, number>; // objectiveId → part (%)
};
export type StepOptions = { members: Opt; portfolios: Opt; programs: Opt; currency: string; defaults?: { programId?: string }; strategy?: StrategyOptions };

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
          <ObjectivesPicker s={o.strategy} m={m} />
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

function ObjectivesPicker({ s, m }: { s?: StrategyOptions; m: Messages }) {
  const S = m.strategy;
  const objectives = (s?.plans ?? []).flatMap((p) => p.axes.flatMap((a) => a.objectives));
  return (
    <fieldset className="rounded-lg border border-line p-4">
      <legend className="px-1 text-sm font-medium text-navy">{S.projectFieldTitle}</legend>
      {objectives.length === 0 ? (
        <p className="text-sm text-slate-500">{S.noObjectivesYet}</p>
      ) : (
        <>
          <p className="mb-3 text-xs text-slate-500">{S.projectFieldHint}</p>
          {s!.plans.map((plan) => (
            <div key={plan.id} className="mb-3">
              {s!.plans.length > 1 && <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{plan.title}</p>}
              {plan.axes.filter((a) => a.objectives.length).map((axis) => (
                <div key={axis.id} className="mb-2">
                  <p className="text-xs font-medium text-brand-deep">{axis.code} · {axis.title}</p>
                  <ul className="mt-1 space-y-1.5">
                    {axis.objectives.map((obj) => {
                      const w = s!.current[obj.id];
                      return (
                        <li key={obj.id} className="flex flex-wrap items-center gap-2 text-sm">
                          <label className="flex min-w-0 flex-1 items-start gap-2">
                            <input type="checkbox" name={`obj_${obj.id}`} defaultChecked={w !== undefined} className="mt-0.5 h-4 w-4 rounded border-line text-brand" />
                            <span><span className="font-mono text-xs text-slate-500">{obj.code}</span> {obj.title}</span>
                          </label>
                          <label className="flex items-center gap-1 text-xs text-slate-600">
                            {S.share}
                            <input type="number" name={`weight_${obj.id}`} min={1} max={100} defaultValue={w ?? 100} className="h-8 w-16 rounded-md border border-line px-2 text-sm" aria-label={`${S.share} ${obj.code}`} />
                            %
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </>
      )}
    </fieldset>
  );
}
