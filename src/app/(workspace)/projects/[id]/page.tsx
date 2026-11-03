import Link from "next/link";
import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { allowedTransitions, getProject } from "@/server/services/projects";
import { hierarchyOptions } from "@/server/services/options";
import { db } from "@/server/db";
import { Badge, Card, DefinitionList, PageHeader, ProgressBar, Stat } from "@/components/ui/display";
import { ActionForm } from "@/components/forms/action-form";
import { ProjectStepFields } from "@/components/project-step-fields";
import { StatusBadge } from "@/components/status-badge";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { PROJECT_LAST_EDIT_STEP, PROJECT_STEPS, type ProjectStep } from "@/lib/validation/schemas";
import { PRIORITY_LABELS, SDG_LABELS, STATUS_LABELS } from "@/lib/labels";
import { durationDays, formatDate, formatMoney, timeProgress } from "@/lib/metrics";
import { projectHealth, type HealthLevel } from "@/lib/project-health";
import { Forbidden } from "../../forbidden";
import { orNotFound } from "../../guard";
import { deleteProjectAction, editStepAction, statusAction } from "../actions";

const TABS = [
  ["overview", "Aperçu", 0], ["planning", "Planification", 3], ["activities", "Activités & tâches", 3], ["results", "Résultats", 4],
  ["meal", "Suivi-évaluation", 4], ["finance", "Finances", 5], ["risks", "Risques", 5], ["team", "Équipe & parties prenantes", 3],
  ["documents", "Documents", 6], ["reports", "Rapports", 9], ["history", "Historique", 0], ["settings", "Paramètres", 0],
] as const;

const levelUi: Record<HealthLevel, [string, string]> = {
  good: ["Bon", "bg-success"], watch: ["Vigilance", "bg-warning"], critical: ["Critique", "bg-danger"], unknown: ["Non évalué", "bg-slate-300"],
};

