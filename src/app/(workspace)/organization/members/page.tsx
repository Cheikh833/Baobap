import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { listInvitations, listMembers } from "@/server/services/members";
import { listRoleOptions } from "@/server/services/roles";
import { listUnits } from "@/server/services/units";
import { OWNER_ROLE_KEY } from "@/server/permissions/catalog";
import { Badge, Card, Table, Td } from "@/components/ui/display";
import { ActionForm, CheckboxGroup, SelectField, TextField } from "@/components/forms/action-form";
import { formatDate } from "@/lib/metrics";
import { Forbidden } from "../../forbidden";
import { changeRoleAction, inviteAction, revokeInvitationAction, setStatusAction, setUnitsAction } from "../actions";

export const metadata = { title: "Membres" };

export default async function MembersPage() {
  const ctx = await requireTenant();
  if (!can(ctx, "members:view")) return <Forbidden />;
  const manage = can(ctx, "members:manage");
  const [members, invitations, roles, units] = await Promise.all([
    listMembers(ctx),
    listInvitations(ctx),
    listRoleOptions(ctx),
    can(ctx, "units:view") ? listUnits(ctx) : Promise.resolve([]),
  ]);
  const isOwner = ctx.roleKey === OWNER_ROLE_KEY;
  const roleOptions = roles.filter((r) => isOwner || r.key !== OWNER_ROLE_KEY).map((r) => [r.id, r.name] as const);
  const unitOptions = units.map((u) => [u.id, u.name] as const);

  return (
    <div className="space-y-6">
      {manage && (
        <Card>
          <h2 className="mb-4 font-semibold">Inviter un membre</h2>
          <ActionForm action={inviteAction} submitLabel="Créer l'invitation" resetOnSuccess>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField name="email" label="Email" type="email" required />
              <SelectField name="roleId" label="Rôle" options={roleOptions} defaultValue={roles.find((r) => r.key === "TEAM_MEMBER")?.id} />
            </div>
          </ActionForm>
        </Card>
      )}

      {invitations.length > 0 && (
        <Card>
          <h2 className="mb-3 font-semibold">Invitations en attente</h2>
          <ul className="divide-y divide-line text-sm">
            {invitations.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>{i.email} · <span className="text-slate-500">{i.role.name} · expire le {formatDate(i.expiresAt)}</span></span>
                {manage && <ActionForm action={revokeInvitationAction.bind(null, i.id)} submitLabel="Révoquer" submitVariant="secondary" className="space-y-0" />}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Table head={["Membre", "Rôle", "Structures", "Statut", "Dernière connexion", ...(manage ? ["Actions"] : [])]}>
        {members.map((m) => (
          <tr key={m.id}>
            <Td><p className="font-medium">{m.user.name}{m.user.id === ctx.userId && <span className="ml-1 text-xs text-slate-500">(vous)</span>}</p><p className="text-xs text-slate-500">{m.user.email}</p></Td>
            <Td>
              {manage && (isOwner || m.role.key !== OWNER_ROLE_KEY) ? (
                <ActionForm action={changeRoleAction.bind(null, m.id)} submitLabel="Appliquer" submitVariant="secondary" className="space-y-2">
                  <SelectField name="roleId" label="Rôle" options={roleOptions} defaultValue={m.role.id} />
                </ActionForm>
              ) : (
                m.role.name
              )}
            </Td>
            <Td>
              {m.units.filter((u) => !u.unit.deletedAt).map((u) => u.unit.name).join(", ") || <span className="text-slate-400">—</span>}
              {manage && unitOptions.length > 0 && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-xs text-brand">Rattacher</summary>
                  <ActionForm action={setUnitsAction.bind(null, m.id)} submitLabel="Enregistrer" submitVariant="secondary" className="mt-2 space-y-2">
                    <CheckboxGroup name="unitIds" label="Structures" options={unitOptions} defaultValues={m.units.map((u) => u.unitId)} columns={2} />
                  </ActionForm>
                </details>
              )}
            </Td>
            <Td>{m.status === "ACTIVE" ? <Badge tone="success">Actif</Badge> : <Badge tone="warning">Suspendu</Badge>}</Td>
            <Td className="whitespace-nowrap text-xs text-slate-500">{formatDate(m.user.lastLoginAt)}</Td>
            {manage && (
              <Td>
                {m.user.id !== ctx.userId && (
                  m.status === "ACTIVE"
                    ? <ActionForm action={setStatusAction.bind(null, m.id, "SUSPENDED")} submitLabel="Suspendre" submitVariant="secondary" confirm={`Suspendre ${m.user.name} ? La personne perdra l'accès à l'organisation.`} className="space-y-0" />
                    : <ActionForm action={setStatusAction.bind(null, m.id, "ACTIVE")} submitLabel="Réactiver" submitVariant="secondary" className="space-y-0" />
                )}
              </Td>
            )}
          </tr>
        ))}
      </Table>
    </div>
  );
}
