"use client";
import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/form";
import { FormPendingContext, SubmitButton } from "@/components/ui/submit";
import { useActionForm } from "./use-action-form";
import { cn } from "@/components/ui/cn";

type State = { ok: boolean; message?: string; errors?: Record<string, string>; data?: Record<string, string> } | null;
type Action = (prev: State, fd: FormData) => Promise<State>;

const Ctx = createContext<State>(null);

/** Formulaire relié à une Server Action : états chargement / succès / erreur, erreurs par champ. */
export function ActionForm({
  action, children, submitLabel = "Enregistrer", className, resetOnSuccess = false, submitVariant, footer, confirm,
}: {
  action: Action; children?: ReactNode; submitLabel?: string; className?: string; resetOnSuccess?: boolean;
  submitVariant?: "primary" | "secondary" | "danger"; footer?: ReactNode; confirm?: string;
}) {
  const { state, pending, onSubmit } = useActionForm(action, { confirm });
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && !state.data?.redirect && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <Ctx.Provider value={state}>
      <FormPendingContext.Provider value={pending}>
      <form ref={ref} onSubmit={onSubmit} noValidate className={cn("space-y-4", className)}>
        <FormMessage state={state} />
        {children}
        <div className="flex flex-wrap items-center gap-2">
          <SubmitButton variant={submitVariant}>{submitLabel}</SubmitButton>
          {footer}
        </div>
        {state?.ok && state.data?.inviteUrl && <InviteLink url={state.data.inviteUrl} />}
      </form>
      </FormPendingContext.Provider>
    </Ctx.Provider>
  );
}

function InviteLink({ url }: { url: string }) {
  const full = typeof window !== "undefined" ? new URL(url, window.location.origin).toString() : url;
  return (
    <div className="rounded-lg border border-info/30 bg-blue-50 p-3 text-sm text-blue-900">
      <p className="font-medium">Lien d&apos;invitation (affiché une seule fois)</p>
      <p className="mt-1 text-xs">L&apos;envoi d&apos;emails n&apos;est pas encore configuré : transmettez ce lien à la personne invitée. Il expire dans 7 jours.</p>
      <input readOnly value={full} onFocus={(e) => e.currentTarget.select()} className="mt-2 w-full rounded border border-line bg-white px-2 py-1 font-mono text-xs" aria-label="Lien d'invitation" />
    </div>
  );
}

const useErr = (name: string) => useContext(Ctx)?.errors?.[name];

type Base = { name: string; label: string; hint?: string; required?: boolean; className?: string };

export function TextField({ name, label, hint, required, className, ...p }: Base & React.ComponentProps<typeof Input>) {
  const error = useErr(name);
  return <div className={className}><Field label={label} name={name} error={error} hint={hint} required={required}><Input name={name} error={error} {...p} /></Field></div>;
}
export function TextAreaField({ name, label, hint, required, className, ...p }: Base & React.ComponentProps<typeof Textarea>) {
  const error = useErr(name);
  return <div className={className}><Field label={label} name={name} error={error} hint={hint} required={required}><Textarea name={name} error={error} {...p} /></Field></div>;
}
export function SelectField({ name, label, hint, required, className, options, placeholder, ...p }: Base & { options: readonly (readonly [string, string])[]; placeholder?: string } & React.ComponentProps<typeof Select>) {
  const error = useErr(name);
  return (
    <div className={className}>
      <Field label={label} name={name} error={error} hint={hint} required={required}>
        <Select name={name} error={error} {...p}>
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
      </Field>
    </div>
  );
}
export function CheckboxGroup({ name, label, options, defaultValues = [], columns = 2 }: { name: string; label: string; options: readonly (readonly [string, string])[]; defaultValues?: string[]; columns?: number }) {
  const error = useErr(name);
  return (
    <fieldset>
      <legend className="text-sm font-medium text-navy">{label}</legend>
      <div className={cn("mt-2 grid gap-2", columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
        {options.map(([v, l]) => (
          <label key={v} className="flex items-start gap-2 text-sm">
            <input type="checkbox" name={name} value={v} defaultChecked={defaultValues.includes(v)} className="mt-0.5 h-4 w-4 rounded border-line text-brand focus:ring-brand" />
            <span>{l}</span>
          </label>
        ))}
      </div>
      {error && <p className="mt-1 text-xs text-danger" role="alert">{error}</p>}
    </fieldset>
  );
}
