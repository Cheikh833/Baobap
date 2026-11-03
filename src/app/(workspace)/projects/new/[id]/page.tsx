import { redirect } from "next/navigation";
import { requireTenant } from "@/server/context";
import { getProject } from "@/server/services/projects";
import { orNotFound } from "../../../guard";

/** Reprise d'un brouillon : renvoie vers la dernière étape atteinte. */
export default async function ResumeWizard({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireTenant();
  const { id } = await params;
  const p = await orNotFound(getProject(ctx, id));
  redirect(`/projects/new/${p.id}/${p.wizardStep}`);
}
