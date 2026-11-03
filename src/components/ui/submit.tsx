"use client";
import { createContext, useContext } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import type { ComponentProps } from "react";
import { Button } from "./button";
import { T } from "@/i18n/T";

/** État « en cours » fourni par les formulaires qui gèrent eux-mêmes leur soumission. */
export const FormPendingContext = createContext(false);

export function SubmitButton({ children, pendingLabel, ...p }: ComponentProps<typeof Button> & { pendingLabel?: string }) {
  const status = useFormStatus();
  const pending = useContext(FormPendingContext) || status.pending;
  return (
    <Button type="submit" disabled={pending || p.disabled} aria-busy={pending} {...p}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {pending ? pendingLabel ?? <T k="ui.saving" /> : children}
    </Button>
  );
}
