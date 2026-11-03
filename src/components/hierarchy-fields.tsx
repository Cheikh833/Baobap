import type { Portfolio, Program } from "@prisma/client";
import { SelectField, TextAreaField, TextField } from "@/components/forms/action-form";
import { STATUS_OPTIONS } from "@/lib/labels";
import { joinList, toDateInput } from "@/lib/dates";

type Opt = readonly (readonly [string, string])[];

export function PortfolioFields({ p, members, currency }: { p?: Portfolio; members: Opt; currency: string }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="name" label="Nom" defaultValue={p?.name} required />
        <TextField name="code" label="Code" defaultValue={p?.code} required hint="Unique dans l'organisation" />
        <SelectField name="managerId" label="Responsable" options={members} placeholder="— Non désigné" defaultValue={p?.managerId ?? ""} />
        <SelectField name="status" label="Statut" options={STATUS_OPTIONS} defaultValue={p?.status ?? "DRAFT"} />
        <TextField name="startDate" label="Début" type="date" defaultValue={toDateInput(p?.startDate)} />
        <TextField name="endDate" label="Fin" type="date" defaultValue={toDateInput(p?.endDate)} />
        <TextField name="plannedBudget" label="Budget prévisionnel" inputMode="decimal" defaultValue={p?.plannedBudget?.toString() ?? ""} hint="Montant indicatif ; le suivi financier détaillé viendra avec le module Finances." />
        <TextField name="currency" label="Devise" maxLength={3} defaultValue={p?.currency ?? currency} />
      </div>
      <TextAreaField name="objective" label="Finalité stratégique" rows={2} defaultValue={p?.objective ?? ""} />
      <TextAreaField name="description" label="Description" defaultValue={p?.description ?? ""} />
    </>
  );
}

export function ProgramFields({ p, members, portfolios, currency }: { p?: Program; members: Opt; portfolios: Opt; currency: string }) {
  return (
    <>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Identité</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="name" label="Nom du programme" defaultValue={p?.name} required />
        <TextField name="code" label="Code" defaultValue={p?.code} required />
        <SelectField name="portfolioId" label="Portefeuille" options={portfolios} placeholder="— Aucun" defaultValue={p?.portfolioId ?? ""} />
        <SelectField name="status" label="Statut" options={STATUS_OPTIONS} defaultValue={p?.status ?? "DRAFT"} />
        <SelectField name="managerId" label="Responsable" options={members} placeholder="— Non désigné" defaultValue={p?.managerId ?? ""} />
        <SelectField name="coordinatorId" label="Coordinateur" options={members} placeholder="— Non désigné" defaultValue={p?.coordinatorId ?? ""} />
        <TextField name="sectors" label="Secteurs" hint="Séparés par des virgules" defaultValue={joinList(p?.sectors)} />
        <TextField name="zones" label="Zones d'intervention" hint="Séparées par des virgules" defaultValue={joinList(p?.zones)} />
      </div>
      <h3 className="pt-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Contexte et objectifs</h3>
      <TextAreaField name="context" label="Contexte" defaultValue={p?.context ?? ""} />
      <TextAreaField name="problemStatement" label="Problématique" defaultValue={p?.problemStatement ?? ""} />
      <TextAreaField name="generalObjective" label="Objectif général" rows={2} defaultValue={p?.generalObjective ?? ""} />
      <h3 className="pt-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Période et ressources</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="startDate" label="Début" type="date" defaultValue={toDateInput(p?.startDate)} />
        <TextField name="endDate" label="Fin" type="date" defaultValue={toDateInput(p?.endDate)} />
        <TextField name="plannedBudget" label="Budget prévisionnel" inputMode="decimal" defaultValue={p?.plannedBudget?.toString() ?? ""} />
        <TextField name="currency" label="Devise" maxLength={3} defaultValue={p?.currency ?? currency} />
      </div>
      <p className="text-xs text-slate-500">Théorie du changement, cadre logique, indicateurs, bailleurs et risques seront reliés au programme avec les modules MEAL, Finances et Risques.</p>
    </>
  );
}
