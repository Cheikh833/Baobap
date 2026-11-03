"use client";
import { AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/ui/display";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";

export default function WorkspaceError({ reset }: { error: Error; reset: () => void }) {
  const { m } = useI18n();
  return <EmptyState icon={AlertTriangle} title={m.states.errorTitle} description={m.states.errorText} action={<Button onClick={reset}>{m.states.retry}</Button>} />;
}
