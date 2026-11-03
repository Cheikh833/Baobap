import Link from "next/link";
import { AlertTriangle, Briefcase, CalendarClock, FolderKanban, Layers, Users } from "lucide-react";
import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { getDashboard } from "@/server/services/dashboard";
import { recentActivity } from "@/server/services/audit-log";
import { Card, PageHeader, ProgressBar, Stat } from "@/components/ui/display";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { STATUS_LABELS } from "@/lib/labels";
import { formatDate, formatMoney } from "@/lib/metrics";

export const metadata = { title: "Tableau de bord" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const ctx = await requireTenant();
  const [d, activity] = await Promise.all([getDashboard(ctx), recentActivity(ctx)]);
  const welcome = (await searchParams).welcome;
  const empty = d.projects?.total === 0 && !d.portfolios && !d.programs;

  return (
    <>
      <PageHeader title="Tableau de bord" description={`Vue consolidée de ${ctx.organizationName}, calculée à partir des données enregistrées.`} />

      {(welcome || empty) && (
        <Card className="mb-6 border-brand/30 bg-brand-50/50">
          <h2 className="font-semibold">Premiers pas</h2>
          <p className="mt-1 text-sm text-slate-600">Structurez progressivement votre organisation :</p>
          <ol className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            {can(ctx, "organization:edit") && <li><Link className="font-medium text-brand hover:underline" href="/organization/profile">1. Compléter le profil institutionnel</Link></li>}
            {can(ctx, "members:manage") && <li><Link className="font-medium text-brand hover:underline" href="/organization/members">2. Inviter votre équipe</Link></li>}
            {can(ctx, "portfolio:create") && <li><Link className="font-medium text-brand hover:underline" href="/portfolios/new">3. Créer un portefeuille</Link></li>}
            {can(ctx, "project:create") && <li><Link className="font-medium text-brand hover:underline" href="/projects/new">4. Créer un projet</Link></li>}
          </ol>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {d.portfolios !== null && <Stat label="Portefeuilles" value={d.portfolios} icon={Briefcase} />}
        {d.programs !== null && <Stat label="Programmes" value={d.programs} icon={Layers} />}
        {d.projects && <Stat label="Projets" value={d.projects.total} hint={`${d.projects.runningCount} actif(s) · ${d.projects.drafts.length} brouillon(s)`} icon={FolderKanban} />}
        {d.members !== null && <Stat label="Membres actifs" value={d.members} icon={Users} />}
      </div>

      {d.projects && (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Card>
            <h2 className="font-semibold">Projets par statut</h2>
            {d.projects.total === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Aucun projet enregistré.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {Object.keys(STATUS_LABELS).filter((s) => d.projects!.byStatus[s]).map((s) => (
                  <li key={s} className="flex items-center justify-between"><StatusBadge status={s} /><span className="font-medium">{d.projects!.byStatus[s]}</span></li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="font-semibold">Budget prévisionnel</h2>
            <p className="text-xs text-slate-500">Somme des budgets prévus des projets non archivés, par devise (aucune conversion).</p>
            {Object.keys(d.projects.budget.totals).length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Aucun budget renseigné.</p>
            ) : (
              <ul className="mt-3 space-y-1">
                {Object.entries(d.projects.budget.totals).map(([cur, v]) => <li key={cur} className="text-lg font-semibold">{formatMoney(v, cur)}</li>)}
              </ul>
            )}
            {d.projects.budget.missing > 0 && <p className="mt-2 text-xs text-amber-700">{d.projects.budget.missing} projet(s) sans budget renseigné.</p>}
            <p className="mt-3 text-xs text-slate-400">Exécution budgétaire : disponible avec le module Finances (phase 5).</p>
          </Card>

          <Card>
            <h2 className="font-semibold">Avancement temporel des projets actifs</h2>
            <p className="text-xs text-slate-500">Temps écoulé entre début et fin, pondéré par la durée. Ce n&apos;est ni un taux d&apos;atteinte des cibles ni un taux d&apos;exécution budgétaire.</p>
            {d.projects.timeProgress.value === null ? (
              <p className="mt-3 text-sm text-slate-500">Aucun projet actif avec des dates renseignées.</p>
            ) : (
              <div className="mt-3">
                <p className="text-2xl font-semibold">{d.projects.timeProgress.value} %</p>
                <ProgressBar value={d.projects.timeProgress.value} label="Avancement temporel consolidé" />
              </div>
            )}
            {d.projects.timeProgress.excluded > 0 && <p className="mt-2 text-xs text-amber-700">{d.projects.timeProgress.excluded} projet(s) actif(s) exclu(s) faute de dates.</p>}
          </Card>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {d.projects && (
          <Card>
            <h2 className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4 text-warning" aria-hidden />Alertes</h2>
            <p className="text-xs text-slate-500">Règle : date de fin dépassée sans clôture · échéance de fin dans les 30 jours.</p>
            {d.projects.overdue.length === 0 && d.projects.upcoming.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Aucune alerte.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line text-sm">
                {d.projects.overdue.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 py-2">
                    <Link className="min-w-0 break-words font-medium hover:underline" href={`/projects/${p.id}`}>{p.code} · {p.name}</Link>
                    <span className="text-xs font-medium text-danger">En retard depuis le {formatDate(p.endDate)}</span>
                  </li>
                ))}
                {d.projects.upcoming.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 py-2">
                    <Link className="min-w-0 break-words font-medium hover:underline" href={`/projects/${p.id}`}>{p.code} · {p.name}</Link>
                    <span className="flex items-center gap-1 text-xs text-amber-700"><CalendarClock className="h-3.5 w-3.5" aria-hidden />Fin le {formatDate(p.endDate)}</span>
                  </li>
                ))}
              </ul>
            )}
            {d.projects.drafts.length > 0 && (
              <div className="mt-4 border-t border-line pt-3">
                <p className="text-xs font-medium text-slate-500">Brouillons à compléter</p>
                <ul className="mt-1 space-y-1 text-sm">
                  {d.projects.drafts.slice(0, 5).map((p) => <li key={p.id}><Link className="text-brand hover:underline" href={`/projects/new/${p.id}`}>{p.code} · {p.name}</Link></li>)}
                </ul>
              </div>
            )}
          </Card>
        )}
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Activité récente</h2>
            {can(ctx, "audit:view") && <Link href="/organization/audit" className="text-xs font-medium text-brand hover:underline">Journal complet</Link>}
          </div>
          {activity.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Aucune activité.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line text-sm">
              {activity.map((a) => (
                <li key={a.id} className="py-2">
                  <p>{a.summary}</p>
                  <p className="text-xs text-slate-500">{a.actorName} · {new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(a.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {!d.projects && (
        <Card className="mt-6"><p className="text-sm text-slate-600">Votre rôle ne donne pas accès aux projets. <ButtonLink href="/organization" variant="ghost" size="sm">Voir l&apos;organisation</ButtonLink></p></Card>
      )}
    </>
  );
}
