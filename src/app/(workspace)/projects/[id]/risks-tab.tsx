import { Clock } from "lucide-react";
import { listProjectRisks } from "@/server/services/risks";
import { Badge, Card } from "@/components/ui/display";
import { ActionForm } from "@/components/forms/action-form";
import { RiskFields } from "@/components/risks/fields";
import { LEVEL_BG, LEVEL_FG, RiskMatrix } from "@/components/risks/matrix";
import { riskMatrix } from "@/lib/risk";
import { formatDate } from "@/lib/metrics";
import { cn } from "@/components/ui/cn";
import { can, type TenantContext } from "@/server/permissions/check";
import type { Messages } from "@/i18n/messages/fr";
import { fill } from "@/i18n/translate";
import { createRiskAction, deleteRiskAction, updateRiskAction } from "../../risks/actions";

export async function RisksTab({ ctx, projectId, members, memberNames, m, locale }: { ctx: TenantContext; projectId: string; members: readonly (readonly [string, string])[]; memberNames: Map<string, string>; m: Messages; locale: string }) {
  const risks = await listProjectRisks(ctx, projectId);
  const R = m.risks;
  const edit = can(ctx, "risk:edit");
  const open = risks.filter((r) => r.status !== "CLOSED");

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
        <Card>
          <h2 className="font-display font-semibold">{R.matrix}</h2>
          <p className="mb-4 text-xs text-slate-500">{R.matrixHint}</p>
          <RiskMatrix counts={riskMatrix(risks)} m={m} />
        </Card>
        <Card className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {([["open", open.length, "text-navy"], ["critical", open.filter((r) => r.level === "critical").length, "text-red-700"], ["high", open.filter((r) => r.level === "high").length, "text-orange-700"], ["overdue", risks.filter((r) => r.overdue).length, "text-amber-700"]] as const).map(([k, v, c]) => (
              <div key={k}><p className={`font-display text-3xl font-bold tabular ${c}`}>{v}</p><p className="text-xs text-slate-500">{R.stats[k]}</p></div>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-500">{R.rules}</p>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 font-display font-semibold">{R.register}</h2>
        {risks.length === 0 && <p className="text-sm text-slate-500">{R.noRisks}</p>}
        <ul className="space-y-3">
          {risks.map((r, i) => (
            <li key={r.id} className={cn("animate-fade-up rounded-xl border border-line p-4", r.status === "CLOSED" && "opacity-60")} style={{ animationDelay: `${i * 40}ms` }}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-display text-sm font-bold" style={{ background: LEVEL_BG[r.level], color: LEVEL_FG[r.level] }} title={R.levels[r.level]}>{r.score}</span>
                <span className="font-mono text-xs text-slate-500">{r.code}</span>
                <span className="font-semibold">{r.title}</span>
                <Badge>{R.categories[r.category]}</Badge>
                <Badge tone={r.status === "CLOSED" ? "neutral" : r.status === "MITIGATING" ? "info" : "warning"}>{R.status[r.status]}</Badge>
                {r.overdue && <Badge tone="danger"><Clock className="mr-1 h-3 w-3" />{R.overdue}</Badge>}
                <span className="ml-auto text-xs text-slate-500">{r.ownerId ? memberNames.get(r.ownerId) : ""}{r.reviewDate && <> · {R.fields.review} {formatDate(r.reviewDate, locale)}</>}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{R.probability} {r.probability} × {R.impact} {r.impact} · {R.levels[r.level]}</p>
              {r.description && <p className="mt-2 text-sm text-slate-700">{r.description}</p>}
              {(r.mitigation || r.contingency) && (
                <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                  {r.mitigation && <div className="rounded-lg bg-brand-50/60 p-2"><dt className="text-xs font-semibold text-brand-deep">{R.fields.mitigation}</dt><dd className="whitespace-pre-line">{r.mitigation}</dd></div>}
                  {r.contingency && <div className="rounded-lg bg-slate-50 p-2"><dt className="text-xs font-semibold text-slate-600">{R.fields.contingency}</dt><dd className="whitespace-pre-line">{r.contingency}</dd></div>}
                </dl>
              )}
              {(edit || can(ctx, "risk:delete")) && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-medium text-brand">{m.ui.edit}</summary>
                  <div className="mt-3 space-y-3">
                    {edit && <ActionForm action={updateRiskAction.bind(null, r.id)}><RiskFields r={r} members={members} m={m} /></ActionForm>}
                    {can(ctx, "risk:delete") && <ActionForm action={deleteRiskAction.bind(null, r.id)} submitLabel={R.delete} submitVariant="danger" confirm={fill(m.ui.confirmDelete, { name: r.title })} />}
                  </div>
                </details>
              )}
            </li>
          ))}
        </ul>
        {can(ctx, "risk:create") && (
          <details className="mt-4 rounded-xl border border-dashed border-brand/30 p-4" open={risks.length === 0}>
            <summary className="cursor-pointer text-sm font-semibold text-brand">+ {R.newRisk}</summary>
            <div className="mt-3"><ActionForm action={createRiskAction.bind(null, projectId)} submitLabel={m.ui.create} resetOnSuccess><RiskFields members={members} m={m} /></ActionForm></div>
          </details>
        )}
      </Card>
    </div>
  );
}
