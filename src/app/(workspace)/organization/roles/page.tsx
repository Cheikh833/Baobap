import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { listRoles } from "@/server/services/roles";
import { ACTION_LABELS, OWNER_ROLE_KEY, PERMISSION_LABELS, RESOURCE_ACTIONS, RESOURCES } from "@/server/permissions/catalog";
import { Badge, Card } from "@/components/ui/display";
import { ActionForm, TextField } from "@/components/forms/action-form";
import { Forbidden } from "../../forbidden";
import { createRoleAction, deleteRoleAction, updateRoleAction } from "../actions";

export const metadata = { title: "Rôles et permissions" };

function PermissionMatrix({ selected, disabled }: { selected: string[]; disabled?: boolean }) {
  return (
    <fieldset disabled={disabled} className="overflow-x-auto">
      <legend className="mb-2 text-sm font-medium">Permissions</legend>
      <table className="text-sm">
        <tbody>
          {RESOURCES.map((r) => (
            <tr key={r} className="border-t border-line">
              <th scope="row" className="whitespace-nowrap py-2 pr-4 text-left font-medium">{PERMISSION_LABELS[r]}</th>
              <td className="py-2">
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {RESOURCE_ACTIONS[r].map((a) => (
                    <label key={a} className="flex items-center gap-1.5 whitespace-nowrap">
                      <input type="checkbox" name="permissions" value={`${r}:${a}`} defaultChecked={selected.includes(`${r}:${a}`)} className="h-4 w-4 rounded border-line text-brand" />
                      {ACTION_LABELS[a]}
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
  const roles = await listRoles(ctx);
  const manage = can(ctx, "roles:manage");
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Les permissions sont vérifiées côté serveur pour chaque action. Les rôles système peuvent être ajustés (sauf Propriétaire) ; vous pouvez aussi créer des rôles personnalisés.</p>
      {roles.map((r) => (
        <Card key={r.id}>
          <details>
            <summary className="flex cursor-pointer flex-wrap items-center gap-2">
              <span className="font-semibold">{r.name}</span>
              {r.isSystem ? <Badge>Système</Badge> : <Badge tone="info">Personnalisé</Badge>}
              <span className="text-xs text-slate-500">{r._count.memberships} membre(s) · {r.key === OWNER_ROLE_KEY ? "tous les droits" : `${r.permissions.length} permission(s)`}</span>
            </summary>
            {r.description && <p className="mt-2 text-sm text-slate-600">{r.description}</p>}
            <div className="mt-4">
              {manage && r.key !== OWNER_ROLE_KEY ? (
                <>
                  <ActionForm action={updateRoleAction.bind(null, r.id)}>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <TextField name="name" label="Nom" defaultValue={r.name} required />
                      <TextField name="description" label="Description" defaultValue={r.description ?? ""} />
                    </div>
                    <PermissionMatrix selected={r.permissions} />
                  </ActionForm>
                  {!r.isSystem && <div className="mt-3"><ActionForm action={deleteRoleAction.bind(null, r.id)} submitLabel="Supprimer ce rôle" submitVariant="danger" confirm={`Supprimer le rôle « ${r.name} » ?`} /></div>}
                </>
              ) : (
                <PermissionMatrix selected={r.key === OWNER_ROLE_KEY ? RESOURCES.flatMap((res) => RESOURCE_ACTIONS[res].map((a) => `${res}:${a}`)) : r.permissions} disabled />
              )}
            </div>
          </details>
        </Card>
      ))}
      {manage && (
        <Card>
          <h2 className="mb-4 font-semibold">Nouveau rôle personnalisé</h2>
          <ActionForm action={createRoleAction} submitLabel="Créer le rôle" resetOnSuccess>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField name="name" label="Nom" required />
              <TextField name="description" label="Description" />
            </div>
            <PermissionMatrix selected={[]} />
          </ActionForm>
        </Card>
      )}
    </div>
  );
}
