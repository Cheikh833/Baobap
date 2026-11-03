"use client";
import { Field, FormMessage, Input } from "@/components/ui/form";
import { FormPendingContext, SubmitButton } from "@/components/ui/submit";
import { useActionForm } from "@/components/forms/use-action-form";
import { useI18n } from "@/i18n/client";
import { forgotPasswordAction, resetPasswordAction } from "./password-actions";

export function ForgotPasswordForm() {
  const { state, pending, onSubmit } = useActionForm(forgotPasswordAction);
  const { m } = useI18n();
  return (
    <FormPendingContext.Provider value={pending}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormMessage state={state} />
        <Field label={m.auth.email} name="email" error={state?.errors?._form} required>
          <Input name="email" type="email" autoComplete="email" required />
        </Field>
        <SubmitButton className="w-full">{m.auth.forgotSubmit}</SubmitButton>
      </form>
    </FormPendingContext.Provider>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const { state, pending, onSubmit } = useActionForm(resetPasswordAction.bind(null, token));
  const { m } = useI18n();
  return (
    <FormPendingContext.Provider value={pending}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormMessage state={state} />
        <Field label={m.auth.password} name="password" hint={m.auth.passwordHint} error={state?.errors?._form} required>
          <Input name="password" type="password" autoComplete="new-password" required />
        </Field>
        <SubmitButton className="w-full">{m.auth.resetSubmit}</SubmitButton>
      </form>
    </FormPendingContext.Provider>
  );
}
