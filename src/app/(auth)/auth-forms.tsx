"use client";
import Link from "next/link";
import { Field, FormMessage, Input } from "@/components/ui/form";
import { FormPendingContext, SubmitButton } from "@/components/ui/submit";
import { useActionForm } from "@/components/forms/use-action-form";
import { loginAction, signupAction } from "./actions";
import { useI18n } from "@/i18n/client";

export function LoginForm({ next }: { next?: string }) {
  const { m } = useI18n();
  const A = m.auth;
  const { state, pending, onSubmit } = useActionForm(loginAction);
  return (
    <FormPendingContext.Provider value={pending}>
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <FormMessage state={state} />
      <Field label={A.email} name="email" error={state?.errors?.email} required>
        <Input name="email" type="email" autoComplete="email" required error={state?.errors?.email} />
      </Field>
      <Field label={A.password} name="password" error={state?.errors?.password} required>
        <Input name="password" type="password" autoComplete="current-password" required error={state?.errors?.password} />
      </Field>
      <p className="-mt-2 text-right text-xs"><Link className="text-brand hover:underline" href="/forgot-password">{A.forgotLink}</Link></p>
      <SubmitButton className="w-full" pendingLabel={A.loginPending}>{A.loginSubmit}</SubmitButton>
      <p className="text-center text-sm text-slate-600">
        {A.noAccount} <Link className="font-medium text-brand hover:underline" href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}>{A.createAccount}</Link>
      </p>
    </form>
    </FormPendingContext.Provider>
  );
}

export function SignupForm({ next }: { next?: string }) {
  const { m } = useI18n();
  const A = m.auth;
  const { state, pending, onSubmit } = useActionForm(signupAction);
  return (
    <FormPendingContext.Provider value={pending}>
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <FormMessage state={state} />
      <Field label={A.fullName} name="name" error={state?.errors?.name} required>
        <Input name="name" autoComplete="name" required error={state?.errors?.name} />
      </Field>
      <Field label={A.workEmail} name="email" error={state?.errors?.email} required>
        <Input name="email" type="email" autoComplete="email" required error={state?.errors?.email} />
      </Field>
      <Field label={A.password} name="password" error={state?.errors?.password} hint={A.passwordHint} required>
        <Input name="password" type="password" autoComplete="new-password" required error={state?.errors?.password} />
      </Field>
      <div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="terms" required className="mt-0.5 h-4 w-4 rounded border-line text-brand" aria-invalid={state?.errors?.terms ? true : undefined} />
          <span>{A.acceptTerms} (<Link href="/legal/terms" target="_blank" className="text-brand hover:underline">{m.legal.terms}</Link>, <Link href="/legal/privacy" target="_blank" className="text-brand hover:underline">{m.legal.privacy}</Link>)</span>
        </label>
        {state?.errors?.terms && <p className="mt-1 text-xs text-danger" role="alert">{state.errors.terms}</p>}
      </div>
      <SubmitButton className="w-full" pendingLabel={A.signupPending}>{A.signupSubmit}</SubmitButton>
      <p className="text-center text-sm text-slate-600">
        {A.haveAccount} <Link className="font-medium text-brand hover:underline" href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}>{A.goLogin}</Link>
      </p>
    </form>
    </FormPendingContext.Provider>
  );
}
