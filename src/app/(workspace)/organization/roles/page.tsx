import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { listRoles } from "@/server/services/roles";
import { OWNER_ROLE_KEY, RESOURCE_ACTIONS, RESOURCES } from "@/server/permissions/catalog";
import { Badge, Card } from "@/components/ui/display";
import { ActionForm, TextField } from "@/components/forms/action-form";
import { getMessages } from "@/i18n/server";
import { fill } from "@/i18n/translate";
import { roleLabel } from "@/i18n/roles";
import type { Messages } from "@/i18n/messages/fr";
import { Forbidden } from "../../forbidden";
import { createRoleAction, deleteRoleAction, updateRoleAction } from "../actions";

export const metadata = { title: "Rôles et permissions" };

function PermissionMatrix({ selected, disabled, m }: { selected: string[]; disabled?: boolean; m: Messages }) {
  return (
    <fieldset disabled={disabled} className="overflow-x-auto">
      <legend className="mb-2 text-sm font-medium">{m.roles.permissions}</legend>
      <table className="text-sm">
        <tbody>
          {RESOURCES.map((r) => (
            <tr key={r} className="border-t border-line">
              <th scope="row" className="whitespace-nowrap py-2 pr-4 text-left font-medium">{m.perm.resources[r]}</th>
              <td className="py-2">
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {RESOURCE_ACTIONS[r].map((a) => (
                    <label key={a} className="flex items-center gap-1.5 whitespace-nowrap">
                      <input type="checkbox" name="permissions" value={`${r}:${a}`} defaultChecked={selected.includes(`${r}:${a}`)} className="h-4 w-4 rounded border-line text-brand" />
                      {m.perm.actions[a]}
                    </label>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </fieldset>
  );
}

export default async function RolesPage() {
  const ctx = await requireTenant();
  if (!can(ctx, "roles:view")) return <Forbidden />;
  const [roles, { m }] = await Promise.all([listRoles(ctx), getMessages()]);
  const R = m.roles;
  const manage = can(ctx, "roles:manage");
  const all = RESOURCES.flatMap((res) => RESOURCE_ACTIONS[res].map((a) => `${res}:${a}`));
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">{R.intro}</p>
      {roles.map((r) => (
        <Card key={r.id}>
          <details>
            <summary className="flex cursor-pointer flex-wrap items-center gap-2">
              <span className="font-semibold">{roleLabel(r, m)}</span>
              {r.isSystem ? <Badge>{R.system}</Badge> : <Badge tone="info">{R.custom}</Badge>}
              <span className="text-xs text-slate-500">{fill(R.members, { n: r._count.memberships })} · {r.key === OWNER_ROLE_KEY ? R.all : fill(R.perms, { n: r.permissions.length })}</span>
            </summary>
            {r.description && <p className="mt-2 text-sm text-slate-600">{r.description}</p>}
            <div className="mt-4">
              {manage && r.key !== OWNER_ROLE_KEY ? (
                <>
                  <ActionForm action={updateRoleAction.bind(null, r.id)}>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <TextField name="name" label={R.name} defaultValue={r.name} required />
                      <TextField name="description" label={R.description} defaultValue={r.description ?? ""} />
                    </div>
                    <PermissionMatrix selected={r.permissions} m={m} />
                  </ActionForm>
                  {!r.isSystem && <div className="mt-3"><ActionForm action={deleteRoleAction.bind(null, r.id)} submitLabel={R.deleteBtn} submitVariant="danger" confirm={fill(m.ui.confirmDelete, { name: r.name })} /></div>}
                </>
              ) : (
                <PermissionMatrix selected={r.key === OWNER_ROLE_KEY ? all : r.permissions} disabled m={m} />
              )}
            </div>
          </details>
        </Card>
      ))}
      {manage && (
        <Card>
          <h2 className="mb-4 font-semibold">{R.new}</h2>
          <ActionForm action={createRoleAction} submitLabel={R.createSubmit} resetOnSuccess>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField name="name" label={R.name} required />
              <TextField name="description" label={R.description} />
            </div>
            <PermissionMatrix selected={[]} m={m} />
          </ActionForm>
        </Card>
      )}
    </div>
  );
}
