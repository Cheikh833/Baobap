"use client";
import { Field, FormMessage, Input, Select } from "@/components/ui/form";
import { FormPendingContext, SubmitButton } from "@/components/ui/submit";
import { useActionForm } from "@/components/forms/use-action-form";
import { useI18n } from "@/i18n/client";
import { createOrganizationAction } from "./actions";

export function OrganizationForm() {
  const { state, pending, onSubmit } = useActionForm(createOrganizationAction);
  const { m } = useI18n();
  const F = m.org.fields;
  const e = state?.errors ?? {};
  return (
    <FormPendingContext.Provider value={pending}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormMessage state={state} />
        <Field label={F.name} name="name" error={e.name} required><Input name="name" required error={e.name} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={F.shortName} name="shortName" error={e.shortName}><Input name="shortName" error={e.shortName} /></Field>
          <Field label={F.code} name="code" error={e.code} hint={m.org.codeHint} required><Input name="code" required error={e.code} /></Field>
        </div>
        <Field label={F.type} name="type" error={e.type} required>
          <Select name="type" defaultValue="NGO_NATIONAL" error={e.type}>
            {Object.entries(m.orgTypes).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={F.country} name="country" error={e.country} required><Input name="country" defaultValue="Sénégal" required error={e.country} /></Field>
          <Field label={F.currency} name="defaultCurrency" error={e.defaultCurrency} hint={m.org.currencyHint}><Input name="defaultCurrency" defaultValue="XOF" maxLength={3} error={e.defaultCurrency} /></Field>
        </div>
        <Field label={F.sectors} name="sectors" error={e.sectors} hint={m.org.sectorsHint}><Input name="sectors" error={e.sectors} /></Field>
        <Field label={F.size} name="size" error={e.size}>
          <Select name="size" defaultValue="">
            <option value="">{m.org.sizeUnknown}</option>
            {m.org.sizes.map((s) => <option key={s}>{s}</option>)}
          </Select>
        </Field>
        <SubmitButton className="w-full" pendingLabel={m.org.createPending}>{m.org.createSubmit}</SubmitButton>
      </form>
    </FormPendingContext.Provider>
  );
}
