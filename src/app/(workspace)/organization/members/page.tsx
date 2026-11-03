import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { listInvitations, listMembers } from "@/server/services/members";
import { listRoleOptions } from "@/server/services/roles";
import { listUnits } from "@/server/services/units";
import { OWNER_ROLE_KEY } from "@/server/permissions/catalog";
import { Badge, Card, Table, Td } from "@/components/ui/display";
import { ActionForm, CheckboxGroup, SelectField, TextField } from "@/components/forms/action-form";
import { formatDate } from "@/lib/metrics";
import { getMessages } from "@/i18n/server";
import { fill } from "@/i18n/translate";
import { roleLabel } from "@/i18n/roles";
import { Forbidden } from "../../forbidden";
import { changeRoleAction, inviteAction, revokeInvitationAction, setStatusAction, setUnitsAction } from "../actions";

export const metadata = { title: "Membres" };

export default async function MembersPage() {
  const ctx = await requireTenant();
  if (!can(ctx, "members:view")) return <Forbidden />;
  const manage = can(ctx, "members:manage");
  const [members, invitations, roles, units, { m, locale }] = await Promise.all([
    listMembers(ctx),
    listInvitations(ctx),
    listRoleOptions(ctx),
    can(ctx, "units:view") ? listUnits(ctx) : Promise.resolve([]),
    getMessages(),
  ]);
  const M = m.members;
  const isOwner = ctx.roleKey === OWNER_ROLE_KEY;
  const roleOptions = roles.filter((r) => isOwner || r.key !== OWNER_ROLE_KEY).map((r) => [r.id, roleLabel(r, m)] as const);
  const unitOptions = units.map((u) => [u.id, u.name] as const);

  return (
    <div className="space-y-6">
      {manage && (
        <Card>
          <h2 className="mb-4 font-semibold">{M.invite}</h2>
          <ActionForm action={inviteAction} submitLabel={M.inviteSubmit} resetOnSuccess>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField name="email" label={M.email} type="email" required />
              <SelectField name="roleId" label={M.role} options={roleOptions} defaultValue={roles.find((r) => r.key === "TEAM_MEMBER")?.id} />
            </div>
          </ActionForm>
        </Card>
      )}

      {invitations.length > 0 && (
        <Card>
          <h2 className="mb-3 font-semibold">{M.pending}</h2>
          <ul className="divide-y divide-line text-sm">
            {invitations.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>{i.email} · <span className="text-slate-500">{roleLabel(i.role, m)} · {fill(M.expires, { date: formatDate(i.expiresAt, locale) })}</span></span>
                {manage && <ActionForm action={revokeInvitationAction.bind(null, i.id)} submitLabel={M.revoke} submitVariant="secondary" className="space-y-0" />}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Table head={[...M.head, ...(manage ? [m.ui.actions] : [])]}>
        {members.map((mb) => (
          <tr key={mb.id}>
            <Td><p className="font-medium">{mb.user.name}{mb.user.id === ctx.userId && <span className="ml-1 text-xs text-slate-500">{m.ui.you}</span>}</p><p className="text-xs text-slate-500">{mb.user.email}</p></Td>
            <Td>
              {manage && (isOwner || mb.role.key !== OWNER_ROLE_KEY) ? (
                <ActionForm action={changeRoleAction.bind(null, mb.id)} submitLabel={m.ui.apply} submitVariant="secondary" className="space-y-2">
                  <SelectField name="roleId" label={M.role} options={roleOptions} defaultValue={mb.role.id} />
                </ActionForm>
              ) : (
                roleLabel(mb.role, m)
              )}
            </Td>
            <Td>
              {mb.units.filter((u) => !u.unit.deletedAt).map((u) => u.unit.name).join(", ") || <span className="text-slate-400">—</span>}
              {manage && unitOptions.length > 0 && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-xs text-brand">{M.attach}</summary>
                  <ActionForm action={setUnitsAction.bind(null, mb.id)} submitLabel={m.ui.save} submitVariant="secondary" className="mt-2 space-y-2">
                    <CheckboxGroup name="unitIds" label={M.units} options={unitOptions} defaultValues={mb.units.map((u) => u.unitId)} columns={2} />
                  </ActionForm>
                </details>
              )}
            </Td>
            <Td>{mb.status === "ACTIVE" ? <Badge tone="success">{M.active}</Badge> : <Badge tone="warning">{M.suspended}</Badge>}</Td>
            <Td className="whitespace-nowrap text-xs text-slate-500">{formatDate(mb.user.lastLoginAt, locale)}</Td>
            {manage && (
              <Td>
                {mb.user.id !== ctx.userId && (
                  mb.status === "ACTIVE"
                    ? <ActionForm action={setStatusAction.bind(null, mb.id, "SUSPENDED")} submitLabel={M.suspend} submitVariant="secondary" confirm={fill(M.confirmSuspend, { name: mb.user.name })} className="space-y-0" />
                    : <ActionForm action={setStatusAction.bind(null, mb.id, "ACTIVE")} submitLabel={M.reactivate} submitVariant="secondary" className="space-y-0" />
                )}
              </Td>
            )}
          </tr>
        ))}
      </Table>
    </div>
  );
}
