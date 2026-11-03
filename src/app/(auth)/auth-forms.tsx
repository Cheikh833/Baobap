"use client";
import Link from "next/link";
import { Field, FormMessage, Input } from "@/components/ui/form";
import { FormPendingContext, SubmitButton } from "@/components/ui/submit";
import { useActionForm } from "@/components/forms/use-action-form";
import { loginAction, signupAction } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const { state, pending, onSubmit } = useActionForm(loginAction);
  return (
    <FormPendingContext.Provider value={pending}>
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <FormMessage state={state} />
      <Field label="Email" name="email" error={state?.errors?.email} required>
        <Input name="email" type="email" autoComplete="email" required error={state?.errors?.email} />
      </Field>
      <Field label="Mot de passe" name="password" error={state?.errors?.password} required>
        <Input name="password" type="password" autoComplete="current-password" required error={state?.errors?.password} />
      </Field>
      <SubmitButton className="w-full" pendingLabel="Connexion…">Se connecter</SubmitButton>
      <p className="text-center text-sm text-slate-600">
        Pas encore de compte ? <Link className="font-medium text-brand hover:underline" href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}>Créer un compte</Link>
      </p>
    </form>
    </FormPendingContext.Provider>
  );
}

export function SignupForm({ next }: { next?: string }) {
  const { state, pending, onSubmit } = useActionForm(signupAction);
  return (
    <FormPendingContext.Provider value={pending}>
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <FormMessage state={state} />
      <Field label="Nom complet" name="name" error={state?.errors?.name} required>
        <Input name="name" autoComplete="name" required error={state?.errors?.name} />
      </Field>
      <Field label="Email professionnel" name="email" error={state?.errors?.email} required>
        <Input name="email" type="email" autoComplete="email" required error={state?.errors?.email} />
      </Field>
      <Field label="Mot de passe" name="password" error={state?.errors?.password} hint="10 caractères minimum, avec au moins une lettre et un chiffre." required>
        <Input name="password" type="password" autoComplete="new-password" required error={state?.errors?.password} />
      </Field>
      <SubmitButton className="w-full" pendingLabel="Création…">Créer mon compte</SubmitButton>
      <p className="text-center text-sm text-slate-600">
        Déjà inscrit ? <Link className="font-medium text-brand hover:underline" href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}>Se connecter</Link>
      </p>
    </form>
    </FormPendingContext.Provider>
  );
}
