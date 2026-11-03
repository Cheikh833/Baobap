"use client";
import { FormMessage } from "@/components/ui/form";
import { FormPendingContext, SubmitButton } from "@/components/ui/submit";
import { useActionForm } from "@/components/forms/use-action-form";
import { useI18n } from "@/i18n/client";
import { acceptInvitationAction } from "./actions";

export function AcceptInvitationForm({ token }: { token: string }) {
  const { state, pending, onSubmit } = useActionForm(acceptInvitationAction);
  const { m } = useI18n();
  return (
    <FormPendingContext.Provider value={pending}>
      <form onSubmit={onSubmit} className="space-y-3">
        <input type="hidden" name="token" value={token} />
        <FormMessage state={state} />
        <SubmitButton pendingLabel={m.invitation.accepting}>{m.invitation.accept}</SubmitButton>
      </form>
    </FormPendingContext.Provider>
  );
}
