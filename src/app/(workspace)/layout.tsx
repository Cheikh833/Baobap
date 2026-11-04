import { requireTenant, requireUser } from "@/server/context";
import { listUserOrganizations } from "@/server/services/organization";
import { ALL_PERMISSIONS } from "@/server/permissions/catalog";
import { can } from "@/server/permissions/check";
import { Shell } from "./shell";
import { db } from "@/server/db";
import { getMessages } from "@/i18n/server";
import { roleLabel } from "@/i18n/roles";
import { isPlatformAdmin } from "@/server/services/mobile-payments";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const ctx = await requireTenant();
  const memberships = await listUserOrganizations(user.id);
  const { m } = await getMessages();
  const isDemo = (await db.organization.findUniqueOrThrow({ where: { id: ctx.organizationId }, select: { isDemo: true } })).isDemo;
  return (
    <Shell
      user={{ name: user.name, email: user.email }}
      org={{ id: ctx.organizationId, name: ctx.organizationName, roleName: roleLabel({ key: ctx.roleKey, name: ctx.roleName }, m) }}
      orgs={memberships.map((m) => ({ id: m.organization.id, name: m.organization.name }))}
      allowed={ALL_PERMISSIONS.filter((p) => can(ctx, p))}
      platformAdmin={isPlatformAdmin(user.email)}
      isDemo={isDemo}
      subscription={{ ...ctx.subscription, canManage: can({ ...ctx, readOnly: false }, "billing:manage") }}
    >
      {children}
    </Shell>
  );
}
