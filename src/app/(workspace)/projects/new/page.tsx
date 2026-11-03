import Link from "next/link";
import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { hierarchyOptions } from "@/server/services/options";
import { Card, PageHeader } from "@/components/ui/display";
import { ActionForm } from "@/components/forms/action-form";
import { ProjectStepFields } from "@/components/project-step-fields";
import { WizardStepper } from "@/components/wizard-stepper";
import { Forbidden } from "../../forbidden";
import { createDraftAction } from "../actions";

export const metadata = { title: "Nouveau projet" };

export default async function NewProjectPage({ searchParams }: { searchParams: Promise<{ programId?: string }> }) {
  const ctx = await requireTenant();
  if (!can(ctx, "project:create")) return <Forbidden />;
  const o = await hierarchyOptions(ctx);
  const { programId } = await searchParams;
  return (
    <>
      <PageHeader title="Nouveau projet" description="Le projet est créé en brouillon dès cette première étape ; vous pourrez le compléter progressivement et reprendre plus tard." breadcrumb={<Link href="/projects" className="hover:underline">Projets</Link>} />
      <WizardStepper current={1} reached={1} />
      <Card className="max-w-3xl">
        <h2 className="mb-4 font-semibold">Étape 1 — Identité</h2>
        <ActionForm action={createDraftAction} submitLabel="Créer le brouillon et continuer">
          <ProjectStepFields step={1} o={{ ...o, defaults: { programId } }} />
        </ActionForm>
      </Card>
    </>
  );
}
