"use client";
import { AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/ui/display";
import { Button } from "@/components/ui/button";

export default function WorkspaceError({ reset }: { error: Error; reset: () => void }) {
  return <EmptyState icon={AlertTriangle} title="Une erreur est survenue" description="La page n'a pas pu être chargée. Réessayez dans un instant." action={<Button onClick={reset}>Réessayer</Button>} />;
}
