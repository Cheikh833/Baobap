import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { getProjectFinance } from "@/server/services/finance";
import { db } from "@/server/db";
import { Badge, Card } from "@/components/ui/display";
import { ActionForm, TextField } from "@/components/forms/action-form";
import { ExpenseFields, FundingFields, LineFields } from "@/components/finance/fields";
import { Donut, Meter } from "@/components/charts/charts";
import { cn } from "@/components/ui/cn";
import { can, type TenantContext } from "@/server/permissions/check";
import { formatDate, formatMoney, intlLocale, timeProgress } from "@/lib/metrics";
import { budgetHealth } from "@/lib/finance";
import type { Messages } from "@/i18n/messages/fr";
import { fill } from "@/i18n/translate";
import {
  cancelExpenseAction, createExpenseAction, createFundingAction, createLineAction, deleteExpenseAction, deleteFundingAction, deleteLineAction, reviewExpenseAction, updateFundingAction, updateLineAction,
} from "../../finance/actions";

const STATUS_TONE = { DRAFT: "info", VALIDATED: "success", REJECTED: "danger", CANCELED: "neutral" } as const;
const CAT_COLORS = ["#087F68", "#2BA587", "#5FC4A8", "#E3A13B", "#1E6FA0", "#102A43", "#8B5CF6", "#94A3B8", "#F0C06E"];