export default async function ProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const ctx = await requireTenant();
  if (!can(ctx, "project:view")) return <Forbidden />;
  const { id } = await params;
  const [p, o] = await Promise.all([orNotFound(getProject(ctx, id)), hierarchyOptions(ctx)]);
  const tab = (await searchParams).tab ?? "overview";
  const editable = can(ctx, "project:edit");
  const t = timeProgress(p.startDate, p.endDate);

  return (
    <>
      <PageHeader
        title={p.name}
        breadcrumb={<><Link href="/projects" className="hover:underline">Projets</Link> › {p.code}{p.program && <> · <Link className="hover:underline" href={`/programs/${p.program.id}`}>{p.program.name}</Link></>}</>}
        actions={<><StatusBadge status={p.status} />{p.status === "DRAFT" && editable && <ButtonLink size="sm" variant="secondary" href={`/projects/new/${p.id}`}>Reprendre l&apos;assistant</ButtonLink>}</>}
      />
      <nav className="-mx-4 mb-6 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0" aria-label="Onglets du projet">
        <ul className="flex gap-1">
          {TABS.map(([key, label, phase]) => (
            <li key={key}>
              {phase ? (
                <span className="flex items-center gap-1 whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm text-slate-400" title={`Disponible en phase ${phase}`} aria-disabled="true">{label}<span className="rounded bg-slate-100 px-1 text-[10px]">Bientôt</span></span>
              ) : (
                <Link href={`?tab=${key}`} aria-current={tab === key ? "page" : undefined} className={cn("block whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium", tab === key ? "border-brand text-brand-deep" : "border-transparent text-slate-600 hover:text-navy")}>{label}</Link>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Avancement temporel" value={t === null ? "—" : `${t} %`} hint={t === null ? "Dates non renseignées" : `${formatDate(p.startDate)} → ${formatDate(p.endDate)}`} />
            <Stat label="Durée" value={durationDays(p.startDate, p.endDate) ? `${durationDays(p.startDate, p.endDate)} j` : "—"} />
            <Stat label="Budget prévisionnel" value={p.plannedBudget ? formatMoney(Number(p.plannedBudget), p.currency) : "—"} hint="Exécution : module Finances" />
            <Stat label="Bénéficiaires directs prévus" value={p.directBeneficiaries ?? "—"} />
          </div>
          {t !== null && <ProgressBar value={t} label="Avancement temporel du projet" />}
          <Card>
            <h2 className="font-semibold">Santé du projet</h2>
            <p className="mb-4 text-xs text-slate-500">Chaque dimension est calculée par une règle documentée ; aucune valeur n&apos;est estimée sans données.</p>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {projectHealth(p).map((h) => (
                <li key={h.key} className="rounded-lg border border-line p-3">
                  <div className="flex items-center gap-2 text-sm font-medium"><span className={cn("h-2.5 w-2.5 rounded-full", levelUi[h.level][1])} aria-hidden />{h.label}<span className="ml-auto text-xs text-slate-500">{levelUi[h.level][0]}</span></div>
                  <p className="mt-1 text-xs text-slate-600">{h.detail}</p>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <h2 className="mb-4 font-semibold">Identité et objectifs</h2>
            <DefinitionList items={[
              ["Chef de projet", p.managerId ? o.memberNames.get(p.managerId) : null], ["Portefeuille", p.portfolio?.name], ["Priorité", PRIORITY_LABELS[p.priority]], ["Type", p.type],
              ["Secteurs", p.sectors.join(", ")], ["ODD", p.sdgs.map((n) => `${n}. ${SDG_LABELS[n - 1]}`).join("\n")],
              ["Description", p.shortDescription], ["Objectif général", p.generalObjective],
              ["Objectifs spécifiques", p.specificObjectives.map((s) => `• ${s}`).join("\n")], ["Territoire", [p.country, p.region, ...p.zones].filter(Boolean).join(" · ")],
              ["Contexte", p.context], ["Problématique", p.problemStatement], ["Justification", p.justification],
            ]} />
          </Card>
        </div>
      )}

      {tab === "history" && <History ctxOrg={ctx.organizationId} projectId={p.id} canAudit={can(ctx, "audit:view")} />}

      {tab === "settings" && (
        <div className="space-y-6">
          {editable || can(ctx, "project:approve") ? (
            <Card>
              <h2 className="font-semibold">Statut du projet</h2>
              <p className="mb-3 text-sm text-slate-600">Statut actuel : <StatusBadge status={p.status} />. L&apos;activation nécessite des dates et la permission de validation.</p>
              <div className="flex flex-wrap gap-2">
                {allowedTransitions(p.status).length === 0 && <p className="text-sm text-slate-500">Aucune transition possible.</p>}
                {allowedTransitions(p.status).map((s) => (
                  <ActionForm key={s} action={statusAction.bind(null, p.id, s)} submitLabel={`→ ${STATUS_LABELS[s][0]}`} submitVariant="secondary" className="space-y-2" confirm={s === "ARCHIVED" || s === "CLOSED" ? `Passer le projet en « ${STATUS_LABELS[s][0]} » ?` : undefined} />
                ))}
              </div>
            </Card>
          ) : null}
          {editable ? (
            PROJECT_STEPS.filter((s) => s.n <= PROJECT_LAST_EDIT_STEP).map((s) => (
              <Card key={s.n}>
                <details open={s.n === 1}>
                  <summary className="cursor-pointer font-semibold">{s.label}</summary>
                  <div className="mt-4"><ActionForm action={editStepAction.bind(null, p.id, s.n as ProjectStep)}><ProjectStepFields step={s.n as ProjectStep} p={p} o={o} /></ActionForm></div>
                </details>
              </Card>
            ))
          ) : (
            <Card><p className="text-sm text-slate-600">Lecture seule : votre rôle ne permet pas de modifier ce projet.</p></Card>
          )}
          {can(ctx, "project:delete") && (
            <Card className="border-danger/30">
              <h2 className="font-semibold text-danger">Supprimer le projet</h2>
              <p className="mb-3 text-sm text-slate-600">Suppression logique : le projet disparaît des listes mais son historique est conservé dans le journal d&apos;audit.</p>
              <ActionForm action={deleteProjectAction.bind(null, p.id)} submitLabel="Supprimer" submitVariant="danger" confirm={`Supprimer le projet « ${p.name} » ?`} />
            </Card>
          )}
        </div>
      )}

      {!["overview", "history", "settings"].includes(tab) && <Card><p className="text-sm text-slate-600">Cet onglet n&apos;est pas encore disponible. <Badge>Bientôt</Badge></p></Card>}
    </>
  );
}

async function History({ ctxOrg, projectId, canAudit }: { ctxOrg: string; projectId: string; canAudit: boolean }) {
  if (!canAudit) return <Card><p className="text-sm text-slate-600">L&apos;historique détaillé nécessite la permission « Journal d&apos;audit : consulter ».</p></Card>;
  const rows = await db.auditLog.findMany({ where: { organizationId: ctxOrg, entityType: "Project", entityId: projectId }, orderBy: { createdAt: "desc" }, take: 100 });
  const users = await db.user.findMany({ where: { id: { in: rows.map((r) => r.actorId!).filter(Boolean) } }, select: { id: true, name: true } });
  const names = new Map(users.map((u) => [u.id, u.name]));
  return (
    <Card>
      <h2 className="mb-3 font-semibold">Historique des modifications</h2>
      <ul className="divide-y divide-line text-sm">
        {rows.map((r) => (
          <li key={r.id} className="py-2">
            <p>{r.summary}</p>
            <p className="text-xs text-slate-500">{names.get(r.actorId ?? "") ?? "—"} · {new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(r.createdAt)}</p>
            {r.changes && Object.keys(r.changes as object).length > 0 && (
              <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
                {Object.entries(r.changes as Record<string, { from: unknown; to: unknown }>).map(([k, v]) => <li key={k}><code>{k}</code> : {JSON.stringify(v.from)} → {JSON.stringify(v.to)}</li>)}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
