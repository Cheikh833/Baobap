import Link from "next/link";
import { redirect } from "next/navigation";
import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { getProject } from "@/server/services/projects";
import { hierarchyOptions, strategyOptions } from "@/server/services/options";
import { Card, DefinitionList, PageHeader } from "@/components/ui/display";
import { ActionForm } from "@/components/forms/action-form";
import { ProjectStepFields } from "@/components/project-step-fields";
import { WizardStepper } from "@/components/wizard-stepper";
import { ButtonLink } from "@/components/ui/button";
import { PROJECT_LAST_EDIT_STEP, type ProjectStep } from "@/lib/validation/schemas";
import { durationDays, formatDate, formatMoney } from "@/lib/metrics";
import { completeness } from "@/lib/project-health";
import { getMessages } from "@/i18n/server";
import { fill } from "@/i18n/translate";
import { Forbidden } from "../../../../forbidden";
import { orNotFound } from "../../../../guard";
import { statusAction, wizardStepAction } from "../../../actions";

export const metadata = { title: "Assistant projet" };

export default async function WizardPage({ params }: { params: Promise<{ id: string; step: string }> }) {
  const ctx = await requireTenant();
  if (!can(ctx, "project:edit")) return <Forbidden />;
  const { id, step: rawStep } = await params;
  const [p, base, strategy, { m, locale }] = await Promise.all([orNotFound(getProject(ctx, id)), hierarchyOptions(ctx), strategyOptions(ctx, id), getMessages()]);
  const o = { ...base, strategy };
  const step = Math.min(Math.max(Number(rawStep) || p.wizardStep, 1), PROJECT_LAST_EDIT_STEP + 1);
  // On ne peut pas sauter une étape non encore atteinte.
  if (step > p.wizardStep || String(step) !== rawStep) redirect(`/projects/new/${id}/${Math.min(step, p.wizardStep)}`);
  const W = m.wizard;
  const F = W.fields;
  const title = fill(W.step, { n: step, label: W.steps[step - 1] });
  const header = <PageHeader title={p.name} description={W.intro} breadcrumb={<><Link href="/projects" className="hover:underline">{m.project.title}</Link> › {p.code} ({m.project.draft})</>} />;

  if (step === PROJECT_LAST_EDIT_STEP + 1) {
    const c = completeness(p);
    return (
      <>
        {header}
        <WizardStepper current={step} reached={p.wizardStep} projectId={p.id} m={m} />
        <Card className="max-w-4xl">
          <h2 className="mb-1 font-semibold">{title}</h2>
          <p className="mb-4 text-sm text-slate-600">
            <strong>{fill(W.completeness, { pct: c.pct })}</strong>
            {c.missing.length > 0 && <> — {fill(W.toComplete, { list: c.missing.map((k) => (F as Record<string, string>)[k]).join(", ") })}</>}
          </p>
          <DefinitionList items={[
            [F.code, p.code], [F.program, p.program?.name], [F.portfolio, p.portfolio?.name], [F.manager, p.managerId ? o.memberNames.get(p.managerId) : null],
            [F.priority, m.priority[p.priority]], [F.sdgShort, p.sdgs.map((n) => `${F.sdgShort} ${n}`).join(", ")], [F.sectors, p.sectors.join(", ")], [F.typeShort, p.type],
            [F.description, p.shortDescription], [F.context, p.context], [F.problemShort, p.problemStatement], [F.justification, p.justification],
            [F.generalObjective, p.generalObjective], [F.specificObjectives, p.specificObjectives.map((s) => `• ${s}`).join("\n")],
            [F.territory, [p.country, p.region, ...p.zones].filter(Boolean).join(" · ")],
            [F.beneficiaries, p.directBeneficiaries !== null ? fill(W.beneficiariesValue, { d: p.directBeneficiaries, i: p.indirectBeneficiaries ?? "?" }) : null],
            [F.period, p.startDate ? fill(W.periodValue, { start: formatDate(p.startDate, locale), end: formatDate(p.endDate, locale), days: durationDays(p.startDate, p.endDate) ?? "?" }) : null],
            [F.budget, p.plannedBudget ? formatMoney(Number(p.plannedBudget), p.currency, locale) : null],
          ]} />
          <div className="mt-6 flex flex-wrap items-start gap-3 border-t border-line pt-4">
            <ButtonLink href={`/projects/${p.id}`}>{W.finish}</ButtonLink>
            {p.status === "DRAFT" && <ActionForm action={statusAction.bind(null, p.id, "PREPARATION")} submitLabel={W.toPreparation} submitVariant="secondary" className="space-y-2" />}
          </div>
        </Card>
      </>
    );
  }

  const s = step as ProjectStep;
  return (
    <>
      {header}
      <WizardStepper current={step} reached={p.wizardStep} projectId={p.id} m={m} />
      <Card className="max-w-3xl">
        <h2 className="mb-4 font-semibold">{title}</h2>
        <ActionForm
          action={wizardStepAction.bind(null, p.id, s)}
          submitLabel={W.continue}
          footer={
            <>
              {step > 1 && <button type="submit" name="intent" value="back" className="h-10 rounded-lg border border-line bg-white px-4 text-sm font-medium hover:bg-canvas">{W.back}</button>}
              <button type="submit" name="intent" value="exit" className="h-10 rounded-lg px-4 text-sm font-medium text-slate-600 hover:bg-canvas">{W.exit}</button>
            </>
          }
        >
          <ProjectStepFields step={s} p={p} o={o} m={m} />
        </ActionForm>
      </Card>
    </>
  );
}