export async function FinanceTab({ ctx, projectId, m, locale }: { ctx: TenantContext; projectId: string; m: Messages; locale: string }) {
  const { project, fundings, lines, expenses, totals: t } = await getProjectFinance(ctx, projectId);
  const F = m.finance;
  const cur = project.currency;
  const money = (x: number) => formatMoney(x, cur, locale);
  const pct = (x: number | null) => (x === null ? "—" : `${new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: 1 }).format(x)}\u00A0%`);
  const edit = can(ctx, "finance:edit");
  const del = can(ctx, "finance:delete");
  const approve = can(ctx, "finance:approve");
  const elapsed = timeProgress(project.startDate, project.endDate);
  const health = budgetHealth(t.execution, elapsed, t.overspentLines);
  const people = await db.user.findMany({ where: { id: { in: expenses.flatMap((e) => [e.createdById, e.validatedById]).filter((x): x is string => !!x) } }, select: { id: true, name: true } });
  const name = new Map(people.map((p) => [p.id, p.name]));
  const lineById = new Map(lines.map((l) => [l.id, l]));
  const fundingOpts = fundings.map((f) => [f.id, `${f.donor}${f.reference ? ` (${f.reference})` : ""}`] as const);
  const lineOpts = lines.map((l) => [l.id, `${l.code} — ${l.label} (${money(l.totals.remaining)})`] as const);
  const byCat = Object.entries(lines.reduce<Record<string, number>>((acc, l) => ({ ...acc, [l.category]: (acc[l.category] ?? 0) + l.totals.planned }), {}));

  const stats: [string, string, string?][] = [
    [F.stats.planned, money(t.planned), project.plannedBudget ? fill(F.budgetVsProject, { amount: money(Number(project.plannedBudget)) }) : undefined],
    [F.stats.spent, money(t.spent), t.execution !== null ? pct(t.execution) : undefined],
    [F.stats.pending, money(t.pending)],
    [F.stats.funded, money(t.funded), t.fundingGap > 0 ? fill(F.fundingGap, { amount: money(t.fundingGap) }) : t.fundingGap < 0 ? fill(F.fundingSurplus, { amount: money(-t.fundingGap) }) : F.fundingOk],
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([l, v, hint], i) => (
          <Card key={l} className="animate-fade-up"><div style={{ animationDelay: `${i * 60}ms` }}>
            <p className="text-sm font-medium text-slate-600">{l}</p>
            <p className="mt-1 font-display text-2xl font-bold tabular">{v}</p>
            {hint && <p className={cn("mt-1 text-xs", l === F.stats.funded && t.fundingGap > 0 ? "font-semibold text-amber-700" : "text-slate-500")}>{hint}</p>}
          </div></Card>
        ))}
      </div>

      {t.execution !== null && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display font-semibold">{F.stats.execution}</h2>
            <Badge tone={health === "critical" ? "danger" : health === "watch" ? "warning" : "success"}>{m.project.levels[health]}</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-600">{fill(F.executionVsTime, { exec: pct(t.execution).replace(/\u00A0%$/, ""), elapsed: elapsed ?? "—" })}</p>
          <div className="mt-3 space-y-2">
            <Meter value={t.execution} label={F.stats.execution} color={t.overspentLines ? "#DC2626" : undefined} />
            {elapsed !== null && <Meter value={elapsed} label={m.planning.elapsed} color="linear-gradient(90deg,#102A43,#1E4A6E)" />}
          </div>
          <p className="mt-2 flex gap-4 text-[11px] text-slate-500"><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-brand" />{F.stats.execution}</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-navy" />{m.planning.elapsed}</span></p>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-0 lg:col-span-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-5"><h2 className="font-display font-semibold">{F.lines}</h2><p className="text-xs text-slate-500">{fill(F.currencyNote, { currency: cur })}</p></div>
          {lines.length === 0 ? <p className="px-5 py-4 text-sm text-slate-500">{F.noLines}</p> : (
            <ul className="mt-3 divide-y divide-line">
              {lines.map((l) => (
                <li key={l.id} className="px-5 py-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-mono text-xs text-slate-500">{l.code}</span>
                    <span className="font-medium">{l.label}</span>
                    <span className="text-xs text-slate-500">· {F.categories[l.category]}</span>
                    {l.totals.overspent && <Badge tone="danger">{F.overspent}</Badge>}
                    <span className="ml-auto font-semibold tabular">{money(l.totals.spent)} <span className="font-normal text-slate-500">/ {money(l.totals.planned)}</span></span>
                  </div>
                  <div className="mt-2"><Meter value={l.totals.rate ?? 0} label={l.label} color={l.totals.overspent ? "#DC2626" : (l.totals.rate ?? 0) > 90 ? "#D97706" : undefined} /></div>
                  <p className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-slate-500">
                    <span>{F.stats.remaining} : {money(l.totals.remaining)}</span>
                    {l.totals.pending > 0 && <span>{F.stats.pending} : {money(l.totals.pending)}</span>}
                    {l.fundingId && <span>{F.fields.funding} : {fundings.find((f) => f.id === l.fundingId)?.donor}</span>}
                  </p>
                  {(edit || del) && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-medium text-brand">{m.ui.edit}</summary>
                      <div className="mt-3 space-y-3">
                        {edit && <ActionForm action={updateLineAction.bind(null, l.id)}><LineFields l={l} fundings={fundingOpts} m={m} /></ActionForm>}
                        {del && <ActionForm action={deleteLineAction.bind(null, l.id)} submitLabel={F.delete} submitVariant="danger" confirm={fill(m.ui.confirmDelete, { name: l.label })} />}
                      </div>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          )}
          {edit && (
            <details className="m-5 rounded-xl border border-dashed border-brand/30 p-4" open={lines.length === 0}>
              <summary className="cursor-pointer text-sm font-semibold text-brand">+ {F.newLine}</summary>
              <div className="mt-3"><ActionForm action={createLineAction.bind(null, projectId)} submitLabel={m.ui.create} resetOnSuccess><LineFields fundings={fundingOpts} m={m} /></ActionForm></div>
            </details>
          )}
        </Card>

        <div className="space-y-6">
          {byCat.length > 0 && (
            <Card>
              <h2 className="mb-4 font-display font-semibold">{F.fields.category}</h2>
              <Donut label={F.fields.category} size={130} format={(v) => pct(t.planned ? Math.round((v / t.planned) * 1000) / 10 : 0)} data={byCat.map(([c, v], i) => ({ label: F.categories[c as keyof typeof F.categories], value: v, color: CAT_COLORS[i % CAT_COLORS.length] }))} />
            </Card>
          )}
          <Card>
            <h2 className="mb-3 font-display font-semibold">{F.fundings}</h2>
            {fundings.length === 0 && <p className="text-sm text-slate-500">{F.noFundings}</p>}
            <ul className="space-y-3 text-sm">
              {fundings.map((f) => (
                <li key={f.id}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2"><span className="font-medium">{f.donor}</span><span className="font-semibold tabular">{money(Number(f.amount))}</span></div>
                  <p className="text-xs text-slate-500">{[f.reference, f.startDate && `${formatDate(f.startDate, locale)} → ${formatDate(f.endDate, locale)}`].filter(Boolean).join(" · ")}</p>
                  {(edit || del) && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs font-medium text-brand">{m.ui.edit}</summary>
                      <div className="mt-2 space-y-3">
                        {edit && <ActionForm action={updateFundingAction.bind(null, f.id)}><FundingFields f={f} m={m} /></ActionForm>}
                        {del && <ActionForm action={deleteFundingAction.bind(null, f.id)} submitLabel={F.delete} submitVariant="danger" confirm={fill(m.ui.confirmDelete, { name: f.donor })} />}
                      </div>
                    </details>
                  )}
                </li>
              ))}
            </ul>
            {edit && (
              <details className="mt-4 rounded-xl border border-dashed border-brand/30 p-3" open={fundings.length === 0 && lines.length > 0}>
                <summary className="cursor-pointer text-sm font-semibold text-brand">+ {F.newFunding}</summary>
                <div className="mt-3"><ActionForm action={createFundingAction.bind(null, projectId)} submitLabel={m.ui.create} resetOnSuccess><FundingFields m={m} /></ActionForm></div>
              </details>
            )}
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <h2 className="mb-3 font-display font-semibold">{F.expenses}</h2>
          {expenses.length === 0 && <p className="text-sm text-slate-500">{F.noExpenses}</p>}
          <ul className="divide-y divide-line">
            {expenses.map((e) => {
              const line = lineById.get(e.budgetLineId);
              const off = e.status === "REJECTED" || e.status === "CANCELED";
              return (
                <li key={e.id} className={cn("py-3", off && "opacity-60")}>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-xs text-slate-500">{formatDate(e.date, locale)}</span>
                    <span className={cn("font-medium", off && "line-through")}>{e.description}</span>
                    <Badge tone={STATUS_TONE[e.status]}>{F.status[e.status]}</Badge>
                    <span className="ml-auto font-display font-bold tabular">{money(Number(e.amount))}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {line && <><span className="font-mono">{line.code}</span> · </>}{[e.supplier, e.reference].filter(Boolean).join(" · ")}{(e.supplier || e.reference) && " · "}
                    {fill(F.enteredBy, { name: name.get(e.createdById ?? "") ?? "—" })}
                    {e.validatedById && <> · {fill(F.reviewedBy, { status: F.status[e.status === "CANCELED" ? "VALIDATED" : e.status], name: name.get(e.validatedById) ?? "—", date: formatDate(e.validatedAt, locale) })}</>}
                  </p>
                  {e.reviewComment && <p className="text-xs italic text-slate-600">{e.reviewComment}</p>}
                  <div className="mt-2 flex flex-wrap items-end gap-2">
                    {e.status === "DRAFT" && approve && (
                      <>
                        <ActionForm action={reviewExpenseAction.bind(null, e.id, true)} submitLabel={F.validate} className="flex flex-wrap items-end gap-2 space-y-0"><TextField name="comment" label={F.fields.comment} className="w-52" /></ActionForm>
                        <ActionForm action={reviewExpenseAction.bind(null, e.id, false)} submitLabel={F.reject} submitVariant="secondary" className="space-y-0" />
                      </>
                    )}
                    {e.status === "DRAFT" && (del || (e.createdById === ctx.userId && can(ctx, "finance:create"))) && (
                      <ActionForm action={deleteExpenseAction.bind(null, e.id)} submitLabel={F.delete} submitVariant="secondary" className="space-y-0" confirm={fill(m.ui.confirmDelete, { name: e.description })} />
                    )}
                  </div>
                  {e.status === "VALIDATED" && approve && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs font-medium text-danger">{F.cancel}</summary>
                      <ActionForm action={cancelExpenseAction.bind(null, e.id)} submitLabel={F.cancel} submitVariant="danger" className="mt-2 flex flex-wrap items-end gap-2 space-y-0"><TextField name="comment" label={F.cancelReason} required className="w-64" /></ActionForm>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
        <div className="space-y-6 lg:col-span-2">
          {can(ctx, "finance:create") && lines.length > 0 && (
            <Card>
              <h2 className="font-display font-semibold">{F.newExpense}</h2>
              <p className="mb-3 text-xs text-slate-500">{F.newExpenseHint}</p>
              <ActionForm action={createExpenseAction.bind(null, projectId)} resetOnSuccess><ExpenseFields lines={lineOpts} m={m} /></ActionForm>
            </Card>
          )}
          <p className="flex items-start gap-2 text-xs text-slate-500">{t.overspentLines ? <AlertTriangle className="h-4 w-4 shrink-0 text-danger" /> : <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />}{F.rules}</p>
        </div>
      </div>
    </div>
  );
}
