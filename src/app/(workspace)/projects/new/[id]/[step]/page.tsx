import Link from "next/link";
import { redirect } from "next/navigation";
import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { getProject } from "@/server/services/projects";
import { hierarchyOptions } from "@/server/services/options";
import { Card, DefinitionList, PageHeader } from "@/components/ui/display";
import { ActionForm } from "@/components/forms/action-form";
import { ProjectStepFields } from "@/components/project-step-fields";
import { WizardStepper } from "@/components/wizard-stepper";
import { ButtonLink } from "@/components/ui/button";
import { PROJECT_LAST_EDIT_STEP, PROJECT_STEPS, type ProjectStep } from "@/lib/validation/schemas";
import { PRIORITY_LABELS } from "@/lib/labels";
import { durationDays, formatDate, formatMoney } from "@/lib/metrics";
import { completeness } from "@/lib/project-health";
import { Forbidden } from "../../../../forbidden";
import { orNotFound } from "../../../../guard";
import { statusAction, wizardStepAction } from "../../../actions";

export const metadata = { title: "Assistant projet" };

export default async function WizardPage({ params }: { params: Promise<{ id: string; step: string }> }) {
  const ctx = await requireTenant();
  if (!can(ctx, "project:edit")) return <Forbidden />;
  const { id, step: rawStep } = await params;
  const [p, o] = await Promise.all([orNotFound(getProject(ctx, id)), hierarchyOptions(ctx)]);
  const step = Math.min(Math.max(Number(rawStep) || p.wizardStep, 1), PROJECT_LAST_EDIT_STEP + 1);
  // On ne peut pas sauter une étape non encore atteinte.
  if (step > p.wizardStep || String(step) !== rawStep) redirect(`/projects/new/${id}/${Math.min(step, p.wizardStep)}`);
  const label = PROJECT_STEPS.find((s) => s.n === step)!.label;
  const header = <PageHeader title={p.name} description="Assistant de création — les champs facultatifs ne bloquent jamais la progression." breadcrumb={<><Link href="/projects" className="hover:underline">Projets</Link> › {p.code} (brouillon)</>} />;

  if (step === PROJECT_LAST_EDIT_STEP + 1) {
    const c = completeness(p);
    return (
      <>
        {header}
        <WizardStepper current={step} reached={p.wizardStep} projectId={p.id} />
        <Card className="max-w-4xl">
          <h2 className="mb-1 font-semibold">Étape 8 — Vérification</h2>
          <p className="mb-4 text-sm text-slate-600">Complétude des champs clés : <strong>{c.pct} %</strong>{c.missing.length > 0 && <> — à compléter : {c.missing.join(", ")}</>}.</p>
          <DefinitionList items={[
            ["Code", p.code], ["Programme", p.program?.name], ["Portefeuille", p.portfolio?.name], ["Chef de projet", p.managerId ? o.memberNames.get(p.managerId) : null],
            ["Priorité", PRIORITY_LABELS[p.priority]], ["ODD", p.sdgs.map((n) => `ODD ${n}`).join(", ")], ["Secteurs", p.sectors.join(", ")], ["Type", p.type],
            ["Description", p.shortDescription], ["Contexte", p.context], ["Problématique", p.problemStatement], ["Justification", p.justification],
            ["Objectif général", p.generalObjective], ["Objectifs spécifiques", p.specificObjectives.map((s) => `• ${s}`).join("\n")],
            ["Territoire", [p.country, p.region, ...p.zones].filter(Boolean).join(" · ")], ["Bénéficiaires", p.directBeneficiaries !== null ? `${p.directBeneficiaries} directs · ${p.indirectBeneficiaries ?? "?"} indirects` : null],
            ["Période", p.startDate ? `${formatDate(p.startDate)} → ${formatDate(p.endDate)} (${durationDays(p.startDate, p.endDate) ?? "?"} jours)` : null],
            ["Budget prévisionnel", p.plannedBudget ? formatMoney(Number(p.plannedBudget), p.currency) : null],
          ]} />
          <div className="mt-6 flex flex-wrap items-start gap-3 border-t border-line pt-4">
            <ButtonLink href={`/projects/${p.id}`}>Terminer (rester en brouillon)</ButtonLink>
            {p.status === "DRAFT" && (
              <ActionForm action={statusAction.bind(null, p.id, "PREPARATION")} submitLabel="Passer en préparation" submitVariant="secondary" className="space-y-2" />
            )}
          </div>
        </Card>
      </>
    );
  }

  const s = step as ProjectStep;
  return (
    <>
      {header}
      <WizardStepper current={step} reached={p.wizardStep} projectId={p.id} />
      <Card className="max-w-3xl">
        <h2 className="mb-4 font-semibold">Étape {step} — {label}</h2>
        <ActionForm
          action={wizardStepAction.bind(null, p.id, s)}
          submitLabel="Enregistrer et continuer"
          footer={
            <>
              {step > 1 && <button type="submit" name="intent" value="back" className="h-10 rounded-lg border border-line bg-white px-4 text-sm font-medium hover:bg-canvas">Précédent</button>}
              <button type="submit" name="intent" value="exit" className="h-10 rounded-lg px-4 text-sm font-medium text-slate-600 hover:bg-canvas">Enregistrer et quitter</button>
            </>
          }
        >
          <ProjectStepFields step={s} p={p} o={o} />
        </ActionForm>
      </Card>
    </>
  );
}
