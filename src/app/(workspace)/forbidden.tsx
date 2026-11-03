import { ShieldAlert } from "lucide-react";
import { EmptyState } from "@/components/ui/display";

export function Forbidden() {
  return <EmptyState icon={ShieldAlert} title="Accès non autorisé" description="Votre rôle ne vous permet pas de consulter cette page. Contactez un administrateur de l'organisation si vous pensez qu'il s'agit d'une erreur." />;
}
