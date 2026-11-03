import type { Project } from "@prisma/client";
import { CheckboxGroup, SelectField, TextAreaField, TextField } from "@/components/forms/action-form";
import { PRIORITY_LABELS, SDG_LABELS } from "@/lib/labels";
import { joinList, toDateInput } from "@/lib/dates";
import type { ProjectStep } from "@/lib/validation/schemas";

type Opt = readonly (readonly [string, string])[];
export type StepOptions = { members: Opt; portfolios: Opt; programs: Opt; currency: string; defaults?: { programId?: string } };

/** Champs de chaque étape, partagés entre l'assistant de création et l'édition de la fiche projet. */
export function ProjectStepFields({ step, p, o }: { step: ProjectStep; p?: Project | null; o: StepOptions }) {
  switch (step) {
    case 1:
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="name" label="Nom du projet" defaultValue={p?.name} required className="sm:col-span-2" />
          <TextField name="code" label="Code unique" defaultValue={p?.code} required />
          <TextField name="type" label="Type de projet" defaultValue={p?.type ?? ""} placeholder="Développement, humanitaire, recherche…" />
          <SelectField name="programId" label="Programme de rattachement" options={o.programs} placeholder="— Aucun" defaultValue={p?.programId ?? o.defaults?.programId ?? ""} hint="Le projet hérite alors du portefeuille du programme." />
          <SelectField name="portfolioId" label="Portefeuille" options={o.portfolios} placeholder="— Aucun / hérité du programme" defaultValue={p?.portfolioId ?? ""} />
          <SelectField name="managerId" label="Chef de projet" options={o.members} placeholder="— Non désigné" defaultValue={p?.managerId ?? ""} />
          <TextField name="sectors" label="Secteurs" hint="Séparés par des virgules" defaultValue={joinList(p?.sectors)} />
          <TextAreaField name="shortDescription" label="Description courte" rows={3} defaultValue={p?.shortDescription ?? ""} className="sm:col-span-2" />
        </div>
      );
    case 2:
      return (
        <>
          <SelectField name="priority" label="Priorité" options={Object.entries(PRIORITY_LABELS)} defaultValue={p?.priority ?? "MEDIUM"} />
          <CheckboxGroup name="sdgs" label="Objectifs de développement durable (ODD) concernés" options={SDG_LABELS.map((l, i) => [String(i + 1), `ODD ${i + 1} — ${l}`] as const)} defaultValues={(p?.sdgs ?? []).map(String)} />
          <p className="text-xs text-slate-500">Le rattachement aux objectifs et axes stratégiques de l&apos;organisation sera disponible avec le module Stratégie (phase 2).</p>
        </>
      );
    case 3:
      return (
        <>
          <TextAreaField name="context" label="Contexte" defaultValue={p?.context ?? ""} />
          <TextAreaField name="problemStatement" label="Problématique (causes, conséquences, besoins identifiés)" defaultValue={p?.problemStatement ?? ""} />
          <TextAreaField name="justification" label="Justification" defaultValue={p?.justification ?? ""} />
        </>
      );
    case 4:
      return (
        <>
          <TextAreaField name="generalObjective" label="Objectif général" rows={3} defaultValue={p?.generalObjective ?? ""} />
          <TextAreaField name="specificObjectives" label="Objectifs spécifiques" hint="Un objectif par ligne" rows={5} defaultValue={(p?.specificObjectives ?? []).join("\n")} />
          <p className="text-xs text-slate-500">Résultats attendus (outcomes, outputs) et indicateurs : à structurer dans le cadre logique (module MEAL, phase 4).</p>
        </>
      );
    case 5:
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="directBeneficiaries" label="Bénéficiaires directs (nombre prévu)" type="number" min={0} defaultValue={p?.directBeneficiaries ?? ""} />
          <TextField name="indirectBeneficiaries" label="Bénéficiaires indirects (nombre prévu)" type="number" min={0} defaultValue={p?.indirectBeneficiaries ?? ""} />
          <TextField name="country" label="Pays" defaultValue={p?.country ?? ""} />
          <TextField name="region" label="Région" defaultValue={p?.region ?? ""} />
          <TextField name="zones" label="Départements / communes / localités" hint="Séparés par des virgules" defaultValue={joinList(p?.zones)} className="sm:col-span-2" />
        </div>
      );
    case 6:
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="startDate" label="Date de début" type="date" defaultValue={toDateInput(p?.startDate)} />
          <TextField name="endDate" label="Date de fin" type="date" defaultValue={toDateInput(p?.endDate)} />
          <p className="text-xs text-slate-500 sm:col-span-2">Phases, activités, tâches, jalons et dépendances : module Planification (phase 3).</p>
        </div>
      );
    case 7:
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="plannedBudget" label="Budget global prévisionnel" inputMode="decimal" defaultValue={p?.plannedBudget?.toString() ?? ""} />
          <TextField name="currency" label="Devise" maxLength={3} defaultValue={p?.currency ?? o.currency} />
          <p className="text-xs text-slate-500 sm:col-span-2">Lignes budgétaires, financements et bailleurs : module Finances (phase 5).</p>
        </div>
      );
  }
}
