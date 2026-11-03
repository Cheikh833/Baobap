"use client";
import { Field, FormMessage, Input, Select } from "@/components/ui/form";
import { FormPendingContext, SubmitButton } from "@/components/ui/submit";
import { useActionForm } from "@/components/forms/use-action-form";
import { ORGANIZATION_TYPES } from "@/lib/validation/schemas";
import { createOrganizationAction } from "./actions";

export function OrganizationForm() {
  const { state, pending, onSubmit } = useActionForm(createOrganizationAction);
  const e = state?.errors ?? {};
  return (
    <FormPendingContext.Provider value={pending}>
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <Field label="Nom officiel" name="name" error={e.name} required><Input name="name" required error={e.name} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom court / sigle" name="shortName" error={e.shortName}><Input name="shortName" error={e.shortName} /></Field>
        <Field label="Code organisation" name="code" error={e.code} hint="Identifiant unique, ex. ASDEV" required><Input name="code" required error={e.code} /></Field>
      </div>
      <Field label="Type d'organisation" name="type" error={e.type} required>
        <Select name="type" defaultValue="NGO_NATIONAL" error={e.type}>
          {ORGANIZATION_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </Select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Pays" name="country" error={e.country} required><Input name="country" defaultValue="Sénégal" required error={e.country} /></Field>
        <Field label="Devise par défaut" name="defaultCurrency" error={e.defaultCurrency} hint="Code ISO : XOF, EUR, USD…"><Input name="defaultCurrency" defaultValue="XOF" maxLength={3} error={e.defaultCurrency} /></Field>
      </div>
      <Field label="Secteurs d'intervention" name="sectors" error={e.sectors} hint="Séparés par des virgules : santé, éducation…"><Input name="sectors" error={e.sectors} /></Field>
      <Field label="Taille" name="size" error={e.size}>
        <Select name="size" defaultValue="">
          <option value="">Non précisé</option>
          <option>1–10 personnes</option><option>11–50 personnes</option><option>51–250 personnes</option><option>Plus de 250 personnes</option>
        </Select>
      </Field>
      <SubmitButton className="w-full" pendingLabel="Création de l'organisation…">Créer l&apos;organisation</SubmitButton>
    </form>
    </FormPendingContext.Provider>
  );
}
