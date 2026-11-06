import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronRight, Clock } from "lucide-react";
import { requireTenant } from "@/server/context";
import { myActions, type ActionKind } from "@/server/services/inbox";
import { Card, PageHeader } from "@/components/ui/display";
import { formatDate } from "@/lib/metrics";
import { getMessages } from "@/i18n/server";
import { fill } from "@/i18n/translate";

export const metadata = { title: "Mes actions" };
const ORDER: ActionKind[] = ["expense-validate", "meal-validate", "task-overdue", "activity-late", "risk-review", "task-soon", "indicator-stale"];

export default async function ActionsPage() {
  const ctx = await requireTenant();
  const [items, { m, locale }] = await Promise.all([myActions(ctx), getMessages()]);
  const A = m.actions;
  return (
    <>
      <PageHeader title={A.title} description={A.intro} />
      {items.length === 0 ? (
        <Card><p className="flex items-center gap-2 text-sm text-green-700"><CheckCircle2 className="h-5 w-5" />{A.empty}</p></Card>
      ) : (
        <div className="space-y-6">
          {ORDER.map((kind) => {
            const list = items.filter((i) => i.kind === kind);
            if (!list.length) return null;
            return (
              <Card key={kind} className="p-0">
                <h2 className="flex items-center gap-2 px-5 pt-5 font-display font-semibold">
                  {list.some((i) => i.severity === "high") ? <AlertTriangle className="h-4 w-4 text-danger" aria-hidden /> : <Clock className="h-4 w-4 text-amber-600" aria-hidden />}
                  {A.groups[kind]}<span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{list.length}</span>
                </h2>
                <ul className="mt-3 divide-y divide-line">
                  {list.map((i) => (
                    <li key={i.id}>
                      <Link href={i.href} className="group flex items-center gap-3 px-5 py-3 transition hover:bg-canvas">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${i.severity === "high" ? "bg-danger" : "bg-ochre"}`} aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{i.title}</span>
                          <span className="block text-xs text-slate-500">{i.context}{i.date && <> · {fill(A.due, { date: formatDate(i.date, locale) })}</>}</span>
                        </span>
                        <span className="flex items-center gap-1 text-xs font-semibold text-brand opacity-70 group-hover:opacity-100">{A.open}<ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
          <p className="text-xs text-slate-500">{A.rule}</p>
        </div>
      )}
    </>
  );
}
