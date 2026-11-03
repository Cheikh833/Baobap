import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/ui/display";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20">
      <EmptyState icon={SearchX} title="Page introuvable" description="Cette page n'existe pas ou vous n'y avez pas accès." action={<ButtonLink href="/dashboard">Retour au tableau de bord</ButtonLink>} />
    </div>
  );
}
