import { getPlanning } from "@/server/services/planning";
import { can, type TenantContext } from "@/server/permissions/check";
import { Card } from "@/components/ui/display";
import { ActionForm } from "@/components/forms/action-form";
import { Kanban, type KTask } from "@/components/planning/kanban";
import { TaskFields } from "@/components/planning/fields";
import { isTaskOverdue } from "@/lib/planning";
import { formatDate } from "@/lib/metrics";
import type { Messages } from "@/i18n/messages/fr";
import { fill } from "@/i18n/translate";
import { createTaskAction, deleteTaskAction, updateTaskAction } from "../actions";

export async function ActivitiesTab({ ctx, projectId, members, memberNames, m, locale }: { ctx: TenantContext; projectId: string; members: readonly (readonly [string, string])[]; memberNames: Map<string, string>; m: Messages; locale: string }) {
  const { activities, tasks } = await getPlanning(ctx, projectId);
  const P = m.planning;
  const edit = can(ctx, "project:edit");
  const activityOptions = activities.map((a) => [a.id, `${a.code} · ${a.title}`] as const);
  const ktasks: KTask[] = tasks.map((t) => ({
    id: t.id, title: t.title, status: t.status, priority: t.priority, position: t.position,
    dueDate: t.dueDate?.toISOString() ?? null, overdue: isTaskOverdue(t),
    assigneeName: t.assigneeId ? memberNames.get(t.assigneeId) ?? null : null, activityCode: t.activity?.code ?? null,
    canMove: !ctx.readOnly && (edit || t.assigneeId === ctx.userId),
  }));
  return (
    <div className="space-y-6">
      <Card>
        <h2 className="mb-1 font-display font-semibold">{P.kanban}</h2>
        <Kanban tasks={ktasks} locale={locale} />
      </Card>
      {edit && (
        <Card>
          <details open={tasks.length === 0}>
            <summary className="cursor-pointer font-display font-semibold text-brand">+ {P.newTask}</summary>
            <div className="mt-3"><ActionForm action={createTaskAction.bind(null, projectId)} submitLabel={m.ui.create} resetOnSuccess><TaskFields activities={activityOptions} members={members} m={m} /></ActionForm></div>
          </details>
        </Card>
      )}
      {edit && tasks.length > 0 && (
        <Card>
          <h2 className="mb-3 font-display font-semibold">{m.ui.edit}</h2>
          <ul className="divide-y divide-line">
            {tasks.map((t) => (
              <li key={t.id} className="py-2">
                <details>
                  <summary className="cursor-pointer text-sm"><span className="font-medium">{t.title}</span> <span className="text-xs text-slate-500">· {P.taskStatus[t.status]}{t.dueDate && ` · ${formatDate(t.dueDate, locale)}`}</span></summary>
                  <div className="mt-3 space-y-3">
                    <ActionForm action={updateTaskAction.bind(null, t.id)}><TaskFields t={t} activities={activityOptions} members={members} m={m} /></ActionForm>
                    <ActionForm action={deleteTaskAction.bind(null, t.id)} submitLabel={P.deleteTask} submitVariant="danger" confirm={fill(m.ui.confirmDelete, { name: t.title })} />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
