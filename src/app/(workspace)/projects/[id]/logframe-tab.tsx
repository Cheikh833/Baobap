import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { LogframeItem } from "@prisma/client";
import { getLogframe } from "@/server/services/meal";
import { Card } from "@/components/ui/display";
import { ActionForm } from "@/components/forms/action-form";
import { ItemFields } from "@/components/meal/fields";
import { TrackBadge, numFmt, type Track } from "@/components/meal/display";
import type { TenantContext } from "@/server/permissions/check";
import { can } from "@/server/permissions/check";
import type { Messages } from "@/i18n/messages/fr";
import { fill } from "@/i18n/translate";
import { createItemAction, deleteItemAction, updateItemAction } from "../../meal/actions";

const LEVEL_STYLE: Record<string, string> = {
  IMPACT: "border-navy bg-gradient-to-r from-navy to-[#1E4A6E] text-white",
  OUTCOME: "border-brand-deep/30 bg-brand-50",
  OUTPUT: "border-ochre/40 bg-amber-50/60",
  ACTIVITY: "border-line bg-white",
};

type Ind = Awaited<ReturnType<typeof getLogframe>>["indicators"][number];

export async function LogframeTab({ ctx, projectId, m, locale }: { ctx: TenantContext; projectId: string; m: Messages; locale: string }) {
  const { items, indicators, checks } = await getLogframe(ctx, projectId);
  const M = m.meal;
  const edit = can(ctx, "meal:edit");
  const del = can(ctx, "meal:delete");
  const fmt = numFmt(locale);
  const parents = items.filter((i) => i.level !== "ACTIVITY").map((i) => [i.id, `${M.levels[i.level]} · ${i.code} — ${i.title}`] as const);
  const roots = items.filter((i) => !i.parentId || !items.some((p) => p.id === i.parentId));

  const Node = ({ it, depth }: { it: LogframeItem; depth: number }) => {
    const kids = items.filter((c) => c.parentId === it.id);
    const inds = indicators.filter((x) => x.logframeItemId === it.id);
    const dark = it.level === "IMPACT";
    return (
      <li className="animate-fade-up" style={{ animationDelay: `${depth * 80}ms` }}>
        <div className={`rounded-xl border p-3 shadow-sm ${LEVEL_STYLE[it.level]}`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${dark ? "bg-white/15" : "bg-white/80 text-slate-600"}`}>{M.levels[it.level]}</span>
            <span className={`font-mono text-xs ${dark ? "text-white/70" : "text-slate-500"}`}>{it.code}</span>
            <span className="font-semibold">{it.title}</span>
          </div>
          {it.description && <p className={`mt-1 text-sm ${dark ? "text-white/80" : "text-slate-600"}`}>{it.description}</p>}
          {it.assumptions && <p className={`mt-1 text-xs italic ${dark ? "text-white/70" : "text-slate-500"}`}>{M.fields.assumptions} : {it.assumptions}</p>}
          {inds.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {inds.map((x: Ind) => (
                <li key={x.id} className="max-w-full">
                  <Link href={`/meal/indicators/${x.id}`} className={`inline-flex max-w-full items-center gap-2 rounded-lg px-2 py-1 text-xs ring-1 transition hover:-translate-y-0.5 ${dark ? "bg-white/10 ring-white/20 hover:bg-white/20" : "bg-white ring-line hover:ring-brand"}`}>
                    <span className="font-mono">{x.code}</span>
                    <span className="min-w-0 max-w-[16rem] truncate">{x.name}</span>
                    <span className="shrink-0 font-semibold tabular">{x.calc.rate === null ? "—" : `${fmt(x.calc.rate)} %`}</span>
                    <span className="shrink-0"><TrackBadge status={x.calc.status as Track} m={m} /></span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {(edit || del) && (
            <details className="mt-2">
              <summary className={`cursor-pointer text-xs font-medium ${dark ? "text-white/80" : "text-brand"}`}>{m.ui.edit}</summary>
              <div className="mt-3 space-y-3 rounded-lg bg-white p-3 text-navy">
                {edit && <ActionForm action={updateItemAction.bind(null, it.id)}><ItemFields it={it} parents={parents.filter(([id]) => id !== it.id)} m={m} /></ActionForm>}
                {del && <ActionForm action={deleteItemAction.bind(null, it.id)} submitLabel={M.deleteItem} submitVariant="danger" confirm={fill(m.ui.confirmDelete, { name: it.title })} />}
              </div>
            </details>
          )}
        </div>
        {kids.length > 0 && (
          <ul className="ml-3 mt-2 space-y-2 border-l-2 border-dashed border-brand/25 pl-4 sm:ml-6">
            {kids.map((k) => <Node key={k.id} it={k} depth={depth + 1} />)}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="font-display font-semibold">{M.logframe}</h2>
        <p className="mb-4 text-xs text-slate-500">{M.logframeHint}</p>
        {items.length === 0 ? <p className="text-sm text-slate-500">{M.noLogframe}</p> : <ul className="space-y-3">{roots.map((r) => <Node key={r.id} it={r} depth={0} />)}</ul>}
        {edit && (
          <details className="mt-4 rounded-xl border border-dashed border-brand/30 p-4" open={items.length === 0}>
            <summary className="cursor-pointer text-sm font-semibold text-brand">+ {M.newItem}</summary>
            <div className="mt-3"><ActionForm action={createItemAction.bind(null, projectId)} submitLabel={m.ui.create} resetOnSuccess><ItemFields parents={parents} m={m} /></ActionForm></div>
          </details>
        )}
      </Card>
      {items.length > 0 && (
        <Card>
          <h2 className="mb-3 font-display font-semibold">{M.coherence}</h2>
          {checks.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-green-700"><CheckCircle2 className="h-4 w-4" />{M.coherenceOk}</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {checks.map((c, i) => <li key={i} className="flex items-start gap-2 text-amber-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{fill(M.issues[c.kind], { code: c.code })}</li>)}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
